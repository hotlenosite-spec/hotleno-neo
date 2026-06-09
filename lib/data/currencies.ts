export type CurrencyInfo = {
  code: string;
  nameEn: string;
  nameAr: string;
  symbol: string;
};

export const CURRENCY_STORAGE_KEY = "hotleno.selectedCurrency";
export const CURRENCY_CHANGE_EVENT = "hotleno:currency-change";
export const DEFAULT_CURRENCY_CODE = "USD";

export const currencies: CurrencyInfo[] = [
  { code: "SAR", nameEn: "Saudi Riyal", nameAr: "ريال سعودي", symbol: "ر.س" },
  { code: "USD", nameEn: "US Dollar", nameAr: "دولار أمريكي", symbol: "$" },
  { code: "EUR", nameEn: "Euro", nameAr: "يورو", symbol: "€" },
  { code: "GBP", nameEn: "British Pound", nameAr: "جنيه إسترليني", symbol: "£" },
  { code: "AED", nameEn: "UAE Dirham", nameAr: "درهم إماراتي", symbol: "د.إ" },
  { code: "KWD", nameEn: "Kuwaiti Dinar", nameAr: "دينار كويتي", symbol: "د.ك" },
  { code: "QAR", nameEn: "Qatari Riyal", nameAr: "ريال قطري", symbol: "ر.ق" },
  { code: "BHD", nameEn: "Bahraini Dinar", nameAr: "دينار بحريني", symbol: "د.ب" },
  { code: "OMR", nameEn: "Omani Rial", nameAr: "ريال عماني", symbol: "ر.ع" },
  { code: "EGP", nameEn: "Egyptian Pound", nameAr: "جنيه مصري", symbol: "ج.م" },
  { code: "TRY", nameEn: "Turkish Lira", nameAr: "ليرة تركية", symbol: "₺" },
  { code: "INR", nameEn: "Indian Rupee", nameAr: "روبية هندية", symbol: "₹" },
  { code: "PKR", nameEn: "Pakistani Rupee", nameAr: "روبية باكستانية", symbol: "₨" },
  { code: "IDR", nameEn: "Indonesian Rupiah", nameAr: "روبية إندونيسية", symbol: "Rp" },
  { code: "MYR", nameEn: "Malaysian Ringgit", nameAr: "رينغيت ماليزي", symbol: "RM" },
  { code: "CNY", nameEn: "Chinese Yuan", nameAr: "يوان صيني", symbol: "¥" },
  { code: "JPY", nameEn: "Japanese Yen", nameAr: "ين ياباني", symbol: "¥" },
  { code: "KRW", nameEn: "South Korean Won", nameAr: "وون كوري", symbol: "₩" },
  { code: "RUB", nameEn: "Russian Ruble", nameAr: "روبل روسي", symbol: "₽" },
  { code: "CAD", nameEn: "Canadian Dollar", nameAr: "دولار كندي", symbol: "C$" },
  { code: "AUD", nameEn: "Australian Dollar", nameAr: "دولار أسترالي", symbol: "A$" },
  { code: "CHF", nameEn: "Swiss Franc", nameAr: "فرنك سويسري", symbol: "CHF" },
  { code: "SEK", nameEn: "Swedish Krona", nameAr: "كرونة سويدية", symbol: "kr" },
  { code: "NOK", nameEn: "Norwegian Krone", nameAr: "كرونة نرويجية", symbol: "kr" },
  { code: "DKK", nameEn: "Danish Krone", nameAr: "كرونة دنماركية", symbol: "kr" },
  { code: "ZAR", nameEn: "South African Rand", nameAr: "راند جنوب أفريقي", symbol: "R" },
  { code: "BRL", nameEn: "Brazilian Real", nameAr: "ريال برازيلي", symbol: "R$" },
  { code: "MXN", nameEn: "Mexican Peso", nameAr: "بيزو مكسيكي", symbol: "$" },
  { code: "SGD", nameEn: "Singapore Dollar", nameAr: "دولار سنغافوري", symbol: "S$" },
  { code: "THB", nameEn: "Thai Baht", nameAr: "بات تايلندي", symbol: "฿" },
  { code: "PHP", nameEn: "Philippine Peso", nameAr: "بيزو فلبيني", symbol: "₱" },
  { code: "NZD", nameEn: "New Zealand Dollar", nameAr: "دولار نيوزيلندي", symbol: "NZ$" },
];

export function getCurrencyByCode(code: string | null | undefined) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  return currencies.find((currency) => currency.code === normalizedCode);
}

export function isSupportedCurrencyCode(code: string | null | undefined) {
  return Boolean(getCurrencyByCode(code));
}

export function getStoredCurrencyCode() {
  if (typeof window === "undefined") return DEFAULT_CURRENCY_CODE;
  const storedCode = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
  return isSupportedCurrencyCode(storedCode) ? String(storedCode).toUpperCase() : DEFAULT_CURRENCY_CODE;
}

export function saveStoredCurrencyCode(code: string) {
  if (typeof window === "undefined") return;
  const normalizedCode = isSupportedCurrencyCode(code) ? code.toUpperCase() : DEFAULT_CURRENCY_CODE;
  window.localStorage.setItem(CURRENCY_STORAGE_KEY, normalizedCode);
  window.dispatchEvent(
    new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: { currency: normalizedCode } }),
  );
}
