"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import {
  isDevPreviewAllPagesEnabled,
  warnDevPreviewAllPagesEnabled,
} from "@/lib/security/dev-flags";

const hotelOwnerNavItems = [
  { title: "لوحة التحكم", href: "/hotel-owner/dashboard" },
  { title: "تسجيل فندق", href: "/hotel-owner/register" },
  { title: "الفنادق / المنشآت", href: "/hotel-owner/properties" },
  { title: "الغرف", href: "/hotel-owner/rooms" },
  { title: "الأسعار", href: "/hotel-owner/pricing" },
  { title: "التوفر", href: "/hotel-owner/availability" },
  { title: "الصور", href: "/hotel-owner/images" },
  { title: "الحجوزات", href: "/hotel-owner/bookings" },
  { title: "المدفوعات", href: "/hotel-owner/payouts" },
];

function canAccessHotelOwner(role?: string, hotelPartnerId?: string) {
  return Boolean(hotelPartnerId) || Boolean(role?.startsWith("hotel_"));
}

export default function HotelOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isDevPreviewAllPages = isDevPreviewAllPagesEnabled();
  const hasHotelAccess =
    isDevPreviewAllPages ||
    canAccessHotelOwner(user?.role, user?.hotelPartnerId);

  useEffect(() => {
    warnDevPreviewAllPagesEnabled();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (!isDevPreviewAllPages && (!isAuthenticated || !hasHotelAccess)) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="secondary">دخول مالك الفندق</Badge>
            <h1 className="text-2xl font-bold">الدخول مقيّد</h1>
            <p className="text-muted-foreground">
              هذه المنطقة متاحة فقط للمستخدمين المرتبطين بحساب شريك فندقي.
            </p>
            <Button asChild variant="outline">
              <Link href={`/${locale}`}>العودة إلى الموقع</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">بوابة مالك الفندق</h1>
              <Badge variant="outline">
                {isDevPreviewAllPages
                  ? "معاينة المطور"
                  : user?.hotelRole || user?.role}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isDevPreviewAllPages
                ? "معاينة محلية فقط. لا تحتاج إلى حساب شريك فندقي حقيقي أو بيانات من قاعدة البيانات."
                : "مساحة تشغيلية لشركاء الفنادق قبل نشر الفنادق للعملاء."}
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {hotelOwnerNavItems.map((item) => {
              const href = `/${locale}${item.href}`;
              const active = pathname === href;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  className={cn(active && "bg-secondary")}
                >
                  <Link href={href}>{item.title}</Link>
                </Button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}