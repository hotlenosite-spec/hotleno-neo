import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

// GET - Fetch user preferences
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
      preferences: user.preferences || {
        currency: 'USD',
        language: 'en',
        emailNotifications: true,
        priceAlerts: false,
        newsletter: true,
        theme: 'system',
      },
    });
    
  } catch (error) {
    console.error('Preferences fetch error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

// PUT - Update user preferences
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
    
    // Build update object for nested preferences
    const preferenceUpdates: Record<string, unknown> = {};
    
    if (body.currency !== undefined) preferenceUpdates['preferences.currency'] = body.currency;
    if (body.language !== undefined) preferenceUpdates['preferences.language'] = body.language;
    if (body.emailNotifications !== undefined) preferenceUpdates['preferences.emailNotifications'] = body.emailNotifications;
    if (body.priceAlerts !== undefined) preferenceUpdates['preferences.priceAlerts'] = body.priceAlerts;
    if (body.newsletter !== undefined) preferenceUpdates['preferences.newsletter'] = body.newsletter;
    if (body.theme !== undefined) preferenceUpdates['preferences.theme'] = body.theme;
    
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { $set: preferenceUpdates },
      { new: true }
    );
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences,
    });
    
  } catch (error: unknown) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update preferences' },
      { status: 500 }
    );
  }
}