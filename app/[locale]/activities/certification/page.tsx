"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ActivityBookingResponse,
  ActivityCertificationScenario,
  ActivityDetailsResponse,
  ActivitySearchResponse,
} from "@/types/activities";

type ScenarioState = {
  loading?: boolean;
  error?: string;
  search?: ActivitySearchResponse;
  details?: ActivityDetailsResponse;
  booking?: ActivityBookingResponse;
  voucherLogged?: boolean;
};

type CertificationStatus = {
  searchEnabled: boolean;
  bookingEnabled: boolean;
  environment: string;
  message: string;
};

type AnswerState = Record<string, Record<string, string>>;

const SCENARIOS: ActivityCertificationScenario[] = [
  {
    id: "barcelona-basic",
    name: "Test 1 - Barcelona / BCN basic booking funnel",
    destinationCode: "BCN",
    requiresCancel: true,
  },
  {
    id: "paris-session-language",
    name: "Test 2 - Paris / PAR with sessions and languages",
    destinationCode: "PAR",
    requiresSessionLanguage: true,
    requiresCancel: true,
  },
  {
    id: "madrid-pdf-voucher",
    name: "Test 3 - Madrid direct integration PDF voucher",
    destinationCode: "MAD",
    activityCode: "E-E10-MADTEST",
    requiresPdfVoucher: true,
    requiresCancel: true,
  },
  {
    id: "barcelona-questions",
    name: "Test 4 - Barcelona product with questions",
    destinationCode: "BCN",
    activityCode: "E-E10-A1AANO0485",
    requiresQuestions: true,
    requiresCancel: true,
  },
];

function nextMonthDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getScenarioActivityCode(scenario: ActivityCertificationScenario, state?: ScenarioState) {
  return scenario.activityCode || state?.search?.options?.[0]?.activityCode || "";
}

