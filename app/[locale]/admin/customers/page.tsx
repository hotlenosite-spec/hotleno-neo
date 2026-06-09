"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  customerType: "normal" | "vip";
  status: "active" | "blocked";
  bookingCount: number;
  lastActivityAt: string | null;
  createdAt: string | null;
};

function safeDate(value: string | null, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

export default function AdminCustomersPage() {
  const t = useTranslations("adminCustomers");
  const locale = useLocale();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [customerType, setCustomerType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        customerType,
        status,
      });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/admin/customers?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("customer_fetch_failed");
      const data = await response.json();
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
      setPages(Number(data.pagination?.pages || 1));
      setTotal(Number(data.pagination?.total || 0));
    } catch {
      setCustomers([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [customerType, page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <Badge className="mb-3 bg-[#F97316] text-white">{t("eyebrow")}</Badge>
            <h1 className="text-3xl font-black text-slate-950">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
              {t("description")}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-center">
            <p className="text-2xl font-black text-slate-950">{total}</p>
            <p className="text-xs font-bold text-slate-500">{t("total")}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_190px_190px_auto]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(1);
                void load();
              }
            }}
            placeholder={t("searchPlaceholder")}
            className="h-11 rounded-xl"
          />
          <Select value={customerType} onValueChange={(value) => { setCustomerType(value); setPage(1); }}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
              <SelectItem value="normal">{t("types.normal")}</SelectItem>
              <SelectItem value="vip">{t("types.vip")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
              <SelectItem value="active">{t("statuses.active")}</SelectItem>
              <SelectItem value="blocked">{t("statuses.blocked")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => { setPage(1); void load(); }}
            className="h-11 rounded-xl bg-[#F97316] font-black hover:bg-[#ea580c]"
          >
            {t("search")}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : loadError ? (
          <div className="p-6">
            <ContentState
              type="error"
              title={t("states.errorTitle")}
              description={t("states.errorDescription")}
              action={<Button onClick={() => void load()}>{t("states.retry")}</Button>}
            />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-6">
            <ContentState
              type="empty"
              title={t("states.emptyTitle")}
              description={t("states.emptyDescription")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {["customer", "phone", "type", "status", "bookings", "lastActivity", "registeredAt", "actions"].map((key) => (
                    <th key={key} className="px-5 py-4 text-start text-xs font-black uppercase">
                      {t(`columns.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-orange-50/30">
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">{customer.name || t("unknownName")}</p>
                      <p className="mt-1 text-xs text-slate-500">{customer.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{customer.phone || "-"}</td>
                    <td className="px-5 py-4">
                      <Badge className={customer.customerType === "vip" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}>
                        {t(`types.${customer.customerType}`)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={customer.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                        {t(`statuses.${customer.status}`)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">{customer.bookingCount}</td>
                    <td className="px-5 py-4 text-slate-600">{safeDate(customer.lastActivityAt, locale)}</td>
                    <td className="px-5 py-4 text-slate-600">{safeDate(customer.createdAt, locale)}</td>
                    <td className="px-5 py-4">
                      <Button asChild variant="outline" size="sm" className="rounded-lg font-bold">
                        <Link href={`/${locale}/admin/customers/${encodeURIComponent(customer.id)}`}>
                          {t("viewDetails")}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!loading && !loadError && total > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3">
          <p className="text-sm font-bold text-slate-500">
            {t("pagination", { page, pages })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              {t("previous")}
            </Button>
            <Button variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
              {t("next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
