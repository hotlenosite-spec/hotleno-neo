import {
  createHotelbedsContentClient,
  HotelbedsContentClientError,
  type HotelbedsContentQuery,
} from "./hotelbeds-content-client";
import { searchStoredHotelbedsContent } from "./hotelbeds-content-store";
import type { HotelbedsSearchSuggestion } from "@/types/hotelbeds-content";

const AUTOCOMPLETE_CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_LIMIT = 12;

// مهم: لا تجعلها كبيرة حتى لا تستهلك كوتا Hotelbeds بسرعة.
const PAGE_SIZE = 10;
const MAX_DESTINATION_PAGES = 1;
const MAX_HOTEL_PAGES = 0;

type SearchSource = "api" | "database" | "auto";

export type HotelbedsContentSearchDebug = {
  source: "database" | "hotelbeds-content-api";
  reason?:
    | "matches_found"
    | "no_matches"
    | "api_failed"
    | "database_failed"
    | "quota_exceeded";
  endpoints?: Array<{
    endpoint: string;
    itemCount: number;
    status?: "success" | "failed" | "skipped";
    errorCode?: string;
  }>;
};

export type HotelbedsContentSearchResult = {
  suggestions: HotelbedsSearchSuggestion[];
  debug?: HotelbedsContentSearchDebug;
};

type CacheEntry = {
  expiresAt: number;
  result: HotelbedsContentSearchResult;
};

const autocompleteCache = new Map<string, CacheEntry>();

function getSearchSource(): SearchSource {
  const source = process.env.HOTELBEDS_CONTENT_SEARCH_SOURCE;
  if (source === "api" || source === "database" || source === "auto") return source;
  return "api";
}

function readCache(key: string) {
  const entry = autocompleteCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    autocompleteCache.delete(key);
    return undefined;
  }

  return entry.result;
}

function writeCache(key: string, result: HotelbedsContentSearchResult) {
  autocompleteCache.set(key, {
    result,
    expiresAt: Date.now() + AUTOCOMPLETE_CACHE_TTL_MS,
  });
}

function getText(value: unknown) {
  if (typeof value === "string") return value.trim();

  if (
    value &&
    typeof value === "object" &&
    "content" in value &&
    typeof value.content === "string"
  ) {
    return value.content.trim();
  }

  return "";
}

function asString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function extractArray(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object") return [];

  const data = payload as Record<string, unknown>;
  return Array.isArray(data[key]) ? (data[key] as Record<string, unknown>[]) : [];
}

function matchesQuery(label: string, query: string) {
  return label.toLowerCase().includes(query.toLowerCase());
}

function dedupeSuggestions(suggestions: HotelbedsSearchSuggestion[]) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const key = [
      suggestion.type,
      suggestion.hotelCode,
      suggestion.destinationCode,
      suggestion.countryCode,
      suggestion.zoneCode,
      suggestion.label,
    ]
      .filter(Boolean)
      .join(":");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isSuggestion(
  suggestion: HotelbedsSearchSuggestion | null,
): suggestion is HotelbedsSearchSuggestion {
  return Boolean(suggestion);
}

function pageQuery(from: number, to: number): HotelbedsContentQuery {
  return {
    fields: "all",
    language: "ENG",
    useSecondaryLanguage: "false",
    from,
    to,
  };
}

function hotelToSuggestion(hotel: Record<string, unknown>, query: string) {
  const label = getText(hotel.name) || asString(hotel.hotelName);
  const hotelCode = asString(hotel.code ?? hotel.hotelCode);

  if (!label || !hotelCode || !matchesQuery(label, query)) return null;

  return {
    label,
    value: hotelCode,
    type: "hotel",
    hotelCode,
    destinationCode: asString(hotel.destinationCode) || undefined,
    countryCode: asString(hotel.countryCode) || undefined,
    zoneCode: asString(hotel.zoneCode) || undefined,
  } satisfies HotelbedsSearchSuggestion;
}

function destinationToSuggestion(
  destination: Record<string, unknown>,
  query: string,
) {
  const label = getText(destination.name) || asString(destination.destinationName);
  const destinationCode = asString(destination.code ?? destination.destinationCode);

  if (!label || !destinationCode || !matchesQuery(label, query)) return null;

  return {
    label,
    value: destinationCode,
    type: "destination",
    destinationCode,
    countryCode: asString(destination.countryCode) || undefined,
  } satisfies HotelbedsSearchSuggestion;
}

