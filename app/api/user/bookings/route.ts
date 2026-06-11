import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Collection, Document } from "mongodb";
import { isBookingStatus } from "@/lib/booking-status";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { createLog, getUserById } from "@/lib/firebase-store";
import { verifyToken } from "@/lib/jwt";
import {
  logTboCertificationBookingDiagnostics,
  TboSupplierProvider,
} from "@/lib/suppliers/tbo-provider";
import {
  buildHotelbedsBookingBody,
  buildHotelbedsCheckRateBody,
  createHotelbedsHotelsClient,
  HotelbedsHotelsClientError,
} from "@/lib/suppliers/hotelbeds-hotels-client";
import { getHotelbedsBaseUrls } from "@/lib/suppliers/hotelbeds-auth";
import {
  attachHotelbedsSearchEvidenceToBooking,
  getHotelbedsEvidenceIdFrom,
  writeHotelbedsCertificationDocuments,
  writeHotelbedsEvidenceLog,
  writeHotelbedsEvidenceSafely,
} from "@/lib/certification/hotelbeds-accommodation-evidence";
import type {
  SupplierBookingDetailsResponse,
  SupplierBookRequest,
  SupplierBookResponse,
  SupplierGuestOccupancy,
  SupplierPreBookResponse,
} from "@/lib/suppliers/types";
import type {
  HotelbedsHotelBookingRequest,
  HotelbedsHotelGuest,
} from "@/types/hotelbeds-hotels-certification";
import { createAdminNotificationSafely } from "@/lib/admin-notifications";

type BookingDocument = Document & {
  _id: string;
  userId: string;
  customerEmail?: string;
  bookingReference?: string;
  archived?: boolean;
  hiddenFromAdminMainList?: boolean;
  hiddenFromCustomerBookings?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const TESTER_EMAIL = "tbo.tester@hotleno.com";
const FORCE_HIDDEN_CUSTOMER_BOOKING_IDS = new Set([
  "HOTLENO-1780536769032",
  "HOTLENO-1780515284353",
]);

function toNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getBookingId(reference?: unknown) {
  const safeReference =
    typeof reference === "string" && reference.trim()
      ? reference.trim()
      : "";
  return safeReference || `booking-${randomUUID()}`;
}

function isEnabled(value?: string) {
  return String(value || "").trim().toLowerCase() === "true";
}

function isTesterToken(decoded: { userId?: string; email?: string }) {
  return (
    String(decoded.email || "").toLowerCase() === TESTER_EMAIL ||
    String(decoded.userId || "").toLowerCase() === TESTER_EMAIL
  );
}

function isHiddenTesterBooking(booking: BookingDocument) {
  return (
    booking.archived === true ||
    booking.hiddenFromAdminMainList === true ||
    booking.hiddenFromCustomerBookings === true ||
    FORCE_HIDDEN_CUSTOMER_BOOKING_IDS.has(String(booking.bookingReference || "")) ||
    FORCE_HIDDEN_CUSTOMER_BOOKING_IDS.has(String(booking._id || ""))
  );
}

function safeErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : "Supplier booking failed")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

function splitName(value?: unknown) {
  const cleanName = String(value || "")
    .replace(/^(Mr|Mrs|Ms|Child)\.?\s+/i, "")
    .trim();
  const [firstName = "Guest", ...rest] = cleanName.split(/\s+/).filter(Boolean);

  return {
    firstName,
    lastName: rest.join(" ") || "Hotleno",
  };
}

function normalizeGuestTitle(value?: unknown) {
  return value === "Mrs" || value === "Ms" ? value : "Mr";
}

function isValidGuestName(value: unknown) {
  const trimmed = String(value || "").trim();
  return trimmed.length >= 3 && trimmed.length <= 25 && /^[\p{L}\s]+$/u.test(trimmed);
}

function validateBookingTravelers(travelers: unknown[]) {
  const seenNames = new Set<string>();

  for (const traveler of travelers) {
    if (!traveler || typeof traveler !== "object") {
      return "Traveler details are invalid.";
    }

    const record = traveler as Record<string, unknown>;
    const firstName = String(record.firstName || "").trim();
    const lastName = String(record.lastName || "").trim();

    if (!isValidGuestName(firstName) || !isValidGuestName(lastName)) {
      return "Guest names must be 3-25 letters and spaces only.";
    }

    if (record.travelerType !== "child") {
      const title = normalizeGuestTitle(record.title);
      if (!["Mr", "Ms", "Mrs"].includes(title)) {
        return "Guest title must be Mr, Ms, or Mrs.";
      }
    }

    const fullNameKey = `${firstName} ${lastName}`.replace(/\s+/g, " ").toLowerCase();
    if (seenNames.has(fullNameKey)) {
      return "Duplicate guest names are not allowed in the same booking.";
    }
    seenNames.add(fullNameKey);
  }

  return "";
}

function normalizeSupplier(value: unknown) {
  return String(value || "none").trim().toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getHotelbedsStatus(payload: unknown) {
  const record = asRecord(payload);
  const booking = asRecord(record.booking);
  return (
    asString(record.status) ||
    asString(booking.status) ||
    asString(asRecord(record.error).code) ||
    asString(record.code) ||
    "unknown"
  );
}

function getHotelbedsErrorMessage(payload: unknown) {
  const record = asRecord(payload);
  const error = asRecord(record.error);
  return (
    asString(error.message) ||
    asString(error.description) ||
    asString(record.message) ||
    asString(record.error) ||
    ""
  );
}

function extractHotelbedsRateKeys(payload: unknown) {
  const keys: string[] = [];

  function visit(value: unknown, depth = 0) {
    if (depth > 8 || keys.length >= 8) return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }

    const record = asRecord(value);
    if (!Object.keys(record).length) return;
    const rateKey = asString(record.rateKey);
    if (rateKey && !keys.includes(rateKey)) keys.push(rateKey);
    Object.values(record).forEach((item) => visit(item, depth + 1));
  }

  visit(payload);
  return keys;
}

function extractHotelbedsBookingReference(payload: unknown) {
  const record = asRecord(payload);
  const booking = asRecord(record.booking || asArray(record.bookings)[0]);
  return (
    asString(record.reference) ||
    asString(record.bookingReference) ||
    asString(booking.reference) ||
    asString(booking.bookingReference)
  );
}

function getHotelbedsFlowSafeResponse(payload: unknown) {
  const rateKeys = extractHotelbedsRateKeys(payload);
  const reference = extractHotelbedsBookingReference(payload);
  return {
    status: getHotelbedsStatus(payload),
    errorMessage: getHotelbedsErrorMessage(payload),
    hotelbedsReference: reference || undefined,
    rateKeysReturned: rateKeys.length,
    hasRateKey: rateKeys.length > 0,
  };
}

function getHotelbedsClientErrorSafeResponse(error: unknown) {
  if (error instanceof HotelbedsHotelsClientError) {
    return {
      statusCode: error.status,
      code: error.code,
      errorMessage: error.message,
    };
  }

  return {
    errorMessage: safeErrorMessage(error),
  };
}

function isHotelbedsCheckRateBookable(payload: unknown) {
  const rateKeys = extractHotelbedsRateKeys(payload);
  const status = getHotelbedsStatus(payload).toLowerCase();
  const errorMessage = getHotelbedsErrorMessage(payload).toLowerCase();

  if (!rateKeys.length) return false;
  if (/error|failed|not[_\s-]?bookable|unavailable|invalid/.test(status)) return false;
  if (/not[_\s-]?bookable|unavailable|invalid|expired/.test(errorMessage)) return false;

  return true;
}

function getHotelbedsRequestSummarySafe(request: HotelbedsHotelBookingRequest) {
  const roomDiagnostics = (request.rooms || []).map((room, roomIndex) => ({
    roomIndex,
    rateKeyPrefix: getHotelbedsRateKeyPrefix(room.rateKey),
    paxesCount: room.guests.length,
    paxRoomIds: room.guests.map((guest) => guest.roomId ?? null),
    paxTypes: room.guests.map((guest) => guest.type || "AD"),
    paxNamePresent: room.guests.map((guest) => Boolean(guest.name && guest.surname)),
    childAges: room.guests
      .filter((guest) => guest.type === "CH")
      .map((guest) => guest.age ?? null),
  }));

  return {
    clientReference: request.clientReference,
    holderPresent: Boolean(request.holder.name && request.holder.surname),
    rooms: request.rooms?.length || 0,
    paxes: request.guests.length,
    adults: request.guests.filter((guest) => guest.type !== "CH").length,
    children: request.guests.filter((guest) => guest.type === "CH").length,
    rateKeyPresent: Boolean(request.rateKey),
    roomRateKeysPresent: (request.rooms || []).every((room) => Boolean(room.rateKey)),
    childAgesPresent: request.guests
      .filter((guest) => guest.type === "CH")
      .every((guest) => Number.isFinite(Number(guest.age))),
    bookingRqPaxDistribution: roomDiagnostics,
  };
}

type HotelbedsSelectedRoom = {
  roomIndex: number;
  adults: number;
  children: number;
  childAges: number[];
  roomCode?: string;
  roomName?: string;
  boardCode?: string;
  boardName?: string;
  rateKey: string;
  price?: number;
  currency?: string;
  rateType?: string;
  rateClass?: string;
  allotment?: number;
  packaging?: boolean;
  net?: string | number;
  sellingRate?: string | number;
  sourceMarket?: string;
  rateComments?: unknown[];
  cancellationPolicies?: unknown[];
  taxes?: unknown;
};

type HotelbedsCheckRateStrategy =
  | "BOOKABLE_DIRECT"
  | "CHECKRATE_REQUIRED"
  | "CHECKRATE_ONE_RATE_KEY_PER_REQUEST"
  | "CHECKRATE_MULTI_RATE_KEYS";

function getHotelbedsSelectedRooms(booking: BookingDocument): HotelbedsSelectedRoom[] {
  const metadata = asRecord(booking.metadata);
  const rawRooms = Array.isArray(booking.hotelbedsSelectedRooms)
    ? booking.hotelbedsSelectedRooms
    : asArray(metadata.hotelbedsSelectedRooms);

  return rawRooms
    .map((room) => {
      const record = asRecord(room);
      const children = Math.max(0, toNumber(record.children));
      const childAges = asArray(record.childAges)
        .map((age) => toNumber(age))
        .filter((age) => Number.isFinite(age) && age >= 0)
        .slice(0, children);

      return {
        roomIndex: Math.max(0, toNumber(record.roomIndex)),
        adults: Math.max(1, toNumber(record.adults, 1)),
        children,
        childAges,
        roomCode: asString(record.roomCode),
        roomName: asString(record.roomName),
        boardCode: asString(record.boardCode),
        boardName: asString(record.boardName),
        rateKey: asString(record.rateKey),
        price: Number.isFinite(Number(record.price)) ? Number(record.price) : undefined,
        currency: asString(record.currency),
        rateType: asString(record.rateType),
        rateClass: asString(record.rateClass),
        allotment: Number.isFinite(Number(record.allotment))
          ? Number(record.allotment)
          : undefined,
        packaging: typeof record.packaging === "boolean" ? record.packaging : undefined,
        net:
          typeof record.net === "string" || typeof record.net === "number"
            ? record.net
            : undefined,
        sellingRate:
          typeof record.sellingRate === "string" || typeof record.sellingRate === "number"
            ? record.sellingRate
            : undefined,
        sourceMarket: asString(record.sourceMarket),
        rateComments: asArray(record.rateComments),
        cancellationPolicies: asArray(record.cancellationPolicies),
        taxes: record.taxes,
      };
    })
    .filter((room) => room.rateKey)
    .sort((left, right) => left.roomIndex - right.roomIndex);
}

