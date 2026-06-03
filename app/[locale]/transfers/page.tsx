"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TransferLocation,
  TransferLocationCodeType,
  TransferOption,
  TransferSearchRequest,
  TransferSearchResponse,
} from "@/types/transfers";

type SearchState = "idle" | "loading" | "success" | "error";
type TripType = "one-way" | "round-trip";

type TransfersApiResponse = {
  success: boolean;
  data?: TransferSearchResponse;
  error?: string;
  message?: string;
};

type LocationApiResponse = {
  success: boolean;
  suggestions?: Array<{
    label: string;
    code: string;
    type: "terminal" | "hotel" | "destination";
    codeType?: TransferLocationCodeType;
    subType?: string;
    countryCode?: string;
    destinationCode?: string;
  }>;
  error?: string;
  message?: string;
};

const locationTypes: Array<{ value: TransferLocationCodeType; label: string }> = [
  { value: "IATA", label: "مطار IATA" },
  { value: "ATLAS", label: "فندق / منطقة ATLAS" },
  { value: "GPS", label: "إحداثيات GPS" },
  { value: "PORT", label: "ميناء" },
  { value: "STATION", label: "محطة" },
];

function formatPrice(option: TransferOption) {
  if (!option.price.currency) return "السعر غير متوفر";
  return `${option.price.amount.toFixed(2)} ${option.price.currency}`;
}

function getCancellationText(option: TransferOption) {
  const policy = option.cancellationPolicies?.[0];

  if (!policy) return "سياسة الإلغاء غير متوفرة من المورد";

  if (policy.amount !== undefined && policy.currency) {
    return `رسوم ${policy.amount} ${policy.currency} ابتداءً من ${policy.from || "وقت غير محدد"}`;
  }

  return policy.description || "سياسة الإلغاء متوفرة ضمن بيانات المورد";
}

function getLocationTypeLabel(location: TransferLocation) {
  if (location.subType === "hotel" || location.type === "hotel") return "فندق";
  if (location.subType === "airport" || location.type === "airport") return "مطار";
  if (location.subType === "port" || location.type === "port") return "ميناء";
  if (location.subType === "station" || location.type === "station") return "محطة";
  return "موقع";
}

function VehicleImage({ option }: { option: TransferOption }) {
  if (!option.vehicle.imageUrl) {
    return (
      <div className="mb-4 flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
        لا توجد صورة متاحة من المورد
      </div>
    );
  }

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
      <Image
        src={option.vehicle.imageUrl}
        alt={option.vehicle.name || "Hotelbeds transfer vehicle"}
        width={640}
        height={320}
        unoptimized
        className="h-40 w-full object-cover"
      />
    </div>
  );
}

function SelectedLocationPreview({ location }: { location: TransferLocation | null }) {
  if (!location) return null;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
      <span className="font-black">تم اختيار: </span>
      <span>{location.name}</span>
      <span className="mx-2">•</span>
      <span>{getLocationTypeLabel(location)}</span>
      <span className="mx-2">•</span>
      <span>
        {location.codeType || "CODE"} / {location.code}
      </span>
    </div>
  );
}

