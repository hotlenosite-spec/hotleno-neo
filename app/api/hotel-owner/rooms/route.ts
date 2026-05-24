import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  canManageHotelCore,
  getHotelOwnerContext,
  isAuthResponse,
} from '@/lib/hotel-owner-auth';
import HotelProperty from '@/models/HotelProperty';
import HotelRoom from '@/models/HotelRoom';

const roomPayloadSchema = z.object({
  hotelRoomId: z.string().optional(),
  hotelPropertyId: z.string().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  roomType: z.string().trim().optional(),
  maxAdults: z.number().min(0).optional(),
  maxChildren: z.number().min(0).optional(),
  maxOccupancy: z.number().min(0).optional(),
  bedType: z.string().trim().optional(),
  size: z.string().trim().optional(),
  amenities: z.array(z.string().trim()).optional(),
  images: z.array(z.unknown()).optional(),
  basePrice: z.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  cancellationPolicy: z.string().optional(),
  mealPlan: z.string().trim().optional(),
  metadata: z.record(z.unknown()).optional(),
});

function toRoomUpdate(data: z.infer<typeof roomPayloadSchema>) {
  return {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.roomType !== undefined && { roomType: data.roomType }),
    ...(data.maxAdults !== undefined && { maxAdults: data.maxAdults }),
    ...(data.maxChildren !== undefined && { maxChildren: data.maxChildren }),
    ...(data.maxOccupancy !== undefined && { maxOccupancy: data.maxOccupancy }),
    ...(data.bedType !== undefined && { bedType: data.bedType }),
    ...(data.size !== undefined && { size: data.size }),
    ...(data.amenities !== undefined && { amenities: data.amenities }),
    ...(data.images !== undefined && { images: data.images }),
    ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
    ...(data.currency !== undefined && { currency: data.currency }),
    ...(data.cancellationPolicy !== undefined && {
      cancellationPolicy: data.cancellationPolicy,
    }),
    ...(data.mealPlan !== undefined && { mealPlan: data.mealPlan }),
    ...(data.metadata !== undefined && { metadata: data.metadata }),
    status: 'pending_review',
  };
}

async function assertPropertyAccess(hotelPropertyId: string, hotelPartnerId: unknown) {
  return HotelProperty.exists({
    _id: hotelPropertyId,
    hotelPartnerId,
  });
}

export async function GET(req: NextRequest) {
  try {
    const context = await getHotelOwnerContext(req);
    if (isAuthResponse(context)) return context;

    if (!canManageHotelCore(context.role)) {
      return NextResponse.json(
        { error: 'Hotel staff cannot view room setup' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const hotelPropertyId = searchParams.get('hotelPropertyId');
    const query: Record<string, unknown> = {
      hotelPartnerId: context.hotelPartnerId,
    };
    if (hotelPropertyId) query.hotelPropertyId = hotelPropertyId;

    const rooms = await HotelRoom.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Hotel owner rooms fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getHotelOwnerContext(req);
    if (isAuthResponse(context)) return context;

    if (!canManageHotelCore(context.role)) {
      return NextResponse.json(
        { error: 'Hotel staff cannot create rooms' },
        { status: 403 },
      );
    }

    const validation = roomPayloadSchema
      .extend({
        hotelPropertyId: z.string().min(1),
        name: z.string().trim().min(1),
      })
      .safeParse(await req.json());

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 },
      );
    }

    const hasAccess = await assertPropertyAccess(
      validation.data.hotelPropertyId,
      context.hotelPartnerId,
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const room = await HotelRoom.create({
      ...toRoomUpdate(validation.data),
      hotelPropertyId: validation.data.hotelPropertyId,
      hotelPartnerId: context.hotelPartnerId,
      status: 'draft',
    });

    return NextResponse.json({ success: true, room }, { status: 201 });
  } catch (error) {
    console.error('Hotel owner room create error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const context = await getHotelOwnerContext(req);
    if (isAuthResponse(context)) return context;

    if (!canManageHotelCore(context.role)) {
      return NextResponse.json(
        { error: 'Hotel staff cannot modify rooms' },
        { status: 403 },
      );
    }

    const validation = roomPayloadSchema
      .extend({ hotelRoomId: z.string().min(1) })
      .safeParse(await req.json());

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 },
      );
    }

    const room = await HotelRoom.findOneAndUpdate(
      {
        _id: validation.data.hotelRoomId,
        hotelPartnerId: context.hotelPartnerId,
      },
      toRoomUpdate(validation.data),
      { new: true, runValidators: true },
    );

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Hotel owner room update error:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
