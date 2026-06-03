"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  TransferBookingResponse,
  TransferCertificationRunResponse,
  TransferOption,
  TransferVoucher,
} from "@/types/transfers";

type ScenarioState = {
  loading?: boolean;
  error?: string;
  result?: TransferCertificationRunResponse;
  booking?: TransferBookingResponse;
  voucher?: TransferVoucher;
  cancellationStatus?: string;
};

type ReviewLocation = {
  label: string;
  code: string;
  type: string;
};

type ReviewService = {
  leg: number;
  serviceName: string;
  categoryName: string;
  direction: string;
  transferType: string;
  shortRateKey: string;
  price: {
    amount: number | null;
    currency: string;
  };
  pickup: ReviewLocation;
  dropoff: ReviewLocation;
  pickupDate: string;
  pickupTime: string;
  mustCheckPickupTime: boolean;
  checkPickup: {
    mustCheckPickupTime: boolean;
    url: string;
    hoursBeforeConsulting: number | null;
  } | null;
  pickupDescription: string;
  optionalExtras: Array<{
    code: string;
    name: string;
    amount: number | null;
  }>;
};

type ReviewScenario = {
  id: string;
  title: string;
  supplier: string;
  selectedServices: ReviewService[];
  booking: {
    reference: string;
    status: string;
    clientReference: string;
    creationDate: string;
    currency: string;
  };
  cancellation: {
    reference: string;
    status: string;
  } | null;
  bookedExtras: Array<{
    code: string;
    units: number | null;
  }>;
  voucher: {
    bookingReference: string;
    serviceName: string;
    routes: Array<{
      from: ReviewLocation;
      to: ReviewLocation;
    }>;
    passengerName: string;
    pickupInformation: string;
    pickupTime: string[];
    serviceDate: string[];
    currency: string;
    cancellationPolicy: Array<{
      amount?: number;
      from?: string;
      currencyId?: string;
    }>;
    paymentNote: string;
  };
};

type ReviewPayload = {
  success?: boolean;
  scenarios?: ReviewScenario[];
};

const SCENARIOS = [
  {
    id: "departure-sistina-cia",
    title: "DEPARTURE service only",
    description: "Hotel Sistina ATLAS/5643 -> Rome Ciampino Airport IATA/CIA",
    cancel: true,
    focus: "mustCheckPickupTime=true",
  },
  {
    id: "roundtrip-barcelona-port",
    title: "Round Trip ARRIVAL + DEPARTURE",
    description: "Hotel Barcelona Universal ATLAS/57 <-> Port of Barcelona PORT/BCNP",
    cancel: true,
    focus: "Fallback تشخيصي إلى PORT/277 عند رفض BCNP",
  },
  {
    id: "arrival-hilton-sants",
    title: "ARRIVAL service only",
    description: "Hotel Hilton Barcelona ATLAS/651 -> Sants Terminal STATION/BCNE",
    cancel: false,
    focus: "Fallback تشخيصي إلى STATION/930 عند رفض BCNE",
  },
  {
    id: "extras-universal-bcn",
    title: "Service + Optional Extras",
    description: "Hotel Barcelona Universal ATLAS/57 -> Barcelona El Prat Airport IATA/BCN",
    cancel: true,
    focus: "اختيار optional extra واحد على الأقل",
  },
];

