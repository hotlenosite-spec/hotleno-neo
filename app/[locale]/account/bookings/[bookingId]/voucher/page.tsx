"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { HotelbedsHotelVoucher } from "@/components/hotels/hotelbeds-hotel-voucher";
import { PrintButton } from "@/components/vouchers/print-button";
import type { HotelbedsHotelVoucher as HotelbedsHotelVoucherType } from "@/types/hotelbeds-hotels-certification";

type AccountBooking = {
  _id: string;
  bookingReference?: string;
  supplier?: string;
  hotelName?: string;
  location?: string;
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
    age?: number;
  }>;
  leadGuest?: string;
  contactEmail?: string;
  contactPhone?: string;
  totalPrice?: number;
  currency?: string;
  status?: string;
  cancellationStatus?: string;
  cancellationPolicies?: unknown[];
  restrictions?: Array<{ Description?: string; description?: string }>;
};

function toVoucher(booking: AccountBooking): HotelbedsHotelVoucherType {
  return {
    supplier: "hotelbeds-accommodation",
    hotlenoReference: booking._id,
    bookingReference: booking.bookingReference,
    supplierReference: booking.bookingReference,
    hotelName: booking.hotelName,
    hotelAddress: booking.location,
    checkIn: booking.checkInDate,
    checkOut: booking.checkOutDate,
    roomName: booking.rooms?.[0]?.roomName,
    boardName: booking.rooms?.[0]?.boardName,
    holderName: booking.leadGuest,
    customerEmail: booking.contactEmail,
    customerPhone: booking.contactPhone,
    amount: booking.totalPrice,
    currency: booking.currency,
    status: booking.status,
    cancellationStatus: booking.cancellationStatus,
    rooms: booking.rooms?.map((room, index) => ({
      name: room.roomName,
      board: room.boardName,
      adults: room.adults,
      children: room.children,
      childAges: room.childAges,
      guestNames: booking.travelers
        ?.filter((traveler) => index === 0 || traveler.travelerType)
        .map((traveler) => [traveler.firstName, traveler.lastName].filter(Boolean).join(" "))
        .filter(Boolean),
    })),
    guestNames: booking.travelers
      ?.map((traveler) => [traveler.firstName, traveler.lastName].filter(Boolean).join(" "))
      .filter(Boolean),
    cancellationPolicies: booking.cancellationPolicies,
    remarks: booking.restrictions
      ?.map((item) => item.Description || item.description)
      .filter((item): item is string => Boolean(item)),
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
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
