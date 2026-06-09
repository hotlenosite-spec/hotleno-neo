"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ContentState } from "@/components/shared/content-state";

type AgencyStatus = "pending" | "active" | "suspended" | "rejected";
type Agency = {
  id: string;
  name: string;
  commercialName: string;
  country: string;
  city: string;
  phone: string;
  email: string;
  status: AgencyStatus;
  commissionRate: number;
  markupRate: number;
  creditLimit: number;
  walletBalance: number;
  currency: string;
  apiEnabled: boolean;
  apiKeyPrefix: string | null;
  hasApiKey: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyForm = Omit<
  Agency,
  "id" | "apiKeyPrefix" | "hasApiKey" | "createdAt" | "updatedAt"
>;

const emptyForm: AgencyForm = {
  name: "",
  commercialName: "",
  country: "",
  city: "",
  phone: "",
  email: "",
  status: "pending",
  commissionRate: 0,
  markupRate: 0,
  creditLimit: 0,
  walletBalance: 0,
  currency: "USD",
  apiEnabled: false,
  notes: "",
};

const statusStyles: Record<AgencyStatus, string> = {
  pending: "bg-amber-50 text-amber-700 hover:bg-amber-50",
  active: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  suspended: "bg-red-50 text-red-700 hover:bg-red-50",
  rejected: "bg-slate-200 text-slate-700 hover:bg-slate-200",
};

export default function AdminAgenciesPage() {
  const locale = useLocale();
  const t = useTranslations("adminAgencies");
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [form, setForm] = useState<AgencyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    }),
    [],
  );

  const fetchAgencies = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
      });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const response = await fetch(`/api/admin/agencies?${params}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("agency_fetch_failed");
      const data = await response.json();
      setAgencies(Array.isArray(data.agencies) ? data.agencies : []);
      setCanManage(Boolean(data.canManage));
      setPages(Number(data.pagination?.pages || 1));
      setTotal(Number(data.pagination?.total || 0));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, page, search, status]);

  useEffect(() => {
    void fetchAgencies();
  }, [fetchAgencies]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (agency: Agency) => {
    setEditing(agency);
    setForm({
      name: agency.name,
      commercialName: agency.commercialName,
      country: agency.country,
      city: agency.city,
      phone: agency.phone,
      email: agency.email,
      status: agency.status,
      commissionRate: agency.commissionRate,
      markupRate: agency.markupRate,
      creditLimit: agency.creditLimit,
      walletBalance: agency.walletBalance,
      currency: agency.currency,
      apiEnabled: agency.apiEnabled,
      notes: agency.notes,
    });
    setDialogOpen(true);
  };

  const saveAgency = async () => {
    if (
      !form.name.trim() ||
      !form.country.trim() ||
      !form.phone.trim() ||
      !form.email.trim()
    ) {
      toast.error(t("errors.required"));
      return;
    }
    try {
      setSaving(true);
      const response = await fetch(
        editing
          ? `/api/admin/agencies/${encodeURIComponent(editing.id)}`
          : "/api/admin/agencies",
        {
          method: editing ? "PATCH" : "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(t(`errors.${data.error || "saveFailed"}`));
        return;
      }
      toast.success(t(editing ? "updated" : "created"));
      setDialogOpen(false);
      await fetchAgencies();
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const currency = (amount: number, code: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code || "USD",
      maximumFractionDigits: 2,
    }).format(amount || 0);

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
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-center">
              <p className="text-2xl font-black text-slate-950">{total}</p>
              <p className="text-xs font-bold text-slate-500">{t("total")}</p>
            </div>
            {canManage && (
              <Button
                onClick={openCreate}
                className="h-12 rounded-xl bg-[#F97316] px-5 font-black hover:bg-[#ea580c]"
              >
                {t("addAgency")}
              </Button>
            )}
          </div>
        </div>
      </section>

      {!canManage && !loading && !loadError && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-bold text-sky-800">
          {t("readOnly")}
        </div>
      )}

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && setPage(1)}
            placeholder={t("searchPlaceholder")}
            className="h-11 rounded-xl"
          />
          <Select
            value={status || "all"}
            onValueChange={(value) => {
              setStatus(value === "all" ? "" : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {(["pending", "active", "suspended", "rejected"] as const).map(
                (item) => (
                  <SelectItem key={item} value={item}>
                    {t(`statuses.${item}`)}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void fetchAgencies()}>
            {t("search")}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>{t("listTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : loadError ? (
            <ContentState
              type="error"
              title={t("loadErrorTitle")}
              description={t("loadErrorDescription")}
              action={<Button onClick={fetchAgencies}>{t("retry")}</Button>}
            />
          ) : agencies.length === 0 ? (
            <ContentState
              type="empty"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                canManage ? <Button onClick={openCreate}>{t("addAgency")}</Button> : undefined
              }
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {agencies.map((agency) => (
                <div
                  key={agency.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-orange-200 hover:bg-white hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-950">
                        {agency.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {agency.commercialName || agency.email}
                      </p>
                    </div>
                    <Badge className={statusStyles[agency.status]}>
                      {t(`statuses.${agency.status}`)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Info label={t("location")} value={[agency.country, agency.city].filter(Boolean).join(" / ") || "-"} />
                    <Info label={t("markup")} value={`${agency.markupRate}%`} />
                    <Info label={t("creditLimit")} value={currency(agency.creditLimit, agency.currency)} />
                    <Info label={t("walletBalance")} value={currency(agency.walletBalance, agency.currency)} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <Badge
                      variant="outline"
                      className={agency.apiEnabled ? "border-emerald-200 text-emerald-700" : "text-slate-500"}
                    >
                      {agency.apiEnabled ? t("apiEnabled") : t("apiDisabled")}
                    </Badge>
                    <div className="flex gap-2">
                      {canManage && (
                        <Button variant="outline" size="sm" onClick={() => openEdit(agency)}>
                          {t("edit")}
                        </Button>
                      )}
                      <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800">
                        <Link href={`/${locale}/admin/agencies/${agency.id}`}>
                          {t("details")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                {t("previous")}
              </Button>
              <span className="text-sm font-bold text-slate-600">
                {t("page", { page, pages })}
              </span>
              <Button variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
                {t("next")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AgencyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        editing={Boolean(editing)}
        saving={saving}
        onSave={saveAgency}
        t={t}
      />
    </div>
  );
}

function AgencyDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editing,
  saving,
  onSave,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AgencyForm;
  setForm: (form: AgencyForm) => void;
  editing: boolean;
  saving: boolean;
  onSave: () => void;
  t: ReturnType<typeof useTranslations<"adminAgencies">>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t(editing ? "editTitle" : "createTitle")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={t("fields.commercialName")}><Input value={form.commercialName} onChange={(e) => setForm({ ...form, commercialName: e.target.value })} /></Field>
          <Field label={t("fields.email")}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={t("fields.phone")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label={t("fields.country")}><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
          <Field label={t("fields.city")}><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label={t("fields.status")}>
            <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as AgencyStatus })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["pending", "active", "suspended", "rejected"] as const).map((item) => (
                  <SelectItem key={item} value={item}>{t(`statuses.${item}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("fields.currency")}><Input maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></Field>
          <NumberField label={t("fields.commissionRate")} value={form.commissionRate} onChange={(commissionRate) => setForm({ ...form, commissionRate })} />
          <NumberField label={t("fields.markupRate")} value={form.markupRate} onChange={(markupRate) => setForm({ ...form, markupRate })} />
          <NumberField label={t("fields.creditLimit")} value={form.creditLimit} onChange={(creditLimit) => setForm({ ...form, creditLimit })} />
          <NumberField label={t("fields.walletBalance")} value={form.walletBalance} allowNegative onChange={(walletBalance) => setForm({ ...form, walletBalance })} />
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 sm:col-span-2">
            <div><Label>{t("fields.apiEnabled")}</Label><p className="mt-1 text-xs text-slate-500">{t("apiEnabledHelp")}</p></div>
            <Switch checked={form.apiEnabled} onCheckedChange={(apiEnabled) => setForm({ ...form, apiEnabled })} />
          </div>
          <Field label={t("fields.notes")} className="sm:col-span-2">
            <Textarea value={form.notes} maxLength={5000} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={onSave} disabled={saving} className="bg-[#F97316] font-black hover:bg-[#ea580c]">
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-2 block">{label}</Label>{children}</div>;
}

function NumberField({ label, value, allowNegative, onChange }: { label: string; value: number; allowNegative?: boolean; onChange: (value: number) => void }) {
  return <Field label={label}><Input type="number" min={allowNegative ? undefined : 0} step="0.01" value={value} onChange={(e) => onChange(Number(e.target.value))} /></Field>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white px-3 py-2"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 break-words font-bold text-slate-700">{value}</p></div>;
}
