import { NextRequest } from "next/server";
import {
  buildHotelbedsAvailabilityBody,
  createHotelbedsHotelsClient,
  DEFAULT_AVAILABILITY_REQUEST,
  requireAccessAndEnvironment,
  runHotelbedsStep,
} from "../_shared";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = requireAccessAndEnvironment(req);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const request = {
    ...DEFAULT_AVAILABILITY_REQUEST,
    ...(body?.request && typeof body.request === "object" ? body.request : {}),
  };

  return runHotelbedsStep({
    step: "availability",
    endpoint: "POST /hotel-api/1.0/hotels",
    request,
    supplierRequest: buildHotelbedsAvailabilityBody(request),
    execute: () => createHotelbedsHotelsClient().availability(request),
  });
}
