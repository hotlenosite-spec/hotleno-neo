"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread" | "read";
type Severity = "info" | "success" | "warning" | "error";
type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: Severity;
  relatedType: string | null;
  relatedId: string | null;
  data: Record<string, string | number | boolean>;
  isRead: boolean;
  createdAt: string | null;
};

const severityStyles: Record<Severity, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

export default function AdminNotificationsPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("adminNotifications");
  const [filter, setFilter] = useState<Filter>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/notifications?read=${filter}&limit=100`, {
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
  }, [authHeaders, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filters = useMemo(
    () => [
      { id: "all" as const, label: t("filters.all") },
      { id: "unread" as const, label: t("filters.unread") },
      { id: "read" as const, label: t("filters.read") },
    ],
    [t],
  );

  const hrefFor = (notification: Notification) => {
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
    return "";
  };

  const titleFor = (notification: Notification) => {
    const key = `types.${notification.type}.title`;
    return t.has(key) ? t(key) : notification.title;
  };

  const messageFor = (notification: Notification) => {
    const key = `types.${notification.type}.message`;
    return t.has(key)
      ? t(key, {
          reference: String(notification.data.reference || notification.relatedId || "-"),
          customer: String(notification.data.customer || "-"),
        })
      : notification.message;
  };

  const markReadAndOpen = async (notification: Notification) => {
    if (!notification.isRead) {
      await fetch(`/api/admin/notifications/${notification.id}`, {
        method: "PATCH",
        headers: authHeaders(),
      }).catch(() => undefined);
    }
    const href = hrefFor(notification);
    if (href) router.push(href);
    else void load();
  };

  const markAllRead = async () => {
    const response = await fetch("/api/admin/notifications/mark-all-read", {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => null);
    if (response?.ok) await load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-950">{t("pageTitle")}</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {t("pageDescription", { count: unreadCount })}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            type="button"
            onClick={markAllRead}
            className="rounded-xl bg-[#F97316] font-black hover:bg-[#ea580c]"
          >
            {t("markAllRead")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        {filters.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-xl px-5 font-bold text-slate-600",
              filter === item.id && "bg-orange-50 text-[#F97316]",
            )}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
          {t("loading")}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-white px-6 py-16 text-center">
          <p className="font-bold text-slate-700">{t("loadError")}</p>
          <Button type="button" variant="outline" onClick={load} className="mt-4 rounded-xl">
            {t("retry")}
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <HugeiconsIcon
            icon={Notification01Icon}
            className="mx-auto h-10 w-10 text-slate-300"
          />
          <p className="mt-4 font-black text-slate-800">{t("empty")}</p>
          <p className="mt-2 text-sm text-slate-500">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => markReadAndOpen(notification)}
              className={cn(
                "flex w-full gap-4 rounded-2xl border bg-white p-5 text-start shadow-sm transition hover:border-orange-200 hover:shadow-md",
                notification.isRead ? "border-slate-200" : "border-orange-200",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  severityStyles[notification.severity] || severityStyles.info,
                )}
              >
                <HugeiconsIcon icon={Notification01Icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-slate-950">
                    {titleFor(notification)}
                  </span>
                  {!notification.isRead && (
                    <span className="h-2 w-2 rounded-full bg-[#F97316]" />
                  )}
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  {messageFor(notification)}
                </span>
                {notification.createdAt && (
                  <span className="mt-2 block text-xs font-medium text-slate-400">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(notification.createdAt))}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