function getRequestedOccupancies(booking: BookingDocument) {
  return (Array.isArray(booking.rooms)
    ? (booking.rooms as Array<Record<string, unknown>>)
    : []
  ).map((room, index) => {
    const children = Math.max(0, toNumber(room.children));
    return {
      roomIndex: index,
      adults: Math.max(1, toNumber(room.adults, 1)),
      children,
      childAges: Array.isArray(room.childrenAges)
        ? room.childrenAges
            .map((age) => toNumber(age))
            .filter((age) => Number.isFinite(age) && age >= 0)
            .slice(0, children)
        : [],
    };
  });
}

function getHotelbedsRateKeyPrefix(rateKey: string) {
  return rateKey ? rateKey.slice(0, 42) : "";
}

function getHotelbedsRateKeyOccupancyMarker(rateKey: string) {
  const match = String(rateKey || "").match(/\|\|(\d+)~(\d+)~(\d+)/);
  if (!match) return null;

  return {
    marker: `${match[1]}~${match[2]}~${match[3]}`,
    rooms: toNumber(match[1], 1),
    adults: toNumber(match[2]),
    children: toNumber(match[3]),
  };
}

function hasSingleRoomOccupancyMarker(rateKey: string) {
  return /\|\|1~\d+~\d+/.test(rateKey);
}

function getHotelbedsFinalBookingPayloadSafe(
  payload: unknown,
  selectedRooms: HotelbedsSelectedRoom[],
) {
  const payloadRecord = asRecord(payload);
  const finalRooms = asArray(payloadRecord.rooms);
  const expectedRoomOccupancies = selectedRooms.map((room) => ({
    roomIndex: room.roomIndex,
    adults: room.adults,
    children: room.children,
    childAges: room.childAges || [],
  }));
  const finalPayloadRoomOccupancies = finalRooms.map((room, index) => {
    const roomRecord = asRecord(room);
    const rateKey = asString(roomRecord.rateKey);
    const occupancy = getHotelbedsRateKeyOccupancyMarker(rateKey);
    const paxes = asArray(roomRecord.paxes).map(asRecord);
    const adultPaxes = paxes.filter((pax) => asString(pax.type) !== "CH");
    const childPaxes = paxes.filter((pax) => asString(pax.type) === "CH");

    return {
      roomIndex: index,
      rateKeyPrefix: getHotelbedsRateKeyPrefix(rateKey),
      occupancyMarker: occupancy?.marker || "",
      fullRateKeyPresent: Boolean(rateKey),
      paxesCount: paxes.length,
      adultsCount: adultPaxes.length,
      childrenCount: childPaxes.length,
      childAges: childPaxes.map((pax) => toNumber(pax.age)).filter(Number.isFinite),
      paxRoomIds: paxes.map((pax) =>
        Number.isFinite(Number(pax.roomId)) ? Number(pax.roomId) : null,
      ),
      paxTypes: paxes.map((pax) => asString(pax.type) || "AD"),
      paxNamesPresent: paxes.map((pax) => Boolean(asString(pax.name) && asString(pax.surname))),
    };
  });
  const mismatchReasons: string[] = [];

  if (finalRooms.length !== selectedRooms.length) {
    mismatchReasons.push("rooms length does not match hotelbedsSelectedRooms");
  }

  finalRooms.forEach((room, index) => {
    const roomRecord = asRecord(room);
    const rateKey = asString(roomRecord.rateKey);
    const occupancy = getHotelbedsRateKeyOccupancyMarker(rateKey);
    const paxes = asArray(roomRecord.paxes).map(asRecord);
    const adultCount = paxes.filter((pax) => asString(pax.type) !== "CH").length;
    const childCount = paxes.filter((pax) => asString(pax.type) === "CH").length;

    if (!rateKey) {
      mismatchReasons.push(`room ${index + 1} missing full rateKey`);
    }
    if (!paxes.length) {
      mismatchReasons.push(`room ${index + 1} has no paxes`);
    }
    if (!occupancy) {
      mismatchReasons.push(`room ${index + 1} missing occupancy marker`);
    } else {
      if (adultCount !== occupancy.adults || childCount !== occupancy.children) {
        mismatchReasons.push(`room ${index + 1} pax count does not match occupancy marker`);
      }
      paxes.forEach((pax, paxIndex) => {
        const roomId = Number(pax.roomId);
        if (!Number.isFinite(roomId)) {
          mismatchReasons.push(`room ${index + 1} pax ${paxIndex + 1} missing roomId`);
        } else if (roomId < 1 || roomId > occupancy.rooms) {
          mismatchReasons.push(`room ${index + 1} pax ${paxIndex + 1} roomId out of rate occupancy range`);
        }
      });
    }
    paxes.forEach((pax, paxIndex) => {
      if (!asString(pax.name) || !asString(pax.surname)) {
        mismatchReasons.push(`room ${index + 1} pax ${paxIndex + 1} missing name`);
      }
      if (asString(pax.type) === "CH" && !Number.isFinite(Number(pax.age))) {
        mismatchReasons.push(`room ${index + 1} child ${paxIndex + 1} missing age`);
      }
    });
  });

  return {
    roomsLength: finalRooms.length,
    expectedRoomOccupancies,
    finalPayloadRoomOccupancies,
    payloadMismatch: mismatchReasons.length > 0,
    mismatchReasons,
  };
}

function isHotelbedsBookableDirectRoom(room: HotelbedsSelectedRoom) {
  return String(room.rateType || "").toUpperCase() === "BOOKABLE";
}

function getHotelbedsCheckRateStrategy(params: {
  selectedRooms: HotelbedsSelectedRoom[];
  rateKeys: string[];
}): HotelbedsCheckRateStrategy {
  if (
    params.selectedRooms.length > 0 &&
    params.selectedRooms.every(isHotelbedsBookableDirectRoom)
  ) {
    return "BOOKABLE_DIRECT";
  }

  if (
    params.selectedRooms.some(
      (room) => String(room.rateType || "").toUpperCase() === "RECHECK",
    )
  ) {
    return "CHECKRATE_ONE_RATE_KEY_PER_REQUEST";
  }

  if (params.rateKeys.length <= 1) {
    return "CHECKRATE_REQUIRED";
  }

  return "CHECKRATE_ONE_RATE_KEY_PER_REQUEST";
}

function getHotelbedsSelectionSummarySafe(params: {
  booking: BookingDocument;
  selectedRooms: HotelbedsSelectedRoom[];
  rateKeys: string[];
}) {
  const requestedOccupancies = getRequestedOccupancies(params.booking);
  const metadata = asRecord(params.booking.metadata);
  const hotelbedsPackage = asRecord(params.booking.hotelbedsPackage || metadata.hotelbedsPackage);
  const packageCurrency = asString(hotelbedsPackage.currency) || asString(params.booking.currency);
  const expectedTotalPrice =
    toNumber(hotelbedsPackage.totalPrice) ||
    params.selectedRooms.reduce((sum, room) => sum + toNumber(room.price), 0);
  const actualReviewPrice =
    toNumber(metadata.actualReviewPrice) ||
    toNumber(metadata.supplierTotalFare) ||
    toNumber(params.booking.totalPrice);
  const rawRoomPriceBreakdown = asArray(metadata.roomPriceBreakdown).length
    ? asArray(metadata.roomPriceBreakdown)
    : params.selectedRooms.map((room) => ({
        roomIndex: room.roomIndex,
        roomName: room.roomName || "",
        roomCode: room.roomCode || "",
        price: room.price || 0,
        currency: room.currency || params.booking.currency,
      }));
  const roomBreakdownCurrencies = rawRoomPriceBreakdown
    .map((room) => asString(asRecord(room).currency))
    .filter(Boolean);
  const currencyMismatch = Boolean(packageCurrency) && roomBreakdownCurrencies.some(
    (roomCurrency) => roomCurrency !== packageCurrency,
  );
  const roomPriceBreakdown = rawRoomPriceBreakdown.map((room) => ({
    ...asRecord(room),
    currency: packageCurrency || asString(asRecord(room).currency) || params.booking.currency,
  }));
  const warnings = params.selectedRooms.some((room) => !room.rateType)
    ? ["MISSING_HOTELBEDS_RATE_TYPE"]
    : [];

  return {
    warnings,
    requestedRoomsCount: requestedOccupancies.length || 1,
    selectedRateRoomsCount: params.selectedRooms.length || (params.rateKeys.length ? 1 : 0),
    selectedRoomNames: params.selectedRooms.map((room) => room.roomName || ""),
    roomPriceBreakdown,
    packageCurrency,
    roomBreakdownCurrencies,
    currencyMismatch,
    currencyMismatchFixed: currencyMismatch,
    hotelbedsCurrencyDiagnostics: {
      supplierCurrency: asString(params.booking.currency),
      packageCurrency,
      roomBreakdownCurrencies,
      selectedRoomCurrencies: params.selectedRooms.map((room) => room.currency).filter(Boolean),
      normalizedCurrency: packageCurrency,
      currencyMismatch,
      mismatchSource: currencyMismatch ? "booking-route" : "",
      fixedDisplayCurrency: packageCurrency,
      currencyMismatchFixed: currencyMismatch,
    },
    expectedTotalPrice,
    actualReviewPrice,
    priceMismatch:
      expectedTotalPrice > 0 && Math.abs(expectedTotalPrice - actualReviewPrice) > 0.01,
    summaryUsesFirstRoomOnly:
      params.selectedRooms.length > 1 &&
      actualReviewPrice <= toNumber(params.selectedRooms[0]?.price),
    requestedOccupancies,
    selectedRateOccupancySummary: params.selectedRooms.map((room) => ({
      roomIndex: room.roomIndex,
      adults: room.adults,
      children: room.children,
      childAges: room.childAges,
      roomCode: room.roomCode || "",
      boardCode: room.boardCode || "",
      rateType: room.rateType || "",
      rateClass: room.rateClass || "",
      allotment: room.allotment ?? null,
      sourceMarket: room.sourceMarket || "",
      packaging: room.packaging ?? null,
      rateKeyPrefix: getHotelbedsRateKeyPrefix(room.rateKey),
      hasSingleRoomOccupancyMarker: hasSingleRoomOccupancyMarker(room.rateKey),
    })),
    selectedRooms: params.selectedRooms.map((room) => ({
      roomIndex: room.roomIndex,
      roomCode: room.roomCode || "",
      roomName: room.roomName || "",
      boardCode: room.boardCode || "",
      boardName: room.boardName || "",
      adults: room.adults,
      children: room.children,
      childAges: room.childAges,
      rateType: room.rateType || "",
      rateClass: room.rateClass || "",
      allotment: room.allotment ?? null,
      sourceMarket: room.sourceMarket || "",
      packaging: room.packaging ?? null,
      rateKeyPrefix: getHotelbedsRateKeyPrefix(room.rateKey),
    })),
    generatedCheckRatePayload: {
      rooms: params.rateKeys.map((key) => ({
        rateKeyPrefix: getHotelbedsRateKeyPrefix(key),
      })),
      roomsCount: params.rateKeys.length,
      usesMultipleRateKeys: params.rateKeys.length > 1,
    },
    supplierRateKeyPrefix: getHotelbedsRateKeyPrefix(String(params.booking.supplierRateKey || "")),
    hasSingleRoomOccupancyMarker: hasSingleRoomOccupancyMarker(
      String(params.booking.supplierRateKey || ""),
    ),
  };
}

