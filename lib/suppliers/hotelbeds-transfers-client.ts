import {
  createHotelbedsTransfersHeaders,
  getHotelbedsTransfersBaseUrl,
  getHotelbedsTransfersCacheBaseUrl,
  HotelbedsTransfersCredentialsError,
  isHotelbedsTransfersBookingEnabled,
  isHotelbedsTransfersSearchEnabled,
} from "./hotelbeds-transfers-auth";
import type {
  TransferBookingDetailsRequest,
  TransferBookingHolder,
  TransferBookingPassenger,
  TransferBookingRequest,
  TransferBookingResponse,
  TransferBookingService,
  TransferCancellationRequest,
  TransferCancellationResponse,
  TransferLocation,
  TransferOptionalExtra,
  TransferLocationSearchRequest,
  TransferLocationSearchResponse,
  TransferRateCheckRequest,
  TransferRateCheckResponse,
  TransferSearchRequest,
  TransferSearchResponse,
  TransferVoucher,
} from "@/types/transfers";

const DEFAULT_TIMEOUT_MS = 15_000;
const DISABLED_SEARCH_MESSAGE =
  "Transfers search is disabled in this environment.";
const DISABLED_BOOKING_MESSAGE =
  "Transfers booking is disabled in this environment.";
const NOT_CONNECTED_MESSAGE =
  "Hotelbeds Transfers API endpoint mapping is pending official integration.";
const DEFAULT_LANGUAGE = "en";
const HOTELBEDS_IMAGE_BASE_URL = "https://photos.hotelbeds.com/giata/bigger";

export type HotelbedsTransfersClientOptions = {
  baseUrl?: string;
  cacheBaseUrl?: string;
  timeoutMs?: number;
};

export type HotelbedsTransfersCacheQuery = {
  fields?: string;
  language?: string;
  offset?: number | string;
  limit?: number | string;
  codes?: string | string[];
  countryCode?: string;
  countryCodes?: string | string[];
  destinationCode?: string;
  destinationCodes?: string | string[];
  giataCodes?: string | string[];
};

export type HotelbedsTransfersErrorCode =
  | "HOTELBEDS_TRANSFERS_MISSING_CREDENTIALS"
  | "HOTELBEDS_TRANSFERS_DISABLED"
  | "HOTELBEDS_TRANSFERS_NOT_CONNECTED"
  | "HOTELBEDS_TRANSFERS_INVALID_RESPONSE"
  | "HOTELBEDS_TRANSFERS_TIMEOUT"
  | "HOTELBEDS_TRANSFERS_NETWORK_ERROR"
  | "HOTELBEDS_TRANSFERS_REQUEST_FAILED";

export class HotelbedsTransfersClientError extends Error {
  readonly code: HotelbedsTransfersErrorCode;
  readonly status?: number;

  constructor(
    message: string,
    code: HotelbedsTransfersErrorCode,
    status?: number,
  ) {
    super(message);
    this.name = "HotelbedsTransfersClientError";
    this.code = code;
    this.status = status;
  }
}

function logTransfersRequest(args: {
  operation: string;
  endpoint?: string;
  status?: number;
  enabled: boolean;
  message?: string;
  optionCount?: number;
}) {
  if (process.env.NODE_ENV === "production") return;

  console.info("[Hotelbeds Transfers API]", {
    operation: args.operation,
    endpoint: args.endpoint,
    status: args.status,
    enabled: args.enabled,
    message: args.message,
    optionCount: args.optionCount,
  });
}

function toTransfersError(error: unknown): HotelbedsTransfersClientError {
  if (error instanceof HotelbedsTransfersClientError) {
    return error;
  }

  if (error instanceof HotelbedsTransfersCredentialsError) {
    return new HotelbedsTransfersClientError(
      error.message,
      "HOTELBEDS_TRANSFERS_MISSING_CREDENTIALS",
    );
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new HotelbedsTransfersClientError(
      "Hotelbeds Transfers request timed out.",
      "HOTELBEDS_TRANSFERS_TIMEOUT",
    );
  }

  if (error instanceof TypeError) {
    return new HotelbedsTransfersClientError(
      "Hotelbeds Transfers network request failed.",
      "HOTELBEDS_TRANSFERS_NETWORK_ERROR",
    );
  }

  return new HotelbedsTransfersClientError(
    error instanceof Error ? error.message : "Hotelbeds Transfers request failed.",
    "HOTELBEDS_TRANSFERS_REQUEST_FAILED",
  );
}

function disabledSearchResponse(
  request?: unknown,
  message = DISABLED_SEARCH_MESSAGE,
): TransferSearchResponse {
  return {
    supplier: "hotelbeds-transfers",
    enabled: false,
    options: [],
    message,
    rawSupplierRequest: request,
  };
}

