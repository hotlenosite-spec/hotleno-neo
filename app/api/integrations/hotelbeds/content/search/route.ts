import { NextRequest, NextResponse } from "next/server";

import { searchHotelbedsContentSuggestions } from "@/lib/suppliers/hotelbeds-content-search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") || "";
  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("limit") || 12), 1),
    20,
  );

  try {
    const result = await searchHotelbedsContentSuggestions(query, limit);
    const debug =
      process.env.NODE_ENV !== "production" && result.debug
        ? { debug: result.debug }
        : {};

    if (result.debug?.reason === "api_failed") {
      return NextResponse.json(
        {
          success: false,
          error: "HOTELBEDS_CONTENT_SEARCH_FAILED",
          ...debug,
        },
        { status: 502 },
      );
    }

    if (result.debug?.reason === "quota_exceeded") {
      return NextResponse.json(
        {
          success: false,
          error: "HOTELBEDS_CONTENT_QUOTA_EXCEEDED",
          ...debug,
        },
        { status: 429 },
      );
    }

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      ...debug,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Hotelbeds Content API] search failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "HOTELBEDS_CONTENT_SEARCH_FAILED",
      },
      { status: 502 },
    );
  }
}