function buildHotelbedsFlowMetadata(params: {
  failedAt?: string;
  errorMessage?: string;
  validationErrors?: string[];
  checkRateStatus?: string;
  checkRateBookable?: boolean;
  bookingStatus?: string;
  hotelbedsReference?: string;
  checkRateResponseSafe?: Record<string, unknown>;
  bookingResponseSafe?: Record<string, unknown>;
  requestSummarySafe?: Record<string, unknown>;
}) {
  return {
    routeVersion: "hotelbeds-flow-v4",
    failedAt: params.failedAt || "",
    errorMessage: params.errorMessage || "",
    validationErrors: params.validationErrors || [],
    checkRateStatus: params.checkRateStatus || "",
    checkRateBookable: params.checkRateBookable ?? null,
    bookingStatus: params.bookingStatus || "",
    hotelbedsReference: params.hotelbedsReference || "",
    checkRateResponseSafe: params.checkRateResponseSafe || null,
    bookingResponseSafe: params.bookingResponseSafe || null,
    requestSummarySafe: params.requestSummarySafe || null,
  };
}

function logHotelbedsBookingFlow(params: {
  internalBookingId: string;
  step: string;
  supplier?: string;
  provider?: string;
  supplierTester?: boolean;
  status?: string;
  hotelbedsReference?: string;
  error?: string;
  routeVersion?: string;
  failedAt?: string;
  rateKeyPresent?: boolean;
  bookable?: boolean;
  rooms?: number;
  paxes?: number;
  details?: Record<string, unknown>;
}) {
  console.info(
    "[Hotelbeds Booking Flow]",
    JSON.stringify({
      internalBookingId: params.internalBookingId,
      step: params.step,
      routeVersion: params.routeVersion || "hotelbeds-flow-v4",
      supplier: params.supplier || "hotelbeds",
      provider: params.provider || "hotelbeds",
      supplierTester: params.supplierTester ?? true,
      status: params.status,
      hotelbedsReference: params.hotelbedsReference,
      error: params.error,
      failedAt: params.failedAt,
      rateKeyPresent: params.rateKeyPresent,
      bookable: params.bookable,
      rooms: params.rooms,
      paxes: params.paxes,
      details: params.details,
    }),
  );
}

function getRawSupplierObject(response: SupplierBookResponse) {
  return response.rawSupplierResponse &&
    typeof response.rawSupplierResponse === "object"
    ? (response.rawSupplierResponse as Record<string, unknown>)
    : {};
}

function getRawSupplierDetailsObject(response: SupplierBookingDetailsResponse) {
  return response.rawSupplierResponse &&
    typeof response.rawSupplierResponse === "object"
    ? (response.rawSupplierResponse as Record<string, unknown>)
    : {};
}

function getStatusDescription(response: SupplierBookResponse) {
  const raw = getRawSupplierObject(response);
  const status = raw.status;
  if (!status || typeof status !== "object") return "";
  const description = (status as Record<string, unknown>).Description;
  return typeof description === "string" ? description : "";
}

function getHttpStatusCode(response: SupplierBookResponse) {
  const value = getRawSupplierObject(response).httpStatusCode;
  return typeof value === "number" ? value : undefined;
}

function getSupplierResponseValue(response: SupplierBookResponse, key: string) {
  const value = getRawSupplierObject(response)[key];
  return typeof value === "string" ? value : "";
}

function getFirstSupplierResponseValue(
  response: SupplierBookResponse,
  keys: string[],
) {
  for (const key of keys) {
    const value = getSupplierResponseValue(response, key);
    if (value) return value;
  }

  return "";
}

function getSupplierDetailsValue(response: SupplierBookingDetailsResponse, key: string) {
  const value = getRawSupplierDetailsObject(response)[key];
  return typeof value === "string" ? value : "";
}

function getFirstSupplierDetailsValue(
  response: SupplierBookingDetailsResponse,
  keys: string[],
) {
  for (const key of keys) {
    const value = getSupplierDetailsValue(response, key);
    if (value) return value;
  }

  return "";
}

function getBookingMetadataNumber(booking: BookingDocument, key: string) {
  const metadata =
    booking.metadata && typeof booking.metadata === "object"
      ? (booking.metadata as Record<string, unknown>)
      : {};
  const value = metadata[key];
  return toNumber(value);
}

function getSupplierStageErrorCode(stage: "prebook" | "book", message: string) {
  return message.toLowerCase().includes("session expired")
    ? `session_expired_${stage}`
    : message;
}

function buildSupplierOccupancy(booking: BookingDocument): SupplierGuestOccupancy[] {
  const rooms = Array.isArray(booking.rooms)
    ? (booking.rooms as Array<Record<string, unknown>>)
    : [];

  if (rooms.length === 0) {
    return [{ adults: 1, children: 0, childrenAges: [] }];
  }

  return rooms.map((room) => ({
    adults: Math.max(1, toNumber(room.adults, 1)),
    children: Math.max(0, toNumber(room.children)),
    childrenAges: Array.isArray(room.childrenAges)
      ? room.childrenAges.map((age) => toNumber(age)).filter((age) => age >= 0)
      : [],
  }));
}

function toDateString(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
}

function buildTboBookRequest(booking: BookingDocument): SupplierBookRequest {
  const travelers = Array.isArray(booking.travelers)
    ? (booking.travelers as Array<Record<string, unknown>>)
    : [];
  const leadTraveler =
    travelers.find((traveler) => traveler.travelerType === "adult") ||
    travelers[0];
  const fallbackLeadGuest = splitName(booking.leadGuest);

  return {
    idempotencyKey: String(booking.idempotencyKey || booking.bookingReference),
    supplierHotelId: String(booking.supplierHotelId || booking.hotelId || ""),
    supplierRateKey: String(booking.supplierRateKey || ""),
    leadGuest: {
      title:
        typeof leadTraveler?.title === "string"
          ? normalizeGuestTitle(leadTraveler.title)
          : "Mr",
      firstName:
        typeof leadTraveler?.firstName === "string" && leadTraveler.firstName
          ? leadTraveler.firstName
          : fallbackLeadGuest.firstName,
      lastName:
        typeof leadTraveler?.lastName === "string" && leadTraveler.lastName
          ? leadTraveler.lastName
          : fallbackLeadGuest.lastName,
      email: String(booking.contactEmail || booking.customerEmail || ""),
      phone: String(booking.contactPhone || ""),
    },
    guests: travelers
      .filter((traveler) => traveler.firstName || traveler.lastName)
      .map((traveler) => ({
        title:
          traveler.travelerType === "child"
            ? "Child"
            : normalizeGuestTitle(traveler.title),
        firstName: String(traveler.firstName || "Guest"),
        lastName: String(traveler.lastName || "Hotleno"),
        type: traveler.travelerType === "child" ? "child" : "adult",
        age:
          traveler.travelerType === "child"
            ? toNumber(traveler.age)
            : undefined,
      })),
    metadata: {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      supplierBookingReference: booking.yourReference || booking.bookingReference,
      totalFare:
        getBookingMetadataNumber(booking, "supplierTotalFare") ||
        booking.totalPrice,
      currency: booking.currency,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      source: "user_bookings_certification_flow",
    },
  };
}

function buildHotelbedsBookingRequest(
  booking: BookingDocument,
  finalRateKeys?: string[],
): HotelbedsHotelBookingRequest {
  const travelers = Array.isArray(booking.travelers)
    ? (booking.travelers as Array<Record<string, unknown>>)
    : [];
  const leadTraveler =
    travelers.find((traveler) => traveler.travelerType === "adult") ||
    travelers[0];
  const fallbackLeadGuest = splitName(booking.leadGuest);
  const selectedRooms = getHotelbedsSelectedRooms(booking);
  const selectedRateKeys = selectedRooms.map((room) => room.rateKey).filter(Boolean);
  const effectiveRateKeys = finalRateKeys?.length
    ? finalRateKeys
    : selectedRateKeys.length
      ? selectedRateKeys
      : [String(booking.supplierRateKey || "")];
  const primaryRateKey = String(effectiveRateKeys[0] || booking.supplierRateKey || "");

  const requestedRooms = selectedRooms.length
    ? selectedRooms.map((room) => ({
        roomIndex: room.roomIndex,
        adults: room.adults,
        children: room.children,
        childAges: room.childAges || [],
        rateKey: room.rateKey,
      }))
    : (Array.isArray(booking.rooms) ? (booking.rooms as Array<Record<string, unknown>>) : []).map(
        (room, roomIndex) => ({
          roomIndex,
          adults: Math.max(1, toNumber(room.adults, 1)),
          children: Math.max(0, toNumber(room.children)),
          childAges: Array.isArray(room.childrenAges)
            ? room.childrenAges.map((age) => toNumber(age)).filter(Number.isFinite)
            : [],
          rateKey: String(effectiveRateKeys[roomIndex] || primaryRateKey),
        }),
      );

  const normalizedTravelers: HotelbedsHotelGuest[] = travelers.map((traveler) => {
    const isChild = traveler.travelerType === "child";
    const childAge = Number(traveler.age);
    return {
      roomId: Math.max(1, toNumber(traveler.roomIndex) + 1),
      type: isChild ? "CH" : "AD",
      title: isChild ? undefined : normalizeGuestTitle(traveler.title),
      name: String(traveler.firstName || "Guest").trim() || "Guest",
      surname: String(traveler.lastName || "Hotleno").trim() || "Hotleno",
      age: isChild && Number.isFinite(childAge) ? childAge : undefined,
    };
  });
  const travelersByRoom = requestedRooms.map((room, roomIndex) => {
    const expectedRoomId = roomIndex + 1;
    const directMatches = normalizedTravelers.filter(
      (guest) => (guest.roomId || 1) === expectedRoomId,
    );
    const expectedCount = room.adults + room.children;

    if (directMatches.length === expectedCount) {
      return directMatches.map((guest) => ({ ...guest, roomId: expectedRoomId }));
    }

    return [] as HotelbedsHotelGuest[];
  });

  if (travelersByRoom.some((roomGuests) => roomGuests.length === 0)) {
    const adults = normalizedTravelers.filter((guest) => guest.type !== "CH");
    const children = normalizedTravelers.filter((guest) => guest.type === "CH");
    let adultIndex = 0;
    let childIndex = 0;

    requestedRooms.forEach((room, roomIndex) => {
      const roomId = roomIndex + 1;
      const roomAdults = adults
        .slice(adultIndex, adultIndex + room.adults)
        .map((guest) => ({ ...guest, roomId }));
      const roomChildren = children
        .slice(childIndex, childIndex + room.children)
        .map((guest, index) => ({
          ...guest,
          roomId,
          age: guest.age ?? room.childAges[index],
        }));

      travelersByRoom[roomIndex] = [...roomAdults, ...roomChildren];
      adultIndex += room.adults;
      childIndex += room.children;
    });
  }

  const guests = travelersByRoom.flat();

  return {
    clientReference: String(booking.bookingReference || booking._id),
    holder: {
      name:
        typeof leadTraveler?.firstName === "string" && leadTraveler.firstName
          ? leadTraveler.firstName
          : fallbackLeadGuest.firstName,
      surname:
        typeof leadTraveler?.lastName === "string" && leadTraveler.lastName
          ? leadTraveler.lastName
          : fallbackLeadGuest.lastName,
    },
    rateKey: primaryRateKey,
    rooms: requestedRooms.map((room, index) => ({
      rateKey: String(effectiveRateKeys[index] || room.rateKey || primaryRateKey),
      guests: travelersByRoom[index] || [],
    })),
    guests,
    remark: "Hotelbeds Accommodation supplier tester booking.",
    language: "en",
  };
}

