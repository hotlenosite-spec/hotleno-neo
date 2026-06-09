"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ShieldUserIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
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
import { ContentState } from "@/components/shared/content-state";

type StaffRole =
  | "super_admin"
  | "admin"
  | "support"
  | "finance"
  | "sales"
  | "content_manager";
type StaffStatus = "active" | "suspended";

type StaffMember = {
  staffId: string;
  userId: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: string[];
  status: StaffStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
};

type StaffForm = {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  status: StaffStatus;
  permissions: string[];
};

const emptyForm: StaffForm = {
  name: "",
  email: "",
  password: "",
  role: "support",
  status: "active",
  permissions: [],
};

export default function AdminStaffPage() {
  const t = useTranslations("adminStaff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<Record<string, string[]>>({});
  const [actorRole, setActorRole] = useState<StaffRole>("admin");
  const [actorPermissions, setActorPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);

  const canManage =
    actorRole === "super_admin" || actorPermissions.includes("users.manage");

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await fetch("/api/admin/staff", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!response.ok) throw new Error("staff_fetch_failed");
      const data = await response.json();
      setStaff(Array.isArray(data.staff) ? data.staff : []);
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      setRoleDefaults(data.roleDefaults || {});
      setActorRole(data.actor?.role || "admin");
      setActorPermissions(data.actor?.permissions || []);
    } catch {
      setLoadError(true);
      toast.error(t("fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  const activeCount = useMemo(
    () => staff.filter((member) => member.status === "active").length,
    [staff],
  );
  const superAdminCount = useMemo(
    () => staff.filter((member) => member.role === "super_admin").length,
    [staff],
  );

  const openCreate = () => {
    const role: StaffRole = "support";
    setEditing(null);
    setForm({
      ...emptyForm,
      role,
      permissions: roleDefaults[role] || [],
    });
    setDialogOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      role: member.role,
      status: member.status,
      permissions: member.permissions,
    });
    setDialogOpen(true);
  };

  const togglePermission = (permission: string) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  };

  const changeRole = (role: StaffRole) => {
    setForm((current) => ({
      ...current,
      role,
      permissions: roleDefaults[role] || [],
    }));
  };

  const saveStaff = async () => {
    if (!form.name.trim() || !form.email.trim() || (!editing && !form.password)) {
      toast.error(t("requiredFields"));
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        editing
          ? `/api/admin/staff/${encodeURIComponent(editing.staffId)}`
          : "/api/admin/staff",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify(
            editing
              ? {
                  name: form.name,
                  role: form.role,
                  status: form.status,
                  permissions: form.permissions,
                }
              : form,
          ),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(t(`errors.${data.error || "save_failed"}`));
        return;
      }
      toast.success(t(editing ? "updated" : "created"));
      setDialogOpen(false);
      await fetchStaff();
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = (role: string) => t(`roles.${role}`);
  const permissionLabel = (permission: string) =>
    t(`permissions.${permission.replace(".", "_")}`);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-orange-100">
              {t("eyebrow")}
            </div>
            <h1 className="text-3xl font-black md:text-4xl">{t("title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              {t("description")}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric value={staff.length} label={t("total")} />
            <Metric value={activeCount} label={t("active")} />
            <Metric value={superAdminCount} label={t("superAdmins")} />
          </div>
        </div>
      </section>

      <Card className="rounded-[2rem] border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <CardTitle>{t("staffList")}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">{t("staffListDescription")}</p>
          </div>
          {canManage ? (
            <Button
              onClick={openCreate}
              className="bg-[#F97316] font-bold text-white hover:bg-[#EA580C]"
            >
              {t("addStaff")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-28 rounded-3xl" />
              ))}
            </div>
          ) : loadError ? (
            <ContentState
              type="error"
              title={t("loadErrorTitle")}
              description={t("loadErrorDescription")}
              action={
                <Button variant="outline" onClick={fetchStaff}>
                  {t("retry")}
                </Button>
              }
            />
          ) : staff.length === 0 ? (
            <ContentState
              type="empty"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                canManage ? <Button onClick={openCreate}>{t("addStaff")}</Button> : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {staff.map((member) => {
                const canEditMember =
                  canManage &&
                  (member.role !== "super_admin" || actorRole === "super_admin");
                return (
                  <div
                    key={member.staffId}
                    className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-orange-200 hover:bg-white hover:shadow-lg lg:flex-row lg:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                        <HugeiconsIcon icon={UserMultipleIcon} className="h-6 w-6" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-lg font-black text-slate-950">
                            {member.name}
                          </h2>
                          <Badge className="bg-slate-900 text-white hover:bg-slate-900">
                            {roleLabel(member.role)}
                          </Badge>
                          <Badge
                            className={
                              member.status === "active"
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                                : "bg-red-50 text-red-700 hover:bg-red-50"
                            }
                          >
                            {t(`statuses.${member.status}`)}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {member.email}
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-400">
                          {t("permissionCount", {
                            count: member.permissions.length,
                          })}
                          {" • "}
                          {t("lastLogin")}: {formatDate(member.lastLoginAt)}
                        </p>
                      </div>
                    </div>
                    {canEditMember ? (
                      <Button
                        variant="outline"
                        onClick={() => openEdit(member)}
                        className="border-orange-200 bg-white font-bold text-orange-700 hover:bg-orange-50"
                      >
                        <HugeiconsIcon icon={ShieldUserIcon} className="me-2 h-4 w-4" />
                        {t("edit")}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t(editing ? "editTitle" : "createTitle")}</DialogTitle>
            <DialogDescription>
              {t(editing ? "editDescription" : "createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("name")}>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label={t("email")}>
              <Input
                type="email"
                value={form.email}
                disabled={Boolean(editing)}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            {!editing ? (
              <Field label={t("temporaryPassword")}>
                <Input
                  type="password"
                  value={form.password}
                  minLength={10}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
              </Field>
            ) : null}
            <Field label={t("role")}>
              <Select value={form.role} onValueChange={(value) => changeRole(value as StaffRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles
                    .filter((role) => role !== "super_admin" || actorRole === "super_admin")
                    .map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabel(role)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("status")}>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({ ...form, status: value as StaffStatus })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("statuses.active")}</SelectItem>
                  <SelectItem value="suspended">{t("statuses.suspended")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <Label className="font-black">{t("permissionsTitle")}</Label>
                <p className="mt-1 text-xs text-slate-500">
                  {t("permissionsDescription")}
                </p>
              </div>
              <Badge variant="outline">
                {form.permissions.length}/{permissions.length}
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {permissions.map((permission) => (
                <label
                  key={permission}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span>{permissionLabel(permission)}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={saveStaff}
              disabled={saving}
              className="bg-[#F97316] text-white hover:bg-[#EA580C]"
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
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-200">{label}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
