import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { verifyToken } from '@/lib/jwt';
import User from '@/models/User';
import HotelPartner, {
  HOTEL_PARTNER_VERIFICATION_STATUSES,
} from '@/models/HotelPartner';
import HotelProperty, {
  HOTEL_PROPERTY_STATUSES,
} from '@/models/HotelProperty';
import HotelRoom from '@/models/HotelRoom';
import AdminActionLog from '@/models/AdminActionLog';

const propertyStatusSchema = z.enum(HOTEL_PROPERTY_STATUSES);
const partnerVerificationStatusSchema = z.enum(
  HOTEL_PARTNER_VERIFICATION_STATUSES,
);

async function getAdminUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) return null;

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.userId).select('_id role');

  return user && user.role === 'admin' ? user : null;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const city = searchParams.get('city');
    const country = searchParams.get('country');
    const search = searchParams.get('search');
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '20')));

    const query: Record<string, unknown> = {};

    if (status && status !== 'all') query.status = status;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (country) query.country = { $regex: country, $options: 'i' };

    if (search) {
      const matchingPartners = await HotelPartner.find({
        $or: [
          { companyName: { $regex: search, $options: 'i' } },
          { legalName: { $regex: search, $options: 'i' } },
          { contactEmail: { $regex: search, $options: 'i' } },
        ],
      })
        .select('_id')
        .lean();

      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { hotelPartnerId: { $in: matchingPartners.map((partner) => partner._id) } },
      ];
    }

    const skip = (page - 1) * limit;
    const [properties, total] = await Promise.all([
      HotelProperty.find(query)
        .populate('hotelPartnerId', 'companyName legalName verificationStatus status contactEmail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HotelProperty.countDocuments(query),
    ]);

    const propertyIds = properties.map((property) => property._id);
    const roomCounts = await HotelRoom.aggregate([
      { $match: { hotelPropertyId: { $in: propertyIds } } },
      { $group: { _id: '$hotelPropertyId', count: { $sum: 1 } } },
    ]);
    const roomCountMap = new Map(
      roomCounts.map((item: { _id: unknown; count: number }) => [
        String(item._id),
        item.count,
      ]),
    );

    const hotels = properties.map((property) => {
      const partner =
        typeof property.hotelPartnerId === 'object' && property.hotelPartnerId
          ? property.hotelPartnerId
          : null;

      return {
        id: String(property._id),
        name: property.name,
        city: property.city,
        country: property.country,
        status: property.status,
        isPublished: property.isPublished,
        adminNotes: property.adminNotes,
        createdAt: property.createdAt,
        roomCount: roomCountMap.get(String(property._id)) || 0,
        partner: partner
          ? {
              id: String(partner._id),
              companyName: partner.companyName || partner.legalName || '',
              verificationStatus: partner.verificationStatus,
              status: partner.status,
              contactEmail: partner.contactEmail,
            }
          : null,
      };
    });

    return NextResponse.json({
      hotels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin hotels fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotel properties' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const action = z
      .enum(['update_property_status', 'add_admin_note', 'update_partner_verification'])
      .safeParse(body.action);

    if (!action.success) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action.data === 'update_property_status') {
      const statusValidation = propertyStatusSchema.safeParse(body.status);
      if (!body.hotelPropertyId || !statusValidation.success) {
        return NextResponse.json(
          { error: 'hotelPropertyId and valid status are required' },
          { status: 400 },
        );
      }

      const property = await HotelProperty.findByIdAndUpdate(
        body.hotelPropertyId,
        {
          status: statusValidation.data,
          isPublished: false,
        },
        { new: true, runValidators: true },
      );

      if (!property) {
        return NextResponse.json(
          { error: 'Hotel property not found' },
          { status: 404 },
        );
      }

      await AdminActionLog.create({
        adminUserId: adminUser._id,
        targetType: 'hotel_property',
        targetId: property._id,
        type: 'hotel_property_status_updated',
        status: 'success',
        message: `Hotel property status changed to ${statusValidation.data}`,
        request: { status: statusValidation.data },
        response: { hotelPropertyId: property._id, isPublished: property.isPublished },
      });

      return NextResponse.json({ success: true, hotel: property });
    }

    if (action.data === 'add_admin_note') {
      const note = z.string().trim().min(1).max(5000).safeParse(body.note);
      if (!body.hotelPropertyId || !note.success) {
        return NextResponse.json(
          { error: 'hotelPropertyId and note are required' },
          { status: 400 },
        );
      }

      const property = await HotelProperty.findByIdAndUpdate(
        body.hotelPropertyId,
        { adminNotes: note.data },
        { new: true, runValidators: true },
      );

      if (!property) {
        return NextResponse.json(
          { error: 'Hotel property not found' },
          { status: 404 },
        );
      }

      await AdminActionLog.create({
        adminUserId: adminUser._id,
        targetType: 'hotel_property',
        targetId: property._id,
        type: 'hotel_property_admin_note_added',
        status: 'success',
        message: 'Admin note added to hotel property',
        request: { note: note.data },
      });

      return NextResponse.json({ success: true, hotel: property });
    }

    const verificationValidation = partnerVerificationStatusSchema.safeParse(
      body.verificationStatus,
    );

    if (!body.hotelPartnerId || !verificationValidation.success) {
      return NextResponse.json(
        { error: 'hotelPartnerId and valid verificationStatus are required' },
        { status: 400 },
      );
    }

    const partner = await HotelPartner.findByIdAndUpdate(
      body.hotelPartnerId,
      { verificationStatus: verificationValidation.data },
      { new: true, runValidators: true },
    );

    if (!partner) {
      return NextResponse.json(
        { error: 'Hotel partner not found' },
        { status: 404 },
      );
    }

    await AdminActionLog.create({
      adminUserId: adminUser._id,
      targetType: 'hotel_partner',
      targetId: partner._id,
      type: 'hotel_partner_verification_updated',
      status: 'success',
      message: `Hotel partner verification changed to ${verificationValidation.data}`,
      request: { verificationStatus: verificationValidation.data },
    });

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error('Admin hotels update error:', error);
    return NextResponse.json(
      { error: 'Failed to update hotel property' },
      { status: 500 },
    );
  }
}
