"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HOTEL_OWNER_LOCAL_KEYS,
  LocalHotelAvailability,
  LocalHotelImage,
  LocalHotelPricing,
  LocalHotelProperty,
  LocalHotelRoom,
  readLocalItems,
} from "@/lib/hotel-owner-local-store";

interface LocalCounts {
  properties: number;
  rooms: number;
  pricing: number;
  availability: number;
  images: number;
}

export default function HotelOwnerDashboardPage() {
  const [counts, setCounts] = useState<LocalCounts>(() => getLocalCounts());

  useEffect(() => {
    const loadCounts = () => {
      setCounts(getLocalCounts());
    };

    window.addEventListener("hotleno:hotel-owner-local-updated", loadCounts);
    return () => {
      window.removeEventListener("hotleno:hotel-owner-local-updated", loadCounts);
    };
  }, []);

  const hasLocalData =
    counts.properties > 0 ||
    counts.rooms > 0 ||
    counts.pricing > 0 ||
    counts.availability > 0 ||
    counts.images > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">لوحة التحكم</h2>
        <p className="text-muted-foreground">
          مساحة محلية لاختبار إعداد بوابة مالك الفندق قبل الإنتاج.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
          <Badge variant="secondary">وضع مسودات محلية</Badge>
          <span>لا توجد قاعدة بيانات أو مدفوعات أو استدعاءات موردين أو نشر في بحث العملاء هنا.</span>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <DashboardCard label="الفنادق / المنشآت" value={counts.properties} />
        <DashboardCard label="الغرف" value={counts.rooms} />
        <DashboardCard label="الأسعار" value={counts.pricing} />
        <DashboardCard label="التوفر" value={counts.availability} />
        <DashboardCard label="الصور" value={counts.images} />
        <DashboardCard label="الحجوزات" value={null} />
        <DashboardCard label="المدفوعات المستحقة" value={null} />
      </div>

      {!hasLocalData && (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <Badge variant="secondary">حالة فارغة</Badge>
            <h3 className="text-xl font-semibold">لا توجد بيانات إعداد محلية بعد</h3>
            <p className="text-sm text-muted-foreground">
              سجّل فندقًا أو أضف منشأة أو غرفة أو سعرًا أو توفرًا أو صورة
              لمعاينة مسار مالك الفندق المحلي.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>حالة النشر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>المسودات المحلية لا تُحفظ في MongoDB.</p>
          <p>المسودات المحلية لا تُنشر في بحث العملاء.</p>
          <p>لا توجد عمليات حجز داخلي أو مدفوعات مستحقة أو Stripe أو موردين مفعلة هنا.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function getLocalCounts(): LocalCounts {
  return {
    properties: readLocalItems<LocalHotelProperty>(
      HOTEL_OWNER_LOCAL_KEYS.properties,
    ).length,
    rooms: readLocalItems<LocalHotelRoom>(HOTEL_OWNER_LOCAL_KEYS.rooms).length,
    pricing: readLocalItems<LocalHotelPricing>(
      HOTEL_OWNER_LOCAL_KEYS.pricing,
    ).length,
    availability: readLocalItems<LocalHotelAvailability>(
      HOTEL_OWNER_LOCAL_KEYS.availability,
    ).length,
    images: readLocalItems<LocalHotelImage>(HOTEL_OWNER_LOCAL_KEYS.images)
      .length,
  };
}

function DashboardCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Badge variant="secondary">غير متصل</Badge>
        ) : value === 0 ? (
          <Badge variant="secondary">فارغ</Badge>
        ) : (
          <p className="text-3xl font-bold">{value}</p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          {value === null
            ? "مسار الإنتاج غير مفعل."
            : "العدد يعكس هذا المتصفح فقط."}
        </p>
      </CardContent>
    </Card>
  );
}
