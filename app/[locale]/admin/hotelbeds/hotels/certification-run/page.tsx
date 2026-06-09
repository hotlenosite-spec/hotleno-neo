"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HotelbedsHotelVoucher } from "@/components/hotels/hotelbeds-hotel-voucher";
import { useAuth } from "@/components/providers/auth-provider";
import type {
  HotelbedsAccommodationCertificationLogEntry,
  HotelbedsAccommodationCertificationRunLog,
} from "@/lib/certification/hotelbeds-accommodation-certification-log";

type ApiPayload = {
  success?: boolean;
  log?: HotelbedsAccommodationCertificationRunLog;
  message?: string;
  error?: string;
};

const steps = [
  { id: "availability", title: "Step 1: Run Availability", path: "availability" },
  { id: "checkrate", title: "Step 2: Run CheckRate", path: "checkrate" },
  { id: "booking", title: "Step 3: Run Booking", path: "book" },
  { id: "details", title: "Step 4: Get Booking Details", path: "details" },
  { id: "voucher", title: "Step 5: View / Print Voucher", path: "" },
  { id: "cancel", title: "Step 6: Cancel Booking", path: "cancel" },
] as const;

function canAccess(user: ReturnType<typeof useAuth>["user"]) {
  return (
    user?.role === "admin" ||
    (user?.role === "supplier_tester" && user?.supplierScope === "hotelbeds")
  );
}

function downloadFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(log: HotelbedsAccommodationCertificationRunLog | null) {
  if (!log) return "# Hotelbeds Accommodation Certification Logs\n\nNo logs.";

  return [
    "# Hotelbeds Accommodation Certification Logs",
    "",
    `Supplier: ${log.supplier}`,
    `Status: ${log.status}`,
    `Updated at: ${log.updatedAt || "not started"}`,
    `Supplier booking reference: ${log.supplierBookingReference || "not captured"}`,
    `Internal booking reference: ${log.internalBookingReference || "not captured"}`,
    "",
    "## Scenario",
    "",
    ...log.scenario.rooms.map(
      (room, index) =>
        `- Room ${index + 1}: adults ${room.adults}, children ${room.children}${
          room.childAges?.length ? `, child ages ${room.childAges.join(", ")}` : ""
        }`,
    ),
    "",
    "## Entries",
    "",
    ...log.entries.flatMap((entry) => [
      `### ${entry.step} - ${entry.status}`,
      "",
      `Timestamp: ${entry.timestamp}`,
      `Endpoint: ${entry.endpoint}`,
      `Supplier booking reference: ${entry.supplierBookingReference || "not captured"}`,
      "",
      "```json",
      JSON.stringify(entry, null, 2),
      "```",
      "",
    ]),
  ].join("\n");
}

