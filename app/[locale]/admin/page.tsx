"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  UserMultipleIcon,
  Money01Icon,
  ChartIncreaseIcon,
  Building02Icon,
} from "@hugeicons/core-free-icons";
import { formatBookingStatus } from "@/lib/booking-status";

interface DashboardStats {
  totalBookings: number;
  totalUsers: number;
  totalRevenue: number;
  activeBookings: number;
  recentBookings: Array<{
    _id: string;
    bookingReference: string;
    hotelName: string;
    totalPrice: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
}

type DashboardIcon =
  | typeof Calendar01Icon
  | typeof UserMultipleIcon
  | typeof Money01Icon
  | typeof ChartIncreaseIcon
  | typeof Building02Icon;

const dashboardCopy = {
  en: {
    title: "Admin Dashboard",
    description: "A clean overview of Hotleno operations",
    totalBookings: "Total Bookings",
    activeBookings: "active bookings",
    revenue: "Revenue",
    fromSystemData: "from system data",
    activeHotels: "Active Hotels",
    notConnected: "Not connected to live data",
    conversionRate: "Conversion Rate",
    fromBookingsUsers: "from bookings and users",
    pendingPayments: "Pending Payments",
    activeUsers: "Active Users",
    alerts: "Alerts and required actions",
    noAlertData: "No alert data available",
    connectAlerts: "Connect alerts API later",
    noPaymentData: "No pending payment data",
    connectPayments: "Connect payments API later",
    noSupplierData: "No supplier API error data",
    connectSuppliers: "Connect supplier APIs later",
    regionDistribution: "Bookings by Region",
    bookingTrend: "Booking Trend",
    daily: "Daily",
    last30: "Last 30 days",
    bookingCount: "Booking count",
    recentBookings: "Recent Bookings",
    noBookings: "No real bookings yet",
    bookingRef: "Booking Ref",
    hotelDestination: "Hotel / Destination",
    amount: "Amount",
    status: "Status",
    supplierStatus: "Supplier and API Status",
    apiUnavailable: "API status unavailable",
    viewDetails: "View details",
    regions: ["Middle East", "Europe", "Asia", "Africa", "Americas"],
    chartPlaceholder: "Connect daily booking data to display the real chart",
    confirmed: "Confirmed",
    pendingPayment: "Pending payment",
    waitingSupplier: "Awaiting supplier",
  },
  ar: {
    title: "لوحة تحكم الأدمن",
    description: "نظرة تشغيلية نظيفة على أداء منصة Hotleno",
    totalBookings: "إجمالي الحجوزات",
    activeBookings: "حجوزات نشطة",
    revenue: "الإيرادات",
    fromSystemData: "من بيانات النظام",
    activeHotels: "الفنادق النشطة",
    notConnected: "غير مرتبط ببيانات حقيقية",
    conversionRate: "معدل التحويل",
    fromBookingsUsers: "من الحجوزات والمستخدمين",
    pendingPayments: "المدفوعات المعلقة",
    activeUsers: "المستخدمون النشطون",
    alerts: "التنبيهات والإجراءات المطلوبة",
    noAlertData: "لا توجد بيانات تنبيهات",
    connectAlerts: "اربط API التنبيهات لاحقاً",
    noPaymentData: "لا توجد بيانات مدفوعات معلقة",
    connectPayments: "اربط API المدفوعات لاحقاً",
    noSupplierData: "لا توجد بيانات أعطال للموردين",
    connectSuppliers: "اربط APIs الموردين لاحقاً",
    regionDistribution: "توزيع الحجوزات حسب المنطقة",
    bookingTrend: "اتجاه الحجوزات",
    daily: "يومي",
    last30: "آخر 30 يوم",
    bookingCount: "عدد الحجوزات",
    recentBookings: "آخر الحجوزات",
    noBookings: "لا توجد حجوزات حقيقية حتى الآن",
    bookingRef: "رقم الحجز",
    hotelDestination: "الفندق / الوجهة",
    amount: "المبلغ",
    status: "الحالة",
    supplierStatus: "حالة الموردين وواجهات API",
    apiUnavailable: "حالة API غير متاحة",
    viewDetails: "عرض التفاصيل",
    regions: ["الشرق الأوسط", "أوروبا", "آسيا", "أفريقيا", "الأمريكيتان"],
    chartPlaceholder: "اربط بيانات الحجوزات اليومية لعرض الرسم الحقيقي",
    confirmed: "مؤكد",
    pendingPayment: "قيد الدفع",
    waitingSupplier: "بانتظار المورد",
  },
};

export default function AdminDashboardPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const isAr = locale === "ar";
  const c = isAr ? dashboardCopy.ar : dashboardCopy.en;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "supplier_booking_confirmed":
        return (
          <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-50">
            {c.confirmed}
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 hover:bg-amber-50">
            {c.pendingPayment}
          </Badge>
        );
      case "payment_succeeded":
      case "supplier_booking_pending":
        return (
          <Badge className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 hover:bg-orange-50">
            {c.waitingSupplier}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-50">
            {t("cancelled")}
          </Badge>
        );
      case "supplier_booking_failed":
      case "refund_required":
        return (
          <Badge className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-50">
            {formatBookingStatus(status)}
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-100">
            {status}
          </Badge>
        );
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const conversionRate =
    stats?.totalBookings && stats?.totalUsers
      ? ((stats.totalBookings / stats.totalUsers) * 100).toFixed(1)
      : "0";

