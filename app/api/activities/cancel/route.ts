import { NextRequest, NextResponse } from "next/server";
import { isHotelbedsActivitiesBookingEnabled } from "@/lib/suppliers/hotelbeds-activities-auth";
import {
  createHotelbedsActivitiesClient,
  HotelbedsActivitiesClientError,
} from "@/lib/suppliers/hotelbeds-activities-client";
import type { ActivityCancelRequest } from "@/types/activities";

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function sanitize<T extends { rawSupplierRequest?: unknown; rawSupplierResponse?: unknown }>(
  result: T,
) {
  return {
    ...result,
    rawSupplierRequest: undefined,
    rawSupplierResponse: undefined,
  };
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
  let body: ActivityCancelRequest;

  try {
    body = (await req.json()) as ActivityCancelRequest;
  } catch {
    return errorResponse(400, "ACTIVITIES_INVALID_JSON", "طلب إلغاء النشاط غير صالح.");
  }

  if (!isHotelbedsActivitiesBookingEnabled()) {
    return errorResponse(
      403,
      "HOTELBEDS_ACTIVITIES_BOOKING_DISABLED",
      "Hotelbeds Activities booking/cancellation is disabled in this environment.",
    );
  }

  if (!body.bookingReference) {
    return errorResponse(
      400,
      "ACTIVITIES_MISSING_BOOKING_REFERENCE",
      "bookingReference is required for activity cancellation.",
    );
  }

  try {
    const result = await createHotelbedsActivitiesClient().cancelActivityBooking(body);

    return NextResponse.json({
      success: true,
      data: sanitize(result),
      ...(isDev()
        ? {
            debug: {
              reason: "activities_cancel_success",
              bookingReference: result.bookingReference,
              status: result.status,
            },
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof HotelbedsActivitiesClientError) {
      return errorResponse(
        error.status || 502,
        error.code,
        "تعذر إلغاء حجز النشاط من Hotelbeds Activities.",
        {
          reason: "hotelbeds_activities_cancel_failed",
          status: error.status,
          message: error.message,
        },
      );
    }

    return errorResponse(500, "ACTIVITIES_CANCEL_FAILED", "تعذر إلغاء حجز النشاط.");
  }
}
