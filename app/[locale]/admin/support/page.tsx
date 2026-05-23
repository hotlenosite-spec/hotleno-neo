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
        return <Badge className="bg-blue-500">{t("open")}</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-500">{t("inProgress")}</Badge>;
      case "waiting":
        return (
          <Badge
            variant="outline"
            className="text-purple-600 border-purple-600"
          >
            {t("waiting")}
          </Badge>
        );
      case "resolved":
        return <Badge className="bg-green-500">{t("resolved")}</Badge>;
      case "closed":
        return <Badge variant="secondary">{t("closed")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">{t("urgent")}</Badge>;
      case "high":
        return <Badge className="bg-orange-500">{t("high")}</Badge>;
      case "medium":
        return <Badge variant="outline">{t("medium")}</Badge>;
      case "low":
        return <Badge variant="secondary">{t("low")}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("support")}</h1>
        <p className="text-muted-foreground">{t("manageSupportTickets")}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("totalTickets")}
              </CardTitle>
              <HugeiconsIcon
                icon={CustomerServiceIcon}
                className="h-4 w-4 text-muted-foreground"
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("openTickets")}
              </CardTitle>
              <HugeiconsIcon
                icon={Alert02Icon}
                className="h-4 w-4 text-blue-500"
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.open + stats.inProgress + stats.waiting}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("requireAttention")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("resolvedTickets")}
              </CardTitle>
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="h-4 w-4 text-green-500"
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("urgentTickets")}
              </CardTitle>
              <HugeiconsIcon
                icon={Alert02Icon}
                className="h-4 w-4 text-red-500"
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.urgent}</div>
              <p className="text-xs text-muted-foreground">
                {t("needImmediate")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) =>
                setStatusFilter(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
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

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("allTickets")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("noTicketsFound")}
            </p>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{ticket.subject}</span>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={UserIcon} className="h-4 w-4" />
                          {ticket.userId.name}
                        </span>
                        <span>{ticket.userId.email}</span>
                        <span>
                          {t("ticketNumber")}: {ticket.ticketNumber}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <HugeiconsIcon
                          icon={ClockIcon}
                          className="h-3 w-3 inline mr-1"
                        />
                        {format(
                          new Date(ticket.updatedAt),
                          "MMM d, yyyy HH:mm",
                        )}
                        {ticket.assignedTo && (
                          <span className="ml-2">
                            | {t("assignedTo")}: {ticket.assignedTo.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/support/tickets/${ticket._id}`}
                        target="_blank"
                      >
                        <Button variant="outline" size="sm">
                          <HugeiconsIcon
                            icon={Message02Icon}
                            className="h-4 w-4 mr-1"
                          />
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
                      >
                        {t("update")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="h-4 w-4 rotate-180"
                />
              </Button>
              <span className="text-sm">
                {t("page")} {page} {t("of")} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("updateTicket")}</DialogTitle>
            <DialogDescription>
              {t("updateTicketDescription")} {selectedTicket?.ticketNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{t("status")}</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
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
              <label className="text-sm font-medium">{t("priority")}</label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger>
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
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleUpdateTicket}>{t("saveChanges")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
