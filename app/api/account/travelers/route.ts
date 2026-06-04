import { NextRequest, NextResponse } from "next/server";
import { createTraveler, listTravelers } from "@/lib/account-store";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const travelers = await listTravelers(verifyToken(token));
    return NextResponse.json({ success: true, travelers });
  } catch (error) {
    console.error("Account travelers error:", error);
    return NextResponse.json({ error: "Failed to load travelers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const body = await req.json();

    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }

    const traveler = await createTraveler(decoded, {
      title: body.title,
      firstName: body.firstName,
      lastName: body.lastName,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      birthDate: body.birthDate,
      nationality: body.nationality,
      documentType: body.documentType,
      documentNumber: body.documentNumber,
      passportNumber: body.passportNumber,
      nationalId: body.nationalId,
      passportExpiryDate: body.passportExpiryDate,
      phone: body.phone,
      email: body.email,
    });

    return NextResponse.json({ success: true, traveler }, { status: 201 });
  } catch (error) {
    console.error("Account traveler create error:", error);
    return NextResponse.json({ error: "Failed to save traveler" }, { status: 500 });
  }
}