const REVIEW_STEPS = {
  "scenario-01-availability": {
    scenarioId: "scenario-01",
    title: "Scenario 1 - Availability",
    status: "Success",
    serviceIndex: 0,
  },
  "scenario-01-booking-confirmed": {
    scenarioId: "scenario-01",
    title: "Scenario 1 - Booking Confirmed",
    status: "Confirmed",
    serviceIndex: 0,
  },
  "scenario-01-voucher": {
    scenarioId: "scenario-01",
    title: "Scenario 1 - Voucher",
    status: "Voucher generated",
    serviceIndex: 0,
  },
  "scenario-01-cancelled": {
    scenarioId: "scenario-01",
    title: "Scenario 1 - Cancelled",
    status: "Cancelled",
    serviceIndex: 0,
  },
  "scenario-02-availability-leg-1": {
    scenarioId: "scenario-02",
    title: "Scenario 2 - Availability Leg 1",
    status: "Success",
    serviceIndex: 0,
  },
  "scenario-02-availability-leg-2": {
    scenarioId: "scenario-02",
    title: "Scenario 2 - Availability Leg 2",
    status: "Success",
    serviceIndex: 1,
  },
  "scenario-02-booking-confirmed": {
    scenarioId: "scenario-02",
    title: "Scenario 2 - Booking Confirmed",
    status: "Confirmed",
    serviceIndex: 0,
  },
  "scenario-02-voucher": {
    scenarioId: "scenario-02",
    title: "Scenario 2 - Voucher",
    status: "Voucher generated",
    serviceIndex: 0,
  },
  "scenario-02-cancelled": {
    scenarioId: "scenario-02",
    title: "Scenario 2 - Cancelled",
    status: "Cancelled",
    serviceIndex: 0,
  },
  "scenario-03-availability": {
    scenarioId: "scenario-03",
    title: "Scenario 3 - Availability",
    status: "Success",
    serviceIndex: 0,
  },
  "scenario-03-booking-confirmed": {
    scenarioId: "scenario-03",
    title: "Scenario 3 - Booking Confirmed",
    status: "Confirmed",
    serviceIndex: 0,
  },
  "scenario-03-voucher": {
    scenarioId: "scenario-03",
    title: "Scenario 3 - Voucher",
    status: "Voucher generated",
    serviceIndex: 0,
  },
  "scenario-04-availability-with-extra": {
    scenarioId: "scenario-04",
    title: "Scenario 4 - Availability With Optional Extra",
    status: "Success",
    serviceIndex: 0,
  },
  "scenario-04-booking-confirmed": {
    scenarioId: "scenario-04",
    title: "Scenario 4 - Booking Confirmed",
    status: "Confirmed",
    serviceIndex: 0,
  },
  "scenario-04-voucher": {
    scenarioId: "scenario-04",
    title: "Scenario 4 - Voucher",
    status: "Voucher generated",
    serviceIndex: 0,
  },
  "scenario-04-cancelled": {
    scenarioId: "scenario-04",
    title: "Scenario 4 - Cancelled",
    status: "Cancelled",
    serviceIndex: 0,
  },
} satisfies Record<
  string,
  { scenarioId: string; title: string; status: string; serviceIndex: number }
>;

async function postCertification(
  scenarioId: string,
  mode: "availability" | "confirm" | "cancel",
  bookingReference?: string,
) {
  const response = await fetch("/api/transfers/certification/run", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scenarioId, mode, bookingReference }),
  });
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || payload.error || "Transfers certification failed.");
  }

  return payload.data as TransferCertificationRunResponse;
}

