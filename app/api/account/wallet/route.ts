import { NextRequest, NextResponse } from "next/server";
import { getCustomerWallet } from "@/lib/account-store";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const wallet = await getCustomerWallet(verifyToken(token));
    return NextResponse.json({ success: true, wallet });
  } catch (error) {
    console.error("Account wallet error:", error);
    return NextResponse.json({ error: "Failed to load wallet" }, { status: 500 });
  }
}
