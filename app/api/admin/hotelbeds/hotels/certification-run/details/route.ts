import { NextRequest } from "next/server";
import { readAccommodationCertificationLog } from "@/lib/certification/hotelbeds-accommodation-certification-log";
import {
  createHotelbedsHotelsClient,
  jsonError,
  requireAccessAndEnvironment,
  runHotelbedsStep,
} from "../_shared";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = requireAccessAndEnvironment(req, true);
  if (blocked) return blocked;

  const log = await readAccommodationCertificationLog();
  const bookingReference = log.supplierBookingReference || "";

  if (!bookingReference) {
    return jsonError(400, "HOTELBEDS_CERTIFICATION_BOOKING_REFERENCE_MISSING", "Run Booking first to capture a booking reference.");
  }

  const request = { bookingReference, language: "en" };
  return runHotelbedsStep({
    step: "details",
    endpoint: `GET /hotel-api/1.0/bookings/${bookingReference}`,
    request,
    supplierRequest: request,
    execute: () => createHotelbedsHotelsClient().bookingDetails(request),
  });
}
