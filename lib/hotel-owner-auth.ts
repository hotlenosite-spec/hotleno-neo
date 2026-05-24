import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { verifyToken } from '@/lib/jwt';
import User from '@/models/User';

export type HotelOwnerRole = 'hotel_owner' | 'hotel_manager' | 'hotel_staff';

export interface HotelOwnerContext {
  userId: string;
  role: HotelOwnerRole;
  hotelPartnerId: mongoose.Types.ObjectId;
}

export function isHotelOwnerRole(role?: string): role is HotelOwnerRole {
  return role === 'hotel_owner' || role === 'hotel_manager' || role === 'hotel_staff';
}

export function canManageHotelCore(role: HotelOwnerRole) {
  return role === 'hotel_owner' || role === 'hotel_manager';
}

export function canCreateHotelProperty(role: HotelOwnerRole) {
  return role === 'hotel_owner';
}

export async function getHotelOwnerContext(
  req: NextRequest,
): Promise<HotelOwnerContext | NextResponse> {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: 'Database not configured yet' },
      { status: 503 },
    );
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  await dbConnect();

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.userId).select(
    '_id role hotelPartnerId isActive',
  );

  if (!user || user.isActive === false || !isHotelOwnerRole(user.role)) {
    return NextResponse.json(
      { error: 'Hotel owner access required' },
      { status: 403 },
    );
  }

  if (!user.hotelPartnerId) {
    return NextResponse.json(
      { error: 'User is not linked to a hotel partner' },
      { status: 403 },
    );
  }

  return {
    userId: user._id.toString(),
    role: user.role,
    hotelPartnerId: user.hotelPartnerId,
  };
}

export function isAuthResponse(
  value: HotelOwnerContext | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
