import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createSupplierProvider,
  getConfiguredSupplierProvider,
  type SupplierGuestOccupancy,
  type SupplierHotelResult,
  type SupplierProvider,
  type SupplierProviderName,
} from "@/lib/suppliers";
import type {
  HotelSearchResponse,
  HotelSearchResult,
  HotelOption,
} from "@/types/travellanda";

export const runtime = "nodejs";

const SUPPLIER_NAMES: SupplierProviderName[] = [
  "mock",
  "hotelbeds",
  "tbo",
  "travellanda",
];

function isSupplierProviderName(value: string): value is SupplierProviderName {
  return SUPPLIER_NAMES.includes(value as SupplierProviderName);
}

function getSearchProviders(): SupplierProvider[] {
  const configuredProviders = process.env.SUPPLIER_PROVIDERS;

  if (!configuredProviders) {
    if (!process.env.SUPPLIER_PROVIDER && process.env.NODE_ENV === "production") {
      throw new Error(
        "SUPPLIER_PROVIDER or SUPPLIER_PROVIDERS must be configured in production",
      );
    }

    return [getConfiguredSupplierProvider()];
  }

  const providerNames = configuredProviders
    .split(",")
    .map((provider) => provider.trim())
    .filter(Boolean);

  if (providerNames.length === 0) {
    if (!process.env.SUPPLIER_PROVIDER && process.env.NODE_ENV === "production") {
      throw new Error(
        "SUPPLIER_PROVIDER or SUPPLIER_PROVIDERS must be configured in production",
      );
    }

    return [getConfiguredSupplierProvider()];
  }

  return providerNames.map((providerName) => {
    if (!isSupplierProviderName(providerName)) {
      throw new Error(`Unsupported supplier provider: ${providerName}`);
    }

    if (providerName === "mock" && process.env.NODE_ENV === "production") {
      throw new Error("Mock supplier provider cannot be used in production");
    }

    return createSupplierProvider(providerName);
  });
}

function toSupplierRooms(rooms: unknown): SupplierGuestOccupancy[] {
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return [{ adults: 1, children: 0, childrenAges: [] }];
  }

  return rooms.map((room) => {
    const source = room as {
      NumAdults?: number;
      adults?: number;
      Children?: number[];
      childrenAges?: number[];
      children?: number;
    };
    const childrenAges = source.Children ?? source.childrenAges ?? [];

    return {
      adults: source.NumAdults ?? source.adults ?? 1,
      children: source.children ?? childrenAges.length,
      childrenAges,
    };
  });
}

function stableNumericId(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 900000;
  }

  return 100000 + hash;
}

function toLegacyHotelResult(hotel: SupplierHotelResult): HotelSearchResult {
  const hotelId =
    typeof hotel.metadata?.legacyHotelId === "number"
      ? hotel.metadata.legacyHotelId
      : stableNumericId(`${hotel.supplier}:${hotel.supplierHotelId}`);

  const options: HotelOption[] = hotel.rates.map((rate, index) => ({
    OptionId: stableNumericId(`${hotel.supplier}:${rate.rateKey}:${index}`),
    OnRequest: 0,
    BoardType: rate.boardName || "Room Only",
    BoardName: rate.boardName,
    RoomType: rate.roomName,
    RoomName: rate.roomName,
    Rooms: [
      {
        RoomId: index + 1,
        RoomName: rate.roomName,
        NumAdults: 2,
        NumChildren: 0,
        RoomPrice: rate.price,
      },
    ],
    Adults: 2,
    Children: 0,
    Price: rate.price,
    TotalPrice: rate.price,
    Taxes: 0,
    Currency: rate.currency,
    IsNonRefundable: !rate.refundable,
  }));

  return {
    HotelId: hotelId,
    HotelName: hotel.hotelName,
    StarRating: hotel.stars ?? 0,
    Address: hotel.address ?? "",
    CityName: hotel.cityName ?? "",
    CountryName: hotel.countryName ?? "",
    Images: [],
    Facilities: [],
    Options: options,
  };
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(req, {
      keyPrefix: "supplier:hotels-search",
      limit: 30,
      windowMs: 60_000,
    });

    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    const checkIn = body.checkInDate ?? body.CheckInDate ?? body.checkIn;
    const checkOut = body.checkOutDate ?? body.CheckOutDate ?? body.checkOut;
    const currency = body.currency ?? body.Currency ?? "USD";
    const rooms = toSupplierRooms(body.rooms ?? body.Rooms);
    const providers = getSearchProviders();

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: "checkInDate and checkOutDate are required" },
        { status: 400 },
      );
    }

    const supplierResponses = await Promise.all(
      providers.map((provider) =>
        provider.searchHotels({
          destinationCode:
            body.destinationCode ??
            body.cityId?.toString() ??
            body.CityIds?.[0]?.toString(),
          cityName: body.cityName,
          countryCode: body.countryCode,
          checkIn,
          checkOut,
          rooms,
          nationality: body.nationality ?? body.Nationality,
          currency,
          metadata: {
            cityId: body.cityId ?? body.CityIds?.[0],
            hotelIds: body.hotelIds ?? body.HotelIds,
          },
        }),
      ),
    );

    const hotels = supplierResponses.flatMap((response) =>
      response.hotels.map(toLegacyHotelResult),
    );

    const response: HotelSearchResponse = {
      ServerTime: new Date().toISOString(),
      ServerType: "hotleno-supplier-layer",
      ExecutionTime: "0",
      ResponseType: "HotelSearch",
      Currency: currency,
      CheckInDate: checkIn,
      CheckOutDate: checkOut,
      HotelsReturned: hotels.length,
      Hotels: hotels,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search hotels";

    console.error("Hotel supplier search error:", error);
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}
