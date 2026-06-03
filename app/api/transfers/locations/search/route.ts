import { NextRequest, NextResponse } from "next/server";
import { getTransfersClient } from "@/lib/transfers/api";
import { isHotelbedsTransfersSearchEnabled } from "@/lib/suppliers/hotelbeds-transfers-auth";
import type {
  TransferLocation,
  TransferLocationCodeType,
  TransferLocationSearchResponse,
} from "@/types/transfers";

const CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_LIMIT = 20;

type SearchDebug = {
  endpoints: Array<{
    endpoint: string;
    status: "success" | "failed";
    itemCount: number;
    httpStatus?: number;
    errorCode?: string;
    message?: string;
  }>;
  reason?:
    | "query_too_short"
    | "transfers_search_disabled"
    | "memory_cache"
    | "matches_found"
    | "no_matches"
    | "partial_matches"
    | "partial_no_matches"
    | "all_sources_failed";
};

type Suggestion = {
  label: string;
  value: string;
  code: string;
  type: "terminal" | "hotel" | "destination";
  codeType?: TransferLocationCodeType;
  subType?: string;
  countryCode?: string;
  destinationCode?: string;
};

type LocationSourceName = "terminals" | "hotels" | "destinations";

type LocationSourceResult = {
  name: LocationSourceName;
  endpoint: string;
  result: PromiseSettledResult<TransferLocationSearchResponse>;
};

const cache = new Map<
  string,
  {
    expiresAt: number;
    suggestions: Suggestion[];
    debug: SearchDebug;
  }
>();

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function toSuggestion(location: TransferLocation): Suggestion | null {
  if (!location.code) return null;

  const isTerminal = location.codeType && location.codeType !== "ATLAS";
  const isHotel = location.type === "hotel" || location.subType === "hotel";

  return {
    label: location.name,
    value: location.code,
    code: location.code,
    type: isTerminal ? "terminal" : isHotel ? "hotel" : "destination",
    codeType: location.codeType,
    subType: location.subType || location.type,
    countryCode: location.countryCode,
    destinationCode: location.destinationCode,
  };
}

function createSuccessResponse(
  suggestions: Suggestion[],
  debug?: SearchDebug,
) {
  return NextResponse.json({
    success: true,
    suggestions,
    ...(isDev() && debug ? { debug } : {}),
  });
}

function looksLikeCode(query: string) {
  return /^[a-z0-9]{2,6}$/i.test(query.trim());
}

function rankSuggestions(query: string, suggestions: Suggestion[]) {
  const orderForCode: Record<Suggestion["type"], number> = {
    terminal: 0,
    hotel: 1,
    destination: 2,
  };

  const orderForName: Record<Suggestion["type"], number> = {
    hotel: 0,
    terminal: 1,
    destination: 2,
  };

  const order = looksLikeCode(query) ? orderForCode : orderForName;

  return suggestions.sort((a, b) => order[a.type] - order[b.type]);
}

function getFulfilledLocations(
  source: LocationSourceResult,
): TransferLocation[] {
  if (source.result.status !== "fulfilled") return [];

  return Array.isArray(source.result.value.locations)
    ? source.result.value.locations
    : [];
}

function getErrorStatus(reason: unknown) {
  if (reason && typeof reason === "object" && "status" in reason) {
    const status = (reason as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }

  return undefined;
}

function getErrorCode(reason: unknown) {
  if (reason && typeof reason === "object" && "code" in reason) {
    const code = (reason as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }

  return undefined;
}

function getErrorMessage(reason: unknown) {
  if (reason instanceof Error) {
    return reason.message.slice(0, 300);
  }

  if (typeof reason === "string") {
    return reason.slice(0, 300);
  }

  return undefined;
}

function createEndpointDebug(source: LocationSourceResult) {
  const locations = getFulfilledLocations(source);

  if (source.result.status === "fulfilled") {
    return {
      endpoint: source.endpoint,
      status: "success",
      itemCount: locations.length,
    } satisfies SearchDebug["endpoints"][number];
  }

  return {
    endpoint: source.endpoint,
    status: "failed",
    itemCount: 0,
    httpStatus: getErrorStatus(source.result.reason),
    errorCode: getErrorCode(source.result.reason),
    message: getErrorMessage(source.result.reason),
  } satisfies SearchDebug["endpoints"][number];
}

function getDebugReason(args: {
  suggestionsCount: number;
  failedCount: number;
  totalSources: number;
}): SearchDebug["reason"] {
  const { suggestionsCount, failedCount, totalSources } = args;

  if (failedCount === totalSources) return "all_sources_failed";

  if (failedCount > 0 && suggestionsCount > 0) return "partial_matches";

  if (failedCount > 0 && suggestionsCount === 0) return "partial_no_matches";

  return suggestionsCount > 0 ? "matches_found" : "no_matches";
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim() || "";
  const limit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    DEFAULT_LIMIT,
  );
  const cacheKey = `${query.toLowerCase()}:${limit}`;

  if (query.length < 2) {
    return createSuccessResponse([], {
      endpoints: [],
      reason: "query_too_short",
    });
  }

  if (!isHotelbedsTransfersSearchEnabled()) {
    return createSuccessResponse([], {
      endpoints: [],
      reason: "transfers_search_disabled",
    });
  }

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return createSuccessResponse(cached.suggestions, {
      ...cached.debug,
      reason: "memory_cache",
    });
  }

  const client = getTransfersClient();

  const [terminalsResult, hotelsResult, destinationsResult] =
    await Promise.allSettled([
      client.searchTransferTerminals({
        query,
        language: "ENG",
        limit,
      }),
      client.searchTransferHotels({
        query,
        language: "ENG",
        limit,
      }),
      client.searchTransferDestinations({
        query,
        language: "ENG",
        limit,
      }),
    ]);

  const sources: LocationSourceResult[] = [
    {
      name: "terminals",
      endpoint: "/locations/terminals",
      result: terminalsResult,
    },
    {
      name: "hotels",
      endpoint: "/hotels",
      result: hotelsResult,
    },
    {
      name: "destinations",
      endpoint: "/locations/destinations",
      result: destinationsResult,
    },
  ];

  const locations = sources.flatMap(getFulfilledLocations);

  const suggestions = rankSuggestions(
    query,
    locations
      .map(toSuggestion)
      .filter((item): item is Suggestion => Boolean(item)),
  ).slice(0, limit);

  const failedCount = sources.filter(
    (source) => source.result.status === "rejected",
  ).length;

  const debug: SearchDebug = {
    endpoints: sources.map(createEndpointDebug),
    reason: getDebugReason({
      suggestionsCount: suggestions.length,
      failedCount,
      totalSources: sources.length,
    }),
  };

  if (failedCount === sources.length) {
    return NextResponse.json(
      {
        success: false,
        error: "HOTELBEDS_TRANSFERS_LOCATION_SEARCH_FAILED",
        ...(isDev() ? { debug } : {}),
      },
      { status: 502 },
    );
  }

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    suggestions,
    debug,
  });

  return createSuccessResponse(suggestions, debug);
}