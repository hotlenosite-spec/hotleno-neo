import type {
  SupplierBookRequest,
  SupplierBookResponse,
  SupplierBookingDetailsRequest,
  SupplierBookingDetailsResponse,
  SupplierCancelBookingRequest,
  SupplierCancelBookingResponse,
  SupplierCheckAvailabilityRequest,
  SupplierCheckAvailabilityResponse,
  SupplierHotelResult,
  SupplierPreBookRequest,
  SupplierPreBookResponse,
  SupplierProvider,
  SupplierSearchHotelsRequest,
  SupplierSearchHotelsResponse,
} from "./types";

const DEFAULT_NATIONALITY = "SA";
const DEFAULT_RESPONSE_TIME = 23;
const PAYMENT_MODE = "Limit";

type TboRoom = {
  Name?: string[];
  BookingCode?: string;
  TotalFare?: number;
  TotalTax?: number;
  Currency?: string;
  MealType?: string;
  IsRefundable?: boolean;
  CancelPolicies?: unknown[];
  Supplements?: unknown[];
  Inclusion?: string;
  RoomPromotion?: unknown[];
};

type TboHotelResult = {
  HotelCode?: string;
  Currency?: string;
  Rooms?: TboRoom[];
  RateConditions?: unknown[];
};

type TboResponse = {
  Status?: {
    Code?: number;
    Description?: string;
  };
  HotelResult?: TboHotelResult[];
  BookingReferenceId?: string;
  ConfirmationNumber?: string;
  BookingId?: string;
  __httpStatusCode?: number;
  [key: string]: unknown;
};

const TBO_CONFIRMATION_FIELD_NAMES = [
  "BookingId",
  "BookingID",
  "ConfirmationNo",
  "ConfirmationNumber",
  "BookingReferenceId",
  "TraceId",
  "VoucherStatus",
  "Status",
];

function redactTboRequest(body: unknown) {
  if (!body || typeof body !== "object") return body;

  const request = body as Record<string, unknown>;
  return {
    ...request,
    Credentials: request.Credentials ? "[redacted]" : undefined,
    CustomerDetails: request.CustomerDetails ? "[redacted]" : undefined,
    EmailId: request.EmailId ? "[redacted]" : undefined,
    PhoneNumber: request.PhoneNumber ? "[redacted]" : undefined,
    UserName: request.UserName ? "[redacted]" : undefined,
    Username: request.Username ? "[redacted]" : undefined,
    Password: request.Password ? "[redacted]" : undefined,
  };
}

function compactRawResponse(text: string) {
  return text.replace(/\s+/g, " ").slice(0, 1200);
}

function compactSafeRawResponse(text: string) {
  return compactRawResponse(text)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/"PhoneNumber"\s*:\s*"[^"]*"/gi, '"PhoneNumber":"[redacted]"')
    .replace(/"EmailId"\s*:\s*"[^"]*"/gi, '"EmailId":"[redacted]"');
}

function getTboHotelResultCount(body: TboResponse) {
  return Array.isArray(body.HotelResult) ? body.HotelResult.length : 0;
}

function logTboSearchDiagnostics(params: {
  endpointUrl: string;
  requestBody: unknown;
  statusCode?: number;
  rawResponseText?: string;
  hotelCount?: number;
  error?: string;
}) {
  console.info(
    "[TBO Search Diagnostics]",
    JSON.stringify({
      endpoint: params.endpointUrl,
      requestBody: redactTboRequest(params.requestBody),
      statusCode: params.statusCode ?? null,
      rawResponse: params.rawResponseText
        ? compactRawResponse(params.rawResponseText)
        : null,
      hotelCount: params.hotelCount ?? 0,
      error: params.error ?? null,
    }),
  );
}

function logTboBookDiagnostics(params: {
  endpointUrl: string;
  internalBookingId?: string;
  tboBookingEnabled?: boolean;
  stripeCheckoutEnabled?: boolean;
  stripeBypassedForCertification?: boolean;
  statusCode?: number;
  statusDescription?: string;
  bookingIdReturned?: boolean;
  fetchReachedServer?: boolean;
  rawResponse?: string;
  tboStatusCode?: number;
  validationErrors?: unknown;
  error?: string;
}) {
  console.info(
    "[TBO Book Diagnostics]",
    JSON.stringify({
      endpoint: params.endpointUrl,
      internalBookingId: params.internalBookingId ?? null,
      tboBookingEnabled: params.tboBookingEnabled ?? null,
      stripeCheckoutEnabled: params.stripeCheckoutEnabled ?? null,
      stripeBypassedForCertification:
        params.stripeBypassedForCertification ?? null,
      statusCode: params.statusCode ?? null,
      statusDescription: params.statusDescription ?? null,
      bookingIdReturned: params.bookingIdReturned ?? false,
      fetchReachedServer: params.fetchReachedServer ?? null,
      rawResponse: params.rawResponse ?? null,
      tboStatusCode: params.tboStatusCode ?? null,
      validationErrors: params.validationErrors ?? null,
      error: params.error ?? null,
    }),
  );
}

