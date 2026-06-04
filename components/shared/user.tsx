"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ConfirmLogout } from "@/components/features/auth/confirm-logout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserFreeIcons,
  SettingsIcon,
  LayoutIcon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";

interface UserData {
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

interface UserNavProps {
  user: UserData;
}

export function User({ user }: UserNavProps) {
  const t = useTranslations("account");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = user.role === "admin";
  const dashboardHref = isAdmin ? `/${locale}/admin` : `/${locale}/account`;
  const menuItems = [
    { href: dashboardHref, icon: LayoutIcon, label: isAdmin ? t("nav.adminDashboard") : t("nav.dashboard") },
    { href: `/${locale}/account/bookings`, icon: LayoutIcon, label: t("nav.bookings") },
    { href: `/${locale}/account/wallet`, icon: LayoutIcon, label: t("nav.wallet") },
    { href: `/${locale}/account/profile`, icon: UserFreeIcons, label: t("nav.profile") },
    { href: `/${locale}/account/travelers`, icon: UserFreeIcons, label: t("nav.travelers") },
    { href: `/${locale}/account/settings`, icon: SettingsIcon, label: t("nav.settings") },
    { href: `/${locale}/support`, icon: SettingsIcon, label: t("nav.support") },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="cursor-pointer relative h-12 px-1 rounded-full transition-colors duration-200"
        >
          <div className="flex items-center space-x-3 pr-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-sm font-medium">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs">{user.email}</p>
            </div>

            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <DropdownMenuItem className="cursor-pointer px-4 py-3 text-sm">
              <HugeiconsIcon icon={item.icon} className="h-4 w-4 mr-3" />
              {item.label}
            </DropdownMenuItem>
          </Link>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
          <ConfirmLogout />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
