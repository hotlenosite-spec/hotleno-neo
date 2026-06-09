import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { verifyToken } from "@/lib/jwt";
import { TboSupplierProvider } from "@/lib/suppliers/tbo-provider";

export const runtime = "nodejs";

type BookingDocument = Document & {
  _id: string;
  userId: string;
  supplier?: string;
  supplierBookingReference?: string;
  supplierConfirmationNo?: string;
  bookingReference?: string;
};

function safeErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : "BookingDetail failed")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

function getRawSupplierDetailsObject(response: { rawSupplierResponse?: unknown }) {
  return response.rawSupplierResponse &&
    typeof response.rawSupplierResponse === "object"
    ? (response.rawSupplierResponse as Record<string, unknown>)
    : {};
}

function getString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.bookingId || "").trim();

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const internalSecret = req.headers.get("x-internal-booking-detail-secret");
    const configuredSecret = process.env.INTERNAL_BOOKING_DETAIL_SECRET;
    const isInternal =
      configuredSecret && internalSecret && internalSecret === configuredSecret;
    const decoded = token && !isInternal ? verifyToken(token) : null;
    const db = await getFirestoreMongoDb();
    const bookingsCollection = db.collection<BookingDocument>("bookings");
    const booking = await bookingsCollection.findOne({ _id: bookingId });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!isInternal && decoded?.userId !== booking.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (String(booking.supplier || "").toLowerCase() !== "tbo") {
      return NextResponse.json({ error: "Booking is not a TBO booking" }, { status: 400 });
    }

    const supplierReference =
      String(body.supplierBookingReference || booking.supplierBookingReference || "").trim() ||
      String(booking.bookingReference || booking._id);
    const supplierConfirmationNo =
      String(body.supplierConfirmationNo || booking.supplierConfirmationNo || "").trim();
    const provider = new TboSupplierProvider();
    const details = await provider.getBookingDetails({
      supplierBookingReference: supplierReference,
      metadata: {
        bookingId: booking._id,
        supplierConfirmationNo,
        source: "internal_tbo_booking_detail_endpoint",
      },
    });
    const raw = getRawSupplierDetailsObject(details);
    const statusRecord =
      raw.status && typeof raw.status === "object"
        ? (raw.status as Record<string, unknown>)
        : {};
    const statusDescription =
      getString(statusRecord, "Description") || getString(raw, "responseStatus");
    const confirmationNumber =
      getString(raw, "confirmationNo") ||
      getString(raw, "confirmationNumber") ||
      supplierConfirmationNo;
    const supplierBookingId = getString(raw, "bookingId");
    const finalReference =
      getString(raw, "supplierReference") ||
      getString(raw, "bookingReferenceId") ||
      supplierReference;
    const now = new Date();

    await bookingsCollection.updateOne(
      { _id: booking._id },
      {
        $set: {
          bookingStatus: "supplier_booking_confirmed",
          status: "supplier_booking_confirmed",
          supplierStatus: "confirmed",
          supplierBookingReference: finalReference,
          supplierReference: finalReference,
          supplierBookingId,
          supplierConfirmationNo: confirmationNumber,
          supplierResponseStatus: statusDescription,
          rawSupplierResponse: details.rawSupplierResponse ?? null,
          "metadata.supplierSubmission": "confirmed_by_booking_detail",
          "metadata.bookingDetailCheckedAt": now.toISOString(),
          updatedAt: now,
        },
      },
    );

    console.info(
      "[TBO BookingDetail Diagnostics]",
      JSON.stringify({
        internalBookingId: booking._id,
        confirmationNumberFound: Boolean(confirmationNumber),
        statusDescription: statusDescription || null,
        firebaseUpdated: true,
      }),
    );

    return NextResponse.json({
      success: true,
      bookingId: booking._id,
      confirmationNumberFound: Boolean(confirmationNumber),
      statusDescription,
    });
  } catch (error) {
    console.info(
      "[TBO BookingDetail Diagnostics]",
      JSON.stringify({
        internalBookingId: null,
        confirmationNumberFound: false,
        statusDescription: safeErrorMessage(error),
        firebaseUpdated: false,
      }),
    );

    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}
