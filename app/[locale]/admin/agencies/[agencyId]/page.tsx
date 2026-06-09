"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
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
type StaffRole = "owner" | "manager" | "agent" | "accountant";
type StaffStatus = "active" | "suspended";

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

type AgencyStaff = {
  id: string;
  agencyId: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

type AgencyBooking = {
  id: string;
  bookingReference: string;
  customerEmail: string;
  hotelName: string;
  status: string;
  totalPrice: number;
  currency: string;
  createdAt: string | null;
};

const staffPermissions = [
  "bookings.view",
  "bookings.create",
  "bookings.manage",
  "wallet.view",
  "reports.view",
  "staff.view",
  "staff.manage",
] as const;

const emptyStaff = {
  name: "",
  email: "",
  role: "agent" as StaffRole,
  status: "active" as StaffStatus,
  permissions: ["bookings.view", "bookings.create"],
};

export default function AdminAgencyDetailPage() {
  const params = useParams<{ agencyId: string }>();
  const agencyId = decodeURIComponent(params.agencyId);
  const locale = useLocale();
  const t = useTranslations("adminAgencies");
  const [agency, setAgency] = useState<Agency | null>(null);
  const [staff, setStaff] = useState<AgencyStaff[]>([]);
  const [bookings, setBookings] = useState<AgencyBooking[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingAgency, setSavingAgency] = useState(false);
  const [staffDialog, setStaffDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AgencyStaff | null>(null);
  const [staffForm, setStaffForm] = useState(emptyStaff);
  const [savingStaff, setSavingStaff] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const [keyDialog, setKeyDialog] = useState(false);
  const [keyBusy, setKeyBusy] = useState(false);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    }),
    [],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await fetch(
        `/api/admin/agencies/${encodeURIComponent(agencyId)}`,
        { headers: authHeaders(), cache: "no-store" },
      );
      if (!response.ok) throw new Error("agency_fetch_failed");
      const data = await response.json();
      setAgency(data.agency || null);
      setStaff(Array.isArray(data.staff) ? data.staff : []);
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setCanManage(Boolean(data.canManage));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [agencyId, authHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveAgency = async () => {
    if (!agency) return;
    try {
      setSavingAgency(true);
      const response = await fetch(
        `/api/admin/agencies/${encodeURIComponent(agencyId)}`,
        {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(agency),
        },
      );
      if (!response.ok) throw new Error("agency_update_failed");
      const data = await response.json();
      setAgency(data.agency);
      toast.success(t("updated"));
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setSavingAgency(false);
    }
  };

  const openStaffCreate = () => {
    setEditingStaff(null);
    setStaffForm(emptyStaff);
    setStaffDialog(true);
  };

  const openStaffEdit = (member: AgencyStaff) => {
    setEditingStaff(member);
    setStaffForm({
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      permissions: member.permissions,
    });
    setStaffDialog(true);
  };

  const togglePermission = (permission: string) => {
    setStaffForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  };

  const saveStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim()) {
      toast.error(t("errors.staffRequired"));
      return;
    }
    try {
      setSavingStaff(true);
      const response = await fetch(
        editingStaff
          ? `/api/admin/agencies/${encodeURIComponent(agencyId)}/staff/${encodeURIComponent(editingStaff.id)}`
          : `/api/admin/agencies/${encodeURIComponent(agencyId)}/staff`,
        {
          method: editingStaff ? "PATCH" : "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(staffForm),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(t(`errors.${data.error || "staffSaveFailed"}`));
        return;
      }
      toast.success(t(editingStaff ? "staffUpdated" : "staffCreated"));
      setStaffDialog(false);
      await load();
    } catch {
      toast.error(t("errors.staffSaveFailed"));
    } finally {
      setSavingStaff(false);
    }
  };

  const generateKey = async () => {
    if (!window.confirm(t("apiGenerateConfirm"))) return;
    try {
      setKeyBusy(true);
      const response = await fetch(
        `/api/admin/agencies/${encodeURIComponent(agencyId)}/api-key`,
        { method: "POST", headers: authHeaders() },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("api_key_create_failed");
      setGeneratedKey(data.apiKey || "");
      setKeyDialog(true);
      await load();
    } catch {
      toast.error(t("errors.apiKeyCreateFailed"));
    } finally {
      setKeyBusy(false);
    }
  };

  const disableKey = async () => {
    if (!window.confirm(t("apiDisableConfirm"))) return;
    try {
      setKeyBusy(true);
      const response = await fetch(
        `/api/admin/agencies/${encodeURIComponent(agencyId)}/api-key`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!response.ok) throw new Error("api_key_disable_failed");
      toast.success(t("apiDisabledSuccess"));
      await load();
    } catch {
      toast.error(t("errors.apiKeyDisableFailed"));
    } finally {
      setKeyBusy(false);
    }
  };

  const updateAgencyField = <K extends keyof Agency>(
    field: K,
    value: Agency[K],
  ) => {
    setAgency((current) => (current ? { ...current, [field]: value } : current));
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (loadError || !agency) {
    return (
      <ContentState
        type="error"
        title={t("detailLoadError")}
        description={t("detailLoadErrorDescription")}
        action={<Button onClick={load}>{t("retry")}</Button>}
      />
    );
  }

  const formatMoney = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: agency.currency || "USD",
    }).format(value || 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href={`/${locale}/admin/agencies`}
            className="text-sm font-bold text-[#F97316]"
          >
            {t("backToAgencies")}
          </Link>
          <h1 className="mt-2 text-3xl font-black text-slate-950">{agency.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {agency.commercialName || agency.email}
          </p>
        </div>
        <Badge className="w-fit bg-slate-900 text-white">
          {t(`statuses.${agency.status}`)}
        </Badge>
      </div>

      {!canManage && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-bold text-sky-800">
          {t("readOnly")}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Card className="rounded-3xl border-slate-200">
          <CardHeader><CardTitle>{t("agencyData")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <TextField label={t("fields.name")} value={agency.name} disabled={!canManage} onChange={(value) => updateAgencyField("name", value)} />
            <TextField label={t("fields.commercialName")} value={agency.commercialName} disabled={!canManage} onChange={(value) => updateAgencyField("commercialName", value)} />
            <TextField label={t("fields.email")} value={agency.email} disabled={!canManage} type="email" onChange={(value) => updateAgencyField("email", value)} />
            <TextField label={t("fields.phone")} value={agency.phone} disabled={!canManage} onChange={(value) => updateAgencyField("phone", value)} />
            <TextField label={t("fields.country")} value={agency.country} disabled={!canManage} onChange={(value) => updateAgencyField("country", value)} />
            <TextField label={t("fields.city")} value={agency.city} disabled={!canManage} onChange={(value) => updateAgencyField("city", value)} />
            <div>
              <Label className="mb-2 block">{t("fields.status")}</Label>
              <Select value={agency.status} disabled={!canManage} onValueChange={(value) => updateAgencyField("status", value as AgencyStatus)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["pending", "active", "suspended", "rejected"] as const).map((item) => <SelectItem key={item} value={item}>{t(`statuses.${item}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <TextField label={t("fields.currency")} value={agency.currency} disabled={!canManage} onChange={(value) => updateAgencyField("currency", value.toUpperCase().slice(0, 3))} />
            <NumberField label={t("fields.commissionRate")} value={agency.commissionRate} disabled={!canManage} onChange={(value) => updateAgencyField("commissionRate", value)} />
            <NumberField label={t("fields.markupRate")} value={agency.markupRate} disabled={!canManage} onChange={(value) => updateAgencyField("markupRate", value)} />
            <NumberField label={t("fields.creditLimit")} value={agency.creditLimit} disabled={!canManage} onChange={(value) => updateAgencyField("creditLimit", value)} />
            <NumberField label={t("fields.walletBalance")} value={agency.walletBalance} disabled={!canManage} allowNegative onChange={(value) => updateAgencyField("walletBalance", value)} />
            <div className="sm:col-span-2">
              <Label className="mb-2 block">{t("fields.notes")}</Label>
              <Textarea value={agency.notes} disabled={!canManage} maxLength={5000} onChange={(event) => updateAgencyField("notes", event.target.value)} />
            </div>
            {canManage && (
              <Button onClick={saveAgency} disabled={savingAgency} className="bg-[#F97316] font-black hover:bg-[#ea580c] sm:col-span-2">
                {savingAgency ? t("saving") : t("saveAgency")}
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-slate-200">
            <CardHeader><CardTitle>{t("creditSettings")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Summary label={t("creditLimit")} value={formatMoney(agency.creditLimit)} />
              <Summary label={t("walletBalance")} value={formatMoney(agency.walletBalance)} />
              <Summary label={t("commission")} value={`${agency.commissionRate}%`} />
              <Summary label={t("markup")} value={`${agency.markupRate}%`} />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader><CardTitle>{t("apiSettings")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <span className="text-sm font-bold text-slate-600">{t("apiStatus")}</span>
                <Badge className={agency.apiEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}>
                  {agency.apiEnabled ? t("apiEnabled") : t("apiDisabled")}
                </Badge>
              </div>
              {agency.apiKeyPrefix && (
                <Summary label={t("apiKeyPrefix")} value={`${agency.apiKeyPrefix}...`} />
              )}
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={generateKey} disabled={keyBusy} className="bg-slate-900 hover:bg-slate-800">
                    {agency.hasApiKey ? t("regenerateApiKey") : t("generateApiKey")}
                  </Button>
                  {agency.hasApiKey && agency.apiEnabled && (
                    <Button variant="outline" onClick={disableKey} disabled={keyBusy} className="border-red-200 text-red-700">
                      {t("disableApiKey")}
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs leading-5 text-slate-500">{t("apiNotIntegrated")}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div><CardTitle>{t("agencyStaff")}</CardTitle><p className="mt-1 text-sm text-slate-500">{t("agencyStaffDescription")}</p></div>
          {canManage && <Button onClick={openStaffCreate}>{t("addStaff")}</Button>}
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <ContentState type="empty" title={t("staffEmptyTitle")} description={t("staffEmptyDescription")} />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {staff.map((member) => (
                <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-black text-slate-900">{member.name}</p><p className="mt-1 text-sm text-slate-500">{member.email}</p></div>
                    <Badge variant="outline">{t(`staffRoles.${member.role}`)}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">{t("permissionCount", { count: member.permissions.length })}</span>
                    {canManage && <Button size="sm" variant="outline" onClick={() => openStaffEdit(member)}>{t("edit")}</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-slate-200">
        <CardHeader><CardTitle>{t("agencyBookings")}</CardTitle></CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <ContentState type="empty" title={t("bookingsEmptyTitle")} description={t("bookingsEmptyDescription")} />
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center">
                  <div><p className="font-black text-slate-900">{booking.bookingReference}</p><p className="mt-1 text-sm text-slate-500">{booking.hotelName || booking.customerEmail || "-"}</p></div>
                  <div className="flex items-center gap-3"><Badge variant="outline">{booking.status || "-"}</Badge><span className="font-black">{new Intl.NumberFormat(locale, { style: "currency", currency: booking.currency || agency.currency }).format(booking.totalPrice || 0)}</span></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <StaffDialog open={staffDialog} onOpenChange={setStaffDialog} form={staffForm} setForm={setStaffForm} editing={Boolean(editingStaff)} saving={savingStaff} onSave={saveStaff} togglePermission={togglePermission} t={t} />

      <Dialog open={keyDialog} onOpenChange={(open) => { setKeyDialog(open); if (!open) setGeneratedKey(""); }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{t("apiKeyCreatedTitle")}</DialogTitle><DialogDescription>{t("apiKeyCreatedDescription")}</DialogDescription></DialogHeader>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 font-mono text-sm break-all">{generatedKey}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(generatedKey)}>{t("copyApiKey")}</Button>
            <Button onClick={() => setKeyDialog(false)}>{t("done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StaffDialog({ open, onOpenChange, form, setForm, editing, saving, onSave, togglePermission, t }: { open: boolean; onOpenChange: (open: boolean) => void; form: typeof emptyStaff; setForm: React.Dispatch<React.SetStateAction<typeof emptyStaff>>; editing: boolean; saving: boolean; onSave: () => void; togglePermission: (permission: string) => void; t: ReturnType<typeof useTranslations<"adminAgencies">> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-2xl"><DialogHeader><DialogTitle>{t(editing ? "editStaffTitle" : "addStaffTitle")}</DialogTitle><DialogDescription>{t("staffFormDescription")}</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><TextField label={t("fields.staffName")} value={form.name} onChange={(name) => setForm({ ...form, name })} /><TextField label={t("fields.staffEmail")} value={form.email} type="email" onChange={(email) => setForm({ ...form, email })} /><div><Label className="mb-2 block">{t("fields.staffRole")}</Label><Select value={form.role} onValueChange={(role) => setForm({ ...form, role: role as StaffRole })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{(["owner", "manager", "agent", "accountant"] as const).map((role) => <SelectItem key={role} value={role}>{t(`staffRoles.${role}`)}</SelectItem>)}</SelectContent></Select></div><div><Label className="mb-2 block">{t("fields.staffStatus")}</Label><Select value={form.status} onValueChange={(status) => setForm({ ...form, status: status as StaffStatus })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">{t("staffStatuses.active")}</SelectItem><SelectItem value="suspended">{t("staffStatuses.suspended")}</SelectItem></SelectContent></Select></div><div className="sm:col-span-2"><Label className="mb-3 block">{t("fields.permissions")}</Label><div className="grid gap-2 sm:grid-cols-2">{staffPermissions.map((permission) => <label key={permission} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={form.permissions.includes(permission)} onChange={() => togglePermission(permission)} className="h-4 w-4" /><span className="text-sm font-bold text-slate-700">{t(`staffPermissions.${permission.replace(".", "_")}`)}</span></label>)}</div></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button><Button onClick={onSave} disabled={saving}>{saving ? t("saving") : t("save")}</Button></DialogFooter></DialogContent></Dialog>;
}

function TextField({ label, value, disabled, type, onChange }: { label: string; value: string; disabled?: boolean; type?: string; onChange: (value: string) => void }) {
  return <div><Label className="mb-2 block">{label}</Label><Input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></div>;
}
function NumberField({ label, value, disabled, allowNegative, onChange }: { label: string; value: number; disabled?: boolean; allowNegative?: boolean; onChange: (value: number) => void }) {
  return <div><Label className="mb-2 block">{label}</Label><Input type="number" value={value} disabled={disabled} min={allowNegative ? undefined : 0} step="0.01" onChange={(event) => onChange(Number(event.target.value))} /></div>;
}
function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-bold text-slate-500">{label}</span><span className="font-black text-slate-900">{value}</span></div>;
}
