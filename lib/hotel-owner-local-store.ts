"use client";

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
  createdAt: string;
}

export const HOTEL_OWNER_LOCAL_KEYS = {
  properties: "hotleno.hotelOwner.local.properties",
  rooms: "hotleno.hotelOwner.local.rooms",
  availability: "hotleno.hotelOwner.local.availability",
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