function countryToSuggestion(country: Record<string, unknown>, query: string) {
  const label = getText(country.name) || asString(country.countryName);
  const countryCode = asString(country.code ?? country.countryCode ?? country.isoCode);

  if (!label || !countryCode || !matchesQuery(label, query)) return null;

  return {
    label,
    value: countryCode,
    type: "country",
    countryCode,
  } satisfies HotelbedsSearchSuggestion;
}

function zoneToSuggestion(
  zone: Record<string, unknown>,
  query: string,
  parentDestination: Record<string, unknown>,
) {
  const label = getText(zone.name) || asString(zone.zoneName);
  const zoneCode = asString(zone.code ?? zone.zoneCode);

  if (!label || !zoneCode || !matchesQuery(label, query)) return null;

  return {
    label,
    value: zoneCode,
    type: "zone",
    zoneCode,
    destinationCode:
      asString(parentDestination.code ?? parentDestination.destinationCode) ||
      undefined,
    countryCode: asString(parentDestination.countryCode) || undefined,
  } satisfies HotelbedsSearchSuggestion;
}

function trackEndpoint(
  endpoints: NonNullable<HotelbedsContentSearchDebug["endpoints"]>,
  endpoint: string,
  itemCount: number,
  status: "success" | "failed" | "skipped" = "success",
  errorCode?: string,
) {
  endpoints.push({ endpoint, itemCount, status, errorCode });
}

function isQuotaError(error: unknown) {
  return (
    error instanceof HotelbedsContentClientError &&
    error.code === "HOTELBEDS_QUOTA_EXCEEDED"
  );
}

function getErrorCode(error: unknown) {
  if (error instanceof HotelbedsContentClientError) return error.code;
  if (error instanceof Error) return error.name;
  return "UNKNOWN_ERROR";
}

async function scanDestinations(
  query: string,
  limit: number,
  endpoints: NonNullable<HotelbedsContentSearchDebug["endpoints"]>,
): Promise<HotelbedsSearchSuggestion[]> {
  const client = createHotelbedsContentClient();
  const matches: HotelbedsSearchSuggestion[] = [];

  for (let page = 0; page < MAX_DESTINATION_PAGES && matches.length < limit; page += 1) {
    const from = page * PAGE_SIZE + 1;
    const to = from + PAGE_SIZE - 1;
    const endpoint = `/locations/destinations?from=${from}&to=${to}`;

    try {
      const payload = await client.getDestinations(pageQuery(from, to));
      const destinations = extractArray(payload, "destinations");

      trackEndpoint(endpoints, endpoint, destinations.length);

      for (const destination of destinations) {
        const destinationMatch = destinationToSuggestion(destination, query);
        if (destinationMatch) matches.push(destinationMatch);

        const zones = Array.isArray(destination.zones)
          ? (destination.zones as Record<string, unknown>[])
          : [];

        for (const zone of zones) {
          const zoneMatch = zoneToSuggestion(zone, query, destination);
          if (zoneMatch) matches.push(zoneMatch);
        }
      }

      if (destinations.length < PAGE_SIZE) break;
    } catch (error) {
      trackEndpoint(endpoints, endpoint, 0, "failed", getErrorCode(error));
      if (isQuotaError(error)) throw error;
      break;
    }
  }

  return matches;
}

async function scanCountries(
  query: string,
  endpoints: NonNullable<HotelbedsContentSearchDebug["endpoints"]>,
): Promise<HotelbedsSearchSuggestion[]> {
  const client = createHotelbedsContentClient();
  const endpoint = "/locations/countries?from=1&to=10";

  try {
    const payload = await client.getCountries(pageQuery(1, 10));
    const countries = extractArray(payload, "countries");

    trackEndpoint(endpoints, endpoint, countries.length);

    const countrySuggestions: Array<HotelbedsSearchSuggestion | null> =
      countries.map((country) => countryToSuggestion(country, query));

    return countrySuggestions.filter(isSuggestion);
  } catch (error) {
    trackEndpoint(endpoints, endpoint, 0, "failed", getErrorCode(error));
    if (isQuotaError(error)) throw error;
    return [];
  }
}

