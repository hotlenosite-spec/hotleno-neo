"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Booking = {
  _id: string;
  bookingReference?: string;
  serviceType?: string;
  hotelName?: string;
  checkInDate?: string;
  totalPrice?: number;
  currency?: string;
  status?: string;
  supplier?: string;
  supplierStatus?: string;
  cancellationStatus?: string;
  amendments?: Array<Record<string, unknown>>;
  paymentAdjustments?: Array<{ status?: string; paymentUrl?: string }>;
};

const cancellableStatuses = new Set([
  "pending_payment",
  "payment_disabled_created",
  "payment_succeeded",
  "supplier_booking_not_started",
  "supplier_booking_processing",
  "supplier_booking_pending",
  "supplier_booking_confirmed",
  "manual_review_required",
]);

function hasPendingSupplierAmendment(booking: Booking) {
  return booking.amendments?.some((amendment) => amendment.status === "pending_supplier_action");
}

function hasPendingAdditionalPayment(booking: Booking) {
  return (
    booking.status === "pending_additional_payment" ||
    booking.paymentAdjustments?.some((adjustment) => adjustment.status === "pending")
  );
}

function getCustomerStatusLabel(booking: Booking, t: ReturnType<typeof useTranslations<"account">>) {
  if (booking.supplierStatus === "confirmed" && booking.cancellationStatus === "failed") {
    return t("customerStatus.cancellationFailed");
  }
  if (hasPendingSupplierAmendment(booking)) return t("customerStatus.amendmentPending");
  if (hasPendingAdditionalPayment(booking)) return t("customerStatus.additionalPaymentPending");

  switch (booking.status) {
    case "pending_payment":
    case "payment_disabled_created":
      return t("customerStatus.requestCreated");
    case "payment_succeeded":
    case "supplier_booking_processing":
    case "supplier_booking_pending":
    case "supplier_booking_not_started":
      return t("customerStatus.processing");
    case "supplier_booking_confirmed":
      return t("customerStatus.confirmed");
    case "cancellation_requested":
      return t("customerStatus.cancellationRequested");
    case "cancelled":
      return t("customerStatus.cancelled");
    case "supplier_booking_failed":
    case "cancellation_failed":
    case "manual_review_required":
      return t("customerStatus.underReview");
    default:
      return t("customerStatus.processing");
  }
}

export default function AccountBookingsPage() {
  const locale = useLocale();
  const t = useTranslations("account");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadBookings = async () => {
    await Promise.resolve();
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("/api/account/bookings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => setBookings(data.bookings || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBookings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const cancelBooking = async (bookingId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const response = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingId }),
    });
    const data = await response.json().catch(() => null);
    setMessage(data?.message || data?.error || t("bookings.cancelRequestSaved"));
    void loadBookings();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">{t("bookings.eyebrow")}</p>
        <h1 className="text-3xl font-bold">{t("bookings.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("bookings.description")}</p>
      </div>

      {message && <div className="rounded-md border bg-muted p-3 text-sm">{message}</div>}

      <Card>
        <CardHeader>
          <CardTitle>{t("bookings.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t("loading")}</p>
          ) : bookings.length === 0 ? (
            <div className="rounded-md bg-muted p-8 text-center">
              <h2 className="font-semibold">{t("bookings.emptyTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("bookings.empty")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[780px] space-y-2">
                <div className="grid grid-cols-[1.1fr_.7fr_1.2fr_.9fr_.8fr_.9fr_1fr] gap-3 px-3 text-xs font-semibold text-muted-foreground">
                  <span>{t("bookings.bookingId")}</span>
                  <span>{t("bookings.service")}</span>
                  <span>{t("bookings.name")}</span>
                  <span>{t("bookings.date")}</span>
                  <span>{t("bookings.price")}</span>
                  <span>{t("bookings.status")}</span>
                  <span>{t("bookings.actions")}</span>
                </div>
                {bookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="grid grid-cols-[1.1fr_.7fr_1.2fr_.9fr_.8fr_.9fr_1fr] items-center gap-3 rounded-md border p-3 text-sm"
                  >
                    <span className="truncate font-medium">{booking.bookingReference || booking._id}</span>
                    <span>{booking.serviceType || "hotel"}</span>
                    <span className="truncate">{booking.hotelName || "-"}</span>
                    <span>{booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : "-"}</span>
                    <span>{booking.currency || "USD"} {booking.totalPrice ?? 0}</span>
                    <span><Badge variant="outline">{getCustomerStatusLabel(booking, t)}</Badge></span>
                    <span className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/${locale}/account/bookings/${booking._id}`}>{t("actions.details")}</Link>
                      </Button>
                      {cancellableStatuses.has(String(booking.status || "")) && (
                        <Button size="sm" variant="outline" onClick={() => cancelBooking(booking._id)}>
                          {t("actions.cancel")}
                        </Button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
