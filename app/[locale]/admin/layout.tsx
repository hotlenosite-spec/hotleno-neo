"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const { user, isAuthenticated, isLoading } = useAuth();
  const isDevAdminBypass = isDevAdminBypassEnabled();
  const isDevPreviewAllPages = isDevPreviewAllPagesEnabled();
  const canPreviewAdmin = isDevAdminBypass || isDevPreviewAllPages;

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
    }
  }, [canPreviewAdmin, isLoading, isAuthenticated, router, user?.role]);

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

  if (!isAuthenticated || user?.role !== "admin") {
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
