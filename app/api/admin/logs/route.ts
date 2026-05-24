import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BookingLog from '@/models/BookingLog';
import PaymentLog from '@/models/PaymentLog';
import SupplierLog from '@/models/SupplierLog';
import AdminActionLog from '@/models/AdminActionLog';
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

function buildLogQuery(searchParams: URLSearchParams) {
  const bookingId = searchParams.get('bookingId');
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const query: Record<string, unknown> = {};

  if (bookingId) {
    query.bookingId = bookingId;
  }

  if (type) {
    query.type = { $regex: type, $options: 'i' };
  }

  if (status) {
    query.status = status;
  }

  return query;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);

    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
    const query = buildLogQuery(searchParams);

    const [bookingLogs, paymentLogs, supplierLogs, adminActionLogs] = await Promise.all([
      BookingLog.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      PaymentLog.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      SupplierLog.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      AdminActionLog.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
    ]);

    return NextResponse.json({
      bookingLogs,
      paymentLogs,
      supplierLogs,
      adminActionLogs,
    });
  } catch (error) {
    console.error('Admin logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin logs' },
      { status: 500 },
    );
  }
}
