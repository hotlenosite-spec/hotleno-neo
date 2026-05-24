import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import AdminActionLog from '@/models/AdminActionLog';
import Agency from '@/models/Agency';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

const agencyUserRoleSchema = z.enum([
  'agency_owner',
  'agency_manager',
  'agency_agent',
  'agency_accountant',
]);

type AgencyUserRole = z.infer<typeof agencyUserRoleSchema>;

const mutatingActionSchema = z.enum([
  'add_existing_user',
  'update_role',
  'deactivate_user',
  'remove_user',
]);

function toAgencyRole(role: AgencyUserRole) {
  switch (role) {
    case 'agency_owner':
      return 'owner';
    case 'agency_manager':
      return 'manager';
    case 'agency_agent':
      return 'agent';
    case 'agency_accountant':
      return 'accountant';
  }
}

function isAgencyRole(role?: string) {
  return Boolean(role?.startsWith('agency_'));
}

function isAgencyManagerRole(role?: string) {
  return role === 'agency_owner' || role === 'agency_manager';
}

async function requireAgencyUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return { error: 'No token provided', status: 401 };
  }

  const decoded = verifyToken(token);
  await dbConnect();
  const user = await User.findById(decoded.userId);

  if (!user) {
    return { error: 'User not found', status: 404 };
  }

  const isAdmin = user.role === 'admin';
  const isAgencyUser = isAgencyRole(user.role) && Boolean(user.agencyId);

  if (!isAdmin && !isAgencyUser) {
    return { error: 'Agency access required', status: 403 };
  }

  if (user.role === 'agency_agent') {
    return { error: 'Agency agents cannot manage agency users', status: 403 };
  }

  return { user, isAdmin };
}

function getRequestedAgencyId(
  req: NextRequest,
  actor: { user: typeof User.prototype; isAdmin: boolean },
) {
  const { searchParams } = new URL(req.url);
  const agencyId = searchParams.get('agencyId');

  if (actor.isAdmin) {
    return agencyId || '';
  }

  return actor.user.agencyId?.toString() || '';
}

function assertCanManageTarget(params: {
  actorRole: string;
  actorId: string;
  targetId: string;
  targetRole?: string;
  nextRole?: AgencyUserRole;
}) {
  if (!isAgencyManagerRole(params.actorRole) && params.actorRole !== 'admin') {
    return 'Only agency owners, agency managers, and admins can manage agency users';
  }

  if (
    params.actorRole === 'agency_manager' &&
    (params.targetRole === 'agency_owner' || params.nextRole === 'agency_owner')
  ) {
    return 'Agency managers cannot manage agency owners';
  }

  if (params.actorId === params.targetId && params.actorRole !== 'admin') {
    return 'Agency users cannot change their own agency access';
  }

  return '';
}

