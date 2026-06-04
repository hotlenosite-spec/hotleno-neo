import { NextRequest, NextResponse } from "next/server";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getCustomerBooking } from "@/lib/account-store";
import { verifyToken } from "@/lib/jwt";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const { bookingId } = await params;
    const booking = await getCustomerBooking(decoded, bookingId);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const db = await getFirestoreMongoDb();
    const paymentAdjustments = await db
      .collection("payment_adjustments")
      .find({ bookingId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        paymentAdjustments,
      },
    });
  } catch (error) {
    console.error("Account booking detail error:", error);
    return NextResponse.json({ error: "Failed to load booking" }, { status: 500 });
  }
}
