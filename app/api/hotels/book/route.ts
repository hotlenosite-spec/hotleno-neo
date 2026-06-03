import { NextRequest, NextResponse } from "next/server";
import {
  createHotelbedsHotelsClient,
  HotelbedsHotelsClient,
  HotelbedsHotelsClientError,
} from "@/lib/suppliers/hotelbeds-hotels-client";
import { isHotelbedsHotelsBookingEnabled } from "@/lib/suppliers/hotelbeds-auth";
import type { HotelbedsHotelBookingRequest } from "@/types/hotelbeds-hotels-certification";

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
  let body: HotelbedsHotelBookingRequest;

  try {
    body = (await req.json()) as HotelbedsHotelBookingRequest;
  } catch {
    return errorResponse(400, "HOTELBEDS_HOTELS_INVALID_JSON", "Invalid hotel booking request.");
  }

  if (!isHotelbedsHotelsBookingEnabled()) {
    return errorResponse(
      403,
      "HOTELBEDS_HOTELS_BOOKING_DISABLED",
      "Hotelbeds Accommodation booking is disabled in this environment.",
    );
  }

  if (
    !body.clientReference ||
    !body.rateKey ||
    !body.holder?.name ||
    !body.holder?.surname ||
    !body.guests?.length
  ) {
    return errorResponse(
      400,
      "HOTELBEDS_HOTELS_BOOKING_VALIDATION_ERROR",
      "clientReference, rateKey, holder, and guests are required.",
    );
  }

  try {
    const client = createHotelbedsHotelsClient();
    const data = await client.book(body);

    return NextResponse.json({
      success: true,
      data: {
        supplier: "hotelbeds-accommodation",
        status: "confirmed",
        bookingReference:
          (data as { booking?: { reference?: string } }).booking?.reference ||
          (data as { reference?: string }).reference,
        voucher: client.mapVoucher(data),
      },
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

    return errorResponse(500, "HOTELBEDS_HOTELS_BOOKING_FAILED", "Unable to confirm Hotelbeds Accommodation booking.");
  }
}
