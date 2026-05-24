import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  canManageHotelCore,
  getHotelOwnerContext,
  isAuthResponse,
} from '@/lib/hotel-owner-auth';
import HotelRoom from '@/models/HotelRoom';
import HotelRoomAvailability from '@/models/HotelRoomAvailability';

const availabilityPayloadSchema = z.object({
  availabilityId: z.string().optional(),
  hotelRoomId: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
  availableRooms: z.number().min(0).optional(),
  stopSell: z.boolean().optional(),
  minNights: z.number().min(1).optional(),
  maxNights: z.number().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

function toAvailabilityUpdate(data: z.infer<typeof availabilityPayloadSchema>) {
  return {
    ...(data.date !== undefined && { date: data.date }),
    ...(data.availableRooms !== undefined && {
      availableRooms: data.availableRooms,
    }),
    ...(data.stopSell !== undefined && { stopSell: data.stopSell }),
    ...(data.minNights !== undefined && { minNights: data.minNights }),
    ...(data.maxNights !== undefined && { maxNights: data.maxNights }),
    ...(data.metadata !== undefined && { metadata: data.metadata }),
  };
}

async function getScopedRoom(hotelRoomId: string, hotelPartnerId: unknown) {
  return HotelRoom.findOne({
    _id: hotelRoomId,
    hotelPartnerId,
  }).select('_id hotelPropertyId hotelPartnerId');
}

export async function GET(req: NextRequest) {
  try {
    const context = await getHotelOwnerContext(req);
    if (isAuthResponse(context)) return context;

    const { searchParams } = new URL(req.url);
    const hotelRoomId = searchParams.get('hotelRoomId');

    const scopedRoomIds = await HotelRoom.find({
      hotelPartnerId: context.hotelPartnerId,
      ...(hotelRoomId && { _id: hotelRoomId }),
    })
      .select('_id')
      .lean();

    const availabilities = await HotelRoomAvailability.find({
      hotelRoomId: { $in: scopedRoomIds.map((room) => room._id) },
    })
      .sort({ date: 1 })
      .lean();

    return NextResponse.json({ availabilities });
  } catch (error) {
    console.error('Hotel owner availability fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getHotelOwnerContext(req);
    if (isAuthResponse(context)) return context;

    if (!canManageHotelCore(context.role)) {
      return NextResponse.json(
        { error: 'Hotel staff cannot create availability' },
        { status: 403 },
      );
    }

    const validation = availabilityPayloadSchema
      .extend({
        hotelRoomId: z.string().min(1),
        date: z.coerce.date(),
      })
      .safeParse(await req.json());

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 },
      );
    }

    const room = await getScopedRoom(
      validation.data.hotelRoomId,
      context.hotelPartnerId,
    );

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const availability = await HotelRoomAvailability.create({
      ...toAvailabilityUpdate(validation.data),
      hotelRoomId: room._id,
      hotelPropertyId: room.hotelPropertyId,
      availableRooms: validation.data.availableRooms ?? 0,
      stopSell: validation.data.stopSell ?? true,
      minNights: validation.data.minNights ?? 1,
      maxNights: validation.data.maxNights ?? 0,
    });

    return NextResponse.json({ success: true, availability }, { status: 201 });
  } catch (error) {
    console.error('Hotel owner availability create error:', error);
    return NextResponse.json(
      { error: 'Failed to create availability' },
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
        { error: 'Hotel staff cannot modify availability' },
        { status: 403 },
      );
    }

    const validation = availabilityPayloadSchema
      .extend({ availabilityId: z.string().min(1) })
      .safeParse(await req.json());

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 },
      );
    }

    const scopedRoomIds = await HotelRoom.find({
      hotelPartnerId: context.hotelPartnerId,
    })
      .select('_id')
      .lean();

    const availability = await HotelRoomAvailability.findOneAndUpdate(
      {
        _id: validation.data.availabilityId,
        hotelRoomId: { $in: scopedRoomIds.map((room) => room._id) },
      },
      toAvailabilityUpdate(validation.data),
      { new: true, runValidators: true },
    );

    if (!availability) {
      return NextResponse.json(
        { error: 'Availability not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, availability });
  } catch (error) {
    console.error('Hotel owner availability update error:', error);
    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 },
    );
  }
}
