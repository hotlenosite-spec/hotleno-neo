"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import AuthButtons from "./auth-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Menu01Icon } from "@hugeicons/core-free-icons";

export const HeroHeader = () => {
  const t = useTranslations();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav className="fixed z-20 w-full px-2">
        <div
          className={cn(
            "mx-auto mt-2 max-w-[1344px] px-4 transition-all duration-300 lg:px-8",
            isScrolled &&
              "rounded-full border border-white/50 bg-white/30 shadow-sm backdrop-blur-lg",
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <Link
              href={`/${locale}`}
              aria-label="home"
              className="flex items-center"
            >
              <Image
                width={228}
                height={228}
                src="/design-assets/hotleno-logo.png"
                alt="Hotleno"
                className="h-20 w-20 object-contain sm:h-28 sm:w-28"
                priority
              />
            </Link>

            <div className="hidden items-center gap-7 lg:flex">
              <div className="flex items-center gap-4 text-[32px] font-medium text-white">
                <Image
                  width={45}
                  height={45}
                  src="/design-assets/language-flag.png"
                  alt=""
                  className="h-[37px] w-[37px] rounded-full object-cover"
                />
                <span>EN</span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="h-6 w-6 text-white/90"
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
                  className="lg:hidden"
                  aria-label="Open menu"
                >
                  <HugeiconsIcon icon={Menu01Icon} className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>{t("navigation.menu")}</SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-6">
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
