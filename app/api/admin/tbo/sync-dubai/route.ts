import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth-user";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { TboContentClient, type TboHotelCodeSummary } from "@/lib/suppliers/tbo-content-client";
import {
  ensureDubaiCityMapping,
  getDubaiCityCode,
  isTboContentEnabled,
  saveDubaiHotelCodes,
  saveTboHotelContent,
} from "@/lib/suppliers/tbo-content-store";

export const runtime = "nodejs";

function toPositiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function toMinimalContent(hotel: TboHotelCodeSummary) {
  return {
    hotelCode: hotel.hotelCode,
    hotelName: hotel.hotelName || `TBO Hotel ${hotel.hotelCode}`,
    address: hotel.address,
    cityName: hotel.cityName || "Dubai",
    countryName: hotel.countryName || "United Arab Emirates",
    images: [],
    facilities: hotel.facilities || [],
    rating: hotel.starRating,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
  };
}

async function saveSyncLog(params: {
  status: "success" | "failed";
  cityCode: string;
  hotelCodesCount: number;
  detailsSynced: number;
  detailsFailed: number;
  error?: string;
}) {
  try {
    const db = await getFirestoreMongoDb();
    await db.collection("tbo_content_cache_logs").insertOne({
      action: "sync_dubai_content",
      provider: "tbo",
      cityCode: params.cityCode,
      countryCode: "AE",
      status: params.status,
      hotelCodesCount: params.hotelCodesCount,
      detailsSynced: params.detailsSynced,
      detailsFailed: params.detailsFailed,
      error: params.error || null,
      createdAt: new Date(),
    });
  } catch {
    // Content sync must not fail because cache logging is unavailable.
  }
}

export async function POST(req: NextRequest) {
  const user = requireAdminFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!isTboContentEnabled()) {
    return NextResponse.json(
      { error: "TBO content sync is disabled" },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    maxHotels?: unknown;
    detailsLimit?: unknown;
    detailed?: unknown;
  };
  const cityCode = getDubaiCityCode();
  const maxHotels = toPositiveInt(body.maxHotels, 20, 500);
  const detailsLimit = toPositiveInt(body.detailsLimit, 10, maxHotels);
  const detailed = body.detailed !== false;

  try {
    await ensureDubaiCityMapping();

    const client = new TboContentClient();
    const hotelCodes = (
      await client.getGiataHotelCodeList(cityCode, detailed)
    ).slice(0, maxHotels);

    await saveDubaiHotelCodes(hotelCodes);

    let detailsSynced = 0;
    let detailsFailed = 0;

    for (const hotel of hotelCodes) {
      await saveTboHotelContent(toMinimalContent(hotel), {
        cityCode,
        countryCode: "AE",
      });
    }

    for (const hotel of hotelCodes.slice(0, detailsLimit)) {
      try {
        const details = await client.getHotelDetails(hotel.hotelCode);
        await saveTboHotelContent(details, {
          cityCode,
          countryCode: "AE",
        });
        detailsSynced += 1;
      } catch (error) {
        detailsFailed += 1;
        console.warn(
          "[TBO Content Sync]",
          JSON.stringify({
            action: "hotel_details",
            hotelCode: hotel.hotelCode,
            status: "failed",
            error: error instanceof Error ? error.message.slice(0, 180) : "Unknown error",
          }),
        );
      }
    }

    await saveSyncLog({
      status: "success",
      cityCode,
      hotelCodesCount: hotelCodes.length,
      detailsSynced,
      detailsFailed,
    });

    console.info(
      "[TBO Content Sync]",
      JSON.stringify({
        action: "sync_dubai_content",
        cityCode,
        hotelCodesCount: hotelCodes.length,
        detailsSynced,
        detailsFailed,
      }),
    );

    return NextResponse.json({
      success: true,
      cityCode,
      hotelCodesCount: hotelCodes.length,
      detailsSynced,
      detailsFailed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 180) : "Unknown sync error";
    await saveSyncLog({
      status: "failed",
      cityCode,
      hotelCodesCount: 0,
      detailsSynced: 0,
      detailsFailed: 0,
      error: message,
    });

    console.error(
      "[TBO Content Sync]",
      JSON.stringify({
        action: "sync_dubai_content",
        cityCode,
        status: "failed",
        error: message,
      }),
    );

    return NextResponse.json({ error: "TBO Dubai content sync failed" }, { status: 500 });
  }
}
