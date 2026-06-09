import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { verifyToken } from "@/lib/jwt";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getUserById } from "@/lib/firebase-store";
import { requireStaffPermission } from "@/lib/staff-permissions";
import {
  createSupportMessageId,
  isSupportTicketCategory,
  isSupportTicketPriority,
  isSupportTicketStatus,
  normalizeSupportText,
  serializeSupportTicket,
  type SupportTicketDocument,
} from "@/lib/support-tickets";

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: "Authentication required", status: 401 } as const;

  const decoded = verifyToken(token);
  const currentUser = await getUserById(decoded.userId);
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Admin access required", status: 403 } as const;
  }

  return { decoded, currentUser };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    if (!(await requireStaffPermission(req, "support.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { ticketId } = await params;
    const db = await getFirestoreMongoDb();
    const ticket = await db
      .collection<SupportTicketDocument>("support_tickets")
      .findOne({ _id: ticketId });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    return NextResponse.json(
      { success: true, ticket: serializeSupportTicket(ticket) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[admin/support/:id] detail failed:",
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
    if (!(await requireStaffPermission(req, "support.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const message = normalizeSupportText(body.message, 5000);
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const { ticketId } = await params;
    const db = await getFirestoreMongoDb();
    const collection = db.collection<SupportTicketDocument>("support_tickets");
    const ticket = await collection.findOne({ _id: ticketId });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    if (ticket.status === "closed" || ticket.status === "resolved") {
      return NextResponse.json(
        { error: "admin_reply_requires_reopen" },
        { status: 409 },
      );
    }
    const now = new Date();
    const status =
      isSupportTicketStatus(body.status) && body.status !== "closed" && body.status !== "resolved"
        ? body.status
        : "waiting_customer";
    const newMessage = {
      id: createSupportMessageId(),
      senderType: "admin" as const,
      senderId: auth.decoded.userId,
      senderName: auth.currentUser.name || auth.currentUser.email,
      message,
      createdAt: now,
      attachments: [],
    };
    const replyResult = await collection.updateOne(
      {
        _id: ticketId,
        status: { $nin: ["closed", "resolved"] },
      },
      {
        $push: { messages: newMessage },
        $set: {
          status,
          updatedAt: now,
          lastMessageAt: now,
          closedAt: status === "closed" ? now : null,
        },
      } as Document,
    );
    if (!replyResult.matchedCount) {
      return NextResponse.json(
        { error: "admin_reply_requires_reopen" },
        { status: 409 },
      );
    }
    const updatedTicket = await collection.findOne({ _id: ticketId });

    console.info("[admin/support/:id] route=reply collection=support_tickets updated=1");
    return NextResponse.json({
      success: true,
      ticket: updatedTicket ? serializeSupportTicket(updatedTicket) : null,
    });
  } catch (error) {
    console.error(
      "[admin/support/:id] reply failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    if (!(await requireStaffPermission(req, "support.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined) {
      if (!isSupportTicketStatus(body.status)) {
        return NextResponse.json({ error: "Invalid ticket status" }, { status: 400 });
      }
      updateData.status = body.status;
      updateData.closedAt = body.status === "closed" ? new Date() : null;
    }
    if (body.priority !== undefined) {
      if (!isSupportTicketPriority(body.priority)) {
        return NextResponse.json({ error: "Invalid ticket priority" }, { status: 400 });
      }
      updateData.priority = body.priority;
    }
    if (body.category !== undefined) {
      if (!isSupportTicketCategory(body.category)) {
        return NextResponse.json({ error: "Invalid ticket category" }, { status: 400 });
      }
      updateData.category = body.category;
    }
    if (body.bookingId !== undefined) {
      updateData.bookingId = normalizeSupportText(body.bookingId, 120) || null;
    }
    if (body.bookingReference !== undefined) {
      updateData.bookingReference = normalizeSupportText(body.bookingReference, 120) || null;
    }
    if (body.assignedTo !== undefined) {
      const assignedTo = normalizeSupportText(body.assignedTo, 160);
      const assignee = assignedTo ? await getUserById(assignedTo) : null;
      if (assignedTo && (!assignee || assignee.role !== "admin")) {
        return NextResponse.json({ error: "invalid_admin_assignee" }, { status: 400 });
      }
      updateData.assignedTo = assignedTo || null;
      updateData.assignedToName = assignee?.name || null;
    }

    const { ticketId } = await params;
    const db = await getFirestoreMongoDb();
    const collection = db.collection<SupportTicketDocument>("support_tickets");
    const result = await collection.updateOne({ _id: ticketId }, { $set: updateData });
    if (!result.matchedCount) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    const ticket = await collection.findOne({ _id: ticketId });

    return NextResponse.json({
      success: true,
      ticket: ticket ? serializeSupportTicket(ticket) : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(
      "[admin/support/:id] update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
