import { NextRequest, NextResponse } from "next/server";
import {
  createHotelbedsHotelsClient,
  HotelbedsHotelsClient,
  HotelbedsHotelsClientError,
} from "@/lib/suppliers/hotelbeds-hotels-client";
import type { HotelbedsHotelCheckRateRequest } from "@/types/hotelbeds-hotels-certification";

export const runtime = "nodejs";

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function errorResponse(status: number, error: string, message: string, debug?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
      ...(isDev() && debug ? { debug } : {}),
    },
    { status },
  );
}

export async function POST(req: NextRequest) {
  let body: HotelbedsHotelCheckRateRequest;

  try {
    body = (await req.json()) as HotelbedsHotelCheckRateRequest;
  } catch {
    return errorResponse(400, "HOTELBEDS_HOTELS_INVALID_JSON", "Invalid check-rate request.");
  }

  if (!body.rateKey) {
    return errorResponse(400, "HOTELBEDS_HOTELS_MISSING_RATE_KEY", "rateKey is required.");
  }

  try {
    const data = await createHotelbedsHotelsClient().checkRate(body);
    return NextResponse.json({
      success: true,
      data,
      debug: isDev()
        ? {
            requestUsage: HotelbedsHotelsClient.getRequestUsage(),
          }
        : undefined,
    });
  } catch (error) {
    if (error instanceof HotelbedsHotelsClientError) {
      return errorResponse(error.status || 502, error.code, error.message, {
        status: error.status,
        requestUsage: HotelbedsHotelsClient.getRequestUsage(),
      });
    }

    return errorResponse(500, "HOTELBEDS_HOTELS_CHECK_RATE_FAILED", "Unable to check hotel rate.");
  }
}
