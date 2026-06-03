import {
  createHotelbedsHeaders,
  getHotelbedsBaseUrls,
  HotelbedsCredentialsError,
} from "./hotelbeds-auth";

const DEFAULT_TIMEOUT_MS = 15_000;

export type HotelbedsContentQuery = {
  fields?: string;
  language?: string;
  from?: number | string;
  to?: number | string;
  useSecondaryLanguage?: boolean | string;
  lastUpdateTime?: string;
  codes?: string | string[];
  countryCode?: string;
  destinationCode?: string;
};

export type HotelbedsContentClientOptions = {
  baseUrl?: string;
  timeoutMs?: number;
};

export type HotelbedsContentErrorCode =
  | "HOTELBEDS_MISSING_CREDENTIALS"
  | "HOTELBEDS_UNAUTHORIZED"
  | "HOTELBEDS_FORBIDDEN"
  | "HOTELBEDS_QUOTA_EXCEEDED"
  | "HOTELBEDS_INVALID_RESPONSE"
  | "HOTELBEDS_TIMEOUT"
  | "HOTELBEDS_NETWORK_ERROR"
  | "HOTELBEDS_REQUEST_FAILED";

export class HotelbedsContentClientError extends Error {
  readonly code: HotelbedsContentErrorCode;
  readonly status?: number;
  readonly details?: string;

  constructor(
    message: string,
    code: HotelbedsContentErrorCode,
    status?: number,
    details?: string,
  ) {
    super(message);
    this.name = "HotelbedsContentClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function appendQuery(url: URL, query: HotelbedsContentQuery = {}) {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      url.searchParams.set(key, value.join(","));
      continue;
    }

    url.searchParams.set(key, String(value));
  }
}

function countContentItems(payload: unknown) {
  if (!payload || typeof payload !== "object") return 0;

  for (const key of [
    "hotels",
    "destinations",
    "countries",
    "rooms",
    "facilities",
    "boards",
    "categories",
    "currencies",
    "languages",
  ]) {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value.length;
  }

  return 0;
}

function logHotelbedsContentRequest(args: {
  path: string;
  status: number;
  itemCount?: number;
  errorCode?: string;
  errorHint?: string;
}) {
  if (process.env.NODE_ENV === "production") return;

  console.info("[Hotelbeds Content API]", {
    endpoint: args.path,
    status: args.status,
    itemCount: args.itemCount ?? 0,
    errorCode: args.errorCode,
    errorHint: args.errorHint,
  });
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HotelbedsContentClientError(
      "Hotelbeds returned a non-JSON response.",
      "HOTELBEDS_INVALID_RESPONSE",
      response.status,
    );
  }
}

async function readSafeErrorDetails(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) return "";

  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    const message =
      json.message ||
      json.error ||
      json.errorMessage ||
      json.description ||
      json.detail;

    return typeof message === "string" ? message : text.slice(0, 500);
  } catch {
    return text.slice(0, 500);
  }
}

function isQuotaExceededMessage(message: string) {
  return /quota|rate limit|too many requests|limit exceeded/i.test(message);
}

function toHotelbedsError(error: unknown): HotelbedsContentClientError {
  if (error instanceof HotelbedsContentClientError) {
    return error;
  }

  if (error instanceof HotelbedsCredentialsError) {
    return new HotelbedsContentClientError(
      error.message,
      "HOTELBEDS_MISSING_CREDENTIALS",
    );
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new HotelbedsContentClientError(
      "Hotelbeds request timed out.",
      "HOTELBEDS_TIMEOUT",
    );
  }

  if (error instanceof TypeError) {
    return new HotelbedsContentClientError(
      "Hotelbeds network request failed.",
      "HOTELBEDS_NETWORK_ERROR",
    );
  }

  return new HotelbedsContentClientError(
    error instanceof Error ? error.message : "Hotelbeds request failed.",
    "HOTELBEDS_REQUEST_FAILED",
  );
}

