import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { USER_ROLES } from '@/models/User';
import Booking from '@/models/Booking';
import { verifyToken } from '@/lib/jwt';

const editableRoles = USER_ROLES.filter((role) => role !== 'user');

function getAccountTypeForRole(role: string) {
  if (role === 'admin') return 'admin';
  if (role.startsWith('agency_')) return 'b2b';
  if (role.startsWith('hotel_')) return 'hotel';
  return 'b2c';
}

function getAgencyRoleForRole(role: string) {
  switch (role) {
    case 'agency_owner':
      return 'owner';
    case 'agency_manager':
      return 'manager';
    case 'agency_agent':
      return 'agent';
    case 'agency_accountant':
      return 'accountant';
    default:
      return null;
  }
}

function getHotelRoleForRole(role: string) {
  switch (role) {
    case 'hotel_owner':
      return 'owner';
    case 'hotel_manager':
      return 'manager';
    case 'hotel_staff':
      return 'staff';
    default:
      return null;
  }
}

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
    await dbConnect();
    const currentUser = await User.findById(decoded.userId);
    
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
    
    // Build query
    const query: Record<string, unknown> = {};
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Fetch users (exclude password)
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get booking count for each user
    const usersWithBookings = await Promise.all(
      users.map(async (user) => {
        const bookingCount = await Booking.countDocuments({ userId: user._id });
        return {
          ...user.toObject(),
          bookingCount,
        };
      })
    );
    
    // Get total count
    const total = await User.countDocuments(query);
    
    return NextResponse.json({
      users: usersWithBookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error('Admin users fetch error:', error);
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
    await dbConnect();
    const currentUser = await User.findById(decoded.userId);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    const { userId, role } = body;
    
    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    if (!editableRoles.includes(role as (typeof editableRoles)[number])) {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 400 }
      );
    }
    
    // Prevent admin from demoting themselves
    if (userId === decoded.userId && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        role,
        accountType: getAccountTypeForRole(role),
        agencyRole: getAgencyRoleForRole(role),
        hotelRole: getHotelRoleForRole(role),
      },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'User role updated',
      user,
    });
    
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
