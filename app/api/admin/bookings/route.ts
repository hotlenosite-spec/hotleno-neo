import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { createLog, getUserById } from "@/lib/firebase-store";
import { getNextBookingStatus, isBookingStatus, type BookingStatus } from "@/lib/booking-status";
import { verifyToken } from "@/lib/jwt";
import { requireStaffPermission } from "@/lib/staff-permissions";
import { createAdminNotificationSafely } from "@/lib/admin-notifications";

type BookingDocument = Document & {
  _id: string;
  userId?: string;
  customerEmail?: string;
  customerName?: string;
  bookingReference?: string;
  hotelName?: string;
  leadGuest?: string;
  contactEmail?: string;
  status?: string;
  totalPrice?: number;
  currency?: string;
  paymentStatus?: string;
  supplierStatus?: string;
  checkInDate?: Date | string;
  checkOutDate?: Date | string;
  checkIn?: Date | string;
  checkOut?: Date | string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, unknown>;
  amendments?: unknown[];
  travelers?: unknown[];
  paymentAdjustments?: unknown[];
  archived?: boolean;
  hiddenFromAdminMainList?: boolean;
  archivedReason?: string;
  archivedAt?: Date | string;
};

type PaymentAdjustmentDocument = Document & {
  _id: string;
};

type NormalizedRoom = ReturnType<typeof normalizeRoom>;

const FORCE_ARCHIVE_BOOKING_IDS = new Set([
  "HOTLENO-1780536769032",
  "HOTLENO-1780515284353",
]);

const operationalStatuses = [
  "pending_payment",
  "payment_disabled_created",
  "payment_succeeded",
  "supplier_booking_not_started",
  "supplier_booking_processing",
  "supplier_booking_pending",
  "supplier_booking_failed",
  "manual_review_required",
  "refund_required",
  "refunded",
];

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: "No token provided", status: 401 } as const;

  const decoded = verifyToken(token);
  const user = await getUserById(decoded.userId);
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized - Admin access required", status: 403 } as const;
  }

  return { user, decoded } as const;
}

function includesText(value: unknown, search: string) {
  return String(value || "").toLowerCase().includes(search);
}

function toIsoString(value: unknown) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  return "";
}

function toNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateNights(checkIn: unknown, checkOut: unknown) {
  const start = new Date(String(checkIn || ""));
  const end = new Date(String(checkOut || ""));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const nights = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  return nights > 0 ? nights : 1;
}

function normalizeTraveler(value: unknown) {
  const traveler = typeof value === "object" && value ? value as Record<string, unknown> : {};
  return {
    title: String(traveler.title ?? ""),
    firstName: String(traveler.firstName ?? ""),
    lastName: String(traveler.lastName ?? ""),
    gender: String(traveler.gender ?? ""),
    dateOfBirth: String(traveler.dateOfBirth ?? ""),
    nationality: String(traveler.nationality ?? ""),
    documentType: String(traveler.documentType ?? ""),
    documentNumber: String(traveler.documentNumber ?? ""),
    passportNumber: String(traveler.passportNumber ?? ""),
    nationalId: String(traveler.nationalId ?? ""),
    passportExpiryDate: String(traveler.passportExpiryDate ?? ""),
    phone: String(traveler.phone ?? ""),
    email: String(traveler.email ?? ""),
    travelerType: String(traveler.travelerType ?? ""),
    roomIndex: toNumber(traveler.roomIndex),
    index: toNumber(traveler.index),
  };
}

function normalizeRoom(value: unknown, index: number) {
  const room = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const childrenAges = Array.isArray(room.childrenAges)
    ? room.childrenAges.map((age) => toNumber(age)).filter((age) => age >= 0)
    : [];
  return {
    roomId: toNumber(room.roomId, index + 1),
    roomName: String(room.roomName ?? `Room ${index + 1}`),
    adults: toNumber(room.adults, 1),
    children: toNumber(room.children, childrenAges.length),
    childrenAges,
  };
}

function buildPaxRooms(rooms: ReturnType<typeof normalizeRoom>[]) {
  return rooms.map((room) => ({
    Adults: room.adults,
    Children: room.children,
    ChildrenAges: room.childrenAges.slice(0, room.children),
  }));
}

function normalizeBookingForAdmin(booking: BookingDocument) {
  const checkInDate = toIsoString(booking.checkInDate ?? booking.checkIn);
  const checkOutDate = toIsoString(booking.checkOutDate ?? booking.checkOut);
  const createdAt = toIsoString(booking.createdAt);
  const updatedAt = toIsoString(booking.updatedAt);

  return {
    ...booking,
    checkInDate,
    checkOutDate,
    createdAt,
    updatedAt,
    userId:
      typeof booking.userId === "string"
        ? {
            _id: booking.userId,
            name: booking.customerName || "",
            email: booking.customerEmail || booking.contactEmail || "",
          }
        : booking.userId,
  };
}

