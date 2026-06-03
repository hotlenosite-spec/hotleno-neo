import { NextRequest } from "next/server";
import {
  authenticateB2BRequest,
  createB2BError,
  createB2BResponse,
  isNextResponse,
  logB2BRequest,
  parseB2BJsonBody,
} from "@/lib/b2b/api";
import dbConnect from "@/lib/mongodb";
import { cancelBookingSafely } from "@/lib/booking/cancellation-service";

export async function POST(req: NextRequest) {
  const auth = await authenticateB2BRequest(req);
  if (isNextResponse(auth)) return auth;

  const body = await parseB2BJsonBody<Record<string, unknown>>(req, auth.requestId);
  if (isNextResponse(body)) return body;

  const bookingReference = body.bookingReference as string | undefined;
  const bookingId = body.bookingId as string | undefined;

  if (!bookingReference && !bookingId) {
    return createB2BError(
      auth.requestId,
      400,
      "B2B_VALIDATION_ERROR",
      "bookingReference or bookingId is required",
    );
  }

  try {
    await dbConnect();
    const result = await cancelBookingSafely({
      bookingId,
      bookingReference,
      reason: typeof body.reason === "string" ? body.reason : "",
      requestedBy: auth.agency._id.toString(),
      requestSource: "b2b",
      agencyId: auth.agency._id.toString(),
    });

    const response = {
      bookingReference: result.booking.bookingReference,
      status: result.booking.status,
      supplierCancelExecuted: result.supplierCancelExecuted,
      refundStatus: result.refundStatus,
      message: result.message,
    };

    await logB2BRequest({
      requestId: auth.requestId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      agencyId: auth.agency._id.toString(),
      status: "success",
      message: "B2B cancel completed through safe cancellation service",
      request: body,
      response,
    });

    return createB2BResponse(auth.requestId, response);
  } catch (error) {
    await logB2BRequest({
      requestId: auth.requestId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      agencyId: auth.agency._id.toString(),
      status: "failed",
      message: "B2B cancel failed",
      request: body,
      error: { message: error instanceof Error ? error.message : "Unknown error" },
    });

    return createB2BError(
      auth.requestId,
      500,
      "B2B_INTERNAL_ERROR",
      "Unable to complete B2B cancel request",
    );
  }
}
