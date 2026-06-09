import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(_req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    console.info("[test/db] Testing database connection...");
    await dbConnect();
    console.info("[test/db] Database connected");

    const userCount = await User.countDocuments();
    console.info("[test/db] User count: %d", userCount);

    const users = await User.find()
      .select("name email role createdAt")
      .limit(5);

    return NextResponse.json({
      success: true,
      message: "Database connected",
      userCount,
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
