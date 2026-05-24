import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import BookingLog from '@/models/BookingLog';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';
import { isBookingStatus } from '@/lib/booking-status';

// GET - Fetch user's booking history
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
    
    await dbConnect();
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    // Build query
    const query: Record<string, unknown> = { userId: decoded.userId };
    if (status) {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Fetch bookings
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Booking.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error('Bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST - Create a new booking (called after successful Travellanda booking)
export async function POST(req: NextRequest) {
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
    
    await dbConnect();

    const user = await User.findById(decoded.userId).select(
      'name email accountType agencyId agencyRole role',
    );
    
    const bookingStatus = isBookingStatus(body.status)
      ? body.status
      : 'pending_payment';
    const channel = body.channel === 'b2b' || user?.accountType === 'b2b'
      ? 'b2b'
      : 'b2c';
    const totalPrice = Number(body.totalPrice) || 0;
    const finalSellingPrice = Number(body.finalSellingPrice) || totalPrice;

    // Create new booking
    const booking = new Booking({
      userId: decoded.userId,
      channel,
      agencyId: channel === 'b2b' ? body.agencyId || user?.agencyId : null,
      agencyUserId: channel === 'b2b' ? body.agencyUserId || decoded.userId : null,
      agencyRole: channel === 'b2b' ? body.agencyRole || user?.agencyRole || '' : '',
      agentName: channel === 'b2b' ? body.agentName || user?.name || '' : '',
      customerUserId: channel === 'b2c' ? decoded.userId : body.customerUserId || null,
      customerEmail: body.customerEmail || body.contactEmail || user?.email || '',
      customerName: body.customerName || body.leadGuest || user?.name || '',
      bookingReference: body.bookingReference || `HTL-${Date.now()}`,
      travellandaReference: body.travellandaReference,
      yourReference: body.yourReference,
      supplier: body.supplier || 'none',
      supplierHotelId: body.supplierHotelId,
      supplierRateKey: body.supplierRateKey,
      supplierBookingReference: body.supplierBookingReference,
      hotelId: body.hotelId,
      hotelName: body.hotelName,
      location: body.location,
      checkInDate: new Date(body.checkInDate),
      checkOutDate: new Date(body.checkOutDate),
      rooms: body.rooms,
      leadGuest: body.leadGuest,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      totalPrice,
      netPrice: Number(body.netPrice) || totalPrice,
      markupAmount: Number(body.markupAmount) || 0,
      markupPercent: Number(body.markupPercent) || 0,
      commissionAmount: Number(body.commissionAmount) || 0,
      finalSellingPrice,
      currency: body.currency,
      paymentMethodType: body.paymentMethodType || 'card',
      agencyBalanceBefore: Number(body.agencyBalanceBefore) || 0,
      agencyBalanceAfter: Number(body.agencyBalanceAfter) || 0,
      creditLimitUsed: Number(body.creditLimitUsed) || 0,
      status: bookingStatus,
      paymentStatus: body.paymentStatus || 'pending',
      supplierStatus: body.supplierStatus || 'not_started',
      specialRequests: body.specialRequests,
      cancellationPolicies: body.cancellationPolicies,
      alerts: body.alerts,
      restrictions: body.restrictions,
      stripeSessionId: body.stripeSessionId,
      stripeCheckoutSessionId: body.stripeCheckoutSessionId,
      stripePaymentIntentId: body.stripePaymentIntentId,
      failureReason: body.failureReason,
      rawSupplierRequest: body.rawSupplierRequest,
      rawSupplierResponse: body.rawSupplierResponse,
      idempotencyKey: body.idempotencyKey,
      metadata: body.metadata,
    });
    
    await booking.save();

    await BookingLog.create({
      bookingId: booking._id,
      type: 'booking_created',
      status: 'success',
      message: 'Internal booking created before payment',
      request: {
        hotelId: body.hotelId,
        hotelName: body.hotelName,
        checkInDate: body.checkInDate,
        checkOutDate: body.checkOutDate,
        totalPrice: body.totalPrice,
        currency: body.currency,
        supplier: body.supplier || 'none',
        channel,
      },
      response: {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        channel: booking.channel,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        supplierStatus: booking.supplierStatus,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      booking,
    }, { status: 201 });
    
  } catch (error: unknown) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create booking' },
      { status: 500 }
    );
  }
}
