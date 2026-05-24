import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import BookingLog from '@/models/BookingLog';
import SupplierLog from '@/models/SupplierLog';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';
import { isBookingStatus } from '@/lib/booking-status';

const operationalStatuses = [
  'pending_payment',
  'payment_succeeded',
  'supplier_booking_pending',
  'supplier_booking_failed',
  'refund_required',
];

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
    
    // Check if user is admin
    await dbConnect();
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const supplierStatus = searchParams.get('supplierStatus');
    const operationalFilter = searchParams.get('operationalFilter');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    
    // Build query
    const query: Record<string, unknown> = {};
    
    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (supplierStatus) {
      query.supplierStatus = supplierStatus;
    }

    if (operationalFilter === 'refund_required') {
      query.status = 'refund_required';
    }

    if (operationalFilter === 'supplier_booking_failed') {
      query.status = 'supplier_booking_failed';
    }
    
    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      })
        .select('_id')
        .limit(50);

      query.$or = [
        { bookingReference: { $regex: search, $options: 'i' } },
        { hotelName: { $regex: search, $options: 'i' } },
        { leadGuest: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
        ...matchingUsers.map((matchedUser) => ({ userId: matchedUser._id })),
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Fetch bookings with user details
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');
    
    // Get total count
    const total = await Booking.countDocuments(query);
    const operationalCountsResult = await Booking.aggregate([
      {
        $match: {
          status: { $in: operationalStatuses },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    const operationalCounts = operationalStatuses.reduce<Record<string, number>>(
      (counts, statusName) => {
        counts[statusName] =
          operationalCountsResult.find((item) => item._id === statusName)
            ?.count || 0;
        return counts;
      },
      {},
    );
    
    return NextResponse.json({
      bookings,
      operationalCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error('Admin bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// PATCH - Update booking status
export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    const body = await req.json();
    
    // Check if user is admin
    await dbConnect();
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    const { bookingId, status, action, note } = body;
    
    if (!bookingId || (!status && !action)) {
      return NextResponse.json(
        { error: 'Booking ID and status or action are required' },
        { status: 400 }
      );
    }

    if (action === 'retry_supplier_booking') {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      if (!['supplier_booking_failed', 'refund_required'].includes(booking.status)) {
        return NextResponse.json(
          { error: 'Retry is only available for failed supplier bookings or refund-required bookings' },
          { status: 400 }
        );
      }

      booking.status = 'supplier_booking_pending';
      booking.supplierStatus = 'pending';
      booking.failureReason = '';
      booking.metadata = {
        ...(booking.metadata ?? {}),
        retryRequestedAt: new Date().toISOString(),
        retryRequestedBy: decoded.userId,
        retryMode: 'admin_placeholder_only',
      };
      await booking.save();

      await SupplierLog.create({
        bookingId: booking._id,
        supplier: booking.supplier || 'none',
        type: 'supplier_booking_retry_requested',
        status: 'pending',
        message: 'Admin requested supplier booking retry; no real supplier was called',
        request: {
          action,
          previousStatus: 'supplier_booking_failed_or_refund_required',
          mode: 'admin_placeholder_only',
        },
        response: {
          bookingStatus: booking.status,
          supplierStatus: booking.supplierStatus,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Supplier booking retry queued',
        booking,
      });
    }

    if (action === 'mark_reviewed') {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      booking.metadata = {
        ...(booking.metadata ?? {}),
        reviewedAt: new Date().toISOString(),
        reviewedBy: decoded.userId,
      };
      await booking.save();

      await BookingLog.create({
        bookingId: booking._id,
        type: 'booking_marked_reviewed',
        status: 'success',
        message: 'Admin marked booking as reviewed',
        request: { action },
        response: {
          bookingStatus: booking.status,
          reviewedAt: booking.metadata.reviewedAt,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Booking marked as reviewed',
        booking,
      });
    }

    if (action === 'mark_refund_required') {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      booking.status = 'refund_required';
      booking.paymentStatus = 'refund_required';
      booking.metadata = {
        ...(booking.metadata ?? {}),
        refundRequiredAt: new Date().toISOString(),
        refundRequiredBy: decoded.userId,
        refundMode: 'admin_review_only_no_stripe_refund',
      };
      await booking.save();

      await BookingLog.create({
        bookingId: booking._id,
        type: 'booking_marked_refund_required',
        status: 'success',
        message: 'Admin marked booking as refund required; no Stripe refund was executed',
        request: { action },
        response: {
          bookingStatus: booking.status,
          paymentStatus: booking.paymentStatus,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Booking marked as refund required',
        booking,
      });
    }

    if (action === 'mark_cancelled') {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      booking.status = 'cancelled';
      booking.supplierStatus = 'cancelled';
      booking.metadata = {
        ...(booking.metadata ?? {}),
        cancelledAt: new Date().toISOString(),
        cancelledBy: decoded.userId,
        cancellationMode: 'admin_internal_only_no_supplier_cancel',
      };
      await booking.save();

      await BookingLog.create({
        bookingId: booking._id,
        type: 'booking_marked_cancelled',
        status: 'success',
        message: 'Admin marked booking as cancelled; no supplier cancellation was executed',
        request: { action },
        response: {
          bookingStatus: booking.status,
          supplierStatus: booking.supplierStatus,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Booking marked as cancelled',
        booking,
      });
    }

    if (action === 'add_admin_note') {
      if (typeof note !== 'string' || note.trim().length === 0) {
        return NextResponse.json(
          { error: 'Admin note is required' },
          { status: 400 }
        );
      }

      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      const existingNotes = Array.isArray(booking.metadata?.adminNotes)
        ? booking.metadata.adminNotes
        : [];

      const adminNote = {
        note: note.trim(),
        createdAt: new Date().toISOString(),
        createdBy: decoded.userId,
      };

      booking.metadata = {
        ...(booking.metadata ?? {}),
        adminNotes: [...existingNotes, adminNote],
      };
      await booking.save();

      await BookingLog.create({
        bookingId: booking._id,
        type: 'admin_note_added',
        status: 'success',
        message: 'Admin note added to booking metadata',
        request: { action },
        response: {
          noteCreatedAt: adminNote.createdAt,
          noteCreatedBy: adminNote.createdBy,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Admin note added',
        booking,
      });
    }

    if (!isBookingStatus(status)) {
      return NextResponse.json(
        { error: 'Invalid booking status' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    );
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    await BookingLog.create({
      bookingId: booking._id,
      type: 'booking_status_updated',
      status: 'success',
      message: 'Admin updated booking status',
      request: { status },
      response: { bookingStatus: booking.status },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Booking status updated',
      booking,
    });
    
  } catch (error) {
    console.error('Booking update error:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}
