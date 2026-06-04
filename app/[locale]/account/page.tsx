"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ServiceIcon } from "@/components/account/account-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Booking = {
  _id: string;
  bookingReference?: string;
  hotelName?: string;
  serviceType?: string;
  status?: string;
  supplier?: string;
  totalPrice?: number;
  currency?: string;
  checkInDate?: string;
};

type SummaryData = {
  user: { name: string; isActive?: boolean; accountType?: string };
  bookings: Booking[];
  wallet: { balance: number; currency: string; refunds: number; credits: number };
  stats: { totalBookings: number; activeBookings: number; completedTrips: number };
  travelersCount: number;
};

function useAccountSummary() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      const token = localStorage.getItem("token");
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      fetch("/api/account/summary", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => response.json())
        .then((json) => {
          if (active) setData(json);
        })
        .catch(() => {
          if (active) setData(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return { data, loading };
}

export default function AccountDashboardPage() {
  const locale = useLocale();
  const t = useTranslations("account");
  const { data, loading } = useAccountSummary();
  const services = [
    { key: "hotel", href: `/${locale}/search`, enabled: true },
    { key: "flight", href: `/${locale}/flights`, enabled: false },
    { key: "car", href: `/${locale}/services`, enabled: false },
    { key: "activity", href: `/${locale}/activities`, enabled: true },
    { key: "transfer", href: `/${locale}/transfers`, enabled: true },
    { key: "esim", href: `/${locale}/services`, enabled: false },
  ];

  if (loading) {
    return <div className="rounded-lg border p-6">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{t("dashboard.eyebrow")}</p>
          <h1 className="text-3xl font-bold">
            {t("dashboard.welcome", { name: data?.user?.name || t("dashboard.traveler") })}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("dashboard.description")}</p>
        </div>
        <Badge variant={data?.user?.isActive === false ? "destructive" : "secondary"}>
          {data?.user?.isActive === false ? t("status.inactive") : t("status.active")}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("dashboard.walletBalance")}</p>
            <p className="mt-2 text-2xl font-bold">
              {data?.wallet.currency || "USD"} {data?.wallet.balance ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("dashboard.totalBookings")}</p>
            <p className="mt-2 text-2xl font-bold">{data?.stats.totalBookings ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("dashboard.activeBookings")}</p>
            <p className="mt-2 text-2xl font-bold">{data?.stats.activeBookings ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("dashboard.travelers")}</p>
            <p className="mt-2 text-2xl font-bold">{data?.travelersCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("dashboard.services")}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <Card key={service.key}>
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                    <ServiceIcon type={service.key} className="h-5 w-5" />
                  </div>
                  {!service.enabled && <Badge variant="outline">{t("comingSoon")}</Badge>}
                </div>
                <div>
                  <h3 className="font-semibold">{t(`services.${service.key}.title`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`services.${service.key}.description`)}
                  </p>
                </div>
                <Button asChild variant={service.enabled ? "default" : "outline"} className="mt-auto">
                  <Link href={service.href}>
                    {service.enabled ? t("actions.explore") : t("comingSoon")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentBookings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.bookings?.length ? (
              <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                {t("bookings.empty")}
              </p>
            ) : (
              data.bookings.map((booking) => (
                <Link
                  key={booking._id}
                  href={`/${locale}/account/bookings/${booking._id}`}
                  className="flex items-center justify-between gap-4 rounded-md border p-3 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{booking.hotelName || booking.bookingReference}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.supplier || "none"} · {booking.status}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {booking.currency || "USD"} {booking.totalPrice ?? 0}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickLinks")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline"><Link href={`/${locale}/account/bookings`}>{t("nav.bookings")}</Link></Button>
            <Button asChild variant="outline"><Link href={`/${locale}/account/wallet`}>{t("nav.wallet")}</Link></Button>
            <Button asChild variant="outline"><Link href={`/${locale}/account/travelers`}>{t("nav.travelers")}</Link></Button>
            <Button asChild variant="outline"><Link href={`/${locale}/support`}>{t("nav.support")}</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
