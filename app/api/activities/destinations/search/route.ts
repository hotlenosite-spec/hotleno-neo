import { NextRequest, NextResponse } from "next/server";
import { createHotelbedsActivitiesClient } from "@/lib/suppliers/hotelbeds-activities-client";
import { isHotelbedsActivitiesSearchEnabled } from "@/lib/suppliers/hotelbeds-activities-auth";

const CACHE_TTL_MS = 30 * 60 * 1000;

const cache = new Map<
  string,
  {
    expiresAt: number;
    suggestions: unknown[];
  }
>();

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
  if (error instanceof Error) return error.message.slice(0, 300);
  if (typeof error === "string") return error.slice(0, 300);
  return "Unknown Hotelbeds Activities destination search error.";
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim() || "";
  const cacheKey = query.toLowerCase();

  if (query.length < 2) {
    return NextResponse.json({
      success: true,
      suggestions: [],
      ...(isDev() ? { debug: { reason: "query_too_short" } } : {}),
    });
  }

  if (!isHotelbedsActivitiesSearchEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: "HOTELBEDS_ACTIVITIES_SEARCH_DISABLED",
        message: "بحث الأنشطة غير مفعل في هذه البيئة.",
        ...(isDev()
          ? {
              debug: {
                reason: "activities_search_disabled",
                env: "HOTELBEDS_ACTIVITIES_SEARCH_ENABLED must be true",
              },
            }
          : {}),
      },
      { status: 503 },
    );
  }

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      success: true,
      suggestions: cached.suggestions,
      ...(isDev()
        ? {
            debug: {
              reason: "memory_cache",
              itemCount: cached.suggestions.length,
            },
          }
        : {}),
    });
  }

  try {
    const suggestions =
      await createHotelbedsActivitiesClient().searchDestinations(query);

    cache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      suggestions,
    });

    return NextResponse.json({
      success: true,
      suggestions,
      ...(isDev()
        ? {
            debug: {
              endpoint: "activities destinations search",
              itemCount: suggestions.length,
              reason: suggestions.length > 0 ? "matches_found" : "no_matches",
            },
          }
        : {}),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "HOTELBEDS_ACTIVITIES_DESTINATION_SEARCH_FAILED",
        message: "تعذر جلب وجهات الأنشطة من Hotelbeds Activities.",
        ...(isDev()
          ? {
              debug: {
                endpoint: "activities destinations search",
                itemCount: 0,
                reason: "hotelbeds_activities_content_failed",
                httpStatus: getErrorStatus(error),
                errorCode: getErrorCode(error),
                message: getErrorMessage(error),
              },
            }
          : {}),
      },
      { status: 502 },
    );
  }
}