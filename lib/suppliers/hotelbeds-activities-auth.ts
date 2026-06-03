import {
  createHotelbedsSignature,
  type HotelbedsCredentials,
} from "./hotelbeds-auth";

const DEFAULT_ACTIVITIES_BASE_URL =
  "https://api.test.hotelbeds.com/activity-api/3.0";
const DEFAULT_ACTIVITIES_CONTENT_BASE_URL =
  "https://api.test.hotelbeds.com/activity-content-api/3.0";

export class HotelbedsActivitiesCredentialsError extends Error {
  readonly code = "HOTELBEDS_ACTIVITIES_MISSING_CREDENTIALS";

  constructor() {
    super("Hotelbeds Activities credentials are not configured.");
    this.name = "HotelbedsActivitiesCredentialsError";
  }
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getHotelbedsActivitiesBaseUrl() {
  return withoutTrailingSlash(
    process.env.HOTELBEDS_ACTIVITIES_BASE_URL || DEFAULT_ACTIVITIES_BASE_URL,
  );
}

export function getHotelbedsActivitiesContentBaseUrl() {
  return withoutTrailingSlash(
    process.env.HOTELBEDS_ACTIVITIES_CONTENT_BASE_URL ||
      DEFAULT_ACTIVITIES_CONTENT_BASE_URL,
  );
}

export function getHotelbedsActivitiesCredentials(): HotelbedsCredentials {
  const apiKey = process.env.HOTELBEDS_ACTIVITIES_API_KEY;
  const secret = process.env.HOTELBEDS_ACTIVITIES_SECRET;

  if (!apiKey || !secret) {
    throw new HotelbedsActivitiesCredentialsError();
  }

  return { apiKey, secret };
}

export function createHotelbedsActivitiesHeaders() {
  const credentials = getHotelbedsActivitiesCredentials();

  return {
    "Api-Key": credentials.apiKey,
    "X-Signature": createHotelbedsSignature(credentials),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export function isHotelbedsActivitiesSearchEnabled() {
  return process.env.HOTELBEDS_ACTIVITIES_SEARCH_ENABLED === "true";
}

export function isHotelbedsActivitiesBookingEnabled() {
  return process.env.HOTELBEDS_ACTIVITIES_BOOKING_ENABLED === "true";
}
