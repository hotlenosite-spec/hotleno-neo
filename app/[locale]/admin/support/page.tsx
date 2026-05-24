"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CustomerServiceIcon,
  ClockIcon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  ArrowRight01Icon,
  UserIcon,
  Message02Icon,
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: {
    name: string;
    email: string;
  };
  assignedTo?: {
    name: string;
  };
  messageCount: number;
}

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  urgent: number;
}

export default function AdminSupportPage() {
  const t = useTranslations("admin");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "20");
      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);

      const response = await fetch(`/api/admin/support?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
        setStats(data.stats);
        setTotalPages(data.pagination.pages);
      } else {
        toast.error(t("failedToFetchTickets"));
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
      toast.error(t("failedToFetchTickets"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketId: selectedTicket?._id,
          status: newStatus || selectedTicket?.status,
          priority: newPriority || selectedTicket?.priority,
        }),
      });

      if (response.ok) {
        toast.success(t("ticketUpdated"));
        setIsUpdateDialogOpen(false);
        fetchTickets();
      } else {
        toast.error(t("failedToUpdateTicket"));
      }
    } catch (_error) {
      toast.error(t("errorOccurred"));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge className="rounded-full bg-orange-50 px-3 py-1 text-orange-700 hover:bg-orange-50">
            {t("open")}
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50">
            {t("inProgress")}
          </Badge>
        );
      case "waiting":
        return (
          <Badge className="rounded-full bg-purple-50 px-3 py-1 text-purple-700 hover:bg-purple-50">
            {t("waiting")}
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
            {t("resolved")}
          </Badge>
        );
      case "closed":
        return (
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
            {t("closed")}
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
            {status}
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge className="rounded-full bg-red-50 px-3 py-1 text-red-700 hover:bg-red-50">
            {t("urgent")}
          </Badge>
        );
      case "high":
        return (
          <Badge className="rounded-full bg-orange-50 px-3 py-1 text-orange-700 hover:bg-orange-50">
            {t("high")}
          </Badge>
        );
      case "medium":
        return (
          <Badge className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50">
            {t("medium")}
          </Badge>
        );
      case "low":
        return (
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
            {t("low")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#f4d58d]">
              HOTLENO Support Center
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {t("support")}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              {t("manageSupportTickets")}
            </p>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <HeroMiniCard title={t("totalTickets")} value={stats.total.toString()} />
              <HeroMiniCard title={t("urgentTickets")} value={stats.urgent.toString()} />
              <HeroMiniCard title={t("resolvedTickets")} value={stats.resolved.toString()} />
            </div>
          )}
        </div>
      </section>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title={t("totalTickets")}
            value={stats.total.toString()}
            icon={CustomerServiceIcon}
            color="bg-orange-50 text-orange-700"
            description="All support tickets"
          />

          <StatsCard
            title={t("openTickets")}
            value={(stats.open + stats.inProgress + stats.waiting).toString()}
            icon={Alert02Icon}
            color="bg-amber-50 text-amber-700"
            description={t("requireAttention")}
          />

          <StatsCard
            title={t("resolvedTickets")}
            value={stats.resolved.toString()}
            icon={CheckmarkCircle02Icon}
            color="bg-emerald-50 text-emerald-700"
            description="Closed successfully"
          />

          <StatsCard
            title={t("urgentTickets")}
            value={stats.urgent.toString()}
            icon={Alert02Icon}
            color="bg-red-50 text-red-700"
            description={t("needImmediate")}
          />
        </div>
      )}

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) =>
                setStatusFilter(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50 sm:w-[220px]">
                <SelectValue placeholder={t("filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="open">{t("open")}</SelectItem>
                <SelectItem value="in_progress">{t("inProgress")}</SelectItem>
                <SelectItem value="waiting">{t("waiting")}</SelectItem>
                <SelectItem value="resolved">{t("resolved")}</SelectItem>
                <SelectItem value="closed">{t("closed")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priorityFilter || "all"}
              onValueChange={(value) =>
                setPriorityFilter(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50 sm:w-[220px]">
                <SelectValue placeholder={t("filterByPriority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allPriorities")}</SelectItem>
                <SelectItem value="urgent">{t("urgent")}</SelectItem>
                <SelectItem value="high">{t("high")}</SelectItem>
                <SelectItem value="medium">{t("medium")}</SelectItem>
                <SelectItem value="low">{t("low")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-black text-slate-950">
            {t("allTickets")}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 rounded-3xl" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm font-medium text-slate-500">
              {t("noTicketsFound")}
            </p>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5"
                >
                  <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-slate-950">
                          {ticket.subject}
                        </span>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={UserIcon} className="h-4 w-4" />
                          {ticket.userId.name}
                        </span>

                        <span>{ticket.userId.email}</span>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                          {t("ticketNumber")}: {ticket.ticketNumber}
                        </span>
                      </div>

                      <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                        <HugeiconsIcon icon={ClockIcon} className="h-3 w-3" />
                        {format(new Date(ticket.updatedAt), "MMM d, yyyy HH:mm")}

                        {ticket.assignedTo && (
                          <span>
                            | {t("assignedTo")}: {ticket.assignedTo.name}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/support/tickets/${ticket._id}`} target="_blank">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-2xl border-slate-200 font-bold"
                        >
                          <HugeiconsIcon icon={Message02Icon} className="ml-1 h-4 w-4" />
                          {ticket.messageCount} {t("messages")}
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setNewStatus(ticket.status);
                          setNewPriority(ticket.priority);
                          setIsUpdateDialogOpen(true);
                        }}
                        className="rounded-2xl border-slate-200 font-bold"
                      >
                        {t("update")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-2xl"
              >
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="h-4 w-4 rotate-180"
                />
              </Button>

              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                {t("page")} {page} {t("of")} {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-2xl"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="rounded-3xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-950">
              {t("updateTicket")}
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              {t("updateTicketDescription")} {selectedTicket?.ticketNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-black text-slate-700">
                {t("status")}
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-2 h-12 rounded-2xl border-slate-200 bg-slate-50">
                  <SelectValue placeholder={t("selectStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t("open")}</SelectItem>
                  <SelectItem value="in_progress">{t("inProgress")}</SelectItem>
                  <SelectItem value="waiting">{t("waiting")}</SelectItem>
                  <SelectItem value="resolved">{t("resolved")}</SelectItem>
                  <SelectItem value="closed">{t("closed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-black text-slate-700">
                {t("priority")}
              </label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger className="mt-2 h-12 rounded-2xl border-slate-200 bg-slate-50">
                  <SelectValue placeholder={t("selectPriority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("low")}</SelectItem>
                  <SelectItem value="medium">{t("medium")}</SelectItem>
                  <SelectItem value="high">{t("high")}</SelectItem>
                  <SelectItem value="urgent">{t("urgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUpdateDialogOpen(false)}
              className="rounded-2xl"
            >
              {t("cancel")}
            </Button>

            <Button
              onClick={handleUpdateTicket}
              className="rounded-2xl bg-[#071b33] font-bold text-white hover:bg-[#0a2a4f]"
            >
              {t("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeroMiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-300">{title}</p>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  color,
  description,
}: {
  title: string;
  value: string;
  icon: typeof CustomerServiceIcon;
  color: string;
  description: string;
}) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
      <CardContent className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
            <HugeiconsIcon icon={icon} className="h-6 w-6" />
          </div>
        </div>

        <p className="text-sm font-bold text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
          {value}
        </p>
        <p className="mt-2 text-xs font-medium text-slate-400">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