function validateHotelbedsBookingRequest(
  booking: BookingDocument,
  request: HotelbedsHotelBookingRequest,
) {
  const errors: string[] = [];
  const rooms = Array.isArray(booking.rooms)
    ? (booking.rooms as Array<Record<string, unknown>>)
    : [];

  if (String(booking.supplier || "").toLowerCase() !== "hotelbeds") {
    errors.push("supplier must be hotelbeds");
  }
  if (!request.rateKey) {
    errors.push("rateKey is required");
  }
  if (!request.holder.name.trim()) {
    errors.push("holder name is required");
  }
  if (!request.holder.surname.trim()) {
    errors.push("holder surname is required");
  }
  if (!request.rooms?.length) {
    errors.push("rooms are required");
  }
  if (rooms.length > 0 && request.rooms?.length !== rooms.length) {
    errors.push("room count does not match selected occupancy");
  }
  if (request.rooms?.length) {
    const totalRoomPaxes = request.rooms.reduce(
      (sum, room) => sum + room.guests.length,
      0,
    );
    if (totalRoomPaxes !== request.guests.length) {
      errors.push("total room paxes does not match traveler count");
    }
  }

  request.rooms?.forEach((room, roomIndex) => {
    const expectedRoomId = roomIndex + 1;
    if (!room.rateKey) {
      errors.push(`room ${roomIndex + 1} rateKey is required`);
    }
    const expectedRoom = rooms[roomIndex];
    const expectedAdults = expectedRoom ? toNumber(expectedRoom.adults, 1) : 0;
    const expectedChildren = expectedRoom ? toNumber(expectedRoom.children) : 0;
    const adults = room.guests.filter((guest) => guest.type !== "CH").length;
    const children = room.guests.filter((guest) => guest.type === "CH").length;

    if (expectedRoom && adults !== expectedAdults) {
      errors.push(`room ${roomIndex + 1} adult count mismatch`);
    }
    if (expectedRoom && children !== expectedChildren) {
      errors.push(`room ${roomIndex + 1} child count mismatch`);
    }
    if (expectedRoom && room.guests.length !== expectedAdults + expectedChildren) {
      errors.push(`room ${roomIndex + 1} pax count mismatch`);
    }
    room.guests.forEach((guest, guestIndex) => {
      if (guest.roomId !== expectedRoomId) {
        errors.push(`room ${roomIndex + 1} pax ${guestIndex + 1} roomId mismatch`);
      }
      if ((guest.roomId || 0) < 1 || (request.rooms && (guest.roomId || 0) > request.rooms.length)) {
        errors.push(`room ${roomIndex + 1} pax ${guestIndex + 1} roomId out of range`);
      }
      if (!guest.name.trim() || !guest.surname.trim()) {
        errors.push(`room ${roomIndex + 1} pax ${guestIndex + 1} name is required`);
      }
      if (!["AD", "CH"].includes(guest.type || "AD")) {
        errors.push(`room ${roomIndex + 1} pax ${guestIndex + 1} type is invalid`);
      }
      if (guest.type === "CH" && !Number.isFinite(Number(guest.age))) {
        errors.push(`room ${roomIndex + 1} child ${guestIndex + 1} age is required`);
      }
      if (guest.type !== "CH" && guest.age !== undefined) {
        errors.push(`room ${roomIndex + 1} adult ${guestIndex + 1} must not include age`);
      }
    });
  });

  return errors;
}

async function failHotelbedsBooking(params: {
  bookingsCollection: Collection<BookingDocument>;
  booking: BookingDocument;
  now: Date;
  message: string;
  failedAt: string;
  validationErrors?: string[];
  checkRateStatus?: string;
  checkRateBookable?: boolean;
  bookingStatus?: string;
  hotelbedsReference?: string;
  checkRateResponseSafe?: Record<string, unknown>;
  bookingResponseSafe?: Record<string, unknown>;
  requestSummarySafe?: Record<string, unknown>;
}) {
  const {
    bookingsCollection,
    booking,
    now,
    message,
    failedAt,
    validationErrors = [],
    checkRateStatus,
    checkRateBookable,
    bookingStatus,
    hotelbedsReference,
    checkRateResponseSafe,
    bookingResponseSafe,
    requestSummarySafe,
  } = params;
  const updates: Partial<BookingDocument> & Record<string, unknown> = {
    bookingStatus: "supplier_booking_failed",
    status: "supplier_booking_failed",
    supplierStatus: "failed",
    failureReason: message,
    "metadata.supplierSubmission": "failed",
    "metadata.supplierFailureStage": failedAt,
    "metadata.supplierError": message,
    "metadata.hotelbedsFlow": buildHotelbedsFlowMetadata({
      failedAt,
      errorMessage: message,
      validationErrors,
      checkRateStatus,
      checkRateBookable,
      bookingStatus,
      hotelbedsReference,
      checkRateResponseSafe,
      bookingResponseSafe,
      requestSummarySafe,
    }),
    updatedAt: now,
  };

  await bookingsCollection.updateOne({ _id: booking._id }, { $set: updates });
  logHotelbedsBookingFlow({
    internalBookingId: booking._id,
    step: "failed",
    failedAt,
    error: message,
  });

  return { ...booking, ...updates } as BookingDocument;
}

