import {
  createHotelbedsHeaders,
  getHotelbedsBaseUrls,
  hasHotelbedsCredentials,
  isHotelbedsHotelsBookingEnabled,
  isHotelbedsHotelsSearchEnabled,
} from "./hotelbeds-auth";
import type {
  HotelbedsHotelAvailabilityRequest,
  HotelbedsHotelBookingDetailsRequest,
  HotelbedsHotelBookingRequest,
  HotelbedsHotelCancelRequest,
  HotelbedsHotelCheckRateRequest,
  HotelbedsHotelVoucher,
} from "@/types/hotelbeds-hotels-certification";

const DEFAULT_TIMEOUT_MS = 18_000;
const REQUEST_DELAY_MS = 1_100;
const MAX_REQUESTS_PER_RUN = 40;

export class HotelbedsHotelsClientError extends Error {
  readonly status?: number;
  readonly code: string;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = "HotelbedsHotelsClientError";
    this.code = code;
    this.status = status;
  }
}

type RequestCounter = {
  count: number;
  max: number;
};

const requestCounter: RequestCounter = {
  count: 0,
  max: MAX_REQUESTS_PER_RUN,
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  return typeof value === "string" ? value : undefined;
}

function toHotelbedsClientReference(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 20);
  return cleaned || `HOTLENO-${Date.now()}`.slice(0, 20);
}

function safeLog(args: {
  operation: string;
  endpoint: string;
  status?: number;
  reason?: string;
}) {
  if (process.env.NODE_ENV === "production") return;

  console.info("[Hotelbeds Accommodation]", {
    operation: args.operation,
    endpoint: args.endpoint,
    status: args.status,
    reason: args.reason,
    requestCount: requestCounter.count,
    estimatedRemainingBeforeDailyCap: Math.max(0, 50 - requestCounter.count),
  });
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HotelbedsHotelsClientError(
      "Hotelbeds Accommodation returned a non-JSON response.",
      "HOTELBEDS_HOTELS_INVALID_RESPONSE",
      response.status,
    );
  }
}

function getSafeErrorText(payload: unknown) {
  const record = asRecord(payload);
  const error = asRecord(record.error);

  return (
    asString(error.message) ||
    asString(record.message) ||
    asString(record.error) ||
    "Hotelbeds Accommodation request failed."
  );
}

export function buildHotelbedsAvailabilityBody(request: HotelbedsHotelAvailabilityRequest) {
  const body: Record<string, unknown> = {
    stay: {
      checkIn: request.checkIn,
      checkOut: request.checkOut,
    },
    occupancies: request.rooms.map((room) => {
      const childrenAges = room.childrenAges || [];
      const adults = room.adults || 1;

      return {
        rooms: 1,
        adults,
        children: childrenAges.length,
        paxes: [
          ...Array.from({ length: adults }, () => ({ type: "AD", age: 30 })),
          ...childrenAges.map((age) => ({ type: "CH", age })),
        ],
      };
    }),
  };

  if (request.destinationCode) {
    body.destination = { code: request.destinationCode };
  }

  if (request.hotelCodes?.length) {
    body.hotels = {
      hotel: request.hotelCodes.map(Number).filter(Number.isFinite),
    };
  }

  return body;
}

export function buildHotelbedsBookingBody(request: HotelbedsHotelBookingRequest) {
  const rateKey = request.finalRateKey || request.rateKey;
  const roomIds = [...new Set(request.guests.map((guest) => guest.roomId || 1))];

  return {
    clientReference: toHotelbedsClientReference(request.clientReference),
    holder: request.holder,
    rooms: request.rooms?.length
      ? request.rooms.map((room, roomIndex) => ({
          rateKey: room.rateKey,
          paxes: room.guests.map((guest, guestIndex) => ({
            roomId: roomIndex + 1,
            type: guest.type || "AD",
            name: guest.name,
            surname: guest.surname,
            ...(guest.type === "CH" && guest.age !== undefined ? { age: guest.age } : {}),
            id: guestIndex + 1,
          })),
        }))
      : roomIds.map((roomId) => ({
          rateKey,
          paxes: request.guests
            .filter((guest) => (guest.roomId || 1) === roomId)
            .map((guest, index) => ({
          roomId,
          type: guest.type || "AD",
          name: guest.name,
          surname: guest.surname,
          ...(guest.type === "CH" && guest.age !== undefined ? { age: guest.age } : {}),
          id: index + 1,
        })),
      })),
    ...(request.remark ? { remark: request.remark } : {}),
  };
}

