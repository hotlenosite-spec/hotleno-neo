"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

type SupplierCode = "tbo" | "hotelbeds" | "travellanda" | "sabre";
type SupplierStatus = "active" | "inactive" | "maintenance";

type SupplierSetting = {
  supplierCode: SupplierCode;
  displayName: string;
  enabled: boolean;
  searchEnabled: boolean;
  bookingEnabled: boolean;
  priority: number;
  timeoutMs: number;
  markupPercent: number;
  status: SupplierStatus;
  lastError: string | null;
  notes: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

const statusStyles: Record<SupplierStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inactive: "border-slate-200 bg-slate-100 text-slate-600",
  maintenance: "border-amber-200 bg-amber-50 text-amber-700",
};

export default function SuppliersControlPage() {
  const t = useTranslations("adminSuppliers");
  const [settings, setSettings] = useState<SupplierSetting[]>([]);
  const [savedSettings, setSavedSettings] = useState<SupplierSetting[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingCode, setSavingCode] = useState<SupplierCode | null>(null);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    }),
    [],
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/suppliers", {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "load_failed");
      const nextSettings = Array.isArray(data.settings) ? data.settings : [];
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
      setCanManage(Boolean(data.canManage));
    } catch {
      setError(t("errors.load"));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateDraft = <K extends keyof SupplierSetting>(
    supplierCode: SupplierCode,
    field: K,
    value: SupplierSetting[K],
  ) => {
    setSettings((items) =>
      items.map((item) =>
        item.supplierCode === supplierCode
          ? { ...item, [field]: value }
          : item,
      ),
    );
    setSuccess("");
  };

  const isDirty = useCallback(
    (setting: SupplierSetting) => {
      const saved = savedSettings.find(
        (item) => item.supplierCode === setting.supplierCode,
      );
      if (!saved) return true;
      return (
        saved.displayName !== setting.displayName ||
        saved.enabled !== setting.enabled ||
        saved.searchEnabled !== setting.searchEnabled ||
        saved.bookingEnabled !== setting.bookingEnabled ||
        saved.priority !== setting.priority ||
        saved.timeoutMs !== setting.timeoutMs ||
        saved.markupPercent !== setting.markupPercent ||
        saved.status !== setting.status ||
        saved.notes !== setting.notes
      );
    },
    [savedSettings],
  );

  const saveSetting = async (setting: SupplierSetting) => {
    setSavingCode(setting.supplierCode);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/suppliers", {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierCode: setting.supplierCode,
          displayName: setting.displayName,
          enabled: setting.enabled,
          searchEnabled: setting.searchEnabled,
          bookingEnabled: setting.bookingEnabled,
          priority: Number(setting.priority),
          timeoutMs: Number(setting.timeoutMs),
          markupPercent: Number(setting.markupPercent),
          status: setting.status,
          notes: setting.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "save_failed");
      const nextSettings = Array.isArray(data.settings) ? data.settings : [];
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
      setSuccess(t("saved", { supplier: setting.displayName }));
    } catch {
      setError(t("errors.save"));
    } finally {
      setSavingCode(null);
    }
  };

  const summary = useMemo(
    () => ({
      total: settings.length,
      active: settings.filter(
        (item) => item.enabled && item.status === "active",
      ).length,
      search: settings.filter((item) => item.searchEnabled).length,
      booking: settings.filter((item) => item.bookingEnabled).length,
    }),
    [settings],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge className="mb-3 bg-[#F97316] text-white">{t("eyebrow")}</Badge>
          <h1 className="text-3xl font-black text-[#0F172A]">{t("title")}</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
            {t("description")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={loadSettings}
          disabled={loading}
          className="rounded-xl"
        >
          {t("refresh")}
        </Button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-sm font-black text-amber-900">{t("integrationNoticeTitle")}</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          {t("integrationNotice")}
        </p>
      </div>

      {!canManage && !loading && !error && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-bold text-sky-800">
          {t("readOnlyNotice")}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-sm font-bold text-red-700">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={loadSettings}>
            {t("retry")}
          </Button>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
          {success}
        </div>
      )}

      {!loading && !error && settings.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [t("summary.total"), summary.total],
            [t("summary.active"), summary.active],
            [t("summary.search"), summary.search],
            [t("summary.booking"), summary.booking],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <p className="text-xs font-bold text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Card key={item} className="rounded-2xl border-slate-200">
              <CardContent className="space-y-5 p-6">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-11 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !error && settings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="font-black text-slate-800">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-slate-500">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {settings.map((setting) => (
            <Card
              key={setting.supplierCode}
              className="overflow-hidden rounded-2xl border-slate-200 shadow-sm"
            >
              <CardHeader className="border-b border-slate-100 bg-slate-50/60">
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xl font-black text-slate-950">
                      {setting.displayName}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase text-slate-400">
                      {setting.supplierCode}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-3 py-1 font-black",
                      statusStyles[setting.status],
                    )}
                  >
                    {t(`statuses.${setting.status}`)}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <SettingSwitch
                    label={t("fields.enabled")}
                    checked={setting.enabled}
                    disabled={!canManage}
                    onCheckedChange={(checked) =>
                      updateDraft(setting.supplierCode, "enabled", checked)
                    }
                  />
                  <SettingSwitch
                    label={t("fields.searchEnabled")}
                    checked={setting.searchEnabled}
                    disabled={!canManage}
                    onCheckedChange={(checked) =>
                      updateDraft(setting.supplierCode, "searchEnabled", checked)
                    }
                  />
                  <SettingSwitch
                    label={t("fields.bookingEnabled")}
                    checked={setting.bookingEnabled}
                    disabled={!canManage}
                    onCheckedChange={(checked) =>
                      updateDraft(setting.supplierCode, "bookingEnabled", checked)
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("fields.status")}</Label>
                    <Select
                      value={setting.status}
                      disabled={!canManage}
                      onValueChange={(value) =>
                        updateDraft(
                          setting.supplierCode,
                          "status",
                          value as SupplierStatus,
                        )
                      }
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t("statuses.active")}</SelectItem>
                        <SelectItem value="inactive">{t("statuses.inactive")}</SelectItem>
                        <SelectItem value="maintenance">
                          {t("statuses.maintenance")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <NumberField
                    label={t("fields.priority")}
                    value={setting.priority}
                    min={1}
                    max={100}
                    disabled={!canManage}
                    onChange={(value) =>
                      updateDraft(setting.supplierCode, "priority", value)
                    }
                  />
                  <NumberField
                    label={t("fields.timeoutMs")}
                    value={setting.timeoutMs}
                    min={1000}
                    max={120000}
                    step={1000}
                    disabled={!canManage}
                    onChange={(value) =>
                      updateDraft(setting.supplierCode, "timeoutMs", value)
                    }
                  />
                  <NumberField
                    label={t("fields.markupPercent")}
                    value={setting.markupPercent}
                    min={0}
                    max={100}
                    step={0.1}
                    disabled={!canManage}
                    onChange={(value) =>
                      updateDraft(setting.supplierCode, "markupPercent", value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${setting.supplierCode}-notes`}>
                    {t("fields.notes")}
                  </Label>
                  <Textarea
                    id={`${setting.supplierCode}-notes`}
                    value={setting.notes}
                    disabled={!canManage}
                    maxLength={2000}
                    placeholder={t("notesPlaceholder")}
                    onChange={(event) =>
                      updateDraft(
                        setting.supplierCode,
                        "notes",
                        event.target.value,
                      )
                    }
                    className="min-h-24 bg-white"
                  />
                </div>

                <div
                  className={cn(
                    "rounded-xl border px-4 py-3",
                    setting.lastError
                      ? "border-red-200 bg-red-50"
                      : "border-slate-200 bg-slate-50",
                  )}
                >
                  <p className="text-xs font-black text-slate-500">
                    {t("fields.lastError")}
                  </p>
                  <p
                    className={cn(
                      "mt-1 break-words text-sm font-medium",
                      setting.lastError ? "text-red-700" : "text-slate-500",
                    )}
                  >
                    {setting.lastError || t("noLastError")}
                  </p>
                </div>

                <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
                  <p className="text-xs font-medium text-slate-400">
                    {setting.updatedAt
                      ? t("lastUpdated", {
                          date: new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(setting.updatedAt)),
                        })
                      : t("notUpdated")}
                  </p>
                  {canManage && (
                    <Button
                      type="button"
                      onClick={() => saveSetting(setting)}
                      disabled={
                        savingCode === setting.supplierCode || !isDirty(setting)
                      }
                      className="rounded-xl bg-[#F97316] font-black hover:bg-[#ea580c]"
                    >
                      {savingCode === setting.supplierCode
                        ? t("saving")
                        : t("save")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingSwitch({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-bold leading-5 text-slate-700">{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 rounded-xl bg-white"
      />
    </div>
  );
}