async function submitHotelbedsTesterBooking(params: {
  bookingsCollection: Collection<BookingDocument>;
  booking: BookingDocument;
}) {
  const { bookingsCollection, booking } = params;
  const now = new Date();
  const certificationBookingReference = String(
    booking.bookingReference || booking._id || booking.yourReference || "",
  );
  const hotelbedsEvidenceId = getHotelbedsEvidenceIdFrom(booking);
  const rateKey = String(booking.supplierRateKey || "");
  const selectedRooms = getHotelbedsSelectedRooms(booking);
  const selectedRateKeys = selectedRooms.map((room) => room.rateKey).filter(Boolean);
  const rateKeys = selectedRateKeys.length ? selectedRateKeys : rateKey ? [rateKey] : [];
  const selectionSummaryBase = getHotelbedsSelectionSummarySafe({
    booking,
    selectedRooms,
    rateKeys,
  });
  const checkRateStrategy = getHotelbedsCheckRateStrategy({
    selectedRooms,
    rateKeys,
  });
  const selectionSummarySafe = {
    ...selectionSummaryBase,
    checkRateStrategy,
    generatedCheckRatePayload: {
      ...asRecord(selectionSummaryBase.generatedCheckRatePayload),
      strategy: checkRateStrategy,
      oneRateKeyPerRequest:
        checkRateStrategy === "CHECKRATE_REQUIRED" ||
        checkRateStrategy === "CHECKRATE_ONE_RATE_KEY_PER_REQUEST",
      bookableDirect: checkRateStrategy === "BOOKABLE_DIRECT",
    },
  };
  const requestedRoomsCount = Number(selectionSummarySafe.requestedRoomsCount || 1);
  const selectedRateRoomsCount = Number(selectionSummarySafe.selectedRateRoomsCount || 0);
  const hasExplicitRoomSelection = Array.from({ length: requestedRoomsCount }).every(
    (_, roomIndex) =>
      selectedRooms.some((room) => room.roomIndex === roomIndex && Boolean(room.rateKey)),
  );
  const bookingBaseUrl = getHotelbedsBaseUrls().bookingBaseUrl;

  logHotelbedsBookingFlow({
    internalBookingId: booking._id,
    step: "received",
    status: rateKeys.length ? "rate_key_present" : "missing_rate_key",
  });

  if (!bookingBaseUrl.includes("api.test.hotelbeds.com")) {
    const message = "Hotelbeds tester booking requires Hotelbeds test environment.";
    return failHotelbedsBooking({
      bookingsCollection,
      booking,
      now,
      message,
      failedAt: "environment",
    });
  }

  if (!rateKeys.length) {
    const message = "Missing Hotelbeds rateKey; booking was not sent to supplier.";
    return failHotelbedsBooking({
      bookingsCollection,
      booking,
      now,
      message,
      failedAt: "local_validation",
      validationErrors: ["rateKey is required"],
      requestSummarySafe: selectionSummarySafe,
    });
  }

  if (selectedRateRoomsCount < requestedRoomsCount || !hasExplicitRoomSelection) {
    const message =
      "SELECTED_RATE_DOES_NOT_COVER_ALL_ROOMS: السعر المختار لا يغطي جميع الغرف المطلوبة، يرجى اختيار عرض آخر.";
    return failHotelbedsBooking({
      bookingsCollection,
      booking,
      now,
      message,
      failedAt: "local_validation",
      validationErrors: ["SELECTED_RATE_DOES_NOT_COVER_ALL_ROOMS"],
      requestSummarySafe: selectionSummarySafe,
    });
  }

  const client = createHotelbedsHotelsClient({ allowTesterBookingOverride: true });
  await writeHotelbedsEvidenceSafely(
    async () => {
      await attachHotelbedsSearchEvidenceToBooking({
        evidenceId: hotelbedsEvidenceId,
        bookingReference: certificationBookingReference,
      });
      await writeHotelbedsCertificationDocuments({
        bookingReference: certificationBookingReference,
        booking,
      });
    },
    "booking-start",
  );
  let checkRateStatus = "";
  let checkRateBookable: boolean | undefined;
  let checkRateResponseSafe: Record<string, unknown> | undefined;
  let requestSummarySafe: Record<string, unknown> | undefined = selectionSummarySafe;
  let checkedRateKeys = rateKeys;
  logHotelbedsBookingFlow({
    internalBookingId: booking._id,
    step: "checkrate_enabled_for_tester",
    status: "enabled",
  });
  logHotelbedsBookingFlow({
    internalBookingId: booking._id,
    step: "checkrate_strategy",
    status: checkRateStrategy,
    details: {
      selectedRooms: selectionSummarySafe.selectedRooms,
      generatedCheckRatePayload: selectionSummarySafe.generatedCheckRatePayload,
      warnings: selectionSummarySafe.warnings,
    },
  });
  logHotelbedsBookingFlow({
    internalBookingId: booking._id,
    step: "validated",
    status: "precheck_ok",
  });

  if (checkRateStrategy === "BOOKABLE_DIRECT") {
    checkRateStatus = "bookable_direct_skipped";
    checkRateBookable = true;
    checkRateResponseSafe = {
      status: checkRateStatus,
      rateKeysReturned: rateKeys.length,
      hasRateKey: rateKeys.length > 0,
    };
    await writeHotelbedsEvidenceSafely(
      async () => {
        await writeHotelbedsEvidenceLog({
          bookingReference: certificationBookingReference,
          fileName: "checkrate-request.json",
          payload: {
            supplier: "hotelbeds",
            notSent: true,
            reason: "BOOKABLE_DIRECT",
            strategy: checkRateStrategy,
            rateKeyPrefixes: rateKeys.map(getHotelbedsRateKeyPrefix),
            capturedAt: new Date().toISOString(),
          },
        });
        await writeHotelbedsEvidenceLog({
          bookingReference: certificationBookingReference,
          fileName: "checkrate-response.json",
          payload: {
            supplier: "hotelbeds",
            notReceived: true,
            reason: "BOOKABLE_DIRECT",
            status: checkRateStatus,
            bookable: true,
            capturedAt: new Date().toISOString(),
          },
        });
      },
      "checkrate-bookable-direct",
    );
    requestSummarySafe = {
      ...selectionSummarySafe,
      checkRateSkipped: true,
      checkedRateKeyPrefixes: rateKeys.map(getHotelbedsRateKeyPrefix),
    };
    logHotelbedsBookingFlow({
      internalBookingId: booking._id,
      step: "checkrate_skipped",
      status: checkRateStatus,
      details: {
        reason: "all_selected_rates_bookable_direct",
        selectedRooms: selectionSummarySafe.selectedRooms,
      },
    });
  } else {
    try {
      const checkedRateKeyList: string[] = [];
      const checkRateResponsesSafe: Array<Record<string, unknown>> = [];
      if (rateKeys.length > 1) {
        await writeHotelbedsEvidenceSafely(
          () =>
            writeHotelbedsEvidenceLog({
              bookingReference: certificationBookingReference,
              fileName: "checkrate-request.json",
              payload: {
                supplier: "hotelbeds",
                endpoint: `${bookingBaseUrl}/checkrates`,
                method: "POST",
                requests: rateKeys.map((currentRateKey, index) => ({
                  roomIndex: selectedRooms[index]?.roomIndex ?? index,
                  request: buildHotelbedsCheckRateBody({
                    rateKey: currentRateKey,
                    rateKeys: [currentRateKey],
                    language: "en",
                  }),
                })),
                strategy: checkRateStrategy,
                capturedAt: new Date().toISOString(),
              },
            }),
          "checkrate-aggregate-request",
        );
      }

      for (const [index, currentRateKey] of rateKeys.entries()) {
        const selectedRoom = selectedRooms[index];
        logHotelbedsBookingFlow({
          internalBookingId: booking._id,
          step: "before_checkrate",
          rateKeyPresent: Boolean(currentRateKey),
          rooms: 1,
          details: {
            strategy: checkRateStrategy,
            roomIndex: selectedRoom?.roomIndex ?? index,
            selectedRoom: selectionSummarySafe.selectedRooms[index],
            requestedOccupancy: selectionSummarySafe.requestedOccupancies[index],
            generatedCheckRatePayload: {
              rooms: [
                {
                  rateKeyPrefix: getHotelbedsRateKeyPrefix(currentRateKey),
                },
              ],
              roomsCount: 1,
              usesMultipleRateKeys: false,
            },
          },
        });

        const checkRatePayload = buildHotelbedsCheckRateBody({
          rateKey: currentRateKey,
          rateKeys: [currentRateKey],
          language: "en",
        });
        await writeHotelbedsEvidenceSafely(
          () =>
            writeHotelbedsEvidenceLog({
              bookingReference: certificationBookingReference,
              fileName:
                rateKeys.length > 1
                  ? `checkrate-request-room-${selectedRoom?.roomIndex ?? index}.json`
                  : "checkrate-request.json",
              payload: {
                supplier: "hotelbeds",
                endpoint: `${bookingBaseUrl}/checkrates`,
                method: "POST",
                request: checkRatePayload,
                roomIndex: selectedRoom?.roomIndex ?? index,
                capturedAt: new Date().toISOString(),
              },
            }),
          "checkrate-request",
        );
        const checkRateResponse = await client.checkRate({
          rateKey: currentRateKey,
          rateKeys: [currentRateKey],
          language: "en",
        });
        await writeHotelbedsEvidenceSafely(
          () =>
            writeHotelbedsEvidenceLog({
              bookingReference: certificationBookingReference,
              fileName:
                rateKeys.length > 1
                  ? `checkrate-response-room-${selectedRoom?.roomIndex ?? index}.json`
                  : "checkrate-response.json",
              payload: {
                supplier: "hotelbeds",
                endpoint: `${bookingBaseUrl}/checkrates`,
                method: "POST",
                response: checkRateResponse,
                roomIndex: selectedRoom?.roomIndex ?? index,
                capturedAt: new Date().toISOString(),
              },
            }),
          "checkrate-response",
        );
        const returnedRateKeys = extractHotelbedsRateKeys(checkRateResponse);
        const finalRateKey = returnedRateKeys[0] || currentRateKey;
        const roomCheckRateStatus = getHotelbedsStatus(checkRateResponse);
        const roomCheckRateBookable = isHotelbedsCheckRateBookable(checkRateResponse);
        const roomCheckRateResponseSafe = getHotelbedsFlowSafeResponse(checkRateResponse);

        checkedRateKeyList.push(finalRateKey);
        checkRateResponsesSafe.push({
          roomIndex: selectedRoom?.roomIndex ?? index,
          ...roomCheckRateResponseSafe,
        });

        logHotelbedsBookingFlow({
          internalBookingId: booking._id,
          step: "checkrate_response",
          status: roomCheckRateStatus,
          bookable: roomCheckRateBookable,
          details: {
            strategy: checkRateStrategy,
            roomIndex: selectedRoom?.roomIndex ?? index,
            rateKeyReturned: returnedRateKeys.length > 0,
          },
        });

        if (!roomCheckRateBookable) {
          checkRateStatus = roomCheckRateStatus;
          checkRateBookable = false;
          checkRateResponseSafe = {
            status: roomCheckRateStatus,
            roomIndex: selectedRoom?.roomIndex ?? index,
            responses: checkRateResponsesSafe,
          };
          return failHotelbedsBooking({
            bookingsCollection,
            booking,
            now,
            message: "CheckRate returned not bookable.",
            failedAt: "hotelbeds_checkrate",
            checkRateStatus,
            checkRateBookable,
            checkRateResponseSafe,
            requestSummarySafe: {
              ...requestSummarySafe,
              checkRateStrategy,
              checkRateResponsesSafe,
            },
          });
        }
      }

      checkedRateKeys = checkedRateKeyList.length ? checkedRateKeyList : rateKeys;
      checkRateStatus = "all_rooms_bookable";
      checkRateBookable = true;
      checkRateResponseSafe = {
        status: checkRateStatus,
        roomsChecked: checkRateResponsesSafe.length,
        responses: checkRateResponsesSafe,
      };
      if (rateKeys.length > 1) {
        await writeHotelbedsEvidenceSafely(
          () =>
            writeHotelbedsEvidenceLog({
              bookingReference: certificationBookingReference,
              fileName: "checkrate-response.json",
              payload: {
                supplier: "hotelbeds",
                endpoint: `${bookingBaseUrl}/checkrates`,
                method: "POST",
                status: checkRateStatus,
                bookable: checkRateBookable,
                responses: checkRateResponsesSafe,
                capturedAt: new Date().toISOString(),
              },
            }),
          "checkrate-aggregate-response",
        );
      }
      requestSummarySafe = {
        ...selectionSummarySafe,
        checkRateStrategy,
        checkRateResponsesSafe,
        checkedRateKeyPrefixes: checkedRateKeys.map(getHotelbedsRateKeyPrefix),
      };
    } catch (error) {
      const message =
        error instanceof HotelbedsHotelsClientError
          ? `${error.code}: ${error.message}`
          : safeErrorMessage(error);
      checkRateResponseSafe = getHotelbedsClientErrorSafeResponse(error);
      await writeHotelbedsEvidenceSafely(
        () =>
          writeHotelbedsEvidenceLog({
            bookingReference: certificationBookingReference,
            fileName: "checkrate-response.json",
            payload: {
              supplier: "hotelbeds",
              endpoint: `${bookingBaseUrl}/checkrates`,
              method: "POST",
              failed: true,
              error: checkRateResponseSafe,
              message,
              capturedAt: new Date().toISOString(),
            },
          }),
        "checkrate-error-response",
      );
      logHotelbedsBookingFlow({
        internalBookingId: booking._id,
        step: "failed",
        failedAt: "hotelbeds_checkrate",
        error: message,
        details: {
          strategy: checkRateStrategy,
        },
      });
      const updatedBooking = await failHotelbedsBooking({
        bookingsCollection,
        booking,
        now,
        message,
        failedAt: "hotelbeds_checkrate",
        checkRateStatus,
        checkRateBookable,
        checkRateResponseSafe,
        requestSummarySafe: {
          ...requestSummarySafe,
          checkRateStrategy,
        },
      });
      await writeHotelbedsEvidenceSafely(
        () =>
          writeHotelbedsCertificationDocuments({
            bookingReference: certificationBookingReference,
            booking: updatedBooking,
          }),
        "booking-documents-checkrate-failed",
      );
      await createLog({
        type: "supplier_booking_failed",
        status: "failed",
        message: "Hotelbeds Accommodation check-rate failed",
        request: {
          bookingId: booking._id,
          supplier: "hotelbeds",
          hasRateKey: rateKeys.length > 0,
        },
        response: {
          bookingId: booking._id,
          supplierStatus: "failed",
        },
        error: message,
      });

      return updatedBooking;
    }
  }

  try {
    const bookingRequest = buildHotelbedsBookingRequest(
      booking,
      checkedRateKeys.length ? checkedRateKeys : rateKeys,
    );
    const finalBookingPayload = buildHotelbedsBookingBody(bookingRequest);
    const hotelbedsFinalBookingPayloadSafe = getHotelbedsFinalBookingPayloadSafe(
      finalBookingPayload,
      selectedRooms,
    );
    requestSummarySafe = {
      ...selectionSummarySafe,
      ...getHotelbedsRequestSummarySafe(bookingRequest),
      hotelbedsFinalBookingPayloadSafe,
      generatedBookingPayload: {
        rooms: (bookingRequest.rooms || []).map((room) => ({
          rateKeyPrefix: getHotelbedsRateKeyPrefix(room.rateKey),
          paxes: room.guests.length,
          paxRoomIds: room.guests.map((guest) => guest.roomId ?? null),
          paxTypes: room.guests.map((guest) => guest.type || "AD"),
          paxNamePresent: room.guests.map((guest) => Boolean(guest.name && guest.surname)),
          childAges: room.guests
            .filter((guest) => guest.type === "CH")
            .map((guest) => guest.age ?? null),
        })),
        roomsCount: bookingRequest.rooms?.length || 0,
        paxesCount: bookingRequest.guests.length,
      },
    };
    const validationErrors = validateHotelbedsBookingRequest(booking, bookingRequest);
    if (hotelbedsFinalBookingPayloadSafe.payloadMismatch) {
      validationErrors.push(
        "HOTELBEDS_FINAL_BOOKING_PAYLOAD_INVALID",
        ...hotelbedsFinalBookingPayloadSafe.mismatchReasons,
      );
    }

    if (validationErrors.length > 0) {
      logHotelbedsBookingFlow({
        internalBookingId: booking._id,
        step: "failed",
        failedAt: "local_validation",
        error: validationErrors.join("; "),
        details: {
          hotelbedsFinalBookingPayloadSafe,
        },
      });
      return failHotelbedsBooking({
        bookingsCollection,
        booking,
        now,
        message: validationErrors.includes("HOTELBEDS_FINAL_BOOKING_PAYLOAD_INVALID")
          ? "HOTELBEDS_FINAL_BOOKING_PAYLOAD_INVALID"
          : validationErrors.some((item) => /roomId|pax|traveler|room count/i.test(item))
            ? "HOTELBEDS_INVALID_PAX_ROOM_DISTRIBUTION"
          : "Hotelbeds booking validation failed.",
        failedAt: "local_validation",
        validationErrors: validationErrors.includes("HOTELBEDS_FINAL_BOOKING_PAYLOAD_INVALID")
          ? validationErrors
          : validationErrors.some((item) => /roomId|pax|traveler|room count/i.test(item))
          ? ["HOTELBEDS_INVALID_PAX_ROOM_DISTRIBUTION", ...validationErrors]
          : validationErrors,
        checkRateStatus,
        checkRateBookable,
        checkRateResponseSafe,
        requestSummarySafe,
      });
    }

    logHotelbedsBookingFlow({
      internalBookingId: booking._id,
      step: "validated",
      status: "booking_payload_ok",
    });
    logHotelbedsBookingFlow({
      internalBookingId: booking._id,
      step: "before_booking",
      rooms: toNumber(requestSummarySafe.rooms),
      paxes: toNumber(requestSummarySafe.paxes),
      details: {
        generatedBookingPayload: requestSummarySafe.generatedBookingPayload,
        hotelbedsFinalBookingPayloadSafe,
      },
    });
    await writeHotelbedsEvidenceSafely(
      () =>
        writeHotelbedsEvidenceLog({
          bookingReference: certificationBookingReference,
          fileName: "booking-request.json",
          payload: {
            supplier: "hotelbeds",
            endpoint: `${bookingBaseUrl}/bookings`,
            method: "POST",
            request: finalBookingPayload,
            capturedAt: new Date().toISOString(),
          },
        }),
      "booking-request",
    );
    const bookingResponse = await client.book(bookingRequest);
    await writeHotelbedsEvidenceSafely(
      () =>
        writeHotelbedsEvidenceLog({
          bookingReference: certificationBookingReference,
          fileName: "booking-response.json",
          payload: {
            supplier: "hotelbeds",
            endpoint: `${bookingBaseUrl}/bookings`,
            method: "POST",
            response: bookingResponse,
            capturedAt: new Date().toISOString(),
          },
        }),
      "booking-response",
    );
    const hotelbedsReference = extractHotelbedsBookingReference(bookingResponse);
    const status = getHotelbedsStatus(bookingResponse);
    const bookingResponseSafe = getHotelbedsFlowSafeResponse(bookingResponse);
    const updates: Partial<BookingDocument> & Record<string, unknown> = {
      bookingStatus: "supplier_booking_confirmed",
      status: "supplier_booking_confirmed",
      supplierStatus: "confirmed",
      supplierBookingReference: hotelbedsReference,
      supplierReference: hotelbedsReference,
      supplierResponseStatus: status,
      rawSupplierResponse: bookingResponseSafe,
      "metadata.supplierSubmission": "sent_to_supplier",
      "metadata.supplierSubmittedAt": now.toISOString(),
      "metadata.hotelbedsCheckRateStatus": checkRateStatus,
      "metadata.hotelbedsBookingStatus": status,
      "metadata.hotelbedsBookingReference": hotelbedsReference,
      "metadata.hotelbedsBookingResponseSafe": bookingResponseSafe,
      "metadata.hotelbedsFlow": buildHotelbedsFlowMetadata({
        checkRateStatus,
        checkRateBookable,
        bookingStatus: status,
        hotelbedsReference,
        checkRateResponseSafe,
        bookingResponseSafe,
        requestSummarySafe,
      }),
      updatedAt: now,
    };

    await bookingsCollection.updateOne({ _id: booking._id }, { $set: updates });
    logHotelbedsBookingFlow({
      internalBookingId: booking._id,
      step: "booking_response",
      status,
      hotelbedsReference,
    });
    await createLog({
      type: "supplier_booking_confirmed",
      status: "success",
      message: "Hotelbeds Accommodation booking was submitted to supplier",
      request: {
        bookingId: booking._id,
        supplier: "hotelbeds",
        hasRateKey: rateKeys.length > 0,
      },
      response: {
        bookingId: booking._id,
        supplierStatus: "confirmed",
        supplierBookingReferencePresent: Boolean(hotelbedsReference),
      },
    });

    await writeHotelbedsEvidenceSafely(
      () =>
        writeHotelbedsCertificationDocuments({
          bookingReference: certificationBookingReference,
          booking: { ...booking, ...updates } as BookingDocument,
        }),
      "booking-documents-confirmed",
    );

    return { ...booking, ...updates } as BookingDocument;
  } catch (error) {
    const message =
      error instanceof HotelbedsHotelsClientError
        ? `${error.code}: ${error.message}`
        : safeErrorMessage(error);
    const bookingErrorSafe = getHotelbedsClientErrorSafeResponse(error);
    await writeHotelbedsEvidenceSafely(
      () =>
        writeHotelbedsEvidenceLog({
          bookingReference: certificationBookingReference,
          fileName: "booking-response.json",
          payload: {
            supplier: "hotelbeds",
            endpoint: `${bookingBaseUrl}/bookings`,
            method: "POST",
            failed: true,
            error: bookingErrorSafe,
            message,
            capturedAt: new Date().toISOString(),
          },
        }),
      "booking-error-response",
    );
    const updatedBooking = await failHotelbedsBooking({
      bookingsCollection,
      booking,
      now,
      message,
      failedAt: "hotelbeds_booking",
      checkRateStatus,
      checkRateBookable,
      checkRateResponseSafe,
      bookingResponseSafe: bookingErrorSafe,
      requestSummarySafe,
    });
    await writeHotelbedsEvidenceSafely(
      () =>
        writeHotelbedsCertificationDocuments({
          bookingReference: certificationBookingReference,
          booking: updatedBooking,
        }),
      "booking-documents-booking-failed",
    );
    await createLog({
      type: "supplier_booking_failed",
      status: "failed",
      message: "Hotelbeds Accommodation booking failed",
      request: {
        bookingId: booking._id,
        supplier: "hotelbeds",
        hasRateKey: rateKeys.length > 0,
      },
      response: {
        bookingId: booking._id,
        supplierStatus: "failed",
      },
      error: message,
    });

    return updatedBooking;
  }
}

