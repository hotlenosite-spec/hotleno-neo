import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SupportTicket from '@/models/SupportTicket';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

// GET - Get a specific ticket with messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const { ticketId } = await params;
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    
    await dbConnect();
    
    const ticket = await SupportTicket.findById(ticketId)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name');
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns this ticket or is admin
    const user = await User.findById(decoded.userId);
    const isAdmin = user?.role === 'admin';
    
    if (ticket.userId._id.toString() !== decoded.userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ success: true, ticket });
    
  } catch (error) {
    console.error('Ticket fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// POST - Add a message to a ticket
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const { ticketId } = await params;
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    const body = await req.json();
    const { message } = body;
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    const ticket = await SupportTicket.findById(ticketId);
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns this ticket or is admin
    const user = await User.findById(decoded.userId);
    const isAdmin = user?.role === 'admin';
    
    if (ticket.userId.toString() !== decoded.userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Add message
    ticket.messages.push({
      sender: isAdmin ? 'admin' : 'user',
      content: message,
      createdAt: new Date(),
    });
    
    // Update status
    if (isAdmin && ticket.status === 'waiting') {
      ticket.status = 'in_progress';
    } else if (!isAdmin && ticket.status === 'in_progress') {
      ticket.status = 'waiting';
    }
    
    await ticket.save();
    
    return NextResponse.json({
      success: true,
      message: 'Message added successfully',
      ticket,
    });
    
  } catch (error: unknown) {
    console.error('Message add error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add message' },
      { status: 500 }
    );
  }
}

// PATCH - Update ticket status (close, resolve)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const { ticketId } = await params;
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    const body = await req.json();
    const { status } = body;
    
    await dbConnect();
    
    const ticket = await SupportTicket.findById(ticketId);
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }
    
    // Only ticket owner can close, admin can do anything
    const user = await User.findById(decoded.userId);
    const isAdmin = user?.role === 'admin';
    
    if (ticket.userId.toString() !== decoded.userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Users can only close their own tickets
    if (!isAdmin && status !== 'closed') {
      return NextResponse.json(
        { error: 'Only admins can change to this status' },
        { status: 403 }
      );
    }
    
    ticket.status = status;
    
    if (status === 'resolved') {
      ticket.resolvedAt = new Date();
    }
    
    await ticket.save();
    
    return NextResponse.json({
      success: true,
      message: 'Status updated successfully',
      ticket,
    });
    
  } catch (error: unknown) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update status' },
      { status: 500 }
    );
  }
}
