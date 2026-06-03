"use client";

export type LocalHotelReviewStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected";

export interface LocalHotelPartnerDraft {
  id: string;
  companyName: string;
  legalName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city: string;
  notes: string;
  status: LocalHotelReviewStatus;
  createdAt: string;
}

export interface LocalHotelProperty {
  id: string;
  name: string;
  description: string;
  starRating: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  checkInTime: string;
  checkOutTime: string;
  amenities: string;
  policies: string;
  status?: LocalHotelReviewStatus;
  createdAt: string;
}

export interface LocalHotelRoom {
  id: string;
  propertyId: string;
  name: string;
  roomType: string;
  description: string;
  maxAdults: string;
  maxChildren: string;
  maxOccupancy: string;
  bedType: string;
  basePrice: string;
  currency: string;
  mealPlan: string;
  cancellationPolicy: string;
  amenities: string;
  status?: LocalHotelReviewStatus;
  createdAt: string;
}

export interface LocalHotelPricing {
  id: string;
  propertyId: string;
  roomId: string;
  ratePlanName: string;
  price: string;
  currency: string;
  mealPlan: string;
  cancellationPolicy: string;
  minNights: string;
  maxNights: string;
  status: LocalHotelReviewStatus;
  createdAt: string;
}

export interface LocalHotelAvailability {
  id: string;
  roomId: string;
  date: string;
  availableRooms: string;
  price: string;
  currency: string;
  stopSell: boolean;
  minNights: string;
  maxNights: string;
  status?: LocalHotelReviewStatus;
  createdAt: string;
}

export interface LocalHotelImage {
  id: string;
  propertyId: string;
  roomId: string;
  imageUrl: string;
  fileName: string;
  caption: string;
  status: LocalHotelReviewStatus;
  createdAt: string;
}

export const HOTEL_OWNER_LOCAL_KEYS = {
  registrations: "hotleno.hotelOwner.local.registrations",
  properties: "hotleno.hotelOwner.local.properties",
  rooms: "hotleno.hotelOwner.local.rooms",
  pricing: "hotleno.hotelOwner.local.pricing",
  availability: "hotleno.hotelOwner.local.availability",
  images: "hotleno.hotelOwner.local.images",
};

export function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readLocalItems<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalItems<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event("hotleno:hotel-owner-local-updated"));
}