function disabledLocationResponse(
  request?: unknown,
): TransferLocationSearchResponse {
  return {
    supplier: "hotelbeds-transfers",
    enabled: false,
    locations: [],
    message: DISABLED_SEARCH_MESSAGE,
    rawSupplierRequest: request,
  };
}

function disabledRateResponse(request?: unknown): TransferRateCheckResponse {
  return {
    supplier: "hotelbeds-transfers",
    available: false,
    message: DISABLED_SEARCH_MESSAGE,
    rawSupplierRequest: request,
  };
}

function disabledBookingResponse(request?: unknown): TransferBookingResponse {
  return {
    supplier: "hotelbeds-transfers",
    status: "disabled",
    message: DISABLED_BOOKING_MESSAGE,
    rawSupplierRequest: request,
  };
}

function disabledCancellationResponse(
  request?: TransferCancellationRequest,
): TransferCancellationResponse {
  return {
    supplier: "hotelbeds-transfers",
    status: "disabled",
    bookingReference: request?.bookingReference,
    message: DISABLED_BOOKING_MESSAGE,
    rawSupplierRequest: request,
  };
}

function joinBaseUrlAndPath(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function encodePathSegment(value: string | number) {
  return encodeURIComponent(String(value));
}

function toHotelbedsDateTime(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new HotelbedsTransfersClientError(
      "pickupDateTime is required for transfers search.",
      "HOTELBEDS_TRANSFERS_REQUEST_FAILED",
      400,
    );
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new HotelbedsTransfersClientError(
      "pickupDateTime must be a valid date and time.",
      "HOTELBEDS_TRANSFERS_REQUEST_FAILED",
      400,
    );
  }

  return parsed.toISOString().slice(0, 19);
}

function getLocationCodeType(location: TransferSearchRequest["pickup"]) {
  const codeType = location.codeType || location.metadata?.codeType;
  return typeof codeType === "string" ? codeType.toUpperCase() : "";
}

function requireLocationCode(
  location: TransferSearchRequest["pickup"],
  label: string,
) {
  const code = location.code?.trim();
  const codeType = getLocationCodeType(location);

  if (!code || !codeType) {
    throw new HotelbedsTransfersClientError(
      `${label} code and codeType are required for Hotelbeds Transfers search.`,
      "HOTELBEDS_TRANSFERS_REQUEST_FAILED",
      400,
    );
  }

  return { code, codeType };
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HotelbedsTransfersClientError(
      "Hotelbeds Transfers returned a non-JSON response.",
      "HOTELBEDS_TRANSFERS_INVALID_RESPONSE",
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
      json.description ||
      json.detail ||
      json.errorMessage;

    return typeof message === "string" ? message : text.slice(0, 300);
  } catch {
    return text.slice(0, 300);
  }
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

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function getFirstString(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }

  return undefined;
}

function getFirstNumber(...values: unknown[]) {
  for (const value of values) {
    const number = asNumber(value);
    if (number !== undefined) return number;
  }

  return undefined;
}

function normalizeImageUrl(value: unknown) {
  const raw = asString(value)?.trim();

  if (!raw) return undefined;

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;

  const cleanPath = raw.replace(/^\/+/, "");

  if (!cleanPath) return undefined;

  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(cleanPath)) {
    return `${HOTELBEDS_IMAGE_BASE_URL}/${cleanPath}`;
  }

  return undefined;
}

function findImageUrlInObject(value: unknown, depth = 0): string | undefined {
  if (depth > 5) return undefined;

  const directImage = normalizeImageUrl(value);
  if (directImage) return directImage;

  if (Array.isArray(value)) {
    for (const item of value) {
      const image = findImageUrlInObject(item, depth + 1);
      if (image) return image;
    }

    return undefined;
  }

  const record = asRecord(value);
  const directKeys = [
    "image",
    "imageUrl",
    "url",
    "path",
    "picture",
    "photo",
    "thumbnail",
    "mainImage",
    "bigImage",
  ];

  for (const key of directKeys) {
    const image = normalizeImageUrl(record[key]);
    if (image) return image;
  }

  const nestedKeys = [
    "images",
    "imageList",
    "pictures",
    "photos",
    "media",
    "content",
    "factsheet",
    "vehicle",
    "transferDetailInfo",
    "transferFactsheet",
  ];

  for (const key of nestedKeys) {
    const nested = record[key];
    if (nested === undefined || nested === null) continue;

    const image = findImageUrlInObject(nested, depth + 1);
    if (image) return image;
  }

  return undefined;
}

function getTransferVehicleImageUrl(args: {
  item: Record<string, unknown>;
  vehicle: Record<string, unknown>;
  content: Record<string, unknown>;
  factsheet: Record<string, unknown>;
  detailInfo: Record<string, unknown>;
}) {
  return (
    findImageUrlInObject(args.vehicle) ||
    findImageUrlInObject(args.content) ||
    findImageUrlInObject(args.factsheet) ||
    findImageUrlInObject(args.detailInfo) ||
    findImageUrlInObject(args.item)
  );
}

