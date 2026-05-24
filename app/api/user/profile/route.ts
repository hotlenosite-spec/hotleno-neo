import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

// GET - Fetch full user profile
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
    
    await dbConnect();
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        agencyId: user.agencyId,
        agencyRole: user.agencyRole,
        hotelPartnerId: user.hotelPartnerId,
        hotelRole: user.hotelRole,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        avatar: user.avatar,
        phone: user.phone,
        birthDate: user.birthDate,
        nationality: user.nationality,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

// PUT - Update user profile
export async function PUT(req: NextRequest) {
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
    
    await dbConnect();
    
    // Fields that can be updated
    const allowedUpdates = {
      name: body.name,
      phone: body.phone,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      nationality: body.nationality,
      avatar: body.avatar,
    };
    
    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key as keyof typeof allowedUpdates] === undefined) {
        delete allowedUpdates[key as keyof typeof allowedUpdates];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      allowedUpdates,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        agencyId: user.agencyId,
        agencyRole: user.agencyRole,
        hotelPartnerId: user.hotelPartnerId,
        hotelRole: user.hotelRole,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        avatar: user.avatar,
        phone: user.phone,
        birthDate: user.birthDate,
        nationality: user.nationality,
      },
    });
    
  } catch (error: unknown) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update profile' },
      { status: 500 }
    );
  }
}
