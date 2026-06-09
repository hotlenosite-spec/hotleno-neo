export type MarkupPreviewInput = {
  basePrice: number;
  markupType: "percentage" | "fixed";
  markupValue: number;
  minProfit?: number | null;
  maxProfit?: number | null;
};

export function calculateMarkupPreview(input: MarkupPreviewInput) {
  const basePrice = Math.max(0, Number(input.basePrice) || 0);
  const markupValue = Math.max(0, Number(input.markupValue) || 0);
  let profit =
    input.markupType === "percentage"
      ? (basePrice * markupValue) / 100
      : markupValue;

  if (
    typeof input.minProfit === "number" &&
    Number.isFinite(input.minProfit)
  ) {
    profit = Math.max(profit, Math.max(0, input.minProfit));
  }
  if (
    typeof input.maxProfit === "number" &&
    Number.isFinite(input.maxProfit)
  ) {
    profit = Math.min(profit, Math.max(0, input.maxProfit));
  }

  return {
    basePrice: Number(basePrice.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    estimatedSellingPrice: Number((basePrice + profit).toFixed(2)),
  };
}
