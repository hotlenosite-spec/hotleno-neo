import { randomUUID } from "crypto";
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
import { sendAgencyBookingCreatedNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const auth = await authenticateB2BRequest(req);
  if (isNextResponse(auth)) return auth;

  const body = await parseB2BJsonBody<Record<string, unknown>>(req, auth.requestId);
  if (isNextResponse(body)) return body;

  const missingFields = requireFields(body, [
    "supplierHotelId",
    "supplierRateKey",
    "leadGuest",
    "totalPrice",
    "currency",
  ]);

  if (missingFields.length > 0) {
    return createB2BError(
      auth.requestId,
      400,
      "B2B_VALIDATION_ERROR",
      `Missing required fields: ${missingFields.join(", ")}`,
    );
  }

  const b2bBookingReference = `B2B-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const response = {
    bookingReference: b2bBookingReference,
    status: "manual_review_required",
    supplierStatus: "not_started",
    supplierBookingExecuted: false,
    message:
      "B2B booking request accepted as an internal draft only. No supplier booking was executed.",
    idempotencyKey:
      (body.idempotencyKey as string | undefined) || `b2b-${b2bBookingReference}`,
  };

  await logB2BRequest({
    requestId: auth.requestId,
    endpoint: req.nextUrl.pathname,
    method: req.method,
    agencyId: auth.agency._id.toString(),
    status: "success",
    message: "B2B booking draft accepted without supplier execution",
    request: body,
    response,
  });

  await sendAgencyBookingCreatedNotification({
    email: auth.agency.email,
    phone: auth.agency.phone,
    agencyName: auth.agency.name,
    bookingReference: b2bBookingReference,
    metadata: {
      requestId: auth.requestId,
      agencyId: auth.agency._id.toString(),
      source: "b2b_booking_api",
    },
  });

  return createB2BResponse(auth.requestId, response, 202);
}