function logTboPreBookDiagnostics(params: {
  endpointUrl: string;
  internalBookingId?: string;
  hasBookingCode?: boolean;
  bookingCodePrefix?: string;
  statusCode?: number;
  statusDescription?: string;
  returnedBookingCode?: boolean;
  returnedTotalFare?: boolean;
  fetchReachedServer?: boolean;
  rawResponse?: string;
  tboStatusCode?: number;
  validationErrors?: unknown;
  error?: string;
}) {
  console.info(
    "[TBO PreBook Diagnostics]",
    JSON.stringify({
      endpoint: params.endpointUrl,
      internalBookingId: params.internalBookingId ?? null,
      hasBookingCode: params.hasBookingCode ?? false,
      bookingCodePrefix: params.bookingCodePrefix ?? "",
      statusCode: params.statusCode ?? null,
      statusDescription: params.statusDescription ?? null,
      returnedBookingCode: params.returnedBookingCode ?? false,
      returnedTotalFare: params.returnedTotalFare ?? false,
      fetchReachedServer: params.fetchReachedServer ?? null,
      rawResponse: params.rawResponse ?? null,
      tboStatusCode: params.tboStatusCode ?? null,
      validationErrors: params.validationErrors ?? null,
      error: params.error ?? null,
    }),
  );
}

function logTboCancelDiagnostics(params: {
  endpointUrl: string;
  internalBookingId?: string;
  hasSupplierBookingId?: boolean;
  hasSupplierConfirmationNo?: boolean;
  statusCode?: number;
  statusDescription?: string;
  cancellationSucceeded?: boolean;
  fetchReachedServer?: boolean;
  rawResponse?: string;
  tboStatusCode?: number;
  validationErrors?: unknown;
  error?: string;
}) {
  console.info(
    "[TBO Cancel Diagnostics]",
    JSON.stringify({
      endpoint: params.endpointUrl,
      internalBookingId: params.internalBookingId ?? null,
      hasSupplierBookingId: params.hasSupplierBookingId ?? false,
      hasSupplierConfirmationNo: params.hasSupplierConfirmationNo ?? false,
      statusCode: params.statusCode ?? null,
      statusDescription: params.statusDescription ?? null,
      cancellationSucceeded: params.cancellationSucceeded ?? false,
      fetchReachedServer: params.fetchReachedServer ?? null,
      rawResponse: params.rawResponse ?? null,
      tboStatusCode: params.tboStatusCode ?? null,
      validationErrors: params.validationErrors ?? null,
      error: params.error ?? null,
    }),
  );
}

function getTboValidationErrors(body: TboResponse) {
  return (
    body.ValidationErrors ||
    body.ValidationError ||
    body.Errors ||
    body.Error ||
    body.error ||
    null
  );
}

function getFirstTboString(body: TboResponse, keys: string[]) {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
}

function getTboConfirmationFields(body: TboResponse) {
  return {
    bookingId: getFirstTboString(body, ["BookingId", "BookingID"]),
    confirmationNo: getFirstTboString(body, [
      "ConfirmationNo",
      "ConfirmationNumber",
      "ConfirmationNumber",
    ]),
    reference: getFirstTboString(body, ["BookingReferenceId", "BookingRefNo"]),
    traceId: getFirstTboString(body, ["TraceId", "TraceID"]),
    voucherStatus: getFirstTboString(body, ["VoucherStatus"]),
    responseStatus: body.Status?.Description || "",
  };
}

