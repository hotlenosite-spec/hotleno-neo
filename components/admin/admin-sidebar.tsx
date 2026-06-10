"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/components/providers/auth-provider";
import type { StaffPermission } from "@/lib/staff-permissions";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: StaffPermission;
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M5.8 10.2v8.3a1.5 1.5 0 0 0 1.5 1.5h9.4a1.5 1.5 0 0 0 1.5-1.5v-8.3" />
      <path d="M10 20v-5.2h4V20" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7.5 3.8v3" />
      <path d="M16.5 3.8v3" />
      <path d="M4.5 8.5h15" />
      <path d="M6 5.8h12a1.8 1.8 0 0 1 1.8 1.8v10.2a1.8 1.8 0 0 1-1.8 1.8H6a1.8 1.8 0 0 1-1.8-1.8V7.6A1.8 1.8 0 0 1 6 5.8Z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 20V5.8A1.8 1.8 0 0 1 7.8 4h8.4A1.8 1.8 0 0 1 18 5.8V20" />
      <path d="M4 20h16" />
      <path d="M9 8h2" />
      <path d="M13 8h2" />
      <path d="M9 11.5h2" />
      <path d="M13 11.5h2" />
      <path d="M9 15h2" />
      <path d="M13 15h2" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.4 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M3.8 19.2c.35-3 2.45-5.1 5.6-5.1s5.25 2.1 5.6 5.1" />
      <path d="M16 11.4a2.6 2.6 0 1 0-.1-5.2" />
      <path d="M16.7 14.2c2.2.45 3.5 2.2 3.8 4.6" />
    </svg>
  );
}

function HandshakeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7.6 12.4 10 10c1-1 2.2-1 3.2-.2l.8.6c.9.7 2.1.65 2.9-.15l.7-.7" />
      <path d="m8.6 16.2 1.2 1.2c.45.45 1.2.45 1.65 0 .45-.45.45-1.18 0-1.63" />
      <path d="m11.2 18.1.55.55c.45.45 1.2.45 1.65 0 .45-.45.45-1.18 0-1.63" />
      <path d="m13.5 18 .25.25c.45.45 1.2.45 1.65 0 .45-.45.45-1.18 0-1.63L12.8 14" />
      <path d="M3.8 10.4 7 7.2l4.8 4.8-3.2 3.2Z" />
      <path d="m16.8 7.1 3.4 3.4-4.7 4.7-3.4-3.4Z" />
    </svg>
  );
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.5 6.5h15a1.7 1.7 0 0 1 1.7 1.7v8.6a1.7 1.7 0 0 1-1.7 1.7h-15a1.7 1.7 0 0 1-1.7-1.7V8.2a1.7 1.7 0 0 1 1.7-1.7Z" />
      <path d="M3.2 10h17.6" />
      <path d="M7 15h3.5" />
      <path d="M15.5 15h1.8" />
    </svg>
  );
}

function NotificationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18C21 16 18 16 18 9Z" />
      <path d="M10 21h4" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20h16" />
      <path d="M6.2 20v-5.8h2.5V20" />
      <path d="M10.8 20V9.2h2.5V20" />
      <path d="M15.4 20V5h2.5v15" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M19 13.4a7.4 7.4 0 0 0 .05-2.8l2-1.55-2-3.45-2.45 1a7.7 7.7 0 0 0-2.4-1.4L13.85 2h-3.7L9.8 5.2a7.7 7.7 0 0 0-2.4 1.4l-2.45-1-2 3.45 2 1.55a7.4 7.4 0 0 0 .05 2.8l-2.05 1.6 2 3.45 2.5-1a7.2 7.2 0 0 0 2.35 1.35l.35 3.2h3.7l.35-3.2a7.2 7.2 0 0 0 2.35-1.35l2.5 1 2-3.45Z" />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 12H5" />
      <path d="m12 5-7 7 7 7" />
    </svg>
  );
}