export default function ActivitiesCertificationPage() {
  const canAccess =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS === "true";
  const [states, setStates] = useState<Record<string, ScenarioState>>({});
  const [answers, setAnswers] = useState<AnswerState>({});
  const [status, setStatus] = useState<CertificationStatus>({
    searchEnabled: false,
    bookingEnabled: false,
    environment: "development",
    message: "Activities booking is enabled only for test/dev certification.",
  });

  useEffect(() => {
    fetch("/api/activities/certification/status")
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) {
          setStatus({
            searchEnabled: Boolean(payload.searchEnabled),
            bookingEnabled: Boolean(payload.bookingEnabled),
            environment: String(payload.environment || "development"),
            message: String(payload.message || ""),
          });
        }
      })
      .catch(() => undefined);
  }, []);

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 text-[#0F172A]">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center">
          <Badge variant="outline">Internal page</Badge>
          <h1 className="mt-4 text-2xl font-black">
            Hotelbeds Activities Certification is disabled in production
          </h1>
          <p className="mt-3 text-sm font-bold text-slate-500">
            هذه الصفحة مخصصة للاختبار الداخلي فقط ولا تظهر للعملاء في الإنتاج.
          </p>
        </div>
      </main>
    );
  }

  async function writeSafeLog(
    scenarioId: string,
    step: string,
    data: Record<string, unknown>,
  ) {
    await fetch("/api/activities/certification/log", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId, step, data }),
    }).catch(() => undefined);
  }

  function getRequiredQuestions(scenarioId: string) {
    const questions = states[scenarioId]?.details?.questions || [];
    return questions.filter((question) => question.required);
  }

  function getScenarioAnswers(scenarioId: string) {
    return answers[scenarioId] || {};
  }

  async function runScenarioStep(
    scenario: ActivityCertificationScenario,
    step: "search" | "details" | "book" | "details-booking" | "voucher" | "cancel",
  ) {
    setStates((prev) => ({
      ...prev,
      [scenario.id]: { ...prev[scenario.id], loading: true, error: undefined },
    }));

    try {
      const current = states[scenario.id];
      let nextState: ScenarioState = {};

      if (step === "search") {
        const response = await fetch("/api/activities/search", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationCode: scenario.destinationCode,
            from: nextMonthDate(30),
            to: nextMonthDate(32),
            adults: 1,
            childrenAges: [],
            language: "en",
            pagination: { page: 1, itemsPerPage: 10 },
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || payload.error);
        nextState = { search: payload.data };
        await writeSafeLog(scenario.id, "search", {
          success: true,
          destinationCode: scenario.destinationCode,
          optionCount: payload.data?.options?.length || 0,
          firstActivityCode: payload.data?.options?.[0]?.activityCode,
        });
      }

      if (step === "details") {
        const activityCode = getScenarioActivityCode(scenario, current);
        if (!activityCode) throw new Error("Run search first or configure activityCode.");
        const response = await fetch("/api/activities/details", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            activityCode,
            destinationCode: scenario.destinationCode,
            from: nextMonthDate(30),
            to: nextMonthDate(32),
            language: "en",
            paxes: [{ age: 30 }],
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || payload.error);
        nextState = { details: payload.data };
        await writeSafeLog(scenario.id, "details-check-rate", {
          success: true,
          activityCode: payload.data?.activityCode,
          name: payload.data?.name,
          modalityCount: payload.data?.modalities?.length || 0,
          questionCount: payload.data?.questions?.length || 0,
          requiredQuestionCount:
            payload.data?.questions?.filter?.((question: { required?: boolean }) => question.required)
              ?.length || 0,
          sessionCount: payload.data?.sessions?.length || 0,
          languageCount: payload.data?.languages?.length || 0,
          hasImages: Boolean(payload.data?.images?.length),
        });
      }

      if (step === "book") {
        if (!status.bookingEnabled) {
          throw new Error("Activities booking is disabled. Enable HOTELBEDS_ACTIVITIES_BOOKING_ENABLED=true in dev/test only.");
        }

        const rateKey = current?.details?.modalities?.[0]?.rates?.[0]
          ? JSON.stringify(current.details.modalities[0].rates[0]).match(/"rateKey":"([^"]+)"/)?.[1]
          : "";
        if (!rateKey) throw new Error("Run Details / Check Rate and select a rateKey first.");

        const requiredQuestions = getRequiredQuestions(scenario.id);
        const scenarioAnswers = getScenarioAnswers(scenario.id);
        const missingAnswers = requiredQuestions.filter(
          (question) => !scenarioAnswers[question.code]?.trim(),
        );
        if (missingAnswers.length > 0) {
          throw new Error("Required questions must be answered before Confirm Booking.");
        }

        const response = await fetch("/api/activities/book", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            clientReference: `HOTLENO-ACT-${Date.now()}`,
            holder: {
              title: "Mr",
              name: "TEST",
              surname: "CERTIFICATION",
              email: "certification-test@hotleno.com",
              telephones: ["+966500000000"],
            },
            activities: [
              {
                rateKey,
                from: nextMonthDate(30),
                to: nextMonthDate(32),
                session: current?.details?.sessions?.[0]?.code,
                language: current?.details?.languages?.[0],
                paxes: [{ age: 30, name: "TEST", surname: "CERTIFICATION" }],
                answers: requiredQuestions.map((question) => ({
                  question,
                  answer: scenarioAnswers[question.code],
                })),
              },
            ],
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || payload.error);
        nextState = { booking: payload.data };
        await writeSafeLog(scenario.id, "booking-confirmation", {
          success: true,
          bookingReference: payload.data?.bookingReference,
          status: payload.data?.status,
          clientReference: payload.data?.clientReference,
          hasVoucher: Boolean(payload.data?.voucher),
          hasOfficialVoucher: Boolean(payload.data?.voucher?.officialVouchers?.length),
        });
      }

      if (step === "details-booking") {
        if (!current?.booking?.bookingReference) throw new Error("Booking reference is required.");
        const response = await fetch("/api/activities/booking-details", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ bookingReference: current.booking.bookingReference, language: "en" }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || payload.error);
        nextState = { booking: payload.data };
        await writeSafeLog(scenario.id, "booking-details", {
          success: true,
          bookingReference: payload.data?.bookingReference,
          status: payload.data?.status,
          hasVoucher: Boolean(payload.data?.voucher),
          hasOfficialVoucher: Boolean(payload.data?.voucher?.officialVouchers?.length),
        });
      }

      if (step === "voucher") {
        if (!current?.booking?.voucher) throw new Error("Run Booking Details first to load voucher data.");
        await writeSafeLog(scenario.id, "voucher", {
          success: true,
          bookingReference: current.booking.bookingReference,
          hasOfficialVoucher: Boolean(current.booking.voucher.officialVouchers?.length),
          officialVoucherCount: current.booking.voucher.officialVouchers?.length || 0,
          internalVoucherAvailable: !current.booking.voucher.officialVouchers?.length,
          activityName: current.booking.voucher.activityName,
          selectedSession: current.booking.voucher.selectedSession,
          selectedLanguage: current.booking.voucher.selectedLanguage,
        });
        nextState = { voucherLogged: true };
      }

      if (step === "cancel") {
        if (!status.bookingEnabled) {
          throw new Error("Activities cancellation is disabled. Enable HOTELBEDS_ACTIVITIES_BOOKING_ENABLED=true in dev/test only.");
        }
        if (!current?.booking?.bookingReference) throw new Error("Booking reference is required.");
        const response = await fetch("/api/activities/cancel", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ bookingReference: current.booking.bookingReference, language: "en" }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || payload.error);
        nextState = { booking: payload.data };
        await writeSafeLog(scenario.id, "cancellation", {
          success: true,
          bookingReference: payload.data?.bookingReference,
          status: payload.data?.status,
        });
      }

      setStates((prev) => ({
        ...prev,
        [scenario.id]: { ...prev[scenario.id], ...nextState, loading: false },
      }));
    } catch (error) {
      setStates((prev) => ({
        ...prev,
        [scenario.id]: {
          ...prev[scenario.id],
          loading: false,
          error: error instanceof Error ? error.message : "Certification step failed.",
        },
      }));
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 text-[#0F172A]">
      <div className="mx-auto max-w-6xl space-y-6">
        <section>
          <Badge className="mb-3 bg-red-600 text-white">Internal test only</Badge>
          <h1 className="text-3xl font-black">Hotelbeds Activities Certification</h1>
          <p className="mt-2 max-w-3xl text-sm font-bold text-slate-500">
            لا يتم تنفيذ أي حجز عند فتح الصفحة. كل خطوة تحتاج ضغط زر واضح، والحجز مقفول إذا
            كان HOTELBEDS_ACTIVITIES_BOOKING_ENABLED=false.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-800">
            {status.message} الحالة الحالية: Search{" "}
            {status.searchEnabled ? "enabled" : "disabled"} / Booking{" "}
            {status.bookingEnabled ? "enabled" : "disabled"} / Environment{" "}
            {status.environment}
          </div>
        </section>

        {SCENARIOS.map((scenario) => {
          const state = states[scenario.id] || {};

          return (
            <Card key={scenario.id} className="rounded-[2rem]">
              <CardHeader>
                <CardTitle className="text-xl font-black">{scenario.name}</CardTitle>
                <p className="text-sm font-bold text-slate-500">
                  Destination: {scenario.destinationCode}
                  {scenario.activityCode ? ` | Activity: ${scenario.activityCode}` : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button disabled={state.loading} onClick={() => runScenarioStep(scenario, "search")}>Search product</Button>
                  <Button disabled={state.loading} variant="outline" onClick={() => runScenarioStep(scenario, "details")}>Detail / Check Rate</Button>
                  <Button disabled={state.loading || !status.bookingEnabled} className="bg-[#F97316] text-white hover:bg-[#EA580C]" onClick={() => runScenarioStep(scenario, "book")}>Confirm Booking</Button>
                  <Button disabled={state.loading} variant="outline" onClick={() => runScenarioStep(scenario, "details-booking")}>Booking detail / voucher</Button>
                  <Button disabled={state.loading} variant="outline" onClick={() => runScenarioStep(scenario, "voucher")}>Voucher</Button>
                  <Button disabled={state.loading || !status.bookingEnabled} variant="outline" onClick={() => runScenarioStep(scenario, "cancel")}>Cancel Booking</Button>
                </div>

                {state.error ? (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
                    {state.error}
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-4">
                  <Info label="Search results" value={state.search?.options?.length} />
                  <Info label="Details modalities" value={state.details?.modalities?.length} />
                  <Info label="Questions" value={state.details?.questions?.length} />
                  <Info label="Booking status" value={state.booking?.status} />
                </div>

                {scenario.requiresSessionLanguage ? (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold text-sky-800">
                    هذا السيناريو يتطلب منتجًا يحتوي sessions و languages. بعد Details / Check Rate
                    يتم اختيار أول session/language متاحين لأغراض الشهادة.
                  </div>
                ) : null}

                {scenario.requiresPdfVoucher ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                    هذا السيناريو يجب أن يستخدم PDF voucher الرسمي من Hotelbeds إذا عاد ضمن vouchers[].
                  </div>
                ) : null}

                {state.details?.questions?.length ? (
                  <div className="space-y-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                    <p className="font-black text-orange-800">Questions</p>
                    {state.details.questions.map((question) => (
                      <label key={question.code} className="block text-sm font-bold text-slate-700">
                        {question.text || question.code}
                        {question.required ? " *" : ""}
                        <input
                          value={answers[scenario.id]?.[question.code] || ""}
                          onChange={(event) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [scenario.id]: {
                                ...(prev[scenario.id] || {}),
                                [question.code]: event.target.value,
                              },
                            }))
                          }
                          placeholder="Test certification answer"
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}

                {state.booking?.bookingReference ? (
                  <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-800">
                    Booking reference: {state.booking.bookingReference}
                  </p>
                ) : null}

                {state.booking?.voucher?.officialVouchers?.length ? (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-800">
                    PDF voucher الرسمي متاح:
                    <div className="mt-2 flex flex-wrap gap-2">
                      {state.booking.voucher.officialVouchers.map((voucher, index) =>
                        voucher.url ? (
                          <a
                            key={`${voucher.url}-${index}`}
                            href={voucher.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-emerald-700 px-3 py-2 text-white"
                          >
                            Open PDF Voucher {index + 1}
                          </a>
                        ) : null,
                      )}
                    </div>
                  </div>
                ) : state.booking?.voucher ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700">
                    لا يوجد PDF voucher رسمي في الرد الحالي. سيتم استخدام activity-voucher الداخلي للعرض.
                    {state.voucherLogged ? " تم تسجيل معلومات الفاتشر." : ""}
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
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black">{value ?? "-"}</p>
    </div>
  );
}
