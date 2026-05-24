"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  TelegramIcon,
  UserIcon,
  CustomerServiceIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";
import Link from "next/link";

interface Message {
  sender: "user" | "admin";
  content: string;
  createdAt: string;
}

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  messages: Message[];
  bookingReference?: string;
  createdAt: string;
  updatedAt: string;
  userId: {
    name: string;
    email: string;
  };
}

export default function TicketDetailPage() {
  const t = useTranslations("support");
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
      } else if (response.status === 404) {
        toast.error(t("ticketNotFound"));
        router.push("/support");
      } else if (response.status === 403) {
        toast.error(t("unauthorized"));
        router.push("/support");
      }
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
      toast.error(t("failedToFetchTicket"));
    } finally {
      setLoading(false);
    }
  };

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

      if (response.ok) {
        setNewMessage("");
        fetchTicket();
      } else {
        toast.error(t("failedToSendMessage"));
      }
    } catch (_error) {
      toast.error(t("failedToSendMessage"));
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "closed" }),
      });

      if (response.ok) {
        toast.success(t("ticketClosed"));
        fetchTicket();
      } else {
        toast.error(t("failedToCloseTicket"));
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-32 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/support">
          <Button variant="ghost" className="pl-0">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
            {t("backToSupport")}
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl mb-2">{ticket.subject}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(ticket.status)}
                <span className="text-sm text-muted-foreground">
                  {t("ticketNumber")}: {ticket.ticketNumber}
                </span>
                {ticket.bookingReference && (
                  <span className="text-sm text-muted-foreground">
                    | {t("bookingRef")}: {ticket.bookingReference}
                  </span>
                )}
              </div>
            </div>
            {!isClosed && (
              <Button variant="outline" size="sm" onClick={handleCloseTicket}>
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="mr-2 h-4 w-4"
                />
                {t("closeTicket")}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-4">
            <div className="space-y-4">
              {ticket.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <HugeiconsIcon
                        icon={
                          message.sender === "user"
                            ? UserIcon
                            : CustomerServiceIcon
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-xs font-medium">
                        {message.sender === "user"
                          ? ticket.userId.name
                          : t("supportTeam")}
                      </span>
                      <span className="text-xs opacity-70">
                        {format(new Date(message.createdAt), "MMM d, HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Reply Box */}
      {!isClosed && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t("typeYourMessage")}
                className="flex-1"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                className="self-end"
              >
                <HugeiconsIcon icon={TelegramIcon} className="mr-2 h-4 w-4" />
                {t("send")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isClosed && (
        <Card className="bg-muted">
          <CardContent className="p-4 text-center">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="h-8 w-8 text-green-500 mx-auto mb-2"
            />
            <p className="text-muted-foreground">{t("ticketClosedMessage")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
