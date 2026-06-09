import { NextRequest, NextResponse } from 'next/server';
import type { Document } from 'mongodb';
import { verifyToken } from '@/lib/jwt';
import { getFirestoreMongoDb } from '@/lib/firestore-mongo';
import { getUserById } from '@/lib/firebase-store';
import { requireStaffPermission } from '@/lib/staff-permissions';

type StringIdDocument = Document & { _id: string };

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return { error: 'No token provided', status: 401 };
  }

  const decoded = verifyToken(token);
  const user = await getUserById(decoded.userId);

  if (!user || user.role !== 'admin') {
    return { error: 'Unauthorized - Admin access required', status: 403 };
  }

  return { user };
}

function matchesFilters(log: Record<string, unknown>, searchParams: URLSearchParams) {
  const bookingId = searchParams.get('bookingId');
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  if (bookingId) {
    const request = typeof log.request === 'object' && log.request ? log.request as Record<string, unknown> : {};
    const response = typeof log.response === 'object' && log.response ? log.response as Record<string, unknown> : {};
    const hasBookingId =
      String(log.bookingId ?? '') === bookingId ||
      String(request.bookingId ?? '') === bookingId ||
      String(response.bookingId ?? '') === bookingId;
    if (!hasBookingId) return false;
  }

  if (type && !String(log.type ?? '').toLowerCase().includes(type.toLowerCase())) {
    return false;
  }

  if (status && String(log.status ?? '') !== status) {
    return false;
  }

  return true;
}

function byLogType(logs: Record<string, unknown>[], kind: 'booking' | 'payment' | 'supplier' | 'admin') {
  return logs.filter((log) => {
    const type = String(log.type ?? '').toLowerCase();
    if (kind === 'admin') return type.includes('admin');
    if (kind === 'payment') return type.includes('payment') || type.includes('stripe');
    if (kind === 'supplier') return type.includes('supplier') || String(log.supplier ?? 'none') !== 'none';
    return type.includes('booking') || (!type.includes('payment') && !type.includes('supplier') && !type.includes('admin'));
  });
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireStaffPermission(req, 'logs.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const auth = await requireAdmin(req);

    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
    const db = await getFirestoreMongoDb();
    const logs = (await db
      .collection<StringIdDocument>('logs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray()) as Record<string, unknown>[];
    const filteredLogs = logs
      .filter((log) => log._id !== '_meta')
      .filter((log) => matchesFilters(log, searchParams))
      .slice(0, limit);

    const bookingLogs = byLogType(filteredLogs, 'booking');
    const paymentLogs = byLogType(filteredLogs, 'payment');
    const supplierLogs = byLogType(filteredLogs, 'supplier');
    const adminActionLogs = byLogType(filteredLogs, 'admin');

    console.info("[admin/logs] collection=logs count=%d", filteredLogs.length);

    return NextResponse.json({
      bookingLogs,
      paymentLogs,
      supplierLogs,
      adminActionLogs,
    });
  } catch (error) {
    console.error(
      "[admin/logs] fetch failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: 'Failed to fetch admin logs' },
      { status: 500 },
    );
  }
}
