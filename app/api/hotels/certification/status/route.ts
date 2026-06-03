import { NextResponse } from "next/server";
import {
  hasHotelbedsCredentials,
  isHotelbedsHotelsBookingEnabled,
  isHotelbedsHotelsCertificationAutoRunEnabled,
  isHotelbedsHotelsSearchEnabled,
} from "@/lib/suppliers/hotelbeds-auth";
import { HotelbedsHotelsClient } from "@/lib/suppliers/hotelbeds-hotels-client";

export const runtime = "nodejs";

export async function GET() {
  const isProduction = process.env.NODE_ENV === "production";

  return NextResponse.json({
    success: true,
    environment: process.env.NODE_ENV || "development",
    credentialsConfigured: hasHotelbedsCredentials(),
    searchEnabled: isHotelbedsHotelsSearchEnabled(),
    bookingEnabled: !isProduction && isHotelbedsHotelsBookingEnabled(),
    certificationAutoRunEnabled:
      !isProduction && isHotelbedsHotelsCertificationAutoRunEnabled(),
    requestUsage: HotelbedsHotelsClient.getRequestUsage(),
    limits: {
      minDelayMs: 1100,
      maxRequestsPerRun: 40,
      dailyQuotaCap: 50,
      note: "Certification tooling must run sequentially and stop before quota exhaustion.",
    },
  });
}
