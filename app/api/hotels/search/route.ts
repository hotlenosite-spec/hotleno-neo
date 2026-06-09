import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  normalizeSupplierHotels,
  toLegacyHotelResult,
} from "@/lib/hotels/normalize-hotels";
import {
  createSupplierProvider,
  type SupplierGuestOccupancy,
  type SupplierProvider,
  type SupplierProviderName,
  type SupplierSearchHotelsRequest,
  type SupplierSearchHotelsResponse,
} from "@/lib/suppliers";
import { getAuthUserFromRequest } from "@/lib/auth-user";
import { getEnabledSupplierNamesForSearch } from "@/lib/suppliers/supplier-settings";
import { enrichHotelbedsHotelsWithContent } from "@/lib/suppliers/hotelbeds-content-enrichment";
import {
  enrichTboHotelsWithCachedContent,
  getTboNormalSearchHotelCodes,
  isTboNormalSearchEnabled,
} from "@/lib/suppliers/tbo-content-store";
import {
  getStoredHotelCodesForCountry,
  getStoredHotelCodesForZone,
} from "@/lib/suppliers/hotelbeds-content-store";
import { createLog } from "@/lib/firebase-store";
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

async function getSearchProviders(params: {
  providerOverride?: string;
  role?: string;
  supplierScope?: string | null;
}): Promise<SupplierProvider[]> {
  const { providerOverride, role, supplierScope } = params;
  if (providerOverride) {
    if (role !== "admin" && role !== "supplier_tester") {
      throw new Error("Supplier provider override requires an authenticated tester or admin");
    }

    if (!isSupplierProviderName(providerOverride)) {
      throw new Error(`Unsupported supplier provider: ${providerOverride}`);
    }

    if (role === "supplier_tester" && supplierScope !== providerOverride) {
      throw new Error("Supplier tester is not allowed to use this provider");
    }

    if (providerOverride === "mock" && process.env.NODE_ENV === "production") {
      throw new Error("Mock supplier provider cannot be used in production");
    }

    return [createSupplierProvider(providerOverride)];
  }

  const providerNames = await getEnabledSupplierNamesForSearch({
    role,
    supplierScope,
  });

  return providerNames.map((providerName) => createSupplierProvider(providerName));
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

function isTboCertificationTester(user: {
  email?: string;
  role?: string;
  supplierScope?: string | null;
} | null) {
  return (
    user?.email?.toLowerCase() === "tbo.tester@hotleno.com" ||
    (user?.role === "supplier_tester" && user?.supplierScope === "tbo")
  );
}

function isTboCertificationSearch(user: {
  email?: string;
  role?: string;
  supplierScope?: string | null;
} | null) {
  return (
    process.env.TBO_CERTIFICATION_MODE === "true" ||
    process.env.NEXT_PUBLIC_TBO_CERTIFICATION_MODE === "true" ||
    isTboCertificationTester(user)
  );
}

function getTboCertificationTimeoutMs() {
  const responseTimeSeconds = Number(process.env.TBO_RESPONSE_TIME || 23);
  const safeResponseTime = Number.isFinite(responseTimeSeconds)
    ? Math.min(Math.max(responseTimeSeconds, 5), 23)
    : 23;
  return (safeResponseTime + 5) * 1000;
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
    await createLog({
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
    const authUser = getAuthUserFromRequest(req);
    const tboCertificationSearch = isTboCertificationSearch(authUser);
    const providers = await getSearchProviders({
      providerOverride: body.provider ?? body.supplierProvider,
      role: authUser?.role,
      supplierScope: authUser?.supplierScope,
    });
    const timeoutMs = tboCertificationSearch
      ? Math.max(getSupplierSearchTimeoutMs(), getTboCertificationTimeoutMs())
      : getSupplierSearchTimeoutMs();
    const explicitHotelIds = [
      ...(body.hotelCode ? [body.hotelCode] : []),
      ...(Array.isArray(body.hotelIds) ? body.hotelIds : []),
      ...(Array.isArray(body.HotelIds) ? body.HotelIds : []),
    ]
      .map(String)
      .filter(Boolean);
    const tboNormalHotelIds =
      explicitHotelIds.length > 0 || tboCertificationSearch
        ? []
        : await getTboNormalSearchHotelCodes({
            destination: body.destination,
            cityCode: body.cityCode,
            destinationCode: body.destinationCode,
            countryCode: body.countryCode,
          });
    const storedHotelIds =
      explicitHotelIds.length > 0 || tboNormalHotelIds.length > 0 || body.destinationCode
        ? []
        : body.zoneCode
          ? await getStoredHotelCodesForZone(String(body.zoneCode))
          : body.countryCode
            ? await getStoredHotelCodesForCountry(String(body.countryCode))
            : [];
    const hotelIds =
      explicitHotelIds.length > 0
        ? explicitHotelIds
        : tboNormalHotelIds.length > 0
          ? tboNormalHotelIds
          : storedHotelIds;

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

      return NextResponse.json(
        {
          error: "HOTEL_SEARCH_UNAVAILABLE",
          message: "البحث غير متاح مؤقتًا لأن جميع موردي الفنادق متوقفون.",
        },
        { status: 503 },
      );
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
        cityCode: body.cityCode,
        destinationCode: body.destinationCode,
        hotelIds,
        hotelCode: body.hotelCode,
        countryCode: body.countryCode,
        zoneCode: body.zoneCode,
        userEmail: authUser?.email,
        role: authUser?.role,
        supplierScope: authUser?.supplierScope,
        tboNormalSearch: tboNormalHotelIds.length > 0,
        disableEnvHotelCodes:
          tboNormalHotelIds.length > 0 ||
          (!tboCertificationSearch && isTboNormalSearchEnabled()),
      },
    };

    if (
      process.env.NODE_ENV !== "production" &&
      providers.some((provider) => provider.name === "tbo")
    ) {
      console.info("[TBO Certification Search Request]", {
        certificationMode: tboCertificationSearch,
        checkIn,
        checkOut,
        hotelCodeSource:
          hotelIds.length > 0
            ? "request"
            : tboCertificationSearch
              ? "TBO_SEARCH_HOTEL_CODES"
              : "none",
        explicitHotelCodeCount: hotelIds.length,
        guestNationality:
          supplierRequest.nationality ||
          process.env.TBO_GUEST_NATIONALITY ||
          "SA",
        rooms,
        currency,
        timeoutMs,
      });
    }

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

    const supplierResponses: SupplierSearchHotelsResponse[] = [];
    for (const provider of providers) {
      const response = await searchProviderSafely({
        provider,
        request: supplierRequest,
        timeoutMs,
      });
      if (response) supplierResponses.push(response);
    }

    const tboContentHotels = await enrichTboHotelsWithCachedContent(
      supplierResponses.flatMap((response) => response.hotels),
    );
    const enrichedSupplierHotels = await enrichHotelbedsHotelsWithContent(
      tboContentHotels,
    );
    const unifiedHotels = normalizeSupplierHotels(enrichedSupplierHotels, currency);
    const hotels = unifiedHotels.map(toLegacyHotelResult);

    if (
      process.env.NODE_ENV !== "production" &&
      providers.some((provider) => provider.name === "tbo")
    ) {
      console.info("[TBO Certification Search Result]", {
        certificationMode: tboCertificationSearch,
        supplierResponseCount: supplierResponses.length,
        returnedHotels: hotels.length,
        noAvailabilityReason:
          hotels.length > 0
            ? null
            : supplierResponses.length === 0
              ? "supplier_error_or_timeout"
              : "supplier_returned_zero_availability",
      });
    }

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