export default function HotelbedsAccommodationCertificationRunPage() {
  const locale = useLocale();
  const { user, isLoading } = useAuth();
  const [log, setLog] = useState<HotelbedsAccommodationCertificationRunLog | null>(null);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const [showVoucher, setShowVoucher] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const logsJson = useMemo(() => JSON.stringify(log || {}, null, 2), [log]);

  const loadLogs = useCallback(async () => {
    if (!token) return;
    const response = await fetch("/api/admin/hotelbeds/hotels/certification-run/logs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json().catch(() => null)) as ApiPayload | null;
    if (payload?.success) setLog(payload.log || null);
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLogs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadLogs]);

  async function runStep(path: string) {
    if (!token || !path) return;
    setRunning(path);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/hotelbeds/hotels/certification-run/${path}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || payload.error || "Certification step failed.");
      }
      setLog(payload.log || null);
      setMessage("Step completed and full request/response logs were saved.");
      if (path === "book" || path === "details") setShowVoucher(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Certification step failed.");
      await loadLogs();
    } finally {
      setRunning(null);
    }
  }

  async function clearLogs() {
    if (!token) return;
    const confirmed = window.confirm("Clear Hotelbeds Accommodation certification run logs?");
    if (!confirmed) return;

    const response = await fetch("/api/admin/hotelbeds/hotels/certification-run/logs", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json().catch(() => null)) as ApiPayload | null;
    if (payload?.success) {
      setLog(payload.log || null);
      setMessage("Certification run logs were cleared.");
      setShowVoucher(false);
    }
  }

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 font-black">Loading...</div>;
  }

  if (!canAccess(user)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 font-black text-red-700">
        Hotelbeds Accommodation certification is available only to admins or Hotelbeds supplier testers.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#0F172A]">
      <section className="rounded-[2rem] border border-orange-200 bg-orange-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="bg-[#F97316] text-white">Hotelbeds Accommodation</Badge>
            <h1 className="mt-3 text-3xl font-black">Accommodation live certification run</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold text-slate-700">
              This page sends real requests to Hotelbeds test environment only when the user clicks a step button.
              It sends no Hotelbeds request on page load and does not include TBO.
            </p>
          </div>
          <Badge variant="outline">/{locale}/admin/hotelbeds/hotels/certification-run</Badge>
        </div>
      </section>

      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle className="text-xl font-black">Fixed certification scenario</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Info label="Supplier" value="Hotelbeds Accommodation" />
          <Info label="Room 1" value="Adults 1, Children 0" />
          <Info label="Room 2" value="Adults 1, Children 1" />
          <Info label="Child age" value="7" />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-xl font-black">Manual steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step) =>
              step.id === "voucher" ? (
                <Button
                  key={step.id}
                  type="button"
                  variant="outline"
                  className="w-full justify-start rounded-2xl"
                  disabled={!log?.voucher}
                  onClick={() => setShowVoucher(true)}
                >
                  {step.title}
                </Button>
              ) : (
                <Button
                  key={step.id}
                  type="button"
                  className="w-full justify-start rounded-2xl bg-[#0F172A] text-white hover:bg-slate-800"
                  disabled={Boolean(running) || (step.id === "cancel" && !log?.supplierBookingReference)}
                  onClick={() => runStep(step.path)}
                >
                  {running === step.path ? "Running..." : step.title}
                </Button>
              ),
            )}
            {message ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl font-black">Run status</CardTitle>
              <Badge className="bg-slate-900 text-white">{log?.status || "not_started"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Info label="Updated" value={log?.updatedAt || "Not started"} />
            <Info label="Hotelbeds ref" value={log?.supplierBookingReference || "Not captured"} />
            <Info label="HOTLENO ref" value={log?.internalBookingReference || "Not captured"} />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-xl font-black">Full request / response logs</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="rounded-2xl" onClick={() => navigator.clipboard.writeText(logsJson)}>
                Copy all logs
              </Button>
              <Button type="button" variant="outline" className="rounded-2xl" onClick={() => downloadFile("hotelbeds-accommodation-certification-logs.json", logsJson, "application/json")}>
                Download JSON
              </Button>
              <Button type="button" variant="outline" className="rounded-2xl" onClick={() => downloadFile("hotelbeds-accommodation-certification-logs.md", toMarkdown(log), "text/markdown")}>
                Download Markdown
              </Button>
              <Button type="button" variant="outline" className="rounded-2xl border-red-200 text-red-700" onClick={clearLogs}>
                Clear certification run logs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!log?.entries.length ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
              No run logs yet. Click a step button to send one real request to Hotelbeds test environment and capture the full log.
            </p>
          ) : (
            log.entries.map((entry, index) => <LogEntry key={`${entry.step}-${entry.timestamp}-${index}`} entry={entry} />)
          )}
        </CardContent>
      </Card>

      {showVoucher && log?.voucher ? (
        <Card className="rounded-[2rem]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl font-black">Booking voucher</CardTitle>
              <Button type="button" className="rounded-2xl bg-[#0F172A] text-white hover:bg-slate-800" onClick={() => window.print()}>
                Print Voucher
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <HotelbedsHotelVoucher voucher={log.voucher} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black">{value || "-"}</p>
    </div>
  );
}

function LogEntry({ entry }: { entry: HotelbedsAccommodationCertificationLogEntry }) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4" open>
      <summary className="cursor-pointer font-black">
        {entry.step} - {entry.status} - {entry.timestamp}
      </summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Info label="Endpoint" value={entry.endpoint} />
        <Info label="Hotelbeds ref" value={entry.supplierBookingReference || "Not captured"} />
        <Info label="HOTLENO ref" value={entry.internalBookingReference || "Not captured"} />
        <Info label="Rate keys" value={entry.selectedRateKeys?.join(", ") || "Not captured"} />
      </div>
      <pre className="mt-4 max-h-[520px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        {JSON.stringify(entry, null, 2)}
      </pre>
    </details>
  );
}