function logTboBookResponseFields(body: TboResponse) {
  const presentFields = TBO_CONFIRMATION_FIELD_NAMES.filter((key) => {
    if (key === "Status") return Boolean(body.Status);
    const value = body[key];
    return value !== undefined && value !== null && value !== "";
  });

  console.info(
    "[TBO Book Response Fields]",
    JSON.stringify({
      presentFields,
      statusDescriptionPresent: Boolean(body.Status?.Description),
      bookingIdPresent: Boolean(getFirstTboString(body, ["BookingId", "BookingID"])),
      confirmationNoPresent: Boolean(
        getFirstTboString(body, ["ConfirmationNo", "ConfirmationNumber"]),
      ),
      referencePresent: Boolean(
        getFirstTboString(body, ["BookingReferenceId", "BookingRefNo"]),
      ),
      traceIdPresent: Boolean(getFirstTboString(body, ["TraceId", "TraceID"])),
      voucherStatusPresent: Boolean(getFirstTboString(body, ["VoucherStatus"])),
    }),
  );
}

function getTboBookRequiredDiagnostics(
  body: {
    BookingCode?: string;
    CustomerDetails?: Array<{ CustomerNames?: unknown[] }>;
    ClientReferenceId?: string;
    BookingReferenceId?: string;
    TotalFare?: number;
    EmailId?: string;
    PhoneNumber?: string;
    BookingType?: string;
    PaymentMode?: string;
  },
  metadata?: Record<string, unknown>,
) {
  const customerNames = body.CustomerDetails?.[0]?.CustomerNames || [];
  const missingFields = [
    ["BookingCode", body.BookingCode],
    ["CustomerDetails", body.CustomerDetails],
    ["CustomerNames", customerNames.length > 0],
    ["ClientReferenceId", body.ClientReferenceId],
    ["BookingReferenceId", body.BookingReferenceId],
    ["TotalFare", body.TotalFare && body.TotalFare > 0],
    ["EmailId", body.EmailId],
    ["PhoneNumber", body.PhoneNumber],
    ["BookingType", body.BookingType],
    ["PaymentMode", body.PaymentMode],
  ]
    .filter(([, value]) => !value)
    .map(([field]) => field);

  return {
    hasBookingCode: Boolean(body.BookingCode),
    bookingCodePrefix: body.BookingCode ? body.BookingCode.slice(0, 10) : "",
    hasCustomerDetails: Array.isArray(body.CustomerDetails),
    customerNamesCount: customerNames.length,
    hasClientReferenceId: Boolean(body.ClientReferenceId),
    hasBookingReferenceId: Boolean(body.BookingReferenceId),
    totalFare: body.TotalFare ?? 0,
    hasEmailId: Boolean(body.EmailId),
    hasPhoneNumber: Boolean(body.PhoneNumber),
    bookingType: body.BookingType || "",
    paymentMode: body.PaymentMode || "",
    hasCheckIn:
      metadata?.checkInDate !== undefined &&
      metadata.checkInDate !== null &&
      String(metadata.checkInDate).trim() !== "",
    hasCheckOut:
      metadata?.checkOutDate !== undefined &&
      metadata.checkOutDate !== null &&
      String(metadata.checkOutDate).trim() !== "",
    missingFields,
  };
}

function getTboFirstPreBookRoom(body: TboResponse) {
  return body.HotelResult?.[0]?.Rooms?.[0];
}

function getConfig() {
  const missing = ["TBO_BASE_URL", "TBO_USERNAME", "TBO_PASSWORD", "TBO_ENV"].filter(
    (key) => !process.env[key],
  );

  if (missing.length > 0) {
    throw new Error(`TBO is not configured: ${missing.join(", ")}`);
  }

  return {
    baseUrl: String(process.env.TBO_BASE_URL).replace(/\/+$/, ""),
    username: String(process.env.TBO_USERNAME),
    password: String(process.env.TBO_PASSWORD),
    environment: String(process.env.TBO_ENV),
  };
}

function normalizeCountryCode(value?: string) {
  const normalized = String(value || process.env.TBO_GUEST_NATIONALITY || DEFAULT_NATIONALITY)
    .trim()
    .toUpperCase();

  return /^[A-Z]{2}$/.test(normalized) ? normalized : DEFAULT_NATIONALITY;
}

function getResponseTime() {
  const parsed = Number.parseInt(
    process.env.TBO_RESPONSE_TIME ||
      process.env.TBO_RESPONSE_TIME_SECONDS ||
      `${DEFAULT_RESPONSE_TIME}`,
    10,
  );

  return Number.isInteger(parsed) && parsed >= 5 && parsed <= 23
    ? parsed
    : DEFAULT_RESPONSE_TIME;
}

