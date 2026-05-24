import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import BookingLog from '@/models/BookingLog';
import PaymentLog from '@/models/PaymentLog';
import SupplierLog from '@/models/SupplierLog';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return { error: 'No token provided', status: 401 };
  }

  const decoded = verifyToken(token);
  await dbConnect();
  const user = await User.findById(decoded.userId);

  if (!user || user.role !== 'admin') {
    return { error: 'Unauthorized - Admin access required', status: 403 };
  }

  return { user };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const auth = await requireAdmin(req);

    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const { bookingId } = await params;
    const booking = await Booking.findById(bookingId).select(
      'bookingReference status paymentStatus supplierStatus metadata',
    );

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 },
      );
    }

    const [bookingLogs, paymentLogs, supplierLogs] = await Promise.all([
      BookingLog.find({ bookingId }).sort({ createdAt: -1 }).limit(50).lean(),
      PaymentLog.find({ bookingId }).sort({ createdAt: -1 }).limit(50).lean(),
      SupplierLog.find({ bookingId }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    return NextResponse.json({
      booking,
      logs: {
        bookingLogs,
        paymentLogs,
        supplierLogs,
      },
    });
  } catch (error) {
    console.error('Admin booking logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking logs' },
      { status: 500 },
    );
  }
}
