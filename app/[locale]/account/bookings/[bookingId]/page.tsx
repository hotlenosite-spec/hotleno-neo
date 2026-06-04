"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Booking = {
  _id: string;
  bookingReference?: string;
  hotelName?: string;
  location?: string;
  supplier?: string;
  rooms?: Array<{ roomName?: string; adults?: number; children?: number }>;
  travelers?: Array<{
    title?: string;
    firstName?: string;
    lastName?: string;
    travelerType?: string;
    nationality?: string;
    dateOfBirth?: string;
  }>;
  leadGuest?: string;
  contactEmail?: string;
  contactPhone?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalPrice?: number;
  currency?: string;
  status?: string;
  paymentStatus?: string;
  supplierStatus?: string;
  cancellationStatus?: string;
  amendments?: Array<Record<string, unknown>>;
  priceDifference?: number;
  refundDue?: number;
  paymentAdjustments?: Array<{
    amount?: number;
    currency?: string;
    status?: string;
    paymentUrl?: string;
  }>;
  cancellationPolicies?: unknown[];
  restrictions?: Array<{ Description?: string; description?: string }>;
  alerts?: unknown[];
  createdAt?: string;
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

export default function AccountBookingDetailsPage() {
  const params = useParams();
  const t = useTranslations("account");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const bookingId = params.bookingId as string;

  const loadBooking = useCallback(async () => {
    await Promise.resolve();
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`/api/account/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => setBooking(data.booking || null))
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBooking();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBooking]);

  const cancelBooking = async () => {
    const token = localStorage.getItem("token");
    if (!token || !booking) return;

    const response = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingId: booking._id }),
    });
    const data = await response.json().catch(() => null);
    setMessage(data?.message || data?.error || t("bookings.cancelRequestSaved"));
    void loadBooking();
  };

  if (loading) {
    return <div className="rounded-lg border p-6">{t("loading")}</div>;
  }

  if (!booking) {
    return <div className="rounded-lg border p-6">{t("bookings.notFound")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{t("bookingDetail.eyebrow")}</p>
          <h1 className="text-3xl font-bold">{booking.hotelName || booking.bookingReference}</h1>
          <p className="mt-2 text-muted-foreground">{booking.bookingReference || booking._id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{getCustomerStatusLabel(booking, t)}</Badge>
          <Badge variant="secondary">{booking.paymentStatus || "-"}</Badge>
        </div>
      </div>

      {message && <div className="rounded-md border bg-muted p-3 text-sm">{message}</div>}
      {booking.supplierStatus === "confirmed" && booking.cancellationStatus === "failed" ? (
        <div className="rounded-md border bg-muted p-3 text-sm">
          {t("customerStatus.cancellationFailed")}
        </div>
      ) : null}
      {hasPendingSupplierAmendment(booking) ? (
        <div className="rounded-md border bg-muted p-3 text-sm">
          {t("customerStatus.amendmentPending")}
        </div>
      ) : null}
      {booking.paymentAdjustments?.some((adjustment) =>
        ["pending", "payment_link_not_created_stripe_disabled"].includes(String(adjustment.status || "")),
      ) ? (
        <div className="rounded-md border bg-muted p-4 text-sm">
          <p className="font-medium">يوجد فرق سعر مطلوب لإكمال تعديل الحجز</p>
          {booking.paymentAdjustments.map((adjustment, index) =>
            adjustment.status === "pending" ? (
              <div key={index} className="mt-2">
                <span>
                  {adjustment.currency || booking.currency || "USD"} {adjustment.amount ?? 0}
                </span>
                {adjustment.paymentUrl && (
                  <a
                    href={adjustment.paymentUrl}
                    className="ms-3 font-medium text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    رابط الدفع
                  </a>
                )}
              </div>
            ) : null,
          )}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("bookingDetail.tripDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Detail label={t("bookings.name")} value={booking.hotelName || "-"} />
            <Detail label={t("bookingDetail.location")} value={booking.location || "-"} />
            <Detail label={t("bookingDetail.checkIn")} value={formatDate(booking.checkInDate)} />
            <Detail label={t("bookingDetail.checkOut")} value={formatDate(booking.checkOutDate)} />
            <Separator />
            <div>
              <p className="mb-2 font-medium">{t("bookingDetail.rooms")}</p>
              <div className="space-y-2">
                {(booking.rooms || []).map((room, index) => (
                  <div key={index} className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium">{room.roomName || t("bookingDetail.room")}</p>
                    <p className="text-muted-foreground">
                      {room.adults || 0} {t("bookingDetail.adults")} · {room.children || 0} {t("bookingDetail.children")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {booking.travelers?.length ? (
              <>
                <Separator />
                <div>
                  <p className="mb-2 font-medium">{t("bookingDetail.travelers")}</p>
                  <div className="space-y-2">
                    {booking.travelers.map((traveler, index) => (
                      <div key={index} className="rounded-md bg-muted p-3 text-sm">
                        <p className="font-medium">
                          {[traveler.title, traveler.firstName, traveler.lastName].filter(Boolean).join(" ") || "-"}
                        </p>
                        <p className="text-muted-foreground">
                          {traveler.travelerType || "-"} · {traveler.nationality || "-"} · {formatDate(traveler.dateOfBirth)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("bookingDetail.summary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Detail label={t("bookingDetail.leadGuest")} value={booking.leadGuest || "-"} />
            <Detail label={t("bookingDetail.email")} value={booking.contactEmail || "-"} />
            <Detail label={t("bookingDetail.phone")} value={booking.contactPhone || "-"} />
            <Detail label={t("bookingDetail.createdAt")} value={formatDate(booking.createdAt)} />
            <Separator />
            <div className="flex items-center justify-between text-lg font-bold">
              <span>{t("bookings.price")}</span>
              <span>{booking.currency || "USD"} {booking.totalPrice ?? 0}</span>
            </div>
            {cancellableStatuses.has(String(booking.status || "")) && (
              <Button variant="outline" className="w-full" onClick={cancelBooking}>
                {t("actions.cancel")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("bookingDetail.cancellationPolicy")}</CardTitle>
        </CardHeader>
        <CardContent>
          {booking.restrictions?.length ? (
            <div className="space-y-2">
              {booking.restrictions.map((item, index) => (
                <p key={index} className="rounded-md bg-muted p-3 text-sm">
                  {item.Description || item.description || t("bookingDetail.supplierPolicy")}
                </p>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {t("bookingDetail.supplierPolicy")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}
