import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  normalizeSupplierHotels,
  toLegacyHotelResult,
} from "@/lib/hotels/normalize-hotels";
import {
  createSupplierProvider,
  getConfiguredSupplierProvider,
  type SupplierGuestOccupancy,
  type SupplierProvider,
  type SupplierProviderName,
  type SupplierSearchHotelsRequest,
  type SupplierSearchHotelsResponse,
} from "@/lib/suppliers";
import { enrichHotelbedsHotelsWithContent } from "@/lib/suppliers/hotelbeds-content-enrichment";
import {
  getStoredHotelCodesForCountry,
  getStoredHotelCodesForZone,
} from "@/lib/suppliers/hotelbeds-content-store";
import SupplierLog from "@/models/SupplierLog";
import type { HotelSearchResponse } from "@/types/travellanda";

export const runtime = "nodejs";
const DEFAULT_SUPPLIER_SEARCH_TIMEOUT_MS = 8000;

const SUPPLIER_NAMES: SupplierProviderName[] = [
  "mock",
  "hotelbeds",
  "tbo",
  "travellanda",
];

function isSupplierProviderName(value: string): value is SupplierProviderName {
  return SUPPLIER_NAMES.includes(value as SupplierProviderName);
}

function getSearchProviders(providerOverride?: string): SupplierProvider[] {
  if (providerOverride) {
    if (!isSupplierProviderName(providerOverride)) {
      throw new Error(`Unsupported supplier provider: ${providerOverride}`);
    }

    if (providerOverride === "mock" && process.env.NODE_ENV === "production") {
      throw new Error("Mock supplier provider cannot be used in production");
    }

    return [createSupplierProvider(providerOverride)];
  }

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

function getSupplierSearchTimeoutMs() {
  const configuredTimeout = Number(process.env.SUPPLIER_SEARCH_TIMEOUT_MS);

  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_SUPPLIER_SEARCH_TIMEOUT_MS;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown supplier search error";
}

function createTimeoutError(providerName: string, timeoutMs: number) {
  return new Error(
    `Supplier ${providerName} search timed out after ${timeoutMs}ms`,
  );
}

async function logSupplierSearch(params: {
  supplier: string;
  status: "success" | "failed" | "timeout" | "skipped";
  message: string;
  request?: unknown;
  response?: unknown;
  error?: unknown;
}) {
  try {
    await dbConnect();
    await SupplierLog.create({
      supplier: params.supplier,
      type: "supplier_hotel_search",
      status: params.status,
      message: params.message,
      request: params.request ?? null,
      response: params.response ?? null,
      error: params.error ?? null,
    });
  } catch {
    // Search results must not depend on logging availability.
  }
}

async function searchProviderSafely({
  provider,
  request,
  timeoutMs,
}: {
  provider: SupplierProvider;
  request: SupplierSearchHotelsRequest;
  timeoutMs: number;
}): Promise<SupplierSearchHotelsResponse | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const response = await Promise.race([
      provider.searchHotels(request),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(createTimeoutError(provider.name, timeoutMs)),
          timeoutMs,
        );
      }),
    ]);

    await logSupplierSearch({
      supplier: provider.name,
      status: "success",
      message: `Supplier ${provider.name} search completed`,
      request,
      response: {
        hotelCount: response.hotels.length,
        supplier: response.supplier,
      },
    });

    return response;
  } catch (error) {
    const isTimeout = getErrorMessage(error).includes("timed out after");

    await logSupplierSearch({
      supplier: provider.name,
      status: isTimeout ? "timeout" : "failed",
      message: getErrorMessage(error),
      request,
      error: {
        message: getErrorMessage(error),
      },
    });

    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
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
    const providers = getSearchProviders(body.provider ?? body.supplierProvider);
    const timeoutMs = getSupplierSearchTimeoutMs();
    const explicitHotelIds = [
      ...(body.hotelCode ? [body.hotelCode] : []),
      ...(Array.isArray(body.hotelIds) ? body.hotelIds : []),
      ...(Array.isArray(body.HotelIds) ? body.HotelIds : []),
    ]
      .map(String)
      .filter(Boolean);
    const storedHotelIds =
      explicitHotelIds.length > 0 || body.destinationCode
        ? []
        : body.zoneCode
          ? await getStoredHotelCodesForZone(String(body.zoneCode))
          : body.countryCode
            ? await getStoredHotelCodesForCountry(String(body.countryCode))
            : [];
    const hotelIds = explicitHotelIds.length > 0 ? explicitHotelIds : storedHotelIds;

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: "checkInDate and checkOutDate are required" },
        { status: 400 },
      );
    }

    if (providers.length === 0) {
      await logSupplierSearch({
        supplier: "none",
        status: "skipped",
        message: "Hotel search skipped because no supplier providers are configured",
      });
    }

    const supplierRequest: SupplierSearchHotelsRequest = {
      destinationCode:
        body.destinationCode ??
        body.hotelbedsDestinationCode ??
        undefined,
      cityName: body.cityName ?? body.destination,
      countryCode: body.countryCode,
      checkIn,
      checkOut,
      rooms,
      nationality: body.nationality ?? body.Nationality,
      currency,
      metadata: {
        cityId: body.cityId ?? body.CityIds?.[0],
        hotelIds,
        hotelCode: body.hotelCode,
        countryCode: body.countryCode,
        zoneCode: body.zoneCode,
      },
    };

    if (
      providers.some((provider) => provider.name === "hotelbeds") &&
      !supplierRequest.destinationCode &&
      hotelIds.length === 0
    ) {
      return NextResponse.json({
        ServerTime: new Date().toISOString(),
        ServerType: "hotleno-supplier-layer",
        ExecutionTime: "0",
        ResponseType: "HotelSearch",
        Currency: currency,
        CheckInDate: checkIn,
        CheckOutDate: checkOut,
        HotelsReturned: 0,
        Hotels: [],
      } satisfies HotelSearchResponse);
    }

    const supplierResponses = (
      await Promise.all(
        providers.map((provider) =>
          searchProviderSafely({
            provider,
            request: supplierRequest,
            timeoutMs,
          }),
        ),
      )
    ).filter(
      (response): response is SupplierSearchHotelsResponse => Boolean(response),
    );

    const enrichedSupplierHotels = await enrichHotelbedsHotelsWithContent(
      supplierResponses.flatMap((response) => response.hotels),
    );
    const unifiedHotels = normalizeSupplierHotels(enrichedSupplierHotels, currency);
    const hotels = unifiedHotels.map(toLegacyHotelResult);

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
