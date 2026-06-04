import { NextRequest, NextResponse } from 'next/server';
import type { Document } from 'mongodb';
import { verifyToken } from '@/lib/jwt';
import { getFirestoreMongoDb } from '@/lib/firestore-mongo';
import { getUserById } from '@/lib/firebase-store';

type StringIdDocument = Document & { _id: string };

const inactiveStatuses = new Set([
  'cancelled',
  'cancellation_failed',
  'cancellation_requested',
  'supplier_booking_failed',
  'failed',
  'refund_due',
]);

const activeStatuses = new Set([
  'supplier_booking_confirmed',
  'confirmed',
  'pending_payment',
  'pending_additional_payment',
  'supplier_booking_pending',
  'supplier_booking_processing',
  'supplier_booking_not_started',
  'payment_disabled_created',
]);

function getStatusValue(booking: Document, key: string) {
  return String(booking[key] ?? '').toLowerCase();
}

function hasPendingSupplierAction(booking: Document) {
  const amendments = Array.isArray(booking.amendments) ? booking.amendments : [];
  return amendments.some((item) => {
    const amendment = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return amendment.status === 'pending_supplier_action';
  });
}

function isCancelledOrInactive(booking: Document) {
  const status = getStatusValue(booking, 'status');
  const bookingStatus = getStatusValue(booking, 'bookingStatus');
  const supplierStatus = getStatusValue(booking, 'supplierStatus');
  const cancellationStatus = getStatusValue(booking, 'cancellationStatus');

  return (
    inactiveStatuses.has(status) ||
    inactiveStatuses.has(bookingStatus) ||
    supplierStatus === 'cancelled' ||
    cancellationStatus === 'cancelled' ||
    cancellationStatus === 'failed'
  );
}

function isActiveBooking(booking: Document) {
  if (isCancelledOrInactive(booking)) return false;
  const status = getStatusValue(booking, 'status');
  const bookingStatus = getStatusValue(booking, 'bookingStatus');
  return activeStatuses.has(status) || activeStatuses.has(bookingStatus);
}

function isConfirmedRevenueBooking(booking: Document) {
  if (isCancelledOrInactive(booking)) return false;
  return (
    getStatusValue(booking, 'supplierStatus') === 'confirmed' ||
    getStatusValue(booking, 'bookingStatus') === 'supplier_booking_confirmed' ||
    getStatusValue(booking, 'status') === 'supplier_booking_confirmed'
  );
}

function needsReview(booking: Document) {
  return (
    getStatusValue(booking, 'cancellationStatus') === 'failed' ||
    getStatusValue(booking, 'status') === 'supplier_booking_failed' ||
    getStatusValue(booking, 'bookingStatus') === 'supplier_booking_failed' ||
    hasPendingSupplierAction(booking)
  );
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    
    const user = await getUserById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const db = await getFirestoreMongoDb();
    const [bookings, users] = await Promise.all([
      db.collection<StringIdDocument>('bookings').find({}).toArray(),
      db.collection<StringIdDocument>('users').find({}).toArray(),
    ]);
    const realBookings = bookings.filter((booking) => booking._id !== '_meta');
    const realUsers = users.filter((user) => user._id !== '_meta');

    const totalBookings = realBookings.length;
    const totalUsers = realUsers.length;
    const activeBookingRows = realBookings.filter(isActiveBooking);
    const confirmedRevenueBookings = realBookings.filter(isConfirmedRevenueBooking);
    const reviewRequiredBookingRows = realBookings.filter(needsReview);
    const excludedCancelledBookings = realBookings.filter(isCancelledOrInactive);
    const totalRevenue = confirmedRevenueBookings
      .reduce((sum, booking) => sum + Number(booking.totalPrice ?? booking.total ?? 0), 0);
    const activeBookings = activeBookingRows.length;
    const reviewRequiredBookings = reviewRequiredBookingRows.length;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const bookingsToday = realBookings.filter((booking) => {
      const createdAt = booking.createdAt instanceof Date ? booking.createdAt : null;
      return createdAt ? createdAt >= startOfToday : false;
    }).length;
    const recentBookings = realBookings
      .sort(
        (a, b) =>
          ((b.createdAt instanceof Date ? b.createdAt.getTime() : 0) -
            (a.createdAt instanceof Date ? a.createdAt.getTime() : 0)),
      )
      .slice(0, 5)
      .map((booking) => ({
        _id: String(booking._id ?? booking.bookingId ?? ''),
        bookingReference: booking.bookingReference ?? booking.bookingId ?? booking._id,
        hotelName: booking.hotelName ?? booking.serviceName ?? '',
        totalPrice: Number(booking.totalPrice ?? booking.total ?? 0),
        currency: String(booking.currency ?? 'USD'),
        status: String(booking.status ?? booking.bookingStatus ?? 'pending'),
        createdAt: booking.createdAt ?? null,
      }));
    const statusCounts = new Map<string, number>();
    realBookings.forEach((booking) => {
      const status = String(booking.status ?? booking.bookingStatus ?? 'unknown');
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    });
    const bookingsByStatus = Array.from(statusCounts.entries()).map(([_id, count]) => ({
      _id,
      count,
    }));

    console.info(
      "[admin/stats] totalBookings=%d activeBookings=%d confirmedRevenueBookings=%d reviewRequiredBookings=%d excludedCancelledBookings=%d",
      totalBookings,
      activeBookings,
      confirmedRevenueBookings.length,
      reviewRequiredBookings,
      excludedCancelledBookings.length,
    );
    
    return NextResponse.json({
      totalBookings,
      totalUsers,
      totalRevenue,
      activeBookings,
      reviewRequiredBookings,
      confirmedRevenueBookings: confirmedRevenueBookings.length,
      excludedCancelledBookings: excludedCancelledBookings.length,
      bookingsToday,
      recentBookings,
      bookingsByStatus,
    });
    
  } catch (error) {
    console.error(
      "[admin/stats] fetch failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