function mapCancellationPolicies(value: unknown) {
  return asArray(value).map((policy) => {
    const item = asRecord(policy);

    return {
      from: getFirstString(item.from, item.dateFrom, item.startDate),
      amount: getFirstNumber(item.amount, item.value, item.price),
      currency: getFirstString(item.currency, item.currencyId),
      description: getFirstString(item.description, item.text),
      metadata: item,
    };
  });
}

function mapOptionalExtras(value: unknown): TransferOptionalExtra[] {
  return asArray(value).map((extra) => {
    const item = asRecord(extra);
    const price = asRecord(item.price);

    return {
      code: getFirstString(item.code, item.id) || "",
      name: getFirstString(item.name, item.description),
      description: getFirstString(item.description, item.text),
      units: getFirstNumber(item.units, item.quantity),
      mandatory: item.mandatory === true,
      price:
        Object.keys(price).length > 0
          ? {
              amount: getFirstNumber(price.amount, price.totalAmount, price.netAmount) || 0,
              currency: getFirstString(price.currency, price.currencyId) || "",
              metadata: price,
            }
          : undefined,
      metadata: item,
    };
  });
}

function getCheckPickupInfo(value: unknown) {
  const item = asRecord(value);
  const pickupInformation = asRecord(item.pickupInformation);
  const pickup = asRecord(pickupInformation.pickup);
  const checkPickup = asRecord(pickup.checkPickup);
  const mustCheckPickupTime =
    checkPickup.mustCheckPickupTime === true || findBooleanKey(item, "mustCheckPickupTime");

  return {
    mustCheckPickupTime,
    checkPickup: {
      url: getFirstString(checkPickup.url),
      hoursBeforeConsulting: getFirstNumber(checkPickup.hoursBeforeConsulting),
      description: getFirstString(pickup.description),
      metadata: checkPickup,
    },
  };
}

function findBooleanKey(value: unknown, key: string, depth = 0): boolean {
  if (depth > 5 || !value || typeof value !== "object") return false;
  const record = asRecord(value);

  if (record[key] === true) return true;

  return Object.values(record).some((item) => findBooleanKey(item, key, depth + 1));
}

function mapTransferOption(
  service: unknown,
  request: TransferSearchRequest,
  index: number,
) {
  const item = asRecord(service);
  const vehicle = asRecord(item.vehicle);
  const price = asRecord(item.price);
  const detailInfo = asRecord(item.transferDetailInfo);
  const factsheet = asRecord(item.transferFactsheet);
  const content = asRecord(item.content);
  const category = asRecord(item.category);
  const transferType = asRecord(item.transferType);
  const pickup = asRecord(item.pickupInformation);
  const dropoff = asRecord(item.dropoffInformation);
  const pickupFrom = asRecord(pickup.from);
  const pickupTo = asRecord(pickup.to);
  const checkPickupInfo = getCheckPickupInfo(item);
  const imageUrl = getTransferVehicleImageUrl({
    item,
    vehicle,
    content,
    factsheet,
    detailInfo,
  });

  const rateKey = getFirstString(item.rateKey, item.id);
  const vehicleName =
    getFirstString(vehicle.name, vehicle.description, content.name, item.name) ||
    "Hotelbeds Transfer";
  const vehicleType =
    getFirstString(vehicle.type, transferType.code, transferType.name, category.name) ||
    "transfer";
  const amount =
    getFirstNumber(
      price.totalAmount,
      price.netAmount,
      price.amount,
      item.totalAmount,
    ) ?? 0;
  const currency = getFirstString(price.currencyId, price.currency, item.currency) || "";

  return {
    id: rateKey || `hotelbeds-transfer-${index + 1}`,
    supplier: "hotelbeds-transfers" as const,
    pickup: {
      ...request.pickup,
      name:
        getFirstString(pickupFrom.description, pickup.name, request.pickup.name) ||
        request.pickup.code ||
        "",
    },
    dropoff: {
      ...request.dropoff,
      name:
        getFirstString(pickupTo.description, dropoff.name, request.dropoff.name) ||
        request.dropoff.code ||
        "",
    },
    pickupDateTime: request.pickupDateTime,
    vehicle: {
      type: vehicleType,
      name: vehicleName,
      maxPassengers: getFirstNumber(
        detailInfo.maximumPaxCapacity,
        detailInfo.maxPaxCapacity,
        item.maximumPaxCapacity,
      ),
      maxBags: getFirstNumber(
        detailInfo.maximumLuggageCapacity,
        detailInfo.maxLuggageCapacity,
        item.maximumLuggageCapacity,
      ),
      description: getFirstString(
        content.description,
        factsheet.description,
        item.description,
      ),
      imageUrl,
      metadata: { vehicle, transferType, category, detailInfo, imageUrl },
    },
    price: {
      amount,
      currency,
      net: getFirstNumber(price.netAmount, price.net),
      taxes: getFirstNumber(price.taxes, price.tax),
      fees: getFirstNumber(price.fees, price.fee),
      metadata: price,
    },
    cancellationPolicies: mapCancellationPolicies(
      item.cancellationPolicies || item.cancelPolicies,
    ),
    optionalExtras: mapOptionalExtras(item.extras || item.optionalExtras),
    mustCheckPickupTime: checkPickupInfo.mustCheckPickupTime,
    checkPickup: checkPickupInfo.checkPickup,
    rateKey,
    available: true,
    metadata: item,
  };
}

