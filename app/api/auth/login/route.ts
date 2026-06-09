import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';
import {
  getUserByEmail,
  publicUser,
  updateUserLastLogin,
  validatePassword,
} from '@/lib/firebase-store';
import { updateStaffLastLogin } from '@/lib/staff-store';
import { getStaffAccessForUser } from '@/lib/staff-permissions';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(req, {
      keyPrefix: 'auth:login',
      limit: 10,
      windowMs: 60_000,
    });

    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    
    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { email, password } = validation.data;
    
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    const isPasswordValid = await validatePassword(user, password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      );
    }

    const updatedUser = await updateUserLastLogin(user.id);
    const authenticatedUser = updatedUser ?? user;
    if (authenticatedUser.role === 'admin') {
      await updateStaffLastLogin(authenticatedUser.id, new Date()).catch(() => undefined);
    }
    const staffAccess = await getStaffAccessForUser(
      authenticatedUser.id,
      authenticatedUser.role,
      authenticatedUser.email,
    );
    
    // Generate token
    const token = generateToken({
      userId: authenticatedUser.id,
      email: user.email,
      role: user.role,
      supplierScope: user.supplierScope,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        ...publicUser(authenticatedUser),
        staffRole: staffAccess?.role,
        permissions: staffAccess?.permissions || [],
        staffStatus: staffAccess?.status,
      },
      token,
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
