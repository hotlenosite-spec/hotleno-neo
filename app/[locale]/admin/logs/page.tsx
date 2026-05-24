"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { format } from "date-fns";
import { toast } from "sonner";

interface AdminLogEntry {
  _id: string;
  bookingId?: string;
  type: string;
  status: string;
  message?: string;
  error?: unknown;
  createdAt: string;
}

interface AdminLogsResponse {
  bookingLogs: AdminLogEntry[];
  paymentLogs: AdminLogEntry[];
  supplierLogs: AdminLogEntry[];
}

const logStatuses = [
  "started",
  "pending",
  "success",
  "processed",
  "skipped",
  "failed",
];

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("limit", "30");
      if (bookingId) params.append("bookingId", bookingId);
      if (type) params.append("type", type);
      if (status) params.append("status", status);

      const response = await fetch(`/api/admin/logs?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }

      const data = await response.json();
      setLogs(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setBookingId("");
    setType("");
    setStatus("");
  };

  const formatDate = (value: string) => {
    return format(new Date(value), "MMM d, yyyy h:mm a");
  };

  const getStatusBadge = (logStatus: string) => {
    if (logStatus === "failed") {
      return (
        <Badge className="rounded-full bg-red-50 px-3 py-1 text-red-700 hover:bg-red-50">
          {logStatus}
        </Badge>
      );
    }

    if (logStatus === "success" || logStatus === "processed") {
      return (
        <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
          {logStatus}
        </Badge>
      );
    }

    if (logStatus === "pending" || logStatus === "started") {
      return (
        <Badge className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50">
          {logStatus}
        </Badge>
      );
    }

    return (
      <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
        {logStatus}
      </Badge>
    );
  };

  const renderLogList = (title: string, entries: AdminLogEntry[]) => (
    <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-xl font-black text-slate-950">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </div>
        ) : entries.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm font-medium text-slate-500">
            No logs found
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry._id}
                className="rounded-3xl border border-slate-100 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-slate-950">
                      {entry.type}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {entry.bookingId
                        ? `Booking: ${entry.bookingId}`
                        : "No booking ID"}
                    </p>
                  </div>

                  {getStatusBadge(entry.status)}
                </div>

                {entry.message && (
                  <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-medium leading-6 text-slate-600">
                    {entry.message}
                  </p>
                )}

                {Boolean(entry.error) && (
                  <pre className="mt-3 max-h-32 overflow-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(entry.error, null, 2)}
                  </pre>
                )}

                <p className="mt-3 text-xs font-bold text-slate-400">
                  {formatDate(entry.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#f4d58d]">
              HOTLENO Operational Logs
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Operational Logs
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              Review recent booking, payment, and supplier events.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <HeroMiniCard
              title="Booking"
              value={(logs?.bookingLogs?.length || 0).toString()}
            />
            <HeroMiniCard
              title="Payment"
              value={(logs?.paymentLogs?.length || 0).toString()}
            />
            <HeroMiniCard
              title="Supplier"
              value={(logs?.supplierLogs?.length || 0).toString()}
            />
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <Input
              placeholder="Filter by bookingId..."
              value={bookingId}
              onChange={(event) => setBookingId(event.target.value)}
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-medium"
            />

            <Input
              placeholder="Filter by type..."
              value={type}
              onChange={(event) => setType(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && fetchLogs()}
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-medium"
            />

            <Select
              value={status || "all"}
              onValueChange={(value) => setStatus(value === "all" ? "" : value)}
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {logStatuses.map((logStatus) => (
                  <SelectItem key={logStatus} value={logStatus}>
                    {logStatus}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={fetchLogs}
              className="h-12 rounded-2xl bg-[#071b33] px-5 font-bold text-white hover:bg-[#0a2a4f]"
            >
              <HugeiconsIcon icon={Search01Icon} className="ml-2 h-4 w-4" />
              Search
            </Button>

            <Button
              variant="outline"
              onClick={clearFilters}
              className="h-12 rounded-2xl border-slate-200 px-5 font-bold"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        {renderLogList("Latest Booking Logs", logs?.bookingLogs || [])}
        {renderLogList("Latest Payment Logs", logs?.paymentLogs || [])}
        {renderLogList("Latest Supplier Logs", logs?.supplierLogs || [])}
      </div>
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
