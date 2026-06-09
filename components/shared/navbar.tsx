"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthDialog } from "@/components/features/auth/auth-dialog";
import { ConfirmLogout } from "@/components/features/auth/confirm-logout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, GlobeIcon, BedIcon } from "@hugeicons/core-free-icons";

interface NavbarProps {
  locale: string;
}

export default function Navbar({ locale }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentLocale = useLocale();
  const t = useTranslations();
  const accountT = useTranslations("account");
  const { user, isAuthenticated, isLoading } = useAuth();
  const dashboardHref = user?.role === "admin" ? `/${locale}/admin` : `/${locale}/account`;

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split("/");
    if (segments[1] === "ar" || segments[1] === "en") {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }

    const query = searchParams.toString();
    router.push(`${segments.join("/") || `/${newLocale}`}${query ? `?${query}` : ""}`);
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <HugeiconsIcon icon={BedIcon} className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">هوتلينو</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HugeiconsIcon icon={GlobeIcon} className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {t("navigation.language")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => switchLocale("en")}
                  className={currentLocale === "en" ? "bg-accent" : ""}
                >
                  {t("navigation.english")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => switchLocale("ar")}
                  className={currentLocale === "ar" ? "bg-accent" : ""}
                >
                  {t("navigation.arabic")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auth Section */}
            {isLoading ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.avatar || ""}
                        alt={user.name || "User"}
                      />
                      <AvatarFallback>
                        {user.name?.[0] || user.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={dashboardHref}>
                      <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
                      {user.role === "admin" ? accountT("nav.adminDashboard") : accountT("nav.dashboard")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/account`}>
                      <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
                      {t("navigation.myAccount")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/account/bookings`}>
                      <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
                      {accountT("nav.bookings")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/account/wallet`}>
                      <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
                      {accountT("nav.wallet")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/account/travelers`}>
                      <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
                      {accountT("nav.travelers")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/account/profile`}>
                      <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
                      {t("navigation.profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/account/settings`}>
                      <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
                      {accountT("nav.settings")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/support`}>
                      <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
                      {accountT("nav.support")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="p-0"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <ConfirmLogout />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <AuthDialog />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