export function buildHotelbedsCheckRateBody(request: HotelbedsHotelCheckRateRequest) {
  const rateKeys = request.rateKeys?.length ? request.rateKeys : [request.rateKey];

  return {
    rooms: rateKeys.map((rateKey) => ({ rateKey })),
    ...(request.language ? { language: request.language } : {}),
  };
}

function mapVoucher(payload: unknown): HotelbedsHotelVoucher {
  const booking = asRecord(asRecord(payload).booking || payload);
  const hotel = asRecord(booking.hotel);
  const roomItems = asArray(hotel.rooms);
  const room = asRecord(roomItems[0]);
  const rate = asRecord(asArray(room.rates)[0]);
  const holder = asRecord(booking.holder);
  const totalNet = asArray(room.rates).reduce<number>((sum, item) => {
    const itemRate = asRecord(item);
    const net = Number(itemRate.net || itemRate.sellingRate || itemRate.amount || 0);
    return Number.isFinite(net) ? sum + net : sum;
  }, 0);

  return {
    supplier: "hotelbeds-accommodation",
    hotlenoReference: asString(booking.clientReference),
    bookingReference:
      asString(booking.reference) || asString(booking.bookingReference),
    hotelName: asString(hotel.name),
    hotelAddress:
      asString(hotel.address) ||
      asString(asRecord(hotel.address).content) ||
      asString(asRecord(hotel.destination).name),
    checkIn: asString(hotel.checkIn),
    checkOut: asString(hotel.checkOut),
    roomName: asString(room.name) || asString(room.code),
    boardName: asString(rate.boardName) || asString(rate.boardCode),
    holderName: [holder.name, holder.surname].filter(Boolean).join(" "),
    rooms: roomItems.map((item) => {
      const roomRecord = asRecord(item);
      const roomRate = asRecord(asArray(roomRecord.rates)[0]);
      const paxes = asArray(roomRecord.paxes);
      return {
        name: asString(roomRecord.name) || asString(roomRecord.code),
        board: asString(roomRate.boardName) || asString(roomRate.boardCode),
        adults: paxes.filter((pax) => asRecord(pax).type !== "CH").length,
        children: paxes.filter((pax) => asRecord(pax).type === "CH").length,
        childAges: paxes
          .map((pax) => Number(asRecord(pax).age))
          .filter((age): age is number => Number.isFinite(age) && age < 18),
        guestNames: paxes
          .map((pax) => {
            const record = asRecord(pax);
            return [record.name, record.surname].filter(Boolean).join(" ");
          })
          .filter(Boolean),
      };
    }),
    guestNames: asArray(room.paxes).map((pax) => {
      const record = asRecord(pax);
      return [record.name, record.surname].filter(Boolean).join(" ");
    }),
    supplierReference: asString(booking.reference),
    cancellationPolicies:
      asArray(rate.cancellationPolicies).length > 0
        ? asArray(rate.cancellationPolicies)
        : undefined,
    remarks: asArray(booking.remark || booking.remarks)
      .map((item) => asString(item) || asString(asRecord(item).text))
      .filter((item): item is string => Boolean(item)),
    amount: totalNet || undefined,
    currency: asString(rate.currency) || asString(rate.currencyCode) || asString(booking.currency),
    status: asString(booking.status),
  };
}