function joinBaseUrlAndPath(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export class HotelbedsContentClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: HotelbedsContentClientOptions = {}) {
    this.baseUrl = options.baseUrl || getHotelbedsBaseUrls().contentBaseUrl;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async get(path: string, query?: HotelbedsContentQuery) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL(joinBaseUrlAndPath(this.baseUrl, path));
      appendQuery(url, query);

      const response = await fetch(url, {
        method: "GET",
        headers: createHotelbedsHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await readSafeErrorDetails(response);
        const isQuotaExceeded = isQuotaExceededMessage(details);

        let code: HotelbedsContentErrorCode = "HOTELBEDS_REQUEST_FAILED";
        let message = `Hotelbeds request failed with status ${response.status}.`;

        if (response.status === 401) {
          code = "HOTELBEDS_UNAUTHORIZED";
          message = "Hotelbeds rejected the request credentials.";
        } else if (response.status === 403 && isQuotaExceeded) {
          code = "HOTELBEDS_QUOTA_EXCEEDED";
          message = "Hotelbeds Content API quota was exceeded.";
        } else if (response.status === 403) {
          code = "HOTELBEDS_FORBIDDEN";
          message = "Hotelbeds credentials are not authorized for this resource.";
        }

        logHotelbedsContentRequest({
          path,
          status: response.status,
          errorCode: code,
          errorHint: details ? details.slice(0, 120) : undefined,
        });

        throw new HotelbedsContentClientError(
          message,
          code,
          response.status,
          details,
        );
      }

      const data = await parseJsonResponse(response);
      logHotelbedsContentRequest({
        path,
        status: response.status,
        itemCount: countContentItems(data),
      });

      return data;
    } catch (error) {
      throw toHotelbedsError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  getHotels(query?: HotelbedsContentQuery) {
    return this.get("/hotels", query);
  }

  getHotelDetails(code: string, query?: HotelbedsContentQuery) {
    return this.get(`/hotels/${encodeURIComponent(code)}/details`, query);
  }

  getCountries(query?: HotelbedsContentQuery) {
    return this.get("/locations/countries", query);
  }

  getDestinations(query?: HotelbedsContentQuery) {
    return this.get("/locations/destinations", query);
  }

  getAccommodations(query?: HotelbedsContentQuery) {
    return this.get("/types/accommodations", query);
  }

  getBoards(query?: HotelbedsContentQuery) {
    return this.get("/types/boards", query);
  }

  getCategories(query?: HotelbedsContentQuery) {
    return this.get("/types/categories", query);
  }

  getChains(query?: HotelbedsContentQuery) {
    return this.get("/types/chains", query);
  }

  getCurrencies(query?: HotelbedsContentQuery) {
    return this.get("/types/currencies", query);
  }

  getFacilities(query?: HotelbedsContentQuery) {
    return this.get("/types/facilities", query);
  }

  getFacilityGroups(query?: HotelbedsContentQuery) {
    return this.get("/types/facilitygroups", query);
  }

  getIssues(query?: HotelbedsContentQuery) {
    return this.get("/types/issues", query);
  }

  getLanguages(query?: HotelbedsContentQuery) {
    return this.get("/types/languages", query);
  }

  getPromotions(query?: HotelbedsContentQuery) {
    return this.get("/types/promotions", query);
  }

  getRooms(query?: HotelbedsContentQuery) {
    return this.get("/types/rooms", query);
  }

  getSegments(query?: HotelbedsContentQuery) {
    return this.get("/types/segments", query);
  }

  getTerminals(query?: HotelbedsContentQuery) {
    return this.get("/types/terminals", query);
  }

  getImageTypes(query?: HotelbedsContentQuery) {
    return this.get("/types/imagetypes", query);
  }

  getRateComments(query?: HotelbedsContentQuery) {
    return this.get("/types/ratecomments", query);
  }
}

export function createHotelbedsContentClient(
  options?: HotelbedsContentClientOptions,
) {
  return new HotelbedsContentClient(options);
}