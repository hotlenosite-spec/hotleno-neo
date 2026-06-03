import { NextRequest } from "next/server";
import {
  authenticateB2BRequest,
  createB2BError,
  createB2BResponse,
  isNextResponse,
  logB2BRequest,
  parseB2BJsonBody,
  requireFields,
} from "@/lib/b2b/api";
import { getB2BMockSupplierProvider } from "@/lib/b2b/supplier";

export async function POST(req: NextRequest) {
  const auth = await authenticateB2BRequest(req);
  if (isNextResponse(auth)) return auth;

  const body = await parseB2BJsonBody<Record<string, unknown>>(req, auth.requestId);
  if (isNextResponse(body)) return body;

  const missingFields = requireFields(body, [
    "supplierHotelId",
    "supplierRateKey",
    "checkIn",
    "checkOut",
  ]);

  if (missingFields.length > 0) {
    return createB2BError(
      auth.requestId,
      400,
      "B2B_VALIDATION_ERROR",
      `Missing required fields: ${missingFields.join(", ")}`,
    );
  }

  try {
    const provider = getB2BMockSupplierProvider();
    const result = await provider.checkAvailability?.({
      supplierHotelId: body.supplierHotelId as string,
      supplierRateKey: body.supplierRateKey as string,
      checkIn: body.checkIn as string,
      checkOut: body.checkOut as string,
      rooms: Array.isArray(body.rooms) ? body.rooms : [{ adults: 1 }],
      currency: (body.currency as string | undefined) || auth.agency.currency,
      metadata: {
        agencyId: auth.agency._id.toString(),
        b2b: true,
      },
    }) ?? await provider.preBook({
      supplierHotelId: body.supplierHotelId as string,
      supplierRateKey: body.supplierRateKey as string,
      checkIn: body.checkIn as string,
      checkOut: body.checkOut as string,
      rooms: Array.isArray(body.rooms) ? body.rooms : [{ adults: 1 }],
      currency: (body.currency as string | undefined) || auth.agency.currency,
    });

    await logB2BRequest({
      requestId: auth.requestId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      agencyId: auth.agency._id.toString(),
      status: "success",
      message: "B2B availability check completed",
      request: body,
      response: result,
    });

    return createB2BResponse(auth.requestId, {
      supplierMode: "mock",
      availability: result,
    });
  } catch (error) {
    await logB2BRequest({
      requestId: auth.requestId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      agencyId: auth.agency._id.toString(),
      status: "failed",
      message: "B2B availability check failed",
      request: body,
      error: { message: error instanceof Error ? error.message : "Unknown error" },
    });

    return createB2BError(
      auth.requestId,
      500,
      "B2B_INTERNAL_ERROR",
      "Unable to complete B2B availability request",
    );
  }
}