function mapAvailabilityResponse(
  payload: unknown,
  request: TransferSearchRequest,
): TransferSearchResponse {
  const data = asRecord(payload);
  const services = asArray(data.services || data.transferServices || data.results);

  return {
    supplier: "hotelbeds-transfers",
    enabled: true,
    options: services.map((service, index) =>
      mapTransferOption(service, request, index),
    ),
    rawSupplierRequest: request,
    rawSupplierResponse: payload,
  };
}

function isPassengerArray(
  value: TransferBookingRequest["passengers"],
): value is TransferBookingPassenger[] {
  return Array.isArray(value);
}

function normalizeHolder(request: TransferBookingRequest): TransferBookingHolder {
  if (request.holder) return request.holder;

  const leadPassenger = request.leadPassenger;

  return {
    name: leadPassenger?.firstName || "TEST",
    surname: leadPassenger?.lastName || "CERTIFICATION",
    email: leadPassenger?.email,
    phone: leadPassenger?.phone,
  };
}

function normalizeBookingPassengers(
  request: TransferBookingRequest,
): TransferBookingPassenger[] {
  if (isPassengerArray(request.passengers)) {
    return request.passengers;
  }

  const leadPassenger = request.leadPassenger;

  return [
    {
      title: leadPassenger?.title || "Mr",
      name: leadPassenger?.firstName || request.holder?.name || "TEST",
      surname: leadPassenger?.lastName || request.holder?.surname || "CERTIFICATION",
      age: 30,
      type: "AD",
    },
  ];
}

function normalizeBookingServices(
  request: TransferBookingRequest,
): TransferBookingService[] {
  if (request.services?.length) return request.services;

  if (!request.rateKey) {
    throw new HotelbedsTransfersClientError(
      "rateKey or services are required for transfers booking.",
      "HOTELBEDS_TRANSFERS_REQUEST_FAILED",
      400,
    );
  }

  return [
    {
      rateKey: request.rateKey,
      transferDetails: asArray(request.metadata?.transferDetails) as Array<
        Record<string, unknown>
      >,
      extras: asArray(request.metadata?.extras) as TransferOptionalExtra[],
    },
  ];
}

function toHotelbedsBookingExtra(extra: TransferOptionalExtra) {
  return {
    code: extra.code,
    units: extra.units || 1,
  };
}

function createHotelbedsBookingPayload(request: TransferBookingRequest) {
  const holder = normalizeHolder(request);
  const passengers = normalizeBookingPassengers(request);
  const services = normalizeBookingServices(request);

  return {
    language: request.language || DEFAULT_LANGUAGE,
    clientReference: (request.clientReference || `HOTLENO-${Date.now()}`).slice(0, 20),
    holder,
    transfers: services.map((service) => ({
      rateKey: service.rateKey,
      transferDetails: service.transferDetails || [],
      ...((service.extras || []).length > 0
        ? { extras: (service.extras || []).map(toHotelbedsBookingExtra) }
        : {}),
    })),
    passengers,
    remark:
      getFirstString(request.metadata?.remark) ||
      "Hotelbeds Transfers test booking.",
  };
}

function extractBookingReference(payload: unknown) {
  const record = asRecord(payload);
  const booking = asRecord(record.booking || asArray(record.bookings)[0]);

  return getFirstString(
    record.reference,
    record.bookingReference,
    record.bookingReferenceId,
    booking.reference,
    booking.bookingReference,
    booking.bookingReferenceId,
  );
}

function extractBookingStatus(payload: unknown): "confirmed" | "pending" | "failed" {
  const record = asRecord(payload);
  const booking = asRecord(record.booking || asArray(record.bookings)[0]);
  const status = getFirstString(record.status, booking.status)?.toLowerCase();

  if (status?.includes("confirm") || status === "booked") return "confirmed";
  if (status?.includes("pending")) return "pending";

  return "confirmed";
}

function getFirstTransferFromPayload(payload: unknown) {
  const record = asRecord(payload);
  const booking = asRecord(record.booking || asArray(record.bookings)[0]);
  return asRecord(asArray(record.transfers || booking.transfers || booking.services)[0]);
}

