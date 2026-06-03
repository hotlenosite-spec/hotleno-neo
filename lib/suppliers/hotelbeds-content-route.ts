import { NextRequest, NextResponse } from "next/server";

import {
  createHotelbedsContentClient,
  HotelbedsContentClientError,
  type HotelbedsContentQuery,
} from "./hotelbeds-content-client";
import {
  getHotelbedsBaseUrls,
  hasHotelbedsCredentials,
} from "./hotelbeds-auth";
import {
  isDevAdminBypassEnabled,
  isDevPreviewAllPagesEnabled,
} from "@/lib/security/dev-flags";

type HotelbedsContentAction = (
  client: ReturnType<typeof createHotelbedsContentClient>,
  query: HotelbedsContentQuery,
) => Promise<unknown>;

export const hotelbedsContentTestRoutes = [
  "/api/integrations/hotelbeds/content/status",
  "/api/integrations/hotelbeds/content/hotels",
  "/api/integrations/hotelbeds/content/hotels/[code]",
  "/api/integrations/hotelbeds/content/countries",
  "/api/integrations/hotelbeds/content/destinations",
  "/api/integrations/hotelbeds/content/rooms",
  "/api/integrations/hotelbeds/content/facilities",
  "/api/integrations/hotelbeds/content/categories",
  "/api/integrations/hotelbeds/content/accommodations",
  "/api/integrations/hotelbeds/content/chains",
  "/api/integrations/hotelbeds/content/boards",
  "/api/integrations/hotelbeds/content/currencies",
  "/api/integrations/hotelbeds/content/facility-groups",
  "/api/integrations/hotelbeds/content/issues",
  "/api/integrations/hotelbeds/content/languages",
  "/api/integrations/hotelbeds/content/promotions",
  "/api/integrations/hotelbeds/content/segments",
  "/api/integrations/hotelbeds/content/terminals",
  "/api/integrations/hotelbeds/content/image-types",
  "/api/integrations/hotelbeds/content/rate-comments",
];

export function isHotelbedsContentTestRouteEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    isDevAdminBypassEnabled() ||
    isDevPreviewAllPagesEnabled()
  );
}

export function getHotelbedsContentRouteStatus() {
  const urls = getHotelbedsBaseUrls();

  return {
    success: true,
    enabled: isHotelbedsContentTestRouteEnabled(),
    configured: hasHotelbedsCredentials(),
    environment: process.env.NODE_ENV,
    contentBaseUrl: urls.contentBaseUrl,
    routes: hotelbedsContentTestRoutes,
    note:
      "Hotelbeds Content API test routes are internal and disabled in production.",
  };
}

function readContentQuery(request: NextRequest): HotelbedsContentQuery {
  const params = request.nextUrl.searchParams;
  const query: HotelbedsContentQuery = {};

  for (const key of [
    "fields",
    "language",
    "from",
    "to",
    "useSecondaryLanguage",
    "lastUpdateTime",
    "codes",
    "countryCode",
    "destinationCode",
  ] as const) {
    const value = params.get(key);
    if (value !== null) {
      query[key] = value;
    }
  }

  return query;
}

function getErrorStatus(error: HotelbedsContentClientError) {
  if (error.code === "HOTELBEDS_MISSING_CREDENTIALS") return 500;
  if (error.code === "HOTELBEDS_UNAUTHORIZED") return 401;
  if (error.code === "HOTELBEDS_FORBIDDEN") return 403;
  if (error.code === "HOTELBEDS_TIMEOUT") return 504;
  if (error.code === "HOTELBEDS_NETWORK_ERROR") return 502;
  if (error.code === "HOTELBEDS_INVALID_RESPONSE") return 502;

  return error.status || 500;
}

export async function runHotelbedsContentRoute(
  request: NextRequest,
  action: HotelbedsContentAction,
) {
  if (!isHotelbedsContentTestRouteEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: "Hotelbeds Content API test routes are disabled in production.",
        code: "HOTELBEDS_CONTENT_ROUTE_DISABLED",
      },
      { status: 404 },
    );
  }

  try {
    const client = createHotelbedsContentClient();
    const data = await action(client, readContentQuery(request));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof HotelbedsContentClientError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          status: error.status,
        },
        { status: getErrorStatus(error) },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected Hotelbeds Content API route failure.",
        code: "HOTELBEDS_CONTENT_ROUTE_ERROR",
      },
      { status: 500 },
    );
  }
}
