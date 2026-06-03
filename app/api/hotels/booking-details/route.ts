import { NextRequest, NextResponse } from "next/server";
import {
  createHotelbedsHotelsClient,
  HotelbedsHotelsClient,
  HotelbedsHotelsClientError,
} from "@/lib/suppliers/hotelbeds-hotels-client";
import { isHotelbedsHotelsBookingEnabled } from "@/lib/suppliers/hotelbeds-auth";
import type { HotelbedsHotelBookingDetailsRequest } from "@/types/hotelbeds-hotels-certification";

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
  let body: HotelbedsHotelBookingDetailsRequest;

  try {
    body = (await req.json()) as HotelbedsHotelBookingDetailsRequest;
  } catch {
    return errorResponse(400, "HOTELBEDS_HOTELS_INVALID_JSON", "Invalid booking details request.");
  }

  if (!isHotelbedsHotelsBookingEnabled()) {
    return errorResponse(
      403,
      "HOTELBEDS_HOTELS_BOOKING_DISABLED",
      "Hotelbeds Accommodation booking details are disabled in this environment.",
    );
  }

  if (!body.bookingReference) {
    return errorResponse(400, "HOTELBEDS_HOTELS_MISSING_REFERENCE", "bookingReference is required.");
  }

  try {
    const client = createHotelbedsHotelsClient();
    const data = await client.bookingDetails(body);

    return NextResponse.json({
      success: true,
      data: {
        supplier: "hotelbeds-accommodation",
        bookingReference: body.bookingReference,
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

    return errorResponse(500, "HOTELBEDS_HOTELS_BOOKING_DETAILS_FAILED", "Unable to fetch Hotelbeds Accommodation booking details.");
  }
}
