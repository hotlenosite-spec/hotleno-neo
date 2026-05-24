"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  getTripPackageDraft,
  type TripPackageDraft,
  type TripPackageDraftItem,
} from "@/lib/smart-trip-planner/trip-package-draft";

const PENDING_TRIP_PACKAGE_PAYMENT_KEY = "hotleno.pendingTripPackagePayment";

function getDateLabel(dates: TripPackageDraft["dates"]) {
  return typeof dates === "string" ? dates : dates.label;
}

function formatMoney(value: number, currency: string, locale: string) {
  return `${value.toLocaleString(locale === "ar" ? "ar-SA" : "en-US")} ${currency}`;
}

function getCopy(locale: string) {
  const isAr = locale === "ar";

  return {
    back: isAr ? "العودة إلى مخطط الرحلة" : "Back to trip planner",
    title: isAr ? "مراجعة حزمة الرحلة" : "Review trip package",
    subtitle: isAr
      ? "راجع مكونات الرحلة قبل الدفع. هذه مسودة آمنة من Smart Trip Planner ولا تنشئ أي حجز نهائي الآن."
      : "Review the trip components before payment. This is a safe Smart Trip Planner draft and does not create a final booking yet.",
    missingTitle: isAr ? "لا توجد مسودة رحلة" : "No trip draft found",
    missingDescription: isAr
      ? "ارجع إلى Smart Trip Planner واختر مكونات الرحلة ثم اضغط احجز الآن."
      : "Return to Smart Trip Planner, choose your trip components, then select book now.",
    source: isAr ? "المصدر" : "Source",
    mode: isAr ? "نوع التخطيط" : "Planning mode",
    knownDestination: isAr ? "وجهة معروفة" : "Known destination",
    openDestination: isAr ? "وجهة مقترحة" : "Open destination",
    dates: isAr ? "التواريخ" : "Dates",
    travelers: isAr ? "المسافرون" : "Travelers",
    budget: isAr ? "الميزانية" : "Budget",
    total: isAr ? "الإجمالي" : "Total",
    interests: isAr ? "الاهتمامات" : "Interests",
    idempotency: isAr ? "مفتاح منع التكرار" : "Idempotency key",
    hotel: isAr ? "الفندق" : "Hotel",
    flight: isAr ? "الطيران" : "Flight",
    car: isAr ? "السيارة" : "Car",
    price: isAr ? "السعر" : "Price",
    duration: isAr ? "المدة" : "Duration",
    features: isAr ? "المميزات" : "Features",
    cancellationPolicy: isAr ? "سياسة الإلغاء" : "Cancellation policy",
    noItem: isAr ? "غير مختار" : "Not selected",
    warningTitle: isAr ? "تنبيه مهم قبل الدفع" : "Important before payment",
    warning: isAr
      ? "الأسعار والتوفر قد تتغير حتى إتمام الدفع والتأكيد النهائي. لا يتم تنفيذ أي حجز لدى الفندق أو الطيران أو السيارات من هذه الصفحة."
      : "Prices and availability may change until payment and final confirmation are completed. No hotel, flight, or car booking is executed from this page.",
    pay: isAr ? "الدفع" : "Payment",
    payButton: isAr ? "المتابعة إلى الدفع" : "Continue to payment",
    payDisabled: isAr
      ? "تم حفظ مسودة الدفع لهذه الرحلة. سيتم ربط الدفع الحقيقي لاحقًا عبر مسار الحجز الحالي."
      : "Payment draft saved for this trip. Real payment will be connected later through the existing booking flow.",
    draftOnly: isAr
      ? "زر الدفع الحالي يحفظ مسودة مراجعة فقط ولا يستدعي Stripe أو أي مورد."
      : "The current payment button only saves a review draft and does not call Stripe or any supplier.",
  };
}

