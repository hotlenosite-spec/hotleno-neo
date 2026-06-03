import crypto from "crypto";

import {
  getHotelbedsTransfersBaseUrl,
  getHotelbedsTransfersCredentials,
} from "@/lib/suppliers/hotelbeds-transfers-auth";

export type HotelbedsTransfersCertificationLocation = {
  type: "IATA" | "ATLAS" | "PORT" | "STATION";
  code: string;
  label: string;
};

export type HotelbedsTransfersCertificationPassenger = {
  title: "Mr" | "Ms" | "Mrs";
  name: string;
  surname: string;
  age: number;
  type: "AD" | "CH" | "IN";
};

export type HotelbedsTransfersCertificationAvailabilityRequest = {
  language: string;
  from: HotelbedsTransfersCertificationLocation;
  to: HotelbedsTransfersCertificationLocation;
  outbound: string;
  adults: number;
  children: number;
  infants: number;
};

export type HotelbedsTransfersCertificationBookRequest = {
  language: string;
  clientReference: string;
  holder: {
    name: string;
    surname: string;
    email: string;
    phone: string;
  };
  transfers: Array<{
    rateKey: string;
    transferDetails?: unknown[];
    extras?: unknown[];
  }>;
  passengers: HotelbedsTransfersCertificationPassenger[];
  remark?: string;
};

export type HotelbedsTransfersCertificationClientOptions = {
  baseUrl?: string;
  timeoutMs?: number;
};

export class HotelbedsTransfersCertificationClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "HotelbedsTransfersCertificationClientError";
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 45_000;

function cleanBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function encodePath(value: string | number) {
  return encodeURIComponent(String(value));
}

function formatTransferDateTime(value: string) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}

function createSignature(apiKey: string, secret: string) {
  const timestampSeconds = Math.floor(Date.now() / 1000);
  return crypto
    .createHash("sha256")
    .update(`${apiKey}${secret}${timestampSeconds}`)
    .digest("hex");
}

function createHeaders() {
  const credentials = getHotelbedsTransfersCredentials();

  return {
    "Api-Key": credentials.apiKey,
    "X-Signature": createSignature(credentials.apiKey, credentials.secret),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HotelbedsTransfersCertificationClientError(
      "Hotelbeds Transfers returned a non-JSON response.",
      response.status,
    );
  }
}

export class HotelbedsTransfersCertificationClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: HotelbedsTransfersCertificationClientOptions = {}) {
    this.baseUrl = cleanBaseUrl(options.baseUrl || getHotelbedsTransfersBaseUrl());
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  private async request(method: string, path: string, body?: unknown) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/${path.replace(/^\/+/, "")}`, {
        method,
        headers: createHeaders(),
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new HotelbedsTransfersCertificationClientError(
          `Hotelbeds Transfers request failed with status ${response.status}.`,
          response.status,
        );
      }

      return {
        status: response.status,
        payload,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  availabilitySimple(request: HotelbedsTransfersCertificationAvailabilityRequest) {
    const path = [
      "availability",
      request.language,
      "from",
      request.from.type,
      request.from.code,
      "to",
      request.to.type,
      request.to.code,
      formatTransferDateTime(request.outbound),
      request.adults,
      request.children,
      request.infants,
    ]
      .map(encodePath)
      .join("/");

    return this.request("GET", path);
  }

  book(request: HotelbedsTransfersCertificationBookRequest) {
    return this.request("POST", "bookings", request);
  }

  bookingDetail(language: string, reference: string) {
    return this.request(
      "GET",
      ["bookings", language, "reference", reference].map(encodePath).join("/"),
    );
  }

  cancel(language: string, reference: string) {
    return this.request(
      "DELETE",
      ["bookings", language, "reference", reference].map(encodePath).join("/"),
    );
  }
}
