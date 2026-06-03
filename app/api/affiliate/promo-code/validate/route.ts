import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { normalizeAffiliateCode, validatePromoCodeStatus } from "@/lib/affiliate";
import PromoCode from "@/models/PromoCode";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = normalizeAffiliateCode(String(body.code || ""));

    if (!code) {
      return NextResponse.json(
        { error: "code is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const promoCode = await PromoCode.findOne({ code }).populate(
      "affiliateId",
      "name referralCode status",
    );

    if (!promoCode) {
      return NextResponse.json({
        success: true,
        valid: false,
        reason: "Promo code was not found",
      });
    }

    const validation = validatePromoCodeStatus(promoCode);

    return NextResponse.json({
      success: true,
      valid: validation.valid,
      reason: validation.reason,
      promoCode: {
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        currency: promoCode.currency,
        affiliate: promoCode.affiliateId,
      },
      message:
        "Promo code validation is informational only. No checkout discount is applied yet.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to validate promo code",
      },
      { status: 500 },
    );
  }
}
