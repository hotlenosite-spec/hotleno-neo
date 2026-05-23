"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  UserMultipleIcon,
  Money01Icon,
  ChartIncreaseIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";

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
  bookingsByStatus: Array<{
    _id: string;
    count: number;
  }>;
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin");
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500">{t("confirmed")}</Badge>;
      case "pending":
      case "onrequest":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            {t("pending")}
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">{t("cancelled")}</Badge>;
      case "completed":
        return <Badge variant="secondary">{t("completed")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("dashboard")}</h1>
        <p className="text-muted-foreground">{t("dashboardDescription")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalBookings")}
            </CardTitle>
            <HugeiconsIcon
              icon={Calendar01Icon}
              className="h-4 w-4 text-muted-foreground"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalBookings || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeBookings || 0} {t("active")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalUsers")}
            </CardTitle>
            <HugeiconsIcon
              icon={UserMultipleIcon}
              className="h-4 w-4 text-muted-foreground"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("registeredUsers")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalRevenue")}
            </CardTitle>
            <HugeiconsIcon
              icon={Money01Icon}
              className="h-4 w-4 text-muted-foreground"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalRevenue || 0, "USD")}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("lifetimeRevenue")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("conversionRate")}
            </CardTitle>
            <HugeiconsIcon
              icon={ChartIncreaseIcon}
              className="h-4 w-4 text-green-500"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalBookings && stats?.totalUsers
                ? ((stats.totalBookings / stats.totalUsers) * 100).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {t("bookingsPerUser")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentBookings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentBookings?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {t("noBookingsYet")}
              </p>
            ) : (
              stats?.recentBookings?.map((booking) => (
                <div
                  key={booking._id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{booking.hotelName}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("ref")}: {booking.bookingReference}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold">
                      {formatCurrency(booking.totalPrice, booking.currency)}
                    </p>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bookings by Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t("bookingsByStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats?.bookingsByStatus?.map((status) => (
              <div
                key={status._id}
                className="flex items-center justify-between"
              >
                <span className="capitalize">{status._id}</span>
                <span className="font-bold">{status.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
