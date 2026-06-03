"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isDevPreviewAllPagesEnabled,
  warnDevPreviewAllPagesEnabled,
} from "@/lib/security/dev-flags";

type PageLink = {
  title: string;
  path: string;
  note?: string;
};

type PageGroup = {
  title: string;
  description: string;
  pages: PageLink[];
};

const pageGroups: PageGroup[] = [
  {
    title: "صفحات العميل",
    description: "الصفحات العامة وتجربة البحث والاستكشاف.",
    pages: [
      { title: "الرئيسية", path: "/" },
      { title: "الفنادق", path: "/hotels" },
      { title: "نتائج البحث", path: "/results", note: "قد تعرض حالة فارغة بدون بحث محفوظ." },
      { title: "تفاصيل فندق", path: "/hotel/preview-hotel", note: "مسار ديناميكي يحتاج معرف فندق صالح للبيانات الحقيقية." },
      { title: "الخدمات", path: "/services" },
      { title: "الرحلات", path: "/flights" },
      { title: "النقل من وإلى المطار", path: "/transfers", note: "خدمة نقل فقط قيد التجهيز وليست طيرانًا." },
      { title: "مخطط الرحلة الذكي", path: "/smart-trip-planner" },
      { title: "مراجعة حزمة رحلة", path: "/checkout/trip-package", note: "يعرض حالة فارغة بدون مسودة محفوظة." },
      { title: "المدونة", path: "/blog" },
      { title: "مقال مدونة", path: "/blog/preview-post", note: "مسار ديناميكي يحتاج slug موجود." },
      { title: "الدعم", path: "/support" },
      { title: "تذكرة دعم", path: "/support/tickets/preview-ticket", note: "مسار ديناميكي يحتاج معرف تذكرة صالح." },
      { title: "تسجيل الدخول", path: "/login" },
      { title: "إنشاء حساب", path: "/sign-up" },
      { title: "الخصوصية", path: "/privacy" },
      { title: "الشروط", path: "/terms" },
    ],
  },
  {
    title: "صفحات الحجز",
    description: "مراحل الحجز التي قد تحتاج بيانات محفوظة محليًا من تدفق البحث.",
    pages: [
      { title: "مراجعة الحجز", path: "/booking/review", note: "قد يعيد للرئيسية بدون hotelSearch وselectedOption." },
      { title: "الدفع/إكمال الحجز", path: "/booking/checkout", note: "معاينة المطور تعرض حالة فارغة بدون bookingData." },
      { title: "تأكيد الحجز", path: "/booking/confirmation", note: "معاينة المطور تعرض حالة فارغة بدون bookingConfirmation." },
      { title: "نجاح الدفع", path: "/payment/success" },
      { title: "إلغاء الدفع", path: "/payment/cancel" },
    ],
  },
  {
    title: "صفحات الأدمن",
    description: "تفتح محليًا للمعاينة عند تفعيل وضع معاينة المطور.",
    pages: [
      { title: "لوحة الأدمن", path: "/admin" },
      { title: "الحجوزات", path: "/admin/bookings" },
      { title: "الفنادق", path: "/admin/hotels" },
      { title: "المدفوعات", path: "/admin/payments" },
      { title: "المستخدمون", path: "/admin/users" },
      { title: "الوكالات", path: "/admin/agencies" },
      { title: "المدونة", path: "/admin/blog" },
      { title: "الدعم", path: "/admin/support" },
      { title: "السجلات", path: "/admin/logs" },
      { title: "الإعدادات", path: "/admin/settings" },
    ],
  },
  {
    title: "صفحات الوكالات",
    description: "تعرض حالات محلية أو فارغة بدون وكالة حقيقية عند تفعيل المعاينة.",
    pages: [
      { title: "لوحة التحكم", path: "/agency/dashboard" },
      { title: "الحجوزات", path: "/agency/bookings" },
      { title: "المحفظة / الائتمان", path: "/agency/wallet" },
      { title: "العمولة", path: "/agency/commission" },
      { title: "المستخدمون", path: "/agency/users" },
      { title: "التقارير", path: "/agency/reports" },
    ],
  },
  {
    title: "بوابة مالك الفندق",
    description: "مساحة محلية لصاحب الفندق، تعتمد على localStorage أو حالة فارغة.",
    pages: [
      { title: "لوحة التحكم", path: "/hotel-owner/dashboard" },
      { title: "تسجيل فندق", path: "/hotel-owner/register" },
      { title: "الفنادق / المنشآت", path: "/hotel-owner/properties" },
      { title: "الغرف", path: "/hotel-owner/rooms" },
      { title: "الأسعار", path: "/hotel-owner/pricing" },
      { title: "التوفر", path: "/hotel-owner/availability" },
      { title: "الصور", path: "/hotel-owner/images" },
      { title: "الحجوزات", path: "/hotel-owner/bookings" },
      { title: "المدفوعات المستحقة", path: "/hotel-owner/payouts" },
    ],
  },
  {
    title: "الملف الشخصي والتطوير",
    description: "صفحات تحتاج مستخدمًا حقيقيًا أو مخصصة للمطور.",
    pages: [
      { title: "الملف الشخصي", path: "/profile", note: "معاينة المطور تعرض حالة فارغة بدون مستخدم." },
      { title: "فهرس صفحات المطور", path: "/dev/pages" },
    ],
  },
];

export default function DeveloperPagesIndexPage() {
  const locale = useLocale();
  const isPreviewEnabled = isDevPreviewAllPagesEnabled();

  useEffect(() => {
    warnDevPreviewAllPagesEnabled();
  }, []);

  const withLocale = (path: string) => `/${locale}${path}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A]">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-4 bg-white/15 text-white hover:bg-white/20">
                للتطوير المحلي فقط
              </Badge>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                فهرس صفحات المطور
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/80 md:text-base">
                فهرس محلي لكل صفحات Hotleno الحالية لمعاينة الواجهات بدون حسابات
                حقيقية أو وكالة أو صاحب فندق أو قاعدة بيانات نهائية.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm">
              <p className="font-black">متغير المعاينة</p>
              <p className="mt-2 text-white/80">
                NEXT_PUBLIC_DEV_PREVIEW_ALL_PAGES=
                <span className="font-black">
                  {isPreviewEnabled ? "true" : "false"}
                </span>
              </p>
            </div>
          </div>
        </section>

        {!isPreviewEnabled && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            وضع المعاينة غير مفعل. لتجاوز حماية المعاينة محليًا فقط، أضف
            `NEXT_PUBLIC_DEV_PREVIEW_ALL_PAGES=true` في `.env.local` ثم أعد تشغيل
            خادم التطوير.
          </section>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {pageGroups.map((group) => (
            <Card key={group.title} className="border-slate-200">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-black">
                      {group.title}
                    </CardTitle>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {group.description}
                    </p>
                  </div>
                  <Badge variant="secondary">{group.pages.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y rounded-xl border">
                  {group.pages.map((page) => (
                    <div
                      key={`${group.title}-${page.path}`}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-bold">{page.title}</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {withLocale(page.path)}
                        </p>
                        {page.note && (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {page.note}
                          </p>
                        )}
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={withLocale(page.path)}>فتح الصفحة</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
