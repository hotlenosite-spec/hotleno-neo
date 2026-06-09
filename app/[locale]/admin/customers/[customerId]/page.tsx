"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ContentState } from "@/components/shared/content-state";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  customerType: "normal" | "vip";
  status: "active" | "blocked";
  internalNotes: string;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
type Booking = {
  id: string;
  bookingReference: string;
  hotelName: string;
  roomName: string;
  checkInDate: string | null;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: string | null;
};
type Payment = {
  id: string;
  bookingReference: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  createdAt: string | null;
};
type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string | null;
  lastMessageAt: string | null;
};

function safeDate(value: string | null, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function safeMoney(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency || "USD" }).format(amount || 0);
  } catch {
    return `${currency || "USD"} ${(amount || 0).toFixed(2)}`;
  }
}

export default function AdminCustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = decodeURIComponent(params.customerId);
  const t = useTranslations("adminCustomers");
  const locale = useLocale();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("customer_fetch_failed");
      const data = await response.json();
      setCustomer(data.customer || null);
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      setCanManage(Boolean(data.canManage));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!customer || !canManage) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerType: customer.customerType,
          status: customer.status,
          internalNotes: customer.internalNotes,
        }),
      });
      if (!response.ok) throw new Error("customer_update_failed");
      const data = await response.json();
      setCustomer(data.customer);
      toast.success(t("detail.saved"));
    } catch {
      toast.error(t("detail.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-7xl space-y-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 w-full rounded-3xl" />)}</div>;
  }
  if (loadError || !customer) {
    return (
      <ContentState
        type="error"
        title={t("states.detailErrorTitle")}
        description={t("states.detailErrorDescription")}
        action={<Button onClick={() => void load()}>{t("states.retry")}</Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <Button asChild variant="ghost" className="mb-3 px-0 text-[#F97316] hover:bg-transparent">
              <Link href={`/${locale}/admin/customers`}>{t("detail.back")}</Link>
            </Button>
            <h1 className="text-3xl font-black text-slate-950">{customer.name || t("unknownName")}</h1>
            <p className="mt-2 text-sm text-slate-500">{customer.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className={customer.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                {t(`statuses.${customer.status}`)}
              </Badge>
              <Badge className={customer.customerType === "vip" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}>
                {t(`types.${customer.customerType}`)}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              [t("detail.bookingCount"), bookings.length],
              [t("detail.paymentCount"), payments.length],
              [t("detail.ticketCount"), tickets.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="min-w-24 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xl font-black text-slate-950">{value}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-slate-200 shadow-sm">
            <CardHeader><CardTitle>{t("detail.profile")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {[
                [t("columns.customer"), customer.name || t("unknownName")],
                [t("detail.email"), customer.email],
                [t("columns.phone"), customer.phone || "-"],
                [t("columns.registeredAt"), safeDate(customer.createdAt, locale)],
                [t("detail.lastLogin"), safeDate(customer.lastLoginAt, locale)],
                [t("detail.lastUpdated"), safeDate(customer.updatedAt, locale)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className="mt-2 break-words font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <DataSection title={t("detail.bookings")} empty={t("detail.noBookings")}>
            {bookings.map((booking) => (
              <div key={booking.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-black text-slate-950">{booking.hotelName || t("detail.hotelBooking")}</p>
                  <p className="mt-1 text-xs text-slate-500">{booking.bookingReference} · {booking.roomName || "-"}</p>
                  <p className="mt-2 text-sm text-slate-600">{safeDate(booking.checkInDate || booking.createdAt, locale)}</p>
                </div>
                <div className="text-start sm:text-end">
                  <p className="font-black text-slate-950">{safeMoney(booking.totalPrice, booking.currency, locale)}</p>
                  <Badge variant="secondary" className="mt-2">{booking.status || "-"}</Badge>
                </div>
              </div>
            ))}
          </DataSection>

          <DataSection title={t("detail.payments")} empty={t("detail.noPayments")}>
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-black text-slate-950">{payment.bookingReference || t("detail.paymentRecord")}</p>
                  <p className="mt-1 text-xs text-slate-500">{safeDate(payment.createdAt, locale)}</p>
                </div>
                <div className="text-start sm:text-end">
                  <p className="font-black">{safeMoney(payment.amount, payment.currency, locale)}</p>
                  <Badge variant="secondary" className="mt-2">{payment.status || "-"}</Badge>
                </div>
              </div>
            ))}
          </DataSection>

          <DataSection title={t("detail.supportTickets")} empty={t("detail.noTickets")}>
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/${locale}/admin/support/${encodeURIComponent(ticket.id)}`}
                className="block rounded-2xl border border-slate-200 p-4 transition-colors hover:border-orange-200 hover:bg-orange-50/40"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-black text-slate-950">{ticket.subject || t("detail.supportTicket")}</p>
                    <p className="mt-1 text-xs text-slate-500">{ticket.ticketNumber} · {safeDate(ticket.lastMessageAt, locale)}</p>
                  </div>
                  <Badge variant="secondary">{ticket.status || "-"}</Badge>
                </div>
              </Link>
            ))}
          </DataSection>
        </div>

        <Card className="h-fit rounded-[2rem] border-slate-200 shadow-sm xl:sticky xl:top-6">
          <CardHeader><CardTitle>{t("detail.accountManagement")}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>{t("detail.customerType")}</Label>
              <Select
                value={customer.customerType}
                disabled={!canManage}
                onValueChange={(value: "normal" | "vip") => setCustomer({ ...customer, customerType: value })}
              >
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t("types.normal")}</SelectItem>
                  <SelectItem value="vip">{t("types.vip")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("detail.accountStatus")}</Label>
              <Select
                value={customer.status}
                disabled={!canManage}
                onValueChange={(value: "active" | "blocked") => setCustomer({ ...customer, status: value })}
              >
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("statuses.active")}</SelectItem>
                  <SelectItem value="blocked">{t("statuses.blocked")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("detail.internalNotes")}</Label>
              <Textarea
                value={customer.internalNotes}
                disabled={!canManage}
                onChange={(event) => setCustomer({ ...customer, internalNotes: event.target.value })}
                placeholder={t("detail.notesPlaceholder")}
                className="min-h-36 rounded-xl"
                maxLength={4000}
              />
              <p className="text-xs leading-5 text-slate-500">{t("detail.notesPrivacy")}</p>
            </div>
            {canManage ? (
              <Button onClick={() => void save()} disabled={saving} className="h-11 w-full rounded-xl bg-[#F97316] font-black hover:bg-[#ea580c]">
                {saving ? t("detail.saving") : t("detail.save")}
              </Button>
            ) : (
              <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">{t("detail.readOnly")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DataSection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <Card className="rounded-[2rem] border-slate-200 shadow-sm">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {children.length > 0 ? children : <ContentState compact type="empty" title={empty} description={empty} />}
      </CardContent>
    </Card>
  );
}
