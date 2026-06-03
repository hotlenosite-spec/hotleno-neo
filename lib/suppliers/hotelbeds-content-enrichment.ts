import { hasHotelbedsCredentials } from "./hotelbeds-auth";
import {
  createHotelbedsContentClient,
  HotelbedsContentClientError,
} from "./hotelbeds-content-client";
import type { SupplierHotelResult } from "./types";

const HOTELBEDS_IMAGE_BASE_URL = "https://photos.hotelbeds.com/giata/bigger";
const CONTENT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_MAX_ENRICHED_HOTELS = 25;

type HotelbedsDescription = {
  content?: string;
};

type HotelbedsImage = {
  path?: string;
  order?: number | string;
  visualOrder?: number | string;
  type?: {
    description?: HotelbedsDescription | string;
  };
};

type HotelbedsFacility = {
  description?: HotelbedsDescription | string;
};

type HotelbedsContentHotel = {
  code?: number | string;
  name?: HotelbedsDescription | string;
  description?: HotelbedsDescription | string;
  address?: HotelbedsDescription | string;
  city?: HotelbedsDescription | string;
  countryCode?: string;
  countryName?: string;
  destinationCode?: string;
  destinationName?: string;
  categoryCode?: string;
  categoryName?: string;
  coordinates?: {
    latitude?: number | string;
    longitude?: number | string;
  };
  images?: HotelbedsImage[];
  facilities?: HotelbedsFacility[];
};

type HotelbedsContentCacheEntry = {
  expiresAt: number;
  content: HotelbedsContentHotel | null;
};

const contentCache = new Map<string, HotelbedsContentCacheEntry>();

function getContentText(value?: HotelbedsDescription | string) {
  if (!value) return undefined;
  if (typeof value === "string") return value.trim() || undefined;

  return value.content?.trim() || undefined;
}

function getConfiguredMaxEnrichedHotels() {
  const configured = Number(process.env.HOTELBEDS_CONTENT_ENRICHMENT_LIMIT);

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_ENRICHED_HOTELS;
}

function getHotelbedsCode(hotel: SupplierHotelResult) {
  const metadataCode = hotel.metadata?.hotelbedsCode;
  const code =
    typeof metadataCode === "string" || typeof metadataCode === "number"
      ? String(metadataCode)
      : hotel.supplierHotelId;

  return code.trim();
}

function toNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseStars(content: HotelbedsContentHotel) {
  const category = content.categoryCode || content.categoryName;
  if (!category) return undefined;

  const match = category.match(/[1-5]/);
  return match ? Number(match[0]) : undefined;
}

