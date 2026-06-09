import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { requireAdminFromRequest } from "@/lib/auth-user";
import { requireStaffPermission } from "@/lib/staff-permissions";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getUserByEmail } from "@/lib/firebase-store";

export const runtime = "nodejs";

const TESTER_EMAIL = "tbo.tester@hotleno.com";
const ARCHIVE_REASON = "TBO tester cleanup before sending portal to TBO";
const FORCE_ARCHIVE_BOOKING_IDS = new Set([
  "HOTLENO-1780536769032",
  "HOTLENO-1780515284353",
]);

type BookingDocument = Document & {
  _id: string;
  bookingReference?: string;
  userId?: string;
  customerEmail?: string;
  contactEmail?: string;
  supplier?: string;
  status?: string;
  bookingStatus?: string;
  supplierStatus?: string;
  supplierResponseStatus?: string;
  cancellationStatus?: string;
  paymentStatus?: string;
  metadata?: Record<string, unknown>;
  archived?: boolean;
  hiddenFromAdminMainList?: boolean;
  hiddenFromCustomerBookings?: boolean;
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isTboBooking(booking: BookingDocument) {
  return normalized(booking.supplier) === "tbo";
}

function isTesterBooking(booking: BookingDocument, testerUserId?: string) {
  return (
    normalized(booking.customerEmail) === TESTER_EMAIL ||
    normalized(booking.contactEmail) === TESTER_EMAIL ||
    (testerUserId ? String(booking.userId || "") === testerUserId : false)
  );
}

function isActiveTboBooking(booking: BookingDocument) {
  const status = normalized(booking.status);
  const cancellationStatus = normalized(booking.cancellationStatus);

  return (
    isTboBooking(booking) &&
    normalized(booking.supplierStatus) === "confirmed" &&
    !["cancelled", "cancellation_requested", "failed"].includes(cancellationStatus) &&
    ![
      "cancelled",
      "cancellation_requested",
      "cancellation_failed",
      "supplier_booking_failed",
      "failed",
    ].includes(status)
  );
}

function needsReview(booking: BookingDocument) {
  const status = normalized(booking.status);
  const bookingStatus = normalized(booking.bookingStatus);
  const supplierStatus = normalized(booking.supplierStatus);
  const cancellationStatus = normalized(booking.cancellationStatus);

  if (cancellationStatus === "failed") return true;
  if (status === "pending_supplier_action") return true;
  if (bookingStatus === "pending_supplier_action") return true;
  if (bookingStatus === "supplier_booking_failed" || status === "supplier_booking_failed") {
    return true;
  }
  return (
    status === "cancellation_requested" &&
    supplierStatus === "confirmed" &&
    cancellationStatus !== "cancelled"
  );
}

function canArchiveTesterBooking(booking: BookingDocument) {
  const status = normalized(booking.status);
  const bookingStatus = normalized(booking.bookingStatus);
  const supplierStatus = normalized(booking.supplierStatus);
  const cancellationStatus = normalized(booking.cancellationStatus);
  const paymentStatus = normalized(booking.paymentStatus);
  const supplierSubmission = normalized(booking.metadata?.supplierSubmission);
  const supplierCancellation = normalized(booking.metadata?.supplierCancellation);
  const supplierResponseStatus = normalized(booking.supplierResponseStatus);

  if (booking.archived === true || booking.hiddenFromAdminMainList === true) {
    return false;
  }

  if (isActiveTboBooking(booking)) {
    return false;
  }

  return [
    status,
    bookingStatus,
    supplierStatus,
    cancellationStatus,
    paymentStatus,
    supplierSubmission,
    supplierCancellation,
    supplierResponseStatus,
  ].some((value) =>
    [
      "cancelled",
      "cancellation_requested",
      "requested",
      "cancellation_failed",
      "failed",
      "supplier_booking_failed",
      "payment_disabled_created",
      "not_required_for_test",
      "supplier_booking_not_started",
      "internal_only",
      "manual_review_required",
      "cancelled_local_only",
      "not_started",
      "sent_to_supplier",
    ].includes(value),
  );
}

function isAlreadyArchived(booking: BookingDocument) {
  return (
    booking.archived === true ||
    booking.hiddenFromAdminMainList === true ||
    booking.hiddenFromCustomerBookings === true
  );
}

function getBookingRef(booking: BookingDocument) {
  return String(booking.bookingReference || booking._id || "");
}

function isForcedArchiveBooking(booking: BookingDocument) {
  return FORCE_ARCHIVE_BOOKING_IDS.has(getBookingRef(booking));
}

function summarizeBookings(bookings: BookingDocument[]) {
  const tboActiveBookings = bookings.filter(isActiveTboBooking);
  return {
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(
      (booking) =>
        normalized(booking.supplierStatus) === "confirmed" ||
        normalized(booking.bookingStatus) === "supplier_booking_confirmed" ||
        normalized(booking.status) === "supplier_booking_confirmed" ||
        normalized(booking.status) === "confirmed",
    ).length,
    cancelledBookings: bookings.filter(
      (booking) =>
        normalized(booking.status) === "cancelled" ||
        normalized(booking.supplierStatus) === "cancelled" ||
        normalized(booking.cancellationStatus) === "cancelled",
    ).length,
    failedBookings: bookings.filter(
      (booking) =>
        normalized(booking.status).includes("failed") ||
        normalized(booking.bookingStatus).includes("failed") ||
        normalized(booking.supplierStatus) === "failed",
    ).length,
    pendingSupplierCancellationBookings: bookings.filter(
      (booking) =>
        normalized(booking.status) === "cancellation_requested" ||
        normalized(booking.cancellationStatus) === "cancellation_requested" ||
        normalized(booking.cancellationStatus) === "requested",
    ).length,
    reviewRequiredBookings: bookings.filter(needsReview).length,
    activeTboBookings: tboActiveBookings.length,
    activeTboBookingRefs: tboActiveBookings
      .map((booking) => booking.bookingReference || booking._id)
      .filter(Boolean),
  };
}

export async function POST(req: NextRequest) {
  if (!(await requireStaffPermission(req, "suppliers.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = requireAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { confirm?: boolean };
  const confirm = body.confirm === true;
  const db = await getFirestoreMongoDb();
  const tester = await getUserByEmail(TESTER_EMAIL).catch(() => null);
  const allBookings = (await db
    .collection<BookingDocument>("bookings")
    .find({})
    .sort({ createdAt: -1 })
    .toArray()).filter((booking) => booking._id !== "_meta");
  const testerBookings = allBookings.filter(
    (booking) => isTboBooking(booking) && isTesterBooking(booking, tester?.id),
  );
  const forcedBookings = allBookings.filter(isForcedArchiveBooking);
  const cleanupCandidates = Array.from(
    new Map(
      [...testerBookings, ...forcedBookings].map((booking) => [booking._id, booking]),
    ).values(),
  );
  const alreadyArchivedBookings = cleanupCandidates.filter(isAlreadyArchived);
  const forcedArchiveBookings = cleanupCandidates.filter(
    (booking) => isForcedArchiveBooking(booking) && !isAlreadyArchived(booking),
  );
  const archivableBookings = cleanupCandidates.filter(
    (booking) =>
      !isAlreadyArchived(booking) &&
      (canArchiveTesterBooking(booking) || isForcedArchiveBooking(booking)),
  );
  const skippedActiveBookings = cleanupCandidates.filter(
    (booking) =>
      isActiveTboBooking(booking) &&
      !isAlreadyArchived(booking) &&
      !isForcedArchiveBooking(booking),
  );
  const reviewRequiredBookings = cleanupCandidates.filter(
    (booking) =>
      needsReview(booking) &&
      !canArchiveTesterBooking(booking) &&
      !isForcedArchiveBooking(booking),
  );
  const affectedBookingRefs = archivableBookings.map(
    (booking) => booking.bookingReference || booking._id,
  );

  if (confirm && archivableBookings.length > 0) {
    const now = new Date();
    await db.collection<BookingDocument>("bookings").updateMany(
      { _id: { $in: archivableBookings.map((booking) => booking._id) } },
      {
        $set: {
          archived: true,
          archivedReason: ARCHIVE_REASON,
          archivedAt: now,
          archivedBy: "system/admin-cleanup",
          hiddenFromAdminMainList: true,
          hiddenFromCustomerBookings: true,
          updatedAt: now,
        },
      },
    );
  }

  const afterBookings = confirm
    ? (await db.collection<BookingDocument>("bookings").find({}).toArray()).filter(
        (booking) => booking._id !== "_meta",
      )
    : allBookings;
  const summary = summarizeBookings(afterBookings);

  console.info(
    "[admin/tbo/cleanup-certification-tests]",
    JSON.stringify({
      confirm,
      totalBookings: allBookings.length,
      totalTesterBookings: testerBookings.length,
      cleanupCandidates: cleanupCandidates.length,
      activeSkipped: skippedActiveBookings.length,
      alreadyArchived: alreadyArchivedBookings.length,
      forcedArchiveBookingIds: forcedArchiveBookings.map(getBookingRef),
      archivedCount: confirm ? archivableBookings.length : 0,
      eligibleForArchive: archivableBookings.length,
      reviewRequiredCount: reviewRequiredBookings.length,
    }),
  );

  const willArchiveBookingIds = affectedBookingRefs;

  return NextResponse.json({
    success: true,
    dryRun: !confirm,
    summary,
    totalTesterBookings: testerBookings.length,
    visibleTesterBookings: cleanupCandidates.filter(
      (booking) => !isAlreadyArchived(booking) && !archivableBookings.includes(booking),
    ).length,
    activeSkipped: skippedActiveBookings.length,
    alreadyArchived: alreadyArchivedBookings.length,
    forcedArchiveBookingIds: forcedArchiveBookings.map(getBookingRef),
    willArchiveBookingIds,
    // Backward-compatible aliases used by the existing admin UI.
    totalFound: testerBookings.length,
    activeTboBookings: skippedActiveBookings.length,
    archivedCount: confirm ? archivableBookings.length : 0,
    eligibleForArchive: archivableBookings.length,
    skippedActiveCount: skippedActiveBookings.length,
    reviewRequiredCount: reviewRequiredBookings.length,
    affectedBookingRefs,
  });
}
