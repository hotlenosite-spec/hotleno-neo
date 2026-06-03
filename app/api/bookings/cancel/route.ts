import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { cancelBookingSafely } from "@/lib/booking/cancellation-service";
import { verifyToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const body = await req.json();
    const bookingId = body.bookingId as string | undefined;
    const bookingReference = body.bookingReference as string | undefined;

    if (!bookingId && !bookingReference) {
      return NextResponse.json(
        { error: "bookingId or bookingReference is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const result = await cancelBookingSafely({
      bookingId,
      bookingReference,
      reason: typeof body.reason === "string" ? body.reason : "",
      requestedBy: decoded.userId,
      requestSource: "customer",
      userId: decoded.userId,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      supplierCancelExecuted: result.supplierCancelExecuted,
      refundStatus: result.refundStatus,
      booking: result.booking,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to cancel booking";
    const status = message.includes("not found")
      ? 404
      : message.includes("cannot be cancelled")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
