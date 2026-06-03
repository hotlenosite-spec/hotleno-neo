import { NextResponse } from "next/server";

import { getHotelbedsContentRouteStatus } from "@/lib/suppliers/hotelbeds-content-route";

export async function GET() {
  const status = getHotelbedsContentRouteStatus();

  if (!status.enabled) {
    return NextResponse.json(
      {
        success: false,
        error: "Hotelbeds Content API test routes are disabled in production.",
        code: "HOTELBEDS_CONTENT_ROUTE_DISABLED",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(status);
}
