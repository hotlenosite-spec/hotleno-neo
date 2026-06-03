import dbConnect from "@/lib/mongodb";
import {
  getNextBookingStatus,
  type BookingStatus,
} from "@/lib/booking-status";
import { MockSupplierProvider } from "@/lib/suppliers";
import type { SupplierBookRequest, SupplierProvider } from "@/lib/suppliers";
import { sendBookingStatusNotification } from "@/lib/notifications";
import Booking, { type IBooking } from "@/models/Booking";
import BookingLog from "@/models/BookingLog";
import SupplierLog from "@/models/SupplierLog";

export interface RunBookingAfterPaymentResult {
  bookingId: string;
  status: BookingStatus;
  supplierStatus: IBooking["supplierStatus"];
  supplierBookingReference?: string;
  providerCalled: boolean;
  message: string;
}

function shouldUseMockSupplierBooking() {
  return (
    process.env.MOCK_SUPPLIER_BOOKING_ENABLED === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

function splitLeadGuestName(leadGuest: string) {
  const cleanName = leadGuest.replace(/^(Mr|Mrs|Miss|Ms|Dr)\.?\s+/i, "").trim();
  const [firstName = "Guest", ...rest] = cleanName.split(/\s+/).filter(Boolean);

  return {
    firstName,
    lastName: rest.join(" ") || "Hotleno",
  };
}

function buildSupplierBookRequest(booking: IBooking): SupplierBookRequest {
  const leadGuest = splitLeadGuestName(booking.leadGuest);

  return {
    idempotencyKey: booking.idempotencyKey || createBookingIdempotencyKey(booking),
    supplierHotelId: booking.supplierHotelId || String(booking.hotelId || ""),
    supplierRateKey: booking.supplierRateKey || "",
    leadGuest: {
      ...leadGuest,
      email: booking.contactEmail,
      phone: booking.contactPhone,
    },
    metadata: {
      bookingId: booking._id.toString(),
      bookingReference: booking.bookingReference,
      source: "booking_orchestrator",
    },
  };
}

function createBookingIdempotencyKey(booking: IBooking) {
  if (booking.idempotencyKey) return booking.idempotencyKey;

  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `booking-${booking._id?.toString() || randomPart}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Supplier booking failed";
}

function isTransientSupplierError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return [
    "timeout",
    "timed out",
    "network",
    "rate limit",
    "too many requests",
    "temporarily",
    "temporary",
    "econnreset",
    "etimedout",
    "5xx",
    "500",
    "502",
    "503",
    "504",
  ].some((pattern) => message.includes(pattern));
}

function isPermanentSupplierError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return [
    "not implemented",
    "invalid",
    "missing",
    "not available",
    "not found",
    "access denied",
    "unauthorized",
    "forbidden",
    "validation",
  ].some((pattern) => message.includes(pattern));
}

async function logBookingTransition(
  booking: IBooking,
  type: string,
  message: string,
) {
  await BookingLog.create({
    bookingId: booking._id,
    type,
    status: "success",
    message,
    response: {
      bookingStatus: booking.status,
      paymentStatus: booking.paymentStatus,
      supplierStatus: booking.supplierStatus,
    },
  });
}

async function markManualReviewRequired(
  booking: IBooking,
  reason: string,
  error?: unknown,
) {
  booking.status = getNextBookingStatus(booking.status, "manual_review_required");
  booking.supplierStatus = "failed";
  booking.failureReason = reason;
  booking.lastFailureReason = reason;
  booking.metadata = {
    ...(booking.metadata ?? {}),
    manualReviewRequiredAt: new Date().toISOString(),
    manualReviewReason: reason,
  };

  await booking.save();

  await SupplierLog.create({
    bookingId: booking._id,
    supplier: booking.supplier || "none",
    type: "supplier_booking_manual_review_required",
    status: "failed",
    message: reason,
    request: {
      supplier: booking.supplier || "none",
      supplierHotelId: booking.supplierHotelId || "",
      supplierRateKey: booking.supplierRateKey || "",
    },
    response: {
      bookingStatus: booking.status,
      supplierStatus: booking.supplierStatus,
    },
    error: error ?? null,
  });

  await sendBookingStatusNotification({
    booking,
    templateKey: "manual-review-required",
    reason,
  });
}

function getSafeSupplierProvider(): SupplierProvider | null {
  if (shouldUseMockSupplierBooking()) {
    return new MockSupplierProvider();
  }

  return null;
}

async function markSupplierBookingFailed(
  booking: IBooking,
  reason: string,
  supplier: string,
  request: SupplierBookRequest,
  response?: unknown,
  error?: unknown,
) {
  booking.status = getNextBookingStatus(booking.status, "supplier_booking_failed");
  booking.supplierStatus = "failed";
  booking.failureReason = reason;
  booking.lastFailureReason = reason;
  await booking.save();

  await SupplierLog.create({
    bookingId: booking._id,
    supplier,
    type: "supplier_booking_failed",
    status: "failed",
    message: reason,
    request,
    response: response ?? null,
    error: error ?? null,
  });

  await sendBookingStatusNotification({
    booking,
    templateKey: "booking-failed",
    reason,
  });
}

export async function runBookingAfterPayment(
  bookingId: string,
): Promise<RunBookingAfterPaymentResult> {
  await dbConnect();

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  if (booking.paymentStatus !== "paid") {
    await markManualReviewRequired(
      booking,
      "Booking orchestrator stopped because payment is not marked as paid",
    );

    return {
      bookingId,
      status: booking.status,
      supplierStatus: booking.supplierStatus,
      providerCalled: false,
      message: booking.failureReason || "Payment is not paid",
    };
  }

  if (booking.status === "supplier_booking_confirmed") {
    return {
      bookingId,
      status: booking.status,
      supplierStatus: booking.supplierStatus,
      supplierBookingReference: booking.supplierBookingReference,
      providerCalled: false,
      message: "Booking already confirmed",
    };
  }

  if (booking.supplierBookingReference) {
    return {
      bookingId,
      status: booking.status,
      supplierStatus: booking.supplierStatus,
      supplierBookingReference: booking.supplierBookingReference,
      providerCalled: false,
      message:
        "Supplier booking reference already exists; duplicate supplier booking was prevented",
    };
  }

  if (
    !booking.supplierHotelId ||
    !booking.supplierRateKey ||
    booking.supplier === "none"
  ) {
    await markManualReviewRequired(
      booking,
      "Supplier booking cannot start because supplier hotel/rate data is missing",
    );

    return {
      bookingId,
      status: booking.status,
      supplierStatus: booking.supplierStatus,
      providerCalled: false,
      message: booking.failureReason || "Missing supplier data",
    };
  }

  booking.status = getNextBookingStatus(
    booking.status,
    "supplier_booking_processing",
  );
  booking.supplierStatus = "pending";
  booking.idempotencyKey = createBookingIdempotencyKey(booking);
  booking.metadata = {
    ...(booking.metadata ?? {}),
    supplierBookingProcessingAt: new Date().toISOString(),
    bookingOrchestratorVersion: "v1",
  };
  await booking.save();

  await logBookingTransition(
    booking,
    "booking_orchestrator_processing_started",
    "Booking moved to supplier booking processing after paid payment",
  );

  const provider = getSafeSupplierProvider();

  if (!provider) {
    await markManualReviewRequired(
      booking,
      "No safe supplier provider is enabled. Real supplier booking is intentionally disabled.",
    );

    return {
      bookingId,
      status: booking.status,
      supplierStatus: booking.supplierStatus,
      providerCalled: false,
      message: booking.failureReason || "No safe supplier provider enabled",
    };
  }

  const supplierRequest = buildSupplierBookRequest(booking);

  await SupplierLog.create({
    bookingId: booking._id,
    supplier: provider.name,
    type: "supplier_booking_start",
    status: "started",
    message: "Booking orchestrator started supplier booking through safe provider",
    request: supplierRequest,
  });

  const maxRetryCount = Math.max(0, booking.maxRetryCount ?? 3);
  let lastError: unknown = null;

  for (let attempt = booking.retryCount + 1; attempt <= maxRetryCount; attempt += 1) {
    booking.retryCount = attempt;
    booking.lastRetryAt = new Date();
    await booking.save();

    await SupplierLog.create({
      bookingId: booking._id,
      supplier: provider.name,
      type: "supplier_booking_attempt",
      status: "started",
      message: `Supplier booking attempt ${attempt} of ${maxRetryCount}`,
      request: {
        ...supplierRequest,
        attempt,
        maxRetryCount,
      },
    });

    try {
    const supplierResponse = await provider.book(supplierRequest);

    booking.rawSupplierRequest = supplierResponse.rawSupplierRequest ?? supplierRequest;
    booking.rawSupplierResponse = supplierResponse.rawSupplierResponse ?? supplierResponse;
    booking.supplierBookingReference = supplierResponse.supplierBookingReference;
    booking.supplier = supplierResponse.supplier;

    if (supplierResponse.status === "confirmed") {
      booking.status = getNextBookingStatus(
        booking.status,
        "supplier_booking_confirmed",
      );
      booking.supplierStatus = "confirmed";
      booking.failureReason = "";
      booking.metadata = {
        ...(booking.metadata ?? {}),
        supplierBookingConfirmedAt: new Date().toISOString(),
      };
      await booking.save();

      await SupplierLog.create({
        bookingId: booking._id,
        supplier: supplierResponse.supplier,
        type: "supplier_booking_success",
        status: "success",
        message: "Supplier booking confirmed through booking orchestrator",
        request: supplierRequest,
        response: supplierResponse,
      });

      await sendBookingStatusNotification({
        booking,
        templateKey: "booking-confirmed",
      });

      return {
        bookingId,
        status: booking.status,
        supplierStatus: booking.supplierStatus,
        supplierBookingReference: booking.supplierBookingReference,
        providerCalled: true,
        message: "Supplier booking confirmed",
      };
    }

    await markSupplierBookingFailed(
      booking,
      `Supplier returned final non-confirmed status: ${supplierResponse.status}`,
      supplierResponse.supplier,
      supplierRequest,
      supplierResponse,
    );

    return {
      bookingId,
      status: booking.status,
      supplierStatus: booking.supplierStatus,
      supplierBookingReference: booking.supplierBookingReference,
      providerCalled: true,
      message: booking.failureReason,
    };
    } catch (error) {
      lastError = error;
      const failureReason = getErrorMessage(error);
      booking.lastFailureReason = failureReason;
      booking.failureReason = failureReason;
      await booking.save();

      await SupplierLog.create({
        bookingId: booking._id,
        supplier: provider.name,
        type: "supplier_booking_attempt_failed",
        status: "failed",
        message: failureReason,
        request: {
          ...supplierRequest,
          attempt,
          maxRetryCount,
          transient: isTransientSupplierError(error),
          permanent: isPermanentSupplierError(error),
        },
        error,
      });

      if (isPermanentSupplierError(error) || !isTransientSupplierError(error)) {
        await markSupplierBookingFailed(
          booking,
          failureReason,
          provider.name,
          supplierRequest,
          null,
          error,
        );

        return {
          bookingId,
          status: booking.status,
          supplierStatus: booking.supplierStatus,
          providerCalled: true,
          message: booking.failureReason,
        };
      }
    }
  }

  await markManualReviewRequired(
    booking,
    `Supplier booking failed after ${maxRetryCount} retry attempts: ${getErrorMessage(lastError)}`,
    lastError,
  );

  return {
    bookingId,
    status: booking.status,
    supplierStatus: booking.supplierStatus,
    providerCalled: true,
    message: booking.failureReason,
  };
}
