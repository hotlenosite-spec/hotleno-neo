import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SupportTicket from '@/models/SupportTicket';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

// GET - Fetch all support tickets (admin only)
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
    
    // Check if user is admin
    const currentUser = await User.findById(decoded.userId);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Build query
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Fetch tickets with user info
    const tickets = await SupportTicket.find(query)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-messages');
    
    // Get total count
    const total = await SupportTicket.countDocuments(query);
    
    // Get stats
    const stats = {
      total: await SupportTicket.countDocuments(),
      open: await SupportTicket.countDocuments({ status: 'open' }),
      inProgress: await SupportTicket.countDocuments({ status: 'in_progress' }),
      waiting: await SupportTicket.countDocuments({ status: 'waiting' }),
      resolved: await SupportTicket.countDocuments({ status: 'resolved' }),
      urgent: await SupportTicket.countDocuments({ priority: 'urgent', status: { $nin: ['resolved', 'closed'] } }),
    };
    
    return NextResponse.json({
      success: true,
      tickets,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error('Admin support tickets fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// PATCH - Update ticket (assign, change status, priority)
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
    
    await dbConnect();
    
    // Check if user is admin
    const currentUser = await User.findById(decoded.userId);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    const { ticketId, status, priority, assignedTo } = body;
    
    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }
    
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo) updateData.assignedTo = assignedTo;
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }
    
    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      updateData,
      { new: true }
    ).populate('userId', 'name email');
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket,
    });
    
  } catch (error: unknown) {
    console.error('Ticket update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
