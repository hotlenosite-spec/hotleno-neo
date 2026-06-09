"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentState } from "@/components/shared/content-state";
import { Textarea } from "@/components/ui/textarea";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  ClockIcon,
  Message02Icon,
  Ticket01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

type Ticket = {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  updatedAt: string | null;
};

const categoryKeys = {
  booking_issue: "categoryBookingIssue",
  payment_issue: "categoryPaymentIssue",
  cancellation_refund: "categoryCancellationRefund",
  hotel_issue: "categoryHotelIssue",
  account_issue: "categoryAccountIssue",
  general: "categoryGeneral",
} as const;

const statusKeys = {
  open: "statusOpen",
  waiting_customer: "statusWaitingCustomer",
  waiting_admin: "statusWaitingAdmin",
  waiting_supplier: "statusWaitingSupplier",
  resolved: "statusResolved",
  closed: "statusClosed",
} as const;

const priorityKeys = {
  low: "priorityLow",
  normal: "priorityNormal",
  high: "priorityHigh",
  urgent: "priorityUrgent",
} as const;

export default function SupportPage() {
  const t = useTranslations("support");
  const locale = useLocale();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "",
    message: "",
    bookingReference: "",
  });

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/support/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("support_fetch_failed");
      const data = await response.json();
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch {
      setLoadError(true);
      toast.error(t("failedToFetchTickets"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void fetchTickets();
  }, [authLoading, fetchTickets, isAuthenticated]);

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.category || !newTicket.message.trim()) {
      toast.error(t("requiredFields"));
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTicket),
      });
      if (!response.ok) throw new Error("support_create_failed");

      toast.success(t("ticketCreated"));
      setIsCreateDialogOpen(false);
      setNewTicket({
        subject: "",
        category: "",
        message: "",
        bookingReference: "",
      });
      await fetchTickets();
    } catch {
      toast.error(t("failedToCreateTicket"));
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <h1 className="text-2xl font-bold">{t("signInRequired")}</h1>
            <p className="mt-2 text-muted-foreground">{t("signInRequiredDescription")}</p>
            <Button asChild className="mt-6">
              <Link href={`/${locale}/login`}>{t("signIn")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("supportCenter")}</h1>
          <p className="text-muted-foreground">{t("supportDescription")}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <HugeiconsIcon icon={Add01Icon} className="me-2 h-4 w-4" />
              {t("newTicket")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("createNewTicket")}</DialogTitle>
              <DialogDescription>{t("createTicketDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Field label={t("subject")}>
                <Input
                  value={newTicket.subject}
                  onChange={(event) =>
                    setNewTicket((current) => ({ ...current, subject: event.target.value }))
                  }
                  placeholder={t("subjectPlaceholder")}
                />
              </Field>
              <Field label={t("category")}>
                <Select
                  value={newTicket.category}
                  onValueChange={(category) =>
                    setNewTicket((current) => ({ ...current, category }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder={t("selectCategory")} /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryKeys).map(([value, key]) => (
                      <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={`${t("bookingReference")} (${t("optional")})`}>
                <Input
                  value={newTicket.bookingReference}
                  onChange={(event) =>
                    setNewTicket((current) => ({
                      ...current,
                      bookingReference: event.target.value,
                    }))
                  }
                  placeholder={t("bookingRefPlaceholder")}
                />
              </Field>
              <Field label={t("message")}>
                <Textarea
                  value={newTicket.message}
                  onChange={(event) =>
                    setNewTicket((current) => ({ ...current, message: event.target.value }))
                  }
                  placeholder={t("messagePlaceholder")}
                  rows={5}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleCreateTicket} disabled={saving}>
                {saving ? t("creating") : t("create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Ticket01Icon} className="h-5 w-5" />
            {t("myTickets")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => <Skeleton key={item} className="h-24" />)}
            </div>
          ) : loadError ? (
            <ContentState
              type="error"
              title={t("ticketsLoadErrorTitle")}
              description={t("ticketsLoadErrorDescription")}
              action={
                <Button variant="outline" onClick={fetchTickets}>
                  {t("retry")}
                </Button>
              }
            />
          ) : tickets.length === 0 ? (
            <ContentState
              type="empty"
              title={t("noTicketsYet")}
              description={t("createFirstTicket")}
              action={
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  {t("newTicket")}
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Link key={ticket._id} href={`/${locale}/support/tickets/${ticket._id}`}>
                  <div className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{ticket.subject}</span>
                          <StatusBadge status={ticket.status} label={t(statusKeys[ticket.status as keyof typeof statusKeys] || "statusOpen")} />
                          <Badge variant="outline">
                            {t(priorityKeys[ticket.priority as keyof typeof priorityKeys] || "priorityNormal")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("ticketNumber")}: {ticket.ticketNumber}
                          {" · "}
                          {t(categoryKeys[ticket.category as keyof typeof categoryKeys] || "categoryGeneral")}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <HugeiconsIcon icon={ClockIcon} className="h-3 w-3" />
                          {t("lastUpdated")}: {formatDate(ticket.updatedAt, locale)}
                        </p>
                      </div>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="h-5 w-5 shrink-0 text-muted-foreground rtl:rotate-180" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const style =
    status === "resolved"
      ? "bg-emerald-600"
      : status === "closed"
        ? "bg-slate-600"
        : status === "waiting_customer"
          ? "bg-blue-600"
          : status === "waiting_supplier"
            ? "bg-purple-600"
            : "bg-orange-600";
  return <Badge className={style}>{label}</Badge>;
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