  const recentBookings = stats?.recentBookings || [];

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen space-y-5 bg-[#F8FAFC] text-[#0F172A]"
    >
      <section className={isAr ? "text-right" : "text-left"}>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">
          {c.title}
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {c.description}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <TopMetricCard
          title={c.totalBookings}
          value={(stats?.totalBookings || 0).toLocaleString(isAr ? "ar-SA" : "en-US")}
          description={`${stats?.activeBookings || 0} ${c.activeBookings}`}
          icon={Calendar01Icon}
          iconClass="bg-[#F97316] text-white"
          descriptionClass="text-emerald-600"
          isAr={isAr}
        />
        <TopMetricCard
          title={c.revenue}
          value={formatCurrency(stats?.totalRevenue || 0, "SAR")}
          description={c.fromSystemData}
          icon={Money01Icon}
          iconClass="bg-[#F97316] text-white"
          descriptionClass="text-emerald-600"
          isAr={isAr}
        />
        <TopMetricCard
          title={c.activeHotels}
          value="—"
          description={c.notConnected}
          icon={Building02Icon}
          iconClass="bg-orange-100 text-[#F97316]"
          descriptionClass="text-slate-400"
          isAr={isAr}
        />
        <TopMetricCard
          title={c.conversionRate}
          value={`${conversionRate}%`}
          description={c.fromBookingsUsers}
          icon={ChartIncreaseIcon}
          iconClass="bg-[#0F172A] text-white"
          descriptionClass="text-emerald-600"
          isAr={isAr}
        />
        <TopMetricCard
          title={c.pendingPayments}
          value="—"
          description={c.notConnected}
          icon={Money01Icon}
          iconClass="bg-[#F97316] text-white"
          descriptionClass="text-slate-400"
          isAr={isAr}
        />
        <TopMetricCard
          title={c.activeUsers}
          value={(stats?.totalUsers || 0).toLocaleString(isAr ? "ar-SA" : "en-US")}
          description={c.fromSystemData}
          icon={UserMultipleIcon}
          iconClass="bg-[#0F172A] text-white"
          descriptionClass="text-emerald-600"
          isAr={isAr}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.7fr_1.05fr_1.15fr]">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <h2 className="mb-4 text-base font-black text-slate-950">
              {c.alerts}
            </h2>
            <div className="space-y-3">
              <AlertRow title={c.noAlertData} description={c.connectAlerts} />
              <AlertRow title={c.noPaymentData} description={c.connectPayments} />
              <AlertRow title={c.noSupplierData} description={c.connectSuppliers} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <h2 className="mb-4 text-base font-black text-slate-950">
              {c.regionDistribution}
            </h2>
            <div className="grid gap-4 md:grid-cols-[1fr_150px]">
              <WorldMapPanel />
              <div className="space-y-4 pt-3 text-xs font-bold text-slate-500">
                {c.regions.map((region) => (
                  <RegionBar key={region} name={region} value="—" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-slate-950">
                {c.bookingTrend}
              </h2>
              <div className="flex gap-2">
                <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                  {c.daily}
                </button>
                <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                  {c.last30}
                </button>
              </div>
            </div>
            <BookingLineChart label={c.chartPlaceholder} />
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
              <span className="h-0.5 w-8 rounded-full bg-[#F97316]" />
              {c.bookingCount}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.14fr_0.86fr]">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-0">
            <h2 className="border-b border-slate-100 px-5 py-4 text-base font-black text-slate-950">
              {c.recentBookings}
            </h2>
            {recentBookings.length === 0 ? (
              <p className="py-12 text-center text-sm font-bold text-slate-400">
                {c.noBookings}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-black text-slate-500">
                      <th className="px-4 py-3">{c.bookingRef}</th>
                      <th className="px-4 py-3">{c.hotelDestination}</th>
                      <th className="px-4 py-3">{c.amount}</th>
                      <th className="px-4 py-3">{c.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.slice(0, 5).map((booking) => (
                      <tr
                        key={booking._id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-4 py-3 font-black text-[#F97316]">
                          {booking.bookingReference}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {booking.hotelName}
                        </td>
                        <td className="px-4 py-3 font-black text-slate-950">
                          {formatCurrency(booking.totalPrice, booking.currency)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(booking.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <h2 className="mb-4 text-base font-black text-slate-950">
              {c.supplierStatus}
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <SupplierApiCard name="Hotelbeds" copy={c} />
              <SupplierApiCard name="TBO" copy={c} />
              <SupplierApiCard name="Travellanda" copy={c} />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function TopMetricCard({
  title,
  value,
  description,
  icon,
  iconClass,
  descriptionClass,
  isAr,
}: {
  title: string;
  value: string;
  description: string;
  icon: DashboardIcon;
  iconClass: string;
  descriptionClass: string;
  isAr: boolean;
}) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconClass}`}>
            <HugeiconsIcon icon={icon} className="h-6 w-6" />
          </div>
          <div className={isAr ? "text-right" : "text-left"}>
            <p className="text-sm font-black text-slate-900">{title}</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {value}
            </p>
          </div>
        </div>
        <p className={`${isAr ? "text-right" : "text-left"} text-xs font-black ${descriptionClass}`}>
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function BookingLineChart({ label }: { label: string }) {
  return (
    <div className="relative h-[245px] w-full rounded-xl bg-white">
      <svg viewBox="0 0 620 360" className="h-full w-full overflow-visible" preserveAspectRatio="none">
        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={line}
            x1="0"
            x2="620"
            y1={line * 72 + 18}
            y2={line * 72 + 18}
            stroke="#e5eaf0"
            strokeDasharray="5 5"
            strokeWidth="1"
          />
        ))}
        <text x="310" y="180" textAnchor="middle" fontSize="14" fill="#94a3b8" fontWeight="700">
          {label}
        </text>
      </svg>
    </div>
  );
}

function RegionBar({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{name}</span>
      <span className="font-black text-slate-600">{value}</span>
    </div>
  );
}

function WorldMapPanel() {
  return (
    <div className="relative h-[230px] overflow-hidden rounded-xl bg-[#f7fbfd]">
      <svg viewBox="0 0 720 320" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <rect width="720" height="320" fill="#f7fbfd" />
        <path d="M88 112 C111 78 157 70 197 86 C236 102 250 127 234 151 C218 174 177 181 143 165 C105 147 65 143 88 112Z" fill="#d7e7ee" />
        <path d="M214 174 C238 164 264 185 263 214 C262 248 238 282 212 271 C190 262 190 232 200 210 C207 196 195 182 214 174Z" fill="#d7e7ee" />
        <path d="M352 86 C377 69 417 76 434 99 C449 119 434 140 407 139 C381 138 344 121 352 86Z" fill="#F97316" opacity="0.78" />
        <path d="M390 137 C425 130 456 154 458 190 C460 225 435 258 402 247 C371 237 356 199 367 166 C371 152 376 142 390 137Z" fill="#d7e7ee" />
        <path d="M440 93 C485 64 559 75 598 114 C636 152 612 203 554 196 C513 191 494 157 459 151 C429 145 410 113 440 93Z" fill="#d7e7ee" />
        <circle cx="404" cy="116" r="5.5" fill="#F97316" />
      </svg>
    </div>
  );
}

function AlertRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{description}</p>
    </div>
  );
}

function SupplierApiCard({
  name,
  copy,
}: {
  name: string;
  copy: typeof dashboardCopy.en;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-base font-black text-slate-950">{name}</p>
      <p className="mt-1 text-xs font-black text-slate-400">
        {copy.notConnected}
      </p>
      <p className="mt-4 text-xs font-bold text-slate-400">
        {copy.apiUnavailable}
      </p>
      <button className="mt-4 h-9 w-full rounded-xl border border-slate-200 bg-white text-xs font-black text-[#F97316]">
        {copy.viewDetails}
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 text-right">
      <Skeleton className="h-16 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
