import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getUserById } from "@/lib/firebase-store";
import { requireStaffPermission } from "@/lib/staff-permissions";
import {
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

function matchesTicketFilters(ticket: SupportTicketDocument, searchParams: URLSearchParams) {
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const category = searchParams.get("category");
  const search = searchParams.get("search")?.trim().toLowerCase();

  if (status && (!isSupportTicketStatus(status) || ticket.status !== status)) return false;
  if (priority && (!isSupportTicketPriority(priority) || ticket.priority !== priority)) return false;
  if (category && (!isSupportTicketCategory(category) || ticket.category !== category)) return false;
  if (
    search &&
    ![
      ticket.ticketNumber,
      ticket.subject,
      ticket.customerName,
      ticket.customerEmail,
      ticket.bookingId,
      ticket.bookingReference,
    ].some((value) => String(value ?? "").toLowerCase().includes(search))
  ) {
    return false;
  }

  return true;
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireStaffPermission(req, "support.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(Number.parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
      100,
    );
    const skip = (page - 1) * limit;
    const db = await getFirestoreMongoDb();
    const allTickets = await db
      .collection<SupportTicketDocument>("support_tickets")
      .find({})
      .toArray();
    const realTickets = allTickets.filter((ticket) => ticket._id !== "_meta");
    const filteredTickets = realTickets
      .filter((ticket) => matchesTicketFilters(ticket, searchParams))
      .sort(
        (left, right) =>
          new Date(right.lastMessageAt || right.updatedAt).getTime() -
          new Date(left.lastMessageAt || left.updatedAt).getTime(),
      );
    const tickets = filteredTickets.slice(skip, skip + limit).map((ticket) => ({
      ...serializeSupportTicket(ticket),
      messageCount: Array.isArray(ticket.messages) ? ticket.messages.length : 0,
    }));
    const activeTickets = realTickets.filter(
      (ticket) => !["resolved", "closed"].includes(ticket.status),
    );

    console.info("[admin/support] route=list collection=support_tickets count=%d", filteredTickets.length);
    return NextResponse.json({
      success: true,
      tickets,
      stats: {
        total: realTickets.length,
        open: realTickets.filter((ticket) => ticket.status === "open").length,
        waitingCustomer: realTickets.filter((ticket) => ticket.status === "waiting_customer").length,
        waitingAdmin: realTickets.filter((ticket) => ticket.status === "waiting_admin").length,
        waitingSupplier: realTickets.filter((ticket) => ticket.status === "waiting_supplier").length,
        resolved: realTickets.filter((ticket) => ticket.status === "resolved").length,
        closed: realTickets.filter((ticket) => ticket.status === "closed").length,
        urgent: activeTickets.filter((ticket) => ticket.priority === "urgent").length,
      },
      pagination: {
        page,
        limit,
        total: filteredTickets.length,
        pages: Math.ceil(filteredTickets.length / limit),
      },
    });
  } catch (error) {
    console.error(
      "[admin/support] list failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await requireStaffPermission(req, "support.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const ticketId = normalizeSupportText(body.ticketId, 160);
    if (!ticketId) return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });

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

    const db = await getFirestoreMongoDb();
    const collection = db.collection<SupportTicketDocument>("support_tickets");
    const result = await collection.updateOne({ _id: ticketId }, { $set: updateData });
    if (!result.matchedCount) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    const ticket = await collection.findOne({ _id: ticketId });

    console.info("[admin/support] route=update collection=support_tickets updated=1");
    return NextResponse.json({
      success: true,
      ticket: ticket ? serializeSupportTicket(ticket) : null,
    });
  } catch (error) {
    console.error(
      "[admin/support] update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
