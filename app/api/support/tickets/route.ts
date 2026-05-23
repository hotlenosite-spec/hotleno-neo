import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import { verifyToken } from "@/lib/jwt";

// GET - Fetch user's support tickets
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    await dbConnect();

    const query: Record<string, unknown> = { userId: decoded.userId };
    if (status) {
      query.status = status;
    }

    const tickets = await SupportTicket.find(query)
      .sort({ updatedAt: -1 })
      .select("-messages");

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error("Support tickets fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 },
    );
  }
}

// POST - Create a new support ticket
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const body = await req.json();

    await dbConnect();

    const { subject, category, priority, message, bookingReference } = body;

    if (!subject || !category || !message) {
      return NextResponse.json(
        { error: "Subject, category, and message are required" },
        { status: 400 },
      );
    }

    // Generate unique ticket number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const ticketNumber = `SUP-${timestamp}-${random}`;

    const ticket = new SupportTicket({
      userId: decoded.userId,
      ticketNumber,
      subject,
      category,
      priority: priority || "medium",
      bookingReference: bookingReference || "",
      messages: [
        {
          sender: "user",
          content: message,
          createdAt: new Date(),
        },
      ],
    });

    await ticket.save();

    return NextResponse.json(
      {
        success: true,
        message: "Ticket created successfully",
        ticket,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Support ticket creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create ticket",
      },
      { status: 500 },
    );
  }
}