function isTruthy(value: unknown) {
  return String(value || "").trim().toLowerCase() === "true";
}

function isTboCertificationTester(request: SupplierSearchHotelsRequest) {
  return (
    request.metadata?.userEmail === "tbo.tester@hotleno.com" ||
    (request.metadata?.role === "supplier_tester" &&
      request.metadata?.supplierScope === "tbo")
  );
}

function isTboCertificationMode(request: SupplierSearchHotelsRequest) {
  if (request.metadata?.tboNormalSearch === true) return false;
  return isTruthy(process.env.TBO_CERTIFICATION_MODE) || isTboCertificationTester(request);
}

function isTboDryRun() {
  return isTruthy(process.env.TBO_DRY_RUN);
}

function normalizeTboTitle(value?: string) {
  return value === "Mrs" || value === "Ms" || value === "Child" ? value : "Mr";
}

function toTboCustomerType(value?: string) {
  return value === "child" || value === "Child" ? "Child" : "Adult";
}

function getMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function getMetadataNumber(
  metadata: Record<string, unknown> | undefined,
  key: string,
) {
  const value = metadata?.[key];
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function logTboCertificationBookingDiagnostics(params: {
  internalBookingId: string;
  tboBookingEnabled: boolean;
  stripeCheckoutEnabled: boolean;
  stripeBypassedForCertification: boolean;
  statusCode?: number;
  statusDescription?: string;
  bookingIdReturned?: boolean;
  fetchReachedServer?: boolean;
  rawResponse?: string;
  tboStatusCode?: number;
  validationErrors?: unknown;
  error?: string;
}) {
  let endpointUrl = "TBO Book endpoint unavailable";
  try {
    const config = getConfig();
    endpointUrl = `${config.baseUrl}/Book`;
  } catch {
    endpointUrl = "TBO Book endpoint unavailable";
  }

  logTboBookDiagnostics({
    endpointUrl,
    ...params,
  });
}

function getHotelCodes(request: SupplierSearchHotelsRequest) {
  const metadataCodes = request.metadata?.hotelIds;
  const hotelCodes = Array.isArray(metadataCodes)
    ? metadataCodes.map(String)
    : typeof metadataCodes === "string"
      ? metadataCodes.split(",")
      : [];
  const explicitHotelCode =
    typeof request.metadata?.hotelCode === "string"
      ? [request.metadata.hotelCode]
      : [];
  const envCodes =
    request.metadata?.disableEnvHotelCodes === true
      ? []
      : isTboCertificationMode(request)
        ? String(
            process.env.TBO_SEARCH_HOTEL_CODES ||
              process.env.TBO_CERTIFICATION_HOTEL_CODES ||
              "",
          ).split(",")
        : [];

  return [...explicitHotelCode, ...hotelCodes, ...envCodes]
    .map((code) => code.trim())
    .filter(Boolean)
    .slice(0, 100);
}

function getHotelCodeSource(request: SupplierSearchHotelsRequest) {
  if (typeof request.metadata?.hotelCode === "string" && request.metadata.hotelCode) {
    return "request.hotelCode";
  }

  if (
    (Array.isArray(request.metadata?.hotelIds) && request.metadata.hotelIds.length > 0) ||
    typeof request.metadata?.hotelIds === "string"
  ) {
    return "request.hotelIds";
  }

  if (request.metadata?.disableEnvHotelCodes === true) return "none";
  if (isTboCertificationMode(request) && process.env.TBO_SEARCH_HOTEL_CODES) {
    return "TBO_SEARCH_HOTEL_CODES";
  }
  if (isTboCertificationMode(request) && process.env.TBO_CERTIFICATION_HOTEL_CODES) {
    return "TBO_CERTIFICATION_HOTEL_CODES";
  }
  return "none";
}

function toTboPaxRooms(request: SupplierSearchHotelsRequest) {
  return request.rooms.slice(0, 6).map((room) => ({
    Adults: Math.min(Math.max(room.adults || 1, 1), 6),
    Children: Math.min(Math.max(room.children || 0, 0), 4),
    ChildrenAges: (room.childrenAges || []).slice(0, 4).map((age) =>
      Math.min(Math.max(Number(age) || 0, 0), 18),
    ),
  }));
}

function getRoomName(room: TboRoom) {
  return Array.isArray(room.Name) ? room.Name.filter(Boolean).join(", ") : "Room";
}

function mapSearchResponse(
  body: TboResponse,
  request: SupplierSearchHotelsRequest,
): SupplierSearchHotelsResponse {
  const hotels: SupplierHotelResult[] = [];

  for (const hotel of body.HotelResult || []) {
      const hotelCode = String(hotel.HotelCode || "");
      const currency = hotel.Currency || request.currency || "USD";
      const rates = (hotel.Rooms || [])
        .filter((room) => room.BookingCode)
        .map((room) => ({
          rateKey: String(room.BookingCode),
          roomName: getRoomName(room),
          boardName: room.MealType || room.Inclusion || "Room",
          price: Number(room.TotalFare || 0),
          currency,
          refundable: room.IsRefundable !== false,
          cancellationPolicies: room.CancelPolicies || [],
          metadata: {
            supplements: room.Supplements || [],
            inclusion: room.Inclusion || null,
            roomPromotion: room.RoomPromotion || [],
            totalTax: room.TotalTax ?? null,
          },
        }));

      if (!hotelCode || rates.length === 0) continue;

      hotels.push({
        supplier: "tbo" as const,
        supplierHotelId: hotelCode,
        hotelName: `TBO Hotel ${hotelCode}`,
        cityName: request.cityName,
        countryName: request.countryCode,
        rates,
        metadata: {
          supplierEnvironment: process.env.TBO_ENV,
        },
      });
  }

  return {
    supplier: "tbo",
    hotels,
    rawSupplierRequest: {
      supplier: "tbo",
      checkIn: request.checkIn,
      checkOut: request.checkOut,
      hotelCount: getHotelCodes(request).length,
      hotelCodeSource: getHotelCodeSource(request),
      certificationMode: isTboCertificationMode(request),
      dryRun: isTboDryRun(),
      requiredFields: [
        "CheckIn",
        "CheckOut",
        "HotelCodes",
        "GuestNationality",
        "PaxRooms",
      ],
    },
    rawSupplierResponse: {
      status: body.Status,
      hotelCount: hotels.length,
    },
  };
}

function assertTboSuccess(body: TboResponse, action: string) {
  const code =
    typeof body?.Status?.Code === "number"
      ? body.Status.Code
      : Number(body?.Status?.Code);
  if (Number.isFinite(code) && code !== 200) {
    throw new Error(body.Status?.Description || `${action} failed`);
  }
}

async function requestTbo(
  endpoint: string,
  body: unknown,
  diagnosticsMetadata?: Record<string, unknown>,
): Promise<TboResponse> {
  const config = getConfig();
  const endpointUrl = `${config.baseUrl}/${endpoint}`;
  let response: Response;
  let text = "";

  try {
    response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${config.username}:${config.password}`,
        ).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    text = await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : "TBO request failed";
    if (endpoint === "Book") {
      logTboBookDiagnostics({
        endpointUrl,
        fetchReachedServer: false,
        error: message,
      });
    } else if (endpoint === "Cancel") {
      logTboCancelDiagnostics({
        endpointUrl,
        internalBookingId: getMetadataString(diagnosticsMetadata, "bookingId"),
        hasSupplierBookingId: Boolean(
          getMetadataString(diagnosticsMetadata, "supplierBookingId"),
        ),
        hasSupplierConfirmationNo: Boolean(
          getMetadataString(diagnosticsMetadata, "supplierConfirmationNo"),
        ),
        fetchReachedServer: false,
        error: message,
      });
    } else if (endpoint === "PreBook") {
      const request = body as { BookingCode?: string };
      logTboPreBookDiagnostics({
        endpointUrl,
        internalBookingId: getMetadataString(diagnosticsMetadata, "bookingId"),
        hasBookingCode: Boolean(request.BookingCode),
        bookingCodePrefix: request.BookingCode ? request.BookingCode.slice(0, 10) : "",
        fetchReachedServer: false,
        error: message,
      });
    } else {
      logTboSearchDiagnostics({
        endpointUrl,
        requestBody: body,
        error: message,
      });
    }
    throw error;
  }

  let parsed: TboResponse = {};
  try {
    parsed = text ? (JSON.parse(text) as TboResponse) : {};
  } catch {
    parsed = {
      Status: {
        Code: response.status,
        Description: "TBO returned a non-JSON response",
      },
    };
  }
  parsed.__httpStatusCode = response.status;

  if (endpoint === "Book") {
    logTboBookDiagnostics({
      endpointUrl,
      fetchReachedServer: true,
      statusCode: response.status,
      rawResponse: compactSafeRawResponse(text),
      tboStatusCode: parsed.Status?.Code,
      statusDescription: parsed.Status?.Description,
      validationErrors: getTboValidationErrors(parsed),
      bookingIdReturned: Boolean(
        parsed.BookingId || parsed.ConfirmationNumber || parsed.BookingReferenceId,
      ),
    });
  } else if (endpoint === "Cancel") {
    const request = body as { ConfirmationNumber?: string };
    logTboCancelDiagnostics({
      endpointUrl,
      internalBookingId: getMetadataString(diagnosticsMetadata, "bookingId"),
      hasSupplierBookingId: Boolean(
        getMetadataString(diagnosticsMetadata, "supplierBookingId"),
      ),
      hasSupplierConfirmationNo: Boolean(
        request.ConfirmationNumber ||
          getMetadataString(diagnosticsMetadata, "supplierConfirmationNo"),
      ),
      fetchReachedServer: true,
      statusCode: response.status,
      rawResponse: compactSafeRawResponse(text),
      tboStatusCode: parsed.Status?.Code,
      statusDescription: parsed.Status?.Description,
      validationErrors: getTboValidationErrors(parsed),
      cancellationSucceeded:
        response.ok &&
        (!parsed.Status?.Code || Number(parsed.Status.Code) === 200),
    });
  } else if (endpoint === "PreBook") {
    const request = body as { BookingCode?: string };
    const room = getTboFirstPreBookRoom(parsed);
    logTboPreBookDiagnostics({
      endpointUrl,
      internalBookingId: getMetadataString(diagnosticsMetadata, "bookingId"),
      hasBookingCode: Boolean(request.BookingCode),
      bookingCodePrefix: request.BookingCode ? request.BookingCode.slice(0, 10) : "",
      fetchReachedServer: true,
      statusCode: response.status,
      rawResponse: compactSafeRawResponse(text),
      tboStatusCode: parsed.Status?.Code,
      statusDescription: parsed.Status?.Description,
      validationErrors: getTboValidationErrors(parsed),
      returnedBookingCode: Boolean(room?.BookingCode),
      returnedTotalFare: typeof room?.TotalFare === "number",
    });
  } else {
    logTboSearchDiagnostics({
      endpointUrl,
      requestBody: body,
      statusCode: response.status,
      rawResponseText: text,
      hotelCount: getTboHotelResultCount(parsed),
    });
  }

  if (!response.ok) {
    if (
      endpoint === "Cancel" &&
      (response.status === 404 ||
        compactRawResponse(text).toLowerCase().includes("no http resource"))
    ) {
      throw new Error("wrong_cancel_endpoint_or_404");
    }
    throw new Error(parsed?.Status?.Description || `TBO ${endpoint} failed`);
  }

  return parsed;
}

export class TboSupplierProvider implements SupplierProvider {
  readonly name = "tbo" as const;

  async searchHotels(
    request: SupplierSearchHotelsRequest,
  ): Promise<SupplierSearchHotelsResponse> {
    const hotelCodes = getHotelCodes(request);
    if (hotelCodes.length === 0) {
      const config = getConfig();
      logTboSearchDiagnostics({
        endpointUrl: `${config.baseUrl}/Search`,
        requestBody: {
          CheckIn: request.checkIn,
          CheckOut: request.checkOut,
          HotelCodes: "",
          GuestNationality: normalizeCountryCode(request.nationality),
          PaxRooms: toTboPaxRooms(request),
          ResponseTime: getResponseTime(),
          IsDetailedResponse: true,
          Filters: {
            Refundable: false,
            NoOfRooms: 0,
            MealType: "All",
          },
        },
        error:
          "TBO search was not sent because HotelCodes are required and none were configured.",
      });
      throw new Error(
        "TBO search requires HotelCodes. Configure TBO_SEARCH_HOTEL_CODES locally or pass hotelIds.",
      );
    }

    const tboRequest = {
      CheckIn: request.checkIn,
      CheckOut: request.checkOut,
      HotelCodes: hotelCodes.join(","),
      GuestNationality: normalizeCountryCode(request.nationality),
      PaxRooms: toTboPaxRooms(request),
      ResponseTime: getResponseTime(),
      IsDetailedResponse: true,
      Filters: {
        Refundable: false,
        NoOfRooms: 0,
        MealType: "All",
      },
    };

    if (isTboDryRun()) {
      const config = getConfig();
      logTboSearchDiagnostics({
        endpointUrl: `${config.baseUrl}/Search`,
        requestBody: tboRequest,
        rawResponseText: JSON.stringify({
          dryRun: true,
          message: "TBO_DRY_RUN=true; real TBO request was not sent.",
        }),
        hotelCount: 0,
      });

      return mapSearchResponse(
        {
          Status: {
            Code: 200,
            Description: "TBO_DRY_RUN=true; request body built but not sent.",
          },
          HotelResult: [],
          dryRun: true,
        },
        request,
      );
    }

    const body = await requestTbo("Search", tboRequest);
    assertTboSuccess(body, "TBO Search");

    return mapSearchResponse(body, request);
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
    const tboRequest = {
      BookingCode: request.supplierRateKey,
      PaymentMode: PAYMENT_MODE,
    };
    const config = getConfig();
    console.info(
      "[TBO PreBook Diagnostics]",
      JSON.stringify({
        endpoint: `${config.baseUrl}/PreBook`,
        internalBookingId: getMetadataString(request.metadata, "bookingId"),
        hasBookingCode: Boolean(tboRequest.BookingCode),
        bookingCodePrefix: tboRequest.BookingCode
          ? tboRequest.BookingCode.slice(0, 10)
          : "",
        paymentMode: PAYMENT_MODE,
        statusCode: null,
        statusDescription: null,
        returnedBookingCode: false,
        returnedTotalFare: false,
        error: tboRequest.BookingCode ? null : "Missing BookingCode",
      }),
    );
    if (!tboRequest.BookingCode) {
      throw new Error("Missing TBO BookingCode; PreBook request was not sent.");
    }
    const body = await requestTbo("PreBook", tboRequest, request.metadata);
    assertTboSuccess(body, "TBO PreBook");
    const hotel = body.HotelResult?.[0];
    const room = hotel?.Rooms?.[0];

    return {
      supplier: "tbo",
      supplierHotelId: request.supplierHotelId,
      supplierRateKey: room?.BookingCode || request.supplierRateKey,
      price: Number(room?.TotalFare || 0),
      currency: hotel?.Currency || request.currency || "USD",
      available: Boolean(room?.BookingCode),
      cancellationPolicies: room?.CancelPolicies || [],
      rawSupplierRequest: { supplier: "tbo", action: "PreBook" },
      rawSupplierResponse: { status: body.Status },
    };
  }

  async book(request: SupplierBookRequest): Promise<SupplierBookResponse> {
    const customerNames =
      request.guests && request.guests.length > 0
        ? request.guests
        : [
            {
              title: request.leadGuest.title,
              firstName: request.leadGuest.firstName,
              lastName: request.leadGuest.lastName,
              type: "adult" as const,
            },
          ];
    const clientReferenceId =
      getMetadataString(request.metadata, "bookingReference") ||
      request.idempotencyKey;
    const bookingReferenceId =
      getMetadataString(request.metadata, "supplierBookingReference") ||
      getMetadataString(request.metadata, "bookingId") ||
      request.idempotencyKey;
    const tboRequest = {
      BookingCode: request.supplierRateKey,
      CustomerDetails: [
        {
          CustomerNames: customerNames.map((guest) => ({
            Title: normalizeTboTitle(guest.title),
            FirstName: guest.firstName || "Guest",
            LastName: guest.lastName || "Hotleno",
            Type: toTboCustomerType(guest.type),
          })),
        },
      ],
      ClientReferenceId: clientReferenceId.slice(0, 50),
      BookingReferenceId: bookingReferenceId.slice(0, 50),
      TotalFare: getMetadataNumber(request.metadata, "totalFare"),
      EmailId: request.leadGuest.email,
      PhoneNumber: request.leadGuest.phone,
      BookingType: "Voucher",
      PaymentMode: PAYMENT_MODE,
    };
    const config = getConfig();
    const requestDiagnostics = getTboBookRequiredDiagnostics(
      tboRequest,
      request.metadata,
    );
    console.info(
      "[TBO Book Request Diagnostics]",
      JSON.stringify({
        endpoint: `${config.baseUrl}/Book`,
        bookingCodeSource:
          getMetadataString(request.metadata, "bookingCodeSource") || "search",
        ...requestDiagnostics,
      }),
    );

    if (!tboRequest.BookingCode) {
      throw new Error("Missing TBO BookingCode; Book request was not sent.");
    }

    const body = await requestTbo("Book", tboRequest, request.metadata);
    assertTboSuccess(body, "TBO Book");
    logTboBookResponseFields(body);
    const confirmationFields = getTboConfirmationFields(body);
    const reference =
      confirmationFields.reference ||
      confirmationFields.confirmationNo ||
      confirmationFields.bookingId ||
      tboRequest.BookingReferenceId;

    return {
      supplier: "tbo",
      supplierBookingReference: String(reference),
      status: "confirmed",
      rawSupplierRequest: {
        supplier: "tbo",
        action: "Book",
        hasBookingCode: Boolean(tboRequest.BookingCode),
        hasCustomerDetails: tboRequest.CustomerDetails[0].CustomerNames.length > 0,
        hasTotalFare: tboRequest.TotalFare > 0,
        bookingType: tboRequest.BookingType,
        paymentMode: tboRequest.PaymentMode,
      },
      rawSupplierResponse: {
        status: body.Status,
        httpStatusCode: body.__httpStatusCode,
        bookingId: confirmationFields.bookingId || null,
        confirmationNo: confirmationFields.confirmationNo || null,
        confirmationNumber: confirmationFields.confirmationNo || null,
        bookingReferenceId: confirmationFields.reference || null,
        supplierReference: confirmationFields.reference || null,
        traceId: confirmationFields.traceId || null,
        voucherStatus: confirmationFields.voucherStatus || null,
        responseStatus: confirmationFields.responseStatus || null,
      },
    };
  }

  async getBookingDetails(
    request: SupplierBookingDetailsRequest,
  ): Promise<SupplierBookingDetailsResponse> {
    const body = await requestTbo("BookingDetail", {
      BookingReferenceId: request.supplierBookingReference,
      PaymentMode: PAYMENT_MODE,
    });
    assertTboSuccess(body, "TBO BookingDetail");

    return {
      supplier: "tbo",
      supplierBookingReference: request.supplierBookingReference,
      status: "confirmed",
      rawSupplierRequest: { supplier: "tbo", action: "BookingDetail" },
      rawSupplierResponse: { status: body.Status },
    };
  }

  async cancelBooking(
    request: SupplierCancelBookingRequest,
  ): Promise<SupplierCancelBookingResponse> {
    const bookingId = getMetadataString(request.metadata, "supplierBookingId");
    const supplierConfirmationNo = getMetadataString(
      request.metadata,
      "supplierConfirmationNo",
    ) || request.supplierBookingReference;
    const tboRequest = {
      ConfirmationNumber: supplierConfirmationNo,
    };

    const config = getConfig();
    console.info(
      "[TBO Cancel Request Diagnostics]",
      JSON.stringify({
        endpoint: `${config.baseUrl}/Cancel`,
        internalBookingId: getMetadataString(request.metadata, "bookingId"),
        hasSupplierBookingId: Boolean(bookingId),
        supplierBookingIdPrefix: bookingId ? bookingId.slice(0, 6) : "",
        hasSupplierConfirmationNo: Boolean(supplierConfirmationNo),
        requestKeys: Object.keys(tboRequest),
        requestType: null,
      }),
    );
    logTboCancelDiagnostics({
      endpointUrl: `${config.baseUrl}/Cancel`,
      internalBookingId: getMetadataString(request.metadata, "bookingId"),
      hasSupplierBookingId: Boolean(bookingId),
      hasSupplierConfirmationNo: Boolean(supplierConfirmationNo),
      error: supplierConfirmationNo ? undefined : "Missing supplier ConfirmationNumber",
    });

    if (!supplierConfirmationNo) {
      throw new Error(
        "Missing TBO ConfirmationNumber; cancellation request was not sent.",
      );
    }

    const body = await requestTbo("Cancel", tboRequest, {
      ...(request.metadata || {}),
      supplierConfirmationNo,
    });
    assertTboSuccess(body, "TBO Cancel");

    return {
      supplier: "tbo",
      supplierBookingReference: request.supplierBookingReference,
      status: "cancelled",
      rawSupplierRequest: {
        supplier: "tbo",
        action: "Cancel",
        hasBookingId: Boolean(bookingId),
        hasConfirmationNumber: Boolean(supplierConfirmationNo),
        requestKeys: Object.keys(tboRequest),
      },
      rawSupplierResponse: {
        status: body.Status,
        httpStatusCode: body.__httpStatusCode,
      },
    };
  }
}