async function scanHotels(
  query: string,
  limit: number,
  endpoints: NonNullable<HotelbedsContentSearchDebug["endpoints"]>,
): Promise<HotelbedsSearchSuggestion[]> {
  const client = createHotelbedsContentClient();
  const matches: HotelbedsSearchSuggestion[] = [];

  // لا تبحث في الفنادق إذا كلمة البحث قصيرة جدًا، لأن هذا يستهلك الكوتا بدون فائدة.
  if (query.trim().length < 3) {
    trackEndpoint(endpoints, "/hotels", 0, "skipped", "QUERY_TOO_SHORT");
    return matches;
  }

  for (let page = 0; page < MAX_HOTEL_PAGES && matches.length < limit; page += 1) {
    const from = page * PAGE_SIZE + 1;
    const to = from + PAGE_SIZE - 1;
    const endpoint = `/hotels?from=${from}&to=${to}`;

    try {
      const payload = await client.getHotels(pageQuery(from, to));
      const hotels = extractArray(payload, "hotels");

      trackEndpoint(endpoints, endpoint, hotels.length);

      const hotelSuggestions: Array<HotelbedsSearchSuggestion | null> =
        hotels.map((hotel) => hotelToSuggestion(hotel, query));

      matches.push(...hotelSuggestions.filter(isSuggestion));

      if (hotels.length < PAGE_SIZE) break;
    } catch (error) {
      trackEndpoint(endpoints, endpoint, 0, "failed", getErrorCode(error));
      if (isQuotaError(error)) throw error;
      break;
    }
  }

  return matches;
}

async function searchHotelbedsContentApi(
  query: string,
  limit: number,
): Promise<HotelbedsContentSearchResult> {
  const cacheKey = `api:${query.toLowerCase()}:${limit}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const endpoints: NonNullable<HotelbedsContentSearchDebug["endpoints"]> = [];

  try {
    const initialMatches: HotelbedsSearchSuggestion[] = [
      ...(await scanCountries(query, endpoints)),
      ...(await scanDestinations(query, limit, endpoints)),
    ];

    const matches = dedupeSuggestions(initialMatches);

    if (matches.length < limit) {
      matches.push(...(await scanHotels(query, limit - matches.length, endpoints)));
    }

    const suggestions = dedupeSuggestions(matches).slice(0, limit);

    const result: HotelbedsContentSearchResult = {
      suggestions,
      debug: {
        source: "hotelbeds-content-api",
        reason: suggestions.length > 0 ? "matches_found" : "no_matches",
        endpoints,
      },
    };

    writeCache(cacheKey, result);
    return result;
  } catch (error) {
    const result: HotelbedsContentSearchResult = {
      suggestions: [],
      debug: {
        source: "hotelbeds-content-api",
        reason: isQuotaError(error) ? "quota_exceeded" : "api_failed",
        endpoints,
      },
    };

    writeCache(cacheKey, result);
    return result;
  }
}

async function searchDatabase(
  query: string,
  limit: number,
): Promise<HotelbedsContentSearchResult> {
  const cacheKey = `database:${query.toLowerCase()}:${limit}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const suggestions = await searchStoredHotelbedsContent(query, limit);

  const result: HotelbedsContentSearchResult = {
    suggestions,
    debug: {
      source: "database",
      reason: suggestions.length > 0 ? "matches_found" : "no_matches",
    },
  };

  writeCache(cacheKey, result);
  return result;
}

export async function searchHotelbedsContentSuggestions(
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<HotelbedsContentSearchResult> {
  const term = query.trim();

  if (term.length < 2) {
    return {
      suggestions: [],
      debug: {
        source: getSearchSource() === "database" ? "database" : "hotelbeds-content-api",
        reason: "no_matches",
      },
    };
  }

  const source = getSearchSource();

  if (source === "database") return searchDatabase(term, limit);
  if (source === "api") return searchHotelbedsContentApi(term, limit);

  try {
    const databaseResult = await searchDatabase(term, limit);
    if (databaseResult.suggestions.length > 0) return databaseResult;
  } catch {
    // Auto mode may fall through to Content API in development only.
  }

  if (process.env.NODE_ENV !== "production") {
    return searchHotelbedsContentApi(term, limit);
  }

  return {
    suggestions: [],
    debug: {
      source: "database",
      reason: "database_failed",
    },
  };
}