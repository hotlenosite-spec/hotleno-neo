import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Agency, { AGENCY_STATUSES } from '@/models/Agency';
import AdminActionLog from '@/models/AdminActionLog';
import User, { AGENCY_ROLES } from '@/models/User';
import { verifyToken } from '@/lib/jwt';

const agencyStatusSchema = z.enum(AGENCY_STATUSES);
const agencyRoleSchema = z.enum(AGENCY_ROLES);

const agencyPayloadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  commercialName: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  status: agencyStatusSchema.optional(),
  commissionRate: z.number().min(0).optional(),
  markupRate: z.number().min(0).optional(),
  creditLimit: z.number().min(0).optional(),
  balance: z.number().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const createAgencySchema = agencyPayloadSchema.extend({
  name: z.string().min(1).max(200),
});

function getAgencyUserRole(agencyRole: z.infer<typeof agencyRoleSchema>) {
  switch (agencyRole) {
    case 'owner':
      return 'agency_owner';
    case 'manager':
      return 'agency_manager';
    case 'agent':
      return 'agency_agent';
    case 'accountant':
      return 'agency_accountant';
  }
}

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return { error: 'No token provided', status: 401 };
  }

  const decoded = verifyToken(token);
  await dbConnect();
  const user = await User.findById(decoded.userId);

  if (!user || user.role !== 'admin') {
    return { error: 'Unauthorized - Admin access required', status: 403 };
  }

  return { user };
}

async function logAdminAction(params: {
  adminUserId: mongoose.Types.ObjectId;
  targetType: 'agency' | 'user';
  targetId?: mongoose.Types.ObjectId;
  type: string;
  message: string;
  request?: unknown;
  response?: unknown;
}) {
  await AdminActionLog.create({
    adminUserId: params.adminUserId,
    targetType: params.targetType,
    targetId: params.targetId,
    type: params.type,
    status: 'success',
    message: params.message,
    request: params.request ?? null,
    response: params.response ?? null,
  });
}

function buildAgencyQuery(searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const city = searchParams.get('city');
  const country = searchParams.get('country');
  const search = searchParams.get('search');
  const query: Record<string, unknown> = {};

  if (status) {
    query.status = status;
  }

  if (city) {
    query.city = { $regex: city, $options: 'i' };
  }

  if (country) {
    query.country = { $regex: country, $options: 'i' };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { commercialName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  return query;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);

    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const query = buildAgencyQuery(searchParams);
    const skip = (page - 1) * limit;

    const [agencies, total] = await Promise.all([
      Agency.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Agency.countDocuments(query),
    ]);

    return NextResponse.json({
      agencies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin agencies fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agencies' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);

    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const body = await req.json();
    const validation = createAgencySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { balance: _balance, ...agencyData } = validation.data;
    const agency = await Agency.create(agencyData);

    await logAdminAction({
      adminUserId: auth.user._id,
      targetType: 'agency',
      targetId: agency._id,
      type: 'agency_created',
      message: 'Admin created B2B agency',
      request: {
        name: validation.data.name,
        email: validation.data.email,
        status: validation.data.status ?? 'pending',
      },
      response: {
        agencyId: agency._id,
        status: agency.status,
      },
    });

    return NextResponse.json({ success: true, agency }, { status: 201 });
  } catch (error) {
    console.error('Admin agency create error:', error);
    return NextResponse.json(
      { error: 'Failed to create agency' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);

    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const body = await req.json();
    const { action, agencyId, userId } = body;

    if (!agencyId || !mongoose.Types.ObjectId.isValid(agencyId)) {
      return NextResponse.json(
        { error: 'Valid agencyId is required' },
        { status: 400 },
      );
    }

    const agency = await Agency.findById(agencyId);

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 },
      );
    }

    if (action === 'link_user') {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return NextResponse.json(
          { error: 'Valid userId is required' },
          { status: 400 },
        );
      }

      const roleValidation = agencyRoleSchema.safeParse(body.agencyRole);

      if (!roleValidation.success) {
        return NextResponse.json(
          { error: 'Valid agencyRole is required' },
          { status: 400 },
        );
      }

      const user = await User.findByIdAndUpdate(
        userId,
        {
          agencyId: agency._id,
          agencyRole: roleValidation.data,
          accountType: 'b2b',
          role: getAgencyUserRole(roleValidation.data),
        },
        { new: true, runValidators: true },
      ).select('-password');

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 },
        );
      }

      await logAdminAction({
        adminUserId: auth.user._id,
        targetType: 'user',
        targetId: user._id,
        type: 'agency_user_linked',
        message: 'Admin linked user to B2B agency',
        request: {
          agencyId,
          userId,
          agencyRole: roleValidation.data,
        },
        response: {
          userId: user._id,
          agencyId: user.agencyId,
          agencyRole: user.agencyRole,
          role: user.role,
        },
      });

      return NextResponse.json({ success: true, user });
    }

    if (action === 'change_status') {
      const statusValidation = agencyStatusSchema.safeParse(body.status);

      if (!statusValidation.success) {
        return NextResponse.json(
          { error: 'Valid agency status is required' },
          { status: 400 },
        );
      }

      agency.status = statusValidation.data;
      await agency.save();

      await logAdminAction({
        adminUserId: auth.user._id,
        targetType: 'agency',
        targetId: agency._id,
        type: 'agency_status_changed',
        message: 'Admin changed B2B agency status',
        request: { agencyId, status: statusValidation.data },
        response: { agencyId: agency._id, status: agency.status },
      });

      return NextResponse.json({ success: true, agency });
    }

    const validation = agencyPayloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 },
      );
    }

    const update = Object.fromEntries(
      Object.entries(validation.data).filter(
        ([key, value]) => key !== 'balance' && value !== undefined,
      ),
    );

    const updatedAgency = await Agency.findByIdAndUpdate(agencyId, update, {
      new: true,
      runValidators: true,
    });

    await logAdminAction({
      adminUserId: auth.user._id,
      targetType: 'agency',
      targetId: agency._id,
      type: 'agency_updated',
      message: 'Admin updated B2B agency',
      request: update,
      response: {
        agencyId: updatedAgency?._id,
        status: updatedAgency?.status,
      },
    });

    return NextResponse.json({ success: true, agency: updatedAgency });
  } catch (error) {
    console.error('Admin agency update error:', error);
    return NextResponse.json(
      { error: 'Failed to update agency' },
      { status: 500 },
    );
  }
}
