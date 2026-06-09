"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const canView =
    user?.staffRole === "super_admin" ||
    !user?.permissions ||
    user.permissions.length === 0 ||
    user.permissions.includes("users.view");

  useEffect(() => {
    if (!isLoading && !canView) {
      router.replace(`/${locale}/admin`);
    }
  }, [canView, isLoading, locale, router]);

  if (isLoading || !canView) return null;
  return children;
}
