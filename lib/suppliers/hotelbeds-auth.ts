import { createHash } from "crypto";

const DEFAULT_BASE_URL = "https://api.test.hotelbeds.com";
const DEFAULT_CONTENT_BASE_URL =
  "https://api.test.hotelbeds.com/hotel-content-api/1.0";
const DEFAULT_BOOKING_BASE_URL = "https://api.test.hotelbeds.com/hotel-api/1.0";

export type HotelbedsCredentials = {
  apiKey: string;
  secret: string;
};

export type HotelbedsBaseUrls = {
  baseUrl: string;
  secureBaseUrl: string;
  contentBaseUrl: string;
  bookingBaseUrl: string;
};

export class HotelbedsCredentialsError extends Error {
  readonly code = "HOTELBEDS_MISSING_CREDENTIALS";

  constructor() {
    super("Hotelbeds credentials are not configured.");
    this.name = "HotelbedsCredentialsError";
  }
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getHotelbedsBaseUrls(): HotelbedsBaseUrls {
  return {
    baseUrl: withoutTrailingSlash(
      process.env.HOTELBEDS_BASE_URL || DEFAULT_BASE_URL,
    ),
    secureBaseUrl: withoutTrailingSlash(
      process.env.HOTELBEDS_SECURE_BASE_URL || "https://api-secure.test.hotelbeds.com",
    ),
    contentBaseUrl: withoutTrailingSlash(
      process.env.HOTELBEDS_CONTENT_BASE_URL || DEFAULT_CONTENT_BASE_URL,
    ),
    bookingBaseUrl: withoutTrailingSlash(
      process.env.HOTELBEDS_BOOKING_BASE_URL || DEFAULT_BOOKING_BASE_URL,
    ),
  };
}

export function hasHotelbedsCredentials() {
  return Boolean(
    process.env.HOTELBEDS_API_KEY &&
      (process.env.HOTELBEDS_API_SECRET || process.env.HOTELBEDS_SECRET),
  );
}

export function getHotelbedsCredentials(): HotelbedsCredentials {
  const apiKey = process.env.HOTELBEDS_API_KEY;
  const secret = process.env.HOTELBEDS_API_SECRET || process.env.HOTELBEDS_SECRET;

  if (!apiKey || !secret) {
    throw new HotelbedsCredentialsError();
  }

  return { apiKey, secret };
}

export function createHotelbedsSignature(
  credentials: HotelbedsCredentials,
  timestamp = Math.floor(Date.now() / 1000),
) {
  return createHash("sha256")
    .update(`${credentials.apiKey}${credentials.secret}${timestamp}`)
    .digest("hex");
}

export function createHotelbedsHeaders() {
  const credentials = getHotelbedsCredentials();

  return {
    "Api-Key": credentials.apiKey,
    "X-Signature": createHotelbedsSignature(credentials),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export function isHotelbedsHotelsSearchEnabled() {
  return process.env.HOTELBEDS_HOTELS_SEARCH_ENABLED === "true";
}

export function isHotelbedsHotelsBookingEnabled() {
  return process.env.HOTELBEDS_HOTELS_BOOKING_ENABLED === "true";
}

export function isHotelbedsHotelsCertificationAutoRunEnabled() {
  return process.env.HOTELBEDS_HOTELS_CERTIFICATION_AUTO_RUN === "true";
}
