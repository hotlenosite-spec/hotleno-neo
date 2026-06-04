import { NextRequest, NextResponse } from "next/server";
import { listCustomerBookings } from "@/lib/account-store";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const { searchParams } = new URL(req.url);
    const bookings = await listCustomerBookings(decoded, {
      limit: Number(searchParams.get("limit") || 50),
      status: searchParams.get("status"),
    });

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error("Account bookings error:", error);
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
  }
}
