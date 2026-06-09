"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
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
import {
  UserIcon,
  SettingsIcon,
  LogoutIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { AdminNotificationsMenu } from "@/components/admin/admin-notifications-menu";

export function AdminHeader() {
  const locale = useLocale();
  const t = useTranslations("admin");
  const { user, logout } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const adminName = user?.name || t("hotlenoAdmin");
  const adminEmail = user?.email || "admin@hotleno.com";
  const adminRole = user?.role || "admin";

  const avatarSrc =
    user?.avatar && user.avatar.trim() !== "" && !avatarFailed
      ? user.avatar
      : undefined;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <header className="sticky top-16 z-30 border-b border-[#E5E7EB] bg-white">
      <div className="flex h-[72px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-12 rounded-xl px-2 hover:bg-orange-50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    {avatarSrc && (
                      <AvatarImage
                        src={avatarSrc}
                        alt={adminName}
                        onError={() => setAvatarFailed(true)}
                      />
                    )}
                    <AvatarFallback className="bg-orange-50 text-xs font-black text-[#F97316]">
                      {getInitials(adminName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="hidden text-right md:block">
                    <p className="text-sm font-black leading-4 text-[#0F172A]">
                      {adminName}
                    </p>
                    <p className="mt-1 text-xs font-medium capitalize text-slate-500">
                      {adminRole}
                    </p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-60 rounded-2xl"
              align="start"
              forceMount
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1 text-right">
                  <p className="text-sm font-bold">{adminName}</p>
                  <p className="text-xs text-muted-foreground">{adminEmail}</p>
                  <p className="text-xs font-bold text-[#F97316] capitalize">
                    {adminRole}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <Link href={`/${locale}/account/profile`}>
                <DropdownMenuItem className="cursor-pointer">
                  <HugeiconsIcon icon={UserIcon} className="ml-2 h-4 w-4" />
                  {t("profile")}
                </DropdownMenuItem>
              </Link>

              <Link href={`/${locale}/admin/settings`}>
                <DropdownMenuItem className="cursor-pointer">
                  <HugeiconsIcon icon={SettingsIcon} className="ml-2 h-4 w-4" />
                  {t("settings")}
                </DropdownMenuItem>
              </Link>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={logout}
              >
                <HugeiconsIcon icon={LogoutIcon} className="ml-2 h-4 w-4" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl text-slate-600 hover:bg-orange-50 hover:text-[#F97316]"
          >
            <HugeiconsIcon icon={SettingsIcon} className="h-6 w-6" />
          </Button>

          <AdminNotificationsMenu />
        </div>

        <div className="hidden flex-1 justify-center lg:flex">
          <div className="relative w-full max-w-[520px]">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder={
                t("globalSearchPlaceholder")
              }
              className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 pr-12 text-center text-sm font-medium text-slate-600 outline-none transition placeholder:text-slate-400 focus:border-[#F97316] focus:ring-4 focus:ring-orange-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-5 text-sm font-bold text-slate-700">
          <div className="hidden items-center gap-2 rounded-xl border-l border-[#E5E7EB] pl-5 lg:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>{t("systemOperational")}</span>
          </div>

          <div className="hidden h-8 w-px bg-[#E5E7EB] lg:block" />

          <div className="hidden items-center gap-2 lg:flex">
            <span>{t("today")}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