function getOptionSummary(option: TransferOption) {
  return [
    option.vehicle.name || option.vehicle.type,
    option.price.currency ? `${option.price.amount} ${option.price.currency}` : "",
    option.mustCheckPickupTime ? "mustCheckPickupTime=true" : "",
    option.optionalExtras?.length ? `extras: ${option.optionalExtras.length}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function VoucherView({ voucher }: { voucher?: TransferVoucher }) {
  if (!voucher) return null;

  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-slate-800">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge className="bg-[#F97316] text-white">Supplier: Hotelbeds Transfers</Badge>
        <Badge variant="outline">Voucher</Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <p><span className="font-black">Booking reference:</span> {voucher.bookingReference || "-"}</p>
        <p><span className="font-black">Client reference:</span> {voucher.clientReference || "-"}</p>
        <p><span className="font-black">Service:</span> {voucher.serviceName || "-"}</p>
        <p><span className="font-black">Vehicle:</span> {voucher.vehicleName || voucher.vehicleType || "-"}</p>
        <p><span className="font-black">Pickup:</span> {voucher.pickup?.name || "-"} / {voucher.pickup?.code || "-"}</p>
        <p><span className="font-black">Dropoff:</span> {voucher.dropoff?.name || "-"} / {voucher.dropoff?.code || "-"}</p>
        <p><span className="font-black">Pickup date/time:</span> {voucher.pickupDateTime || voucher.pickupTime || "-"}</p>
        <p><span className="font-black">mustCheckPickupTime:</span> {voucher.mustCheckPickupTime ? "true" : "false"}</p>
      </div>
      {voucher.checkPickupInfo ? (
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-xs">
          {voucher.checkPickupInfo}
        </p>
      ) : null}
      {voucher.optionalExtras?.length ? (
        <div className="mt-3">
          <p className="font-black">Optional extras</p>
          {voucher.optionalExtras.map((extra) => (
            <p key={extra.code} className="text-xs">{extra.code} - {extra.name || extra.description || "Extra"}</p>
          ))}
        </div>
      ) : null}
      <p className="mt-3 font-black">{voucher.paymentNote || "Booked and paid by HBX Group"}</p>
    </div>
  );
}

function LocationLine({
  label,
  location,
}: {
  label: string;
  location?: ReviewLocation;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-[#0F172A]">
        {location?.label || "-"}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-500">
        {location?.type || "-"} / {location?.code || "-"}
      </p>
    </div>
  );
}

function ReviewVoucher({ scenario }: { scenario: ReviewScenario }) {
  return (
    <div className="rounded-[1.75rem] border border-orange-200 bg-orange-50 p-6">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge className="bg-[#F97316] text-white">Voucher</Badge>
        <Badge variant="outline">Supplier: Hotelbeds Transfers</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <InfoTile label="Booking reference" value={scenario.voucher.bookingReference} />
        <InfoTile label="Passenger" value={scenario.voucher.passengerName} />
        <InfoTile label="Service" value={scenario.voucher.serviceName} />
        <InfoTile label="Pickup time" value={scenario.voucher.pickupTime.join(", ")} />
        <InfoTile label="Service date" value={scenario.voucher.serviceDate.join(", ")} />
        <InfoTile label="Currency" value={scenario.voucher.currency} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {scenario.voucher.routes.map((route, index) => (
          <div key={`${route.from.code}-${route.to.code}-${index}`} className="rounded-2xl bg-white p-4">
            <p className="mb-3 text-sm font-black text-slate-500">Route {index + 1}</p>
            <p className="font-black">
              {route.from.label} {"->"} {route.to.label}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {route.from.type}/{route.from.code} to {route.to.type}/{route.to.code}
            </p>
          </div>
        ))}
      </div>
      {scenario.voucher.cancellationPolicy.length ? (
        <div className="mt-5 rounded-2xl bg-white p-4">
          <p className="text-sm font-black text-slate-500">Cancellation policy</p>
          {scenario.voucher.cancellationPolicy.map((policy, index) => (
            <p key={`${policy.from}-${index}`} className="mt-2 text-sm font-bold text-[#0F172A]">
              Amount {policy.amount ?? "-"} {policy.currencyId || scenario.voucher.currency} from {policy.from || "-"}
            </p>
          ))}
        </div>
      ) : null}
      <p className="mt-5 rounded-2xl bg-white p-4 text-sm font-black text-[#0F172A]">
        {scenario.voucher.paymentNote || "Booked and paid by HBX Group"}
      </p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-[#0F172A]">{value || "-"}</p>
    </div>
  );
}

function CertificationReview({ shot }: { shot: string }) {
  const [payload, setPayload] = useState<ReviewPayload>({});
  const [loading, setLoading] = useState(true);
  const step =
    REVIEW_STEPS[shot as keyof typeof REVIEW_STEPS] ||
    REVIEW_STEPS["scenario-01-availability"];

  useEffect(() => {
    let cancelled = false;

    fetch("/api/transfers/certification/review")
      .then((response) => response.json())
      .then((data: ReviewPayload) => {
        if (!cancelled) setPayload(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const scenario = payload.scenarios?.find((item) => item.id === step.scenarioId);
  const service = scenario?.selectedServices[step.serviceIndex] || scenario?.selectedServices[0];
  const isVoucher = shot.endsWith("voucher");
  const isCancelled = shot.endsWith("cancelled");
  const isBooking = shot.endsWith("booking-confirmed");

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-8 text-[#0F172A]">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-950/10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="mb-3 bg-emerald-600 text-white">Test environment</Badge>
            <h1 className="text-3xl font-black tracking-normal">
              Hotelbeds Transfers Certification
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Website booking flow review from final certification logs only.
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Supplier: Hotelbeds Transfers
          </Badge>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-8 text-center font-black">
            Loading certification review...
          </div>
        ) : !scenario || !service ? (
          <div className="rounded-2xl bg-red-50 p-8 text-center font-black text-red-700">
            Review data was not found in the final logs.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-[1.75rem] bg-[#0F172A] p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-orange-200">{scenario.title}</p>
                  <h2 className="mt-2 text-3xl font-black">{step.title}</h2>
                </div>
                <Badge className="bg-[#F97316] text-white">{step.status}</Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InfoTile label="Booking reference" value={scenario.booking.reference} />
              <InfoTile label="Booking status" value={isCancelled ? scenario.cancellation?.status : scenario.booking.status} />
              <InfoTile label="Client reference" value={scenario.booking.clientReference} />
            </div>

            {isVoucher ? (
              <ReviewVoucher scenario={scenario} />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <LocationLine label="Pickup" location={service.pickup} />
                  <LocationLine label="Dropoff" location={service.dropoff} />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <InfoTile label="Selected service" value={service.serviceName} />
                  <InfoTile label="Category" value={service.categoryName} />
                  <InfoTile
                    label="Price"
                    value={
                      service.price.amount !== null
                        ? `${service.price.amount} ${service.price.currency}`
                        : "-"
                    }
                  />
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-normal text-slate-500">
                    Selected rateKey
                  </p>
                  <p className="mt-2 break-all text-sm font-black text-[#0F172A]">
                    {service.shortRateKey}
                  </p>
                </div>

                {service.checkPickup ? (
                  <div className="rounded-[1.75rem] border border-orange-200 bg-orange-50 p-5">
                    <p className="text-sm font-black text-[#F97316]">Check pickup information</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <InfoTile
                        label="mustCheckPickupTime"
                        value={service.checkPickup.mustCheckPickupTime ? "true" : "false"}
                      />
                      <InfoTile label="checkPickup.url" value={service.checkPickup.url} />
                      <InfoTile
                        label="hoursBeforeConsulting"
                        value={service.checkPickup.hoursBeforeConsulting}
                      />
                    </div>
                    {service.pickupDescription ? (
                      <p className="mt-4 line-clamp-6 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm font-semibold text-slate-700">
                        {service.pickupDescription}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {scenario.bookedExtras.length || service.optionalExtras.length ? (
                  <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-sm font-black text-emerald-700">Optional extra included</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {scenario.bookedExtras.map((extra) => (
                        <InfoTile
                          key={`${extra.code}-${extra.units}`}
                          label="Booked extra"
                          value={`${extra.code} x ${extra.units ?? 1}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {isBooking ? (
                  <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-xl font-black text-emerald-700">
                      Booking confirmed successfully
                    </p>
                    <p className="mt-2 text-sm font-bold text-emerald-800">
                      Reference {scenario.booking.reference} is from the final test logs.
                    </p>
                  </div>
                ) : null}

                {isCancelled && scenario.cancellation ? (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                    <p className="text-xl font-black text-[#0F172A]">
                      Cancellation status: {scenario.cancellation.status}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-500">
                      Reference {scenario.cancellation.reference} was cancelled in test environment.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default function TransfersCertificationPage() {
  const searchParams = useSearchParams();
  const isReview = searchParams.get("review") === "1";
  const shot = searchParams.get("shot") || "scenario-01-availability";
  const [states, setStates] = useState<Record<string, ScenarioState>>({});
  const canAccessCertification =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS === "true";

  if (!canAccessCertification) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 text-[#0F172A]">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center">
          <Badge variant="outline">Internal page</Badge>
          <h1 className="mt-4 text-2xl font-black">
            Hotelbeds Transfers Certification is disabled in production
          </h1>
          <p className="mt-3 text-sm font-bold text-slate-500">
            هذه الصفحة مخصصة للاختبار الداخلي فقط ولا تظهر للعملاء في الإنتاج.
          </p>
        </div>
      </main>
    );
  }

  if (isReview) {
    return <CertificationReview shot={shot} />;
  }

  const run = async (
    scenarioId: string,
    mode: "availability" | "confirm" | "cancel",
  ) => {
    const current = states[scenarioId];
    setStates((prev) => ({
      ...prev,
      [scenarioId]: { ...current, loading: true, error: undefined },
    }));

    try {
      const result = await postCertification(
        scenarioId,
        mode,
        current?.booking?.bookingReference,
      );

      setStates((prev) => ({
        ...prev,
        [scenarioId]: {
          ...prev[scenarioId],
          loading: false,
          result,
          booking: result.booking || prev[scenarioId]?.booking,
          voucher: result.voucher || result.booking?.voucher || prev[scenarioId]?.voucher,
          cancellationStatus:
            result.cancellation?.status || prev[scenarioId]?.cancellationStatus,
        },
      }));
    } catch (error) {
      setStates((prev) => ({
        ...prev,
        [scenarioId]: {
          ...prev[scenarioId],
          loading: false,
          error: error instanceof Error ? error.message : "Certification step failed.",
        },
      }));
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 text-[#0F172A]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Badge className="mb-3 bg-red-600 text-white">Test environment only</Badge>
          <h1 className="text-3xl font-black">Hotelbeds Transfers Certification</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600">
            صفحة داخلية لمراجعة سيناريوهات Hotelbeds Transfers. لا يتم تنفيذ أي حجز عند فتح الصفحة؛ الحجز يحدث فقط عند الضغط على Confirm Booking، ويجب أن يكون تفعيل الحجز في بيئة test فقط.
          </p>
        </div>

        <div className="grid gap-5">
          {SCENARIOS.map((scenario) => {
            const state = states[scenario.id] || {};
            const selectedOptions = state.result?.selectedOptions || [];

            return (
              <Card key={scenario.id} className="rounded-2xl border-slate-200">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-xl font-black">{scenario.title}</CardTitle>
                      <p className="mt-2 text-sm text-slate-600">{scenario.description}</p>
                      <p className="mt-1 text-xs font-bold text-orange-600">{scenario.focus}</p>
                    </div>
                    <Badge variant="outline">Supplier: Hotelbeds Transfers</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={state.loading} onClick={() => run(scenario.id, "availability")}>
                      Run Availability
                    </Button>
                    <Button
                      disabled={state.loading}
                      className="bg-[#F97316] text-white hover:bg-[#EA580C]"
                      onClick={() => run(scenario.id, "confirm")}
                    >
                      Confirm Booking
                    </Button>
                    {scenario.cancel ? (
                      <Button
                        disabled={state.loading || !state.booking?.bookingReference}
                        variant="outline"
                        onClick={() => run(scenario.id, "cancel")}
                      >
                        Cancel Booking
                      </Button>
                    ) : null}
                  </div>

                  {state.error ? (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
                      {state.error}
                    </div>
                  ) : null}

                  {selectedOptions.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="mb-2 font-black">Selected service / rateKey</p>
                      {selectedOptions.map((option, index) => (
                        <div key={`${option.rateKey || option.id}-${index}`} className="mb-3 rounded-xl bg-slate-50 p-3 text-xs">
                          <p className="font-bold">{getOptionSummary(option)}</p>
                          <p className="mt-1 break-all text-slate-500">{option.rateKey}</p>
                          <p className="mt-1">Pickup: {option.pickup.name} / {option.pickup.codeType}/{option.pickup.code}</p>
                          <p>Dropoff: {option.dropoff.name} / {option.dropoff.codeType}/{option.dropoff.code}</p>
                          {option.checkPickup?.description ? (
                            <p className="mt-2 whitespace-pre-wrap text-slate-600">{option.checkPickup.description}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {state.booking?.bookingReference ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-800">
                      Booking reference: {state.booking.bookingReference}
                    </div>
                  ) : null}

                  {state.cancellationStatus ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                      Cancellation status: {state.cancellationStatus}
                    </div>
                  ) : null}

                  <VoucherView voucher={state.voucher} />

                  {state.result?.debug ? (
                    <details className="rounded-2xl border border-slate-200 bg-white p-4">
                      <summary className="cursor-pointer text-sm font-black">Safe debug</summary>
                      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                        {JSON.stringify(state.result.debug, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
