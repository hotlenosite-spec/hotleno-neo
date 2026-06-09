"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  CustomerServiceIcon,
  TelegramIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

type Message = {
  id: string;
  senderType: "customer" | "admin" | "system";
  senderName: string;
  message: string;
  createdAt: string | null;
};

type Ticket = {
  _id: string;
  ticketNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  bookingId?: string;
  bookingReference?: string;
  messages: Message[];
  assignedTo?: string;
  assignedToName?: string;
};

export default function AdminSupportDetailPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const ticketId = String(params.ticketId);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({
    status: "open",
    priority: "normal",
    category: "general",
    bookingId: "",
    bookingReference: "",
    assignedTo: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.status === 404) {
        toast.error(t("supportTicketNotFound"));
        router.replace(`/${locale}/admin/support`);
        return;
      }
      if (!response.ok) throw new Error("admin_support_detail_failed");
      const data = await response.json();
      const nextTicket = data.ticket as Ticket;
      setTicket(nextTicket);
      setForm({
        status: nextTicket.status,
        priority: nextTicket.priority,
        category: nextTicket.category,
        bookingId: nextTicket.bookingId || "",
        bookingReference: nextTicket.bookingReference || "",
        assignedTo: nextTicket.assignedTo || "",
      });
    } catch {
      toast.error(t("supportFailedToFetch"));
    } finally {
      setLoading(false);
    }
  }, [locale, router, t, ticketId]);

  useEffect(() => {
    void fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const saveTicket = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.error === "invalid_admin_assignee") {
          toast.error(t("invalidAdminAssignee"));
          return;
        }
        throw new Error("admin_support_update_failed");
      }
      const data = await response.json();
      setTicket(data.ticket);
      toast.success(t("ticketUpdated"));
    } catch {
      toast.error(t("failedToUpdateTicket"));
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      setSending(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: reply, status: "waiting_customer" }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.error === "admin_reply_requires_reopen") {
          toast.error(t("adminReplyRequiresReopen"));
          return;
        }
        throw new Error("admin_support_reply_failed");
      }
      const data = await response.json();
      setTicket(data.ticket);
      setForm((current) => ({ ...current, status: data.ticket.status }));
      setReply("");
      toast.success(t("supportReplySent"));
    } catch {
      toast.error(t("supportReplyFailed"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="space-y-5"><Skeleton className="h-10 w-40" /><Skeleton className="h-40" /><Skeleton className="h-[500px]" /></div>;
  }
  if (!ticket) return null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href={`/${locale}/admin/support`}>
          <HugeiconsIcon icon={ArrowLeft01Icon} className="me-2 h-4 w-4 rtl:rotate-180" />
          {t("backToSupportTickets")}
        </Link>
      </Button>

      <Card className="rounded-[2rem] border-slate-200">
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <CardTitle className="text-2xl">{ticket.subject}</CardTitle>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge>{t(statusTranslation(ticket.status))}</Badge>
                <span className="text-sm text-slate-500">{ticket.ticketNumber}</span>
              </div>
            </div>
            <div className="text-sm text-slate-500">
              <p className="font-bold text-slate-900">{ticket.customerName}</p>
              <p>{ticket.customerEmail}</p>
              <p>{t("customerId")}: {ticket.userId}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-[2rem] border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70">
              <CardTitle>{t("conversation")}</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <ScrollArea className="h-[520px] pe-3">
                <div className="space-y-4">
                  {ticket.messages.map((message) => {
                    if (message.senderType === "system") {
                      return (
                        <div key={message.id} className="flex justify-center">
                          <div className="rounded-full bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
                            {message.message === "ticket_reopened_by_customer"
                              ? t("reopenedByCustomerMessage")
                              : message.message}
                          </div>
                        </div>
                      );
                    }
                    const isAdmin = message.senderType === "admin";
                    return (
                      <div key={message.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[88%] rounded-2xl p-4 shadow-sm ${isAdmin ? "rounded-se-sm bg-[#0F172A] text-white" : "rounded-ss-sm border border-slate-200 bg-white text-slate-900"}`}>
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs opacity-75">
                            <HugeiconsIcon icon={isAdmin ? CustomerServiceIcon : UserIcon} className="h-4 w-4" />
                            <span>{message.senderName}</span>
                            <span>{formatDate(message.createdAt, locale)}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {ticket.status !== "closed" && ticket.status !== "resolved" && (
            <Card className="rounded-[2rem] border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100"><CardTitle>{t("replyToCustomer")}</CardTitle></CardHeader>
              <CardContent>
                <Textarea className="min-h-32 resize-y" value={reply} onChange={(event) => setReply(event.target.value)} placeholder={t("replyPlaceholder")} rows={5} />
                <Button className="mt-4 bg-[#F97316] font-bold text-white hover:bg-[#EA580C]" onClick={sendReply} disabled={sending || !reply.trim()}>
                  <HugeiconsIcon icon={TelegramIcon} className="me-2 h-4 w-4" />
                  {sending ? t("sendingReply") : t("sendReply")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit rounded-[2rem] border-slate-200 shadow-sm xl:sticky xl:top-24">
          <CardHeader className="border-b border-slate-100"><CardTitle>{t("ticketManagement")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <AdminField label={t("status")}>
              <Select value={form.status} onValueChange={(status) => setForm((current) => ({ ...current, status }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["open", "waiting_customer", "waiting_admin", "waiting_supplier", "resolved", "closed"].map((status) => <SelectItem key={status} value={status}>{t(statusTranslation(status))}</SelectItem>)}
                </SelectContent>
              </Select>
            </AdminField>
            <AdminField label={t("priority")}>
              <Select value={form.priority} onValueChange={(priority) => setForm((current) => ({ ...current, priority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low", "normal", "high", "urgent"].map((priority) => <SelectItem key={priority} value={priority}>{t(priorityTranslation(priority))}</SelectItem>)}
                </SelectContent>
              </Select>
            </AdminField>
            <AdminField label={t("category")}>
              <Select value={form.category} onValueChange={(category) => setForm((current) => ({ ...current, category }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["booking_issue", "payment_issue", "cancellation_refund", "hotel_issue", "account_issue", "general"].map((category) => <SelectItem key={category} value={category}>{t(categoryTranslation(category))}</SelectItem>)}
                </SelectContent>
              </Select>
            </AdminField>
            <AdminField label={t("bookingId")}><Input value={form.bookingId} onChange={(event) => setForm((current) => ({ ...current, bookingId: event.target.value }))} /></AdminField>
            <AdminField label={t("bookingReference")}><Input value={form.bookingReference} onChange={(event) => setForm((current) => ({ ...current, bookingReference: event.target.value }))} /></AdminField>
            {(form.bookingId || form.bookingReference) && (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/${locale}/admin/bookings?search=${encodeURIComponent(form.bookingId || form.bookingReference)}`}>
                  {t("viewRelatedBooking")}
                </Link>
              </Button>
            )}
            <AdminField label={t("assignedTo")}><Input value={form.assignedTo} onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))} placeholder={t("assigneePlaceholder")} /></AdminField>
            <Button className="w-full" onClick={saveTicket} disabled={saving}>
              {saving ? t("savingChanges") : t("saveChanges")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label className="text-sm font-bold text-slate-700">{label}</label>{children}</div>;
}
function statusTranslation(value: string) {
  return ({ open: "statusOpen", waiting_customer: "statusWaitingCustomer", waiting_admin: "statusWaitingAdmin", waiting_supplier: "statusWaitingSupplier", resolved: "statusResolved", closed: "statusClosed" } as Record<string, string>)[value] || "statusOpen";
}
function priorityTranslation(value: string) {
  return ({ low: "priorityLow", normal: "priorityNormal", high: "priorityHigh", urgent: "priorityUrgent" } as Record<string, string>)[value] || "priorityNormal";
}
function categoryTranslation(value: string) {
  return ({ booking_issue: "categoryBookingIssue", payment_issue: "categoryPaymentIssue", cancellation_refund: "categoryCancellationRefund", hotel_issue: "categoryHotelIssue", account_issue: "categoryAccountIssue", general: "categoryGeneral" } as Record<string, string>)[value] || "categoryGeneral";
}
function formatDate(value: string | null, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
