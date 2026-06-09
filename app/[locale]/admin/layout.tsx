"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getDevAdminBypassWarning,
  isDevAdminBypassEnabled,
  isDevPreviewAllPagesEnabled,
  warnDevPreviewAllPagesEnabled,
} from "@/lib/security/dev-flags";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isDevAdminBypass = isDevAdminBypassEnabled();
  const isDevPreviewAllPages = isDevPreviewAllPagesEnabled();
  const canPreviewAdmin = isDevAdminBypass;
  const requiredPermission = getRequiredPermission(pathname);
  const hasPagePermission =
    !requiredPermission ||
    !user?.permissions ||
    user.permissions.length === 0 ||
    user.staffRole === "super_admin" ||
    user.permissions.includes(requiredPermission);

  useEffect(() => {
    const warning = getDevAdminBypassWarning();
    if (warning) {
      console.warn(`[HOTLENO SECURITY] ${warning}`);
    }
    warnDevPreviewAllPagesEnabled();
  }, []);

  useEffect(() => {
    if (canPreviewAdmin || isLoading) return;

    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/");
      return;
    }
    if (!hasPagePermission) {
      const locale = pathname.split("/")[1] || "en";
      router.replace(`/${locale}/admin`);
    }
  }, [
    canPreviewAdmin,
    hasPagePermission,
    isLoading,
    isAuthenticated,
    pathname,
    router,
    user?.role,
  ]);

  if (canPreviewAdmin) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <div className="flex min-h-screen">
          <AdminSidebar />

          <div className="flex min-h-screen flex-1 flex-col">
            <AdminHeader />

            <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin" || !hasPagePermission) {
    return null;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <AdminHeader />

          <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function getRequiredPermission(pathname: string) {
  const routes: Array<[string, string]> = [
    ["/admin/bookings", "bookings.view"],
    ["/admin/payments", "payments.view"],
    ["/admin/support", "support.view"],
    ["/admin/customers", "customers.view"],
    ["/admin/users", "customers.view"],
    ["/admin/staff", "users.view"],
    ["/admin/notifications", "dashboard.view"],
    ["/admin/agencies", "agencies.view"],
    ["/admin/suppliers", "suppliers.view"],
    ["/admin/pricing", "pricing.view"],
    ["/admin/hotels", "suppliers.view"],
    ["/admin/logs", "logs.view"],
    ["/admin/settings", "settings.view"],
  ];
  return routes.find(([route]) => pathname.includes(route))?.[1];
}
