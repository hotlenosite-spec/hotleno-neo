import {
  createHotelbedsSignature,
  type HotelbedsCredentials,
} from "./hotelbeds-auth";

const DEFAULT_TRANSFERS_BASE_URL =
  "https://api.test.hotelbeds.com/transfer-api/1.0";
const DEFAULT_TRANSFERS_CACHE_BASE_URL =
  "https://api.test.hotelbeds.com/transfer-cache-api/1.0";

export class HotelbedsTransfersCredentialsError extends Error {
  readonly code = "HOTELBEDS_TRANSFERS_MISSING_CREDENTIALS";

  constructor() {
    super("Hotelbeds Transfers credentials are not configured.");
    this.name = "HotelbedsTransfersCredentialsError";
  }
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getHotelbedsTransfersBaseUrl() {
  return withoutTrailingSlash(
    process.env.HOTELBEDS_TRANSFERS_BASE_URL || DEFAULT_TRANSFERS_BASE_URL,
  );
}

export function getHotelbedsTransfersCacheBaseUrl() {
  return withoutTrailingSlash(
    process.env.HOTELBEDS_TRANSFERS_CACHE_BASE_URL ||
      DEFAULT_TRANSFERS_CACHE_BASE_URL,
  );
}

export function hasHotelbedsTransfersCredentials() {
  return Boolean(
    process.env.HOTELBEDS_TRANSFERS_API_KEY &&
      process.env.HOTELBEDS_TRANSFERS_SECRET,
  );
}

export function getHotelbedsTransfersCredentials(): HotelbedsCredentials {
  const apiKey = process.env.HOTELBEDS_TRANSFERS_API_KEY;
  const secret = process.env.HOTELBEDS_TRANSFERS_SECRET;

  if (!apiKey || !secret) {
    throw new HotelbedsTransfersCredentialsError();
  }

  return { apiKey, secret };
}

export function createHotelbedsTransfersHeaders() {
  const credentials = getHotelbedsTransfersCredentials();

  return {
    "Api-Key": credentials.apiKey,
    "X-Signature": createHotelbedsSignature(credentials),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export function isHotelbedsTransfersSearchEnabled() {
  return process.env.HOTELBEDS_TRANSFERS_SEARCH_ENABLED === "true";
}

export function isHotelbedsTransfersBookingEnabled() {
  return process.env.HOTELBEDS_TRANSFERS_BOOKING_ENABLED === "true";
}
