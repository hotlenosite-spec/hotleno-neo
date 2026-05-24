export type BookingChannel = "b2c" | "b2b";

export interface B2BPricingAgencyInput {
  markupRate?: number | null;
  commissionRate?: number | null;
}

export interface CalculateB2BPricingInput {
  channel: BookingChannel;
  basePrice: number;
  currency: string;
  agency?: B2BPricingAgencyInput | null;
}

export interface B2BPricingResult {
  channel: BookingChannel;
  netPrice: number;
  markupAmount: number;
  markupPercent: number;
  commissionAmount: number;
  finalSellingPrice: number;
  currency: string;
}

function normalizeRate(rate: number | null | undefined) {
  if (!Number.isFinite(rate) || rate == null || rate < 0) return 0;
  return rate;
}

export function roundMoney(amount: number) {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculatePercentageAmount(amount: number, percent: number) {
  return roundMoney(roundMoney(amount) * (normalizeRate(percent) / 100));
}

export function calculateB2BPricing(
  input: CalculateB2BPricingInput,
): B2BPricingResult {
  const netPrice = roundMoney(Math.max(input.basePrice, 0));
  const currency = input.currency.trim().toUpperCase() || "USD";

  if (input.channel === "b2c") {
    return {
      channel: "b2c",
      netPrice,
      markupAmount: 0,
      markupPercent: 0,
      commissionAmount: 0,
      finalSellingPrice: netPrice,
      currency,
    };
  }

  const markupPercent = normalizeRate(input.agency?.markupRate);
  const commissionPercent = normalizeRate(input.agency?.commissionRate);
  const markupAmount = calculatePercentageAmount(netPrice, markupPercent);
  const finalSellingPrice = roundMoney(netPrice + markupAmount);
  const commissionAmount = calculatePercentageAmount(netPrice, commissionPercent);

  return {
    channel: "b2b",
    netPrice,
    markupAmount,
    markupPercent,
    commissionAmount,
    finalSellingPrice,
    currency,
  };
}