async function runTboBookingDetailFallback(params: {
  bookingsCollection: Collection<BookingDocument>;
  booking: BookingDocument;
  supplierReference: string;
  supplierConfirmationNo?: string;
  reason: string;
}) {
  const {
    bookingsCollection,
    booking,
    supplierReference,
    supplierConfirmationNo,
    reason,
  } = params;
  const provider = new TboSupplierProvider();
  const now = new Date();
  let firebaseUpdated = false;

  try {
    const details = await provider.getBookingDetails({
      supplierBookingReference: supplierReference,
      metadata: {
        bookingId: booking._id,
        supplierConfirmationNo,
        reason,
      },
    });
    const detailsBookingId = getFirstSupplierDetailsValue(details, [
      "bookingId",
      "BookingId",
      "BookingID",
    ]);
    const detailsConfirmationNo = getFirstSupplierDetailsValue(details, [
      "confirmationNo",
      "confirmationNumber",
      "ConfirmationNo",
      "ConfirmationNumber",
    ]);
    const detailsReference =
      getFirstSupplierDetailsValue(details, [
        "supplierReference",
        "bookingReferenceId",
        "BookingReferenceId",
        "BookingRefNo",
      ]) || supplierReference;
    const raw = getRawSupplierDetailsObject(details);
    const statusRecord =
      raw.status && typeof raw.status === "object"
        ? (raw.status as Record<string, unknown>)
        : {};
    const statusDescription =
      typeof statusRecord.Description === "string"
        ? statusRecord.Description
        : getSupplierDetailsValue(details, "responseStatus");

    const updates: Partial<BookingDocument> & Record<string, unknown> = {
      bookingStatus: "supplier_booking_confirmed",
      status: "supplier_booking_confirmed",
      supplierStatus: "confirmed",
      supplierBookingReference: detailsReference,
      supplierBookingId: detailsBookingId,
      supplierConfirmationNo: detailsConfirmationNo || supplierConfirmationNo || "",
      supplierReference: detailsReference,
      supplierResponseStatus: statusDescription,
      rawSupplierResponse: details.rawSupplierResponse ?? null,
      "metadata.supplierSubmission": "confirmed_by_booking_detail",
      "metadata.bookingDetailCheckedAt": now.toISOString(),
      "metadata.bookingDetailReason": reason,
      updatedAt: now,
    };

    await bookingsCollection.updateOne({ _id: booking._id }, { $set: updates });
    firebaseUpdated = true;
    console.info(
      "[TBO BookingDetail Diagnostics]",
      JSON.stringify({
        internalBookingId: booking._id,
        confirmationNumberFound: Boolean(detailsConfirmationNo || supplierConfirmationNo),
        statusDescription: statusDescription || null,
        firebaseUpdated,
      }),
    );

    return { ...booking, ...updates } as BookingDocument;
  } catch (error) {
    const message = safeErrorMessage(error);
    const updates: Partial<BookingDocument> & Record<string, unknown> = {
      bookingStatus: "supplier_booking_verification_pending",
      status: "supplier_booking_verification_pending",
      supplierStatus: "verification_pending",
      failureReason: message,
      "metadata.supplierSubmission": "booking_detail_pending",
      "metadata.bookingDetailCheckedAt": now.toISOString(),
      "metadata.bookingDetailReason": reason,
      "metadata.bookingDetailError": message,
      updatedAt: now,
    };

    await bookingsCollection.updateOne({ _id: booking._id }, { $set: updates });
    firebaseUpdated = true;
    console.info(
      "[TBO BookingDetail Diagnostics]",
      JSON.stringify({
        internalBookingId: booking._id,
        confirmationNumberFound: Boolean(supplierConfirmationNo),
        statusDescription: message,
        firebaseUpdated,
      }),
    );

    return { ...booking, ...updates } as BookingDocument;
  }
}

