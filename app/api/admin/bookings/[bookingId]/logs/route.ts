import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getUserById } from "@/lib/firebase-store";
import { verifyToken } from "@/lib/jwt";
import { requireStaffPermission } from "@/lib/staff-permissions";

type BookingDocument = Document & {
  _id: string;
};

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: "No token provided", status: 401 } as const;

  const decoded = verifyToken(token);
  const user = await getUserById(decoded.userId);
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized - Admin access required", status: 403 } as const;
  }

  return { user } as const;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    if (!(await requireStaffPermission(req, "bookings.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { bookingId } = await params;
    const db = await getFirestoreMongoDb();
    const booking = await db
      .collection<BookingDocument>("bookings")
      .findOne({ _id: bookingId });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const allLogs = await db
      .collection("logs")
      .find({
        $or: [
          { bookingId },
          { "request.bookingId": bookingId },
          { "response.bookingId": bookingId },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    const bookingLogs = allLogs.filter((log) =>
      String(log.type || "").includes("booking"),
    );
    const supplierLogs = allLogs.filter((log) =>
      String(log.type || "").includes("supplier"),
    );
    const paymentLogs = allLogs.filter((log) =>
      String(log.type || "").includes("payment"),
    );

    return NextResponse.json({
      booking,
      logs: {
        bookingLogs,
        paymentLogs,
        supplierLogs,
      },
    });
  } catch (error) {
    console.error("Admin booking logs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking logs" },
      { status: 500 },
    );
  }
}
