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
  SupplierHotelRate,
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

function getRateOccupancy(rateKey?: string) {
  const match = String(rateKey || "").match(/\|\|(\d+)~(\d+)~(\d+)/);
  if (!match) return null;

  return {
    rooms: Number(match[1]),
    adults: Number(match[2]),
    children: Number(match[3]),
  };
}

function getRequestedRoom(request: SupplierSearchHotelsRequest, roomIndex: number) {
  const room = request.rooms[roomIndex] || { adults: 1, children: 0, childrenAges: [] };
  const childAges = getChildrenAges(room);

  return {
    adults: room.adults || 1,
    children: childAges.length,
    childAges,
  };
}

function buildHotelbedsSelectedRoom(params: {
  roomIndex: number;
  request: SupplierSearchHotelsRequest;
  room: NonNullable<HotelbedsAvailabilityHotel["rooms"]>[number];
  rate: NonNullable<NonNullable<HotelbedsAvailabilityHotel["rooms"]>[number]["rates"]>[number];
  currency: string;
}) {
  const requestedRoom = getRequestedRoom(params.request, params.roomIndex);

  return {
    roomIndex: params.roomIndex,
    adults: requestedRoom.adults,
    children: requestedRoom.children,
    childAges: requestedRoom.childAges,
    roomCode: params.room.code,
    roomName: params.room.name || params.room.code || "Hotelbeds room",
    boardCode: params.rate.boardCode,
    boardName: params.rate.boardName || params.rate.boardCode || "Room Only",
    rateKey: String(params.rate.rateKey || ""),
    price: toHotelbedsPrice(params.rate),
    currency: params.rate.currency || params.currency,
  };
}

function getRateBoardKey(rate: {
  boardCode?: string;
  boardName?: string;
  rateClass?: string;
  rateType?: string;
}) {
  return [
    rate.boardCode || rate.boardName || "RO",
    rate.rateClass || "",
    rate.rateType || "",
  ].join("|");
}

function mapHotelbedsRatesForRequest(
  hotel: HotelbedsAvailabilityHotel,
  request: SupplierSearchHotelsRequest,
  currency: string,
): SupplierHotelRate[] {
  const roomCount = Math.max(request.rooms.length, 1);
  const rawRates = (hotel.rooms ?? []).flatMap((room) =>
    (room.rates ?? [])
      .filter((rate) => rate.rateKey)
      .map((rate, index) => ({
        room,
        rate,
        index,
        occupancy: getRateOccupancy(rate.rateKey),
      })),
  );

  if (roomCount <= 1) {
    return rawRates.map(({ room, rate, index }) => {
      const selectedRoom = buildHotelbedsSelectedRoom({
        roomIndex: 0,
        request,
        room,
        rate,
        currency,
      });

      return {
        rateKey:
          rate.rateKey ||
          `hotelbeds-${hotel.code ?? "unknown"}-${room.code ?? "room"}-${index}`,
        roomName: room.name || room.code || "Hotelbeds room",
        boardName: rate.boardName || rate.boardCode || "Room Only",
        price: toHotelbedsPrice(rate),
        currency: rate.currency || hotel.currency || currency,
        refundable: rate.rateClass !== "NRF",
        hotelbedsSelectedRooms: [selectedRoom],
        cancellationPolicies: rate.cancellationPolicies,
        metadata: {
          rateType: rate.rateType,
          rateClass: rate.rateClass,
          boardCode: rate.boardCode,
          net: rate.net,
        },
      };
    });
  }

  const groups = new Map<string, typeof rawRates>();
  rawRates.forEach((item) => {
    const key = getRateBoardKey(item.rate);
    groups.set(key, [...(groups.get(key) || []), item]);
  });

  return Array.from(groups.values())
    .map((items, groupIndex): SupplierHotelRate | null => {
      const selectedItems: typeof rawRates = [];
      const usedRateKeys = new Set<string>();

      for (let roomIndex = 0; roomIndex < roomCount; roomIndex += 1) {
        const requestedRoom = getRequestedRoom(request, roomIndex);
        const match = items.find((item) => {
          const rateKey = String(item.rate.rateKey || "");
          if (!rateKey || usedRateKeys.has(rateKey)) return false;
          if (!item.occupancy) return false;
          return (
            item.occupancy.rooms === 1 &&
            item.occupancy.adults === requestedRoom.adults &&
            item.occupancy.children === requestedRoom.children
          );
        });

        if (!match) return null;
        usedRateKeys.add(String(match.rate.rateKey || ""));
        selectedItems.push(match);
      }

      const selectedRooms = selectedItems.map((item, roomIndex) =>
        buildHotelbedsSelectedRoom({
          roomIndex,
          request,
          room: item.room,
          rate: item.rate,
          currency,
        }),
      );
      const totalPrice = selectedRooms.reduce((sum, room) => sum + (room.price || 0), 0);
      const firstRate = selectedItems[0]?.rate;
      const firstRoom = selectedItems[0]?.room;

      return {
        rateKey: selectedRooms[0]?.rateKey || `hotelbeds-${hotel.code}-${groupIndex}`,
        roomName: selectedRooms.map((room) => room.roomName).filter(Boolean).join(" + "),
        boardName: firstRate?.boardName || firstRate?.boardCode || "Room Only",
        price: totalPrice,
        currency: firstRate?.currency || hotel.currency || currency,
        refundable: selectedItems.every((item) => item.rate.rateClass !== "NRF"),
        hotelbedsSelectedRooms: selectedRooms,
        cancellationPolicies: firstRate?.cancellationPolicies,
        metadata: {
          rateType: firstRate?.rateType,
          rateClass: firstRate?.rateClass,
          boardCode: firstRate?.boardCode,
          net: totalPrice,
          hotelbedsSelectedRoomsCount: selectedRooms.length,
          hotelbedsMultiRoomComposite: true,
          firstRoomCode: firstRoom?.code,
        },
      };
    })
    .filter((rate): rate is SupplierHotelRate => Boolean(rate));
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
        const rates = mapHotelbedsRatesForRequest(hotel, request, currency);

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