function isForcedArchiveBooking(booking: BookingDocument) {
  return (
    FORCE_ARCHIVE_BOOKING_IDS.has(String(booking.bookingReference || "")) ||
    FORCE_ARCHIVE_BOOKING_IDS.has(String(booking._id || ""))
  );
}

function canDirectlySetStatus(currentStatus: string | undefined, nextStatus: string) {
  if (!currentStatus || !isBookingStatus(currentStatus)) return nextStatus;
  return getNextBookingStatus(currentStatus, nextStatus as BookingStatus);
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireStaffPermission(req, "bookings.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = await getFirestoreMongoDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const supplierStatus = searchParams.get("supplierStatus");
    const operationalFilter = searchParams.get("operationalFilter");
    const archiveView =
      searchParams.get("view") === "archive" ||
      searchParams.get("archived") === "true";
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const query: Record<string, unknown> = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (supplierStatus) query.supplierStatus = supplierStatus;
    if (operationalFilter === "refund_required") {
      query.status = { $in: ["manual_review_required", "refund_required"] };
    }
    if (operationalFilter === "supplier_booking_failed") {
      query.status = "supplier_booking_failed";
    }

    const allBookings = await db
      .collection<BookingDocument>("bookings")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    const realBookings = allBookings.filter((booking) => booking._id !== "_meta");
    const visibleBookings = realBookings.filter((booking) => {
      const isArchived =
        booking.archived === true ||
        booking.hiddenFromAdminMainList === true ||
        isForcedArchiveBooking(booking);
      return archiveView ? isArchived : !isArchived;
    });
    const filteredBookings = search
      ? visibleBookings.filter(
          (booking) =>
            includesText(booking.bookingReference, search) ||
            includesText(booking.hotelName, search) ||
            includesText(booking.leadGuest, search) ||
            includesText(booking.contactEmail, search) ||
            includesText(booking.customerEmail, search) ||
            includesText(booking.customerName, search),
        )
      : visibleBookings;
    const skip = (Math.max(page, 1) - 1) * limit;
    const bookings = filteredBookings
      .slice(skip, skip + limit)
      .map(normalizeBookingForAdmin);
    const operationalCounts = operationalStatuses.reduce<Record<string, number>>(
      (counts, statusName) => {
        counts[statusName] = visibleBookings.filter(
          (booking) => booking.status === statusName,
        ).length;
        return counts;
      },
      {},
    );
    const missingDateFields = visibleBookings.reduce(
      (counts, booking) => {
        if (!toIsoString(booking.checkInDate ?? booking.checkIn)) counts.checkInDate += 1;
        if (!toIsoString(booking.checkOutDate ?? booking.checkOut)) counts.checkOutDate += 1;
        if (!toIsoString(booking.createdAt)) counts.createdAt += 1;
        return counts;
      },
      { checkInDate: 0, checkOutDate: 0, createdAt: 0 },
    );

    console.info(
      "[admin/bookings] collection=bookings count=%d missingDates=%j",
      visibleBookings.length,
      missingDateFields,
    );

    return NextResponse.json({
      bookings,
      operationalCounts,
      pagination: {
        page,
        limit,
        total: filteredBookings.length,
        pages: Math.ceil(filteredBookings.length / limit),
      },
    });
  } catch (error) {
    console.error(
      "[admin/bookings] fetch failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await requireStaffPermission(req, "bookings.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { bookingId, status, action, note } = body;
    if (!bookingId || (!status && !action)) {
      return NextResponse.json(
        { error: "Booking ID and status or action are required" },
        { status: 400 },
      );
    }

    const db = await getFirestoreMongoDb();
    const bookings = db.collection<BookingDocument>("bookings");
    const booking = await bookings.findOne({ _id: bookingId });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const now = new Date();
    const updates: Record<string, unknown> = { updatedAt: now };
    let logType = "booking_status_updated";
    let message = "Booking status updated";

    if (action === "retry_supplier_booking") {
      if (!["supplier_booking_failed", "manual_review_required", "refund_required"].includes(String(booking.status))) {
        return NextResponse.json(
          { error: "Retry is only available for failed supplier bookings or refund-required bookings" },
          { status: 400 },
        );
      }

      updates.status = canDirectlySetStatus(booking.status, "supplier_booking_processing");
      updates.supplierStatus = "pending";
      updates.failureReason = "";
      updates.metadata = {
        ...(booking.metadata ?? {}),
        retryRequestedAt: now.toISOString(),
        retryRequestedBy: auth.decoded.userId,
        retryMode: "admin_placeholder_only_no_supplier_call",
      };
      logType = "supplier_booking_retry_requested";
      message = "Admin requested supplier booking retry; no real supplier was called";
    } else if (action === "mark_reviewed") {
      updates.metadata = {
        ...(booking.metadata ?? {}),
        reviewedAt: now.toISOString(),
        reviewedBy: auth.decoded.userId,
      };
      logType = "booking_marked_reviewed";
      message = "Admin marked booking as reviewed";
    } else if (action === "mark_refund_required") {
      updates.status = canDirectlySetStatus(booking.status, "manual_review_required");
      updates.paymentStatus = "refund_required";
      updates.metadata = {
        ...(booking.metadata ?? {}),
        refundRequiredAt: now.toISOString(),
        refundRequiredBy: auth.decoded.userId,
        refundMode: "admin_review_only_no_stripe_refund",
      };
      logType = "booking_marked_manual_review_required";
      message = "Admin marked booking as manual review required; no Stripe refund was executed";
    } else if (action === "mark_cancelled") {
      return NextResponse.json(
        { error: "Use /api/bookings/cancel for supplier-aware cancellation" },
        { status: 400 },
      );
    } else if (action === "add_admin_note") {
      if (typeof note !== "string" || note.trim().length === 0) {
        return NextResponse.json({ error: "Admin note is required" }, { status: 400 });
      }
      const existingNotes = Array.isArray(booking.metadata?.adminNotes)
        ? booking.metadata.adminNotes
        : [];
      updates.metadata = {
        ...(booking.metadata ?? {}),
        adminNotes: [
          ...existingNotes,
          {
            note: note.trim(),
            createdAt: now.toISOString(),
            createdBy: auth.decoded.userId,
          },
        ],
      };
      logType = "admin_note_added";
      message = "Admin note added";
    } else if (action === "amend_booking") {
      const oldValue = {
        checkInDate: toIsoString(booking.checkInDate ?? booking.checkIn),
        checkOutDate: toIsoString(booking.checkOutDate ?? booking.checkOut),
        totalPrice: toNumber(booking.totalPrice),
        travelers: Array.isArray(booking.travelers) ? booking.travelers : [],
        rooms: Array.isArray(booking.rooms) ? booking.rooms : [],
      };
      const nextCheckInDate = body.checkInDate || oldValue.checkInDate;
      const nextCheckOutDate = body.checkOutDate || oldValue.checkOutDate;
      const nextTravelers = Array.isArray(body.travelers)
        ? body.travelers.map(normalizeTraveler)
        : oldValue.travelers;
      const nextRooms: NormalizedRoom[] = Array.isArray(body.rooms)
        ? body.rooms.map(normalizeRoom)
        : oldValue.rooms.map(normalizeRoom);
      const paxRooms = buildPaxRooms(nextRooms);
      const originalTotal = toNumber(body.originalTotal, oldValue.totalPrice);
      const newTotal = roundMoney(toNumber(body.newTotal, originalTotal));
      const priceDifference = roundMoney(newTotal - originalTotal);
      const amendmentNotes = typeof body.notes === "string" ? body.notes.trim() : "";
      if (priceDifference !== 0 && !amendmentNotes) {
        return NextResponse.json(
          { error: "Amendment reason is required when price changes" },
          { status: 400 },
        );
      }
      const nights = calculateNights(nextCheckInDate, nextCheckOutDate);
      const roomsChanged = JSON.stringify(nextRooms) !== JSON.stringify(oldValue.rooms);
      const datesChanged =
        nextCheckInDate !== oldValue.checkInDate ||
        nextCheckOutDate !== oldValue.checkOutDate;
      const travelersChanged = JSON.stringify(nextTravelers) !== JSON.stringify(oldValue.travelers);
      const amendmentType = roomsChanged
        ? "occupancy_change"
        : datesChanged
          ? "date_change"
          : travelersChanged
            ? "traveler_update"
            : "traveler_update";
      const existingAmendments = Array.isArray(booking.amendments)
        ? booking.amendments
        : [];
      const supplierConfirmed =
        booking.supplierStatus === "confirmed" ||
        booking.status === "supplier_booking_confirmed";
      const amendment = {
        type: amendmentType,
        status: supplierConfirmed ? "pending_supplier_action" : "applied_internal_before_supplier",
        requiresSupplierAction: supplierConfirmed,
        oldValue,
        newValue: {
          checkInDate: nextCheckInDate,
          checkOutDate: nextCheckOutDate,
          travelers: nextTravelers,
          rooms: nextRooms,
          guests: {
            rooms: nextRooms.length,
            adults: nextRooms.reduce((sum: number, room: NormalizedRoom) => sum + room.adults, 0),
            children: nextRooms.reduce((sum: number, room: NormalizedRoom) => sum + room.children, 0),
            childrenAges: nextRooms.flatMap((room: NormalizedRoom) => room.childrenAges),
          },
          paxRooms,
          originalTotal,
          newTotal,
          priceDifference,
          nights,
        },
        changedBy: auth.decoded.userId,
        changedAt: now.toISOString(),
        notes: amendmentNotes,
        supplierSubmission:
          supplierConfirmed
            ? process.env.TBO_AMENDMENT_ENABLED === "true"
              ? "pending_supplier_action"
              : "pending_supplier_action_tbo_amendment_disabled"
            : "not_required_before_supplier",
      };

      updates.amendments = [...existingAmendments, amendment];
      updates.metadata = {
        ...(booking.metadata ?? {}),
        lastAmendmentAt: now.toISOString(),
        tboAmendmentEnabled: process.env.TBO_AMENDMENT_ENABLED === "true",
        supplierAmendmentSubmission:
          supplierConfirmed
            ? process.env.TBO_AMENDMENT_ENABLED === "true"
              ? "pending_supplier_action"
              : "pending_supplier_action_tbo_amendment_disabled"
            : "not_required_before_supplier",
      };

      if (!supplierConfirmed) {
        updates.checkInDate = new Date(String(nextCheckInDate));
        updates.checkOutDate = new Date(String(nextCheckOutDate));
        updates.travelers = nextTravelers;
        updates.rooms = nextRooms;
        updates.guests = amendment.newValue.guests;
        updates.PaxRooms = paxRooms;
        updates.totalPrice = newTotal;
        updates.nights = nights;
        updates.originalTotal = originalTotal;
        updates.newTotal = newTotal;
        updates.priceDifference = priceDifference;

        if (priceDifference > 0) {
          updates.status = "pending_additional_payment";
          updates.bookingStatus = "pending_additional_payment";
          updates.paymentStatus = "additional_payment_pending";
        } else if (priceDifference < 0) {
          updates.status = "refund_due";
          updates.bookingStatus = "refund_due";
          updates.refundDue = Math.abs(priceDifference);
          updates.paymentStatus = "refund_due";
        }
      } else if (priceDifference !== 0) {
        updates.pendingAmendmentPriceDifference = priceDifference;
        updates.pendingAmendmentTotal = newTotal;
      }

      if (priceDifference !== 0) {
        const adjustment = {
          _id: `adjustment-${bookingId}-${Date.now()}`,
          bookingId,
          customerEmail: booking.customerEmail || booking.contactEmail || "",
          amount: Math.abs(priceDifference),
          currency: String(booking.currency || body.currency || "USD"),
          reason:
            priceDifference > 0
              ? "booking_amendment_additional_payment"
              : "booking_amendment_refund_due",
          status: priceDifference > 0 ? "pending" : "refund_due",
          createdAt: now,
          updatedAt: now,
        };
        await db
          .collection<PaymentAdjustmentDocument>("payment_adjustments")
          .insertOne(adjustment);
        updates.paymentAdjustments = [
          ...(Array.isArray(booking.paymentAdjustments) ? booking.paymentAdjustments : []),
          adjustment,
        ];
      }

      logType = supplierConfirmed ? "booking_amendment_pending_supplier_action" : "booking_amended_internal_only";
      message = supplierConfirmed
        ? "Admin created pending supplier amendment; no final booking fields were changed"
        : "Admin amended booking internally before supplier confirmation";
    } else {
      if (!isBookingStatus(status)) {
        return NextResponse.json({ error: "Invalid booking status" }, { status: 400 });
      }
      updates.status = canDirectlySetStatus(booking.status, status);
    }

    await bookings.updateOne({ _id: bookingId }, { $set: updates });
    if (typeof updates.status === "string") {
      await bookings.updateOne(
        { _id: bookingId },
        { $set: { bookingStatus: updates.status } },
      );
    }
    const updatedBooking = await bookings.findOne({ _id: bookingId });
    if (updates.status === "manual_review_required") {
      await createAdminNotificationSafely({
        type: "manual_review_required",
        title: "Manual review required",
        message: `Booking ${booking.bookingReference || bookingId} requires an operational review.`,
        severity: "warning",
        targetRole: "admin",
        relatedType: "booking",
        relatedId: bookingId,
        data: {
          reference: String(booking.bookingReference || bookingId),
          customer: String(booking.customerEmail || ""),
        },
      });
    }
    await createLog({
      supplier: String(booking.supplier || "none"),
      type: logType,
      status: "success",
      message,
      request: { bookingId, action, status },
      response: {
        bookingId,
        bookingStatus: updatedBooking?.status,
        paymentStatus: updatedBooking?.paymentStatus,
        supplierStatus: updatedBooking?.supplierStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message,
      booking: updatedBooking ? normalizeBookingForAdmin(updatedBooking) : null,
    });
  } catch (error) {
    console.error(
      "[admin/bookings] update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update booking" },
      { status: 500 },
    );
  }
}
