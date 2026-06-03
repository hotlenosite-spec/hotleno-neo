"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import AuthButtons from "./auth-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const HeroHeader = () => {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [adminLogoFailed, setAdminLogoFailed] = useState(false);
  const [adminFlagFailed, setAdminFlagFailed] = useState(false);

  const isAdminPage =
    pathname === `/${locale}/admin` ||
    pathname.startsWith(`/${locale}/admin/`) ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  const isAr = locale === "ar";
  const navItems = [
    { label: isAr ? "الفنادق" : "Hotels", href: `/${locale}/hotels` },
    { label: isAr ? "الطيران" : "Flights", href: `/${locale}/flights` },
    { label: isAr ? "الخدمات" : "Services", href: `/${locale}/services` },
    { label: isAr ? "الأنشطة" : "Activities", href: `/${locale}/activities` },
    { label: isAr ? "المدونة" : "Blog", href: `/${locale}/blog` },
    { label: isAr ? "عروض اليوم" : "Today deals", href: `/${locale}` },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isAdminPage) {
    return (
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl lg:right-[273px]">
        <nav className="flex h-16 w-full items-center justify-between px-5 lg:px-8">
          <Link
            href={`/${locale}`}
            aria-label="home"
            className="flex items-center gap-4"
          >
            {!adminLogoFailed ? (
              <Image
                width={170}
                height={48}
                src="/design-assets/hotleno-logo.png"
                alt="Hotleno"
                className="h-12 w-auto max-w-[170px] object-contain"
                onError={() => setAdminLogoFailed(true)}
              />
            ) : (
              <span className="text-xl font-black tracking-[0.22em] text-[#071b33]">
                HOTLENO
              </span>
            )}

            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-black tracking-[0.22em] text-[#071b33]">
                HOTLENO
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                {isAr ? "منصة إدارة الحجوزات" : "Booking management platform"}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
              {!adminFlagFailed ? (
                <Image
                  width={20}
                  height={20}
                  src="/design-assets/language-flag.png"
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                  onError={() => setAdminFlagFailed(true)}
                />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#071b33] text-[9px] font-black text-white">
                  {isAr ? "AR" : "EN"}
                </span>
              )}

              <span>{isAr ? "AR" : "EN"}</span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
            </div>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header>
      <nav className="fixed z-20 w-full px-3">
        <div
          className={cn(
            "mx-auto mt-3 max-w-7xl rounded-full border border-[#E5E7EB] bg-white/95 px-4 shadow-sm backdrop-blur-xl transition-all duration-300 lg:px-6",
            isScrolled && "shadow-lg shadow-slate-950/5",
          )}
        >
          <div className="relative flex items-center justify-between gap-4 py-3">
            <Link
              href={`/${locale}`}
              aria-label="home"
              className="flex items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F97316] text-lg font-black text-white">
                H
              </span>
              <span className="text-xl font-black tracking-normal text-[#0F172A]">
                Hotleno
              </span>
            </Link>

            <div className="hidden items-center gap-8 lg:flex">
              <nav className="flex items-center gap-6">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-sm font-bold text-slate-700 transition hover:text-[#F97316]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-sm font-black text-[#0F172A]">
                <Image
                  width={22}
                  height={22}
                  src="/design-assets/language-flag.png"
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                />
                <span>{isAr ? "AR" : "EN"}</span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="h-4 w-4 text-slate-500"
                  aria-hidden="true"
                />
              </div>

              <AuthButtons />
            </div>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[#0F172A] lg:hidden"
                  aria-label={isAr ? "فتح القائمة" : "Open menu"}
                >
                  <HugeiconsIcon icon={Menu01Icon} className="h-6 w-6" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>{t("navigation.menu")}</SheetTitle>
                </SheetHeader>

                <div className="mt-8 flex flex-col gap-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="rounded-2xl px-3 py-2 text-base font-bold text-[#0F172A] hover:bg-orange-50 hover:text-[#F97316]"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <AuthButtons />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
};
