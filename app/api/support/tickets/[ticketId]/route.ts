import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { verifyToken } from "@/lib/jwt";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getUserById } from "@/lib/firebase-store";
import {
  createSupportMessageId,
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

async function getOwnedTicket(userId: string, ticketId: string) {
  const db = await getFirestoreMongoDb();
  const collection = db.collection<SupportTicketDocument>("support_tickets");
  const ticket = await collection.findOne({ _id: ticketId, userId });
  return { collection, ticket };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const auth = await requireCustomer(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { ticketId } = await params;
    const { ticket } = await getOwnedTicket(auth.decoded.userId, ticketId);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    return NextResponse.json(
      { success: true, ticket: serializeSupportTicket(ticket) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[support/tickets/:id] customer-detail failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const auth = await requireCustomer(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { ticketId } = await params;
    const message = normalizeSupportText((await req.json()).message, 5000);
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const { collection, ticket } = await getOwnedTicket(auth.decoded.userId, ticketId);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "ticket_closed_reply_not_allowed" },
        { status: 409 },
      );
    }
    if (ticket.status === "resolved") {
      return NextResponse.json(
        { error: "ticket_resolved_reply_not_allowed" },
        { status: 409 },
      );
    }

    const now = new Date();
    const newMessage = {
      id: createSupportMessageId(),
      senderType: "customer" as const,
      senderId: auth.decoded.userId,
      senderName: auth.currentUser.name || auth.currentUser.email,
      message,
      createdAt: now,
      attachments: [],
    };
    await collection.updateOne(
      { _id: ticketId, userId: auth.decoded.userId },
      {
        $push: { messages: newMessage },
        $set: {
          status: "waiting_admin",
          updatedAt: now,
          lastMessageAt: now,
          closedAt: null,
        },
      } as Document,
    );
    const updatedTicket = await collection.findOne({ _id: ticketId, userId: auth.decoded.userId });
    await createAdminNotificationSafely({
      type: "support_ticket_replied",
      title: "Customer replied to a support ticket",
      message: `A customer replied to support ticket ${ticket.ticketNumber}.`,
      severity: "info",
      targetRole: "admin",
      relatedType: "support_ticket",
      relatedId: ticketId,
      data: {
        reference: ticket.ticketNumber,
        customer: ticket.customerName,
        subject: ticket.subject,
      },
    });

    return NextResponse.json({
      success: true,
      ticket: updatedTicket ? serializeSupportTicket(updatedTicket) : null,
    });
  } catch (error) {
    console.error(
      "[support/tickets/:id] customer-reply failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to add message" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const auth = await requireCustomer(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { ticketId } = await params;
    const { collection, ticket } = await getOwnedTicket(auth.decoded.userId, ticketId);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    if (body.action === "reopen") {
      if (ticket.status !== "closed" && ticket.status !== "resolved") {
        return NextResponse.json({ error: "ticket_not_closed" }, { status: 409 });
      }

      const now = new Date();
      const systemMessage = {
        id: createSupportMessageId(),
        senderType: "system" as const,
        senderName: "HOTLENO",
        message: "ticket_reopened_by_customer",
        createdAt: now,
        attachments: [],
      };
      await collection.updateOne(
        { _id: ticketId, userId: auth.decoded.userId },
        {
          $push: { messages: systemMessage },
          $set: {
            status: "waiting_admin",
            updatedAt: now,
            lastMessageAt: now,
            closedAt: null,
          },
        } as Document,
      );
      const reopenedTicket = await collection.findOne({
        _id: ticketId,
        userId: auth.decoded.userId,
      });

      return NextResponse.json({
        success: true,
        ticket: reopenedTicket ? serializeSupportTicket(reopenedTicket) : null,
      });
    }

    if (body.status !== "closed") {
      return NextResponse.json({ error: "Customers can only close tickets" }, { status: 403 });
    }

    const now = new Date();
    await collection.updateOne(
      { _id: ticketId, userId: auth.decoded.userId },
      { $set: { status: "closed", closedAt: now, updatedAt: now } },
    );
    const updatedTicket = await collection.findOne({ _id: ticketId, userId: auth.decoded.userId });

    return NextResponse.json({
      success: true,
      ticket: updatedTicket ? serializeSupportTicket(updatedTicket) : null,
    });
  } catch (error) {
    console.error(
      "[support/tickets/:id] customer-close failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to close ticket" }, { status: 500 });
  }
}
