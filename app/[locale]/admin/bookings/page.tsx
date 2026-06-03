"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  ViewIcon,
  RefreshIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";
import {
  BOOKING_STATUSES,
  formatBookingStatus,
} from "@/lib/booking-status";

interface AdminNote {
  note: string;
  createdAt: string;
  createdBy: string;
}

interface Booking {
  _id: string;
  bookingReference: string;
  yourReference?: string;
  travellandaReference?: string;
  supplier?: string;
  supplierHotelId?: string;
  supplierRateKey?: string;
  supplierBookingReference?: string;
  hotelId?: number;
  hotelName: string;
  location: string;
  leadGuest: string;
  contactEmail: string;
  contactPhone?: string;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus?: string;
  supplierStatus?: string;
  stripeSessionId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  failureReason?: string;
  metadata?: {
    reviewedAt?: string;
    adminNotes?: AdminNote[];
    [key: string]: unknown;
  };
  rooms?: Array<{
    roomId: number;
    roomName: string;
    adults: number;
    children: number;
  }>;
  checkInDate: string;
  checkOutDate: string;
  createdAt: string;
  updatedAt: string;
  userId?: {
    name?: string;
    email?: string;
  };
}

interface AdminLogEntry {
  _id: string;
  type: string;
  status: string;
  message?: string;
  error?: unknown;
  createdAt: string;
}

interface BookingLogs {
  bookingLogs: AdminLogEntry[];
  paymentLogs: AdminLogEntry[];
  supplierLogs: AdminLogEntry[];
}

const operationalStatuses = [
  "pending_payment",
  "payment_succeeded",
  "supplier_booking_processing",
  "supplier_booking_pending",
  "supplier_booking_failed",
  "manual_review_required",
  "refund_required",
  "refunded",
] as const;

const paymentStatuses = [
  "pending",
  "paid",
  "succeeded",
  "failed",
  "cancelled",
  "refund_required",
  "refunded",
];

const supplierStatuses = [
  "not_started",
  "pending",
  "confirmed",
  "failed",
  "cancelled",
];