function toHotelbedsImageUrl(path?: string) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;

  return `${HOTELBEDS_IMAGE_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

function getImageDescription(image: HotelbedsImage) {
  return getContentText(image.type?.description);
}

function sortHotelbedsImages(images: HotelbedsImage[]) {
  return [...images].sort((a, b) => {
    const aVisualOrder = toNumber(a.visualOrder) ?? Number.MAX_SAFE_INTEGER;
    const bVisualOrder = toNumber(b.visualOrder) ?? Number.MAX_SAFE_INTEGER;

    if (aVisualOrder !== bVisualOrder) {
      return aVisualOrder - bVisualOrder;
    }

    return (toNumber(a.order) ?? 0) - (toNumber(b.order) ?? 0);
  });
}

function extractHotels(payload: unknown): HotelbedsContentHotel[] {
  const data = payload as {
    hotel?: HotelbedsContentHotel;
    hotels?: HotelbedsContentHotel[];
  };

  if (data.hotel) return [data.hotel];
  if (Array.isArray(data.hotels)) return data.hotels;

  return [];
}

function readCachedContent(code: string) {
  const cached = contentCache.get(code);

  if (!cached || cached.expiresAt <= Date.now()) {
    contentCache.delete(code);
    return undefined;
  }

  return cached.content;
}

function writeCachedContent(code: string, content: HotelbedsContentHotel | null) {
  contentCache.set(code, {
    content,
    expiresAt: Date.now() + CONTENT_CACHE_TTL_MS,
  });
}

function logContentEnrichmentWarning(error: unknown) {
  if (error instanceof HotelbedsContentClientError) {
    console.warn("[Hotelbeds Content] enrichment skipped", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    return;
  }

  console.warn("[Hotelbeds Content] enrichment skipped", {
    message:
      error instanceof Error
        ? error.message
        : "Unknown Hotelbeds content enrichment error",
  });
}

async function getHotelbedsContentByCode(code: string) {
  const cached = readCachedContent(code);
  if (cached !== undefined) return cached;

  const client = createHotelbedsContentClient();
  const payload = await client.getHotelDetails(code, {
    fields: "all",
    language: "ENG",
    useSecondaryLanguage: "false",
  });
  const content =
    extractHotels(payload).find((hotel) => String(hotel.code) === code) ??
    extractHotels(payload)[0] ??
    null;

  writeCachedContent(code, content);
  return content;
}

export function mapHotelbedsContentToUnifiedHotel(
  hotel: SupplierHotelResult,
  content: HotelbedsContentHotel | null,
): SupplierHotelResult {
  if (!content) return hotel;

  const images = sortHotelbedsImages(content.images ?? []).reduce<
    Array<{ url: string; description?: string }>
  >((result, image) => {
    const url = toHotelbedsImageUrl(image.path);
    if (!url) return result;

    result.push({
      url,
      description: getImageDescription(image),
    });

    return result;
  }, []);
  const facilities = (content.facilities ?? [])
    .map((facility) => getContentText(facility.description))
    .filter((facility): facility is string => Boolean(facility));

  return {
    ...hotel,
    hotelName: getContentText(content.name) ?? hotel.hotelName,
    cityName:
      getContentText(content.city) ??
      content.destinationName ??
      hotel.cityName,
    countryName: content.countryName ?? content.countryCode ?? hotel.countryName,
    address: getContentText(content.address) ?? hotel.address,
    description: getContentText(content.description) ?? hotel.description,
    images: images.length > 0 ? images : hotel.images,
    facilities: facilities.length > 0 ? facilities : hotel.facilities,
    latitude: toNumber(content.coordinates?.latitude) ?? hotel.latitude,
    longitude: toNumber(content.coordinates?.longitude) ?? hotel.longitude,
    stars: parseStars(content) ?? hotel.stars,
    metadata: {
      ...(hotel.metadata ?? {}),
      hotelbedsCode: String(content.code ?? getHotelbedsCode(hotel)),
      hotelbedsContentEnriched: true,
      hotelbedsDestinationCode: content.destinationCode,
      hotelbedsCategoryCode: content.categoryCode,
    },
  };
}

export async function enrichHotelbedsHotelWithContent(
  hotel: SupplierHotelResult,
): Promise<SupplierHotelResult> {
  if (hotel.supplier !== "hotelbeds" || !hasHotelbedsCredentials()) {
    return hotel;
  }

  const code = getHotelbedsCode(hotel);
  if (!code) return hotel;

  try {
    const content = await getHotelbedsContentByCode(code);
    return mapHotelbedsContentToUnifiedHotel(hotel, content);
  } catch (error) {
    logContentEnrichmentWarning(error);
    writeCachedContent(code, null);
    return hotel;
  }
}

export async function enrichHotelbedsHotelsWithContent(
  hotels: SupplierHotelResult[],
): Promise<SupplierHotelResult[]> {
  if (!hasHotelbedsCredentials()) {
    return hotels;
  }

  const maxEnrichedHotels = getConfiguredMaxEnrichedHotels();
  let enrichedCount = 0;

  return Promise.all(
    hotels.map((hotel) => {
      if (hotel.supplier !== "hotelbeds") return hotel;
      if (enrichedCount >= maxEnrichedHotels) return hotel;

      enrichedCount += 1;
      return enrichHotelbedsHotelWithContent(hotel);
    }),
  );
}
