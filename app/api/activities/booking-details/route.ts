import { NextRequest, NextResponse } from "next/server";
import {
  createHotelbedsActivitiesClient,
  HotelbedsActivitiesClientError,
} from "@/lib/suppliers/hotelbeds-activities-client";
import type { ActivityBookingDetailsRequest } from "@/types/activities";

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
  let body: ActivityBookingDetailsRequest;

  try {
    body = (await req.json()) as ActivityBookingDetailsRequest;
  } catch {
    return errorResponse(400, "ACTIVITIES_INVALID_JSON", "طلب تفاصيل حجز النشاط غير صالح.");
  }

  if (!body.bookingReference) {
    return errorResponse(
      400,
      "ACTIVITIES_MISSING_BOOKING_REFERENCE",
      "bookingReference is required for activity booking details.",
    );
  }

  try {
    const result = await createHotelbedsActivitiesClient().getActivityBookingDetails(body);

    return NextResponse.json({
      success: true,
      data: sanitize(result),
      ...(isDev()
        ? {
            debug: {
              reason: "activities_booking_details_success",
              bookingReference: result.bookingReference,
              status: result.status,
              hasOfficialVoucher: Boolean(result.voucher?.officialVouchers?.length),
            },
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof HotelbedsActivitiesClientError) {
      return errorResponse(
        error.status || 502,
        error.code,
        "تعذر جلب تفاصيل حجز النشاط من Hotelbeds Activities.",
        {
          reason: "hotelbeds_activities_booking_details_failed",
          status: error.status,
          message: error.message,
        },
      );
    }

    return errorResponse(500, "ACTIVITIES_BOOKING_DETAILS_FAILED", "تعذر جلب تفاصيل حجز النشاط.");
  }
}