async function writeLog(params: {
  actorId: mongoose.Types.ObjectId;
  targetId?: mongoose.Types.ObjectId;
  type: string;
  message: string;
  request?: unknown;
  response?: unknown;
}) {
  await AdminActionLog.create({
    adminUserId: params.actorId,
    targetType: 'user',
    targetId: params.targetId,
    type: params.type,
    status: 'success',
    message: params.message,
    request: params.request ?? null,
    response: params.response ?? null,
  });
}

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAgencyUser(req);

    if ('error' in actor) {
      return NextResponse.json(
        { error: actor.error },
        { status: actor.status },
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search');
    const agencyId = getRequestedAgencyId(req, actor);
    const query: Record<string, unknown> = {};

    if (actor.isAdmin) {
      if (agencyId) {
        if (!mongoose.Types.ObjectId.isValid(agencyId)) {
          return NextResponse.json(
            { error: 'Valid agencyId is required' },
            { status: 400 },
          );
        }
        query.agencyId = agencyId;
      } else {
        query.agencyId = { $ne: null };
      }
    } else {
      query.agencyId = agencyId;
    }

    query.role = { $in: agencyUserRoleSchema.options };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('agencyId', 'name status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Agency users fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agency users' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAgencyUser(req);

    if ('error' in actor) {
      return NextResponse.json(
        { error: actor.error },
        { status: actor.status },
      );
    }

    const body = await req.json();
    const actionValidation = mutatingActionSchema.safeParse(
      body.action || 'add_existing_user',
    );

    if (!actionValidation.success || actionValidation.data !== 'add_existing_user') {
      return NextResponse.json(
        { error: 'Unsupported action' },
        { status: 400 },
      );
    }

    const roleValidation = agencyUserRoleSchema.safeParse(body.agencyRole);

    if (!roleValidation.success) {
      return NextResponse.json(
        { error: 'Valid agencyRole is required' },
        { status: 400 },
      );
    }

    const agencyId = actor.isAdmin
      ? body.agencyId
      : actor.user.agencyId?.toString();

    if (!agencyId || !mongoose.Types.ObjectId.isValid(agencyId)) {
      return NextResponse.json(
        { error: 'Valid agencyId is required' },
        { status: 400 },
      );
    }

    const agency = await Agency.findById(agencyId).select('_id');

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 },
      );
    }

    const target = body.userId
      ? await User.findById(body.userId)
      : await User.findOne({ email: body.email?.toLowerCase()?.trim() });

    if (!target) {
      return NextResponse.json(
        { error: 'Existing user not found' },
        { status: 404 },
      );
    }

    const permissionError = assertCanManageTarget({
      actorRole: actor.user.role,
      actorId: actor.user._id.toString(),
      targetId: target._id.toString(),
      targetRole: target.role,
      nextRole: roleValidation.data,
    });

    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    target.agencyId = agency._id;
    target.agencyRole = toAgencyRole(roleValidation.data);
    target.role = roleValidation.data;
    target.accountType = 'b2b';
    target.isActive = true;
    await target.save();

    await writeLog({
      actorId: actor.user._id,
      targetId: target._id,
      type: 'agency_user_added',
      message: 'Existing user added to agency',
      request: {
        agencyId,
        userId: target._id,
        agencyRole: roleValidation.data,
      },
      response: {
        userId: target._id,
        agencyId: target.agencyId,
        role: target.role,
      },
    });

    const user = await User.findById(target._id).select('-password');
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error('Agency user add error:', error);
    return NextResponse.json(
      { error: 'Failed to add agency user' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAgencyUser(req);

    if ('error' in actor) {
      return NextResponse.json(
        { error: actor.error },
        { status: actor.status },
      );
    }

    const body = await req.json();
    const actionValidation = mutatingActionSchema.safeParse(body.action);

    if (!actionValidation.success) {
      return NextResponse.json(
        { error: 'Valid action is required' },
        { status: 400 },
      );
    }

    if (!body.userId || !mongoose.Types.ObjectId.isValid(body.userId)) {
      return NextResponse.json(
        { error: 'Valid userId is required' },
        { status: 400 },
      );
    }

    const target = await User.findById(body.userId);

    if (!target || !isAgencyRole(target.role)) {
      return NextResponse.json(
        { error: 'Agency user not found' },
        { status: 404 },
      );
    }

    if (
      !actor.isAdmin &&
      target.agencyId?.toString() !== actor.user.agencyId?.toString()
    ) {
      return NextResponse.json(
        { error: 'Cannot manage users outside your agency' },
        { status: 403 },
      );
    }

    const nextRoleValidation =
      actionValidation.data === 'update_role'
        ? agencyUserRoleSchema.safeParse(body.agencyRole)
        : null;

    if (actionValidation.data === 'update_role' && !nextRoleValidation?.success) {
      return NextResponse.json(
        { error: 'Valid agencyRole is required' },
        { status: 400 },
      );
    }

    const permissionError = assertCanManageTarget({
      actorRole: actor.user.role,
      actorId: actor.user._id.toString(),
      targetId: target._id.toString(),
      targetRole: target.role,
      nextRole: nextRoleValidation?.success ? nextRoleValidation.data : undefined,
    });

    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    if (actionValidation.data === 'update_role' && nextRoleValidation?.success) {
      target.role = nextRoleValidation.data;
      target.agencyRole = toAgencyRole(nextRoleValidation.data);
    }

    if (actionValidation.data === 'deactivate_user') {
      target.isActive = false;
    }

    if (actionValidation.data === 'remove_user') {
      target.agencyId = null;
      target.agencyRole = null;
      target.accountType = 'b2c';
      target.role = 'customer';
    }

    await target.save();

    await writeLog({
      actorId: actor.user._id,
      targetId: target._id,
      type: `agency_user_${actionValidation.data}`,
      message: 'Agency user management action completed',
      request: {
        action: actionValidation.data,
        userId: target._id,
        agencyRole: nextRoleValidation?.success ? nextRoleValidation.data : undefined,
      },
      response: {
        userId: target._id,
        agencyId: target.agencyId,
        role: target.role,
        agencyRole: target.agencyRole,
        isActive: target.isActive,
      },
    });

    const user = await User.findById(target._id).select('-password');
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Agency user update error:', error);
    return NextResponse.json(
      { error: 'Failed to update agency user' },
      { status: 500 },
    );
  }
}
