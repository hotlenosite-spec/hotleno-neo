import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { calculateMockCommission, normalizeAffiliateCode } from "@/lib/affiliate";
import Affiliate from "@/models/Affiliate";
import AffiliateCommission from "@/models/AffiliateCommission";
import Referral from "@/models/Referral";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const referralCode = normalizeAffiliateCode(String(body.referralCode || ""));
    const affiliateId = typeof body.affiliateId === "string" ? body.affiliateId : "";
    const baseAmount = Number(body.baseAmount) || 0;

    if (!affiliateId && !referralCode) {
      return NextResponse.json(
        { error: "affiliateId or referralCode is required" },
        { status: 400 },
      );
    }

    if (baseAmount <= 0) {
      return NextResponse.json(
        { error: "baseAmount must be greater than zero" },
        { status: 400 },
      );
    }

    await dbConnect();

    const affiliate = affiliateId
      ? await Affiliate.findById(affiliateId)
      : await Affiliate.findOne({ referralCode });

    if (!affiliate) {
      return NextResponse.json(
        { error: "Affiliate was not found" },
        { status: 404 },
      );
    }

    const referral = body.referralId
      ? await Referral.findById(body.referralId)
      : referralCode
        ? await Referral.findOne({ referralCode }).sort({ createdAt: -1 })
        : null;

    const calculation = calculateMockCommission({
      affiliate,
      baseAmount,
      currency: body.currency || affiliate.currency,
    });

    const commission = await AffiliateCommission.create({
      affiliateId: affiliate._id,
      referralId: referral?._id || null,
      bookingId: null,
      bookingReference: body.bookingReference || "",
      baseAmount: calculation.baseAmount,
      commissionRate: calculation.commissionRate,
      commissionAmount: calculation.commissionAmount,
      currency: calculation.currency,
      status: "pending",
      calculationMode: "mock",
      metadata: {
        source: "affiliate_commission_mock_api",
        noRealPayout: true,
        connectLaterTo: "booking_status_supplier_booking_confirmed",
      },
    });

    return NextResponse.json(
      {
        success: true,
        commission,
        message:
          "Commission calculated in mock mode only. No payout or booking link was executed.",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate affiliate commission",
      },
      { status: 500 },
    );
  }
}
