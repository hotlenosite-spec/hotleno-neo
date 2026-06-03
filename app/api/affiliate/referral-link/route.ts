import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { buildReferralUrl, normalizeAffiliateCode } from "@/lib/affiliate";
import Affiliate from "@/models/Affiliate";
import PromoCode from "@/models/PromoCode";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const referralCode = normalizeAffiliateCode(String(body.referralCode || ""));

    if (!referralCode) {
      return NextResponse.json(
        { error: "referralCode is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const affiliate = await Affiliate.findOne({ referralCode });
    if (!affiliate) {
      return NextResponse.json(
        { error: "Affiliate was not found" },
        { status: 404 },
      );
    }

    const promoCodeValue = body.promoCode
      ? normalizeAffiliateCode(String(body.promoCode))
      : "";

    if (promoCodeValue) {
      const existingPromo = await PromoCode.findOne({ code: promoCodeValue });
      if (!existingPromo) {
        await PromoCode.create({
          affiliateId: affiliate._id,
          code: promoCodeValue,
          description: "Affiliate promo code placeholder",
          discountType: body.discountType || "percent",
          discountValue: Number(body.discountValue) || 0,
          currency: body.currency || affiliate.currency,
          status: "active",
          metadata: {
            createdFrom: "affiliate_referral_link_api",
            noRealDiscountApplied: true,
          },
        });
      }
    }

    const referralUrl = buildReferralUrl({
      locale: body.locale || "en",
      referralCode: affiliate.referralCode,
      promoCode: promoCodeValue,
    });

    return NextResponse.json({
      success: true,
      referralUrl,
      referralCode: affiliate.referralCode,
      promoCode: promoCodeValue || null,
      message:
        "Referral link generated. It does not apply booking discounts until checkout integration is added.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create referral link",
      },
      { status: 500 },
    );
  }
}
