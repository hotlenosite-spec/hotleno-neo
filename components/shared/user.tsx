"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  avatar?: string;
}

interface UserNavProps {
  user: UserData;
}

export function User({ user }: UserNavProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

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

        <Link href="/dashboard">
          <DropdownMenuItem className="cursor-pointer px-4 py-3 text-sm">
            <HugeiconsIcon icon={LayoutIcon} className="h-4 w-4 mr-3" />
            {t("navigation.dashboard")}
          </DropdownMenuItem>
        </Link>

        <Link href="/profile">
          <DropdownMenuItem className="cursor-pointer px-4 py-3 text-sm">
            <HugeiconsIcon icon={UserFreeIcons} className="h-4 w-4 mr-3" />
            {t("navigation.profile")}
          </DropdownMenuItem>
        </Link>

        <Link href="/settings">
          <DropdownMenuItem className="cursor-pointer px-4 py-3 text-sm">
            <HugeiconsIcon icon={SettingsIcon} className="h-4 w-4 mr-3" />
            {t("navigation.settings")}
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
          <ConfirmLogout />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
