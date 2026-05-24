import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  canCreateHotelProperty,
  canManageHotelCore,
  getHotelOwnerContext,
  isAuthResponse,
} from '@/lib/hotel-owner-auth';
import HotelProperty from '@/models/HotelProperty';

const propertyPayloadSchema = z.object({
  hotelPropertyId: z.string().optional(),
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  starRating: z.number().min(0).max(5).optional(),
  country: z.string().trim().optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().or(z.literal('')).optional(),
  amenities: z.array(z.string().trim()).optional(),
  images: z.array(z.unknown()).optional(),
  policies: z.record(z.unknown()).optional(),
  checkInTime: z.string().trim().optional(),
  checkOutTime: z.string().trim().optional(),
  metadata: z.record(z.unknown()).optional(),
});

function toPropertyUpdate(data: z.infer<typeof propertyPayloadSchema>) {
  return {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.starRating !== undefined && { starRating: data.starRating }),
    ...(data.country !== undefined && { country: data.country }),
    ...(data.city !== undefined && { city: data.city }),
    ...(data.address !== undefined && { address: data.address }),
    ...(data.latitude !== undefined && { latitude: data.latitude }),
    ...(data.longitude !== undefined && { longitude: data.longitude }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.amenities !== undefined && { amenities: data.amenities }),
    ...(data.images !== undefined && { images: data.images }),
    ...(data.policies !== undefined && { policies: data.policies }),
    ...(data.checkInTime !== undefined && { checkInTime: data.checkInTime }),
    ...(data.checkOutTime !== undefined && { checkOutTime: data.checkOutTime }),
    ...(data.metadata !== undefined && { metadata: data.metadata }),
    status: 'pending_review',
    isPublished: false,
  };
}

export async function GET(req: NextRequest) {
  try {
    const context = await getHotelOwnerContext(req);
    if (isAuthResponse(context)) return context;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {
      hotelPartnerId: context.hotelPartnerId,
    };
    if (status && status !== 'all') query.status = status;

    const properties = await HotelProperty.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ properties });
  } catch (error) {
    console.error('Hotel owner properties fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getHotelOwnerContext(req);
    if (isAuthResponse(context)) return context;

    if (!canCreateHotelProperty(context.role)) {
      return NextResponse.json(
        { error: 'Only hotel owners can create properties' },
        { status: 403 },
      );
    }

    const validation = propertyPayloadSchema
      .extend({ name: z.string().trim().min(1) })
      .safeParse(await req.json());

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 },
      );
    }

    const property = await HotelProperty.create({
      ...toPropertyUpdate(validation.data),
      hotelPartnerId: context.hotelPartnerId,
      ownerUserId: context.userId,
      status: 'draft',
      isPublished: false,
      source: 'hotel_partner',
    });

    return NextResponse.json({ success: true, property }, { status: 201 });
  } catch (error) {
    console.error('Hotel owner property create error:', error);
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const context = await getHotelOwnerContext(req);
    if (isAuthResponse(context)) return context;

    if (!canManageHotelCore(context.role)) {
      return NextResponse.json(
        { error: 'Hotel staff cannot modify property details' },
        { status: 403 },
      );
    }

    const validation = propertyPayloadSchema
      .extend({ hotelPropertyId: z.string().min(1) })
      .safeParse(await req.json());

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 },
      );
    }

    const property = await HotelProperty.findOneAndUpdate(
      {
        _id: validation.data.hotelPropertyId,
        hotelPartnerId: context.hotelPartnerId,
      },
      toPropertyUpdate(validation.data),
      { new: true, runValidators: true },
    );

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, property });
  } catch (error) {
    console.error('Hotel owner property update error:', error);
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 },
    );
  }
}
