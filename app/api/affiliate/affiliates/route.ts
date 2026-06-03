import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { createAffiliateCode, normalizeAffiliateCode } from "@/lib/affiliate";
import Affiliate from "@/models/Affiliate";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const referralCode = body.referralCode
      ? normalizeAffiliateCode(String(body.referralCode))
      : createAffiliateCode(name);

    const affiliate = await Affiliate.create({
      name,
      email,
      phone: body.phone || "",
      website: body.website || "",
      referralCode,
      status: body.status || "pending",
      commissionRate: Number(body.commissionRate) || 0,
      currency: body.currency || "USD",
      notes: body.notes || "",
      metadata: {
        ...(typeof body.metadata === "object" && body.metadata ? body.metadata : {}),
        createdFrom: "affiliate_api_initial_setup",
      },
    });

    return NextResponse.json(
      {
        success: true,
        affiliate,
        message:
          "Affiliate created as an internal record. No payment or payout was configured.",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create affiliate",
      },
      { status: 500 },
    );
  }
}
