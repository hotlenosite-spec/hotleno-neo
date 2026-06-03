"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  ActivityDestinationSuggestion,
  ActivityOption,
  ActivitySearchResponse,
} from "@/types/activities";

type SearchState = "idle" | "loading" | "success" | "error";

type DestinationSearchResponse = {
  success: boolean;
  suggestions?: ActivityDestinationSuggestion[];
  error?: string;
};

type ActivitySearchApiResponse = {
  success: boolean;
  data?: ActivitySearchResponse;
  message?: string;
  error?: string;
};

function formatPrice(option: ActivityOption) {
  if (!option.price.currency) return "السعر غير متوفر";
  return `${option.price.amount.toFixed(2)} ${option.price.currency}`;
}

function formatList(values?: string[]) {
  return values && values.length > 0 ? values.slice(0, 3).join("، ") : "غير متوفر";
}

function parseChildrenAges(value: string) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((age) => Number.isFinite(age) && age >= 0 && age <= 17);
}

export default function ActivitiesPage() {
  const locale = useLocale();
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destination, setDestination] =
    useState<ActivityDestinationSuggestion | null>(null);
  const [destinationSuggestions, setDestinationSuggestions] = useState<
    ActivityDestinationSuggestion[]
  >([]);
  const [destinationMessage, setDestinationMessage] = useState(
    "اكتب اسم الوجهة مثل Istanbul أو رمزها للبحث في Hotelbeds Activities.",
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [adults, setAdults] = useState(2);
  const [childrenAges, setChildrenAges] = useState("");
  const [status, setStatus] = useState<SearchState>("idle");
  const [message, setMessage] = useState("اختر وجهة وتواريخ البحث لعرض الأنشطة.");
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityOption | null>(null);

  useEffect(() => {
    if (destinationQuery.trim().length < 2 || destination?.label === destinationQuery) {
      setDestinationSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/activities/destinations/search?query=${encodeURIComponent(destinationQuery)}`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );
        const payload = (await response.json()) as DestinationSearchResponse;

        if (!response.ok || !payload.success) {
          setDestinationSuggestions([]);
          setDestinationMessage("بحث الأنشطة غير مفعل في هذه البيئة أو تعذر جلب الوجهات.");
          return;
        }

        const suggestions = payload.suggestions || [];
        setDestinationSuggestions(suggestions);
        setDestinationMessage(
          suggestions.length > 0 ? "اختر الوجهة من القائمة." : "لا توجد وجهات مطابقة.",
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDestinationSuggestions([]);
        setDestinationMessage("تعذر جلب وجهات الأنشطة من Hotelbeds مؤقتًا.");
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [destination, destinationQuery]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!destination || !from || !to || adults < 1) {
      setStatus("error");
      setOptions([]);
      setMessage("يرجى اختيار الوجهة من القائمة وإدخال التواريخ وعدد المسافرين.");
      return;
    }

    setStatus("loading");
    setOptions([]);
    setSelectedActivity(null);
    setMessage("جاري البحث عن الأنشطة...");

    try {
      const response = await fetch("/api/activities/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          countryCode: destination.countryCode,
          destinationCode: destination.destinationCode,
          from,
          to,
          adults,
          childrenAges: parseChildrenAges(childrenAges),
          language: "en",
          pagination: {
            page: 1,
            itemsPerPage: 20,
          },
        }),
      });
      const payload = (await response.json()) as ActivitySearchApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "تعذر البحث عن الأنشطة من Hotelbeds.");
      }

      const result = payload.data;
      const nextOptions = result?.options || [];
      setOptions(nextOptions);
      setStatus("success");
      setMessage(
        result && !result.enabled
          ? "بحث الأنشطة غير مفعل في هذه البيئة."
          : nextOptions.length > 0
            ? `تم العثور على ${nextOptions.length} نشاط.`
            : "لم يتم العثور على أنشطة مطابقة.",
      );
    } catch (error) {
      setStatus("error");
      setOptions([]);
      setMessage(
        error instanceof Error ? error.message : "فشل البحث عن الأنشطة مؤقتًا.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A]">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10 md:p-8">
          <Badge className="mb-4 bg-white/15 text-white hover:bg-white/20">
            Hotelbeds Activities
          </Badge>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">
            الأنشطة والتجارب السياحية
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 md:text-base">
            ابحث عن الجولات والتجارب السياحية من Hotelbeds. الحجز الحقيقي غير
            مفعل الآن، وزر عرض الخيارات لا ينفذ أي عملية دفع أو حجز.
          </p>
        </section>

        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-950">
              بحث الأنشطة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleSubmit}>
              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-bold text-slate-700">
                  Country / Destination
                </label>
                <Input
                  value={destinationQuery}
                  onChange={(event) => {
                    setDestinationQuery(event.target.value);
                    setDestination(null);
                  }}
                  placeholder="مثال: Istanbul أو IST"
                  className="h-12 rounded-2xl bg-slate-50"
                />
                {destinationSuggestions.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {destinationSuggestions.map((item) => (
                      <button
                        key={`${item.countryCode}-${item.destinationCode}`}
                        type="button"
                        className="block w-full border-b border-slate-100 px-4 py-3 text-start text-sm transition last:border-b-0 hover:bg-orange-50"
                        onClick={() => {
                          setDestination(item);
                          setDestinationQuery(item.label);
                          setDestinationSuggestions([]);
                        }}
                      >
                        <span className="font-bold text-slate-950">{item.label}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {item.destinationCode} - {item.countryCode}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs leading-5 text-slate-500">{destinationMessage}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">من</label>
                <Input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-12 rounded-2xl bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">إلى</label>
                <Input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="h-12 rounded-2xl bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Travellers
                </label>
                <Input
                  type="number"
                  min="1"
                  value={adults}
                  onChange={(event) => setAdults(Number(event.target.value))}
                  className="h-12 rounded-2xl bg-slate-50"
                />
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-4">
                <label className="text-sm font-bold text-slate-700">
                  أعمار الأطفال
                </label>
                <Input
                  value={childrenAges}
                  onChange={(event) => setChildrenAges(event.target.value)}
                  placeholder="مثال: 8, 12"
                  className="h-12 rounded-2xl bg-slate-50"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={status === "loading"}
                  className="h-12 w-full rounded-2xl bg-[#F97316] px-8 font-black text-white hover:bg-[#EA580C]"
                >
                  {status === "loading" ? "جاري البحث..." : "Search"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-dashed border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="mb-5">
              <Badge variant={status === "error" ? "destructive" : "secondary"}>
                {status === "loading"
                  ? "جاري البحث"
                  : status === "error"
                    ? "تعذر البحث"
                    : "نتائج الأنشطة"}
              </Badge>
              <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
            </div>

            {options.length > 0 ? (
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {options.map((option) => (
                  <article
                    key={`${option.activityCode}-${option.id}`}
                    className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm"
                  >
                    <div className="relative flex h-48 items-center justify-center bg-slate-100 text-center text-sm font-bold text-slate-500">
                      {option.imageUrl ? (
                        <Image
                          src={option.imageUrl}
                          alt={option.name}
                          fill
                          sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 50vw, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        <span className="px-6">لا توجد صورة متاحة من المورد</span>
                      )}
                    </div>

                    <div className="space-y-4 p-5">
                      <div>
                        <h2 className="line-clamp-2 text-lg font-black text-slate-950">
                          {option.name}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {option.destinationName || "الوجهة غير متوفرة"}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600">
                        <p>التصنيف: {option.categoryName || "غير متوفر"}</p>
                        <p>المدة: {option.duration || "غير متوفر"}</p>
                        <p>اللغات: {formatList(option.languages)}</p>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-500">
                            السعر يبدأ من
                          </p>
                          <p className="text-xl font-black text-[#F97316]">
                            {formatPrice(option)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedActivity(option)}
                        >
                          عرض الخيارات
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center gap-3 text-center">
                <h2 className="text-2xl font-black text-slate-950">
                  لا توجد نتائج معروضة الآن
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600">
                  لا يتم عرض بيانات وهمية. تظهر الأنشطة فقط عند تفعيل البحث
                  ونجاح Hotelbeds Activities API.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedActivity && (
          <Card className="rounded-[2rem] border-orange-200 bg-orange-50/40">
            <CardHeader>
              <CardTitle className="text-xl font-black text-slate-950">
                خيارات النشاط
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-700">
              <p className="font-black">{selectedActivity.name}</p>
              <p>
                عدد الخيارات المتاحة من المورد:{" "}
                {selectedActivity.modalities?.length || 0}
              </p>
              <p>
                سياسات الإلغاء:{" "}
                {selectedActivity.cancellationPolicies?.length || "غير متوفرة"}
              </p>
              <p>لا يتم تنفيذ حجز حقيقي من هذه المعاينة.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedActivity(null)}
              >
                إغلاق
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Link
            href={`/${locale}`}
            className="text-sm font-black text-[#F97316] hover:text-[#EA580C]"
          >
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
