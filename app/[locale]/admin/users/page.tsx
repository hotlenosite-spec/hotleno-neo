"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ShieldUserIcon,
  Calendar01Icon,
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  supplierScope?: string;
  accountType?: string;
  nationality?: string;
  birthDate?: string;
  nationalId?: string;
  passportNumber?: string;
  passportExpiryDate?: string;
  phone?: string;
  agencyRole?: string;
  hotelRole?: string;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  bookingCount: number;
}

const userRoles = [
  "customer",
  "agency_owner",
  "agency_manager",
  "agency_agent",
  "agency_accountant",
  "hotel_owner",
  "hotel_manager",
  "hotel_staff",
  "admin",
];

const accountTypes = ["b2c", "b2b", "hotel", "admin", "supplier_test"];
const supplierScopes = ["", "tbo", "hotelbeds", "travellanda", "mock"];

export default function AdminUsersPage() {
  const t = useTranslations("admin");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    supplierScope: "",
    nationality: "",
    dateOfBirth: "",
    nationalId: "",
    passportNumber: "",
    passportExpiryDate: "",
    accountType: "b2c",
    isActive: true,
  });

  useEffect(() => {
    console.log("Users page mounted, fetching users...");
    const token = localStorage.getItem("token");
    console.log("Token exists:", !!token);
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error(t("notAuthenticated"));
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (roleFilter) params.append("role", roleFilter);
      if (search) params.append("search", search);

      console.log("Fetching users with params:", params.toString());

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Users data:", data);
        setUsers(data.users || []);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", response.status, errorData);
        if (response.status === 403) {
          toast.error(t("adminAccessRequired") || "Admin access required");
        } else {
          toast.error(errorData.error || t("failedToFetchUsers"));
        }
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error(t("failedToFetchUsers"));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "customer",
      supplierScope: user.supplierScope || "",
      nationality: user.nationality || "",
      dateOfBirth: toInputDate(user.birthDate),
      nationalId: user.nationalId || "",
      passportNumber: user.passportNumber || "",
      passportExpiryDate: toInputDate(user.passportExpiryDate),
      accountType: user.accountType || "b2c",
      isActive: user.isActive !== false,
    });
    setIsRoleDialogOpen(true);
  };

  const handleUserUpdate = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUser?._id,
          ...editForm,
          role: editForm.role || newRole,
          supplierScope: editForm.supplierScope || null,
        }),
      });

      if (response.ok) {
        toast.success(t("userUpdated"));
        setIsRoleDialogOpen(false);
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || t("failedToUpdateRole"));
      }
    } catch (_error) {
      toast.error(t("errorOccurred"));
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="rounded-full bg-[#071b33] px-3 py-1 text-[#d7b46a] hover:bg-[#071b33]">
            {t("admin")}
          </Badge>
        );
      case "customer":
      case "user":
        return (
          <Badge className="rounded-full bg-orange-50 px-3 py-1 text-orange-700 hover:bg-orange-50">
            {role}
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
            {role}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#f4d58d]">
              HOTLENO Users Control
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {t("users")}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              {t("manageAllUsers")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HeroMiniCard title="Users" value={users.length.toString()} />
            <HeroMiniCard title="Page" value={page.toString()} />
            <HeroMiniCard title="Pages" value={totalPages.toString()} />
          </div>
        </div>
      </section>

      {/* Filters */}
      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                />
                <Input
                  placeholder={t("searchUsers")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-12 font-medium"
                />
              </div>

              <Button
                onClick={handleSearch}
                className="h-12 rounded-2xl bg-[#071b33] px-4 text-white hover:bg-[#0a2a4f]"
              >
                <HugeiconsIcon icon={Search01Icon} className="h-4 w-4" />
              </Button>
            </div>

            <Select
              value={roleFilter || "all"}
              onValueChange={(value) =>
                setRoleFilter(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50 lg:w-[240px]">
                <SelectValue placeholder={t("filterByRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allRoles")}</SelectItem>
                {userRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-black text-slate-950">
            {t("allUsers")}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 rounded-3xl" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm font-medium text-slate-500">
              {t("noUsersFound")}
            </p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5 lg:flex-row lg:items-center"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 border-4 border-white shadow-sm">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-[#071b33] text-sm font-black text-[#d7b46a]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-slate-950">
                          {user.name}
                        </span>
                        {getRoleBadge(user.role)}
                      </div>

                      <p className="text-sm font-medium text-slate-500">
                        {user.email}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                          {user.accountType || "b2c"}
                        </span>

                        {user.agencyRole && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                            {user.agencyRole}
                          </span>
                        )}

                        {user.hotelRole && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                        {user.hotelRole}
                          </span>
                        )}
                        {user.supplierScope && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                            {user.supplierScope}
                          </span>
                        )}

                        {user.isActive === false && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                            inactive
                          </span>
                        )}
                      </div>

                      <p className="flex items-center gap-1 text-xs font-bold text-slate-400">
                        <HugeiconsIcon icon={Calendar01Icon} className="h-3 w-3" />
                        {t("joined")}:{" "}
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-left">
                    <p className="flex items-center justify-end gap-1 text-sm font-bold text-slate-500">
                      <HugeiconsIcon icon={Calendar01Icon} className="h-4 w-4" />
                      {user.bookingCount} {t("bookings")}
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        openEditDialog(user);
                      }}
                      className="rounded-2xl border-slate-200 font-bold"
                    >
                      <HugeiconsIcon icon={ShieldUserIcon} className="ml-1 h-4 w-4" />
                      {t("edit")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-2xl"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
              </Button>

              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                {t("page")} {page} {t("of")} {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-2xl"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-slate-200 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-950">
              {t("editUser")}
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 md:grid-cols-2">
            <AdminField label={t("name")} value={editForm.name} onChange={(value) => setEditForm({ ...editForm, name: value })} />
            <AdminField label="Email" value={editForm.email} onChange={(value) => setEditForm({ ...editForm, email: value })} />
            <AdminField label={t("phone")} value={editForm.phone} onChange={(value) => setEditForm({ ...editForm, phone: value })} />
            <AdminSelect label={t("role")} value={editForm.role} values={userRoles} onChange={(value) => setEditForm({ ...editForm, role: value })} />
            <AdminSelect label="supplierScope" value={editForm.supplierScope} values={supplierScopes} onChange={(value) => setEditForm({ ...editForm, supplierScope: value })} />
            <AdminSelect label="accountType" value={editForm.accountType} values={accountTypes} onChange={(value) => setEditForm({ ...editForm, accountType: value })} />
            <AdminSelect label={t("status")} value={editForm.isActive ? "active" : "inactive"} values={["active", "inactive"]} onChange={(value) => setEditForm({ ...editForm, isActive: value === "active" })} />
            <AdminField label={t("nationality")} value={editForm.nationality} onChange={(value) => setEditForm({ ...editForm, nationality: value })} />
            <AdminField label="dateOfBirth" type="date" value={editForm.dateOfBirth} onChange={(value) => setEditForm({ ...editForm, dateOfBirth: value })} />
            <AdminField label={t("nationalId")} value={editForm.nationalId} onChange={(value) => setEditForm({ ...editForm, nationalId: value })} />
            <AdminField label={t("passportNumber")} value={editForm.passportNumber} onChange={(value) => setEditForm({ ...editForm, passportNumber: value })} />
            <AdminField label={t("passportExpiryDate")} type="date" value={editForm.passportExpiryDate} onChange={(value) => setEditForm({ ...editForm, passportExpiryDate: value })} />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
              className="rounded-2xl"
            >
              {t("cancel")}
            </Button>

            <Button
              onClick={handleUserUpdate}
              className="rounded-2xl bg-[#071b33] font-bold text-white hover:bg-[#0a2a4f]"
            >
              {t("update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} type={type} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function AdminSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next)}>
        <SelectTrigger className="h-10 rounded-2xl border-slate-200 bg-slate-50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {values.map((item) => (
            <SelectItem key={item || "none"} value={item || "none"}>
              {item || "-"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function toInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function HeroMiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-300">{title}</p>
    </div>
  );
}
