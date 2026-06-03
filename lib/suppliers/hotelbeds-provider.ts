import {
  buildMockBookingDetailsResponse,
  buildMockCancelBookingResponse,
  buildMockPreBookResponse,
} from "./mock-utils";
import {
  createHotelbedsHeaders,
  getHotelbedsBaseUrls,
  hasHotelbedsCredentials,
} from "./hotelbeds-auth";
import type {
  SupplierBookRequest,
  SupplierBookResponse,
  SupplierBookingDetailsRequest,
  SupplierBookingDetailsResponse,
  SupplierCancelBookingRequest,
  SupplierCancelBookingResponse,
  SupplierCheckAvailabilityRequest,
  SupplierCheckAvailabilityResponse,
  SupplierPreBookRequest,
  SupplierPreBookResponse,
  SupplierProvider,
  SupplierSearchHotelsRequest,
  SupplierSearchHotelsResponse,
} from "./types";

type HotelbedsAvailabilityHotel = {
  code?: number;
  name?: string;
  categoryCode?: string;
  categoryName?: string;
  destinationCode?: string;
  destinationName?: string;
  zoneName?: string;
  latitude?: string | number;
  longitude?: string | number;
  currency?: string;
  rooms?: Array<{
    code?: string;
    name?: string;
    rates?: Array<{
      rateKey?: string;
      rateType?: string;
      net?: string | number;
      sellingRate?: string | number;
      currency?: string;
      boardCode?: string;
      boardName?: string;
      rateClass?: string;
      cancellationPolicies?: unknown[];
    }>;
  }>;
};

type HotelbedsAvailabilityResponse = {
  hotels?: {
    total?: number;
    hotels?: HotelbedsAvailabilityHotel[];
  };
};

type HotelbedsApiError = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

function getHotelbedsSearchHotelCodes(request: SupplierSearchHotelsRequest) {
  const metadataHotelIds = request.metadata?.hotelIds;
  const requestedHotelIds = Array.isArray(metadataHotelIds)
    ? metadataHotelIds.map(String)
    : [];
  const hotelCode =
    typeof request.metadata?.hotelCode === "string" ||
    typeof request.metadata?.hotelCode === "number"
      ? String(request.metadata.hotelCode)
      : "";

  return [hotelCode, ...requestedHotelIds].filter(Boolean);
}

function getChildrenAges(room: { childrenAges?: number[]; children?: number }) {
  const ages = room.childrenAges ?? [];
  const children = room.children ?? ages.length;

  if (ages.length >= children) return ages.slice(0, children);

  return [...ages, ...Array.from({ length: children - ages.length }, () => 8)];
}

function buildHotelbedsOccupancies(request: SupplierSearchHotelsRequest) {
  return request.rooms.map((room) => {
    const childrenAges = getChildrenAges(room);
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
  });
}

function buildHotelbedsAvailabilityRequest(request: SupplierSearchHotelsRequest) {
  const hotelCodes = getHotelbedsSearchHotelCodes(request);
  const body: Record<string, unknown> = {
    stay: {
      checkIn: request.checkIn,
      checkOut: request.checkOut,
    },
    occupancies: buildHotelbedsOccupancies(request),
  };

  if (request.destinationCode) {
    body.destination = {
      code: request.destinationCode,
    };
  } else {
    if (hotelCodes.length === 0) {
      throw new Error(
        "Hotelbeds search requires a selected hotel, destination, country, or zone from stored Content API data.",
      );
    }

    body.hotels = {
      hotel: hotelCodes.map((code) => Number(code)).filter(Number.isFinite),
    };
  }

  return body;
}

function parseStars(category?: string) {
  if (!category) return undefined;

  const match = category.match(/[1-5]/);
  return match ? Number(match[0]) : undefined;
}

function toNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function toHotelbedsPrice(rate: {
  net?: string | number;
  sellingRate?: string | number;
}) {
  return toNumber(rate.net) ?? toNumber(rate.sellingRate) ?? 0;
}

