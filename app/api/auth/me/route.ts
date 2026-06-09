import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { getUserById, publicUser } from '@/lib/firebase-store';
import { getStaffAccessForUser } from '@/lib/staff-permissions';

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
    
    const user = await getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const staffAccess = await getStaffAccessForUser(user.id, user.role, user.email);

    return NextResponse.json({
      success: true,
      user: {
        ...publicUser(user),
        staffRole: staffAccess?.role,
        permissions: staffAccess?.permissions || [],
        staffStatus: staffAccess?.status,
      },
    });
    
  } catch (_error) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
