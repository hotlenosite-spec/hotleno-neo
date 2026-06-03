import { NextRequest } from "next/server";
import {
  authenticateB2BRequest,
  createB2BError,
  createB2BResponse,
  isNextResponse,
  logB2BRequest,
} from "@/lib/b2b/api";
import dbConnect from "@/lib/mongodb";
import Booking from "@/models/Booking";

export async function GET(req: NextRequest) {
  const auth = await authenticateB2BRequest(req);
  if (isNextResponse(auth)) return auth;

  const bookingReference = req.nextUrl.searchParams.get("bookingReference");
  const bookingId = req.nextUrl.searchParams.get("bookingId");

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
    const query = bookingId
      ? { _id: bookingId, agencyId: auth.agency._id }
      : { bookingReference, agencyId: auth.agency._id };
    const booking = await Booking.findOne(query).select(
      "bookingReference status paymentStatus supplierStatus supplierBookingReference failureReason totalPrice currency createdAt updatedAt",
    );

    if (!booking) {
      await logB2BRequest({
        requestId: auth.requestId,
        endpoint: req.nextUrl.pathname,
        method: req.method,
        agencyId: auth.agency._id.toString(),
        status: "skipped",
        message: "B2B booking status not found",
        request: { bookingReference, bookingId },
      });

      return createB2BError(
        auth.requestId,
        404,
        "B2B_BOOKING_NOT_FOUND",
        "Booking was not found for this agency",
      );
    }

    const response = { booking };

    await logB2BRequest({
      requestId: auth.requestId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      agencyId: auth.agency._id.toString(),
      status: "success",
      message: "B2B booking status returned",
      request: { bookingReference, bookingId },
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
      message: "B2B booking status failed",
      request: { bookingReference, bookingId },
      error: { message: error instanceof Error ? error.message : "Unknown error" },
    });

    return createB2BError(
      auth.requestId,
      500,
      "B2B_INTERNAL_ERROR",
      "Unable to complete B2B booking status request",
    );
  }
}