function mapHotelbedsAvailabilityResponse(
  data: HotelbedsAvailabilityResponse,
  request: SupplierSearchHotelsRequest,
): SupplierSearchHotelsResponse {
  const currency = request.currency || "USD";
  const hotels = data.hotels?.hotels ?? [];

  return {
    supplier: "hotelbeds",
    hotels: hotels
      .map((hotel) => {
        const rates = (hotel.rooms ?? []).flatMap((room) =>
          (room.rates ?? []).map((rate, index) => ({
            rateKey:
              rate.rateKey ||
              `hotelbeds-${hotel.code ?? "unknown"}-${room.code ?? "room"}-${index}`,
            roomName: room.name || room.code || "Hotelbeds room",
            boardName: rate.boardName || rate.boardCode || "Room Only",
            price: toHotelbedsPrice(rate),
            currency: rate.currency || hotel.currency || currency,
            refundable: rate.rateClass !== "NRF",
            cancellationPolicies: rate.cancellationPolicies,
            metadata: {
              rateType: rate.rateType,
              rateClass: rate.rateClass,
              boardCode: rate.boardCode,
              net: rate.net,
            },
          })),
        );

        return {
          supplier: "hotelbeds" as const,
          supplierHotelId: String(hotel.code ?? ""),
          hotelName: hotel.name || `Hotelbeds hotel ${hotel.code ?? ""}`.trim(),
          cityName: hotel.destinationName || hotel.zoneName,
          countryName: request.countryCode,
          stars: parseStars(hotel.categoryCode || hotel.categoryName),
          latitude: toNumber(hotel.latitude),
          longitude: toNumber(hotel.longitude),
          rates,
          metadata: {
            hotelbedsCode: hotel.code,
            hotelbedsDestinationCode: hotel.destinationCode,
            hotelbedsCategoryCode: hotel.categoryCode,
            source: "hotelbeds_booking_availability",
          },
        };
      })
      .filter((hotel) => hotel.supplierHotelId && hotel.rates.length > 0),
    rawSupplierRequest: {
      endpoint: "/hotel-api/1.0/hotels",
      searchMode: request.destinationCode ? "destination_or_hotel_codes" : "hotel_codes",
    },
    rawSupplierResponse: {
      total: data.hotels?.total ?? hotels.length,
      hotelCount: hotels.length,
    },
  };
}

function getHotelbedsErrorMessage(data: HotelbedsApiError) {
  return data.error?.message || data.message || "Hotelbeds availability failed";
}

export class HotelbedsSupplierProvider implements SupplierProvider {
  readonly name = "hotelbeds" as const;

  async searchHotels(
    request: SupplierSearchHotelsRequest,
  ): Promise<SupplierSearchHotelsResponse> {
    if (!hasHotelbedsCredentials()) {
      throw new Error("Hotelbeds credentials are not configured");
    }

    const { bookingBaseUrl } = getHotelbedsBaseUrls();
    const response = await fetch(`${bookingBaseUrl}/hotels`, {
      method: "POST",
      headers: {
        ...createHotelbedsHeaders(),
        "Accept-Encoding": "gzip",
      },
      body: JSON.stringify(buildHotelbedsAvailabilityRequest(request)),
    });

    const data = (await response.json().catch(() => ({}))) as
      | HotelbedsAvailabilityResponse
      | HotelbedsApiError;

    if (!response.ok) {
      throw new Error(getHotelbedsErrorMessage(data as HotelbedsApiError));
    }

    return mapHotelbedsAvailabilityResponse(
      data as HotelbedsAvailabilityResponse,
      request,
    );
  }

  async checkAvailability(
    request: SupplierCheckAvailabilityRequest,
  ): Promise<SupplierCheckAvailabilityResponse> {
    return this.preBook(request);
  }

  async checkRates(request: SupplierPreBookRequest): Promise<SupplierPreBookResponse> {
    return this.preBook(request);
  }

  async preBook(request: SupplierPreBookRequest): Promise<SupplierPreBookResponse> {
    return buildMockPreBookResponse(this.name, request);
  }

  async book(_request: SupplierBookRequest): Promise<SupplierBookResponse> {
    throw new Error(
      "Hotelbeds real booking is disabled. Use checkAvailability/checkRates only.",
    );
  }

  async getBookingDetails(
    request: SupplierBookingDetailsRequest,
  ): Promise<SupplierBookingDetailsResponse> {
    return buildMockBookingDetailsResponse(this.name, request);
  }

  async cancelBooking(
    request: SupplierCancelBookingRequest,
  ): Promise<SupplierCancelBookingResponse> {
    return buildMockCancelBookingResponse(this.name, request);
  }
}
