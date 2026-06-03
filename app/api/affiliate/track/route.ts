import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import {
  createVisitorId,
  normalizeAffiliateCode,
} from "@/lib/affiliate";
import Affiliate from "@/models/Affiliate";
import Referral from "@/models/Referral";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const referralCode = normalizeAffiliateCode(String(body.referralCode || body.ref || ""));

    if (!referralCode) {
      return NextResponse.json(
        { error: "referralCode is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const affiliate = await Affiliate.findOne({ referralCode });
    if (!affiliate || affiliate.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          tracked: false,
          reason: "Affiliate is not active or was not found",
        },
        { status: 404 },
      );
    }

    const visitorId =
      typeof body.visitorId === "string" && body.visitorId
        ? body.visitorId
        : createVisitorId({
            referralCode,
            userAgent: req.headers.get("user-agent"),
            ip: req.headers.get("x-forwarded-for"),
          });

    const referral = await Referral.create({
      affiliateId: affiliate._id,
      referralCode,
      promoCode: body.promoCode
        ? normalizeAffiliateCode(String(body.promoCode))
        : "",
      visitorId,
      sessionId: body.sessionId || "",
      source: body.source || "affiliate_api",
      landingPage: body.landingPage || "",
      status: "tracked",
      metadata: {
        ...(typeof body.metadata === "object" && body.metadata ? body.metadata : {}),
        userAgent: req.headers.get("user-agent") || "",
        noBookingConversionYet: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        tracked: true,
        referral,
        message:
          "Referral tracked only. It is not linked to a real booking until booking confirmation integration is added.",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to track referral",
      },
      { status: 500 },
    );
  }
}