function mapLocationFromPickupInfo(value: unknown, key: "from" | "to"): TransferLocation | undefined {
  const pickupInformation = asRecord(value);
  const location = asRecord(pickupInformation[key]);
  const code = getFirstString(location.code);

  if (!code) return undefined;

  return {
    code,
    name: getFirstString(location.description, location.name) || code,
    codeType: getFirstString(location.type, location.typeEnum) as TransferLocation["codeType"],
    metadata: location,
  };
}

export function mapVoucherData(
  payload: unknown,
  request?: TransferBookingRequest,
): TransferVoucher {
  const reference = extractBookingReference(payload);
  const record = asRecord(payload);
  const booking = asRecord(record.booking || asArray(record.bookings)[0]);
  const transfer = getFirstTransferFromPayload(payload);
  const pickupInformation = asRecord(transfer.pickupInformation);
  const vehicle = asRecord(transfer.vehicle);
  const category = asRecord(transfer.category);
  const content = asRecord(transfer.content);
  const checkPickupInfo = getCheckPickupInfo(transfer);

  return {
    supplier: "hotelbeds-transfers",
    bookingReference: reference,
    clientReference: getFirstString(record.clientReference, booking.clientReference),
    confirmationDate: getFirstString(record.creationDate, booking.creationDate),
    serviceName:
      getFirstString(transfer.name, vehicle.name, content.name) ||
      "Hotelbeds Transfers service",
    vehicleName: getFirstString(vehicle.name),
    vehicleType: getFirstString(category.name, transfer.transferType),
    pickup: mapLocationFromPickupInfo(pickupInformation, "from"),
    dropoff: mapLocationFromPickupInfo(pickupInformation, "to"),
    pickupDateTime: getFirstString(pickupInformation.date, transfer.pickupDateTime),
    pickupTime: getFirstString(pickupInformation.time, transfer.pickupTime),
    mustCheckPickupTime: checkPickupInfo.mustCheckPickupTime,
    checkPickupInfo: checkPickupInfo.checkPickup.description,
    meetingPoint: getFirstString(asRecord(pickupInformation.pickup).description),
    holder: request ? normalizeHolder(request) : undefined,
    passengers: request ? normalizeBookingPassengers(request) : undefined,
    optionalExtras: mapOptionalExtras(transfer.extras || request?.services?.[0]?.extras),
    cancellationPolicies: mapCancellationPolicies(
      transfer.cancellationPolicies || transfer.cancelPolicies,
    ),
    paymentNote: "Booked and paid by HBX Group",
    raw: payload,
  };
}

export function mapBookingResponse(
  payload: unknown,
  request?: TransferBookingRequest,
): TransferBookingResponse {
  const reference = extractBookingReference(payload);

  return {
    supplier: "hotelbeds-transfers",
    status: reference ? extractBookingStatus(payload) : "failed",
    bookingReference: reference,
    clientReference: request?.clientReference,
    voucher: mapVoucherData(payload, request),
    rawSupplierRequest: request,
    rawSupplierResponse: payload,
  };
}

function mapCancellationResponse(
  payload: unknown,
  request: TransferCancellationRequest,
): TransferCancellationResponse {
  return {
    supplier: "hotelbeds-transfers",
    status: "cancelled",
    bookingReference: request.bookingReference,
    rawSupplierRequest: request,
    rawSupplierResponse: payload,
  };
}

function countTransferItems(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  const data = asRecord(payload);

  for (const key of [
    "destinations",
    "terminals",
    "hotels",
    "locations",
    "items",
    "results",
  ]) {
    const value = data[key];
    if (Array.isArray(value)) return value.length;
  }

  return 0;
}

function normalizeSearchText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getLocalizedName(value: unknown) {
  if (typeof value === "string") return value;

  const record = asRecord(value);

  return getFirstString(
    record.content,
    record.description,
    record.name,
    record.value,
    record.text,
  );
}

function getCodeTypeForTerminal(item: Record<string, unknown>) {
  const content = asRecord(item.content);
  const type = normalizeSearchText(
    item.type ||
      item.subType ||
      item.terminalType ||
      item.transportType ||
      content.type,
  );

  if (type.includes("port") || type === "p") return "PORT";
  if (type.includes("station") || type === "s") return "STATION";
  return "IATA";
}

function getTerminalSubType(item: Record<string, unknown>) {
  const content = asRecord(item.content);
  const type = normalizeSearchText(
    item.subType ||
      item.type ||
      item.terminalType ||
      item.transportType ||
      content.type,
  );

  if (type === "a" || type.includes("airport")) return "airport";
  if (type === "p" || type.includes("port")) return "port";
  if (type === "s" || type.includes("station")) return "station";
  return "other";
}

type TransferCacheLocationSource = "terminal" | "hotel" | "destination";

