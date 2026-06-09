import { NextRequest } from "next/server";
import {
  buildHotelbedsCheckRateBody,
  createCheckRateRequest,
  createHotelbedsHotelsClient,
  getCurrentRateKeys,
  jsonError,
  requireAccessAndEnvironment,
  runHotelbedsStep,
} from "../_shared";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = requireAccessAndEnvironment(req);
  if (blocked) return blocked;

  const rateKeys = await getCurrentRateKeys();
  if (!rateKeys.length) {
    return jsonError(400, "HOTELBEDS_CERTIFICATION_RATE_KEYS_MISSING", "Run Availability first to capture rate keys.");
  }

  const request = createCheckRateRequest(rateKeys);
  return runHotelbedsStep({
    step: "checkrate",
    endpoint: "POST /hotel-api/1.0/checkrates",
    request,
    supplierRequest: buildHotelbedsCheckRateBody(request),
    execute: () => createHotelbedsHotelsClient().checkRate(request),
  });
}
