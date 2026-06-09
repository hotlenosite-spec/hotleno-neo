"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  CustomerServiceIcon,
  TelegramIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

type Message = {
  id: string;
  senderType: "customer" | "admin" | "system";
  senderName: string;
  message: string;
  createdAt: string | null;
};

type Ticket = {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  messages: Message[];
  bookingId?: string;
  bookingReference?: string;
  customerName: string;
};

const statusKeys: Record<string, string> = {
  open: "statusOpen",
  waiting_customer: "statusWaitingCustomer",
  waiting_admin: "statusWaitingAdmin",
  waiting_supplier: "statusWaitingSupplier",
  resolved: "statusResolved",
  closed: "statusClosed",
};

export default function TicketDetailPage() {
  const t = useTranslations("support");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const ticketId = String(params.ticketId);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.status === 404 || response.status === 403) {
        toast.error(response.status === 404 ? t("ticketNotFound") : t("unauthorized"));
        router.replace(`/${locale}/support`);
        return;
      }
      if (!response.ok) throw new Error("support_detail_failed");
      const data = await response.json();
      setTicket(data.ticket);
    } catch {
      toast.error(t("failedToFetchTicket"));
    } finally {
      setLoading(false);
    }
  }, [locale, router, t, ticketId]);

  useEffect(() => {
    void fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      setSending(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.error === "ticket_closed_reply_not_allowed") {
          toast.error(t("closedReplyNotAllowed"));
          return;
        }
        if (errorData?.error === "ticket_resolved_reply_not_allowed") {
          toast.error(t("resolvedReplyNotAllowed"));
          return;
        }
        throw new Error("support_reply_failed");
      }
      const data = await response.json();
      setTicket(data.ticket);
      setNewMessage("");
      toast.success(t("messageSent"));
    } catch {
      toast.error(t("failedToSendMessage"));
    } finally {
      setSending(false);
    }
  };

  const handleReopenTicket = async () => {
    try {
      setClosing(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "reopen" }),
      });
      if (!response.ok) throw new Error("support_reopen_failed");
      const data = await response.json();
      setTicket(data.ticket);
      toast.success(t("ticketReopened"));
    } catch {
      toast.error(t("failedToReopenTicket"));
    } finally {
      setClosing(false);
    }
  };

  const handleCloseTicket = async () => {
    try {
      setClosing(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "closed" }),
      });
      if (!response.ok) throw new Error("support_close_failed");
      const data = await response.json();
      setTicket(data.ticket);
      toast.success(t("ticketClosed"));
    } catch {
      toast.error(t("failedToCloseTicket"));
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl space-y-5 px-4 py-8">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }
  if (!ticket) return null;

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Button asChild variant="ghost" className="mb-5 px-0">
        <Link href={`/${locale}/support`}>
          <HugeiconsIcon icon={ArrowLeft01Icon} className="me-2 h-4 w-4 rtl:rotate-180" />
          {t("backToSupport")}
        </Link>
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <CardTitle>{ticket.subject}</CardTitle>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge>{t(statusKeys[ticket.status] || "statusOpen")}</Badge>
                <span>{t("ticketNumber")}: {ticket.ticketNumber}</span>
                {(ticket.bookingReference || ticket.bookingId) && (
                  <span>{t("bookingReference")}: {ticket.bookingReference || ticket.bookingId}</span>
                )}
              </div>
            </div>
            {!isClosed && (
              <Button variant="outline" size="sm" onClick={handleCloseTicket} disabled={closing}>
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="me-2 h-4 w-4" />
                {closing ? t("closing") : t("closeTicket")}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-4">
            <div className="space-y-4">
              {ticket.messages.map((message) => {
                if (message.senderType === "system") {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="rounded-full bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
                        {message.message === "ticket_reopened_by_customer"
                          ? t("reopenedByCustomerMessage")
                          : message.message}
                      </div>
                    </div>
                  );
                }
                const isCustomer = message.senderType === "customer";
                return (
                  <div key={message.id} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg p-4 ${isCustomer ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <HugeiconsIcon icon={isCustomer ? UserIcon : CustomerServiceIcon} className="h-4 w-4" />
                        <span className="text-xs font-medium">{message.senderName || (isCustomer ? ticket.customerName : t("supportTeam"))}</span>
                        <span className="text-xs opacity-70">{formatDate(message.createdAt, locale)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {!isClosed ? (
        <Card>
          <CardContent className="p-4">
            <Textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder={t("typeYourMessage")}
              rows={4}
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                <HugeiconsIcon icon={TelegramIcon} className="me-2 h-4 w-4" />
                {sending ? t("sending") : t("send")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-muted">
          <CardContent className="p-5 text-center">
            <p className="text-muted-foreground">{t("ticketClosedMessage")}</p>
            <Button className="mt-4" onClick={handleReopenTicket} disabled={closing}>
              {closing ? t("reopeningTicket") : t("reopenTicket")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
