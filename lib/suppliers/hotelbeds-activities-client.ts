import {
  createHotelbedsActivitiesHeaders,
  getHotelbedsActivitiesBaseUrl,
  getHotelbedsActivitiesContentBaseUrl,
  HotelbedsActivitiesCredentialsError,
  isHotelbedsActivitiesBookingEnabled,
  isHotelbedsActivitiesSearchEnabled,
} from "./hotelbeds-activities-auth";
import type {
  ActivityAnswer,
  ActivityBookingDetailsRequest,
  ActivityBookingRequest,
  ActivityBookingResponse,
  ActivityCancelRequest,
  ActivityCancellationPolicy,
  ActivityDetailsRequest,
  ActivityDetailsResponse,
  ActivityDestinationSuggestion,
  ActivityModality,
  ActivityOption,
  ActivityQuestion,
  ActivitySearchRequest,
  ActivitySearchResponse,
  ActivitySession,
  ActivityVoucher,
  ActivityVoucherFile,
} from "@/types/activities";

const DEFAULT_TIMEOUT_MS = 18_000;
const DEFAULT_IMAGE_BASE_URL = "https://media.activitiesbank.com";
const DEFAULT_LANGUAGE = "en";
const DISABLED_BOOKING_MESSAGE =
  "Hotelbeds Activities booking is disabled in this environment.";

export type HotelbedsActivitiesClientOptions = {
  baseUrl?: string;
  contentBaseUrl?: string;
  timeoutMs?: number;
};

export type HotelbedsActivitiesErrorCode =
  | "HOTELBEDS_ACTIVITIES_MISSING_CREDENTIALS"
  | "HOTELBEDS_ACTIVITIES_DISABLED"
  | "HOTELBEDS_ACTIVITIES_INVALID_RESPONSE"
  | "HOTELBEDS_ACTIVITIES_TIMEOUT"
  | "HOTELBEDS_ACTIVITIES_NETWORK_ERROR"
  | "HOTELBEDS_ACTIVITIES_REQUEST_FAILED";

export class HotelbedsActivitiesClientError extends Error {
  readonly code: HotelbedsActivitiesErrorCode;
  readonly status?: number;

  constructor(
    message: string,
    code: HotelbedsActivitiesErrorCode,
    status?: number,
  ) {
    super(message);
    this.name = "HotelbedsActivitiesClientError";
    this.code = code;
    this.status = status;
  }
}

