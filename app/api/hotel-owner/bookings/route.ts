import { NextRequest, NextResponse } from 'next/server';
import {
  getHotelOwnerContext,
  isAuthResponse,
} from '@/lib/hotel-owner-auth';
import Booking from '@/models/Booking';

export async function GET(req: NextRequest) {
  try {
    const context = await getHotelOwnerContext(req);
    if (isAuthResponse(context)) return context;

    const bookings = await Booking.find({
      inventorySource: 'hotel_partner',
      hotelPartnerId: context.hotelPartnerId,
    })
      .select(
        'bookingReference hotelName checkInDate checkOutDate leadGuest contactEmail totalPrice currency status paymentStatus hotelPartnerBookingStatus createdAt',
      )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Hotel owner bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 },
    );
  }
}