function getLocationCandidates(
  payload: unknown,
  source: TransferCacheLocationSource,
) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const data = asRecord(payload);
  const key =
    source === "terminal"
      ? "terminals"
      : source === "hotel"
        ? "hotels"
        : "destinations";
  const primary = asArray(data[key]);
  if (primary.length > 0) return primary;

  return asArray(data.locations || data.items || data.results);
}

function filterTransferLocations(
  payload: unknown,
  query: string,
  source: TransferCacheLocationSource,
) {
  const normalizedQuery = normalizeSearchText(query);
  const items = getLocationCandidates(payload, source);

  return items
    .map((item) => {
      const record = asRecord(item);
      const content = asRecord(record.content);
      const country = asRecord(record.country);
      const destination = asRecord(record.destination);
      const city = asRecord(record.city);

      const name =
        getLocalizedName(record.name) ||
        getLocalizedName(record.description) ||
        getLocalizedName(record.content) ||
        getLocalizedName(content.description) ||
        getFirstString(record.code) ||
        "";

      const code =
        getFirstString(
          record.code,
          record.hotelCode,
          record.iata,
          record.id,
          record.destinationCode,
        ) || "";

      const countryCode = getFirstString(
        record.countryCode,
        country.code,
        country.isoCode,
      );

      const destinationCode = getFirstString(
        record.destinationCode,
        destination.code,
        city.code,
      );

      const cityName = getLocalizedName(city.name);
      const countryName = getLocalizedName(country.name);

      const haystack = [
        name,
        code,
        countryCode,
        destinationCode,
        cityName,
        countryName,
        getLocalizedName(content.description),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!name || !code || !haystack.includes(normalizedQuery)) {
        return null;
      }

      const terminalSubType = getTerminalSubType(record);

      return {
        code,
        name,
        type:
          source === "terminal"
            ? terminalSubType
            : source === "hotel"
              ? "hotel"
              : "other",
        codeType: source === "terminal" ? getCodeTypeForTerminal(record) : "ATLAS",
        subType:
          source === "terminal"
            ? terminalSubType
            : source === "hotel"
              ? "hotel"
              : "destination",
        countryCode,
        destinationCode,
        metadata: record,
      } satisfies TransferLocationSearchResponse["locations"][number];
    })
    .filter(Boolean) as TransferLocation[];
}

function looksLikeTransferCode(query: string) {
  return /^[A-Za-z0-9]{2,5}$/.test(query.trim());
}

function toUpperCode(query: string) {
  return query.trim().toUpperCase();
}

