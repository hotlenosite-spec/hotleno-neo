import { NextRequest, NextResponse } from "next/server";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getUserById, publicUser } from "@/lib/firebase-store";
import { verifyToken } from "@/lib/jwt";

type UserDocument = {
  _id: string;
};

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const user = await getUserById(verifyToken(token).userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const body = await req.json();
    const allowedUpdates: Record<string, unknown> = {
      name: body.name,
      phone: body.phone,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      nationality: body.nationality,
      nationalId: body.nationalId,
      passportNumber: body.passportNumber,
      passportExpiryDate: body.passportExpiryDate ? new Date(body.passportExpiryDate) : undefined,
      avatar: body.avatar,
      updatedAt: new Date(),
    };

    for (const key of Object.keys(allowedUpdates)) {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    }

    const db = await getFirestoreMongoDb();
    await db.collection<UserDocument>("users").updateOne(
      { _id: decoded.userId },
      { $set: allowedUpdates },
    );

    const user = await getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: publicUser(user),
    });
  } catch (error: unknown) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 },
    );
  }
}