export default function AdminBookingsPage() {
  const t = useTranslations("admin");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [operationalCounts, setOperationalCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [supplierStatusFilter, setSupplierStatusFilter] = useState("");
  const [operationalFilter, setOperationalFilter] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<BookingLogs | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, paymentStatusFilter, supplierStatusFilter, operationalFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (statusFilter) params.append("status", statusFilter);
      if (paymentStatusFilter) params.append("paymentStatus", paymentStatusFilter);
      if (supplierStatusFilter) params.append("supplierStatus", supplierStatusFilter);
      if (operationalFilter) params.append("operationalFilter", operationalFilter);
      if (search) params.append("search", search);

      const response = await fetch(`/api/admin/bookings?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings);
        setOperationalCounts(data.operationalCounts || {});
        setTotalPages(data.pagination.pages);
      } else {
        toast.error(t("failedToFetchBookings"));
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      toast.error(t("failedToFetchBookings"));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchBookings();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPaymentStatusFilter("");
    setSupplierStatusFilter("");
    setOperationalFilter("");
    setPage(1);
  };

  const fetchBookingLogs = async (bookingId: string) => {
    try {
      setLogsLoading(true);
      setSelectedLogs(null);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/bookings/${bookingId}/logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedLogs(data.logs);
      } else {
        toast.error("فشل جلب سجلات الحجز");
      }
    } catch (_error) {
      toast.error(t("errorOccurred"));
    } finally {
      setLogsLoading(false);
    }
  };

  const openBookingDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setNewStatus(booking.status);
    setAdminNote("");
    setIsUpdateDialogOpen(true);
    fetchBookingLogs(booking._id);
  };

  const refreshSelectedBooking = (updatedBooking: Booking) => {
    setSelectedBooking(updatedBooking);
    setNewStatus(updatedBooking.status);
    setBookings((current) =>
      current.map((booking) =>
        booking._id === updatedBooking._id ? updatedBooking : booking,
      ),
    );
  };

  const patchBooking = async (body: Record<string, unknown>) => {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bookingId: selectedBooking?._id,
        ...body,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || t("errorOccurred"));
    }

    if (data?.booking) {
      refreshSelectedBooking(data.booking);
    }

    if (selectedBooking?._id) {
      fetchBookingLogs(selectedBooking._id);
    }

    fetchBookings();
    return data;
  };

  const handleStatusUpdate = async () => {
    try {
      await patchBooking({ status: newStatus });
      toast.success(t("statusUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failedToUpdateStatus"));
    }
  };

  const handleBookingAction = async (
    action:
      | "retry_supplier_booking"
      | "mark_reviewed"
      | "mark_refund_required"
      | "mark_cancelled",
  ) => {
    try {
      await patchBooking({ action });
      const messages = {
        retry_supplier_booking: "تمت جدولة محاولة الإعادة",
        mark_reviewed: "تم تعليم الحجز كمراجع",
        mark_refund_required: "تم تعليم الحجز للمراجعة اليدوية",
        mark_cancelled: "تم تعليم الحجز كملغي",
      };
      toast.success(messages[action]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errorOccurred"));
    }
  };

  const handleAddAdminNote = async () => {
    try {
      await patchBooking({ action: "add_admin_note", note: adminNote });
      setAdminNote("");
      toast.success("تمت إضافة ملاحظة الأدمن");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errorOccurred"));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "supplier_booking_confirmed":
        return (
          <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
            {formatBookingStatus(status)}
          </Badge>
        );
      case "pending_payment":
      case "payment_succeeded":
      case "supplier_booking_processing":
      case "supplier_booking_pending":
        return (
          <Badge className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50">
            {formatBookingStatus(status)}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="rounded-full bg-red-50 px-3 py-1 text-red-700 hover:bg-red-50">
            {t("cancelled")}
          </Badge>
        );
      case "supplier_booking_failed":
      case "manual_review_required":
      case "refund_required":
      case "refunded":
        return (
          <Badge className="rounded-full bg-red-50 px-3 py-1 text-red-700 hover:bg-red-50">
            {formatBookingStatus(status)}
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
            {status}
          </Badge>
        );
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    return format(new Date(value), "yyyy-MM-dd HH:mm");
  };

  const renderDetail = (label: string, value?: string | number | null) => (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-2 break-words text-sm font-black text-slate-900">
        {value === undefined || value === null || value === "" ? "-" : value}
      </div>
    </div>
  );

  const formatAdminValue = (value?: string | number | null) => {
    if (value === undefined || value === null || value === "") return "-";
    if (typeof value === "number") return value;

    const labels: Record<string, string> = {
      pending: "بانتظار",
      paid: "مدفوع",
      succeeded: "ناجح",
      failed: "فشل",
      cancelled: "ملغي",
      refund_required: "استرداد مطلوب",
      refunded: "تم الاسترداد",
      not_started: "لم يبدأ",
      confirmed: "مؤكد",
      success: "ناجح",
      error: "خطأ",
      timeout: "انتهت المهلة",
      skipped: "تم التخطي",
    };

    return labels[value] || value;
  };

  const renderLogList = (title: string, logs: AdminLogEntry[]) => (
    <div className="space-y-3">
      <h4 className="font-black text-slate-950">{title}</h4>
      {logs.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          لا توجد سجلات بعد
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log._id} className="rounded-2xl border border-slate-100 bg-white p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-slate-900">{log.type}</span>
                <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
                  {formatAdminValue(log.status)}
                </Badge>
              </div>
              {log.message && (
                <p className="mt-2 text-slate-500">{log.message}</p>
              )}
              {Boolean(log.error) && (
                <pre className="mt-3 max-h-24 overflow-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-100">
                  {JSON.stringify(log.error, null, 2)}
                </pre>
              )}
              <p className="mt-2 text-xs text-slate-400">
                {formatDate(log.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const metadataEntries = selectedBooking?.metadata
    ? Object.entries(selectedBooking.metadata).filter(
        ([key]) => key !== "adminNotes",
      )
    : [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#f4d58d]">
              إدارة حجوزات HOTLENO
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {t("bookings")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              {t("manageAllBookings")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HeroMiniCard title="الصفحة" value={page.toString()} />
            <HeroMiniCard title="عدد النتائج" value={bookings.length.toString()} />
            <HeroMiniCard title="عدد الصفحات" value={totalPages.toString()} />
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {operationalStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setOperationalFilter("");
                  setPage(1);
                }}
                className={`rounded-3xl border p-4 text-right transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 ${
                  statusFilter === status
                    ? "border-[#F97316] bg-orange-50"
                    : "border-slate-100 bg-slate-50 hover:bg-white"
                }`}
              >
                <div className="text-xs font-bold text-slate-500">
                  {formatBookingStatus(status)}
                </div>
                <div className="mt-2 text-3xl font-black text-slate-950">
                  {operationalCounts[status] || 0}
                </div>
              </button>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                />
                <Input
                  placeholder="ابحث بالمرجع أو بريد العميل أو النزيل أو الفندق..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSearch()}
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
              value={statusFilter || "all"}
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value);
                setOperationalFilter("");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
                <SelectValue placeholder={t("filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                {BOOKING_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatBookingStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={paymentStatusFilter || "all"}
              onValueChange={(value) => {
                setPaymentStatusFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
                <SelectValue placeholder="حالة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المدفوعات</SelectItem>
                {paymentStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatAdminValue(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={supplierStatusFilter || "all"}
              onValueChange={(value) => {
                setSupplierStatusFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
                <SelectValue placeholder="حالة المورد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموردين</SelectItem>
                {supplierStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatAdminValue(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={operationalFilter || "all"}
              onValueChange={(value) => {
                setOperationalFilter(value === "all" ? "" : value);
                setStatusFilter("");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
                <SelectValue placeholder="يحتاج متابعة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات التشغيلية</SelectItem>
                <SelectItem value="refund_required">مراجعة يدوية / استرداد مطلوب</SelectItem>
                <SelectItem value="supplier_booking_failed">فشل المورد</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={clearFilters}
              className="h-12 rounded-2xl border-slate-200 px-5 font-bold"
            >
              مسح
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-black text-slate-950">
            {t("allBookings")}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 rounded-3xl" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm font-medium text-slate-500">
              {t("noBookingsFound")}
            </p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking._id}
                  className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5 lg:flex-row lg:items-center"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-black text-slate-950">
                        {booking.hotelName}
                      </span>
                      {getStatusBadge(booking.status)}
                      <Badge className="rounded-full bg-orange-50 px-3 py-1 text-orange-700 hover:bg-orange-50">
                        {formatAdminValue(booking.paymentStatus)}
                      </Badge>
                      <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
                        {formatAdminValue(booking.supplierStatus)}
                      </Badge>
                    </div>

                    <p className="text-sm font-medium text-slate-500">
                      {t("ref")}: {booking.bookingReference} | {booking.location}
                    </p>

                    <p className="text-sm font-medium text-slate-500">
                      {t("guest")}: {booking.leadGuest} |{" "}
                      {booking.contactEmail || booking.userId?.email || "-"}
                    </p>

                    <p className="text-xs font-bold text-slate-400">
                      {format(new Date(booking.checkInDate), "yyyy-MM-dd")} -{" "}
                      {format(new Date(booking.checkOutDate), "yyyy-MM-dd")}
                    </p>
                  </div>

                  <div className="space-y-3 text-left">
                    <p className="text-xl font-black text-slate-950">
                      {formatCurrency(booking.totalPrice, booking.currency)}
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBookingDialog(booking)}
                      className="rounded-2xl border-slate-200 font-bold"
                    >
                      <HugeiconsIcon icon={ViewIcon} className="ml-1 h-4 w-4" />
                      التفاصيل
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="rounded-2xl"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-slate-200 sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-950">
              التفاصيل التشغيلية للحجز
            </DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              {selectedBooking?.bookingReference}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {renderDetail("حالة الحجز", selectedBooking?.status ? formatBookingStatus(selectedBooking.status) : "-")}
              {renderDetail("حالة الدفع", formatAdminValue(selectedBooking?.paymentStatus))}
              {renderDetail("حالة المورد", formatAdminValue(selectedBooking?.supplierStatus))}
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-slate-950">العميل</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {renderDetail("النزيل الرئيسي", selectedBooking?.leadGuest)}
                {renderDetail("بريد التواصل", selectedBooking?.contactEmail || selectedBooking?.userId?.email)}
                {renderDetail("هاتف التواصل", selectedBooking?.contactPhone)}
                {renderDetail("اسم الحساب", selectedBooking?.userId?.name)}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-slate-950">الفندق والسعر</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {renderDetail("الفندق", selectedBooking?.hotelName)}
                {renderDetail("الموقع", selectedBooking?.location)}
                {renderDetail("معرف الفندق", selectedBooking?.hotelId)}
                {renderDetail("السعر النهائي", selectedBooking ? formatCurrency(selectedBooking.totalPrice, selectedBooking.currency) : "-")}
                {renderDetail("تسجيل الدخول", selectedBooking?.checkInDate ? format(new Date(selectedBooking.checkInDate), "yyyy-MM-dd") : "-")}
                {renderDetail("تسجيل الخروج", selectedBooking?.checkOutDate ? format(new Date(selectedBooking.checkOutDate), "yyyy-MM-dd") : "-")}
                {renderDetail("تاريخ الإنشاء", formatDate(selectedBooking?.createdAt))}
                {renderDetail("آخر تحديث", formatDate(selectedBooking?.updatedAt))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-slate-950">معرفات المورد والدفع</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {renderDetail("معرف الحجز الداخلي", selectedBooking?._id)}
                {renderDetail("المرجع الداخلي", selectedBooking?.bookingReference)}
                {renderDetail("المورد", selectedBooking?.supplier)}
                {renderDetail("معرف فندق المورد (supplierHotelId)", selectedBooking?.supplierHotelId)}
                {renderDetail("مفتاح سعر المورد (supplierRateKey)", selectedBooking?.supplierRateKey)}
                {renderDetail("مرجع حجز المورد (supplierBookingReference)", selectedBooking?.supplierBookingReference)}
                {renderDetail("معرف جلسة Stripe", selectedBooking?.stripeSessionId || selectedBooking?.stripeCheckoutSessionId)}
                {renderDetail("معرف عملية دفع Stripe", selectedBooking?.stripePaymentIntentId)}
                {renderDetail("سبب الفشل", selectedBooking?.failureReason)}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-slate-950">إجراءات التشغيل</h3>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => handleBookingAction("mark_reviewed")} className="rounded-2xl">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="ml-2 h-4 w-4" />
                  تعليم كمراجع
                </Button>

                <Button type="button" size="sm" variant="outline" onClick={() => handleBookingAction("mark_refund_required")} className="rounded-2xl">
                  تعليم للمراجعة / فحص الاسترداد
                </Button>

                <Button type="button" size="sm" variant="outline" onClick={() => handleBookingAction("mark_cancelled")} className="rounded-2xl">
                  تعليم كملغي
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleBookingAction("retry_supplier_booking")}
                  disabled={
                    selectedBooking
                      ? !["supplier_booking_failed", "manual_review_required", "refund_required"].includes(selectedBooking.status)
                      : true
                  }
                  className="rounded-2xl"
                >
                  <HugeiconsIcon icon={RefreshIcon} className="ml-2 h-4 w-4" />
                  إعادة محاولة حجز المورد
                </Button>
              </div>

              {selectedBooking?.metadata?.reviewedAt && (
                <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
                  تمت المراجعة {formatDate(selectedBooking.metadata.reviewedAt)}
                </Badge>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-slate-950">ملاحظات الأدمن</h3>

              <div className="space-y-2">
                {selectedBooking?.metadata?.adminNotes?.length ? (
                  selectedBooking.metadata.adminNotes.map((note, index) => (
                    <div key={`${note.createdAt}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                      <p className="font-medium text-slate-700">{note.note}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(note.createdAt)} | {note.createdBy}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    لا توجد ملاحظات أدمن بعد
                  </p>
                )}
              </div>

              <Textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="أضف ملاحظة أدمن داخلية..."
                className="rounded-2xl border-slate-200"
              />

              <Button
                size="sm"
                onClick={handleAddAdminNote}
                disabled={!adminNote.trim()}
                className="rounded-2xl bg-[#071b33] font-bold text-white hover:bg-[#0a2a4f]"
              >
                إضافة ملاحظة أدمن
              </Button>
            </section>

            {metadataEntries.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-950">البيانات الوصفية</h3>
                <pre className="max-h-56 overflow-auto rounded-2xl border border-slate-100 bg-slate-950 p-4 text-xs text-slate-100">
                  {JSON.stringify(Object.fromEntries(metadataEntries), null, 2)}
                </pre>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-lg font-black text-slate-950">تحديث الحالة يدويًا</h3>

              <div className="flex gap-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="rounded-2xl border-slate-200">
                    <SelectValue placeholder={t("selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKING_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatBookingStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleStatusUpdate}
                  className="rounded-2xl bg-[#F97316] font-bold text-white hover:bg-[#ea580c]"
                >
                  {t("update")}
                </Button>
              </div>
            </section>

            <section className="space-y-5">
              <h3 className="text-lg font-black text-slate-950">سجلات الحجز</h3>

              {logsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
              ) : selectedLogs ? (
                <>
                  {renderLogList("الحجز", selectedLogs.bookingLogs)}
                  {renderLogList("الدفع", selectedLogs.paymentLogs)}
                  {renderLogList("المورد", selectedLogs.supplierLogs)}
                </>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  السجلات غير متاحة
                </p>
              )}
            </section>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUpdateDialogOpen(false)}
              className="rounded-2xl"
            >
              {t("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeroMiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-300">{title}</p>
    </div>
  );
}
