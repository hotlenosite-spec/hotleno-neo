import { createHash, randomBytes } from "crypto";
import type { IAffiliate } from "@/models/Affiliate";
import type { IPromoCode } from "@/models/PromoCode";

export function normalizeAffiliateCode(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function createAffiliateCode(seed: string) {
  const readableSeed = normalizeAffiliateCode(seed).slice(0, 8) || "HOTLENO";
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${readableSeed}${suffix}`;
}

export function createVisitorId(input: {
  referralCode?: string;
  userAgent?: string | null;
  ip?: string | null;
}) {
  return createHash("sha256")
    .update(`${input.referralCode || ""}:${input.userAgent || ""}:${input.ip || ""}`)
    .digest("hex")
    .slice(0, 24);
}

export function buildReferralUrl(args: {
  appUrl?: string;
  locale?: string;
  referralCode: string;
  promoCode?: string;
}) {
  const baseUrl = (args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "").replace(
    /\/$/,
    "",
  );
  const locale = args.locale || "en";
  const url = new URL(`${baseUrl || "http://localhost:3000"}/${locale}`);
  url.searchParams.set("ref", args.referralCode);
  if (args.promoCode) url.searchParams.set("promo", args.promoCode);
  return url.toString();
}

export function validatePromoCodeStatus(promoCode: IPromoCode) {
  const now = new Date();

  if (promoCode.status !== "active") {
    return { valid: false, reason: "Promo code is not active" };
  }

  if (promoCode.startsAt && promoCode.startsAt > now) {
    return { valid: false, reason: "Promo code has not started yet" };
  }

  if (promoCode.endsAt && promoCode.endsAt < now) {
    return { valid: false, reason: "Promo code has expired" };
  }

  if (promoCode.maxUses > 0 && promoCode.usedCount >= promoCode.maxUses) {
    return { valid: false, reason: "Promo code usage limit reached" };
  }

  return { valid: true, reason: "Promo code is valid" };
}

export function calculateMockCommission(args: {
  affiliate: IAffiliate;
  baseAmount: number;
  currency?: string;
}) {
  const baseAmount = Math.max(0, Number(args.baseAmount) || 0);
  const commissionRate = Math.max(0, Number(args.affiliate.commissionRate) || 0);
  const commissionAmount = Number(
    ((baseAmount * commissionRate) / 100).toFixed(2),
  );

  return {
    baseAmount,
    commissionRate,
    commissionAmount,
    currency: args.currency || args.affiliate.currency || "USD",
    calculationMode: "mock" as const,
  };
}
