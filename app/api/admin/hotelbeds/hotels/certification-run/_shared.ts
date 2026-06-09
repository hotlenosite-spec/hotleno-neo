import { NextRequest, NextResponse } from "next/server";
import {
  buildHotelbedsAvailabilityBody,
  buildHotelbedsBookingBody,
  buildHotelbedsCheckRateBody,
  createHotelbedsHotelsClient,
  HotelbedsHotelsClient,
  HotelbedsHotelsClientError,
} from "@/lib/suppliers/hotelbeds-hotels-client";
import {
  getHotelbedsBaseUrls,
  hasHotelbedsCredentials,
  isHotelbedsHotelsBookingEnabled,
  isHotelbedsHotelsSearchEnabled,
} from "@/lib/suppliers/hotelbeds-auth";
import { requireHotelbedsAccommodationCertificationAccess } from "@/lib/certification/hotelbeds-accommodation-certification-auth";
import {
  appendAccommodationCertificationLog,
  readAccommodationCertificationLog,
  type HotelbedsAccommodationCertificationStep,
} from "@/lib/certification/hotelbeds-accommodation-certification-log";
import type {
  HotelbedsHotelAvailabilityRequest,
  HotelbedsHotelBookingRequest,
  HotelbedsHotelCheckRateRequest,
} from "@/types/hotelbeds-hotels-certification";

export const DEFAULT_AVAILABILITY_REQUEST: HotelbedsHotelAvailabilityRequest = {
  destinationCode: "BCN",
  checkIn: futureDate(35),
  checkOut: futureDate(36),
  rooms: [
    { adults: 1, children: 0, childrenAges: [] },
    { adults: 1, children: 1, childrenAges: [7] },
  ],
  nationality: "SA",
  currency: "EUR",
};

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isTestHotelbedsBaseUrl() {
  const urls = getHotelbedsBaseUrls();
  return urls.bookingBaseUrl.includes("api.test.hotelbeds.com");
}

export function jsonError(status: number, error: string, message: string, debug?: unknown) {
  return NextResponse.json({ success: false, error, message, debug }, { status });
}

