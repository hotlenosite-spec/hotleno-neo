import { NextRequest } from "next/server";
import {
  buildHotelbedsBookingBody,
  createBookingRequest,
  createHotelbedsHotelsClient,
  getCurrentRateKeys,
  jsonError,
  requireAccessAndEnvironment,
  runHotelbedsStep,
} from "../_shared";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = requireAccessAndEnvironment(req, true);
  if (blocked) return blocked;

  const rateKeys = await getCurrentRateKeys();
  if (!rateKeys.length) {
    return jsonError(400, "HOTELBEDS_CERTIFICATION_RATE_KEYS_MISSING", "Run Availability and CheckRate before Booking.");
  }

  const request = createBookingRequest(rateKeys);
  return runHotelbedsStep({
    step: "booking",
    endpoint: "POST /hotel-api/1.0/bookings",
    request,
    supplierRequest: buildHotelbedsBookingBody(request),
    internalBookingReference: request.clientReference,
    execute: () => createHotelbedsHotelsClient().book(request),
  });
}
