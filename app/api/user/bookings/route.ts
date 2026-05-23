import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { verifyToken } from '@/lib/jwt';

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
    
    // Create new booking
    const booking = new Booking({
      userId: decoded.userId,
      bookingReference: body.bookingReference || `HTL-${Date.now()}`,
      travellandaReference: body.travellandaReference,
      yourReference: body.yourReference,
      hotelId: body.hotelId,
      hotelName: body.hotelName,
      location: body.location,
      checkInDate: new Date(body.checkInDate),
      checkOutDate: new Date(body.checkOutDate),
      rooms: body.rooms,
      leadGuest: body.leadGuest,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      totalPrice: body.totalPrice,
      currency: body.currency,
      status: body.status || 'pending',
      specialRequests: body.specialRequests,
      cancellationPolicies: body.cancellationPolicies,
      alerts: body.alerts,
      restrictions: body.restrictions,
    });
    
    await booking.save();
    
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