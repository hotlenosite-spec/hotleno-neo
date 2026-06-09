"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { calculateMarkupPreview } from "@/lib/pricing/markup-preview";

type PricingScope = "global" | "b2c" | "b2b" | "supplier" | "agency";
type MarkupType = "percentage" | "fixed";

type PricingRule = {
  id: string;
  name: string;
  scope: PricingScope;
  supplierCode: string | null;
  agencyId: string | null;
  markupType: MarkupType;
  markupValue: number;
  minProfit: number | null;
  maxProfit: number | null;
  enabled: boolean;
  priority: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type PricingRuleForm = Omit<PricingRule, "id" | "createdAt" | "updatedAt">;

const emptyForm: PricingRuleForm = {
  name: "",
  scope: "global",
  supplierCode: null,
  agencyId: null,
  markupType: "percentage",
  markupValue: 0,
  minProfit: null,
  maxProfit: null,
  enabled: true,
  priority: 10,
  notes: "",
};

export default function AdminPricingPage() {
  const t = useTranslations("adminPricing");
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [form, setForm] = useState<PricingRuleForm>(emptyForm);
  const [previewBasePrice, setPreviewBasePrice] = useState(100);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    }),
    [],
  );

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await fetch("/api/admin/pricing", {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("pricing_fetch_failed");
      const data = await response.json();
      setRules(Array.isArray(data.rules) ? data.rules : []);
      setCanManage(Boolean(data.canManage));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const activeRules = useMemo(
    () => rules.filter((rule) => rule.enabled).length,
    [rules],
  );

  const preview = useMemo(
    () =>
      calculateMarkupPreview({
        basePrice: previewBasePrice,
        markupType: form.markupType,
        markupValue: form.markupValue,
        minProfit: form.minProfit,
        maxProfit: form.maxProfit,
      }),
    [
      form.markupType,
      form.markupValue,
      form.maxProfit,
      form.minProfit,
      previewBasePrice,
    ],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, priority: (rules.at(-1)?.priority || 0) + 10 });
    setDialogOpen(true);
  };

  const openEdit = (rule: PricingRule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      scope: rule.scope,
      supplierCode: rule.supplierCode,
      agencyId: rule.agencyId,
      markupType: rule.markupType,
      markupValue: rule.markupValue,
      minProfit: rule.minProfit,
      maxProfit: rule.maxProfit,
      enabled: rule.enabled,
      priority: rule.priority,
      notes: rule.notes,
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    if (!form.name.trim()) return t("errors.nameRequired");
    if (form.scope === "supplier" && !form.supplierCode?.trim()) {
      return t("errors.supplierRequired");
    }
    if (form.scope === "agency" && !form.agencyId?.trim()) {
      return t("errors.agencyRequired");
    }
    if (
      form.minProfit !== null &&
      form.maxProfit !== null &&
      form.minProfit > form.maxProfit
    ) {
      return t("errors.profitRange");
    }
    return "";
  };

  const saveRule = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        editing
          ? `/api/admin/pricing/${encodeURIComponent(editing.id)}`
          : "/api/admin/pricing",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
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
      await fetchRules();
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: PricingRule, enabled: boolean) => {
    const response = await fetch(
      `/api/admin/pricing/${encodeURIComponent(rule.id)}`,
      {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...rule, enabled }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      toast.error(t("errors.saveFailed"));
      return;
    }
    setRules((items) =>
      items.map((item) => (item.id === rule.id ? { ...item, enabled } : item)),
    );
  };

  const archiveRule = async (rule: PricingRule) => {
    if (!window.confirm(t("archiveConfirm", { name: rule.name }))) return;
    const response = await fetch(
      `/api/admin/pricing/${encodeURIComponent(rule.id)}`,
      { method: "DELETE", headers: authHeaders() },
    ).catch(() => null);
    if (!response?.ok) {
      toast.error(t("errors.archiveFailed"));
      return;
    }
    setRules((items) => items.filter((item) => item.id !== rule.id));
    toast.success(t("archived"));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <Badge className="mb-3 bg-[#F97316] text-white">{t("eyebrow")}</Badge>
            <h1 className="text-3xl font-black text-slate-950">{t("title")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              {t("description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Metric value={rules.length} label={t("totalRules")} />
            <Metric value={activeRules} label={t("activeRules")} />
            {canManage && (
              <Button
                type="button"
                onClick={openCreate}
                className="h-auto min-h-12 rounded-xl bg-[#F97316] px-5 font-black hover:bg-[#ea580c]"
              >
                {t("addRule")}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="font-black text-amber-900">{t("noticeTitle")}</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">{t("notice")}</p>
      </div>

      {!canManage && !loading && !loadError && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-bold text-sky-800">
          {t("readOnly")}
        </div>
      )}

      <Card className="rounded-[2rem] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>{t("rulesList")}</CardTitle>
          <p className="text-sm text-slate-500">{t("rulesListDescription")}</p>
        </CardHeader>
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : loadError ? (
            <ContentState
              type="error"
              title={t("loadErrorTitle")}
              description={t("loadErrorDescription")}
              action={
                <Button variant="outline" onClick={fetchRules}>
                  {t("retry")}
                </Button>
              }
            />
          ) : rules.length === 0 ? (
            <ContentState
              type="empty"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                canManage ? <Button onClick={openCreate}>{t("addRule")}</Button> : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-orange-200 hover:bg-white"
                >
                  <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-slate-950">
                          {rule.name}
                        </h2>
                        <Badge variant="outline" className="bg-white">
                          {t(`scopes.${rule.scope}`)}
                        </Badge>
                        <Badge
                          className={
                            rule.enabled
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                              : "bg-slate-200 text-slate-600 hover:bg-slate-200"
                          }
                        >
                          {t(rule.enabled ? "enabled" : "disabled")}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                        <span>
                          <strong>{t("markup")}:</strong>{" "}
                          {rule.markupType === "percentage"
                            ? `${rule.markupValue}%`
                            : rule.markupValue.toFixed(2)}
                        </span>
                        <span>
                          <strong>{t("priority")}:</strong> {rule.priority}
                        </span>
                        {rule.supplierCode && (
                          <span>
                            <strong>{t("supplierCode")}:</strong>{" "}
                            {rule.supplierCode}
                          </span>
                        )}
                        {rule.agencyId && (
                          <span>
                            <strong>{t("agencyId")}:</strong> {rule.agencyId}
                          </span>
                        )}
                      </div>
                      {(rule.minProfit !== null || rule.maxProfit !== null) && (
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          {t("profitLimits", {
                            min: rule.minProfit ?? "-",
                            max: rule.maxProfit ?? "-",
                          })}
                        </p>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <span className="text-xs font-bold text-slate-500">
                            {t("enabled")}
                          </span>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(checked) => toggleRule(rule, checked)}
                          />
                        </div>
                        <Button variant="outline" onClick={() => openEdit(rule)}>
                          {t("edit")}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => archiveRule(rule)}
                          className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
                        >
                          {t("archive")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t(editing ? "editTitle" : "createTitle")}</DialogTitle>
            <DialogDescription>{t("formDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("name")} className="sm:col-span-2">
                <Input
                  value={form.name}
                  maxLength={120}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </Field>
              <Field label={t("scope")}>
                <Select
                  value={form.scope}
                  onValueChange={(scope) =>
                    setForm({
                      ...form,
                      scope: scope as PricingScope,
                      supplierCode: scope === "supplier" ? form.supplierCode : null,
                      agencyId: scope === "agency" ? form.agencyId : null,
                    })
                  }
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["global", "b2c", "b2b", "supplier", "agency"] as const).map(
                      (scope) => (
                        <SelectItem key={scope} value={scope}>
                          {t(`scopes.${scope}`)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("markupType")}>
                <Select
                  value={form.markupType}
                  onValueChange={(markupType) =>
                    setForm({ ...form, markupType: markupType as MarkupType })
                  }
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      {t("markupTypes.percentage")}
                    </SelectItem>
                    <SelectItem value="fixed">{t("markupTypes.fixed")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.scope === "supplier" && (
                <Field label={t("supplierCode")}>
                  <Input
                    value={form.supplierCode || ""}
                    placeholder="tbo"
                    onChange={(event) =>
                      setForm({ ...form, supplierCode: event.target.value })
                    }
                  />
                </Field>
              )}
              {form.scope === "agency" && (
                <Field label={t("agencyId")}>
                  <Input
                    value={form.agencyId || ""}
                    onChange={(event) =>
                      setForm({ ...form, agencyId: event.target.value })
                    }
                  />
                </Field>
              )}
              <NumberField
                label={t("markupValue")}
                value={form.markupValue}
                min={0}
                step={0.1}
                onChange={(markupValue) => setForm({ ...form, markupValue })}
              />
              <NumberField
                label={t("priority")}
                value={form.priority}
                min={1}
                step={1}
                onChange={(priority) => setForm({ ...form, priority })}
              />
              <OptionalNumberField
                label={t("minProfit")}
                value={form.minProfit}
                onChange={(minProfit) => setForm({ ...form, minProfit })}
              />
              <OptionalNumberField
                label={t("maxProfit")}
                value={form.maxProfit}
                onChange={(maxProfit) => setForm({ ...form, maxProfit })}
              />
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 sm:col-span-2">
                <div>
                  <Label>{t("enabled")}</Label>
                  <p className="mt-1 text-xs text-slate-500">{t("enabledHelp")}</p>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(enabled) => setForm({ ...form, enabled })}
                />
              </div>
              <Field label={t("notes")} className="sm:col-span-2">
                <Textarea
                  value={form.notes}
                  maxLength={2000}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </Field>
            </div>

            <div className="h-fit rounded-2xl border border-orange-100 bg-orange-50 p-5">
              <h3 className="font-black text-slate-950">{t("previewTitle")}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {t("previewDescription")}
              </p>
              <Field label={t("basePrice")} className="mt-4">
                <Input
                  type="number"
                  min={0}
                  value={previewBasePrice}
                  onChange={(event) => setPreviewBasePrice(Number(event.target.value))}
                  className="bg-white"
                />
              </Field>
              <div className="mt-4 space-y-3 rounded-xl bg-white p-4">
                <PreviewRow label={t("basePrice")} value={preview.basePrice} />
                <PreviewRow label={t("estimatedProfit")} value={preview.profit} />
                <div className="border-t border-slate-100 pt-3">
                  <PreviewRow
                    label={t("estimatedSellingPrice")}
                    value={preview.estimatedSellingPrice}
                    strong
                  />
                </div>
              </div>
              <p className="mt-3 text-xs font-medium leading-5 text-amber-800">
                {t("previewDisclaimer")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={saveRule}
              disabled={saving}
              className="bg-[#F97316] font-black hover:bg-[#ea580c]"
            >
              {saving ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-24 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
      <p className="text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

function OptionalNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        step={0.1}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
      />
    </Field>
  );
}

function PreviewRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={strong ? "text-lg font-black text-slate-950" : "font-bold text-slate-800"}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}
