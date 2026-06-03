import { NextRequest, NextResponse } from "next/server";
import { isHotelbedsActivitiesBookingEnabled } from "@/lib/suppliers/hotelbeds-activities-auth";
import {
  createHotelbedsActivitiesClient,
  HotelbedsActivitiesClientError,
} from "@/lib/suppliers/hotelbeds-activities-client";
import type { ActivityBookingRequest } from "@/types/activities";

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

function hasMissingRequiredAnswers(body: ActivityBookingRequest) {
  for (const activity of body.activities || []) {
    const questions = activity.answers?.map((answer) => answer.question) || [];
    const missing = questions.some((question) => question.required && !activity.answers?.some((answer) => answer.question.code === question.code && answer.answer));
    if (missing) return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  let body: ActivityBookingRequest;

  try {
    body = (await req.json()) as ActivityBookingRequest;
  } catch {
    return errorResponse(400, "ACTIVITIES_INVALID_JSON", "طلب حجز النشاط غير صالح.");
  }

  if (!isHotelbedsActivitiesBookingEnabled()) {
    return errorResponse(
      403,
      "HOTELBEDS_ACTIVITIES_BOOKING_DISABLED",
      "Hotelbeds Activities booking is disabled in this environment.",
    );
  }

  if (!body.clientReference || !body.holder?.name || !body.holder?.surname || !body.activities?.length) {
    return errorResponse(
      400,
      "ACTIVITIES_BOOKING_VALIDATION_ERROR",
      "clientReference, holder, and selected activities are required.",
    );
  }

  if (body.activities.some((activity) => !activity.rateKey)) {
    return errorResponse(400, "ACTIVITIES_MISSING_RATE_KEY", "rateKey is required for every selected activity.");
  }

  if (hasMissingRequiredAnswers(body)) {
    return errorResponse(
      400,
      "ACTIVITIES_REQUIRED_ANSWERS_MISSING",
      "Required activity questions must be answered before booking.",
    );
  }

  try {
    const result = await createHotelbedsActivitiesClient().bookActivity(body);

    return NextResponse.json({
      success: true,
      data: sanitize(result),
      ...(isDev()
        ? {
            debug: {
              reason: "activities_booking_success",
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
        "تعذر تأكيد حجز النشاط من Hotelbeds Activities.",
        {
          reason: "hotelbeds_activities_booking_failed",
          status: error.status,
          message: error.message,
        },
      );
    }

    return errorResponse(500, "ACTIVITIES_BOOKING_FAILED", "تعذر تأكيد حجز النشاط.");
  }
}