export class HotelbedsHotelsClient {
  private readonly bookingBaseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: { timeoutMs?: number } = {}) {
    this.bookingBaseUrl = getHotelbedsBaseUrls().bookingBaseUrl;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  static getRequestUsage() {
    return {
      used: requestCounter.count,
      maxPerRun: requestCounter.max,
      estimatedDailyRemaining: Math.max(0, 50 - requestCounter.count),
    };
  }

  private async request(
    endpoint: string,
    options: { method: "GET" | "POST" | "DELETE"; body?: unknown },
  ) {
    if (!hasHotelbedsCredentials()) {
      throw new HotelbedsHotelsClientError(
        "Hotelbeds Accommodation credentials are not configured.",
        "HOTELBEDS_HOTELS_MISSING_CREDENTIALS",
      );
    }

    if (requestCounter.count >= requestCounter.max) {
      throw new HotelbedsHotelsClientError(
        "Hotelbeds Accommodation request counter reached the safe per-run limit.",
        "HOTELBEDS_HOTELS_REQUEST_LIMIT_REACHED",
      );
    }

    await sleep(REQUEST_DELAY_MS);
    requestCounter.count += 1;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.bookingBaseUrl}${endpoint}`, {
        method: options.method,
        headers: {
          ...createHotelbedsHeaders(),
          "Accept-Encoding": "gzip",
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const payload = await parseJson(response);

      safeLog({
        operation: options.method,
        endpoint,
        status: response.status,
      });

      if (!response.ok) {
        throw new HotelbedsHotelsClientError(
          getSafeErrorText(payload),
          "HOTELBEDS_HOTELS_REQUEST_FAILED",
          response.status,
        );
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  async availability(request: HotelbedsHotelAvailabilityRequest) {
    if (!isHotelbedsHotelsSearchEnabled()) {
      throw new HotelbedsHotelsClientError(
        "Hotelbeds Accommodation search is disabled in this environment.",
        "HOTELBEDS_HOTELS_SEARCH_DISABLED",
        403,
      );
    }

    return this.request("/hotels", {
      method: "POST",
      body: buildHotelbedsAvailabilityBody(request),
    });
  }

  async checkRate(request: HotelbedsHotelCheckRateRequest) {
    if (!isHotelbedsHotelsSearchEnabled()) {
      throw new HotelbedsHotelsClientError(
        "Hotelbeds Accommodation check-rate is disabled in this environment.",
        "HOTELBEDS_HOTELS_SEARCH_DISABLED",
        403,
      );
    }

    return this.request("/checkrates", {
      method: "POST",
      body: buildHotelbedsCheckRateBody(request),
    });
  }

  async book(request: HotelbedsHotelBookingRequest) {
    if (!isHotelbedsHotelsBookingEnabled()) {
      throw new HotelbedsHotelsClientError(
        "Hotelbeds Accommodation booking is disabled in this environment.",
        "HOTELBEDS_HOTELS_BOOKING_DISABLED",
        403,
      );
    }

    return this.request("/bookings", {
      method: "POST",
      body: buildHotelbedsBookingBody(request),
    });
  }

  async bookingDetails(request: HotelbedsHotelBookingDetailsRequest) {
    if (!isHotelbedsHotelsBookingEnabled()) {
      throw new HotelbedsHotelsClientError(
        "Hotelbeds Accommodation booking details are disabled in this environment.",
        "HOTELBEDS_HOTELS_BOOKING_DISABLED",
        403,
      );
    }

    return this.request(`/bookings/${encodeURIComponent(request.bookingReference)}`, {
      method: "GET",
    });
  }

  async cancel(request: HotelbedsHotelCancelRequest) {
    if (!isHotelbedsHotelsBookingEnabled()) {
      throw new HotelbedsHotelsClientError(
        "Hotelbeds Accommodation cancellation is disabled in this environment.",
        "HOTELBEDS_HOTELS_BOOKING_DISABLED",
        403,
      );
    }

    return this.request(
      `/bookings/${encodeURIComponent(
        request.bookingReference,
      )}?cancellationFlag=${encodeURIComponent(
        request.cancellationFlag || "CANCELLATION",
      )}`,
      {
        method: "DELETE",
      },
    );
  }

  mapVoucher(payload: unknown) {
    return mapVoucher(payload);
  }
}

export function createHotelbedsHotelsClient() {
  return new HotelbedsHotelsClient();
}
