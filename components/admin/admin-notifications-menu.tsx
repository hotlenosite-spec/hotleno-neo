"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NotificationSeverity = "info" | "success" | "warning" | "error";

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  relatedType: string | null;
  relatedId: string | null;
  data: Record<string, string | number | boolean>;
  isRead: boolean;
  createdAt: string | null;
};

const severityStyles: Record<NotificationSeverity, string> = {
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

function notificationHref(
  locale: string,
  notification: AdminNotification,
) {
  const id = encodeURIComponent(notification.relatedId || "");
  if (notification.relatedType === "support_ticket" && id) {
    return `/${locale}/admin/support/${id}`;
  }
  if (notification.relatedType === "booking" && id) {
    return `/${locale}/admin/bookings?search=${id}`;
  }
  if (notification.relatedType === "payment" && id) {
    return `/${locale}/admin/payments?search=${id}`;
  }
  if (notification.relatedType === "user" && id) {
    return `/${locale}/admin/users?search=${id}`;
  }
  return `/${locale}/admin/notifications`;
}

export function AdminNotificationsMenu() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("adminNotifications");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("token") || "";
    return { Authorization: `Bearer ${token}` };
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/notifications?limit=8", {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("notifications_fetch_failed");
      const payload = await response.json();
      setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
      setUnreadCount(Number(payload.unreadCount || 0));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void fetchNotifications();
    const timer = window.setInterval(fetchNotifications, 60_000);
    return () => window.clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) void fetchNotifications();
  }, [fetchNotifications, open]);

  const displayNotifications = useMemo(
    () => notifications.slice(0, 6),
    [notifications],
  );

  const markRead = async (notification: AdminNotification) => {
    if (!notification.isRead) {
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      await fetch(`/api/admin/notifications/${notification.id}`, {
        method: "PATCH",
        headers: authHeaders(),
      }).catch(() => undefined);
    }
    setOpen(false);
    router.push(notificationHref(locale, notification));
  };

  const markAllRead = async () => {
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    const response = await fetch("/api/admin/notifications/mark-all-read", {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => null);
    if (!response?.ok) void fetchNotifications();
  };

  const getTitle = (notification: AdminNotification) => {
    const key = `types.${notification.type}.title`;
    return t.has(key) ? t(key) : notification.title;
  };

  const getMessage = (notification: AdminNotification) => {
    const key = `types.${notification.type}.message`;
    return t.has(key)
      ? t(key, {
          reference: String(notification.data.reference || notification.relatedId || "-"),
          customer: String(notification.data.customer || "-"),
        })
      : notification.message;
  };

  const formatTime = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("bellLabel")}
          className="relative h-11 w-11 rounded-xl text-slate-600 hover:bg-orange-50 hover:text-[#F97316]"
        >
          <HugeiconsIcon icon={Notification01Icon} className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F97316] px-1 text-[10px] font-black text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[min(92vw,390px)] rounded-2xl p-0">
        <DropdownMenuLabel className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-black text-slate-900">{t("title")}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {t("unreadCount", { count: unreadCount })}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-8 rounded-lg text-xs font-bold text-[#F97316]"
            >
              {t("markAllRead")}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-[420px] overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              {t("loading")}
            </p>
          ) : error ? (
            <div className="px-3 py-7 text-center">
              <p className="text-sm text-slate-600">{t("loadError")}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchNotifications}
                className="mt-3 rounded-lg"
              >
                {t("retry")}
              </Button>
            </div>
          ) : displayNotifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              {t("empty")}
            </p>
          ) : (
            <div className="space-y-1">
              {displayNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markRead(notification)}
                  className={cn(
                    "flex w-full gap-3 rounded-xl px-3 py-3 text-start transition hover:bg-orange-50",
                    !notification.isRead && "bg-orange-50/60",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                      severityStyles[notification.severity] || severityStyles.info,
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-900">
                      {getTitle(notification)}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-600">
                      {getMessage(notification)}
                    </span>
                    <span className="mt-1.5 block text-[11px] font-medium text-slate-400">
                      {formatTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <Link
          href={`/${locale}/admin/notifications`}
          onClick={() => setOpen(false)}
          className="block px-4 py-3 text-center text-sm font-black text-[#F97316] hover:bg-orange-50"
        >
          {t("viewAll")}
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
