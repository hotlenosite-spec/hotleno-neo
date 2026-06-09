import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getUserById } from "@/lib/firebase-store";
import {
  createSupportMessageId,
  createSupportTicketId,
  createSupportTicketNumber,
  isSupportTicketCategory,
  isSupportTicketStatus,
  normalizeSupportText,
  serializeSupportTicket,
  type SupportTicketDocument,
} from "@/lib/support-tickets";
import { createAdminNotificationSafely } from "@/lib/admin-notifications";

async function requireCustomer(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: "Authentication required", status: 401 } as const;

  const decoded = verifyToken(token);
  const currentUser = await getUserById(decoded.userId);
  if (!currentUser) return { error: "User not found", status: 401 } as const;

  return { decoded, currentUser };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const status = new URL(req.url).searchParams.get("status");
    const db = await getFirestoreMongoDb();
    const allTickets = await db
      .collection<SupportTicketDocument>("support_tickets")
      .find({})
      .toArray();
    const tickets = allTickets
      .filter((ticket) => ticket._id !== "_meta" && ticket.userId === auth.decoded.userId)
      .filter((ticket) => !status || (isSupportTicketStatus(status) && ticket.status === status))
      .sort(
        (left, right) =>
          new Date(right.lastMessageAt || right.updatedAt).getTime() -
          new Date(left.lastMessageAt || left.updatedAt).getTime(),
      )
      .map(serializeSupportTicket);

    console.info("[support/tickets] route=customer-list collection=support_tickets count=%d", tickets.length);
    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error(
      "[support/tickets] customer-list failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const subject = normalizeSupportText(body.subject, 180);
    const message = normalizeSupportText(body.message, 5000);
    const bookingId = normalizeSupportText(body.bookingId, 120);
    const bookingReference = normalizeSupportText(body.bookingReference, 120);

    if (!subject || !message || !isSupportTicketCategory(body.category)) {
      return NextResponse.json(
        { error: "Subject, category, and message are required" },
        { status: 400 },
      );
    }

    const now = new Date();
    const ticket: SupportTicketDocument = {
      _id: createSupportTicketId(),
      ticketNumber: createSupportTicketNumber(),
      userId: auth.decoded.userId,
      customerName: auth.currentUser.name || auth.currentUser.email,
      customerEmail: auth.currentUser.email,
      subject,
      category: body.category,
      priority: "normal",
      status: "waiting_admin",
      bookingId: bookingId || undefined,
      bookingReference: bookingReference || bookingId || undefined,
      messages: [
        {
          id: createSupportMessageId(),
          senderType: "customer",
          senderId: auth.decoded.userId,
          senderName: auth.currentUser.name || auth.currentUser.email,
          message,
          createdAt: now,
          attachments: [],
        },
      ],
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      closedAt: null,
    };

    const db = await getFirestoreMongoDb();
    await db.collection<SupportTicketDocument>("support_tickets").insertOne(ticket);
    await createAdminNotificationSafely({
      type: "support_ticket_created",
      title: "New support ticket",
      message: `Support ticket ${ticket.ticketNumber} was created.`,
      severity: "info",
      targetRole: "admin",
      relatedType: "support_ticket",
      relatedId: ticket._id,
      data: {
        reference: ticket.ticketNumber,
        customer: ticket.customerName,
        subject: ticket.subject,
      },
    });

    console.info("[support/tickets] route=customer-create collection=support_tickets created=1");
    return NextResponse.json(
      { success: true, ticket: serializeSupportTicket(ticket) },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[support/tickets] customer-create failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
