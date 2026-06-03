"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatusPayload = {
  environment?: string;
  searchEnabled?: boolean;
  bookingEnabled?: boolean;
  credentialsConfigured?: boolean;
  requestUsage?: {
    used: number;
    maxPerRun: number;
    estimatedDailyRemaining: number;
  };
};

type ReviewScenario = {
  scenario: string;
  title: string;
  status: string;
  supplier: string;
  bookingReference?: string;
  hotelName?: string;
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  room?: string;
  board?: string;
  rate?: string;
  currency?: string;
  voucherStatus?: string;
  cancellationStatus?: string;
};

const DEFAULT_SCENARIOS = [
  {
    id: "scenario-01",
    title: "Scenario 1 - Hotelbeds Accommodation booking funnel",
    destination: "To be selected after certification scenario review",
  },
  {
    id: "scenario-02",
    title: "Scenario 2 - Optional additional accommodation scenario",
    destination: "To be selected only if Hotelbeds requires it",
  },
];

function getTomorrow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function HotelsCertificationPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusPayload>({});
  const [reviewScenarios, setReviewScenarios] = useState<ReviewScenario[]>([]);
  const [states, setStates] = useState<Record<string, { loading?: boolean; message?: string }>>({});
  const isReviewMode = searchParams.get("review") === "1";

  useEffect(() => {
    if (isReviewMode) {
      fetch("/api/hotels/certification/review")
        .then((response) => response.json())
        .then((payload) => {
          if (payload.success) {
            setReviewScenarios(payload.scenarios || []);
          }
        })
        .catch(() => undefined);
      return;
    }

    fetch("/api/hotels/certification/status")
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setStatus(payload);
      })
      .catch(() => undefined);
  }, [isReviewMode]);

  const canAccess =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS === "true";

  const currentUsage = useMemo(() => status.requestUsage?.used ?? 0, [status]);

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 text-[#0F172A]">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center">
          <Badge variant="outline">Internal page</Badge>
          <h1 className="mt-4 text-2xl font-black">
            Hotelbeds Accommodation Certification is disabled in production
          </h1>
        </section>
      </main>
    );
  }

  async function runStep(scenarioId: string, step: string) {
    setStates((prev) => ({
      ...prev,
      [scenarioId]: { loading: true, message: undefined },
    }));

    try {
      if (step === "availability") {
        setStates((prev) => ({
          ...prev,
          [scenarioId]: {
            loading: false,
            message:
              "Availability button is wired for certification only. Select final scenario inputs before running to protect Hotelbeds quota.",
          },
        }));
        return;
      }

      await fetch("/api/hotels/certification/log", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId,
          step,
          data: {
            supplier: "hotelbeds-accommodation",
            note: "Step placeholder logged without calling Hotelbeds API.",
          },
        }),
      });

      setStates((prev) => ({
        ...prev,
        [scenarioId]: { loading: false, message: `${step} is ready.` },
      }));
    } catch {
      setStates((prev) => ({
        ...prev,
        [scenarioId]: { loading: false, message: "Unable to run certification step." },
      }));
    }
  }

  if (isReviewMode) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 text-[#0F172A]">
        <div className="mx-auto max-w-6xl space-y-6">
          <section>
            <Badge className="mb-3 bg-[#F97316] text-white">
              Review mode - logs only
            </Badge>
            <h1 className="text-3xl font-black">
              Hotelbeds Accommodation Certification Review
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              This mode reads final logs only. No Hotelbeds API, booking, or
              cancellation call is executed.
            </p>
          </section>

          {reviewScenarios.length === 0 ? (
            <Card className="rounded-[2rem]">
              <CardContent className="p-8 text-sm font-bold text-slate-500">
                No final successful Hotelbeds Accommodation certification logs
                are available yet.
              </CardContent>
            </Card>
          ) : (
            reviewScenarios.map((scenario) => (
              <Card
                key={scenario.scenario}
                className="rounded-[2rem]"
                data-certification-review-ready="true"
              >
                <CardHeader>
                  <CardTitle className="text-2xl font-black">
                    {scenario.title}
                  </CardTitle>
                  <Badge className="w-fit bg-emerald-600 text-white">
                    {scenario.status}
                  </Badge>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="outline">Confirmed</Badge>
                    <Badge variant="outline">Retrieved</Badge>
                    <Badge variant="outline">Generated</Badge>
                    <Badge variant="outline">Cancelled</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <Info label="Supplier" value="Hotelbeds Accommodation" />
                  <Info label="Booking reference" value={scenario.bookingReference} />
                  <Info label="Hotel" value={scenario.hotelName} />
                  <Info label="Destination" value={scenario.destination} />
                  <Info label="Check-in" value={scenario.checkIn} />
                  <Info label="Check-out" value={scenario.checkOut} />
                  <Info label="Room" value={scenario.room} />
                  <Info label="Board" value={scenario.board} />
                  <Info label="Rate" value={scenario.rate} />
                  <Info label="Currency" value={scenario.currency} />
                  <Info label="Voucher" value={scenario.voucherStatus} />
                  <Info label="Cancellation" value={scenario.cancellationStatus} />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 text-[#0F172A]">
      <div className="mx-auto max-w-6xl space-y-6">
        <section>
          <Badge className="mb-3 bg-red-600 text-white">Internal test only</Badge>
          <h1 className="text-3xl font-black">
            Hotelbeds Accommodation Certification
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-bold text-slate-500">
            لا يتم تنفيذ أي حجز عند فتح الصفحة. كل خطوة مستقلة، وأزرار
            Confirm Booking وCancel Booking مقفلة ما لم يتم تفعيل إعدادات
            الاختبار في بيئة dev/test.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Info label="Environment" value={status.environment || "development"} />
            <Info label="Search enabled" value={status.searchEnabled ? "Yes" : "No"} />
            <Info label="Booking enabled" value={status.bookingEnabled ? "Yes" : "No"} />
            <Info label="Requests used" value={`${currentUsage}/40`} />
          </div>
        </section>

        {DEFAULT_SCENARIOS.map((scenario) => {
          const state = states[scenario.id] || {};

          return (
            <Card key={scenario.id} className="rounded-[2rem]">
              <CardHeader>
                <CardTitle className="text-xl font-black">
                  {scenario.title}
                </CardTitle>
                <p className="text-sm font-bold text-slate-500">
                  {scenario.destination} | Suggested dates: {getTomorrow(35)} -{" "}
                  {getTomorrow(36)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button disabled={state.loading} onClick={() => runStep(scenario.id, "availability")}>Availability</Button>
                  <Button disabled={state.loading} variant="outline" onClick={() => runStep(scenario.id, "check-rate")}>Check Rate</Button>
                  <Button disabled={state.loading || !status.bookingEnabled} className="bg-[#F97316] text-white hover:bg-[#EA580C]" onClick={() => runStep(scenario.id, "booking-confirmation")}>Confirm Booking</Button>
                  <Button disabled={state.loading} variant="outline" onClick={() => runStep(scenario.id, "booking-details")}>Booking Details</Button>
                  <Button disabled={state.loading} variant="outline" onClick={() => runStep(scenario.id, "voucher")}>Voucher</Button>
                  <Button disabled={state.loading || !status.bookingEnabled} variant="outline" onClick={() => runStep(scenario.id, "cancel")}>Cancel Booking</Button>
                </div>
                {state.message ? (
                  <div className="rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-800">
                    {state.message}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-base font-black">{value || "-"}</p>
    </div>
  );
}
