import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import {
  getUserById,
  listUsers,
  publicUser,
  updateUserRole,
  USER_ROLES,
  type UserRole,
} from '@/lib/firebase-store';
import { getFirestoreMongoDb } from '@/lib/firestore-mongo';

const editableRoles = USER_ROLES.filter((role) => role !== 'user');

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
    
    // Check if user is admin
    const currentUser = await getUserById(decoded.userId);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    
    const result = await listUsers({ role, search, page, limit });
    console.info("[admin/users] collection=users count=%d", result.users.length);
    
    return NextResponse.json({
      users: result.users,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
    
  } catch (error) {
    console.error(
      "[admin/users] fetch failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PATCH - Update user role
export async function PATCH(req: NextRequest) {
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
    
    // Check if user is admin
    const currentUser = await getUserById(decoded.userId);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    const { userId, role } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (role && !editableRoles.includes(role as (typeof editableRoles)[number])) {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 400 }
      );
    }
    
    // Prevent admin from demoting themselves
    if (role && userId === decoded.userId && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    let user = role ? await updateUserRole(userId, role as UserRole) : await getUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    for (const key of [
      "name",
      "email",
      "phone",
      "supplierScope",
      "nationality",
      "nationalId",
      "passportNumber",
      "accountType",
    ]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
    if (body.passportExpiryDate !== undefined) {
      updates.passportExpiryDate = body.passportExpiryDate
        ? new Date(body.passportExpiryDate)
        : null;
    }
    if (body.dateOfBirth !== undefined || body.birthDate !== undefined) {
      const dateOfBirth = body.dateOfBirth ?? body.birthDate;
      updates.birthDate = dateOfBirth ? new Date(dateOfBirth) : null;
    }
    if (Object.keys(updates).length > 1) {
      const db = await getFirestoreMongoDb();
      await db.collection("users").updateOne({ _id: userId }, { $set: updates });
      user = await getUserById(userId);
    }
    
    return NextResponse.json({
      success: true,
      message: 'User updated',
      user: user ? publicUser(user) : null,
    });
    
  } catch (error) {
    console.error(
      "[admin/users] update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
