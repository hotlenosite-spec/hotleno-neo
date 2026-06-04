import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import type { SupplierHotelResult } from "./types";
import type { TboHotelCodeSummary, TboHotelContent } from "./tbo-content-client";

export type TboCityMappingDocument = Document & {
  _id: string;
  cityName: string;
  countryCode: string;
  cityCode: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TboHotelCodeDocument = Document & {
  _id: string;
  cityCode: string;
  countryCode: string;
  cityName: string;
  hotelCode: string;
  hotelName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  starRating?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TboHotelContentDocument = Document & TboHotelContent & {
  _id: string;
  cityCode?: string;
  countryCode?: string;
  updatedAt?: Date;
  expiresAt?: Date;
};

function isTruthy(value: unknown) {
  return String(value || "").trim().toLowerCase() === "true";
}

export function isTboContentCacheEnabled() {
  return isTruthy(process.env.TBO_CONTENT_CACHE_ENABLED);
}

export function isTboContentEnabled() {
  return isTruthy(process.env.TBO_CONTENT_ENABLED);
}

export function isTboNormalSearchEnabled() {
  return isTruthy(process.env.TBO_NORMAL_SEARCH_ENABLED);
}

export function getTboContentTtlHours() {
  const parsed = Number(process.env.TBO_CONTENT_CACHE_TTL_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2160;
}

export function getTboMaxHotelCodesPerSearch() {
  const parsed = Number(process.env.TBO_MAX_HOTEL_CODES_PER_SEARCH);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : 100;
}

export function getDubaiCityCode() {
  return String(process.env.TBO_NORMAL_SEARCH_CITY_CODE_DUBAI || "115936");
}

function isDubaiQuery(params: {
  destination?: unknown;
  cityCode?: unknown;
  destinationCode?: unknown;
  countryCode?: unknown;
}) {
  const cityCode = String(params.cityCode || params.destinationCode || "").trim();
  const destination = String(params.destination || "").trim().toLowerCase();
  const countryCode = String(params.countryCode || "").trim().toUpperCase();
  return (
    cityCode === getDubaiCityCode() ||
    destination.includes("dubai") ||
    destination.includes("دبي") ||
    (countryCode === "AE" && destination.includes("dub"))
  );
}

export async function ensureDubaiCityMapping() {
  const db = await getFirestoreMongoDb();
  const now = new Date();
  const cityCode = getDubaiCityCode();
  await db.collection<TboCityMappingDocument>("tbo_city_mapping").updateOne(
    { _id: `AE:${cityCode}` },
    {
      $set: {
        cityName: "Dubai",
        countryCode: "AE",
        cityCode,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function getDubaiHotelCodes(limit = getTboMaxHotelCodesPerSearch()) {
  if (!isTboContentCacheEnabled()) return [] as string[];
  await ensureDubaiCityMapping();
  const db = await getFirestoreMongoDb();
  const cityCode = getDubaiCityCode();
  const hotels = await db
    .collection<TboHotelCodeDocument>("tbo_hotel_codes")
    .find({ cityCode, countryCode: "AE" })
    .sort({ hotelName: 1 })
    .limit(limit)
    .toArray();

  console.info(
    "[TBO HotelCodes Cache]",
    JSON.stringify({ cityCode, count: hotels.length, limit }),
  );

  return hotels.map((hotel) => hotel.hotelCode).filter(Boolean);
}

export async function saveDubaiHotelCodes(hotels: TboHotelCodeSummary[]) {
  const db = await getFirestoreMongoDb();
  const now = new Date();
  const cityCode = getDubaiCityCode();
  await ensureDubaiCityMapping();
  for (const hotel of hotels) {
    await db.collection<TboHotelCodeDocument>("tbo_hotel_codes").updateOne(
      { _id: `AE:${cityCode}:${hotel.hotelCode}` },
      {
        $set: {
          cityCode,
          countryCode: "AE",
          cityName: hotel.cityName || "Dubai",
          hotelCode: hotel.hotelCode,
          hotelName: hotel.hotelName || `TBO Hotel ${hotel.hotelCode}`,
          address: hotel.address || "",
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          starRating: hotel.starRating || "",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }
}

export async function saveTboHotelContent(
  content: TboHotelContent,
  params: { cityCode?: string; countryCode?: string } = {},
) {
  const db = await getFirestoreMongoDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getTboContentTtlHours() * 60 * 60 * 1000);
  await db.collection<TboHotelContentDocument>("tbo_hotel_content").updateOne(
    { _id: content.hotelCode },
    {
      $set: {
        ...content,
        cityCode: params.cityCode,
        countryCode: params.countryCode,
        updatedAt: now,
        expiresAt,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function getTboHotelContentMap(hotelCodes: string[]) {
  if (!isTboContentCacheEnabled() || hotelCodes.length === 0) {
    return new Map<string, TboHotelContentDocument>();
  }

  const db = await getFirestoreMongoDb();
  const now = new Date();
  const rows = await db
    .collection<TboHotelContentDocument>("tbo_hotel_content")
    .find({ _id: { $in: hotelCodes } })
    .toArray();
  const freshRows = rows.filter((row) => !row.expiresAt || row.expiresAt > now);

  console.info(
    "[TBO HotelDetails Cache]",
    JSON.stringify({ requested: hotelCodes.length, hits: freshRows.length }),
  );

  return new Map(freshRows.map((row) => [row.hotelCode, row]));
}

function ratingToStars(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("five")) return 5;
  if (normalized.includes("four")) return 4;
  if (normalized.includes("three")) return 3;
  if (normalized.includes("two")) return 2;
  if (normalized.includes("one")) return 1;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export async function enrichTboHotelsWithCachedContent(
  hotels: SupplierHotelResult[],
) {
  const tboHotelCodes = hotels
    .filter((hotel) => hotel.supplier === "tbo")
    .map((hotel) => hotel.supplierHotelId)
    .filter(Boolean);
  const contentMap = await getTboHotelContentMap(tboHotelCodes);

  console.info(
    "[TBO Normal Search Merge]",
    JSON.stringify({ tboHotels: tboHotelCodes.length, contentHits: contentMap.size }),
  );

  return hotels.map((hotel) => {
    if (hotel.supplier !== "tbo") return hotel;
    const content = contentMap.get(hotel.supplierHotelId);
    if (!content) return hotel;

    return {
      ...hotel,
      hotelName: content.hotelName || hotel.hotelName,
      description: content.description || hotel.description,
      address: content.address || hotel.address,
      cityName: content.cityName || hotel.cityName,
      countryName: content.countryName || hotel.countryName,
      images: content.images?.length ? content.images : hotel.images,
      facilities: content.facilities?.length ? content.facilities : hotel.facilities,
      latitude: content.latitude ?? hotel.latitude,
      longitude: content.longitude ?? hotel.longitude,
      stars: ratingToStars(content.rating) ?? hotel.stars,
      metadata: {
        ...(hotel.metadata ?? {}),
        tboContentCacheHit: true,
      },
    };
  });
}

export async function getTboNormalSearchHotelCodes(params: {
  destination?: unknown;
  cityCode?: unknown;
  destinationCode?: unknown;
  countryCode?: unknown;
}) {
  if (!isTboNormalSearchEnabled() || !isDubaiQuery(params)) return [] as string[];
  return getDubaiHotelCodes(getTboMaxHotelCodesPerSearch());
}
