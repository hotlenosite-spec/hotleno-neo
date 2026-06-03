import {
  CANCELLABLE_BOOKING_STATUSES,
  getNextBookingStatus,
} from "@/lib/booking-status";
import { sendBookingStatusNotification } from "@/lib/notifications";
import { MockSupplierProvider } from "@/lib/suppliers";
import type { SupplierCancelBookingRequest } from "@/lib/suppliers";
import Booking, { type IBooking } from "@/models/Booking";
import BookingLog from "@/models/BookingLog";
import SupplierLog from "@/models/SupplierLog";

export interface CancelBookingInput {
  bookingId?: string;
  bookingReference?: string;
  reason?: string;
  requestedBy?: string;
  requestSource: "customer" | "admin" | "b2b";
  userId?: string;
  agencyId?: string;
}

export interface CancelBookingResult {
  booking: IBooking;
  supplierCancelExecuted: boolean;
  refundStatus: "not_required" | "refund_pending" | "manual_review_required";
  message: string;
}

function canUseMockSupplierCancel() {
  return process.env.NODE_ENV !== "production";
}

function isPaidBooking(booking: IBooking) {
  return ["paid", "succeeded"].includes(booking.paymentStatus);
}

function isStripeTestMode() {
  const stripeMode = process.env.STRIPE_MODE || process.env.STRIPE_ENV || "test";
  return stripeMode !== "live";
}

function buildCancellationRequest(
  booking: IBooking,
  reason?: string,
): SupplierCancelBookingRequest {
  return {
    supplierBookingReference:
      booking.supplierBookingReference || booking.bookingReference,
    reason,
    metadata: {
      bookingId: booking._id.toString(),
      bookingReference: booking.bookingReference,
      source: "booking_cancellation_service",
    },
  };
}

async function logCancellation(
  booking: IBooking,
  type: string,
  status: "success" | "failed" | "pending",
  message: string,
  request?: unknown,
  response?: unknown,
  error?: unknown,
) {
  await BookingLog.create({
    bookingId: booking._id,
    type,
    status,
    message,
    request: request ?? null,
    response: response ?? {
      bookingStatus: booking.status,
      paymentStatus: booking.paymentStatus,
      supplierStatus: booking.supplierStatus,
    },
    error: error ?? null,
  });
}

export async function cancelBookingSafely(
  input: CancelBookingInput,
): Promise<CancelBookingResult> {
  const query: Record<string, unknown> = input.bookingId
    ? { _id: input.bookingId }
    : { bookingReference: input.bookingReference };

  if (input.agencyId) {
    query.agencyId = input.agencyId;
  }

  if (input.userId) {
    query.userId = input.userId;
  }

  const booking = await Booking.findOne(query);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
    throw new Error(`Booking cannot be cancelled from status ${booking.status}`);
  }

  booking.status = getNextBookingStatus(
    booking.status,
    "cancellation_requested",
  );
  booking.metadata = {
    ...(booking.metadata ?? {}),
    cancellationRequestedAt: new Date().toISOString(),
    cancellationRequestedBy: input.requestedBy || "",
    cancellationRequestSource: input.requestSource,
    cancellationReason: input.reason || "",
  };
  await booking.save();

  await logCancellation(
    booking,
    "booking_cancellation_requested",
    "pending",
    "Booking cancellation requested before supplier cancel",
    input,
  );

  if (!canUseMockSupplierCancel()) {
    booking.status = getNextBookingStatus(
      booking.status,
      "manual_review_required",
    );
    booking.failureReason =
      "Mock supplier cancellation is disabled in production; manual review is required.";
    booking.lastFailureReason = booking.failureReason;
    await booking.save();

    await logCancellation(
      booking,
      "booking_cancellation_manual_review_required",
      "failed",
      booking.failureReason,
      input,
    );

    await sendBookingStatusNotification({
      booking,
      templateKey: "manual-review-required",
      reason: booking.failureReason,
    });

    return {
      booking,
      supplierCancelExecuted: false,
      refundStatus: "manual_review_required",
      message: booking.failureReason,
    };
  }

  const provider = new MockSupplierProvider();
  const supplierRequest = buildCancellationRequest(booking, input.reason);

  await SupplierLog.create({
    bookingId: booking._id,
    supplier: provider.name,
    type: "supplier_cancel_start",
    status: "started",
    message: "Mock supplier cancellation started; no real supplier was called",
    request: supplierRequest,
  });

  const supplierResponse = await provider.cancelBooking(supplierRequest);

  if (supplierResponse.status !== "cancelled") {
    booking.status = getNextBookingStatus(
      booking.status,
      "manual_review_required",
    );
    booking.failureReason = `Mock supplier cancellation returned ${supplierResponse.status}`;
    booking.lastFailureReason = booking.failureReason;
    await booking.save();

    await SupplierLog.create({
      bookingId: booking._id,
      supplier: provider.name,
      type: "supplier_cancel_failed",
      status: "failed",
      message: booking.failureReason,
      request: supplierRequest,
      response: supplierResponse,
    });

    await sendBookingStatusNotification({
      booking,
      templateKey: "manual-review-required",
      reason: booking.failureReason,
    });

    return {
      booking,
      supplierCancelExecuted: true,
      refundStatus: "manual_review_required",
      message:
        "Supplier cancellation did not complete; refund was not started.",
    };
  }

  booking.status = getNextBookingStatus(booking.status, "cancelled");
  booking.supplierStatus = "cancelled";
  booking.rawSupplierRequest = supplierRequest;
  booking.rawSupplierResponse = supplierResponse;
  booking.metadata = {
    ...(booking.metadata ?? {}),
    cancelledAt: new Date().toISOString(),
    cancellationMode: "mock_supplier_cancel_only",
  };

  let refundStatus: CancelBookingResult["refundStatus"] = "not_required";

  if (isPaidBooking(booking)) {
    if (isStripeTestMode()) {
      booking.status = getNextBookingStatus(booking.status, "refund_pending");
      booking.paymentStatus = "refund_pending";
      booking.metadata = {
        ...(booking.metadata ?? {}),
        refundMode: "test_placeholder_no_stripe_live_refund",
        refundPendingAt: new Date().toISOString(),
      };
      refundStatus = "refund_pending";
    } else {
      booking.paymentStatus = "refund_required";
      booking.metadata = {
        ...(booking.metadata ?? {}),
        refundMode: "live_refund_blocked_manual_review_required",
      };
      refundStatus = "manual_review_required";
    }
  }

  await booking.save();

  await SupplierLog.create({
    bookingId: booking._id,
    supplier: provider.name,
    type: "supplier_cancel_success",
    status: "success",
    message: "Mock supplier cancellation succeeded",
    request: supplierRequest,
    response: supplierResponse,
  });

  await logCancellation(
    booking,
    "booking_cancelled",
    "success",
    "Booking cancellation completed through mock supplier cancellation",
    input,
  );

  await sendBookingStatusNotification({
    booking,
    templateKey: "cancellation-confirmed",
  });

  return {
    booking,
    supplierCancelExecuted: true,
    refundStatus,
    message:
      refundStatus === "refund_pending"
        ? "Booking cancelled and refund is pending in test placeholder mode."
        : "Booking cancelled successfully.",
  };
}
