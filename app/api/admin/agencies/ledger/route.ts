import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AgencyLedger, {
  AGENCY_LEDGER_STATUSES,
  AGENCY_LEDGER_TYPES,
} from '@/models/AgencyLedger';
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

function isAllowed(value: string, allowed: readonly string[]) {
  return allowed.includes(value);
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
    const agencyId = searchParams.get('agencyId');
    const bookingId = searchParams.get('bookingId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const query: Record<string, unknown> = {};

    if (!agencyId || !mongoose.Types.ObjectId.isValid(agencyId)) {
      return NextResponse.json(
        { error: 'Valid agencyId is required' },
        { status: 400 },
      );
    }

    query.agencyId = agencyId;

    if (bookingId) {
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return NextResponse.json(
          { error: 'Valid bookingId is required' },
          { status: 400 },
        );
      }
      query.bookingId = bookingId;
    }

    if (type) {
      if (!isAllowed(type, AGENCY_LEDGER_TYPES)) {
        return NextResponse.json(
          { error: 'Invalid ledger type' },
          { status: 400 },
        );
      }
      query.type = type;
    }

    if (status) {
      if (!isAllowed(status, AGENCY_LEDGER_STATUSES)) {
        return NextResponse.json(
          { error: 'Invalid ledger status' },
          { status: 400 },
        );
      }
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const [ledger, total] = await Promise.all([
      AgencyLedger.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('bookingId', 'bookingReference status')
        .populate('createdBy', 'name email'),
      AgencyLedger.countDocuments(query),
    ]);

    return NextResponse.json({
      ledger,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin agency ledger fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agency ledger' },
      { status: 500 },
    );
  }
}
