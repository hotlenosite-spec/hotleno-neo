import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { verifyToken } from "@/lib/jwt";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getUserById } from "@/lib/firebase-store";

type StringIdDocument = Document & { _id: string };

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: "No token provided", status: 401 } as const;

  const decoded = verifyToken(token);
  const currentUser = await getUserById(decoded.userId);
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Unauthorized - Admin access required", status: 403 } as const;
  }

  return { currentUser };
}

function matchesTicketFilters(ticket: Record<string, unknown>, searchParams: URLSearchParams) {
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  if (status && String(ticket.status ?? "") !== status) return false;
  if (priority && String(ticket.priority ?? "") !== priority) return false;
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;
    const db = await getFirestoreMongoDb();
    const allTickets = (await db
      .collection<StringIdDocument>("support_tickets")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()) as Record<string, unknown>[];
    const filteredTickets = allTickets
      .filter((ticket) => ticket._id !== "_meta")
      .filter((ticket) => matchesTicketFilters(ticket, searchParams));
    const tickets = filteredTickets.slice(skip, skip + limit);
    const activeTickets = allTickets.filter(
      (ticket) => !["resolved", "closed"].includes(String(ticket.status ?? "")),
    );

    console.info("[admin/support] collection=support_tickets count=%d", filteredTickets.length);

    return NextResponse.json({
      success: true,
      tickets,
      stats: {
        total: allTickets.length,
        open: allTickets.filter((ticket) => ticket.status === "open").length,
        inProgress: allTickets.filter((ticket) => ticket.status === "in_progress").length,
        waiting: allTickets.filter((ticket) => ticket.status === "waiting").length,
        resolved: allTickets.filter((ticket) => ticket.status === "resolved").length,
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
      "[admin/support] fetch failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const ticketId = typeof body.ticketId === "string" ? body.ticketId : "";
    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.status === "string") updateData.status = body.status;
    if (typeof body.priority === "string") updateData.priority = body.priority;
    if (typeof body.assignedTo === "string") updateData.assignedTo = body.assignedTo;
    if (body.status === "resolved") updateData.resolvedAt = new Date();

    const db = await getFirestoreMongoDb();
    const tickets = db.collection<StringIdDocument>("support_tickets");
    await tickets.updateOne({ _id: ticketId }, { $set: updateData });
    const ticket = await tickets.findOne({ _id: ticketId });

    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    console.info("[admin/support] collection=support_tickets updated=1");

    return NextResponse.json({
      success: true,
      message: "Ticket updated successfully",
      ticket,
    });
  } catch (error) {
    console.error(
      "[admin/support] update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
