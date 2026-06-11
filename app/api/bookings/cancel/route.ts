import { NextRequest, NextResponse } from "next/server";
import { createLog } from "@/lib/firebase-store";
import { getCustomerBooking, updateCustomerBookingStatus } from "@/lib/account-store";
import { CANCELLABLE_BOOKING_STATUSES } from "@/lib/booking-status";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { verifyToken } from "@/lib/jwt";
import { TboSupplierProvider } from "@/lib/suppliers/tbo-provider";
import {
  createHotelbedsHotelsClient,
  HotelbedsHotelsClientError,
} from "@/lib/suppliers/hotelbeds-hotels-client";
import { getHotelbedsBaseUrls, hasHotelbedsCredentials } from "@/lib/suppliers/hotelbeds-auth";
import type { AccountBooking } from "@/lib/account-store";

function safeErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : "Unable to cancel booking")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

function normalizeSupplierCancelError(message: string) {
  return message === "wrong_cancel_endpoint_or_404" ||
    message.includes("404") ||
    message.toLowerCase().includes("no http resource")
    ? "wrong_cancel_endpoint_or_404"
    : message;
}

function getMetadata(booking: { metadata?: unknown }) {
  return booking.metadata && typeof booking.metadata === "object"
    ? (booking.metadata as Record<string, unknown>)
    : {};
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeHotelbedsResponse(payload: unknown) {
  const record = asRecord(payload);
  const booking = asRecord(record.booking);
  const error = asRecord(record.error);

  return {
    status:
      asString(record.status) ||
      asString(booking.status) ||
      asString(error.code) ||
      asString(record.code),
    reference:
      asString(record.reference) ||
      asString(record.bookingReference) ||
      asString(booking.reference) ||
      asString(booking.bookingReference),
    cancellationReference:
      asString(record.cancellationReference) ||
      asString(booking.cancellationReference),
    errorMessage:
      asString(error.message) ||
      asString(error.description) ||
      asString(record.message) ||
      asString(record.error),
  };
}

function getHotelbedsReference(booking: AccountBooking) {
  const metadata = getMetadata(booking);
  const hotelbedsFlow = asRecord(metadata.hotelbedsFlow);

  return (
    asString(booking.supplierReference) ||
    asString(metadata.hotelbedsBookingReference) ||
    asString(hotelbedsFlow.hotelbedsReference) ||
    asString(booking.supplierBookingReference) ||
    asString(booking.supplierBookingId) ||
    asString(booking.supplierConfirmationNo)
  );
}

function isHotelbedsTestBookingBaseUrl() {
  return getHotelbedsBaseUrls().bookingBaseUrl.includes("api.test.hotelbeds.com");
}

async function getBookingForCancellation(
  decoded: ReturnType<typeof verifyToken>,
  bookingId: string,
  source: unknown,
) {
  if (source === "admin") {
    if (decoded.role !== "admin") return null;
    const db = await getFirestoreMongoDb();
    return db.collection<AccountBooking>("bookings").findOne({ _id: bookingId });
  }

  return getCustomerBooking(decoded, bookingId);
}

async function updateBookingForCancellation(
  decoded: ReturnType<typeof verifyToken>,
  bookingId: string,
  updates: Record<string, unknown>,
  source: unknown,
) {
  if (source === "admin") {
    if (decoded.role !== "admin") return null;
    const db = await getFirestoreMongoDb();
    await db.collection<AccountBooking>("bookings").updateOne(
      { _id: bookingId },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      },
    );
    return db.collection<AccountBooking>("bookings").findOne({ _id: bookingId });
  }

  return updateCustomerBookingStatus(decoded, bookingId, updates);
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const body = await req.json();
    const bookingId = body.bookingId as string | undefined;
    const source = body.source;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const booking = await getBookingForCancellation(decoded, bookingId, source);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const supplier = String(booking.supplier || "").toLowerCase();
    const supplierStatus = String(booking.supplierStatus || "").toLowerCase();
    const metadata = getMetadata(booking);
    const canRetryFailedSupplierCancellation =
      booking.supplierStatus === "confirmed" && booking.cancellationStatus === "failed";
    const canRetryHotelbedsLocalOnlyCancellation =
      supplier === "hotelbeds" &&
      booking.status === "cancellation_requested" &&
      supplierStatus === "confirmed" &&
      metadata.cancellationMode === "local_only";
    if (
      !canRetryFailedSupplierCancellation &&
      !canRetryHotelbedsLocalOnlyCancellation &&
      !CANCELLABLE_BOOKING_STATUSES.includes(booking.status as never)
    ) {
      return NextResponse.json(
        { error: "Booking cannot be cancelled from its current status" },
        { status: 400 },
      );
    }

    const tboCancelEnabled = process.env.TBO_CANCEL_ENABLED === "true";
    const supplierBookingId = String(booking.supplierBookingId || "").trim();
    const supplierConfirmationNo = String(booking.supplierConfirmationNo || "").trim();
    const supplierReference = String(
      booking.supplierReference ||
        booking.supplierBookingReference ||
        booking.bookingReference ||
        "",
    ).trim();
    const shouldCancelTbo =
      supplier === "tbo" &&
      tboCancelEnabled &&
      supplierStatus === "confirmed" &&
      Boolean(supplierBookingId || supplierConfirmationNo || supplierReference);
    const hotelbedsReference = getHotelbedsReference(booking);
    const hasHotelbedsCancelAccess =
      (decoded.role === "supplier_tester" && decoded.supplierScope === "hotelbeds") ||
      decoded.role === "admin";
    const shouldCancelHotelbeds =
      supplier === "hotelbeds" &&
      hasHotelbedsCancelAccess &&
      Boolean(hotelbedsReference);

    if (shouldCancelHotelbeds) {
      const now = new Date();
      const endpointType = "DELETE /hotel-api/1.0/bookings/{reference}?cancellationFlag=CANCELLATION";
      const baseFlow = {
        requestedAt: now.toISOString(),
        referenceUsed: hotelbedsReference,
        endpointType,
      };

      if (!isHotelbedsTestBookingBaseUrl() || !hasHotelbedsCredentials()) {
        const message = !isHotelbedsTestBookingBaseUrl()
          ? "Hotelbeds supplier cancel is disabled outside the test environment."
          : "Hotelbeds supplier cancel is disabled in this environment.";
        const updatedBooking = await updateBookingForCancellation(decoded, bookingId, {
          status: "cancellation_requested",
          bookingStatus: "cancellation_requested",
          supplierStatus: booking.supplierStatus || "CONFIRMED",
          cancellationStatus: "failed",
          supplierCancellationStatus: "failed",
          supplierCancellationError: message,
          cancellationRequestedAt: now,
          cancellationReason: typeof body.reason === "string" ? body.reason : "",
          metadata: {
            ...getMetadata(booking),
            supplierCancellation: "failed",
            supplierCancelError: message,
            supplierCancelFailedAt: now.toISOString(),
            cancellationMode: "hotelbeds_supplier_cancel",
            hotelbedsCancellationFlow: {
              ...baseFlow,
              status: "failed",
              supplierStatus: booking.supplierStatus || "",
              errorMessage: message,
            },
          },
        }, source);

        await createLog({
          supplier: "hotelbeds",
          type: "supplier_cancellation_failed",
          status: "failed",
          message,
          request: { bookingId, referenceUsed: hotelbedsReference, endpointType },
          response: { status: updatedBooking?.status, supplierStatus: updatedBooking?.supplierStatus },
          error: message,
        });

        return NextResponse.json({
          success: false,
          message,
          supplierCancelExecuted: false,
          booking: updatedBooking,
        }, { status: 409 });
      }

      try {
        console.info("[Hotelbeds Cancellation Flow]", {
          bookingId,
          referencePresent: Boolean(hotelbedsReference),
          endpointType,
          supplierTester: decoded.role === "supplier_tester",
        });

        const client = createHotelbedsHotelsClient({ allowTesterBookingOverride: true });
        const supplierResponse = await client.cancel({
          bookingReference: hotelbedsReference,
          cancellationFlag: "CANCELLATION",
        });
        const safeResponse = safeHotelbedsResponse(supplierResponse);
        const supplierCancellationStatus =
          safeResponse.status || "CANCELLED";
        const updatedBooking = await updateBookingForCancellation(decoded, bookingId, {
          status: "cancelled",
          bookingStatus: "cancelled",
          supplierStatus: "CANCELLED",
          cancellationStatus: "cancelled",
          supplierCancellationStatus: "CANCELLED",
          cancelledAt: now,
          cancellationRequestedAt: now,
          cancellationReason: typeof body.reason === "string" ? body.reason : "",
          rawSupplierCancelResponse: safeResponse,
          metadata: {
            ...getMetadata(booking),
            supplierSubmission: "supplier_cancelled",
            supplierCancellation: "sent_to_supplier",
            supplierCancelledAt: now.toISOString(),
            cancellationMode: "hotelbeds_supplier_cancel",
            hotelbedsCancellationStatus: "CANCELLED",
            hotelbedsCancellationResponseSafe: safeResponse,
            hotelbedsCancellationFlow: {
              ...baseFlow,
              status: "success",
              supplierStatus: supplierCancellationStatus,
              cancellationReference: safeResponse.cancellationReference || safeResponse.reference || "",
              safeResponse,
            },
          },
        }, source);

        await createLog({
          supplier: "hotelbeds",
          type: "supplier_cancellation_confirmed",
          status: "success",
          message: "Hotelbeds Accommodation booking was cancelled at supplier",
          request: { bookingId, referenceUsed: hotelbedsReference, endpointType },
          response: {
            status: updatedBooking?.status,
            supplierStatus: updatedBooking?.supplierStatus,
            safeResponse,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Hotelbeds Accommodation booking was cancelled at supplier.",
          supplierCancelExecuted: true,
          booking: updatedBooking,
          hotelbedsCancellationResponseSafe: safeResponse,
        });
      } catch (error) {
        const message = safeErrorMessage(error);
        const rawStatusCode =
          error instanceof HotelbedsHotelsClientError ? error.status : undefined;
        const updatedBooking = await updateBookingForCancellation(decoded, bookingId, {
          status: "cancellation_requested",
          bookingStatus: "cancellation_requested",
          supplierStatus: booking.supplierStatus || "CONFIRMED",
          cancellationStatus: "failed",
          supplierCancellationStatus: "failed",
          supplierCancellationError: message,
          cancellationRequestedAt: now,
          cancellationReason: typeof body.reason === "string" ? body.reason : "",
          metadata: {
            ...getMetadata(booking),
            supplierCancellation: "failed",
            supplierCancelError: message,
            supplierCancelFailedAt: now.toISOString(),
            cancellationMode: "hotelbeds_supplier_cancel",
            hotelbedsCancellationFlow: {
              ...baseFlow,
              status: "failed",
              supplierStatus: booking.supplierStatus || "",
              errorMessage: message,
              rawStatusCode,
            },
          },
        }, source);

        await createLog({
          supplier: "hotelbeds",
          type: "supplier_cancellation_failed",
          status: "failed",
          message: "Hotelbeds Accommodation cancellation failed.",
          request: { bookingId, referenceUsed: hotelbedsReference, endpointType },
          response: {
            status: updatedBooking?.status,
            supplierStatus: updatedBooking?.supplierStatus,
            rawStatusCode,
          },
          error: message,
        });

        return NextResponse.json({
          success: false,
          message,
          supplierCancelExecuted: true,
          referenceUsed: hotelbedsReference,
          rawStatusCode,
          booking: updatedBooking,
        }, { status: rawStatusCode || 502 });
      }
    }

    if (shouldCancelTbo) {
      const now = new Date();
      try {
        const provider = new TboSupplierProvider();
        const supplierResponse = await provider.cancelBooking({
          supplierBookingReference:
            supplierConfirmationNo || supplierReference || supplierBookingId,
          reason: typeof body.reason === "string" && body.reason
            ? body.reason
            : "Customer requested cancellation",
          metadata: {
            bookingId,
            supplierBookingId,
            supplierConfirmationNo,
            supplierReference,
          },
        });

        const updatedBooking = await updateBookingForCancellation(decoded, bookingId, {
          status: "cancelled",
          bookingStatus: "cancelled",
          supplierStatus: "cancelled",
          cancellationStatus: "cancelled",
          cancelledAt: now,
          cancellationRequestedAt: now,
          cancellationReason: typeof body.reason === "string" ? body.reason : "",
          rawSupplierCancelResponse: supplierResponse.rawSupplierResponse ?? null,
          metadata: {
            ...getMetadata(booking),
            supplierCancellation: "sent_to_supplier",
            supplierCancelledAt: now.toISOString(),
            cancellationMode: "tbo_supplier_cancel",
          },
        }, source);

        await createLog({
          supplier: "tbo",
          type: "supplier_cancel_success",
          status: "success",
          message: "TBO cancellation completed.",
          request: {
            bookingId,
            hasSupplierBookingId: Boolean(supplierBookingId),
            hasSupplierConfirmationNo: Boolean(supplierConfirmationNo),
          },
          response: {
            status: updatedBooking?.status,
            supplierStatus: updatedBooking?.supplierStatus,
          },
        });

        return NextResponse.json({
          success: true,
          message: "تم إلغاء الحجز",
          supplierCancelExecuted: true,
          booking: updatedBooking,
        });
      } catch (error) {
        const message = normalizeSupplierCancelError(safeErrorMessage(error));
        const updatedBooking = await updateBookingForCancellation(decoded, bookingId, {
          status: "cancellation_failed",
          bookingStatus: "cancellation_failed",
          supplierStatus: "confirmed",
          cancellationStatus: "failed",
          cancellationRequestedAt: now,
          cancellationReason: typeof body.reason === "string" ? body.reason : "",
          metadata: {
            ...getMetadata(booking),
            supplierCancellation: "failed",
            supplierCancelError: message,
            supplierCancelFailedAt: now.toISOString(),
            cancellationMode: "tbo_supplier_cancel",
          },
        }, source);

        await createLog({
          supplier: "tbo",
          type: "supplier_cancel_failed",
          status: "failed",
          message: "TBO cancellation failed.",
          request: {
            bookingId,
            hasSupplierBookingId: Boolean(supplierBookingId),
            hasSupplierConfirmationNo: Boolean(supplierConfirmationNo),
          },
          response: {
            status: updatedBooking?.status,
            supplierStatus: updatedBooking?.supplierStatus,
          },
          error: message,
        });

        return NextResponse.json({
          success: false,
          message: "تعذر إلغاء الحجز وسيتم التواصل معك",
          supplierCancelExecuted: true,
          booking: updatedBooking,
        });
      }
    }

    const supplierCancelQueued = supplier === "tbo" && tboCancelEnabled;
    const updatedBooking = await updateBookingForCancellation(decoded, bookingId, {
      status: "cancellation_requested",
      bookingStatus: "cancellation_requested",
      supplierStatus: supplierCancelQueued ? "pending" : booking.supplierStatus || "not_started",
      cancellationRequestedAt: new Date(),
      cancellationReason: typeof body.reason === "string" ? body.reason : "",
      metadata: {
        ...(typeof booking.metadata === "object" && booking.metadata ? booking.metadata : {}),
        cancellationMode: supplierCancelQueued ? "supplier_cancel_enabled" : "local_only",
      },
    }, source);

    await createLog({
      supplier: supplier || "none",
      type: "booking_cancel_requested",
      status: "success",
      message: supplierCancelQueued
        ? "Cancellation requested and marked for supplier handling."
        : "Cancellation requested locally. Supplier cancel is disabled.",
      request: { bookingId, supplier },
      response: { status: updatedBooking?.status },
    });

    return NextResponse.json({
      success: true,
      message: supplierCancelQueued
        ? "Cancellation request was received."
        : "Cancellation request was saved locally. Supplier cancellation is not enabled now.",
      supplierCancelExecuted: false,
      booking: updatedBooking,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
