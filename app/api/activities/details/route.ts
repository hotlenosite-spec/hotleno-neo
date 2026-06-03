import { NextRequest, NextResponse } from "next/server";
import {
  createHotelbedsActivitiesClient,
  HotelbedsActivitiesClientError,
} from "@/lib/suppliers/hotelbeds-activities-client";
import type { ActivityDetailsRequest } from "@/types/activities";

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
  let body: ActivityDetailsRequest;

  try {
    body = (await req.json()) as ActivityDetailsRequest;
  } catch {
    return errorResponse(400, "ACTIVITIES_INVALID_JSON", "طلب تفاصيل النشاط غير صالح.");
  }

  if (!body.activityCode || !body.from || !body.to || !body.paxes?.length) {
    return errorResponse(
      400,
      "ACTIVITIES_DETAILS_VALIDATION_ERROR",
      "activityCode, from, to, and paxes are required for activity details/check rate.",
      {
        hasActivityCode: Boolean(body.activityCode),
        hasFrom: Boolean(body.from),
        hasTo: Boolean(body.to),
        hasPaxes: Boolean(body.paxes?.length),
      },
    );
  }

  try {
    const result = await createHotelbedsActivitiesClient().getActivityDetails(body);

    return NextResponse.json({
      success: true,
      data: sanitize(result),
      ...(isDev()
        ? {
            debug: {
              reason: "activities_details_success",
              activityCode: result.activityCode,
              modalityCount: result.modalities?.length || 0,
              questionCount: result.questions?.length || 0,
            },
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof HotelbedsActivitiesClientError) {
      return errorResponse(
        error.status || 502,
        error.code,
        "تعذر جلب تفاصيل النشاط من Hotelbeds Activities.",
        {
          reason: "hotelbeds_activities_details_failed",
          status: error.status,
          message: error.message,
        },
      );
    }

    return errorResponse(500, "ACTIVITIES_DETAILS_FAILED", "تعذر جلب تفاصيل النشاط.");
  }
}
