import { NextResponse } from "next/server";
import {
  isHotelbedsActivitiesBookingEnabled,
  isHotelbedsActivitiesSearchEnabled,
} from "@/lib/suppliers/hotelbeds-activities-auth";

export async function GET() {
  const isProduction = process.env.NODE_ENV === "production";

  return NextResponse.json({
    success: true,
    environment: isProduction ? "production" : "development",
    searchEnabled: isHotelbedsActivitiesSearchEnabled(),
    bookingEnabled: !isProduction && isHotelbedsActivitiesBookingEnabled(),
    message:
      "Activities booking is enabled only for test/dev certification.",
  });
}
