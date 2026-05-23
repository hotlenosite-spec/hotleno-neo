"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Calendar01Icon,
  UserMultipleIcon,
  Settings01Icon,
  Menu01Icon,
  ArrowLeft01Icon,
  CustomerServiceIcon,
} from "@hugeicons/core-free-icons";

interface SidebarItem {
  title: string;
  href: string;
  icon: typeof DashboardSquare01Icon | typeof CustomerServiceIcon;
}

export function AdminSidebar() {
  const t = useTranslations("admin");
  const pathname = usePathname();

  const sidebarItems: SidebarItem[] = [
    {
      title: t("dashboard"),
      href: "/admin",
      icon: DashboardSquare01Icon,
    },
    {
      title: t("bookings"),
      href: "/admin/bookings",
      icon: Calendar01Icon,
    },
    {
      title: t("users"),
      href: "/admin/users",
      icon: UserMultipleIcon,
    },
    {
      title: t("support"),
      href: "/admin/support",
      icon: CustomerServiceIcon,
    },
    {
      title: t("settings"),
      href: "/admin/settings",
      icon: Settings01Icon,
    },
  ];

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="outline" size="icon" className="fixed left-4 top-20 z-40">
            <HugeiconsIcon icon={Menu01Icon} className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent items={sidebarItems} pathname={pathname} t={t} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-card min-h-[calc(100vh-4rem)]">
        <ScrollArea className="h-full py-4">
          <SidebarContent items={sidebarItems} pathname={pathname} t={t} />
        </ScrollArea>
      </aside>
    </>
  );
}

function SidebarContent({
  items,
  pathname,
  t,
}: {
  items: SidebarItem[];
  pathname: string;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-2 px-3">
      <div className="mb-6 px-3">
        <h2 className="text-lg font-semibold">{t("adminPanel")}</h2>
        <p className="text-sm text-muted-foreground">{t("manageYourBusiness")}</p>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                pathname === item.href && "bg-secondary"
              )}
            >
              <HugeiconsIcon icon={item.icon} className="h-5 w-5" />
              {item.title}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
            {t("backToSite")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
