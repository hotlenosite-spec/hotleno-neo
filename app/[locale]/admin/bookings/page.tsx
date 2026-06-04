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
  supplierBookingId?: string;
  supplierConfirmationNo?: string;
  supplierReference?: string;
  supplierTraceId?: string;
  supplierVoucherStatus?: string;
  supplierResponseStatus?: string;
  cancellationStatus?: string;
  hotelId?: number;
  hotelName: string;
  location: string;
  leadGuest: string;
  contactEmail: string;
  contactPhone?: string;
  totalPrice: number;
  currency: string;
  status: string;
  bookingStatus?: string;
  paymentStatus?: string;
  supplierStatus?: string;
  stripeSessionId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  failureReason?: string;
  originalTotal?: number;
  newTotal?: number;
  priceDifference?: number;
  refundDue?: number;
  amendments?: unknown[];
  paymentAdjustments?: Array<{
    _id?: string;
    amount?: number;
    currency?: string;
    status?: string;
    paymentUrl?: string;
  }>;
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
    childrenAges?: number[];
  }>;
  travelers?: Array<{
    title?: string;
    firstName?: string;
    lastName?: string;
    travelerType?: string;
    gender?: string;
    documentType?: string;
    documentNumber?: string;
    nationality?: string;
    dateOfBirth?: string;
    passportExpiryDate?: string;
    passportNumber?: string;
    nationalId?: string;
    phone?: string;
    email?: string;
  }>;
  checkInDate: string;
  checkOutDate: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  archivedReason?: string;
  archivedAt?: string;
  hiddenFromAdminMainList?: boolean;
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
  "payment_disabled_created",
  "payment_succeeded",
  "supplier_booking_not_started",
  "supplier_booking_processing",
  "supplier_booking_pending",
  "supplier_booking_failed",
  "manual_review_required",
  "refund_required",
  "refunded",
] as const;

