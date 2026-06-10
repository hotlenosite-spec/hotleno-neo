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
  createHotelbedsHotelsClient,
  HotelbedsHotelsClientError,
} from "@/lib/suppliers/hotelbeds-hotels-client";
import { getHotelbedsBaseUrls } from "@/lib/suppliers/hotelbeds-auth";
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
    routeVersion: "hotelbeds-flow-v3",
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
}) {
  console.info(
    "[Hotelbeds Booking Flow]",
    JSON.stringify({
      internalBookingId: params.internalBookingId,
      step: params.step,
      routeVersion: params.routeVersion || "hotelbeds-flow-v3",
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
  const primaryRateKey = String(finalRateKeys?.[0] || booking.supplierRateKey || "");

  const guests: HotelbedsHotelGuest[] = travelers.map((traveler) => {
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
  const roomIds = [...new Set(guests.map((guest) => guest.roomId || 1))].sort(
    (left, right) => left - right,
  );

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
    rooms: roomIds.map((roomId, index) => ({
      rateKey: String(finalRateKeys?.[index] || primaryRateKey),
      guests: guests.filter((guest) => (guest.roomId || 1) === roomId),
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

  request.rooms?.forEach((room, roomIndex) => {
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
    room.guests.forEach((guest, guestIndex) => {
      if (!guest.name.trim() || !guest.surname.trim()) {
        errors.push(`room ${roomIndex + 1} pax ${guestIndex + 1} name is required`);
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
  const rateKey = String(booking.supplierRateKey || "");
  const bookingBaseUrl = getHotelbedsBaseUrls().bookingBaseUrl;

  logHotelbedsBookingFlow({
    internalBookingId: booking._id,
    step: "received",
    status: rateKey ? "rate_key_present" : "missing_rate_key",
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

  if (!rateKey) {
    const message = "Missing Hotelbeds rateKey; booking was not sent to supplier.";
    return failHotelbedsBooking({
      bookingsCollection,
      booking,
      now,
      message,
      failedAt: "checkrate",
      validationErrors: ["rateKey is required"],
    });
  }

  const client = createHotelbedsHotelsClient();
  logHotelbedsBookingFlow({
    internalBookingId: booking._id,
    step: "validated",
    status: "precheck_ok",
  });

  try {
    logHotelbedsBookingFlow({
      internalBookingId: booking._id,
      step: "before_checkrate",
      rateKeyPresent: Boolean(rateKey),
    });
    const checkRateResponse = await client.checkRate({
      rateKey,
      rateKeys: [rateKey],
      language: "en",
    });
    const checkedRateKeys = extractHotelbedsRateKeys(checkRateResponse);
    const checkRateResponseSafe = getHotelbedsFlowSafeResponse(checkRateResponse);
    const checkRateBookable = isHotelbedsCheckRateBookable(checkRateResponse);
    logHotelbedsBookingFlow({
      internalBookingId: booking._id,
      step: "checkrate_response",
      status: getHotelbedsStatus(checkRateResponse),
      bookable: checkRateBookable,
    });

    if (!checkRateBookable) {
      return failHotelbedsBooking({
        bookingsCollection,
        booking,
        now,
        message: "CheckRate returned not bookable.",
        failedAt: "checkrate",
        checkRateStatus: getHotelbedsStatus(checkRateResponse),
        checkRateBookable,
        checkRateResponseSafe,
      });
    }

    const bookingRequest = buildHotelbedsBookingRequest(
      booking,
      checkedRateKeys.length ? checkedRateKeys : [rateKey],
    );
    const requestSummarySafe = getHotelbedsRequestSummarySafe(bookingRequest);
    const validationErrors = validateHotelbedsBookingRequest(booking, bookingRequest);

    if (validationErrors.length > 0) {
      logHotelbedsBookingFlow({
        internalBookingId: booking._id,
        step: "failed",
        failedAt: "validation",
        error: validationErrors.join("; "),
      });
      return failHotelbedsBooking({
        bookingsCollection,
        booking,
        now,
        message: "Hotelbeds booking validation failed.",
        failedAt: "validation",
        validationErrors,
        checkRateStatus: getHotelbedsStatus(checkRateResponse),
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
      rooms: requestSummarySafe.rooms,
      paxes: requestSummarySafe.paxes,
    });
    const bookingResponse = await client.book(bookingRequest);
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
      "metadata.hotelbedsCheckRateStatus": getHotelbedsStatus(checkRateResponse),
      "metadata.hotelbedsBookingStatus": status,
      "metadata.hotelbedsBookingReference": hotelbedsReference,
      "metadata.hotelbedsBookingResponseSafe": bookingResponseSafe,
      "metadata.hotelbedsFlow": buildHotelbedsFlowMetadata({
        checkRateStatus: getHotelbedsStatus(checkRateResponse),
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
        hasRateKey: Boolean(rateKey),
      },
      response: {
        bookingId: booking._id,
        supplierStatus: "confirmed",
        supplierBookingReferencePresent: Boolean(hotelbedsReference),
      },
    });

    return { ...booking, ...updates } as BookingDocument;
  } catch (error) {
    const message =
      error instanceof HotelbedsHotelsClientError
        ? `${error.code}: ${error.message}`
        : safeErrorMessage(error);
    const updatedBooking = await failHotelbedsBooking({
      bookingsCollection,
      booking,
      now,
      message,
      failedAt: "hotelbeds_booking",
    });
    await createLog({
      type: "supplier_booking_failed",
      status: "failed",
      message: "Hotelbeds Accommodation booking failed",
      request: {
        bookingId: booking._id,
        supplier: "hotelbeds",
        hasRateKey: Boolean(rateKey),
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
      currency: body.currency || "USD",
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
        bookingMode: internalOnlyBooking ? "internal_only" : "payment_or_supplier_flow",
        tboBookingEnabled,
        tboCertificationMode,
        stripeBypassedForCertification:
          shouldSubmitTboCertificationBooking && !stripeCheckoutEnabled,
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
        currency: body.currency,
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
