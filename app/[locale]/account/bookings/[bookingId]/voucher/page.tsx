"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { HotelbedsHotelVoucher } from "@/components/hotels/hotelbeds-hotel-voucher";
import { PrintButton } from "@/components/vouchers/print-button";
import type { HotelbedsHotelVoucher as HotelbedsHotelVoucherType } from "@/types/hotelbeds-hotels-certification";

type AccountBooking = {
  _id: string;
  bookingReference?: string;
  supplierReference?: string;
  supplierBookingReference?: string;
  supplierBookingId?: string;
  supplierConfirmationNo?: string;
  supplier?: string;
  hotelName?: string;
  location?: string;
  hotelAddress?: string;
  hotelPhone?: string;
  checkInDate?: string;
  checkOutDate?: string;
  rooms?: Array<{
    roomName?: string;
    boardName?: string;
    adults?: number;
    children?: number;
    childAges?: number[];
  }>;
  travelers?: Array<{
    firstName?: string;
    lastName?: string;
    travelerType?: string;
    roomIndex?: number;
    age?: number;
  }>;
  leadGuest?: string;
  contactEmail?: string;
  contactPhone?: string;
  totalPrice?: number;
  currency?: string;
  status?: string;
  bookingStatus?: string;
  supplierStatus?: string;
  cancellationStatus?: string;
  cancellationPolicies?: unknown[];
  restrictions?: Array<{ Description?: string; description?: string }>;
  metadata?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown) {
  const text = String(value ?? "").trim();
  return text && text !== "undefined" && text !== "null" ? text : undefined;
}

function formatVoucherDate(value?: string) {
  if (!value) return undefined;
  const dateOnly = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : value;
}

function formatVoucherStatus(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (
    normalized === "supplier_booking_confirmed" ||
    normalized === "confirmed" ||
    normalized === "success"
  ) {
    return "Booking Confirmed";
  }

  return value;
}

function toVoucher(booking: AccountBooking): HotelbedsHotelVoucherType {
  const metadata = asRecord(booking.metadata);
  const hotelbedsFlow = asRecord(metadata.hotelbedsFlow);
  const hotelbedsPackage = asRecord(metadata.hotelbedsPackage);
  const hotelbedsSelectedRooms = asArray(metadata.hotelbedsSelectedRooms);
  const supplierReference =
    booking.supplierReference ||
    booking.supplierBookingReference ||
    booking.supplierBookingId ||
    booking.supplierConfirmationNo ||
    asString(metadata.hotelbedsBookingReference) ||
    asString(hotelbedsFlow.hotelbedsReference);
  const bookingRooms =
    booking.rooms?.length
      ? booking.rooms
      : hotelbedsSelectedRooms.map((room) => {
          const record = asRecord(room);
          return {
            roomName: asString(record.roomName),
            boardName: asString(record.boardName) || asString(record.boardCode),
            adults: Number(record.adults || 0),
            children: Number(record.children || 0),
            childAges: Array.isArray(record.childAges)
              ? record.childAges.map(Number).filter(Number.isFinite)
              : [],
          };
        });
  const cancellationPolicies =
    booking.cancellationPolicies?.length
      ? booking.cancellationPolicies
      : asArray(metadata.cancellationPolicies).length
        ? asArray(metadata.cancellationPolicies)
        : asArray(hotelbedsPackage.cancellationPolicies);
  const remarks =
    booking.restrictions
      ?.map((item) => item.Description || item.description)
      .filter((item): item is string => Boolean(item)) ||
    asArray(metadata.rateComments).map(String).filter(Boolean);

  return {
    supplier: "hotelbeds-accommodation",
    hotlenoReference: booking.bookingReference || booking._id,
    bookingReference: supplierReference,
    supplierReference,
    hotelName: booking.hotelName,
    hotelAddress:
      booking.hotelAddress ||
      booking.location ||
      asString(metadata.hotelAddress) ||
      asString(metadata.address),
    hotelPhone: booking.hotelPhone || asString(metadata.hotelPhone) || asString(metadata.phone),
    checkIn: formatVoucherDate(booking.checkInDate),
    checkOut: formatVoucherDate(booking.checkOutDate),
    roomName: bookingRooms?.[0]?.roomName,
    boardName: bookingRooms?.[0]?.boardName,
    holderName: booking.leadGuest,
    customerEmail: booking.contactEmail,
    customerPhone: booking.contactPhone,
    status: formatVoucherStatus(booking.status || booking.bookingStatus || booking.supplierStatus),
    cancellationStatus: booking.cancellationStatus,
    rooms: bookingRooms?.map((room, index) => {
      const roomTravelers = booking.travelers?.filter((traveler) => {
        const travelerRecord = traveler as typeof traveler & { roomIndex?: number };
        return typeof travelerRecord.roomIndex === "number"
          ? travelerRecord.roomIndex === index
          : index === 0;
      }) || [];

      return {
      name: room.roomName,
      board: room.boardName,
      adults: room.adults,
      children: room.children,
      childAges: room.childAges,
      guests: roomTravelers
        .map((traveler) => ({
          name: [traveler.firstName, traveler.lastName].filter(Boolean).join(" "),
          type: traveler.travelerType === "child" ? ("CH" as const) : ("AD" as const),
          age: traveler.age,
        }))
        .filter((traveler) => traveler.name),
      guestNames: roomTravelers
        .map((traveler) => [traveler.firstName, traveler.lastName].filter(Boolean).join(" "))
        .filter(Boolean),
      };
    }),
    guestNames: booking.travelers
      ?.map((traveler) => [traveler.firstName, traveler.lastName].filter(Boolean).join(" "))
      .filter(Boolean),
    cancellationPolicies,
    remarks,
  };
}

export default function AccountBookingVoucherPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState<AccountBooking | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBooking = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/account/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => null);
    setBooking(payload?.booking || null);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBooking();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBooking]);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 font-black">Loading voucher...</div>;
  }

  if (!booking) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 font-black">Voucher data was not found.</div>;
  }

  return (
    <div className="voucher-print-root mx-auto max-w-5xl space-y-5">
      <style>{`
        @media print {
          header, nav, aside, footer, .print-hidden {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
          .container {
            max-width: none !important;
            padding: 0 !important;
          }
          main, .voucher-print-root {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
          }
          .voucher-print-root section,
          .voucher-print-root [data-print-card] {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#F97316]">HOTLENO voucher</p>
          <h1 className="text-3xl font-black text-[#0F172A]">Booking voucher</h1>
        </div>
        <PrintButton />
      </div>
      <HotelbedsHotelVoucher voucher={toVoucher(booking)} />
    </div>
  );
}
