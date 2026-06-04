import type { HotelSearchResult } from "@/types/travellanda";

type JwtPayload = {
  email?: unknown;
  role?: unknown;
  supplierScope?: unknown;
};

function isTruthy(value: unknown) {
  return String(value || "").trim().toLowerCase() === "true";
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(
      normalizedPayload.padEnd(
        normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
        "=",
      ),
    );
    const parsed = JSON.parse(decodedPayload) as unknown;

    return parsed && typeof parsed === "object" ? (parsed as JwtPayload) : null;
  } catch {
    return null;
  }
}

export function hasTboSupplierOffer(hotel?: Pick<HotelSearchResult, "supplierOffers"> | null) {
  return (
    Array.isArray(hotel?.supplierOffers) &&
    hotel.supplierOffers.some(
      (offer) =>
        typeof offer === "object" &&
        offer !== null &&
        "supplier" in offer &&
        (offer as { supplier?: unknown }).supplier === "tbo",
    )
  );
}

export function isTboCertificationMode() {
  return (
    isTruthy(process.env.NEXT_PUBLIC_TBO_CERTIFICATION_MODE) ||
    isTruthy(process.env.TBO_CERTIFICATION_MODE)
  );
}

export function isTboTesterUser() {
  if (typeof window === "undefined") return false;

  const payload = decodeJwtPayload(localStorage.getItem("token") || "");
  return (
    String(payload?.email || "").toLowerCase() === "tbo.tester@hotleno.com" ||
    (payload?.role === "supplier_tester" && payload?.supplierScope === "tbo")
  );
}

export function shouldSkipTravellandaForTbo(
  hotel?: Pick<HotelSearchResult, "supplierOffers"> | null,
) {
  return isTboCertificationMode() || isTboTesterUser() || hasTboSupplierOffer(hotel);
}