export function requireAccessAndEnvironment(req: NextRequest, needsBooking = false) {
  const access = requireHotelbedsAccommodationCertificationAccess(req);
  if (access.response) return access.response;

  if (process.env.NODE_ENV === "production") {
    return jsonError(
      403,
      "HOTELBEDS_CERTIFICATION_PRODUCTION_BLOCKED",
      "Hotelbeds Accommodation certification run is disabled in production.",
    );
  }

  if (!isTestHotelbedsBaseUrl()) {
    return jsonError(
      403,
      "HOTELBEDS_CERTIFICATION_TEST_ENV_REQUIRED",
      "Hotelbeds Accommodation certification must use the Hotelbeds test booking base URL.",
      { bookingBaseUrl: getHotelbedsBaseUrls().bookingBaseUrl },
    );
  }

  if (!hasHotelbedsCredentials()) {
    return jsonError(
      400,
      "HOTELBEDS_CERTIFICATION_CREDENTIALS_MISSING",
      "Hotelbeds Accommodation credentials are not configured.",
    );
  }

  if (!isHotelbedsHotelsSearchEnabled()) {
    return jsonError(
      403,
      "HOTELBEDS_CERTIFICATION_SEARCH_DISABLED",
      "Hotelbeds Accommodation search is disabled in this environment.",
    );
  }

  if (needsBooking && !isHotelbedsHotelsBookingEnabled()) {
    return jsonError(
      403,
      "HOTELBEDS_CERTIFICATION_BOOKING_DISABLED",
      "Hotelbeds Accommodation booking is disabled in this environment.",
    );
  }

  return null;
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

export function extractRateKeys(payload: unknown) {
  const keys: string[] = [];

  function visit(value: unknown, depth = 0) {
    if (depth > 8 || keys.length >= 6) return;
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

export function extractBookingReference(payload: unknown) {
  const record = asRecord(payload);
  const booking = asRecord(record.booking || asArray(record.bookings)[0]);
  return (
    asString(record.reference) ||
    asString(record.bookingReference) ||
    asString(booking.reference) ||
    asString(booking.bookingReference)
  );
}

export async function runHotelbedsStep(args: {
  step: HotelbedsAccommodationCertificationStep;
  endpoint: string;
  request: unknown;
  supplierRequest: unknown;
  execute: () => Promise<unknown>;
  selectedRateKeys?: string[];
  internalBookingReference?: string;
}) {
  const timestamp = new Date().toISOString();

  try {
    const response = await args.execute();
    const supplierBookingReference = extractBookingReference(response);
    const selectedRateKeys = args.selectedRateKeys?.length
      ? args.selectedRateKeys
      : extractRateKeys(response).slice(0, 2);

    const voucher =
      args.step === "booking" || args.step === "details" || args.step === "cancel"
        ? createHotelbedsHotelsClient().mapVoucher(response)
        : undefined;

    const log = await appendAccommodationCertificationLog(
      {
        step: args.step,
        status: "success",
        timestamp,
        endpoint: args.endpoint,
        request: {
          appRequest: args.request,
          supplierRequest: args.supplierRequest,
        },
        response,
        supplierBookingReference,
        internalBookingReference: args.internalBookingReference,
        selectedRateKeys,
      },
      {
        status:
          args.step === "cancel"
            ? "cancelled"
            : args.step === "booking"
              ? "booked"
              : "in_progress",
        selectedRateKeys,
        supplierBookingReference: supplierBookingReference || undefined,
        internalBookingReference: args.internalBookingReference,
        voucher,
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        response,
        supplierBookingReference,
        internalBookingReference: args.internalBookingReference,
        selectedRateKeys,
        voucher,
      },
      log,
      debug: { requestUsage: HotelbedsHotelsClient.getRequestUsage() },
    });
  } catch (error) {
    const log = await appendAccommodationCertificationLog(
      {
        step: args.step,
        status: "failed",
        timestamp,
        endpoint: args.endpoint,
        request: {
          appRequest: args.request,
          supplierRequest: args.supplierRequest,
        },
        error:
          error instanceof HotelbedsHotelsClientError
            ? { code: error.code, status: error.status, message: error.message }
            : { message: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: "failed" },
    );

    if (error instanceof HotelbedsHotelsClientError) {
      return jsonError(error.status || 502, error.code, error.message, { log });
    }

    return jsonError(500, "HOTELBEDS_CERTIFICATION_STEP_FAILED", "Hotelbeds Accommodation certification step failed.", { log });
  }
}

export async function getCurrentRateKeys() {
  const log = await readAccommodationCertificationLog();
  if (log.selectedRateKeys?.length) return log.selectedRateKeys;
  const availability = [...log.entries].reverse().find((entry) => entry.step === "availability");
  return availability?.selectedRateKeys || [];
}

export function createCheckRateRequest(rateKeys: string[]): HotelbedsHotelCheckRateRequest {
  return { rateKey: rateKeys[0] || "", rateKeys: rateKeys.slice(0, 2), language: "en" };
}

export function createBookingRequest(rateKeys: string[]): HotelbedsHotelBookingRequest {
  const primaryRateKey = rateKeys[0] || "";
  const secondaryRateKey = rateKeys[1] || primaryRateKey;

  return {
    clientReference: `HOTLENO-HTL-${Date.now()}`.slice(0, 20),
    holder: { name: "Naif", surname: "Alotaibi" },
    rateKey: primaryRateKey,
    rooms: [
      {
        rateKey: primaryRateKey,
        guests: [
          { title: "Mr", name: "Naif", surname: "Alotaibi", type: "AD", roomId: 1 },
        ],
      },
      {
        rateKey: secondaryRateKey,
        guests: [
          { title: "Mr", name: "Test", surname: "Adult", type: "AD", roomId: 2 },
          { title: "Ms", name: "Test", surname: "Child", type: "CH", age: 7, roomId: 2 },
        ],
      },
    ],
    guests: [
      { title: "Mr", name: "Naif", surname: "Alotaibi", type: "AD", roomId: 1 },
      { title: "Mr", name: "Test", surname: "Adult", type: "AD", roomId: 2 },
      { title: "Ms", name: "Test", surname: "Child", type: "CH", age: 7, roomId: 2 },
    ],
    remark: "Hotelbeds Accommodation certification test booking.",
    language: "en",
  };
}

export {
  buildHotelbedsAvailabilityBody,
  buildHotelbedsBookingBody,
  buildHotelbedsCheckRateBody,
  createHotelbedsHotelsClient,
};
