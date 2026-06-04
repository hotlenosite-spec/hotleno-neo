import { NextRequest, NextResponse } from "next/server";
import { getCustomerDashboard } from "@/lib/account-store";
import { getUserById, publicUser } from "@/lib/firebase-store";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const [user, dashboard] = await Promise.all([
      getUserById(decoded.userId),
      getCustomerDashboard(decoded),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: publicUser(user),
      ...dashboard,
    });
  } catch (error) {
    console.error("Account summary error:", error);
    return NextResponse.json({ error: "Failed to load account summary" }, { status: 500 });
  }
}
