"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Message02Icon,
  ClockIcon,
  Ticket01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";
import Link from "next/link";

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export default function SupportPage() {
  const t = useTranslations("support");
  const { isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "",
    priority: "medium",
    message: "",
    bookingReference: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/support/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
      toast.error(t("failedToFetchTickets"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTicket),
      });

      if (response.ok) {
        toast.success(t("ticketCreated"));
        setIsCreateDialogOpen(false);
        setNewTicket({
          subject: "",
          category: "",
          priority: "medium",
          message: "",
          bookingReference: "",
        });
        fetchTickets();
      } else {
        toast.error(t("failedToCreateTicket"));
      }
    } catch (_error) {
      toast.error(t("errorOccurred"));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-[#F97316]">{t("open")}</Badge>;
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t("supportCenter")}</h1>
          <p className="text-muted-foreground">{t("supportDescription")}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <HugeiconsIcon icon={Add01Icon} className="mr-2 h-4 w-4" />
              {t("newTicket")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("createNewTicket")}</DialogTitle>
              <DialogDescription>
                {t("createTicketDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">{t("subject")}</label>
                <Input
                  value={newTicket.subject}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, subject: e.target.value })
                  }
                  placeholder={t("subjectPlaceholder")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("category")}</label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value) =>
                    setNewTicket({ ...newTicket, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking">
                      {t("categoryBooking")}
                    </SelectItem>
                    <SelectItem value="payment">
                      {t("categoryPayment")}
                    </SelectItem>
                    <SelectItem value="technical">
                      {t("categoryTechnical")}
                    </SelectItem>
                    <SelectItem value="account">
                      {t("categoryAccount")}
                    </SelectItem>
                    <SelectItem value="other">{t("categoryOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{t("priority")}</label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(value) =>
                    setNewTicket({ ...newTicket, priority: value })
                  }
                >
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
              <div>
                <label className="text-sm font-medium">
                  {t("bookingReference")} ({t("optional")})
                </label>
                <Input
                  value={newTicket.bookingReference}
                  onChange={(e) =>
                    setNewTicket({
                      ...newTicket,
                      bookingReference: e.target.value,
                    })
                  }
                  placeholder={t("bookingRefPlaceholder")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("message")}</label>
                <Textarea
                  value={newTicket.message}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, message: e.target.value })
                  }
                  placeholder={t("messagePlaceholder")}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleCreateTicket}>{t("create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tickets List */}
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
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8">
              <HugeiconsIcon
                icon={Message02Icon}
                className="h-12 w-12 text-muted-foreground mx-auto mb-4"
              />
              <h3 className="text-lg font-semibold mb-2">
                {t("noTicketsYet")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("createFirstTicket")}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <HugeiconsIcon icon={Add01Icon} className="mr-2 h-4 w-4" />
                {t("newTicket")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <Link key={ticket._id} href={`/support/tickets/${ticket._id}`}>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {ticket.subject}
                          </span>
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("ticketNumber")}: {ticket.ticketNumber} |{" "}
                          {t("category")}:{" "}
                          {t(
                            `category${ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}`,
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <HugeiconsIcon
                            icon={ClockIcon}
                            className="h-3 w-3 inline mr-1"
                          />
                          {t("lastUpdated")}:{" "}
                          {format(
                            new Date(ticket.updatedAt),
                            "MMM d, yyyy HH:mm",
                          )}
                        </p>
                      </div>
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className="h-5 w-5 text-muted-foreground"
                      />
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
