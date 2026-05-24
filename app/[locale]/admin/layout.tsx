"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Temporary local development bypass.
  // IMPORTANT: Before production, restore real admin auth protection.
  const isDevAdminBypass = true;

  if (isDevAdminBypass) {
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

  return null;
}