function scheduleTboBookingDetailFallback(params: {
  bookingsCollection: Collection<BookingDocument>;
  booking: BookingDocument;
  supplierReference: string;
  supplierConfirmationNo?: string;
  reason: string;
}) {
  setTimeout(() => {
    runTboBookingDetailFallback(params).catch((error) => {
      console.info(
        "[TBO BookingDetail Diagnostics]",
        JSON.stringify({
          internalBookingId: params.booking._id,
          confirmationNumberFound: Boolean(params.supplierConfirmationNo),
          statusDescription: safeErrorMessage(error),
          firebaseUpdated: false,
        }),
      );
    });
  }, 120_000);
}

async function submitTboCertificationBooking(params: {
  bookingsCollection: Collection<BookingDocument>;
  booking: BookingDocument;
  stripeCheckoutEnabled: boolean;
  tboBookingEnabled: boolean;
}) {
  const { bookingsCollection, booking, stripeCheckoutEnabled, tboBookingEnabled } = params;
  const provider = new TboSupplierProvider();
  const supplierRequest = buildTboBookRequest(booking);
  const now = new Date();

  try {
    let preBookResponse: SupplierPreBookResponse;
    try {
      preBookResponse = await provider.preBook({
        supplierHotelId: String(booking.supplierHotelId || booking.hotelId || ""),
        supplierRateKey: String(booking.supplierRateKey || ""),
        checkIn: toDateString(booking.checkInDate),
        checkOut: toDateString(booking.checkOutDate),
        rooms: buildSupplierOccupancy(booking),
        currency: String(booking.currency || "USD"),
        metadata: {
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
        },
      });
    } catch (error) {
      const message = safeErrorMessage(error);
      const supplierError = getSupplierStageErrorCode("prebook", message);
      const updates: Partial<BookingDocument> & Record<string, unknown> = {
        bookingStatus: "supplier_booking_failed",
        status: "supplier_booking_failed",
        supplierStatus: "failed",
        failureReason: message,
        "metadata.supplierSubmission": "failed",
        "metadata.supplierError": supplierError,
        "metadata.supplierFailureStage": "prebook",
        "metadata.supplierSubmittedAt": now.toISOString(),
        "metadata.stripeBypassedForCertification": !stripeCheckoutEnabled,
        updatedAt: now,
      };

      await bookingsCollection.updateOne({ _id: booking._id }, { $set: updates });
      await createAdminNotificationSafely({
        type: "booking_failed",
        title: "Supplier booking failed",
        message: `Booking ${booking.bookingReference || booking._id} failed during supplier confirmation.`,
        severity: "error",
        targetRole: "admin",
        relatedType: "booking",
        relatedId: booking._id,
        data: {
          reference: String(booking.bookingReference || booking._id),
          customer: String(booking.customerEmail || ""),
          stage: "prebook",
        },
      });
      logTboCertificationBookingDiagnostics({
        internalBookingId: booking._id,
        tboBookingEnabled,
        stripeCheckoutEnabled,
        stripeBypassedForCertification: !stripeCheckoutEnabled,
        error: supplierError,
      });
      await createLog({
        type: "supplier_prebook_failed",
        status: "failed",
        message: "TBO certification PreBook failed",
        request: {
          bookingId: booking._id,
          supplier: "tbo",
          hasRateKey: Boolean(booking.supplierRateKey),
          hasHotelCode: Boolean(booking.supplierHotelId),
        },
        response: {
          bookingId: booking._id,
          supplierStatus: "failed",
          supplierError,
        },
        error: supplierError,
      });

      return { ...booking, ...updates } as BookingDocument;
    }

    const bookRequest: SupplierBookRequest = {
      ...supplierRequest,
      supplierRateKey: preBookResponse.supplierRateKey || supplierRequest.supplierRateKey,
      metadata: {
        ...(supplierRequest.metadata || {}),
        bookingCodeSource: "prebook",
        totalFare: preBookResponse.price || getBookingMetadataNumber(booking, "supplierTotalFare") || booking.totalPrice,
        preBookAvailable: preBookResponse.available,
      },
    };
    const supplierResponse = await provider.book(bookRequest);
    const supplierBookingId = getFirstSupplierResponseValue(supplierResponse, [
      "bookingId",
      "BookingId",
      "BookingID",
    ]);
    const supplierConfirmationNo = getFirstSupplierResponseValue(
      supplierResponse,
      ["confirmationNo", "confirmationNumber", "ConfirmationNo", "ConfirmationNumber"],
    );
    const supplierReference =
      getFirstSupplierResponseValue(supplierResponse, [
        "supplierReference",
        "bookingReferenceId",
        "BookingReferenceId",
        "BookingRefNo",
      ]) || supplierResponse.supplierBookingReference;
    const supplierTraceId = getFirstSupplierResponseValue(supplierResponse, [
      "traceId",
      "TraceId",
      "TraceID",
    ]);
    const supplierVoucherStatus = getFirstSupplierResponseValue(supplierResponse, [
      "voucherStatus",
      "VoucherStatus",
    ]);
    const supplierResponseStatus =
      getFirstSupplierResponseValue(supplierResponse, ["responseStatus"]) ||
      getStatusDescription(supplierResponse);
    const needsBookingDetailFollowUp =
      !supplierConfirmationNo ||
      /pending|processing|timeout|in progress|unknown/i.test(supplierResponseStatus);
    const updates: Partial<BookingDocument> & Record<string, unknown> = {
      bookingStatus: needsBookingDetailFollowUp
        ? "supplier_booking_verification_pending"
        : "supplier_booking_confirmed",
      status: needsBookingDetailFollowUp
        ? "supplier_booking_verification_pending"
        : "supplier_booking_confirmed",
      supplierStatus: needsBookingDetailFollowUp ? "verification_pending" : "confirmed",
      supplierBookingReference: supplierReference,
      supplierBookingId,
      supplierConfirmationNo,
      supplierReference,
      supplierTraceId,
      supplierVoucherStatus,
      supplierResponseStatus,
      rawSupplierRequest: supplierResponse.rawSupplierRequest ?? null,
      rawSupplierResponse: supplierResponse.rawSupplierResponse ?? null,
      "metadata.supplierSubmission": "sent_to_supplier",
      "metadata.supplierSubmittedAt": now.toISOString(),
      "metadata.bookingDetailScheduled": needsBookingDetailFollowUp,
      "metadata.preBookRspPrice": preBookResponse.rspPrice ?? null,
      "metadata.roomPromotions": preBookResponse.roomPromotions || [],
      "metadata.supplements": preBookResponse.supplements || [],
      "metadata.inclusions": preBookResponse.inclusions || [],
      "metadata.cancellationPolicies": preBookResponse.cancellationPolicies || [],
      "metadata.rateConditions": preBookResponse.rateConditions || [],
      "metadata.amenities": preBookResponse.amenities || [],
      "metadata.stripeBypassedForCertification": !stripeCheckoutEnabled,
      updatedAt: now,
    };

    await bookingsCollection.updateOne({ _id: booking._id }, { $set: updates });
    if (needsBookingDetailFollowUp) {
      scheduleTboBookingDetailFallback({
        bookingsCollection,
        booking: { ...booking, ...updates } as BookingDocument,
        supplierReference,
        supplierConfirmationNo,
        reason: "book_response_requires_verification",
      });
    }
    logTboCertificationBookingDiagnostics({
      internalBookingId: booking._id,
      tboBookingEnabled,
      stripeCheckoutEnabled,
      stripeBypassedForCertification: !stripeCheckoutEnabled,
      statusCode: getHttpStatusCode(supplierResponse),
      statusDescription: supplierResponseStatus,
      bookingIdReturned: Boolean(supplierBookingId),
    });
    await createLog({
      type: "supplier_booking_confirmed",
      status: "success",
      message: "TBO certification booking was submitted to supplier",
      request: {
        bookingId: booking._id,
        supplier: "tbo",
        hasRateKey: Boolean(booking.supplierRateKey),
        hasHotelCode: Boolean(booking.supplierHotelId),
      },
      response: {
        bookingId: booking._id,
        supplierStatus: needsBookingDetailFollowUp ? "verification_pending" : "confirmed",
        supplierBookingIdPresent: Boolean(supplierBookingId),
      },
    });

    return { ...booking, ...updates } as BookingDocument;
  } catch (error) {
    const message = safeErrorMessage(error);
    const supplierError = getSupplierStageErrorCode("book", message);
    const shouldVerifyWithBookingDetail = /timeout|aborted|network|fetch failed|unknown/i.test(message);
    if (shouldVerifyWithBookingDetail) {
      return runTboBookingDetailFallback({
        bookingsCollection,
        booking,
        supplierReference: String(booking.yourReference || booking.bookingReference || booking._id),
        reason: "book_error_requires_verification",
      });
    }
    const updates: Partial<BookingDocument> & Record<string, unknown> = {
      bookingStatus: "supplier_booking_failed",
      status: "supplier_booking_failed",
      supplierStatus: "failed",
      failureReason: message,
      "metadata.supplierSubmission": "failed",
      "metadata.supplierError": supplierError,
      "metadata.supplierFailureStage": "book",
      "metadata.supplierSubmittedAt": now.toISOString(),
      "metadata.stripeBypassedForCertification": !stripeCheckoutEnabled,
      updatedAt: now,
    };

    await bookingsCollection.updateOne({ _id: booking._id }, { $set: updates });
    await createAdminNotificationSafely({
      type: "booking_failed",
      title: "Supplier booking failed",
      message: `Booking ${booking.bookingReference || booking._id} failed during supplier confirmation.`,
      severity: "error",
      targetRole: "admin",
      relatedType: "booking",
      relatedId: booking._id,
      data: {
        reference: String(booking.bookingReference || booking._id),
        customer: String(booking.customerEmail || ""),
        stage: "book",
      },
    });
    logTboCertificationBookingDiagnostics({
      internalBookingId: booking._id,
      tboBookingEnabled,
      stripeCheckoutEnabled,
      stripeBypassedForCertification: !stripeCheckoutEnabled,
      error: supplierError,
    });
    await createLog({
      type: "supplier_booking_failed",
      status: "failed",
      message: "TBO certification Book failed",
      request: {
        bookingId: booking._id,
        supplier: "tbo",
        hasRateKey: Boolean(booking.supplierRateKey),
        hasHotelCode: Boolean(booking.supplierHotelId),
      },
      response: {
        bookingId: booking._id,
        supplierStatus: "failed",
      },
      error: supplierError,
    });

    return { ...booking, ...updates } as BookingDocument;
  }
}

