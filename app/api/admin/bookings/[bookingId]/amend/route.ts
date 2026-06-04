import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getUserById } from "@/lib/firebase-store";
import { verifyToken } from "@/lib/jwt";

type BookingDocument = Document & {
  _id: string;
  customerEmail?: string;
  contactEmail?: string;
  checkInDate?: Date | string;
  checkOutDate?: Date | string;
  totalPrice?: number;
  currency?: string;
  travelers?: unknown[];
  rooms?: unknown[];
  amendments?: unknown[];
};

type PaymentAdjustmentDocument = Document & {
  _id: string;
};

type NormalizedRoom = {
  roomId: number;
  roomName: string;
  adults: number;
  children: number;
  childrenAges: number[];
};

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: "No token provided", status: 401 } as const;
  const decoded = verifyToken(token);
  const user = await getUserById(decoded.userId);
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized - Admin access required", status: 403 } as const;
  }
  return { decoded } as const;
}

function toNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toIso(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function calculateNights(checkIn: unknown, checkOut: unknown) {
  const start = new Date(String(checkIn || ""));
  const end = new Date(String(checkOut || ""));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

function normalizeRooms(rooms: unknown[]): NormalizedRoom[] {
  return rooms.map((room, index) => {
    const value = typeof room === "object" && room ? room as Record<string, unknown> : {};
    const childrenAges = Array.isArray(value.childrenAges)
      ? value.childrenAges.map((age) => toNumber(age)).filter((age) => age >= 0)
      : [];
    return {
      roomId: toNumber(value.roomId, index + 1),
      roomName: String(value.roomName ?? `Room ${index + 1}`),
      adults: toNumber(value.adults, 1),
      children: toNumber(value.children, childrenAges.length),
      childrenAges,
    };
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { bookingId } = await params;
    const body = await req.json();
    const db = await getFirestoreMongoDb();
    const bookings = db.collection<BookingDocument>("bookings");
    const booking = await bookings.findOne({ _id: bookingId });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const now = new Date();
    const oldValue = {
      checkInDate: toIso(booking.checkInDate),
      checkOutDate: toIso(booking.checkOutDate),
      totalPrice: toNumber(booking.totalPrice),
      travelers: Array.isArray(booking.travelers) ? booking.travelers : [],
      rooms: Array.isArray(booking.rooms) ? booking.rooms : [],
    };
    const rooms = Array.isArray(body.rooms)
      ? normalizeRooms(body.rooms)
      : normalizeRooms(oldValue.rooms);
    const paxRooms = rooms.map((room) => ({
      Adults: room.adults,
      Children: room.children,
      ChildrenAges: room.childrenAges.slice(0, room.children),
    }));
    const checkInDate = body.checkInDate || oldValue.checkInDate;
    const checkOutDate = body.checkOutDate || oldValue.checkOutDate;
    const originalTotal = toNumber(body.originalTotal, oldValue.totalPrice);
    const newTotal = Math.round(toNumber(body.newTotal, originalTotal) * 100) / 100;
    const priceDifference = Math.round((newTotal - originalTotal) * 100) / 100;
    const amendmentNotes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (priceDifference !== 0 && !amendmentNotes) {
      return NextResponse.json(
        { error: "Amendment reason is required when price changes" },
        { status: 400 },
      );
    }
    const type = JSON.stringify(rooms) !== JSON.stringify(oldValue.rooms)
      ? "occupancy_change"
      : checkInDate !== oldValue.checkInDate || checkOutDate !== oldValue.checkOutDate
        ? "date_change"
        : "traveler_update";
    const supplierConfirmed =
      booking.supplierStatus === "confirmed" ||
      booking.status === "supplier_booking_confirmed";
    const amendment = {
      type,
      status: supplierConfirmed ? "pending_supplier_action" : "applied_internal_before_supplier",
      requiresSupplierAction: supplierConfirmed,
      oldValue,
      newValue: {
        checkInDate,
        checkOutDate,
        travelers: Array.isArray(body.travelers) ? body.travelers : oldValue.travelers,
        rooms,
        paxRooms,
        originalTotal,
        newTotal,
        priceDifference,
        nights: calculateNights(checkInDate, checkOutDate),
      },
      changedBy: auth.decoded.userId,
      changedAt: now.toISOString(),
      notes: amendmentNotes,
      supplierSubmission: supplierConfirmed
        ? process.env.TBO_AMENDMENT_ENABLED === "true"
          ? "pending_supplier_action"
          : "pending_supplier_action_tbo_amendment_disabled"
        : "not_required_before_supplier",
    };
    const updates: Record<string, unknown> = {
      amendments: [...(Array.isArray(booking.amendments) ? booking.amendments : []), amendment],
      updatedAt: now,
    };
    if (!supplierConfirmed) {
      updates.checkInDate = new Date(String(checkInDate));
      updates.checkOutDate = new Date(String(checkOutDate));
      updates.travelers = amendment.newValue.travelers;
      updates.rooms = rooms;
      updates.PaxRooms = paxRooms;
      updates.guests = {
        rooms: rooms.length,
        adults: rooms.reduce((sum, room) => sum + room.adults, 0),
        children: rooms.reduce((sum, room) => sum + room.children, 0),
        childrenAges: rooms.flatMap((room) => room.childrenAges),
      };
      updates.totalPrice = newTotal;
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
        updates.paymentStatus = "refund_due";
        updates.refundDue = Math.abs(priceDifference);
      }
    } else if (priceDifference !== 0) {
      updates.pendingAmendmentPriceDifference = priceDifference;
      updates.pendingAmendmentTotal = newTotal;
    }
    await bookings.updateOne({ _id: bookingId }, { $set: updates });
    if (priceDifference !== 0) {
      await db.collection<PaymentAdjustmentDocument>("payment_adjustments").insertOne({
        _id: `adjustment-${bookingId}-${Date.now()}`,
        bookingId,
        customerEmail: booking.customerEmail || booking.contactEmail || "",
        amount: Math.abs(priceDifference),
        currency: booking.currency || "USD",
        reason: priceDifference > 0 ? "booking_amendment_additional_payment" : "booking_amendment_refund_due",
        status: priceDifference > 0 ? "pending" : "refund_due",
        createdAt: now,
        updatedAt: now,
      });
    }
    const updatedBooking = await bookings.findOne({ _id: bookingId });
    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (error) {
    console.error(
      "[admin/bookings/amend] failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to amend booking" }, { status: 500 });
  }
}
