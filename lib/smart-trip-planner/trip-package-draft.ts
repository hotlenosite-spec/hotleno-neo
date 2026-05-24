export type TripPackageMode = "known_destination" | "open_destination";
export type TripPackageSource = "smart_trip_planner";

export interface TripPackageDraftItem {
  type: "hotel" | "flight" | "car";
  name: string;
  price: number;
  image?: string;
  duration?: string;
  features?: string[];
  cancellationPolicy: string;
}

export interface TripPackageDraftDates {
  label: string;
  departureDate?: string;
  returnDate?: string;
}

export interface TripPackageDraft {
  idempotencyKey: string;
  source: TripPackageSource;
  mode: TripPackageMode;
  selectedHotel?: TripPackageDraftItem;
  selectedFlight?: TripPackageDraftItem;
  selectedCar?: TripPackageDraftItem;
  totalPrice: number;
  currency: string;
  travelers: string;
  dates: TripPackageDraftDates | string;
  budget: number;
  interests: string[];
  createdAt: string;
}

export const TRIP_PACKAGE_DRAFT_STORAGE_KEY = "hotleno.smartTripPackageDraft";

export function createTripPackageIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `smart-trip-${crypto.randomUUID()}`;
  }

  return `smart-trip-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function saveTripPackageDraft(draft: TripPackageDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TRIP_PACKAGE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function getTripPackageDraft(): TripPackageDraft | null {
  if (typeof window === "undefined") return null;

  const rawDraft = sessionStorage.getItem(TRIP_PACKAGE_DRAFT_STORAGE_KEY);
  if (!rawDraft) return null;

  try {
    const parsed = JSON.parse(rawDraft) as TripPackageDraft;
    if (parsed?.source !== "smart_trip_planner" || !parsed.idempotencyKey) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
