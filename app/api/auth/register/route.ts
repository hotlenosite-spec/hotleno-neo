import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';
import { createUser, publicUser } from '@/lib/firebase-store';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(req, {
      keyPrefix: 'auth:register',
      limit: 5,
      windowMs: 60_000,
    });

    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    
    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { name, email, password } = validation.data;
    
    const user = await createUser({ name, email, password });
    if (!user) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      supplierScope: user.supplierScope,
    });
    
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: publicUser(user),
      token,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