export class HotelbedsTransfersClient {
  private readonly baseUrl: string;
  private readonly cacheBaseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: HotelbedsTransfersClientOptions = {}) {
    this.baseUrl = options.baseUrl || getHotelbedsTransfersBaseUrl();
    this.cacheBaseUrl =
      options.cacheBaseUrl || getHotelbedsTransfersCacheBaseUrl();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async getCache(path: string, query?: HotelbedsTransfersCacheQuery) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL(joinBaseUrlAndPath(this.cacheBaseUrl, path));

      for (const [key, value] of Object.entries(query || {})) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
      }

      const response = await fetch(url, {
        method: "GET",
        headers: createHotelbedsTransfersHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await readSafeErrorDetails(response);
        logTransfersRequest({
          operation: "transfersCache",
          endpoint: path,
          status: response.status,
          enabled: true,
          message: details ? details.slice(0, 120) : undefined,
        });

        throw new HotelbedsTransfersClientError(
          `Hotelbeds Transfers Cache request failed at ${path} with status ${response.status}. ${details || ""}`.trim(),
          "HOTELBEDS_TRANSFERS_REQUEST_FAILED",
          response.status,
        );
      }

      const payload = await parseJsonResponse(response);
      logTransfersRequest({
        operation: "transfersCache",
        endpoint: path,
        status: response.status,
        enabled: true,
        optionCount: countTransferItems(payload),
      });

      return payload;
    } catch (error) {
      throw toTransfersError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestTransfersApi(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(joinBaseUrlAndPath(this.baseUrl, path), {
        method,
        headers: createHotelbedsTransfersHeaders(),
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await readSafeErrorDetails(response);

        logTransfersRequest({
          operation: "transfersBookingApi",
          endpoint: path,
          status: response.status,
          enabled: true,
          message: details ? details.slice(0, 160) : undefined,
        });

        throw new HotelbedsTransfersClientError(
          details || `Hotelbeds Transfers request failed with status ${response.status}.`,
          "HOTELBEDS_TRANSFERS_REQUEST_FAILED",
          response.status,
        );
      }

      const payload = await parseJsonResponse(response);

      logTransfersRequest({
        operation: "transfersBookingApi",
        endpoint: path,
        status: response.status,
        enabled: true,
      });

      return payload;
    } catch (error) {
      throw toTransfersError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestDisabledUntilEndpointMapping<T>(
    operation: string,
    requestBody: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      createHotelbedsTransfersHeaders();

      logTransfersRequest({
        operation,
        enabled: true,
        message: NOT_CONNECTED_MESSAGE,
      });

      void this.baseUrl;
      void requestBody;

      throw new HotelbedsTransfersClientError(
        NOT_CONNECTED_MESSAGE,
        "HOTELBEDS_TRANSFERS_NOT_CONNECTED",
        501,
      );
    } catch (error) {
      throw toTransfersError(error);
    } finally {
      controller.abort();
      clearTimeout(timeout);
    }
  }

  async searchTransfers(
    request: TransferSearchRequest,
  ): Promise<TransferSearchResponse> {
    if (!isHotelbedsTransfersSearchEnabled()) {
      logTransfersRequest({
        operation: "searchTransfers",
        enabled: false,
        message: DISABLED_SEARCH_MESSAGE,
      });

      return disabledSearchResponse(request);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const pickup = requireLocationCode(request.pickup, "pickup");
      const dropoff = requireLocationCode(request.dropoff, "dropoff");
      const language = (request.language || DEFAULT_LANGUAGE).toLowerCase();
      const adults = Math.max(1, Number(request.passengers.adults || 1));
      const children = Math.max(0, Number(request.passengers.children || 0));
      const infants = Math.max(0, Number(request.passengers.infants || 0));
      const outbound = toHotelbedsDateTime(request.pickupDateTime);

      const path = [
        "availability",
        language,
        "from",
        pickup.codeType,
        pickup.code,
        "to",
        dropoff.codeType,
        dropoff.code,
        outbound,
        adults,
        children,
        infants,
      ]
        .map(encodePathSegment)
        .join("/");

      const url = joinBaseUrlAndPath(this.baseUrl, path);

      const response = await fetch(url, {
        method: "GET",
        headers: createHotelbedsTransfersHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await readSafeErrorDetails(response);

        logTransfersRequest({
          operation: "searchTransfers",
          endpoint:
            "/availability/{language}/from/{fromType}/{fromCode}/to/{toType}/{toCode}/{outbound}/{adults}/{children}/{infants}",
          status: response.status,
          enabled: true,
          message: details ? details.slice(0, 120) : undefined,
        });

        throw new HotelbedsTransfersClientError(
          `Hotelbeds Transfers search failed with status ${response.status}.`,
          "HOTELBEDS_TRANSFERS_REQUEST_FAILED",
          response.status,
        );
      }

      const payload = await parseJsonResponse(response);
      const result = mapAvailabilityResponse(payload, request);

      logTransfersRequest({
        operation: "searchTransfers",
        endpoint: "/availability/simple",
        status: response.status,
        enabled: true,
        optionCount: result.options.length,
      });

      return result;
    } catch (error) {
      throw toTransfersError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  async rateCheck(
    request: TransferRateCheckRequest,
  ): Promise<TransferRateCheckResponse> {
    if (!isHotelbedsTransfersSearchEnabled()) {
      logTransfersRequest({
        operation: "rateCheck",
        enabled: false,
        message: DISABLED_SEARCH_MESSAGE,
      });

      return disabledRateResponse(request);
    }

    return this.requestDisabledUntilEndpointMapping("rateCheck", request);
  }

  async checkTransferRate(
    request: TransferRateCheckRequest,
  ): Promise<TransferRateCheckResponse> {
    return this.rateCheck(request);
  }

  async bookTransfer(
    request: TransferBookingRequest,
  ): Promise<TransferBookingResponse> {
    if (!isHotelbedsTransfersBookingEnabled()) {
      logTransfersRequest({
        operation: "bookTransfer",
        enabled: false,
        message: DISABLED_BOOKING_MESSAGE,
      });

      return disabledBookingResponse(request);
    }

    const payload = createHotelbedsBookingPayload(request);
    const response = await this.requestTransfersApi("POST", "bookings", payload);

    return mapBookingResponse(response, request);
  }

  async getTransferBookingDetails(
    request: TransferBookingDetailsRequest,
  ): Promise<TransferBookingResponse> {
    if (!isHotelbedsTransfersBookingEnabled()) {
      return {
        supplier: "hotelbeds-transfers",
        status: "disabled",
        bookingReference: request.bookingReference,
        message: DISABLED_BOOKING_MESSAGE,
        rawSupplierRequest: request,
      };
    }

    const language = getFirstString(request.metadata?.language) || DEFAULT_LANGUAGE;
    const response = await this.requestTransfersApi(
      "GET",
      ["bookings", language, "reference", request.bookingReference]
        .map(encodePathSegment)
        .join("/"),
    );

    return mapBookingResponse(response, {
      clientReference: getFirstString(request.metadata?.clientReference),
      holder: request.metadata?.holder as TransferBookingHolder | undefined,
      passengers: request.metadata?.passengers as TransferBookingRequest["passengers"],
      services: request.metadata?.services as TransferBookingService[] | undefined,
    });
  }

  async cancelTransferBooking(
    request: TransferCancellationRequest,
  ): Promise<TransferCancellationResponse> {
    if (!isHotelbedsTransfersBookingEnabled()) {
      logTransfersRequest({
        operation: "cancelTransferBooking",
        enabled: false,
        message: DISABLED_BOOKING_MESSAGE,
      });

      return disabledCancellationResponse(request);
    }

    const language = getFirstString(request.metadata?.language) || DEFAULT_LANGUAGE;
    const response = await this.requestTransfersApi(
      "DELETE",
      ["bookings", language, "reference", request.bookingReference]
        .map(encodePathSegment)
        .join("/"),
    );

    return mapCancellationResponse(response, request);
  }

  async getTransferLocations(
    request: TransferLocationSearchRequest,
  ): Promise<TransferLocationSearchResponse> {
    if (!isHotelbedsTransfersSearchEnabled()) {
      logTransfersRequest({
        operation: "getTransferLocations",
        enabled: false,
        message: DISABLED_SEARCH_MESSAGE,
      });

      return disabledLocationResponse(request);
    }

    const [terminals, hotels, destinations] = await Promise.all([
      this.searchTransferTerminals(request),
      this.searchTransferHotels(request),
      this.searchTransferDestinations(request),
    ]);

    return {
      supplier: "hotelbeds-transfers",
      enabled: true,
      locations: [
        ...terminals.locations,
        ...hotels.locations,
        ...destinations.locations,
      ].slice(0, request.limit || 20),
      rawSupplierRequest: request,
      rawSupplierResponse: {
        terminals: terminals.rawSupplierResponse,
        hotels: hotels.rawSupplierResponse,
        destinations: destinations.rawSupplierResponse,
      },
    };
  }

  getTransferDestinations(query?: HotelbedsTransfersCacheQuery) {
    return this.getCache("/locations/destinations", query);
  }

  getTransferTerminals(query?: HotelbedsTransfersCacheQuery) {
    return this.getCache("/locations/terminals", query);
  }

  getTransferHotels(query?: HotelbedsTransfersCacheQuery) {
    return this.getCache("/hotels", query);
  }

  async searchTransferDestinations(
    request: TransferLocationSearchRequest,
  ): Promise<TransferLocationSearchResponse> {
    const limit = Math.min(Math.max(request.limit || 20, 1), 20);
    const query = request.query.trim();
    const isCode = looksLikeTransferCode(query);

    const payload = await this.getTransferDestinations({
      fields: "ALL",
      language: request.language || DEFAULT_LANGUAGE,
      offset: isCode ? undefined : 0,
      limit: isCode ? undefined : limit,
      codes: isCode ? toUpperCode(query) : undefined,
    });

    return {
      supplier: "hotelbeds-transfers",
      enabled: true,
      locations: filterTransferLocations(payload, request.query, "destination").slice(
        0,
        limit,
      ),
      rawSupplierRequest: request,
      rawSupplierResponse: payload,
    };
  }

  async searchTransferTerminals(
    request: TransferLocationSearchRequest,
  ): Promise<TransferLocationSearchResponse> {
    const limit = Math.min(Math.max(request.limit || 20, 1), 20);
    const query = request.query.trim();
    const isCode = looksLikeTransferCode(query);

    const payload = await this.getTransferTerminals({
      fields: "ALL",
      language: request.language || DEFAULT_LANGUAGE,
      offset: isCode ? undefined : 0,
      limit: isCode ? undefined : limit,
      codes: isCode ? toUpperCode(query) : undefined,
    });

    return {
      supplier: "hotelbeds-transfers",
      enabled: true,
      locations: filterTransferLocations(payload, request.query, "terminal").slice(
        0,
        limit,
      ),
      rawSupplierRequest: request,
      rawSupplierResponse: payload,
    };
  }

  async searchTransferHotels(
    request: TransferLocationSearchRequest,
  ): Promise<TransferLocationSearchResponse> {
    const limit = Math.min(Math.max(request.limit || 20, 1), 20);
    const query = request.query.trim();
    const isCode = looksLikeTransferCode(query);

    const payload = await this.getTransferHotels({
      fields: "ALL",
      language: request.language || DEFAULT_LANGUAGE,
      offset: 0,
      limit,
      destinationCodes: isCode ? toUpperCode(query) : undefined,
    });

    return {
      supplier: "hotelbeds-transfers",
      enabled: true,
      locations: filterTransferLocations(payload, request.query, "hotel").slice(
        0,
        limit,
      ),
      rawSupplierRequest: request,
      rawSupplierResponse: payload,
    };
  }
}

export function createHotelbedsTransfersClient(
  options?: HotelbedsTransfersClientOptions,
) {
  return new HotelbedsTransfersClient(options);
}