function joinBaseUrlAndPath(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function logActivitiesRequest(args: {
  operation: string;
  endpoint: string;
  status?: number;
  itemCount?: number;
  reason?: string;
}) {
  if (process.env.NODE_ENV === "production") return;

  console.info("[Hotelbeds Activities API]", {
    operation: args.operation,
    endpoint: args.endpoint,
    status: args.status,
    itemCount: args.itemCount,
    reason: args.reason,
  });
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
    if (text && text.trim()) return text.trim();
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

function getLocalizedText(value: unknown) {
  if (typeof value === "string") return value;

  const record = asRecord(value);

  return getFirstString(
    record.value,
    record.text,
    record.name,
    record.description,
    record.content,
  );
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HotelbedsActivitiesClientError(
      "Hotelbeds Activities returned a non-JSON response.",
      "HOTELBEDS_ACTIVITIES_INVALID_RESPONSE",
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

function toActivitiesError(error: unknown): HotelbedsActivitiesClientError {
  if (error instanceof HotelbedsActivitiesClientError) return error;

  if (error instanceof HotelbedsActivitiesCredentialsError) {
    return new HotelbedsActivitiesClientError(
      error.message,
      "HOTELBEDS_ACTIVITIES_MISSING_CREDENTIALS",
    );
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new HotelbedsActivitiesClientError(
      "Hotelbeds Activities request timed out.",
      "HOTELBEDS_ACTIVITIES_TIMEOUT",
    );
  }

  if (error instanceof TypeError) {
    return new HotelbedsActivitiesClientError(
      "Hotelbeds Activities network request failed.",
      "HOTELBEDS_ACTIVITIES_NETWORK_ERROR",
    );
  }

  return new HotelbedsActivitiesClientError(
    error instanceof Error ? error.message : "Hotelbeds Activities request failed.",
    "HOTELBEDS_ACTIVITIES_REQUEST_FAILED",
  );
}

function appendQuery(url: URL, query: Record<string, unknown> = {}) {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
}

function countActivityItems(payload: unknown) {
  if (Array.isArray(payload)) return payload.length;

  const data = asRecord(payload);
  const country = asRecord(data.country);

  for (const key of [
    "activities",
    "activity",
    "destinations",
    "countries",
    "items",
    "results",
  ]) {
    const value = data[key];
    if (Array.isArray(value)) return value.length;
  }

  if (Array.isArray(country.destinations)) return country.destinations.length;

  return 0;
}

function buildAvailabilityBody(request: ActivitySearchRequest) {
  return {
    filters: [
      {
        searchFilterItems: [
          {
            type: "destination",
            value: request.destinationCode,
          },
        ],
      },
    ],
    from: request.from,
    to: request.to,
    paxes: [
      ...Array.from({ length: Math.max(1, request.adults || 1) }, () => ({
        age: 30,
      })),
      ...(request.childrenAges || []).map((age) => ({ age })),
    ],
    language: request.language || DEFAULT_LANGUAGE,
    pagination: request.pagination || {
      itemsPerPage: 20,
      page: 1,
    },
    order: "DEFAULT",
  };
}

function normalizeImageUrl(value: string) {
  const image = value.trim();

  if (!image) return undefined;
  if (image === "image/jpeg" || image === "image/png" || image === "image/webp") {
    return undefined;
  }

  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("//")) return `https:${image}`;

  if (!/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(image)) {
    return undefined;
  }

  return `${DEFAULT_IMAGE_BASE_URL}/${image.replace(/^\/+/, "")}`;
}

function pickBestImageUrlFromUrls(urls: unknown[]) {
  const preferredSizes = ["XLARGE", "LARGE2", "RAW", "LARGE", "MEDIUM", "SMALL"];

  for (const size of preferredSizes) {
    const match = urls
      .map(asRecord)
      .find((url) => getFirstString(url.sizeType)?.toUpperCase() === size);

    const resource = normalizeImageUrl(getFirstString(match?.resource, match?.url) || "");
    if (resource) return resource;
  }

  for (const url of urls) {
    const record = asRecord(url);
    const resource = normalizeImageUrl(getFirstString(record.resource, record.url) || "");
    if (resource) return resource;
  }

  return undefined;
}

function findImageCandidate(value: unknown, depth = 0): string | undefined {
  if (depth > 6 || !value) return undefined;

  if (typeof value === "string") {
    return normalizeImageUrl(value);
  }

  if (Array.isArray(value)) {
    const fromUrls = pickBestImageUrlFromUrls(value);
    if (fromUrls) return fromUrls;

    for (const item of value) {
      const found = findImageCandidate(item, depth + 1);
      if (found) return found;
    }

    return undefined;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    const urls = asArray(record.urls);
    if (urls.length > 0) {
      const fromUrls = pickBestImageUrlFromUrls(urls);
      if (fromUrls) return fromUrls;
    }

    for (const key of [
      "resource",
      "url",
      "imageUrl",
      "imagePath",
      "path",
      "filePath",
      "mainImage",
      "thumbnail",
      "bigImage",
      "image",
    ]) {
      const found = findImageCandidate(record[key], depth + 1);
      if (found) return found;
    }

    for (const key of ["images", "media", "pictures", "photos", "content"]) {
      const found = findImageCandidate(record[key], depth + 1);
      if (found) return found;
    }
  }

  return undefined;
}

export function findActivityImageUrl(activity: unknown) {
  const item = asRecord(activity);
  const content = asRecord(item.content);
  const media = asRecord(content.media);
  const firstModality = asRecord(asArray(item.modalities)[0]);

  const candidate = findImageCandidate([
    media.images,
    content.images,
    item.pictures,
    item.images,
    item.image,
    content.image,
    item.media,
    firstModality.images,
    media,
    content,
  ]);

  return candidate;
}

function getAmountsFrom(record: Record<string, unknown>) {
  const amountFrom = asArray(record.amountsFrom)[0];
  return asRecord(amountFrom);
}

function getFirstRateDetail(modalities: unknown[]) {
  for (const modality of modalities) {
    const modalityRecord = asRecord(modality);
    for (const rate of asArray(modalityRecord.rates)) {
      const rateRecord = asRecord(rate);
      const detail = asRecord(asArray(rateRecord.rateDetails)[0]);
      if (Object.keys(detail).length > 0) return detail;
    }
  }

  return {};
}

function findPrice(activity: Record<string, unknown>, modalities: unknown[]) {
  const activityAmount = getAmountsFrom(activity);
  const firstModality = asRecord(modalities[0]);
  const modalityAmount = getAmountsFrom(firstModality);
  const firstRateDetail = getFirstRateDetail(modalities);
  const totalAmount = asRecord(firstRateDetail.totalAmount);
  const directAmount = asRecord(firstRateDetail.amount);
  const paxAmount = asRecord(asArray(firstRateDetail.paxAmounts)[0]);

  return {
    amount:
      getFirstNumber(
        activityAmount.amount,
        activityAmount.value,
        modalityAmount.amount,
        modalityAmount.value,
        totalAmount.amount,
        totalAmount.value,
        directAmount.amount,
        directAmount.value,
        firstRateDetail.amount,
        paxAmount.amount,
      ) || 0,
    currency:
      getFirstString(
        activity.currency,
        activity.currencyCode,
        activity.currencyId,
        totalAmount.currency,
        totalAmount.currencyCode,
        totalAmount.currencyId,
        modalityAmount.currency,
        modalityAmount.currencyCode,
        modalityAmount.currencyId,
        activityAmount.currency,
        activityAmount.currencyCode,
        activityAmount.currencyId,
      ) || "",
  };
}

function getCancellationPolicies(modalities: unknown[]): ActivityCancellationPolicy[] {
  const policies: ActivityCancellationPolicy[] = [];

  for (const modality of modalities) {
    const modalityRecord = asRecord(modality);
    const rates = asArray(modalityRecord.rates);

    for (const rate of rates) {
      const rateRecord = asRecord(rate);

      for (const policy of asArray(
        rateRecord.cancellationPolicies || rateRecord.cancelPolicies,
      )) {
        const policyRecord = asRecord(policy);

        policies.push({
          from: getFirstString(policyRecord.dateFrom, policyRecord.from),
          amount: getFirstNumber(policyRecord.amount, policyRecord.value),
          currency: getFirstString(policyRecord.currency, policyRecord.currencyId),
          description: getFirstString(policyRecord.description, policyRecord.text),
          raw: policy,
        });
      }

      for (const rateDetail of asArray(rateRecord.rateDetails)) {
        const rateDetailRecord = asRecord(rateDetail);

        for (const operationDate of asArray(rateDetailRecord.operationDates)) {
          const operationDateRecord = asRecord(operationDate);

          for (const policy of asArray(operationDateRecord.cancellationPolicies)) {
            const policyRecord = asRecord(policy);

            policies.push({
              from: getFirstString(policyRecord.dateFrom, policyRecord.from),
              amount: getFirstNumber(policyRecord.amount, policyRecord.value),
              currency: getFirstString(
                policyRecord.currency,
                policyRecord.currencyId,
              ),
              description: getFirstString(policyRecord.description, policyRecord.text),
              raw: policy,
            });
          }
        }
      }
    }
  }

  return policies;
}

function getLanguages(activity: Record<string, unknown>, modalities: unknown[]) {
  const values = new Set<string>();

  for (const value of asArray(activity.languages)) {
    const record = asRecord(value);
    const text =
      getLocalizedText(value) ||
      getFirstString(record.description, record.name, record.code);
    if (text) values.add(text);
  }

  for (const modality of modalities) {
    const record = asRecord(modality);

    for (const value of asArray(record.languages || record.guideLanguages)) {
      const valueRecord = asRecord(value);
      const text =
        getLocalizedText(value) ||
        getFirstString(valueRecord.description, valueRecord.name, valueRecord.code);
      if (text) values.add(text);
    }

    for (const rate of asArray(record.rates)) {
      const rateRecord = asRecord(rate);

      for (const rateDetail of asArray(rateRecord.rateDetails)) {
        const rateDetailRecord = asRecord(rateDetail);

        for (const value of asArray(rateDetailRecord.languages)) {
          const valueRecord = asRecord(value);
          const text =
            getLocalizedText(value) ||
            getFirstString(
              valueRecord.description,
              valueRecord.name,
              valueRecord.code,
            );
          if (text) values.add(text);
        }
      }
    }
  }

  return [...values];
}

function formatDuration(value: unknown) {
  const record = asRecord(value);
  const durationValue = getFirstNumber(record.value);
  const metric = getFirstString(record.metric, record.unit);

  if (!durationValue || !metric) {
    return getFirstString(value);
  }

  const normalizedMetric = metric.toUpperCase();

  if (normalizedMetric.includes("HOUR")) {
    return `${durationValue} ${durationValue === 1 ? "hour" : "hours"}`;
  }

  if (normalizedMetric.includes("DAY")) {
    return `${durationValue} ${durationValue === 1 ? "day" : "days"}`;
  }

  if (normalizedMetric.includes("MIN")) {
    return `${durationValue} minutes`;
  }

  return `${durationValue} ${metric.toLowerCase()}`;
}

function getDuration(activity: Record<string, unknown>, modalities: unknown[]) {
  const content = asRecord(activity.content);
  const scheduling = asRecord(content.scheduling);
  const firstModality = asRecord(modalities[0]);
  const firstRateDetail = getFirstRateDetail(modalities);

  return getFirstString(
    formatDuration(firstRateDetail.minimumDuration),
    formatDuration(firstRateDetail.maximumDuration),
    formatDuration(firstModality.duration),
    formatDuration(activity.duration),
    formatDuration(content.duration),
    formatDuration(scheduling.duration),
  );
}

function getCategory(activity: Record<string, unknown>) {
  const content = asRecord(activity.content);
  const category = asRecord(activity.category || content.category);

  const directCategory = getLocalizedText(category.name) ||
    getFirstString(category.code, activity.type, content.activityFactsheetType);

  for (const group of asArray(content.segmentationGroups)) {
    const groupRecord = asRecord(group);
    const groupName = getFirstString(groupRecord.name, groupRecord.code);

    if (!groupName?.toLowerCase().includes("categor")) continue;

    const firstSegment = asRecord(asArray(groupRecord.segments)[0]);
    const segmentName = getFirstString(firstSegment.name, firstSegment.code);

    if (segmentName) return segmentName;
  }

  return directCategory;
}

function mapActivityOption(activity: unknown): ActivityOption {
  const item = asRecord(activity);
  const content = asRecord(item.content);
  const country = asRecord(item.country);
  const countries = asArray(content.countries);
  const firstContentCountry = asRecord(countries[0]);
  const destinations = asArray(
    country.destinations ||
      item.destinations ||
      firstContentCountry.destinations,
  );
  const destination = asRecord(destinations[0]);
  const modalities = asArray(item.modalities);
  const price = findPrice(item, modalities);
  const activityCode = getFirstString(item.activityCode, item.code, item.id) || "";
  const name =
    getLocalizedText(item.name) ||
    getLocalizedText(content.name) ||
    getFirstString(activityCode) ||
    "Hotelbeds Activity";

  return {
    id: activityCode || name,
    supplier: "hotelbeds-activities",
    activityCode,
    name,
    destinationName:
      getLocalizedText(destination.name) ||
      getFirstString(destination.code, item.destinationName) ||
      "",
    countryName:
      getLocalizedText(country.name) ||
      getLocalizedText(firstContentCountry.name) ||
      getFirstString(country.code, firstContentCountry.code, item.countryName) ||
      "",
    categoryName: getCategory(item),
    duration: getDuration(item, modalities),
    languages: getLanguages(item, modalities),
    imageUrl: findActivityImageUrl(activity),
    price,
    cancellationPolicies: getCancellationPolicies(modalities),
    modalities,
    raw: activity,
  };
}

function getActivitiesArray(payload: unknown) {
  if (Array.isArray(payload)) return payload;

  const data = asRecord(payload);
  return asArray(data.activities || data.activity || data.items || data.results);
}

function getBookingRecord(payload: unknown) {
  const data = asRecord(payload);
  return asRecord(data.booking || asArray(data.bookings)[0] || data);
}

function getBookingActivities(payload: unknown) {
  const booking = getBookingRecord(payload);
  return asArray(booking.activities || booking.activity || booking.items);
}

function getActivityDetailsRecord(payload: unknown) {
  const activities = getActivitiesArray(payload);
  return asRecord(activities[0] || asRecord(payload).activity || payload);
}

function mapQuestions(value: unknown): ActivityQuestion[] {
  return asArray(value).map((question) => {
    const record = asRecord(question);
    return {
      code: getFirstString(record.code, record.id, record.questionCode) || "",
      text:
        getLocalizedText(record.text) ||
        getLocalizedText(record.name) ||
        getFirstString(record.description),
      required:
        record.required === true ||
        record.mandatory === true ||
        getFirstString(record.required)?.toLowerCase() === "true",
      raw: question,
    };
  });
}

function mapSessions(value: unknown): ActivitySession[] {
  return asArray(value).map((session) => {
    const record = asRecord(session);
    return {
      code: getFirstString(record.code, record.id),
      name: getLocalizedText(record.name) || getFirstString(record.description),
      time: getFirstString(record.time, record.hour, record.startTime),
      raw: session,
    };
  });
}

function mapVoucherFiles(value: unknown): ActivityVoucherFile[] {
  return asArray(value).map((voucher) => {
    const record = asRecord(voucher);
    return {
      code: getFirstString(record.code, record.id),
      language: getFirstString(record.language, record.languageCode),
      url: getFirstString(record.url, record.href, record.resource),
      mimeType: getFirstString(record.mimeType, record.contentType),
      dateFrom: getFirstString(record.dateFrom, record.from),
      dateTo: getFirstString(record.dateTo, record.to),
    };
  });
}

function mapModalities(value: unknown): ActivityModality[] {
  return asArray(value).map((modality) => {
    const record = asRecord(modality);
    const price = findPrice(record, [record]);
    return {
      code: getFirstString(record.code, record.modalityCode, record.id),
      name:
        getLocalizedText(record.name) ||
        getFirstString(record.description, record.code),
      rates: asArray(record.rates),
      sessions: mapSessions(record.sessions || record.session),
      languages: getLanguages(record, [record]),
      questions: mapQuestions(record.questions || record.questionList),
      cancellationPolicies: getCancellationPolicies([record]),
      price,
      raw: modality,
    };
  });
}

function collectQuestionsFromModalities(modalities: ActivityModality[]) {
  return modalities.flatMap((modality) => modality.questions || []);
}

function collectSessionsFromModalities(modalities: ActivityModality[]) {
  return modalities.flatMap((modality) => modality.sessions || []);
}

function collectContractRemarks(activity: Record<string, unknown>, bookingActivity?: Record<string, unknown>) {
  const content = asRecord(activity.content);
  const comments = [
    ...asArray(activity.comments),
    ...asArray(content.comments),
    ...asArray(activity.contractRemarks),
    ...asArray(bookingActivity?.comments),
  ];

  return comments
    .map((comment) => {
      const record = asRecord(comment);
      return (
        getLocalizedText(comment) ||
        getFirstString(record.text, record.description, record.comment)
      );
    })
    .filter((item): item is string => Boolean(item));
}

function mapActivityDetailsResponse(
  payload: unknown,
  request: ActivityDetailsRequest,
): ActivityDetailsResponse {
  const activity = getActivityDetailsRecord(payload);
  const content = asRecord(activity.content);
  const modalities = mapModalities(activity.modalities);
  const option = mapActivityOption(activity);
  const questions = [
    ...mapQuestions(activity.questions || content.questions),
    ...collectQuestionsFromModalities(modalities),
  ];
  const sessions = [
    ...mapSessions(activity.sessions || content.sessions),
    ...collectSessionsFromModalities(modalities),
  ];

  return {
    supplier: "hotelbeds-activities",
    enabled: true,
    activityCode: option.activityCode || request.activityCode,
    name: option.name,
    description:
      getLocalizedText(content.description) ||
      getLocalizedText(activity.description) ||
      getFirstString(content.description),
    images: [findActivityImageUrl(activity)].filter((item): item is string =>
      Boolean(item),
    ),
    destinationName: option.destinationName,
    countryName: option.countryName,
    features: asArray(content.featureGroups || activity.features)
      .map((feature) => getLocalizedText(feature) || getFirstString(asRecord(feature).name))
      .filter((item): item is string => Boolean(item)),
    operationDates: asArray(activity.operationDates || content.operationDates),
    modalities,
    totalAmount: option.price.amount,
    currency: option.price.currency,
    cancellationPolicies: option.cancellationPolicies,
    questions,
    sessions,
    languages: option.languages,
    contractRemarks: collectContractRemarks(activity),
    routes: asArray(activity.routes || content.routes),
    rawSupplierRequest: request,
    rawSupplierResponse: payload,
  };
}

function buildDetailsBody(request: ActivityDetailsRequest) {
  return {
    code: request.activityCode,
    from: request.from,
    to: request.to,
    language: request.language || DEFAULT_LANGUAGE,
    paxes: request.paxes,
    ...(request.modalityCode ? { modalityCode: request.modalityCode } : {}),
    ...(request.destinationCode ? { destination: request.destinationCode } : {}),
    ...(request.rateKey ? { rateKey: request.rateKey } : {}),
  };
}

function buildBookingBody(request: ActivityBookingRequest) {
  return {
    language: request.language || DEFAULT_LANGUAGE,
    clientReference: request.clientReference,
    holder: request.holder,
    activities: request.activities.map((activity) => ({
      rateKey: activity.rateKey,
      ...(activity.from ? { from: activity.from } : {}),
      ...(activity.to ? { to: activity.to } : {}),
      ...(activity.session ? { session: activity.session } : {}),
      ...(activity.language ? { language: activity.language } : {}),
      ...(activity.paxes?.length ? { paxes: activity.paxes } : {}),
      ...(activity.answers?.length
        ? {
            answers: activity.answers.map((answer: ActivityAnswer) => ({
              question: {
                code: answer.question.code,
              },
              answer: answer.answer,
            })),
          }
        : {}),
      ...(activity.comments?.length ? { comments: activity.comments } : {}),
    })),
  };
}

function extractBookingReference(payload: unknown) {
  const booking = getBookingRecord(payload);
  return getFirstString(
    booking.reference,
    booking.bookingReference,
    booking.referenceNumber,
    asRecord(payload).reference,
  );
}

function extractBookingStatus(payload: unknown) {
  const booking = getBookingRecord(payload);
  const status = getFirstString(booking.status, asRecord(payload).status)?.toLowerCase();

  if (status?.includes("cancel")) return "cancelled";
  if (status?.includes("confirm")) return "confirmed";
  if (status?.includes("pending")) return "pending";
  if (status?.includes("fail")) return "failed";
  return extractBookingReference(payload) ? "confirmed" : "failed";
}

function mapActivityVoucher(payload: unknown, request?: ActivityBookingRequest): ActivityVoucher {
  const booking = getBookingRecord(payload);
  const bookingActivity = asRecord(getBookingActivities(payload)[0]);
  const activity = asRecord(bookingActivity.activity || bookingActivity);
  const modality = asRecord(bookingActivity.modality || asArray(bookingActivity.modalities)[0]);
  const holder = request?.holder || (booking.holder as ActivityBookingRequest["holder"]);
  const paxes =
    request?.activities?.[0]?.paxes ||
    (asArray(bookingActivity.paxes) as ActivityVoucher["paxes"]);

  return {
    supplier: "hotelbeds-activities",
    bookingReference: extractBookingReference(payload),
    clientReference: getFirstString(booking.clientReference, request?.clientReference),
    confirmationDate: getFirstString(booking.creationDate, booking.confirmationDate),
    activityName:
      getLocalizedText(activity.name) ||
      getLocalizedText(asRecord(activity.content).name) ||
      getFirstString(bookingActivity.name, activity.code),
    dateFrom: getFirstString(bookingActivity.dateFrom, bookingActivity.from),
    dateTo: getFirstString(bookingActivity.dateTo, bookingActivity.to),
    modalityName:
      getLocalizedText(modality.name) ||
      getFirstString(modality.code, bookingActivity.modalityCode),
    destinationName: getFirstString(
      asRecord(bookingActivity.destination).name,
      bookingActivity.destinationName,
    ),
    holder,
    paxes,
    childrenAges: paxes
      ?.map((pax) => (typeof pax.age === "number" && pax.age < 18 ? pax.age : null))
      .filter((age): age is number => age !== null),
    contractRemarks: collectContractRemarks(activity, bookingActivity),
    redeemInformation: collectContractRemarks(asRecord(activity.redeemInfo), bookingActivity),
    supplierInfo: getFirstString(asRecord(bookingActivity.supplier).name),
    providerInfo: getFirstString(asRecord(bookingActivity.provider).name),
    selectedLanguage: getFirstString(bookingActivity.language, request?.activities?.[0]?.language),
    selectedSession: getFirstString(bookingActivity.session, request?.activities?.[0]?.session),
    meetingPoint: getFirstString(
      bookingActivity.meetingPoint,
      asRecord(bookingActivity.meetingPoint).description,
      asRecord(activity.meetingPoint).description,
    ),
    pickupInfo: getFirstString(
      bookingActivity.pickupInfo,
      bookingActivity.pickupInformation,
      asRecord(bookingActivity.pickup).description,
    ),
    answers: request?.activities?.[0]?.answers,
    customerEmail: holder?.email,
    customerPhone: holder?.telephones?.[0],
    cancellationPolicies: getCancellationPolicies([modality, bookingActivity]),
    officialVouchers: mapVoucherFiles(bookingActivity.vouchers || booking.vouchers),
    raw: payload,
  };
}

function mapBookingResponse(
  payload: unknown,
  request?: ActivityBookingRequest,
): ActivityBookingResponse {
  return {
    supplier: "hotelbeds-activities",
    enabled: true,
    status: extractBookingStatus(payload),
    bookingReference: extractBookingReference(payload),
    clientReference: getFirstString(getBookingRecord(payload).clientReference, request?.clientReference),
    voucher: mapActivityVoucher(payload, request),
    rawSupplierRequest: request,
    rawSupplierResponse: payload,
  };
}

function getDestinationCandidates(payload: unknown) {
  if (Array.isArray(payload)) return payload;

  const data = asRecord(payload);
  const country = asRecord(data.country);

  return asArray(
    country.destinations ||
      data.destinations ||
      data.destinationList ||
      data.items ||
      data.results ||
      data.locations,
  );
}

function getCountryCandidates(payload: unknown) {
  if (Array.isArray(payload)) return payload;

  const data = asRecord(payload);

  return asArray(data.countries || data.countryList || data.items || data.results);
}

function normalizeSearchText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function matchesDestination(query: string, destination: unknown) {
  const normalized = normalizeSearchText(query);
  const record = asRecord(destination);
  const country = asRecord(record.country);

  const haystack = [
    getLocalizedText(record.name),
    record.code,
    record.destinationCode,
    record.id,
    getLocalizedText(country.name),
    country.code,
    record.countryCode,
    record.countryName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function mapDestinationSuggestion(destination: unknown): ActivityDestinationSuggestion | null {
  const record = asRecord(destination);
  const country = asRecord(record.country);

  const destinationCode = getFirstString(
    record.destinationCode,
    record.code,
    record.id,
  );

  const destinationName =
    getLocalizedText(record.name) ||
    getFirstString(record.name, destinationCode);

  const countryCode = getFirstString(record.countryCode, country.code);

  if (!destinationCode || !destinationName || !countryCode) return null;

  const countryName =
    getLocalizedText(country.name) || getFirstString(record.countryName);

  return {
    label: countryName ? `${destinationName}, ${countryName}` : destinationName,
    countryCode,
    countryName,
    destinationCode,
    destinationName,
  };
}

function mapCountryCode(country: unknown) {
  const record = asRecord(country);

  return getFirstString(
    record.code,
    record.countryCode,
    record.isoCode,
    record.id,
  );
}

function mapCountryName(country: unknown) {
  const record = asRecord(country);

  return (
    getLocalizedText(record.name) ||
    getFirstString(record.countryName, record.description, record.code)
  );
}

export class HotelbedsActivitiesClient {
  private readonly baseUrl: string;
  private readonly contentBaseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: HotelbedsActivitiesClientOptions = {}) {
    this.baseUrl = options.baseUrl || getHotelbedsActivitiesBaseUrl();
    this.contentBaseUrl =
      options.contentBaseUrl || getHotelbedsActivitiesContentBaseUrl();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async post(path: string, body: unknown) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(joinBaseUrlAndPath(this.baseUrl, path), {
        method: "POST",
        headers: createHotelbedsActivitiesHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await readSafeErrorDetails(response);

        logActivitiesRequest({
          operation: "post",
          endpoint: path,
          status: response.status,
          reason: details.slice(0, 120),
        });

        throw new HotelbedsActivitiesClientError(
          `Hotelbeds Activities request failed at ${path} with status ${response.status}. ${details || ""}`.trim(),
          "HOTELBEDS_ACTIVITIES_REQUEST_FAILED",
          response.status,
        );
      }

      const payload = await parseJsonResponse(response);

      logActivitiesRequest({
        operation: "post",
        endpoint: path,
        status: response.status,
        itemCount: countActivityItems(payload),
      });

      return payload;
    } catch (error) {
      throw toActivitiesError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async put(path: string, body: unknown) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(joinBaseUrlAndPath(this.baseUrl, path), {
        method: "PUT",
        headers: createHotelbedsActivitiesHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await readSafeErrorDetails(response);
        logActivitiesRequest({
          operation: "put",
          endpoint: path,
          status: response.status,
          reason: details.slice(0, 120),
        });
        throw new HotelbedsActivitiesClientError(
          `Hotelbeds Activities request failed at ${path} with status ${response.status}. ${details || ""}`.trim(),
          "HOTELBEDS_ACTIVITIES_REQUEST_FAILED",
          response.status,
        );
      }

      const payload = await parseJsonResponse(response);
      logActivitiesRequest({
        operation: "put",
        endpoint: path,
        status: response.status,
        itemCount: countActivityItems(payload),
      });
      return payload;
    } catch (error) {
      throw toActivitiesError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async get(path: string, query?: Record<string, unknown>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL(joinBaseUrlAndPath(this.baseUrl, path));
      appendQuery(url, query);
      const response = await fetch(url, {
        method: "GET",
        headers: createHotelbedsActivitiesHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await readSafeErrorDetails(response);
        logActivitiesRequest({
          operation: "get",
          endpoint: path,
          status: response.status,
          reason: details.slice(0, 120),
        });
        throw new HotelbedsActivitiesClientError(
          `Hotelbeds Activities request failed at ${path} with status ${response.status}. ${details || ""}`.trim(),
          "HOTELBEDS_ACTIVITIES_REQUEST_FAILED",
          response.status,
        );
      }

      const payload = await parseJsonResponse(response);
      logActivitiesRequest({
        operation: "get",
        endpoint: path,
        status: response.status,
        itemCount: countActivityItems(payload),
      });
      return payload;
    } catch (error) {
      throw toActivitiesError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async delete(path: string, query?: Record<string, unknown>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL(joinBaseUrlAndPath(this.baseUrl, path));
      appendQuery(url, query);
      const response = await fetch(url, {
        method: "DELETE",
        headers: createHotelbedsActivitiesHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await readSafeErrorDetails(response);
        logActivitiesRequest({
          operation: "delete",
          endpoint: path,
          status: response.status,
          reason: details.slice(0, 120),
        });
        throw new HotelbedsActivitiesClientError(
          `Hotelbeds Activities request failed at ${path} with status ${response.status}. ${details || ""}`.trim(),
          "HOTELBEDS_ACTIVITIES_REQUEST_FAILED",
          response.status,
        );
      }

      const payload = await parseJsonResponse(response);
      logActivitiesRequest({
        operation: "delete",
        endpoint: path,
        status: response.status,
        itemCount: countActivityItems(payload),
      });
      return payload;
    } catch (error) {
      throw toActivitiesError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getContent(path: string, query?: Record<string, unknown>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL(joinBaseUrlAndPath(this.contentBaseUrl, path));
      appendQuery(url, query);

      const response = await fetch(url, {
        method: "GET",
        headers: createHotelbedsActivitiesHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await readSafeErrorDetails(response);

        logActivitiesRequest({
          operation: "getContent",
          endpoint: path,
          status: response.status,
          reason: details.slice(0, 120),
        });

        throw new HotelbedsActivitiesClientError(
          `Hotelbeds Activities Content request failed at ${path} with status ${response.status}. ${details || ""}`.trim(),
          "HOTELBEDS_ACTIVITIES_REQUEST_FAILED",
          response.status,
        );
      }

      const payload = await parseJsonResponse(response);

      logActivitiesRequest({
        operation: "getContent",
        endpoint: path,
        status: response.status,
        itemCount: countActivityItems(payload),
      });

      return payload;
    } catch (error) {
      throw toActivitiesError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  async searchActivities(
    request: ActivitySearchRequest,
  ): Promise<ActivitySearchResponse> {
    if (!isHotelbedsActivitiesSearchEnabled()) {
      return {
        supplier: "hotelbeds-activities",
        enabled: false,
        options: [],
        rawSupplierRequest: request,
        message: "بحث الأنشطة غير مفعل في هذه البيئة.",
      };
    }

    const body = buildAvailabilityBody(request);
    const payload = await this.post("/activities/availability", body);
    const activities = getActivitiesArray(payload);

    return {
      supplier: "hotelbeds-activities",
      enabled: true,
      options: activities.map(mapActivityOption),
      rawSupplierRequest: body,
      rawSupplierResponse: payload,
    };
  }

  async getActivityDetails(
    request: ActivityDetailsRequest,
  ): Promise<ActivityDetailsResponse> {
    if (!isHotelbedsActivitiesSearchEnabled()) {
      return {
        supplier: "hotelbeds-activities",
        enabled: false,
        activityCode: request.activityCode,
        message: "Hotelbeds Activities search/details is disabled in this environment.",
        rawSupplierRequest: request,
      };
    }

    const body = buildDetailsBody(request);
    const payload = await this.post("/activities/details", body);
    return mapActivityDetailsResponse(payload, request);
  }

  async checkRate(request: ActivityDetailsRequest): Promise<ActivityDetailsResponse> {
    return this.getActivityDetails(request);
  }

  async bookActivity(
    request: ActivityBookingRequest,
  ): Promise<ActivityBookingResponse> {
    if (!isHotelbedsActivitiesBookingEnabled()) {
      return {
        supplier: "hotelbeds-activities",
        enabled: false,
        status: "disabled",
        clientReference: request.clientReference,
        message: DISABLED_BOOKING_MESSAGE,
        rawSupplierRequest: request,
      };
    }

    const payload = await this.put("/bookings", buildBookingBody(request));
    return mapBookingResponse(payload, request);
  }

  async getActivityBookingDetails(
    request: ActivityBookingDetailsRequest,
  ): Promise<ActivityBookingResponse> {
    if (!isHotelbedsActivitiesBookingEnabled()) {
      return {
        supplier: "hotelbeds-activities",
        enabled: false,
        status: "disabled",
        bookingReference: request.bookingReference,
        message: DISABLED_BOOKING_MESSAGE,
        rawSupplierRequest: request,
      };
    }

    const language = request.language || DEFAULT_LANGUAGE;
    const payload = await this.get(
      `/bookings/${encodeURIComponent(language)}/${encodeURIComponent(request.bookingReference)}`,
    );
    return mapBookingResponse(payload);
  }

  async cancelActivityBooking(
    request: ActivityCancelRequest,
  ): Promise<ActivityBookingResponse> {
    if (!isHotelbedsActivitiesBookingEnabled()) {
      return {
        supplier: "hotelbeds-activities",
        enabled: false,
        status: "disabled",
        bookingReference: request.bookingReference,
        message: DISABLED_BOOKING_MESSAGE,
        rawSupplierRequest: request,
      };
    }

    const language = request.language || DEFAULT_LANGUAGE;
    const payload = await this.delete(
      `/bookings/${encodeURIComponent(language)}/${encodeURIComponent(request.bookingReference)}`,
      {
        cancellationFlag: request.cancellationFlag || "CANCELLATION",
      },
    );
    return mapBookingResponse(payload);
  }

  getContentCountries(language = DEFAULT_LANGUAGE) {
    return this.getContent(`/countries/${language}`);
  }

  getContentDestinations(countryCode: string, language = DEFAULT_LANGUAGE) {
    return this.getContent(`/destinations/${language}/${countryCode}`);
  }

  getActivitiesDestinations(countryCode: string, language = DEFAULT_LANGUAGE) {
    return this.getContentDestinations(countryCode, language);
  }

  async searchDestinations(query: string): Promise<ActivityDestinationSuggestion[]> {
    if (!isHotelbedsActivitiesSearchEnabled()) {
      return [];
    }

    const normalizedQuery = query.trim();
    const countriesPayload = await this.getContentCountries(DEFAULT_LANGUAGE);
    const countries = getCountryCandidates(countriesPayload);
    const results: ActivityDestinationSuggestion[] = [];
    const seen = new Set<string>();

    for (const countryItem of countries) {
      const countryCode = mapCountryCode(countryItem);
      const countryName = mapCountryName(countryItem);

      if (!countryCode) continue;

      const isCountryMatch = [countryCode, countryName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery.toLowerCase());

      try {
        const destinationsPayload = await this.getContentDestinations(
          countryCode,
          DEFAULT_LANGUAGE,
        );

        const destinations = getDestinationCandidates(destinationsPayload);

        for (const destination of destinations) {
          const destinationRecord = asRecord(destination);

          const enrichedDestination = {
            ...destinationRecord,
            countryCode,
            countryName,
            country: {
              code: countryCode,
              name: countryName,
            },
          };

          if (
            !isCountryMatch &&
            !matchesDestination(normalizedQuery, enrichedDestination)
          ) {
            continue;
          }

          const suggestion = mapDestinationSuggestion(enrichedDestination);
          if (!suggestion) continue;

          const key = `${suggestion.countryCode}-${suggestion.destinationCode}`;

          if (seen.has(key)) continue;

          seen.add(key);
          results.push(suggestion);

          if (results.length >= 20) {
            return results;
          }
        }
      } catch {
        continue;
      }
    }

    return results;
  }
}

export function createHotelbedsActivitiesClient(
  options?: HotelbedsActivitiesClientOptions,
) {
  return new HotelbedsActivitiesClient(options);
}