const paymentStatuses = [
  "pending",
  "disabled",
  "not_required_for_test",
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

const manuallySelectableStatuses = BOOKING_STATUSES.filter(
  (status) => !["cancelled", "cancellation_failed", "cancellation_requested"].includes(status),
);

type AdminBookingDisplayStatus =
  | "all"
  | "confirmed"
  | "cancelled"
  | "booking_failed"
  | "cancel_failed"
  | "cancel_pending"
  | "review_required"
  | "internal_only"
  | "archive";

const displayStatusFilters: Array<{ value: AdminBookingDisplayStatus; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "confirmed", label: "المؤكدة" },
  { value: "cancelled", label: "الملغية" },
  { value: "booking_failed", label: "فشل الحجز" },
  { value: "cancel_failed", label: "فشل الإلغاء" },
  { value: "review_required", label: "تحتاج مراجعة" },
  { value: "archive", label: "الأرشيف / اختبارات TBO" },
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
  const [displayStatusFilter, setDisplayStatusFilter] = useState<AdminBookingDisplayStatus>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<BookingLogs | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isAmendmentDialogOpen, setIsAmendmentDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [amendmentSaving, setAmendmentSaving] = useState(false);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<{
    dryRun?: boolean;
    totalFound?: number;
    activeTboBookings?: number;
    archivedCount?: number;
    eligibleForArchive?: number;
    skippedActiveCount?: number;
    reviewRequiredCount?: number;
    affectedBookingRefs?: string[];
    summary?: {
      totalBookings?: number;
      confirmedBookings?: number;
      cancelledBookings?: number;
      failedBookings?: number;
      pendingSupplierCancellationBookings?: number;
      reviewRequiredBookings?: number;
      activeTboBookings?: number;
      activeTboBookingRefs?: string[];
    };
  } | null>(null);
  const [paymentLinkMessage, setPaymentLinkMessage] = useState("");
  const [amendmentForm, setAmendmentForm] = useState({
    checkInDate: "",
    checkOutDate: "",
    newTotal: "",
    notes: "",
    travelers: [] as NonNullable<Booking["travelers"]>,
    rooms: [] as NonNullable<Booking["rooms"]>,
  });

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    statusFilter,
    paymentStatusFilter,
    supplierStatusFilter,
    operationalFilter,
    displayStatusFilter,
  ]);

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
      if (displayStatusFilter === "archive") params.append("view", "archive");
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
    setDisplayStatusFilter("all");
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
    setPaymentLinkMessage("");
    setAmendmentForm({
      checkInDate: toInputDate(booking.checkInDate),
      checkOutDate: toInputDate(booking.checkOutDate),
      newTotal: String(booking.totalPrice || 0),
      notes: "",
      travelers: (booking.travelers || []).map((traveler) => ({ ...traveler })),
      rooms: (booking.rooms || []).map((room, index) => ({
        roomId: room.roomId || index + 1,
        roomName: room.roomName || `Room ${index + 1}`,
        adults: room.adults || 1,
        children: room.children || 0,
        childrenAges: room.childrenAges || [],
      })),
    });
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
    if (["cancelled", "cancellation_failed", "cancellation_requested"].includes(newStatus)) {
      toast.error("استخدم إجراء الإلغاء من المورد بدل تحديث الحالة يدويًا");
      return;
    }
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
      | "mark_refund_required",
  ) => {
    try {
      await patchBooking({ action });
      const messages = {
        retry_supplier_booking: "تمت جدولة محاولة الإعادة",
        mark_reviewed: "تم تعليم الحجز كمراجع",
        mark_refund_required: "تم تعليم الحجز للمراجعة اليدوية",
      };
      toast.success(messages[action]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errorOccurred"));
    }
  };

  const canCancelBooking = (booking?: Booking | null) => {
    if (!booking) return false;
    return booking.supplierStatus === "confirmed" && booking.cancellationStatus !== "cancelled";
  };

  const handleAdminCancelBooking = async () => {
    if (!selectedBooking || !canCancelBooking(selectedBooking)) return;
    const confirmed = window.prompt(
      "سيتم إرسال طلب إلغاء فعلي إلى المورد عند تفعيل الإلغاء. اكتب CONFIRM للتأكيد.",
    );
    if (confirmed !== "CONFIRM") return;

    try {
      setCancelLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId: selectedBooking._id,
          reason: adminNote || "Admin requested cancellation",
          source: "admin",
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        const supplierError =
          data?.booking?.metadata?.supplierCancelError || data?.error || data?.message;
        if (data?.booking) {
          refreshSelectedBooking(data.booking);
        }
        throw new Error(
          supplierError
            ? `تعذر إلغاء الحجز: ${supplierError}`
            : "تعذر إلغاء الحجز",
        );
      }

      if (data?.booking) {
        refreshSelectedBooking(data.booking);
      }
      if (selectedBooking._id) {
        fetchBookingLogs(selectedBooking._id);
      }
      fetchBookings();
      toast.success(data?.status === "cancelled" ? "تم إلغاء الحجز" : "تم تحديث طلب الإلغاء");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إلغاء الحجز");
    } finally {
      setCancelLoading(false);
    }
  };

  const runTboCleanup = async (confirm = false) => {
    if (confirm) {
      const approved = window.confirm(
        "سيتم أرشفة حجوزات اختبار TBO المنتهية فقط. لن يتم حذف أي حجز ولن يتم إرسال أي طلب للمورد. هل تريد المتابعة؟",
      );
      if (!approved) return;
    }

    try {
      setCleanupLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/tbo/cleanup-certification-tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirm }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تشغيل تنظيف حجوزات اختبار TBO");
      }

      setCleanupReport(data);
      if (confirm) {
        toast.success("تم أرشفة حجوزات اختبار TBO المؤهلة");
        setDisplayStatusFilter("all");
        fetchBookings();
      } else {
        toast.success("تم تجهيز تقرير التنظيف بدون أي تعديل");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تشغيل تنظيف حجوزات اختبار TBO",
      );
    } finally {
      setCleanupLoading(false);
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

  const updateTravelerField = (
    index: number,
    field: keyof NonNullable<Booking["travelers"]>[number],
    value: string,
  ) => {
    setAmendmentForm((current) => {
      const travelers = [...current.travelers];
      travelers[index] = { ...travelers[index], [field]: value };
      return { ...current, travelers };
    });
  };

  const handleSaveAmendment = async () => {
    if (!selectedBooking) return;
    const requiresSupplierAction = isSupplierConfirmedBooking(selectedBooking);
    const confirmed = window.confirm(
      requiresSupplierAction
        ? "هذا الحجز مؤكد عند المورد. سيتم حفظ طلب تعديل معلق ولن يتم تغيير الحجز النهائي الآن. هل تريد المتابعة؟"
        : "سيتم حفظ تعديل الحجز. هل تريد المتابعة؟",
    );
    if (!confirmed) return;
    try {
      setAmendmentSaving(true);
      await patchBooking({
        action: "amend_booking",
        checkInDate: amendmentForm.checkInDate,
        checkOutDate: amendmentForm.checkOutDate,
        travelers: amendmentForm.travelers,
        rooms: amendmentForm.rooms,
        originalTotal: selectedBooking?.totalPrice || 0,
        newTotal: Number(amendmentForm.newTotal || selectedBooking?.totalPrice || 0),
        notes: amendmentForm.notes,
      });
      setIsAmendmentDialogOpen(false);
      toast.success(requiresSupplierAction ? "تم حفظ طلب تعديل معلق لإجراء المورد" : "تم حفظ تعديل الحجز");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errorOccurred"));
    } finally {
      setAmendmentSaving(false);
    }
  };

  const handleCreatePaymentLink = async () => {
    if (!selectedBooking) return;
    if (!amendmentForm.notes.trim()) {
      toast.error("سبب تعديل السعر مطلوب قبل إنشاء رابط الدفع");
      return;
    }
    try {
      setPaymentLinkLoading(true);
      setPaymentLinkMessage("");
      const token = localStorage.getItem("token");
      const amount = selectedBooking.priceDifference && selectedBooking.priceDifference > 0
        ? selectedBooking.priceDifference
        : Number(amendmentForm.newTotal || 0) - (selectedBooking.totalPrice || 0);
      const response = await fetch(`/api/admin/bookings/${selectedBooking._id}/payment-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          currency: selectedBooking.currency,
          reason: amendmentForm.notes.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || t("errorOccurred"));
      setPaymentLinkMessage(data?.paymentUrl || data?.message || "تم تجهيز سجل فرق الدفع");
      fetchBookings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errorOccurred"));
    } finally {
      setPaymentLinkLoading(false);
    }
  };

  const updateRoomField = (
    index: number,
    field: "roomName" | "adults" | "children" | "childrenAges",
    value: string,
  ) => {
    setAmendmentForm((current) => {
      const rooms = [...current.rooms];
      const room = rooms[index] || { roomId: index + 1, roomName: `Room ${index + 1}`, adults: 1, children: 0, childrenAges: [] };
      rooms[index] = {
        ...room,
        [field]:
          field === "adults" || field === "children"
            ? Math.max(0, Number(value) || 0)
            : field === "childrenAges"
              ? value.split(",").map((age) => Number(age.trim())).filter((age) => Number.isFinite(age))
              : value,
      };
      return { ...current, rooms };
    });
  };

  const setRoomCount = (count: number) => {
    setAmendmentForm((current) => {
      const nextCount = Math.max(1, count);
      const rooms = Array.from({ length: nextCount }, (_, index) =>
        current.rooms[index] || {
          roomId: index + 1,
          roomName: `Room ${index + 1}`,
          adults: 1,
          children: 0,
          childrenAges: [],
        },
      );
      return { ...current, rooms };
    });
  };

  const getStatusBadge = (booking: Booking) => {
    const display = getAdminBookingDisplayStatus(booking);
    const toneClasses = {
      emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
      red: "bg-red-50 text-red-700 hover:bg-red-50",
      amber: "bg-amber-50 text-amber-700 hover:bg-amber-50",
      orange: "bg-orange-50 text-orange-700 hover:bg-orange-50",
      slate: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    }[display.tone];

    return (
      <Badge className={`rounded-full px-3 py-1 ${toneClasses}`}>
        {display.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const safeFormatDate = (value?: string | number | Date | null, pattern = "yyyy-MM-dd") => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return format(date, pattern);
  };

  const formatDate = (value?: string | number | Date | null) => {
    return safeFormatDate(value, "yyyy-MM-dd HH:mm");
  };

  const isSupplierConfirmedBooking = (booking?: Booking | null) =>
    Boolean(booking && (booking.supplierStatus === "confirmed" || booking.status === "supplier_booking_confirmed"));

  const hasFailedSupplierCancellation = (booking?: Booking | null) =>
    Boolean(booking && booking.supplierStatus === "confirmed" && booking.cancellationStatus === "failed");

  const normalizeTextValue = (value?: string | number | null) => {
    if (value === undefined || value === null) return "";
    const text = String(value).trim();
    if (!text || ["undefined", "null"].includes(text.toLowerCase())) return "";
    return text;
  };

  const hasPendingSupplierAction = (booking?: Booking | null) =>
    Boolean(
      booking?.amendments?.some((item) => {
        const amendment = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return amendment.status === "pending_supplier_action";
      }) ||
        booking?.metadata?.supplierSubmission === "pending_supplier_action" ||
        booking?.metadata?.supplierAmendmentSubmission === "pending_supplier_action",
    );

  const getAdminBookingDisplayStatus = (booking: Booking): {
    key: AdminBookingDisplayStatus;
    label: string;
    tone: "emerald" | "red" | "amber" | "slate" | "orange";
  } => {
    const status = String(booking.status || "").toLowerCase();
    const bookingStatus = String((booking as Booking & { bookingStatus?: string }).bookingStatus || "").toLowerCase();
    const supplierStatus = String(booking.supplierStatus || "").toLowerCase();
    const cancellationStatus = String(booking.cancellationStatus || "").toLowerCase();

    if (supplierStatus === "confirmed" && cancellationStatus === "failed") {
      return { key: "cancel_failed", label: "فشل إلغاء المورد", tone: "red" };
    }
    if (cancellationStatus === "cancelled" || supplierStatus === "cancelled") {
      return { key: "cancelled", label: "ملغي", tone: "slate" };
    }
    if (bookingStatus === "supplier_booking_failed" || status === "supplier_booking_failed" || supplierStatus === "failed") {
      return { key: "booking_failed", label: "فشل الحجز", tone: "red" };
    }
    if (cancellationStatus === "cancellation_requested" || cancellationStatus === "requested" || status === "cancellation_requested") {
      return { key: "cancel_pending", label: "بانتظار إلغاء المورد", tone: "amber" };
    }
    if (hasPendingSupplierAction(booking) || status === "manual_review_required" || status === "refund_required") {
      return { key: "review_required", label: "تحتاج مراجعة", tone: "orange" };
    }
    if (supplierStatus === "confirmed" || bookingStatus === "supplier_booking_confirmed" || status === "supplier_booking_confirmed" || status === "confirmed") {
      return { key: "confirmed", label: "مؤكد", tone: "emerald" };
    }
    if (
      status === "payment_disabled_created" ||
      status === "supplier_booking_not_started" ||
      supplierStatus === "not_started" ||
      booking.metadata?.supplierSubmission === "not_sent_to_supplier"
    ) {
      return { key: "internal_only", label: "داخلي فقط / لم يرسل للمورد", tone: "slate" };
    }

    return { key: "review_required", label: "تحتاج مراجعة", tone: "amber" };
  };

  const hasPendingSupplierAmendment = (booking?: Booking | null) =>
    Boolean(
      booking?.amendments?.some((item) => {
        const amendment = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return amendment.status === "pending_supplier_action";
      }),
    );

  const toInputDate = (value?: string | number | Date | null) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  };

  const renderDetail = (label: string, value?: string | number | null) => (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-2 break-words text-sm font-black text-slate-900">
        {normalizeTextValue(value) || "-"}
      </div>
    </div>
  );

  const formatAdminValue = (value?: string | number | null) => {
    if (value === undefined || value === null || value === "") return "-";
    if (typeof value === "number") return value;
    if (value === "undefined" || value.includes("undefined")) {
      const cleaned = value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part && part !== "undefined")
        .join(", ");
      return cleaned || "-";
    }

    const labels: Record<string, string> = {
      pending: "بانتظار",
      disabled: "معطل",
      not_required_for_test: "غير مطلوب للاختبار",
      paid: "مدفوع",
      succeeded: "ناجح",
      failed: "فشل",
      cancelled: "ملغي",
      refund_required: "استرداد مطلوب",
      refunded: "تم الاسترداد",
      not_started: "لم يبدأ",
      not_sent_to_supplier: "لم يرسل للمورد",
      internal_only: "داخلي فقط",
      payment_or_supplier_flow: "تدفق دفع أو مورد",
      confirmed: "مؤكد",
      success: "ناجح",
      error: "خطأ",
      timeout: "انتهت المهلة",
      skipped: "تم التخطي",
      pending_payment: "بانتظار الدفع",
      pending_additional_payment: "بانتظار دفع فرق السعر",
      payment_disabled_created: "داخلي فقط / لم يرسل للمورد",
      payment_succeeded: "تم الدفع",
      supplier_booking_not_started: "لم يرسل للمورد",
      supplier_booking_processing: "بانتظار المورد",
      supplier_booking_pending: "بانتظار المورد",
      supplier_booking_confirmed: "مؤكد",
      supplier_booking_failed: "فشل الحجز",
      cancellation_requested: "بانتظار إلغاء المورد",
      cancellation_failed: "فشل إلغاء المورد",
      manual_review_required: "يحتاج مراجعة",
      refund_due: "مبلغ مستحق للعميل",
      pending_supplier_action: "بانتظار إجراء المورد",
      pending_supplier_action_tbo_amendment_disabled: "بانتظار إجراء المورد",
    };

    return labels[value] || value;
  };

  const joinPresent = (...values: Array<string | number | null | undefined>) =>
    values
      .map((value) => normalizeTextValue(value))
      .filter(Boolean)
      .join(" | ");

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
  const displayedBookings = displayStatusFilter === "all" || displayStatusFilter === "archive"
    ? bookings
    : bookings.filter((booking) => getAdminBookingDisplayStatus(booking).key === displayStatusFilter);

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

          <div className="mb-5 flex flex-wrap gap-2">
            {displayStatusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setDisplayStatusFilter(filter.value);
                  setPage(1);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-black transition-colors ${
                  displayStatusFilter === filter.value
                    ? "border-[#F97316] bg-orange-50 text-orange-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mb-5 rounded-3xl border border-orange-100 bg-orange-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-950">
                  تنظيف حجوزات اختبار TBO
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-600">
                  Dry-run أولًا، ثم تأكيد الأرشفة الناعمة للحجوزات المنتهية فقط.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => runTboCleanup(false)}
                  disabled={cleanupLoading}
                  className="rounded-2xl border-orange-200 bg-white font-bold text-orange-700 hover:bg-orange-100"
                >
                  {cleanupLoading ? "جار الفحص..." : "تنظيف حجوزات اختبار TBO"}
                </Button>
                {cleanupReport?.dryRun ? (
                  <Button
                    type="button"
                    onClick={() => runTboCleanup(true)}
                    disabled={cleanupLoading}
                    className="rounded-2xl bg-[#071b33] font-bold text-white hover:bg-[#0a2a4f]"
                  >
                    تأكيد التنظيف
                  </Button>
                ) : null}
              </div>
            </div>

            {cleanupReport ? (
              <div className="mt-4 grid gap-2 text-xs font-bold text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                <div>حجوزات tbo.tester: {cleanupReport.totalFound ?? 0}</div>
                <div>مؤهلة للأرشفة: {cleanupReport.eligibleForArchive ?? 0}</div>
                <div>تمت أرشفتها: {cleanupReport.archivedCount ?? 0}</div>
                <div>نشطة عند TBO: {cleanupReport.activeTboBookings ?? 0}</div>
                <div>تم تخطيها كنشطة: {cleanupReport.skippedActiveCount ?? 0}</div>
                <div>تحتاج مراجعة: {cleanupReport.reviewRequiredCount ?? 0}</div>
                <div>إجمالي الحجوزات: {cleanupReport.summary?.totalBookings ?? 0}</div>
                <div>
                  بانتظار إلغاء المورد:{" "}
                  {cleanupReport.summary?.pendingSupplierCancellationBookings ?? 0}
                </div>
              </div>
            ) : null}
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
          ) : displayedBookings.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm font-medium text-slate-500">
              {t("noBookingsFound")}
            </p>
          ) : (
            <div className="space-y-4">
              {displayedBookings.map((booking) => (
                <div
                  key={booking._id}
                  className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5 lg:flex-row lg:items-center"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-black text-slate-950">
                        {booking.hotelName}
                      </span>
                      {getStatusBadge(booking)}
                      <Badge className="rounded-full bg-orange-50 px-3 py-1 text-orange-700 hover:bg-orange-50">
                        {formatAdminValue(booking.paymentStatus)}
                      </Badge>
                      <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
                        {formatAdminValue(booking.supplierStatus)}
                      </Badge>
                    </div>

                    <p className="text-sm font-medium text-slate-500">
                      {t("ref")}: {joinPresent(booking.bookingReference, booking.location)}
                    </p>

                    {booking.rooms?.[0]?.roomName && (
                      <p className="text-sm font-medium text-slate-500">
                        الغرفة: {booking.rooms[0].roomName}
                      </p>
                    )}

                    <p className="text-sm font-medium text-slate-500">
                      {t("guest")}: {booking.leadGuest} |{" "}
                      {booking.contactEmail || booking.userId?.email || "-"}
                    </p>

                    <p className="text-xs font-bold text-slate-400">
                      {safeFormatDate(booking.checkInDate)} -{" "}
                      {safeFormatDate(booking.checkOutDate)}
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
              {renderDetail("حالة الحجز", selectedBooking ? getAdminBookingDisplayStatus(selectedBooking).label : "-")}
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
                {renderDetail("الغرفة", selectedBooking?.rooms?.[0]?.roomName)}
                {renderDetail("الموقع", selectedBooking?.location)}
                {renderDetail("معرف الفندق", selectedBooking?.hotelId)}
                {renderDetail("السعر النهائي", selectedBooking ? formatCurrency(selectedBooking.totalPrice, selectedBooking.currency) : "-")}
                {renderDetail("تسجيل الدخول", safeFormatDate(selectedBooking?.checkInDate))}
                {renderDetail("تسجيل الخروج", safeFormatDate(selectedBooking?.checkOutDate))}
                {renderDetail("تاريخ الإنشاء", formatDate(selectedBooking?.createdAt))}
                {renderDetail("آخر تحديث", formatDate(selectedBooking?.updatedAt))}
              </div>
            </section>

            {selectedBooking?.travelers?.length ? (
              <section className="space-y-3">
                <h3 className="text-lg font-black text-slate-950">بيانات المسافرين</h3>
                <div className="space-y-3">
                  {selectedBooking.travelers.map((traveler, index) => (
                    <div key={index} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {renderDetail("اسم المسافر", [traveler.title, traveler.firstName, traveler.lastName].filter(Boolean).join(" "))}
                      {renderDetail("نوع الوثيقة", traveler.documentType)}
                      {renderDetail("رقم الوثيقة", traveler.documentNumber)}
                      {renderDetail("الجنسية", traveler.nationality)}
                      {renderDetail("تاريخ الميلاد", safeFormatDate(traveler.dateOfBirth))}
                      {renderDetail("تاريخ انتهاء الجواز", safeFormatDate(traveler.passportExpiryDate))}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-black text-slate-950">تعديلات الحجز</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAmendmentDialogOpen(true)}
                    className="rounded-2xl"
                  >
                    تعديل الحجز
                  </Button>
                  {canCancelBooking(selectedBooking) ? (
                    <Button
                      type="button"
                      onClick={handleAdminCancelBooking}
                      disabled={cancelLoading}
                      className="rounded-2xl bg-red-600 font-bold text-white hover:bg-red-700"
                    >
                      {cancelLoading
                        ? "جار الإلغاء..."
                        : hasFailedSupplierCancellation(selectedBooking)
                          ? "إعادة محاولة الإلغاء من المورد"
                          : "إلغاء من المورد"}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                {isSupplierConfirmedBooking(selectedBooking)
                  ? "الحجز مؤكد عند المورد. أي تغيير سيتم حفظه كطلب تعديل معلق ولا يغير الحجز النهائي مباشرة."
                  : "يمكن تعديل بيانات الحجز داخليًا قبل تأكيد المورد."}
              </div>
              {hasPendingSupplierAmendment(selectedBooking) ? (
                <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                  يوجد طلب تعديل بانتظار إجراء المورد
                </Badge>
              ) : null}
              {selectedBooking?.priceDifference !== undefined && selectedBooking.priceDifference < 0 && (
                <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                  مبلغ مستحق للعميل: {formatCurrency(Math.abs(selectedBooking.priceDifference), selectedBooking.currency)}
                </Badge>
              )}
              {paymentLinkMessage && (
                <p className="break-all rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
                  {paymentLinkMessage}
                </p>
              )}
            </section>

            <section className="hidden">
              <h3 className="text-lg font-black text-slate-950">تعديل داخلي للحجز</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">تسجيل الدخول</div>
                  <Input
                    type="date"
                    className="mt-2"
                    value={amendmentForm.checkInDate}
                    onChange={(event) => setAmendmentForm({ ...amendmentForm, checkInDate: event.target.value })}
                  />
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">تسجيل الخروج</div>
                  <Input
                    type="date"
                    className="mt-2"
                    value={amendmentForm.checkOutDate}
                    onChange={(event) => setAmendmentForm({ ...amendmentForm, checkOutDate: event.target.value })}
                  />
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">الإجمالي الجديد</div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    value={amendmentForm.newTotal}
                    onChange={(event) => setAmendmentForm({ ...amendmentForm, newTotal: event.target.value })}
                  />
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">فرق السعر</div>
                  <div className="mt-3 text-sm font-black text-slate-900">
                    {selectedBooking
                      ? formatCurrency(Number(amendmentForm.newTotal || 0) - selectedBooking.totalPrice, selectedBooking.currency)
                      : "-"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                {selectedBooking?.supplierStatus === "not_started"
                  ? "يمكن تعديل الطلب قبل إرساله للمورد"
                  : "هذا التعديل داخلي فقط ولم يتم إرساله إلى المورد"}
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-2 text-xs font-bold text-slate-500">عدد الغرف</div>
                  <Input
                    type="number"
                    min="1"
                    value={amendmentForm.rooms.length || 1}
                    onChange={(event) => setRoomCount(Number(event.target.value))}
                  />
                </div>
                {amendmentForm.rooms.map((room, index) => (
                  <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-3 text-sm font-black text-slate-900">الغرفة {index + 1}</div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <div className="mb-1 text-xs font-bold text-slate-500">اسم الغرفة</div>
                        <Input value={room.roomName || ""} onChange={(event) => updateRoomField(index, "roomName", event.target.value)} />
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-bold text-slate-500">البالغون</div>
                        <Input type="number" min="0" value={room.adults || 0} onChange={(event) => updateRoomField(index, "adults", event.target.value)} />
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-bold text-slate-500">الأطفال</div>
                        <Input type="number" min="0" value={room.children || 0} onChange={(event) => updateRoomField(index, "children", event.target.value)} />
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-bold text-slate-500">أعمار الأطفال</div>
                        <Input value={(room.childrenAges || []).join(",")} onChange={(event) => updateRoomField(index, "childrenAges", event.target.value)} placeholder="5,8" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {amendmentForm.travelers.map((traveler, index) => (
                  <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-3 text-sm font-black text-slate-900">
                      المسافر {index + 1}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {(["title", "firstName", "lastName", "gender", "dateOfBirth", "nationality", "documentType", "documentNumber", "passportNumber", "nationalId", "passportExpiryDate", "phone", "email"] as const).map((field) => (
                        <div key={field}>
                          <div className="mb-1 text-xs font-bold text-slate-500">{field}</div>
                          <Input
                            type={field === "dateOfBirth" || field === "passportExpiryDate" ? "date" : "text"}
                            value={String(traveler[field] || "")}
                            onChange={(event) => updateTravelerField(index, field, event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Textarea
                value={amendmentForm.notes}
                onChange={(event) => setAmendmentForm({ ...amendmentForm, notes: event.target.value })}
                placeholder="ملاحظات التعديل الداخلي..."
                className="rounded-2xl border-slate-200"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleSaveAmendment}
                  disabled={amendmentSaving}
                  className="rounded-2xl bg-[#071b33] font-bold text-white hover:bg-[#0a2a4f]"
                >
                  {amendmentSaving ? "جارٍ الحفظ..." : "حفظ التعديل الداخلي"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreatePaymentLink}
                  disabled={paymentLinkLoading || !selectedBooking || Number(amendmentForm.newTotal || 0) <= selectedBooking.totalPrice}
                  className="rounded-2xl"
                >
                  {paymentLinkLoading ? "جارٍ الإنشاء..." : "إنشاء رابط دفع الفرق"}
                </Button>
              </div>

              {selectedBooking?.priceDifference !== undefined && selectedBooking.priceDifference < 0 && (
                <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                  مبلغ مستحق للعميل: {formatCurrency(Math.abs(selectedBooking.priceDifference), selectedBooking.currency)}
                </Badge>
              )}
              {paymentLinkMessage && (
                <p className="break-all rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
                  {paymentLinkMessage}
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-black text-slate-950">معرفات المورد والدفع</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {renderDetail("معرف الحجز الداخلي", selectedBooking?._id)}
                {renderDetail("HOTLENO Reference", selectedBooking?.bookingReference)}
                {renderDetail("المورد", selectedBooking?.supplier)}
                {renderDetail("إرسال المورد", formatAdminValue(String(selectedBooking?.metadata?.supplierSubmission || "")))}
                {renderDetail("وضع الحجز", formatAdminValue(String(selectedBooking?.metadata?.bookingMode || "")))}
                {renderDetail("معرف فندق المورد (supplierHotelId)", selectedBooking?.supplierHotelId)}
                {renderDetail("مفتاح سعر المورد (supplierRateKey)", selectedBooking?.supplierRateKey)}
                {renderDetail("Supplier Booking ID", selectedBooking?.supplierBookingId)}
                {renderDetail("Confirmation No", selectedBooking?.supplierConfirmationNo)}
                {renderDetail("Supplier Reference", selectedBooking?.supplierReference || selectedBooking?.supplierBookingReference)}
                {renderDetail("Supplier Trace ID", selectedBooking?.supplierTraceId)}
                {renderDetail("Supplier Voucher Status", selectedBooking?.supplierVoucherStatus)}
                {renderDetail("Supplier Status", selectedBooking?.supplierResponseStatus || selectedBooking?.supplierStatus)}
                {renderDetail("حالة الإلغاء", formatAdminValue(String(selectedBooking?.cancellationStatus || "")))}
                {renderDetail("خطأ إلغاء المورد", String(selectedBooking?.metadata?.supplierCancelError || ""))}
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
                    {manuallySelectableStatuses.map((status) => (
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

      <Dialog open={isAmendmentDialogOpen} onOpenChange={setIsAmendmentDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-slate-200 sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-950">
              تعديل بيانات الحجز
            </DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              {isSupplierConfirmedBooking(selectedBooking)
                ? "سيتم حفظ التعديل كطلب بانتظار إجراء المورد، ولن يتم تغيير الحجز النهائي مباشرة."
                : "راجع القيم الحالية وعدّل الجزء المطلوب فقط."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">تسجيل الدخول</div>
                <Input
                  type="date"
                  className="mt-2"
                  value={amendmentForm.checkInDate}
                  onChange={(event) => setAmendmentForm({ ...amendmentForm, checkInDate: event.target.value })}
                />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">تسجيل الخروج</div>
                <Input
                  type="date"
                  className="mt-2"
                  value={amendmentForm.checkOutDate}
                  onChange={(event) => setAmendmentForm({ ...amendmentForm, checkOutDate: event.target.value })}
                />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">الإجمالي الجديد</div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2"
                  value={amendmentForm.newTotal}
                  onChange={(event) => setAmendmentForm({ ...amendmentForm, newTotal: event.target.value })}
                />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">فرق السعر</div>
                <div className="mt-3 text-sm font-black text-slate-900">
                  {selectedBooking
                    ? formatCurrency(Number(amendmentForm.newTotal || 0) - selectedBooking.totalPrice, selectedBooking.currency)
                    : "-"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 text-xs font-bold text-slate-500">عدد الغرف</div>
              <Input
                type="number"
                min="1"
                value={amendmentForm.rooms.length || 1}
                onChange={(event) => setRoomCount(Number(event.target.value))}
              />
            </div>

            {amendmentForm.rooms.map((room, index) => (
              <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-black text-slate-900">الغرفة {index + 1}</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-500">اسم الغرفة</div>
                    <Input value={room.roomName || ""} onChange={(event) => updateRoomField(index, "roomName", event.target.value)} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-500">البالغون</div>
                    <Input type="number" min="0" value={room.adults || 0} onChange={(event) => updateRoomField(index, "adults", event.target.value)} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-500">الأطفال</div>
                    <Input type="number" min="0" value={room.children || 0} onChange={(event) => updateRoomField(index, "children", event.target.value)} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-500">أعمار الأطفال</div>
                    <Input value={(room.childrenAges || []).join(",")} onChange={(event) => updateRoomField(index, "childrenAges", event.target.value)} placeholder="5,8" />
                  </div>
                </div>
              </div>
            ))}

            {amendmentForm.travelers.map((traveler, index) => (
              <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-black text-slate-900">المسافر {index + 1}</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(["title", "firstName", "lastName", "gender", "dateOfBirth", "nationality", "documentType", "documentNumber", "passportNumber", "nationalId", "passportExpiryDate", "phone", "email"] as const).map((field) => (
                    <div key={field}>
                      <div className="mb-1 text-xs font-bold text-slate-500">{field}</div>
                      <Input
                        type={field === "dateOfBirth" || field === "passportExpiryDate" ? "date" : "text"}
                        value={String(traveler[field] || "")}
                        onChange={(event) => updateTravelerField(index, field, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Textarea
              value={amendmentForm.notes}
              onChange={(event) => setAmendmentForm({ ...amendmentForm, notes: event.target.value })}
              placeholder="سبب التعديل أو ملاحظات الأدمن..."
              className="rounded-2xl border-slate-200"
            />

            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm font-bold text-slate-700">
              ملخص التغيير: السعر الحالي {selectedBooking ? formatCurrency(selectedBooking.totalPrice, selectedBooking.currency) : "-"}،
              السعر الجديد {selectedBooking ? formatCurrency(Number(amendmentForm.newTotal || selectedBooking.totalPrice || 0), selectedBooking.currency) : "-"}.
            </div>
          </div>

          <DialogFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsAmendmentDialogOpen(false)} className="rounded-2xl">
              إغلاق
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCreatePaymentLink}
              disabled={paymentLinkLoading || !selectedBooking || Number(amendmentForm.newTotal || 0) <= selectedBooking.totalPrice}
              className="rounded-2xl"
            >
              {paymentLinkLoading ? "جار الإنشاء..." : "إنشاء رابط دفع الفرق"}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAmendment}
              disabled={amendmentSaving}
              className="rounded-2xl bg-[#071b33] font-bold text-white hover:bg-[#0a2a4f]"
            >
              {amendmentSaving ? "جار الحفظ..." : "حفظ طلب التعديل"}
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
