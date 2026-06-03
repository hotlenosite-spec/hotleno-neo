import { NextRequest, NextResponse } from "next/server";
import {
  createHotelbedsActivitiesClient,
  HotelbedsActivitiesClientError,
} from "@/lib/suppliers/hotelbeds-activities-client";
import type { ActivitySearchRequest } from "@/types/activities";

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function getErrorStatus(error: unknown) {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }

  return undefined;
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }

  return undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 1000);
  if (typeof error === "string") return error.slice(0, 1000);
  return "Unknown Hotelbeds Activities search error.";
}

function errorResponse(
  status: number,
  message: string,
  code = "ACTIVITIES_SEARCH_FAILED",
  debug?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error: code,
      message,
      ...(isDev() && debug ? { debug } : {}),
    },
    { status },
  );
}

function sanitizeResult<T extends { rawSupplierRequest?: unknown; rawSupplierResponse?: unknown }>(
  result: T,
) {
  return {
    ...result,
    rawSupplierRequest: undefined,
    rawSupplierResponse: undefined,
  };
}

export async function POST(req: NextRequest) {
  let body: ActivitySearchRequest;

  try {
    body = (await req.json()) as ActivitySearchRequest;
  } catch {
    return errorResponse(400, "طلب البحث عن الأنشطة غير صالح.", "INVALID_JSON", {
      reason: "invalid_json_body",
    });
  }

  if (!body.destinationCode || !body.from || !body.to || !body.adults) {
    return errorResponse(
      400,
      "يرجى اختيار الوجهة وإدخال التواريخ وعدد المسافرين.",
      "ACTIVITIES_VALIDATION_ERROR",
      {
        reason: "missing_required_fields",
        hasDestinationCode: Boolean(body.destinationCode),
        hasFrom: Boolean(body.from),
        hasTo: Boolean(body.to),
        hasAdults: Boolean(body.adults),
        requestBody: body,
      },
    );
  }

  try {
    const result = await createHotelbedsActivitiesClient().searchActivities(body);

    return NextResponse.json({
      success: true,
      data: sanitizeResult(result),
      ...(isDev()
        ? {
            debug: {
              reason: "activities_search_success",
              optionCount: result.options.length,
            },
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof HotelbedsActivitiesClientError) {
      return errorResponse(
        error.status || 502,
        "تعذر البحث عن الأنشطة من Hotelbeds مؤقتًا.",
        error.code,
        {
          reason: "hotelbeds_activities_search_failed",
          httpStatus: getErrorStatus(error),
          errorCode: getErrorCode(error),
          message: getErrorMessage(error),
          requestBody: body,
        },
      );
    }

    return errorResponse(500, "تعذر البحث عن الأنشطة مؤقتًا.", "ACTIVITIES_SEARCH_FAILED", {
      reason: "unexpected_activities_search_error",
      message: getErrorMessage(error),
      requestBody: body,
    });
  }
}