// GET - Fetch user's booking history
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const db = await getFirestoreMongoDb();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = toNumber(searchParams.get("limit"), 50);
    const page = toNumber(searchParams.get("page"), 1);
    const query: Record<string, unknown> = {
      userId: decoded.userId,
      archived: { $ne: true },
      hiddenFromCustomerBookings: { $ne: true },
    };

    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const bookingsCollection = db.collection<BookingDocument>("bookings");

    if (isTesterToken(decoded)) {
      const allBookings = await bookingsCollection.find(query).sort({ createdAt: -1 }).toArray();
      const visibleBookings = allBookings.filter((booking) => !isHiddenTesterBooking(booking));
      const bookings = visibleBookings.slice(skip, skip + limit);

      return NextResponse.json({
        success: true,
        bookings,
        pagination: {
          page,
          limit,
          total: visibleBookings.length,
          pages: Math.ceil(visibleBookings.length / limit),
        },
      });
    }

    const bookings = await bookingsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const total = await bookingsCollection.countDocuments(query);

    return NextResponse.json({
      success: true,
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Bookings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}

// POST - Create a new booking before payment
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const body = await req.json();
    const db = await getFirestoreMongoDb();
    const user = await getUserById(decoded.userId);
    const stripeCheckoutEnabled =
      process.env.STRIPE_CHECKOUT_ENABLED === "true" ||
      process.env.NEXT_PUBLIC_ENABLE_STRIPE_CHECKOUT === "true";
    const tboBookingEnabled = isEnabled(process.env.TBO_BOOKING_ENABLED);
    const tboCertificationMode = isEnabled(process.env.TBO_CERTIFICATION_MODE);
    const requestedSupplier = normalizeSupplier(body.supplier);
    const userRole = String(user?.role || decoded.role || "");
    const userSupplierScope = normalizeSupplier(user?.supplierScope || decoded.supplierScope);
    const isHotelbedsSupplierTester =
      userRole === "supplier_tester" && userSupplierScope === "hotelbeds";

    if (
      isHotelbedsSupplierTester &&
      requestedSupplier !== "hotelbeds" &&
      requestedSupplier !== "none"
    ) {
      console.info(
        "[Hotelbeds Booking Flow]",
        JSON.stringify({
          supplier: requestedSupplier,
          provider: requestedSupplier,
          supplierTester: true,
          blocked: true,
        }),
      );
      return NextResponse.json(
        { error: "Invalid supplier route for Hotelbeds tester." },
        { status: 400 },
      );
    }

    const supplier = isHotelbedsSupplierTester ? "hotelbeds" : requestedSupplier;
    if (
      supplier === "hotelbeds" &&
      (typeof body.BookingCode === "string" || typeof body.bookingCode === "string")
    ) {
      return NextResponse.json(
        { error: "Invalid supplier route for Hotelbeds tester." },
        { status: 400 },
      );
    }
    if (isHotelbedsSupplierTester) {
      console.info(
        "[Hotelbeds Booking Flow]",
        JSON.stringify({
          supplier: "hotelbeds",
          provider: "hotelbeds",
          supplierTester: true,
        }),
      );
    }
    const shouldSubmitTboCertificationBooking =
      supplier === "tbo" && tboCertificationMode && tboBookingEnabled;
    const shouldSubmitHotelbedsTesterBooking =
      isHotelbedsSupplierTester && supplier === "hotelbeds";
    const travelerValidationError = Array.isArray(body.travelers)
      ? validateBookingTravelers(body.travelers)
      : "Traveler details are required.";
    if (travelerValidationError) {
      return NextResponse.json(
        { error: "GUEST_VALIDATION_FAILED", message: travelerValidationError },
        { status: 400 },
      );
    }
    const internalOnlyBooking =
      !stripeCheckoutEnabled &&
      !shouldSubmitTboCertificationBooking &&
      !shouldSubmitHotelbedsTesterBooking;
    const bookingStatus = internalOnlyBooking
      ? "supplier_booking_not_started"
      : shouldSubmitTboCertificationBooking || shouldSubmitHotelbedsTesterBooking
        ? "supplier_booking_processing"
        : isBookingStatus(body.status)
          ? body.status
          : "pending_payment";
    const channel =
      body.channel === "b2b" || user?.accountType === "b2b" ? "b2b" : "b2c";
    const totalPrice = toNumber(body.totalPrice);
    const finalSellingPrice = toNumber(body.finalSellingPrice, totalPrice);
    const now = new Date();
    const bookingId = getBookingId(body.bookingReference);
    const bodyHotelbedsPackage = asRecord(body.hotelbedsPackage);
    const bookingCurrency =
      supplier === "hotelbeds"
        ? asString(bodyHotelbedsPackage.currency) || asString(body.currency)
        : asString(body.currency) || "USD";
    const supplierMetadata =
      supplier === "hotelbeds"
        ? {}
        : {
            tboBookingEnabled,
            tboCertificationMode,
            stripeBypassedForCertification:
              shouldSubmitTboCertificationBooking && !stripeCheckoutEnabled,
          };
    const booking: BookingDocument = {
      _id: bookingId,
      userId: decoded.userId,
      channel,
      inventorySource: body.inventorySource || "supplier",
      agencyId: channel === "b2b" ? body.agencyId || user?.agencyId || null : null,
      agencyUserId: channel === "b2b" ? body.agencyUserId || decoded.userId : null,
      agencyRole: channel === "b2b" ? body.agencyRole || user?.agencyRole || "" : "",
      agentName: channel === "b2b" ? body.agentName || user?.name || "" : "",
      customerUserId: channel === "b2c" ? decoded.userId : body.customerUserId || null,
      customerEmail: body.customerEmail || body.contactEmail || user?.email || "",
      customerName: body.customerName || body.leadGuest || user?.name || "",
      bookingReference: body.bookingReference || bookingId,
      travellandaReference: body.travellandaReference || "",
      yourReference: body.yourReference || body.bookingReference || bookingId,
      supplier,
      supplierHotelId: body.supplierHotelId || "",
      supplierRateKey: body.supplierRateKey || "",
      hotelbedsEvidenceId:
        supplier === "hotelbeds"
          ? asString(body.hotelbedsEvidenceId) || asString(asRecord(body.metadata).hotelbedsEvidenceId)
          : "",
      hotelbedsSelectedRooms: Array.isArray(body.hotelbedsSelectedRooms)
        ? body.hotelbedsSelectedRooms
        : [],
      hotelbedsPackage:
        body.hotelbedsPackage && typeof body.hotelbedsPackage === "object"
          ? body.hotelbedsPackage
          : null,
      supplierBookingReference: body.supplierBookingReference || "",
      hotelId: toNumber(body.hotelId),
      hotelName: body.hotelName || "",
      location: body.location || "",
      checkInDate: toDate(body.checkInDate),
      checkOutDate: toDate(body.checkOutDate),
      rooms: Array.isArray(body.rooms) ? body.rooms : [],
      travelers: Array.isArray(body.travelers)
        ? body.travelers.map((traveler: Record<string, unknown>) => ({
            ...traveler,
            title:
              traveler.travelerType === "child"
                ? "Child"
                : normalizeGuestTitle(traveler.title),
            firstName: String(traveler.firstName || "").trim(),
            lastName: String(traveler.lastName || "").trim(),
          }))
        : [],
      leadGuest: body.leadGuest || "Guest",
      contactEmail: body.contactEmail || user?.email || "",
      contactPhone: body.contactPhone || "",
      totalPrice,
      netPrice: toNumber(body.netPrice, totalPrice),
      markupAmount: toNumber(body.markupAmount),
      markupPercent: toNumber(body.markupPercent),
      commissionAmount: toNumber(body.commissionAmount),
      finalSellingPrice,
      currency: bookingCurrency,
      paymentMethodType: body.paymentMethodType || "card",
      agencyBalanceBefore: toNumber(body.agencyBalanceBefore),
      agencyBalanceAfter: toNumber(body.agencyBalanceAfter),
      creditLimitUsed: toNumber(body.creditLimitUsed),
      status: bookingStatus,
      bookingStatus,
      paymentStatus: !stripeCheckoutEnabled
        ? "not_required_for_test"
        : body.paymentStatus || "pending",
      supplierStatus: shouldSubmitTboCertificationBooking || shouldSubmitHotelbedsTesterBooking
        ? "pending"
        : internalOnlyBooking
        ? "not_started"
        : body.supplierStatus || "not_started",
      specialRequests: body.specialRequests || "",
      cancellationPolicies: Array.isArray(body.cancellationPolicies)
        ? body.cancellationPolicies
        : [],
      alerts: Array.isArray(body.alerts) ? body.alerts : [],
      restrictions: Array.isArray(body.restrictions) ? body.restrictions : [],
      stripeSessionId: body.stripeSessionId || "",
      stripeCheckoutSessionId: body.stripeCheckoutSessionId || "",
      stripePaymentIntentId: body.stripePaymentIntentId || "",
      failureReason: body.failureReason || "",
      rawSupplierRequest: body.rawSupplierRequest ?? null,
      rawSupplierResponse: body.rawSupplierResponse ?? null,
      idempotencyKey: body.idempotencyKey || `booking-${bookingId}`,
      retryCount: 0,
      maxRetryCount: 3,
      metadata: {
        ...(body.metadata || {}),
        hotelbedsEvidenceId:
          supplier === "hotelbeds"
            ? asString(body.hotelbedsEvidenceId) || asString(asRecord(body.metadata).hotelbedsEvidenceId)
            : undefined,
        bookingMode: internalOnlyBooking ? "internal_only" : "payment_or_supplier_flow",
        ...supplierMetadata,
        stripeCheckoutEnabled,
        supplierSubmission: shouldSubmitTboCertificationBooking || shouldSubmitHotelbedsTesterBooking
          ? "pending_supplier_submission"
          : "not_sent_to_supplier",
      },
      createdAt: now,
      updatedAt: now,
    };

    const bookingsCollection = db.collection<BookingDocument>("bookings");
    const existingBooking = await bookingsCollection.findOne({ _id: booking._id });
    if (existingBooking) {
      return NextResponse.json(
        {
          success: true,
          message: "Booking already exists",
          booking: existingBooking,
        },
        { status: 200 },
      );
    }
    await bookingsCollection.insertOne(booking);
    await createAdminNotificationSafely({
      type: "booking_created",
      title: "New booking created",
      message: `Booking ${booking.bookingReference || booking._id} was created.`,
      severity: "success",
      targetRole: "admin",
      relatedType: "booking",
      relatedId: booking._id,
      data: {
        reference: String(booking.bookingReference || booking._id),
        customer: String(booking.customerEmail || ""),
        amount: Number(booking.totalPrice || 0),
        currency: String(booking.currency || ""),
      },
    });
    await createLog({
      type: "booking_created",
      status: "success",
      message: "Internal booking created before payment",
      request: {
        hotelId: body.hotelId,
        hotelName: body.hotelName,
        checkInDate: body.checkInDate,
        checkOutDate: body.checkOutDate,
        totalPrice: body.totalPrice,
        currency: bookingCurrency,
        supplier: body.supplier || "none",
        channel,
      },
      response: {
        bookingId,
        bookingReference: booking.bookingReference,
        channel: booking.channel,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        supplierStatus: booking.supplierStatus,
      },
    });

    let responseBooking = booking;
    if (shouldSubmitTboCertificationBooking) {
      responseBooking = await submitTboCertificationBooking({
        bookingsCollection,
        booking,
        stripeCheckoutEnabled,
        tboBookingEnabled,
      });
    } else if (shouldSubmitHotelbedsTesterBooking) {
      responseBooking = await submitHotelbedsTesterBooking({
        bookingsCollection,
        booking,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message:
          responseBooking.bookingStatus === "supplier_booking_failed" &&
          responseBooking.supplier === "hotelbeds"
            ? "تعذر تأكيد الحجز من Hotelbeds، وتم حفظ الطلب للمراجعة."
            : "Booking created successfully",
        booking: responseBooking,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create booking",
      },
      { status: 500 },
    );
  }
}