export function AdminSidebar() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useAuth();
  const isArabic = locale === "ar";

  const adminPath = (path: string) => `/${locale}${path}`;
  const can = (permission: StaffPermission) =>
    !user?.permissions ||
    user.permissions.length === 0 ||
    user.staffRole === "super_admin" ||
    user.permissions.includes(permission);

  const allSidebarItems = [
    { title: t("dashboard"), href: adminPath("/admin"), icon: HomeIcon, permission: "dashboard.view" },
    { title: t("bookings"), href: adminPath("/admin/bookings"), icon: CalendarIcon, permission: "bookings.view" },
    { title: t("hotels"), href: adminPath("/admin/hotels"), icon: BuildingIcon, permission: "suppliers.view" },
    { title: t("customers"), href: adminPath("/admin/customers"), icon: UsersIcon, permission: "customers.view" },
    { title: t("users"), href: adminPath("/admin/users"), icon: UsersIcon, permission: "customers.view" },
    { title: t("staff"), href: adminPath("/admin/staff"), icon: UsersIcon, permission: "users.view" },
    { title: t("agencies"), href: adminPath("/admin/agencies"), icon: HandshakeIcon, permission: "agencies.view" },
    { title: t("affiliates"), href: adminPath("/admin/affiliates"), icon: HandshakeIcon },
    { title: t("payments"), href: adminPath("/admin/payments"), icon: CardIcon, permission: "payments.view" },
    { title: t("notifications"), href: adminPath("/admin/notifications"), icon: NotificationIcon, permission: "dashboard.view" },
    { title: t("support"), href: adminPath("/admin/support"), icon: HandshakeIcon, permission: "support.view" },
    { title: t("suppliersControl"), href: adminPath("/admin/suppliers"), icon: SettingsIcon, permission: "suppliers.view" },

    {
      title: isArabic ? "اعتماد Hotelbeds" : "Hotelbeds Certification",
      href: adminPath("/admin/hotelbeds/certification"),
      icon: BuildingIcon,
      permission: "suppliers.view",
    },
    {
      title: isArabic ? "اختبار فنادق Hotelbeds" : "Hotelbeds Hotel Test",
      href: adminPath("/admin/hotelbeds/hotels/certification-run"),
      icon: BuildingIcon,
      permission: "suppliers.view",
    },
    {
      title: isArabic ? "قسيمة فنادق Hotelbeds" : "Hotelbeds Hotel Voucher",
      href: adminPath("/admin/hotelbeds/hotels/voucher-sample"),
      icon: BuildingIcon,
      permission: "suppliers.view",
    },
    {
      title: isArabic ? "قسيمة نقل Hotelbeds" : "Hotelbeds Transfer Voucher",
      href: adminPath("/admin/hotelbeds/transfers/voucher-sample"),
      icon: CalendarIcon,
      permission: "suppliers.view",
    },
    {
      title: isArabic ? "قسيمة أنشطة Hotelbeds" : "Hotelbeds Activity Voucher",
      href: adminPath("/admin/hotelbeds/activities/voucher-sample"),
      icon: CalendarIcon,
      permission: "suppliers.view",
    },

    { title: t("pricing"), href: adminPath("/admin/pricing"), icon: ChartIcon, permission: "pricing.view" },
    { title: t("logs"), href: adminPath("/admin/logs"), icon: ChartIcon, permission: "logs.view" },
    { title: t("blog"), href: adminPath("/admin/blog"), icon: ChartIcon },
    { title: t("settings"), href: adminPath("/admin/settings"), icon: SettingsIcon, permission: "settings.view" },
  ] satisfies SidebarItem[];

  const sidebarItems = allSidebarItems.filter(
    (item) => !item.permission || can(item.permission),
  );

  return (
    <>
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button
            variant="outline"
            size="icon"
            className="fixed right-4 top-24 z-50 h-11 w-11 rounded-2xl border-[#E5E7EB] bg-white text-[#0F172A] shadow-xl"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="h-dvh w-[273px] border-l border-[#E5E7EB] bg-white p-0"
        >
          <SidebarContent items={sidebarItems} pathname={pathname} />
        </SheetContent>
      </Sheet>

      <div className="hidden w-[273px] shrink-0 lg:block">
        <aside className="fixed right-0 top-0 z-40 h-screen w-[273px] border-l border-[#E5E7EB] bg-white text-[#0F172A] shadow-xl shadow-slate-900/5">
          <SidebarContent items={sidebarItems} pathname={pathname} />
        </aside>
      </div>
    </>
  );
}

function SidebarContent({
  items,
  pathname,
}: {
  items: SidebarItem[];
  pathname: string;
}) {
  const t = useTranslations("admin");

  return (
    <div
      dir="rtl"
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white px-[13px] pb-[12px] pt-[22px]"
    >
      <div className="relative mb-[18px] shrink-0 text-center">
        <h2 className="text-[28px] font-black leading-none tracking-[0.26em] text-[#F97316]">
          HOTLENO
        </h2>
        <p className="mt-[10px] text-[13px] font-semibold text-slate-500">
          {t("travelOperations")}
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1 pr-1">
        <nav className="relative flex flex-col gap-[7px] pb-[10px]">
          {items.map((item) => {
            const isActive =
              item.href.endsWith("/admin")
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex h-[47px] w-full flex-row items-center justify-start gap-[12px] rounded-xl px-[16px] text-[15px] font-semibold text-slate-600 hover:bg-orange-50 hover:text-[#F97316]",
                    isActive &&
                      "bg-[#F97316] text-white shadow-lg shadow-orange-500/20 hover:bg-[#F97316] hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[21px] w-[21px] shrink-0",
                      isActive ? "text-white" : "text-slate-500"
                    )}
                  />

                  <span className="leading-none">{item.title}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="relative shrink-0 pt-[13px]">
        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 shadow-sm">
          <div className="px-[15px] pb-[12px] pt-[12px] text-center">
            <h3 className="text-[15px] font-black leading-6 text-[#0F172A]">
              {t("hotlenoAdmin")}
            </h3>
            <p className="mt-[3px] text-[11px] font-medium leading-5 text-slate-500">
              {t("operationalDashboard")}
            </p>

            <Button className="mt-[10px] flex h-[38px] w-full items-center justify-center rounded-xl bg-[#F97316] text-[12px] font-black text-white hover:bg-[#ea580c]">
              <span>{t("reviewOperations")}</span>
            </Button>

            <Link href={`/${pathname.split("/")[1] || "ar"}`}>
              <Button
                variant="ghost"
                className="mt-[7px] flex h-[34px] w-full items-center justify-center rounded-xl text-[12px] font-bold text-slate-600 hover:bg-white hover:text-[#F97316]"
              >
                <span>{t("backToSite")}</span>
                <BackIcon className="mr-2 h-[16px] w-[16px]" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}