export default function TripPackageCheckoutPage() {
  const locale = useLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [draft, setDraft] = useState<TripPackageDraft | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraft(getTripPackageDraft());
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function handlePaymentDraft() {
    if (!draft) return;

    const pendingPaymentDraft = {
      source: draft.source,
      mode: draft.mode,
      idempotencyKey: draft.idempotencyKey,
      totalPrice: draft.totalPrice,
      currency: draft.currency,
      createdAt: new Date().toISOString(),
    };

    sessionStorage.setItem(
      PENDING_TRIP_PACKAGE_PAYMENT_KEY,
      JSON.stringify(pendingPaymentDraft),
    );
    setPaymentNotice(copy.payDisabled);
  }

  if (!isReady) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="h-80 animate-pulse rounded-[32px] bg-white" />
        </div>
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-10">
        <section className="mx-auto max-w-3xl rounded-[32px] border border-[#E5E7EB] bg-white p-8 text-center shadow-xl shadow-slate-950/5">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl font-black text-[#F97316]">
            H
          </span>
          <h1 className="mt-5 text-3xl font-black text-[#0F172A]">{copy.missingTitle}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{copy.missingDescription}</p>
          <Link
            href={`/${locale}/smart-trip-planner`}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#F97316] px-6 text-sm font-black text-white transition hover:bg-[#ea580c]"
          >
            {copy.back}
          </Link>
        </section>
      </main>
    );
  }

  const selectedItems = [
    draft.selectedHotel,
    draft.selectedFlight,
    draft.selectedCar,
  ].filter((item): item is TripPackageDraftItem => Boolean(item));

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/${locale}/smart-trip-planner`}
          className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-black text-[#0F172A] transition hover:border-orange-200 hover:text-[#F97316]"
        >
          {copy.back}
        </Link>

        <section className="mt-5 overflow-hidden rounded-[34px] border border-[#E5E7EB] bg-white shadow-xl shadow-slate-950/5">
          <div className="relative bg-[#0F172A] px-6 py-10 text-white md:px-10">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-35"
              style={{ backgroundImage: "url('/hero2.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-[#F97316]/70 via-[#0F172A]/80 to-[#0F172A]/95" />
            <div className="relative max-w-3xl">
              <p className="text-sm font-black text-orange-100">Smart Trip Planner</p>
              <h1 className="mt-3 text-3xl font-black md:text-5xl">{copy.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px] lg:p-8">
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label={copy.mode} value={draft.mode === "known_destination" ? copy.knownDestination : copy.openDestination} />
                <SummaryCard label={copy.dates} value={getDateLabel(draft.dates)} />
                <SummaryCard label={copy.travelers} value={draft.travelers} />
                <SummaryCard label={copy.budget} value={formatMoney(draft.budget, draft.currency, locale)} />
              </div>

              <div className="rounded-[28px] border border-orange-100 bg-orange-50 p-5">
                <h2 className="text-lg font-black text-[#0F172A]">{copy.warningTitle}</h2>
                <p className="mt-2 text-sm leading-7 text-orange-900">{copy.warning}</p>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {selectedItems.map((item) => (
                  <TripPackageItemCard
                    key={item.type}
                    item={item}
                    label={copy[item.type]}
                    copy={copy}
                    locale={locale}
                    currency={draft.currency}
                  />
                ))}
              </div>
            </div>

            <aside className="h-fit rounded-[28px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
              <h2 className="text-xl font-black text-[#0F172A]">{copy.pay}</h2>
              <div className="mt-5 space-y-3 text-sm">
                <SummaryLine label={copy.source} value="smart_trip_planner" />
                <SummaryLine label={copy.total} value={formatMoney(draft.totalPrice, draft.currency, locale)} strong />
                <SummaryLine label={copy.idempotency} value={draft.idempotencyKey} mono />
              </div>

              {draft.interests.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-black text-slate-500">{copy.interests}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draft.interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {paymentNotice && (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-700">
                  {paymentNotice}
                </div>
              )}

              <button
                type="button"
                onClick={handlePaymentDraft}
                className="mt-5 h-13 w-full rounded-2xl bg-[#F97316] px-6 text-base font-black text-white shadow-xl shadow-orange-500/20 transition hover:bg-[#ea580c]"
              >
                {copy.payButton}
              </button>
              <p className="mt-3 text-center text-xs leading-6 text-slate-500">{copy.draftOnly}</p>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-black leading-6 text-[#0F172A]">{value}</p>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span
        className={`text-left font-black text-[#0F172A] ${strong ? "text-lg" : ""} ${
          mono ? "max-w-[170px] break-all font-mono text-[11px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TripPackageItemCard({
  item,
  label,
  copy,
  locale,
  currency,
}: {
  item: TripPackageDraftItem;
  label: string;
  copy: ReturnType<typeof getCopy>;
  locale: string;
  currency: string;
}) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm">
      <div
        className="relative h-40 bg-cover bg-center"
        style={{ backgroundImage: `url(${item.image || "/hero1.jpg"})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
        <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#F97316]">
          {label}
        </span>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-lg font-black leading-7 text-[#0F172A]">{item.name}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600">
            <span>{copy.price}: {formatMoney(item.price, currency, locale)}</span>
            {item.duration && (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>{copy.duration}: {item.duration}</span>
              </>
            )}
          </div>
        </div>

        {item.features && item.features.length > 0 && (
          <div>
            <p className="text-xs font-black text-slate-500">{copy.features}</p>
            <div className="mt-2 space-y-2">
              {item.features.map((feature) => (
                <p key={feature} className="flex gap-2 text-sm leading-6 text-slate-600">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F97316]" />
                  <span>{feature}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <p className="text-xs font-black text-slate-500">{copy.cancellationPolicy}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{item.cancellationPolicy}</p>
        </div>
      </div>
    </article>
  );
}
