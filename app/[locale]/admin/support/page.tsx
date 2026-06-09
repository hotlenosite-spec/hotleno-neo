"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentState } from "@/components/shared/content-state";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  ClockIcon,
  CustomerServiceIcon,
  Message02Icon,
  Search01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

type Ticket = {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  customerName: string;
  customerEmail: string;
  assignedToName?: string;
  updatedAt: string | null;
  messageCount: number;
};

type Stats = {
  total: number;
  open: number;
  waitingCustomer: number;
  waitingAdmin: number;
  waitingSupplier: number;
  resolved: number;
  closed: number;
  urgent: number;
};

const statuses = [
  "open",
  "waiting_customer",
  "waiting_admin",
  "waiting_supplier",
  "resolved",
  "closed",
] as const;
const priorities = ["low", "normal", "high", "urgent"] as const;
const categories = [
  "booking_issue",
  "payment_issue",
  "cancellation_refund",
  "hotel_issue",
  "account_issue",
  "general",
] as const;

export default function AdminSupportPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (search) params.set("search", search);

      const response = await fetch(`/api/admin/support?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("admin_support_fetch_failed");
      const data = await response.json();
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      setStats(data.stats);
      setTotalPages(Math.max(data.pagination?.pages || 1, 1));
    } catch {
      setLoadError(true);
      toast.error(t("supportFailedToFetch"));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, page, priorityFilter, search, statusFilter, t]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#f4d58d]">
              {t("supportCenterLabel")}
            </div>
            <h1 className="text-3xl font-black md:text-4xl">{t("support")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              {t("manageSupportTickets")}
            </p>
          </div>
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <HeroMiniCard title={t("totalTickets")} value={stats.total} />
              <HeroMiniCard title={t("urgentTickets")} value={stats.urgent} />
              <HeroMiniCard title={t("waitingAdmin")} value={stats.waitingAdmin} />
            </div>
          )}
        </div>
      </section>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title={t("totalTickets")} value={stats.total} icon={CustomerServiceIcon} color="bg-orange-50 text-orange-700" description={t("allSupportTickets")} />
          <StatsCard title={t("openTickets")} value={stats.open + stats.waitingAdmin + stats.waitingCustomer + stats.waitingSupplier} icon={Alert02Icon} color="bg-amber-50 text-amber-700" description={t("requireAttention")} />
          <StatsCard title={t("resolvedTickets")} value={stats.resolved + stats.closed} icon={CheckmarkCircle02Icon} color="bg-emerald-50 text-emerald-700" description={t("completedTickets")} />
          <StatsCard title={t("urgentTickets")} value={stats.urgent} icon={Alert02Icon} color="bg-red-50 text-red-700" description={t("needImmediate")} />
        </div>
      )}

      <Card className="rounded-[2rem] border-slate-200">
        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <HugeiconsIcon icon={Search01Icon} className="absolute start-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setPage(1);
                    setSearch(searchInput.trim());
                  }
                }}
                placeholder={t("searchSupportTickets")}
                className="h-12 ps-10"
              />
            </div>
            <FilterSelect value={statusFilter} onChange={(value) => { setPage(1); setStatusFilter(value); }} placeholder={t("filterByStatus")} allLabel={t("allStatuses")} values={statuses} label={(value) => t(statusTranslation(value))} />
            <FilterSelect value={priorityFilter} onChange={(value) => { setPage(1); setPriorityFilter(value); }} placeholder={t("filterByPriority")} allLabel={t("allPriorities")} values={priorities} label={(value) => t(priorityTranslation(value))} />
            <FilterSelect value={categoryFilter} onChange={(value) => { setPage(1); setCategoryFilter(value); }} placeholder={t("filterByCategory")} allLabel={t("allCategories")} values={categories} label={(value) => t(categoryTranslation(value))} />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>{t("allTickets")}</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 rounded-3xl" />)}</div>
          ) : loadError ? (
            <ContentState
              type="error"
              title={t("supportLoadErrorTitle")}
              description={t("supportLoadErrorDescription")}
              action={
                <Button variant="outline" onClick={fetchTickets}>
                  {t("retry")}
                </Button>
              }
            />
          ) : tickets.length === 0 ? (
            <ContentState
              type="empty"
              title={t("noTicketsFound")}
              description={t("noTicketsDescription")}
            />
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white hover:shadow-lg">
                  <div className="flex flex-col justify-between gap-4 xl:flex-row">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-slate-950">{ticket.subject}</span>
                        <TicketBadge label={t(statusTranslation(ticket.status))} tone={statusTone(ticket.status)} />
                        <TicketBadge label={t(priorityTranslation(ticket.priority))} tone={priorityTone(ticket.priority)} />
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><HugeiconsIcon icon={UserIcon} className="h-4 w-4" />{ticket.customerName}</span>
                        <span>{ticket.customerEmail}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">{ticket.ticketNumber}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1"><HugeiconsIcon icon={ClockIcon} className="h-3 w-3" />{formatDate(ticket.updatedAt, locale)}</span>
                        <span>{t(categoryTranslation(ticket.category))}</span>
                        {ticket.assignedToName && <span>{t("assignedTo")}: {ticket.assignedToName}</span>}
                      </div>
                    </div>
                    <Button asChild variant="outline" className="rounded-2xl border-orange-200 bg-white font-bold text-orange-700 hover:bg-orange-50">
                      <Link href={`/${locale}/admin/support/${ticket._id}`}>
                        <HugeiconsIcon icon={Message02Icon} className="me-2 h-4 w-4" />
                        {t("openConversation")} · {ticket.messageCount} {t("messages")}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page === 1}>
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4 rotate-180 rtl:rotate-0" />
              </Button>
              <span className="text-sm font-bold">{t("page")} {page} {t("of")} {totalPages}</span>
              <Button variant="outline" size="icon" onClick={() => setPage((value) => Math.min(value + 1, totalPages))} disabled={page === totalPages}>
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterSelect<T extends string>({ value, onChange, placeholder, allLabel, values, label }: { value: string; onChange: (value: string) => void; placeholder: string; allLabel: string; values: readonly T[]; label: (value: T) => string }) {
  return (
    <Select value={value || "all"} onValueChange={(next) => onChange(next === "all" ? "" : next)}>
      <SelectTrigger className="h-12"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {values.map((item) => <SelectItem key={item} value={item}>{label(item)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function TicketBadge({ label, tone }: { label: string; tone: string }) {
  return <Badge className={`rounded-full px-3 py-1 ${tone}`}>{label}</Badge>;
}

function HeroMiniCard({ title, value }: { title: string; value: number }) {
  return <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-center"><p className="text-2xl font-black">{value}</p><p className="mt-1 text-xs font-bold text-slate-300">{title}</p></div>;
}

function StatsCard({ title, value, icon, color, description }: { title: string; value: number; icon: typeof CustomerServiceIcon; color: string; description: string }) {
  return <Card className="rounded-[2rem] border-slate-200"><CardContent className="p-6"><div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}><HugeiconsIcon icon={icon} className="h-6 w-6" /></div><p className="text-sm font-bold text-slate-500">{title}</p><p className="mt-2 text-2xl font-black">{value}</p><p className="mt-2 text-xs text-slate-400">{description}</p></CardContent></Card>;
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
function statusTone(value: string) {
  if (value === "closed") return "bg-slate-100 text-slate-700";
  if (value === "resolved") return "bg-emerald-50 text-emerald-700";
  if (value === "waiting_customer") return "bg-blue-50 text-blue-700";
  if (value === "waiting_supplier") return "bg-purple-50 text-purple-700";
  return "bg-orange-50 text-orange-700";
}
function priorityTone(value: string) {
  if (value === "urgent") return "bg-red-50 text-red-700";
  if (value === "high") return "bg-orange-50 text-orange-700";
  if (value === "low") return "bg-slate-100 text-slate-700";
  return "bg-amber-50 text-amber-700";
}
function formatDate(value: string | null, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