function LocationSuggestions({
  query,
  selected,
  onSelect,
}: {
  query: string;
  selected: TransferLocation | null;
  onSelect: (location: TransferLocation | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<TransferLocation[]>([]);
  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    if (query.trim().length < 2 || selected?.name === query) {
      setLocations([]);
      setLocalMessage("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setLocalMessage("");

      try {
        const response = await fetch(
          `/api/transfers/locations/search?query=${encodeURIComponent(query)}`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );
        const payload = (await response.json()) as LocationApiResponse;

        if (!payload.success) {
          setLocations([]);
          setLocalMessage(
            payload.message ||
              "تعذر جلب مواقع النقل من Hotelbeds Transfers مؤقتًا.",
          );
          return;
        }

        const nextLocations = (payload.suggestions || []).map((suggestion) => ({
          name: suggestion.label,
          code: suggestion.code,
          codeType:
            suggestion.codeType ||
            (suggestion.type === "terminal" ? "IATA" : "ATLAS"),
          type:
            suggestion.type === "terminal"
              ? suggestion.subType === "port"
                ? "port"
                : suggestion.subType === "station"
                  ? "station"
                  : "airport"
              : suggestion.type === "hotel"
                ? "hotel"
                : "other",
          subType: suggestion.subType,
          countryCode: suggestion.countryCode,
          destinationCode: suggestion.destinationCode,
        })) satisfies TransferLocation[];

        setLocations(nextLocations);
        if (nextLocations.length === 0) setLocalMessage("لا توجد مواقع نقل مطابقة.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLocations([]);
        setLocalMessage("تعذر جلب مواقع النقل الآن.");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, selected]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
        جاري البحث عن مواقع النقل...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {locations.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {locations.map((location) => (
            <button
              key={`${location.code}-${location.name}-${location.codeType}-${location.subType}`}
              type="button"
              className="block w-full border-b border-slate-100 px-4 py-3 text-start text-sm transition last:border-b-0 hover:bg-orange-50"
              onClick={() => {
                onSelect(location);
                setLocations([]);
                setLocalMessage("");
              }}
            >
              <span className="font-bold text-slate-950">{location.name}</span>
              <span className="mt-1 block text-xs text-slate-500">
                {getLocationTypeLabel(location)} • {location.codeType || "CODE"} /{" "}
                {location.code}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {localMessage ? (
        <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
          {localMessage}
        </p>
      ) : null}
    </div>
  );
}

function buildSelectedPayload(option: TransferOption, request: TransferSearchRequest) {
  return {
    option,
    request,
    selectedAt: new Date().toISOString(),
  };
}

export default function TransfersPage() {
  const locale = useLocale();
  const router = useRouter();
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromLocation, setFromLocation] = useState<TransferLocation | null>(null);
  const [toLocation, setToLocation] = useState<TransferLocation | null>(null);
  const [tripType, setTripType] = useState<TripType>("one-way");
  const [pickupDateTime, setPickupDateTime] = useState("");
  const [returnDateTime, setReturnDateTime] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [bags, setBags] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pickupCode, setPickupCode] = useState("");
  const [dropoffCode, setDropoffCode] = useState("");
  const [pickupType, setPickupType] = useState<TransferLocationCodeType>("IATA");
  const [dropoffType, setDropoffType] = useState<TransferLocationCodeType>("ATLAS");
  const [status, setStatus] = useState<SearchState>("idle");
  const [message, setMessage] = useState(
    "اختر نقطة الانطلاق والوجهة من Hotelbeds Transfers ثم ابحث عن الخيارات المتاحة.",
  );
  const [options, setOptions] = useState<TransferOption[]>([]);
  const [lastRequest, setLastRequest] = useState<TransferSearchRequest | null>(null);

  const language = useMemo(() => (locale === "ar" ? "ar" : "en"), [locale]);

  function buildLocation(
    selected: TransferLocation | null,
    fallbackName: string,
    fallbackCode: string,
    fallbackType: TransferLocationCodeType,
  ): TransferLocation | null {
    if (selected?.code && selected.codeType) {
      return {
        ...selected,
        code: selected.code.trim(),
        codeType: selected.codeType,
        name: selected.name?.trim() || selected.code.trim(),
      };
    }

    if (!fallbackCode.trim()) return null;

    return {
      name: fallbackName.trim() || fallbackCode.trim(),
      code: fallbackCode.trim(),
      codeType: fallbackType,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const pickup = buildLocation(fromLocation, fromText, pickupCode, pickupType);
    const dropoff = buildLocation(toLocation, toText, dropoffCode, dropoffType);

    if (!pickup || !dropoff) {
      setStatus("error");
      setOptions([]);
      setMessage(
        "يرجى اختيار نقطة الانطلاق والوجهة من القائمة أو إدخال الأكواد من إعدادات المطور.",
      );
      return;
    }

    if (!pickupDateTime || (tripType === "round-trip" && !returnDateTime)) {
      setStatus("error");
      setOptions([]);
      setMessage("يرجى إدخال تاريخ ووقت الرحلة.");
      return;
    }

    const request: TransferSearchRequest = {
      pickup,
      dropoff,
      pickupDateTime,
      returnDateTime: tripType === "round-trip" ? returnDateTime : undefined,
      passengers: { adults, children, infants },
      luggage: { bags },
      language,
      metadata: { tripType },
    };

    setStatus("loading");
    setOptions([]);
    setLastRequest(request);
    setMessage(`جاري البحث عن النقل من ${pickup.name} إلى ${dropoff.name}...`);

    try {
      const response = await fetch("/api/transfers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(request),
      });
      const payload = (await response.json()) as TransfersApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || payload.error || "فشل البحث عن النقل.");
      }

      const result = payload.data;
      const nextOptions = result?.options || [];
      setOptions(nextOptions);
      setStatus("success");
      setMessage(
        result && !result.enabled
          ? "بحث Hotelbeds Transfers غير مفعل في هذه البيئة."
          : nextOptions.length > 0
            ? `تم العثور على ${nextOptions.length} خيار نقل.`
            : "لم يتم العثور على خدمات نقل مطابقة.",
      );
    } catch (error) {
      setStatus("error");
      setOptions([]);
      setMessage(error instanceof Error ? error.message : "فشل البحث عن النقل.");
    }
  }

  function chooseOption(option: TransferOption) {
    if (!lastRequest) return;
    sessionStorage.setItem(
      "hotleno-transfer-checkout",
      JSON.stringify(buildSelectedPayload(option, lastRequest)),
    );
    router.push(`/${locale}/transfers/checkout`);
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A]">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10 md:p-8">
          <Badge className="mb-4 bg-white/15 text-white hover:bg-white/20">
            Supplier: Hotelbeds Transfers
          </Badge>
          <h1 className="text-3xl font-black tracking-normal md:text-5xl">
            النقل من وإلى المطار
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 md:text-base">
            ابحث عن خدمات النقل بين المطارات والفنادق والمحطات، واختر الخدمة المناسبة قبل
            الانتقال إلى صفحة تفاصيل الحجز.
          </p>
        </section>

        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-950">
              بيانات البحث عن النقل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">من</label>
                <Input
                  value={fromText}
                  onChange={(event) => {
                    setFromText(event.target.value);
                    setFromLocation(null);
                  }}
                  placeholder="مثال: King Abdulaziz airport, Jeddah"
                  className="h-12 rounded-2xl bg-slate-50"
                />
                <LocationSuggestions query={fromText} selected={fromLocation} onSelect={(location) => {
                  setFromLocation(location);
                  setFromText(location?.name || "");
                }} />
                <SelectedLocationPreview location={fromLocation} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">إلى</label>
                <Input
                  value={toText}
                  onChange={(event) => {
                    setToText(event.target.value);
                    setToLocation(null);
                  }}
                  placeholder="مثال: Hotel or area in Jeddah"
                  className="h-12 rounded-2xl bg-slate-50"
                />
                <LocationSuggestions query={toText} selected={toLocation} onSelect={(location) => {
                  setToLocation(location);
                  setToText(location?.name || "");
                }} />
                <SelectedLocationPreview location={toLocation} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">نوع الرحلة</label>
                <Select value={tripType} onValueChange={(value) => setTripType(value as TripType)}>
                  <SelectTrigger className="h-12 rounded-2xl bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-way">ذهاب فقط</SelectItem>
                    <SelectItem value="round-trip">ذهاب وعودة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">تاريخ ووقت الذهاب</label>
                <Input value={pickupDateTime} onChange={(event) => setPickupDateTime(event.target.value)} type="datetime-local" className="h-12 rounded-2xl bg-slate-50" />
              </div>

              {tripType === "round-trip" ? (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">تاريخ ووقت العودة</label>
                  <Input value={returnDateTime} onChange={(event) => setReturnDateTime(event.target.value)} type="datetime-local" className="h-12 rounded-2xl bg-slate-50" />
                </div>
              ) : null}

              <InputBlock label="عدد البالغين" value={adults} min={1} onChange={setAdults} />
              <InputBlock label="عدد الأطفال" value={children} min={0} onChange={setChildren} />
              <InputBlock label="عدد الرضع" value={infants} min={0} onChange={setInfants} />
              <InputBlock label="عدد الحقائب" value={bags} min={0} onChange={setBags} />

              <div className="md:col-span-2">
                <button type="button" className="text-sm font-black text-[#F97316]" onClick={() => setShowAdvanced((value) => !value)}>
                  إعدادات متقدمة للمطور
                </button>
              </div>

              {showAdvanced ? (
                <div className="grid gap-4 rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 p-4 md:col-span-2 md:grid-cols-2">
                  <CodeField label="نوع كود الانطلاق" type={pickupType} setType={setPickupType} code={pickupCode} setCode={setPickupCode} />
                  <CodeField label="نوع كود الوجهة" type={dropoffType} setType={setDropoffType} code={dropoffCode} setCode={setDropoffCode} />
                </div>
              ) : null}

              <div className="flex items-end md:col-span-2">
                <Button type="submit" disabled={status === "loading"} className="h-12 rounded-2xl bg-[#F97316] px-8 font-black text-white hover:bg-[#EA580C]">
                  {status === "loading" ? "جاري البحث..." : "بحث النقل"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-dashed border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="mb-5">
              <Badge variant={status === "error" ? "destructive" : "secondary"}>
                {status === "loading" ? "جاري البحث" : status === "error" ? "تعذر البحث" : "نتائج النقل"}
              </Badge>
              <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
            </div>

            {options.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {options.map((option) => (
                  <article key={option.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                    <VehicleImage option={option} />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge className="mb-2 bg-orange-50 text-[#F97316] hover:bg-orange-50">
                          Supplier: Hotelbeds Transfers
                        </Badge>
                        <h2 className="text-lg font-black text-slate-950">
                          {option.vehicle.name || "خدمة نقل Hotelbeds"}
                        </h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          نوع السيارة: {option.vehicle.type || "غير محدد"}
                        </p>
                      </div>
                      <Badge className="bg-[#F97316] text-white hover:bg-[#F97316]">
                        {formatPrice(option)}
                      </Badge>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <p>الركاب: {option.vehicle.maxPassengers || "غير محدد"}</p>
                      <p>الحقائب: {option.vehicle.maxBags || "غير متوفر"}</p>
                      <p>من: {option.pickup.name}</p>
                      <p>إلى: {option.dropoff.name}</p>
                      <p className="sm:col-span-2">سياسة الإلغاء: {getCancellationText(option)}</p>
                    </div>

                    {option.mustCheckPickupTime ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                        وقت الالتقاط يحتاج تأكيد من المورد. يرجى مراجعة تعليمات checkPickup قبل موعد الرحلة.
                        {option.checkPickup?.url ? (
                          <span className="mt-1 block">
                            رابط التأكيد: {option.checkPickup.url}
                            {option.checkPickup.hoursBeforeConsulting
                              ? ` قبل الرحلة بـ ${option.checkPickup.hoursBeforeConsulting} ساعة`
                              : ""}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {option.optionalExtras?.length ? (
                      <p className="mt-4 text-sm font-bold text-emerald-700">
                        تتوفر إضافات اختيارية يمكن تحديدها في صفحة تفاصيل الخدمة.
                      </p>
                    ) : null}

                    <Button className="mt-5 h-11 rounded-2xl bg-[#0F172A] px-6 font-black text-white hover:bg-slate-800" onClick={() => chooseOption(option)}>
                      اختيار الخدمة
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center gap-3 text-center">
                <h2 className="text-2xl font-black text-slate-950">لا توجد نتائج معروضة الآن</h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600">
                  ابدأ بالبحث عن موقع الانطلاق والوجهة من Hotelbeds Transfers. لا يتم استخدام بيانات وهمية أو قوائم ثابتة.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function InputBlock({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <Input value={value} onChange={(event) => onChange(Number(event.target.value))} type="number" min={min} className="h-12 rounded-2xl bg-slate-50" />
    </div>
  );
}

function CodeField({
  label,
  type,
  setType,
  code,
  setCode,
}: {
  label: string;
  type: TransferLocationCodeType;
  setType: (value: TransferLocationCodeType) => void;
  code: string;
  setCode: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">{label}</label>
        <Select value={type} onValueChange={(value) => setType(value as TransferLocationCodeType)}>
          <SelectTrigger className="h-12 rounded-2xl bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locationTypes.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">الكود</label>
        <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="رمز Hotelbeds Transfers" className="h-12 rounded-2xl bg-white" />
      </div>
    </div>
  );
}
