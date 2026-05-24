"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  allocateTripBudget,
  type TripComponents as BudgetTripComponents,
  type TripStyle as BudgetTripStyle,
} from "@/lib/smart-trip-planner/budget-allocation";
import {
  createTripPackageIdempotencyKey,
  saveTripPackageDraft,
  type TripPackageDraft,
  type TripPackageDraftItem,
} from "@/lib/smart-trip-planner/trip-package-draft";

type PlannerMode = "known_destination" | "open_destination";
type TripLevel = "economic" | "comfort" | "luxury";
type TripComponent =
  | "hotels_only"
  | "flights_only"
  | "cars_only"
  | "hotels_flights"
  | "hotels_cars"
  | "flights_cars"
  | "hotels_flights_cars";
type ResultComponentType = "hotel" | "flight" | "car";

interface KnownDestinationPlannerInput {
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: string;
  totalBudget: string;
  currency: string;
  interests: string[];
  tripLevel: TripLevel;
  tripComponents: TripComponent[];
}

interface OpenDestinationPlannerInput {
  departureCity: string;
  departureDate: string;
  returnDate: string;
  nights: string;
  travelers: string;
  totalBudget: string;
  currency: string;
  interests: string[];
  tripLevel: TripLevel;
  tripComponents: TripComponent[];
}

interface PlanOption {
  type: ResultComponentType;
  image: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
}

interface KnownDestinationPlan {
  mode: "known_destination";
  destination: string;
  dates: string;
  travelers: string;
  budget: number;
  currency: string;
  interests: string[];
  hotelOption?: PlanOption;
  flightOption?: PlanOption;
  carOption?: PlanOption;
  totalPrice: number;
  remainingBudget: number;
  budgetStatus: "excellent" | "good" | "tight" | "insufficient";
}

interface DestinationSuggestion {
  id: string;
  city: string;
  country: string;
  image: string;
  reason: string;
  hotelEstimate: number;
  flightEstimate: number;
  carEstimate: number;
  totalEstimate: number;
  remainingBudget: number;
  matchPercent: number;
  bestTripLevel: string;
  currency: string;
  dates: string;
  travelers: string;
  budget: number;
  interests: string[];
  components: {
    hotel: boolean;
    flight: boolean;
    car: boolean;
  };
}

const interestOptions = [
  "تسوق",
  "مطاعم",
  "بحر",
  "طبيعة",
  "فعاليات",
  "فخامة",
  "عائلي",
  "تاريخ",
  "استرخاء",
  "مغامرات",
];

const tripLevels: Array<{ value: TripLevel; label: string; description: string }> = [
  { value: "economic", label: "اقتصادي", description: "خيارات عملية وميزانية مضبوطة" },
  { value: "comfort", label: "مريح", description: "توازن بين الراحة والسعر" },
  { value: "luxury", label: "فاخر", description: "تجربة راقية وخيارات أعلى" },
];

const tripComponents: Array<{ value: TripComponent; label: string; description: string }> = [
  { value: "hotels_only", label: "فنادق فقط", description: "الإقامة هي محور الخطة" },
  { value: "flights_only", label: "طيران فقط", description: "اقتراحات الرحلات الجوية لاحقًا" },
  { value: "cars_only", label: "سيارات فقط", description: "تنقلات واستئجار سيارة" },
  { value: "hotels_flights", label: "فنادق + طيران", description: "حزمة إقامة ووصول" },
  { value: "hotels_cars", label: "فنادق + سيارة", description: "إقامة وتنقل مرن" },
  { value: "flights_cars", label: "طيران + سيارة", description: "وصول وتنقل بدون إقامة" },
  {
    value: "hotels_flights_cars",
    label: "فنادق + طيران + سيارة",
    description: "خطة رحلة متكاملة",
  },
];

const currencies = ["SAR", "AED", "USD", "EUR", "GBP"];

const initialKnownDestinationForm: KnownDestinationPlannerInput = {
  destination: "",
  departureDate: "",
  returnDate: "",
  travelers: "2",
  totalBudget: "",
  currency: "SAR",
  interests: [],
  tripLevel: "comfort",
  tripComponents: ["hotels_flights"],
};

const initialOpenDestinationForm: OpenDestinationPlannerInput = {
  departureCity: "",
  departureDate: "",
  returnDate: "",
  nights: "",
  travelers: "2",
  totalBudget: "",
  currency: "SAR",
  interests: [],
  tripLevel: "comfort",
  tripComponents: ["hotels_flights"],
};

function parseMoney(value: string) {
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getTripNights(departureDate: string, returnDate: string) {
  const start = new Date(departureDate);
  const end = new Date(returnDate);
  const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  return Number.isFinite(diff) && diff > 0 ? diff : 4;
}

function selectedComponentTypes(components: TripComponent[]) {
  return {
    hotel: components.some((item) => item.includes("hotels")),
    flight: components.some((item) => item.includes("flights")),
    car: components.some((item) => item.includes("cars")),
  };
}

function componentMultiplier(components: TripComponent[]) {
  if (components.includes("hotels_flights_cars")) return 1;
  if (components.includes("hotels_flights") || components.includes("hotels_cars")) return 0.78;
  if (components.includes("flights_cars")) return 0.7;
  return 0.48;
}

function levelMultiplier(level: TripLevel) {
  if (level === "luxury") return 1.32;
  if (level === "economic") return 0.78;
  return 1;
}

function getLevelLabel(level: TripLevel) {
  return tripLevels.find((item) => item.value === level)?.label || "مريح";
}

function toBudgetTripStyle(level: TripLevel): BudgetTripStyle {
  return level === "economic" ? "economy" : level;
}

function toTripComponents(components: BudgetTripComponents): TripComponent[] {
  const { hotel, flight, car } = components;

  if (hotel && flight && car) return ["hotels_flights_cars"];
  if (hotel && flight) return ["hotels_flights"];
  if (hotel && car) return ["hotels_cars"];
  if (flight && car) return ["flights_cars"];
  if (hotel) return ["hotels_only"];
  if (flight) return ["flights_only"];
  if (car) return ["cars_only"];

  return [];
}

function getBudgetStatus(
  totalPrice: number,
  budget: number,
): KnownDestinationPlan["budgetStatus"] {
  if (budget <= 0 || totalPrice > budget) return "insufficient";
  const remainingRatio = (budget - totalPrice) / budget;
  if (remainingRatio >= 0.25) return "excellent";
  if (remainingRatio >= 0.1) return "good";
  return "tight";
}

function getBestTripLevel(totalEstimate: number, totalBudget: number, requestedLevel: TripLevel) {
  if (totalBudget <= 0) return getLevelLabel(requestedLevel);
  const ratio = totalEstimate / totalBudget;
  if (ratio <= 0.7 && requestedLevel !== "economic") return "فاخر";
  if (ratio <= 0.95) return "مريح";
  return "اقتصادي";
}

function generateKnownDestinationPlan(input: KnownDestinationPlannerInput): KnownDestinationPlan {
  const components = selectedComponentTypes(input.tripComponents);
  const budget = parseMoney(input.totalBudget) || 6500;
  const travelers = Math.max(Number(input.travelers) || 1, 1);
  const nights = getTripNights(input.departureDate, input.returnDate);
  const multiplier = componentMultiplier(input.tripComponents) * levelMultiplier(input.tripLevel);

  const hotelOption = components.hotel
    ? {
        type: "hotel" as const,
        image: "/hero2.jpg",
        name: `إقامة مقترحة في ${input.destination || "وجهتك"}`,
        price: Math.round(520 * nights * multiplier),
        duration: `${nights} ليالٍ`,
        features: ["موقع مناسب", "خيارات إلغاء مرنة لاحقًا", "مناسب لاهتمامات الرحلة"],
      }
    : undefined;
  const flightOption = components.flight
    ? {
        type: "flight" as const,
        image: "/hero1.jpg",
        name: `رحلة ذهاب وعودة إلى ${input.destination || "وجهتك"}`,
        price: Math.round(1150 * travelers * multiplier),
        duration: input.returnDate ? "ذهاب وعودة" : "رحلة مبدئية",
        features: ["توقيت مناسب", "قابل للمقارنة لاحقًا", "حسب عدد المسافرين"],
      }
    : undefined;
  const carOption = components.car
    ? {
        type: "car" as const,
        image: "/hero3.jpeg",
        name: "سيارة مناسبة للتنقلات",
        price: Math.round(240 * Math.ceil(nights / 2) * multiplier),
        duration: `${nights} أيام تقريبًا`,
        features: ["تنقل مرن", "فئة مناسبة للرحلة", "قابلة للاستبدال لاحقًا"],
      }
    : undefined;
  const totalPrice =
    (hotelOption?.price || 0) + (flightOption?.price || 0) + (carOption?.price || 0);

  return {
    mode: "known_destination",
    destination: input.destination || "وجهة غير محددة",
    dates: `${input.departureDate || "تاريخ الذهاب"} - ${input.returnDate || "تاريخ العودة"}`,
    travelers: `${travelers} مسافر`,
    budget,
    currency: input.currency,
    interests: input.interests,
    hotelOption,
    flightOption,
    carOption,
    totalPrice,
    remainingBudget: budget - totalPrice,
    budgetStatus: getBudgetStatus(totalPrice, budget),
  };
}

function generateDestinationSuggestions(input: OpenDestinationPlannerInput): DestinationSuggestion[] {
  const budget = parseMoney(input.totalBudget);
  const travelers = Math.max(Number(input.travelers) || 1, 1);
  const nights = Math.max(Number(input.nights) || getTripNights(input.departureDate, input.returnDate), 1);
  const baseBudget = budget || 6500;
  const multiplier = componentMultiplier(input.tripComponents) * levelMultiplier(input.tripLevel);
  const components = selectedComponentTypes(input.tripComponents);

  const destinations = [
    {
      id: "istanbul",
      city: "إسطنبول",
      country: "تركيا",
      image: "/hero1.jpg",
      tags: ["تسوق", "مطاعم", "تاريخ", "عائلي"],
      qualityScore: 86,
      reason: "مناسبة للتسوق والمطاعم والتاريخ مع خيارات إقامة متنوعة وضمن ميزانيتك غالبًا.",
      baseHotel: 420,
      baseFlight: 1450,
      baseCar: 260,
    },
    {
      id: "dubai",
      city: "دبي",
      country: "الإمارات",
      image: "/hero2.jpg",
      tags: ["فخامة", "تسوق", "فعاليات", "عائلي"],
      qualityScore: 92,
      reason: "مناسبة للفخامة والتسوق والفعاليات مع جودة خيارات عالية وتجربة سفر سهلة.",
      baseHotel: 680,
      baseFlight: 950,
      baseCar: 330,
    },
    {
      id: "tbilisi",
      city: "تبليسي",
      country: "جورجيا",
      image: "/hero3.jpeg",
      tags: ["طبيعة", "مطاعم", "استرخاء", "مغامرات"],
      qualityScore: 81,
      reason: "مناسبة للطبيعة والاسترخاء والمغامرات بتكلفة مرنة ومتبقي جيد من الميزانية.",
      baseHotel: 310,
      baseFlight: 1250,
      baseCar: 210,
    },
  ];

  return destinations
    .map((destination) => {
      const interestMatches = destination.tags.filter((tag) => input.interests.includes(tag)).length;
      const hotelEstimate = Math.round(destination.baseHotel * nights * multiplier);
      const flightEstimate = Math.round(destination.baseFlight * travelers * multiplier);
      const carEstimate = Math.round(destination.baseCar * Math.ceil(nights / 2) * multiplier);
      const totalEstimate =
        (components.hotel ? hotelEstimate : 0) +
        (components.flight ? flightEstimate : 0) +
        (components.car ? carEstimate : 0);
      const remainingBudget = baseBudget - totalEstimate;
      const fitsBudget = remainingBudget >= 0;
      const interestScore =
        input.interests.length > 0 ? interestMatches / input.interests.length : 0.5;
      const remainingScore = Math.max(0, Math.min(1, remainingBudget / baseBudget));
      const sortScore =
        (fitsBudget ? 1000 : 0) +
        interestScore * 300 +
        destination.qualityScore * 2 +
        remainingScore * 120;

      return {
        id: destination.id,
        city: destination.city,
        country: destination.country,
        image: destination.image,
        reason: destination.reason,
        hotelEstimate: components.hotel ? hotelEstimate : 0,
        flightEstimate: components.flight ? flightEstimate : 0,
        carEstimate: components.car ? carEstimate : 0,
        totalEstimate,
        remainingBudget,
        matchPercent: Math.min(
          97,
          Math.max(55, Math.round(50 + interestScore * 25 + destination.qualityScore * 0.2 + (fitsBudget ? 12 : 0))),
        ),
        bestTripLevel: getBestTripLevel(totalEstimate, baseBudget, input.tripLevel),
        currency: input.currency,
        dates: `${input.departureDate || "تاريخ الذهاب"} - ${
          input.returnDate || `${nights} ليالٍ`
        }`,
        travelers: `${travelers} مسافر`,
        budget: baseBudget,
        interests: input.interests,
        components,
        sortScore,
      };
    })
    .sort((a, b) => b.sortScore - a.sortScore)
    .map(({ sortScore: _sortScore, ...suggestion }) => suggestion);
}

const cancellationPolicyByType: Record<ResultComponentType, string> = {
  hotel: "سياسة الإلغاء النهائية تظهر قبل الدفع حسب خيار الفندق المتاح وقت التأكيد.",
  flight: "تطبق سياسة شركة الطيران وقواعد السعر عند اختيار الرحلة النهائية.",
  car: "تطبق سياسة شركة تأجير السيارات وشروط الاستلام عند تأكيد الخيار.",
};

function toDraftItem(option: PlanOption): TripPackageDraftItem {
  return {
    type: option.type,
    name: option.name,
    price: option.price,
    image: option.image,
    duration: option.duration,
    features: option.features,
    cancellationPolicy: cancellationPolicyByType[option.type],
  };
}

function toDraftDates(label: string) {
  const [departureDate, returnDate] = label.split(" - ").map((part) => part.trim());

  return {
    label,
    departureDate,
    returnDate,
  };
}

function createDraftFromKnownPlan(plan: KnownDestinationPlan): TripPackageDraft {
  return {
    idempotencyKey: createTripPackageIdempotencyKey(),
    source: "smart_trip_planner",
    mode: "known_destination",
    selectedHotel: plan.hotelOption ? toDraftItem(plan.hotelOption) : undefined,
    selectedFlight: plan.flightOption ? toDraftItem(plan.flightOption) : undefined,
    selectedCar: plan.carOption ? toDraftItem(plan.carOption) : undefined,
    totalPrice: plan.totalPrice,
    currency: plan.currency,
    travelers: plan.travelers,
    dates: toDraftDates(plan.dates),
    budget: plan.budget,
    interests: plan.interests,
    createdAt: new Date().toISOString(),
  };
}

function createDraftFromSuggestion(suggestion: DestinationSuggestion): TripPackageDraft {
  return {
    idempotencyKey: createTripPackageIdempotencyKey(),
    source: "smart_trip_planner",
    mode: "open_destination",
    selectedHotel: suggestion.components.hotel
      ? {
          type: "hotel",
          name: `إقامة مقترحة في ${suggestion.city}`,
          price: suggestion.hotelEstimate,
          image: suggestion.image,
          duration: suggestion.dates,
          features: ["خيار قابل للمراجعة قبل الدفع", suggestion.reason],
          cancellationPolicy: cancellationPolicyByType.hotel,
        }
      : undefined,
    selectedFlight: suggestion.components.flight
      ? {
          type: "flight",
          name: `رحلة مقترحة إلى ${suggestion.city}`,
          price: suggestion.flightEstimate,
          image: suggestion.image,
          duration: suggestion.dates,
          features: ["سيتم اختيار الرحلة النهائية لاحقًا", "لا يتم إصدار تذاكر الآن"],
          cancellationPolicy: cancellationPolicyByType.flight,
        }
      : undefined,
    selectedCar: suggestion.components.car
      ? {
          type: "car",
          name: `سيارة مقترحة في ${suggestion.city}`,
          price: suggestion.carEstimate,
          image: suggestion.image,
          duration: suggestion.dates,
          features: ["خيار تنقل قابل للتغيير قبل الدفع", "لا يتم تأكيد السيارة الآن"],
          cancellationPolicy: cancellationPolicyByType.car,
        }
      : undefined,
    totalPrice: suggestion.totalEstimate,
    currency: suggestion.currency,
    travelers: suggestion.travelers,
    dates: toDraftDates(suggestion.dates),
    budget: suggestion.budget,
    interests: suggestion.interests,
    createdAt: new Date().toISOString(),
  };
}

export default function SmartTripPlannerPage() {
  const [mode, setMode] = useState<PlannerMode>("known_destination");

  const activeCopy = useMemo(() => {
    if (mode === "known_destination") {
      return {
        title: "أعرف وجهتي",
        description: "اختر مدينتك ونحن نخطط رحلتك حسب ميزانيتك.",
      };
    }

    return {
      title: "لا أعرف أين أسافر",
      description: "اكتب ميزانيتك واهتماماتك ونحن نقترح لك أفضل الوجهات.",
    };
  }, [mode]);

  return (
    <main dir="rtl" className="bg-[#F8FAFC] text-[#0F172A]">
      <section className="relative min-h-[520px] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero1.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.88),rgba(15,23,42,0.62),rgba(249,115,22,0.42))]" />

        <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-orange-100 backdrop-blur">
              Smart Trip Planner
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              خطط رحلتك بميزانيتك
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
              اختر وجهتك أو دع ميزانيتك تقترح لك أفضل الوجهات، مع أسعار حية للفنادق والطيران والسيارات.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-24 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <PlannerModeCard
              number="1"
              title="أعرف وجهتي"
              description="اختر مدينتك ونحن نخطط رحلتك حسب ميزانيتك"
              isActive={mode === "known_destination"}
              onClick={() => setMode("known_destination")}
            />
            <PlannerModeCard
              number="2"
              title="لا أعرف أين أسافر"
              description="اكتب ميزانيتك واهتماماتك ونحن نقترح لك أفضل الوجهات"
              isActive={mode === "open_destination"}
              onClick={() => setMode("open_destination")}
            />

            <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black text-[#0F172A]">كيف يعمل المخطط؟</h3>
              <div className="mt-5 grid gap-4">
                {[
                  "الأسعار مبنية على التوفر الحالي وقد تتغير حتى إتمام الحجز.",
                  "نوزع ميزانيتك حسب الخدمات التي تختارها.",
                  "يمكنك اختيار فندق فقط، طيران فقط، سيارة فقط، أو دمج أكثر من خدمة.",
                  "الحجز النهائي يتم بعد مراجعة الخطة والدفع.",
                ].map((item) => (
                  <div key={item} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#F97316]" />
                    <p className="text-sm leading-7 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black text-[#0F172A]">مزايا Smart Trip Planner</h3>
              <div className="mt-5 grid gap-4">
                {[
                  "مرونة كاملة في اختيار خدمات الرحلة",
                  "توزيع ذكي للميزانية",
                  "خيارات حجز مباشرة",
                  "فنادق وطيران وسيارات في مكان واحد",
                ].map((item) => (
                  <div key={item} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#F97316]" />
                    <p className="text-sm leading-7 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-[#E5E7EB] bg-white p-6 shadow-2xl shadow-slate-950/10 sm:p-8">
            <div className="mb-6">
              <p className="text-sm font-black text-[#F97316]">خطة رحلة ذكية</p>
              <h2 className="mt-2 text-3xl font-black text-[#0F172A]">{activeCopy.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{activeCopy.description}</p>
            </div>

            {mode === "known_destination" ? <KnownDestinationPlannerForm /> : <OpenDestinationPlannerForm />}
          </div>
        </div>
      </section>
    </main>
  );
}

function KnownDestinationPlannerForm() {
  const [form, setForm] = useState<KnownDestinationPlannerInput>(initialKnownDestinationForm);
  const [plan, setPlan] = useState<KnownDestinationPlan | null>(null);

  function updateField<K extends keyof KnownDestinationPlannerInput>(
    key: K,
    value: KnownDestinationPlannerInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setPlan(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlan(generateKnownDestinationPlan(form));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الوجهة / المدينة">
          <TextInput
            value={form.destination}
            onChange={(value) => updateField("destination", value)}
            placeholder="مثال: دبي، إسطنبول، لندن"
          />
        </Field>
        <Field label="عدد المسافرين">
          <TextInput
            value={form.travelers}
            onChange={(value) => updateField("travelers", value)}
            inputMode="numeric"
          />
        </Field>
        <Field label="تاريخ الذهاب">
          <TextInput
            type="date"
            value={form.departureDate}
            onChange={(value) => updateField("departureDate", value)}
          />
        </Field>
        <Field label="تاريخ العودة">
          <TextInput
            type="date"
            value={form.returnDate}
            onChange={(value) => updateField("returnDate", value)}
          />
        </Field>
        <Field label="الميزانية الإجمالية">
          <TextInput
            value={form.totalBudget}
            onChange={(value) => updateField("totalBudget", value)}
            placeholder="مثال: 5000"
            inputMode="decimal"
          />
        </Field>
        <Field label="العملة">
          <CurrencySelect value={form.currency} onChange={(value) => updateField("currency", value)} />
        </Field>
      </div>

      <OptionChips
        label="الاهتمامات"
        values={interestOptions}
        selected={form.interests}
        onToggle={(interest) =>
          updateField(
            "interests",
            form.interests.includes(interest)
              ? form.interests.filter((item) => item !== interest)
              : [...form.interests, interest],
          )
        }
      />

      <TripLevelPicker value={form.tripLevel} onChange={(value) => updateField("tripLevel", value)} />
      <ReusableTripComponentsSelector
        selected={form.tripComponents}
        tripStyle={form.tripLevel}
        onChange={(components) => updateField("tripComponents", components)}
      />

      <PlannerNotice>
        الأسعار مبنية على التوفر الحالي وقد تتغير حتى إتمام الحجز. الحجز النهائي يتم بعد مراجعة الخطة والدفع.
      </PlannerNotice>

      <PrimaryButton>خطط رحلتي الآن</PrimaryButton>

      {plan && <ResultKnownDestinationPlan plan={plan} />}
    </form>
  );
}

function ResultKnownDestinationPlan({ plan }: { plan: KnownDestinationPlan }) {
  const router = useRouter();
  const locale = useLocale();
  const options = [plan.hotelOption, plan.flightOption, plan.carOption].filter(
    (option): option is PlanOption => Boolean(option),
  );
  const statusCopy = {
    excellent: { label: "ممتازة", className: "bg-emerald-50 text-emerald-700" },
    good: { label: "مناسبة", className: "bg-green-50 text-green-700" },
    tight: { label: "ضيقة", className: "bg-amber-50 text-amber-700" },
    insufficient: { label: "غير كافية", className: "bg-red-50 text-red-700" },
  }[plan.budgetStatus];

  return (
    <section className="rounded-[28px] border border-orange-100 bg-orange-50/50 p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-black text-[#F97316]">النتيجة المقترحة</p>
          <h3 className="mt-1 text-2xl font-black text-[#0F172A]">خطة رحلتك الذكية</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            هذه الخطة مبنية حسب ميزانيتك واختياراتك الحالية، ولا تعرض إلا الخدمات التي اخترتها.
          </p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-black ${statusCopy.className}`}>
          الميزانية {statusCopy.label}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <SummaryItem label="الوجهة" value={plan.destination} />
        <SummaryItem label="التواريخ" value={plan.dates} />
        <SummaryItem label="عدد المسافرين" value={plan.travelers} />
        <SummaryItem label="الميزانية" value={formatMoney(plan.budget, plan.currency)} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {options.map((option) => (
          <PlanOptionCard key={option.type} option={option} currency={plan.currency} />
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <SummaryItem label="إجمالي تكلفة الرحلة" value={formatMoney(plan.totalPrice, plan.currency)} strong />
        <SummaryItem label="المتبقي من الميزانية" value={formatMoney(plan.remainingBudget, plan.currency)} strong />
        <SummaryItem label="ملاءمة الميزانية" value={statusCopy.label} strong />
      </div>

      <button
        type="button"
        onClick={() => {
          saveTripPackageDraft(createDraftFromKnownPlan(plan));
          router.push(`/${locale}/checkout/trip-package`);
        }}
        className="mt-5 h-14 w-full rounded-2xl bg-[#F97316] px-6 text-base font-black text-white shadow-xl shadow-orange-500/20 transition hover:bg-[#ea580c]"
      >
        احجز الآن
      </button>
    </section>
  );
}

function PlanOptionCard({ option, currency }: { option: PlanOption; currency: string }) {
  const [actionMessage, setActionMessage] = useState("");
  const typeLabel = {
    hotel: "الفندق",
    flight: "الطيران",
    car: "السيارة",
  }[option.type];

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm">
      <div className="relative h-36 bg-cover bg-center" style={{ backgroundImage: `url(${option.image})` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
        <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#F97316]">
          {typeLabel}
        </span>
      </div>
      <div className="p-4">
        <h4 className="text-lg font-black text-[#0F172A]">{option.name}</h4>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600">
          <span>{formatMoney(option.price, currency)}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{option.duration}</span>
        </div>
        <div className="mt-4 space-y-2">
          {option.features.map((feature) => (
            <div key={feature} className="flex gap-2 text-sm leading-6 text-slate-600">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F97316]" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              setActionMessage(`تفاصيل ${typeLabel} ستُربط لاحقًا بمصدر السعر الحي قبل الدفع.`)
            }
            className="h-10 rounded-xl border border-[#F97316] bg-white text-sm font-black text-[#F97316] hover:bg-orange-50"
          >
            عرض التفاصيل
          </button>
          <button
            type="button"
            onClick={() =>
              setActionMessage(`سنبحث لاحقًا عن بدائل ${typeLabel} حسب ميزانيتك واختياراتك الحالية.`)
            }
            className="h-10 rounded-xl bg-[#0F172A] text-sm font-black text-white hover:bg-slate-800"
          >
            غيّر الخيار
          </button>
          <button
            type="button"
            onClick={() =>
              setActionMessage(`سيتم ترتيب بدائل أرخص لـ ${typeLabel} عند ربط الأسعار الحية.`)
            }
            className="h-10 rounded-xl border border-[#E5E7EB] bg-white text-sm font-black text-[#0F172A] hover:border-orange-200 hover:bg-orange-50 hover:text-[#F97316]"
          >
            أرني خيار أرخص
          </button>
          <button
            type="button"
            onClick={() =>
              setActionMessage(`سيتم اقتراح خيارات أفخم لـ ${typeLabel} عند رفع مستوى الرحلة أو توفر بدائل أعلى.`)
            }
            className="h-10 rounded-xl border border-[#E5E7EB] bg-white text-sm font-black text-[#0F172A] hover:border-orange-200 hover:bg-orange-50 hover:text-[#F97316]"
          >
            أرني خيار أفخم
          </button>
        </div>
        {actionMessage && (
          <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold leading-7 text-orange-900">
            {actionMessage}
          </div>
        )}
      </div>
    </article>
  );
}

function OpenDestinationPlannerForm() {
  const [form, setForm] = useState<OpenDestinationPlannerInput>(initialOpenDestinationForm);
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);

  function updateField<K extends keyof OpenDestinationPlannerInput>(
    key: K,
    value: OpenDestinationPlannerInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setSuggestions([]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuggestions(generateDestinationSuggestions(form));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="مدينة المغادرة">
          <TextInput
            value={form.departureCity}
            onChange={(value) => updateField("departureCity", value)}
            placeholder="مثال: الرياض، جدة، دبي"
          />
        </Field>
        <Field label="عدد المسافرين">
          <TextInput
            value={form.travelers}
            onChange={(value) => updateField("travelers", value)}
            inputMode="numeric"
          />
        </Field>
        <Field label="تاريخ الذهاب">
          <TextInput
            type="date"
            value={form.departureDate}
            onChange={(value) => updateField("departureDate", value)}
          />
        </Field>
        <Field label="تاريخ العودة">
          <TextInput
            type="date"
            value={form.returnDate}
            onChange={(value) => updateField("returnDate", value)}
          />
        </Field>
        <Field label="عدد الليالي">
          <TextInput
            value={form.nights}
            onChange={(value) => updateField("nights", value)}
            placeholder="مثال: 5"
            inputMode="numeric"
          />
        </Field>
        <Field label="الميزانية الإجمالية">
          <TextInput
            value={form.totalBudget}
            onChange={(value) => updateField("totalBudget", value)}
            placeholder="مثال: 8000"
            inputMode="decimal"
          />
        </Field>
        <Field label="العملة">
          <CurrencySelect value={form.currency} onChange={(value) => updateField("currency", value)} />
        </Field>
      </div>

      <OptionChips
        label="الاهتمامات"
        values={interestOptions}
        selected={form.interests}
        onToggle={(interest) =>
          updateField(
            "interests",
            form.interests.includes(interest)
              ? form.interests.filter((item) => item !== interest)
              : [...form.interests, interest],
          )
        }
      />

      <TripLevelPicker value={form.tripLevel} onChange={(value) => updateField("tripLevel", value)} />
      <ReusableTripComponentsSelector
        selected={form.tripComponents}
        tripStyle={form.tripLevel}
        onChange={(components) => updateField("tripComponents", components)}
      />

      <PlannerNotice>
        نوزع ميزانيتك حسب الخدمات التي تختارها، ويمكنك اختيار فندق فقط، طيران فقط، سيارة فقط، أو دمج أكثر من خدمة.
      </PlannerNotice>

      <PrimaryButton>وين توديني ميزانيتي؟</PrimaryButton>

      {suggestions.length > 0 && <DestinationSuggestionsResult suggestions={suggestions} />}
    </form>
  );
}

function DestinationSuggestionsResult({
  suggestions,
}: {
  suggestions: DestinationSuggestion[];
}) {
  return (
    <section className="space-y-4 pt-2">
      <div>
        <h3 className="text-xl font-black text-[#0F172A]">وجهات مناسبة لميزانيتك</h3>
        <p className="mt-1 text-sm leading-7 text-slate-600">
          تم ترتيب المدن حسب ملاءمة الميزانية، قربها من اهتماماتك، جودة الخيارات، والمتبقي من الميزانية.
        </p>
        <p className="mt-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold leading-7 text-orange-900">
          كل اقتراح هنا مبني حسب ميزانيتك واختياراتك الحالية، ولا يعرض تكلفة خدمة لم تخترها.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {suggestions.map((suggestion) => (
          <DestinationSuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </div>
    </section>
  );
}

function DestinationSuggestionCard({ suggestion }: { suggestion: DestinationSuggestion }) {
  const router = useRouter();
  const locale = useLocale();
  const [actionMessage, setActionMessage] = useState("");

  return (
    <article className="overflow-hidden rounded-[26px] border border-[#E5E7EB] bg-white shadow-lg shadow-slate-950/5">
      <div className="relative h-44 bg-cover bg-center" style={{ backgroundImage: `url(${suggestion.image})` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
        <div className="absolute bottom-4 right-4 text-white">
          <h4 className="text-2xl font-black">{suggestion.city}</h4>
          <p className="text-sm font-bold text-white/80">{suggestion.country}</p>
        </div>
        <div className="absolute left-4 top-4 rounded-full bg-[#F97316] px-3 py-1 text-xs font-black text-white">
          مناسبة {suggestion.matchPercent}%
        </div>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm leading-7 text-slate-600">{suggestion.reason}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {suggestion.components.hotel && (
            <CostItem label="تكلفة الفندق" value={suggestion.hotelEstimate} currency={suggestion.currency} />
          )}
          {suggestion.components.flight && (
            <CostItem label="تكلفة الطيران" value={suggestion.flightEstimate} currency={suggestion.currency} />
          )}
          {suggestion.components.car && (
            <CostItem label="تكلفة السيارة" value={suggestion.carEstimate} currency={suggestion.currency} />
          )}
          <CostItem label="الإجمالي" value={suggestion.totalEstimate} currency={suggestion.currency} strong />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-black ${
              suggestion.remainingBudget >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            المتبقي: {formatMoney(suggestion.remainingBudget, suggestion.currency)}
          </div>
          <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-[#F97316]">
            أفضل مستوى: {suggestion.bestTripLevel}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              setActionMessage("سيتم فتح خطة تفصيلية لهذه الوجهة حسب ميزانيتك واختياراتك الحالية عند ربط الأسعار الحية.")
            }
            className="h-11 rounded-2xl border border-[#F97316] bg-white text-sm font-black text-[#F97316] transition hover:bg-orange-50"
          >
            اعرض الخطة
          </button>
          <button
            type="button"
            onClick={() => {
              saveTripPackageDraft(createDraftFromSuggestion(suggestion));
              router.push(`/${locale}/checkout/trip-package`);
            }}
            className="h-11 rounded-2xl bg-[#F97316] text-sm font-black text-white transition hover:bg-[#ea580c]"
          >
            احجز الآن
          </button>
        </div>
        {actionMessage && (
          <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold leading-7 text-orange-900">
            {actionMessage}
          </div>
        )}
      </div>
    </article>
  );
}

function CostItem({ label, value, currency, strong }: { label: string; value: number; currency: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-1 ${strong ? "text-lg" : "text-base"} font-black text-[#0F172A]`}>
        {formatMoney(value, currency)}
      </p>
    </div>
  );
}

function SummaryItem({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-1 ${strong ? "text-lg" : "text-sm"} font-black text-[#0F172A]`}>{value}</p>
    </div>
  );
}

function formatMoney(value: number, currency: string) {
  const sign = value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toLocaleString("ar-SA")} ${currency}`;
}

function PlannerModeCard({
  number,
  title,
  description,
  isActive,
  onClick,
}: {
  number: string;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[28px] border bg-white p-6 text-right shadow-xl shadow-slate-950/5 transition hover:-translate-y-1 ${
        isActive ? "border-[#F97316] ring-4 ring-orange-100" : "border-[#E5E7EB]"
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-2xl font-black text-[#F97316]">
          {number}
        </span>
        <div>
          <h2 className="text-2xl font-black text-[#0F172A]">{title}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
        </div>
      </div>
    </button>
  );
}

function OptionChips({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                isSelected
                  ? "border-[#F97316] bg-[#F97316] text-white shadow-lg shadow-orange-500/20"
                  : "border-[#E5E7EB] bg-[#F8FAFC] text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-[#F97316]"
              }`}
            >
              {value}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function TripLevelPicker({ value, onChange }: { value: TripLevel; onChange: (value: TripLevel) => void }) {
  return (
    <Field label="مستوى الرحلة">
      <div className="grid gap-3 sm:grid-cols-3">
        {tripLevels.map((level) => {
          const selected = value === level.value;
          return (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange(level.value)}
              className={`rounded-2xl border p-4 text-right transition ${
                selected ? "border-[#F97316] bg-orange-50 ring-4 ring-orange-100" : "border-[#E5E7EB] bg-white hover:border-orange-200"
              }`}
            >
              <span className="block text-base font-black text-[#0F172A]">{level.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{level.description}</span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function ReusableTripComponentsSelector({
  selected,
  tripStyle,
  onChange,
}: {
  selected: TripComponent[];
  tripStyle: TripLevel;
  onChange: (value: TripComponent[]) => void;
}) {
  const selectedFlags = selectedComponentTypes(selected);
  const allocation = allocateTripBudget({
    totalBudget: 100,
    travelers: 1,
    nights: 1,
    tripStyle: toBudgetTripStyle(tripStyle),
    components: selectedFlags,
  });
  const hasSelection = selectedFlags.hotel || selectedFlags.flight || selectedFlags.car;
  const componentCards: Array<{
    key: keyof BudgetTripComponents;
    label: string;
    description: string;
  }> = [
    { key: "hotel", label: "فنادق", description: "إقامة تناسب الميزانية والوجهة" },
    { key: "flight", label: "طيران", description: "رحلات مناسبة للتواريخ المختارة" },
    { key: "car", label: "سيارات", description: "تنقل مرن داخل الوجهة" },
  ];
  const budgetRows = [
    { label: "الفنادق", value: allocation.hotelBudget },
    { label: "الطيران", value: allocation.flightBudget },
    { label: "السيارة", value: allocation.carBudget },
    { label: "خدمات", value: allocation.activitiesBudget },
    { label: "احتياطي", value: allocation.bufferBudget },
  ].filter((item) => item.value > 0);

  function toggleComponent(key: keyof BudgetTripComponents) {
    const nextFlags = {
      ...selectedFlags,
      [key]: !selectedFlags[key],
    };

    onChange(toTripComponents(nextFlags));
  }

  return (
    <Field label="مكونات الرحلة المطلوبة">
      <div className="grid gap-3 sm:grid-cols-3">
        {componentCards.map((component) => {
          const isSelected = selectedFlags[component.key];

          return (
            <button
              key={component.key}
              type="button"
              onClick={() => toggleComponent(component.key)}
              className={`rounded-2xl border p-4 text-right transition ${
                isSelected ? "border-[#F97316] bg-orange-50 ring-4 ring-orange-100" : "border-[#E5E7EB] bg-white hover:border-orange-200"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    isSelected ? "border-[#F97316] bg-[#F97316]" : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <span className="h-2 w-2 rounded-sm bg-white" />}
                </span>
                <span className="font-black text-[#0F172A]">{component.label}</span>
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-500">
                {component.description}
              </span>
            </button>
          );
        })}
      </div>

      {!hasSelection ? (
        <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          اختر خدمة واحدة على الأقل لتخطيط الرحلة
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <p className="mb-3 text-sm font-black text-[#0F172A]">توزيع الميزانية</p>
          <div className="flex flex-wrap gap-2">
            {budgetRows.map((item) => (
              <span
                key={item.label}
                className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm"
              >
                {item.label} {Math.round(item.value)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </Field>
  );
}

function _TripComponentsPicker({
  selected,
  onToggle,
}: {
  selected: TripComponent[];
  onToggle: (value: TripComponent) => void;
}) {
  return (
    <Field label="مكونات الرحلة المطلوبة">
      <div className="grid gap-3 sm:grid-cols-2">
        {tripComponents.map((component) => {
          const isSelected = selected.includes(component.value);
          return (
            <button
              key={component.value}
              type="button"
              onClick={() => onToggle(component.value)}
              className={`rounded-2xl border p-4 text-right transition ${
                isSelected ? "border-[#F97316] bg-orange-50 ring-4 ring-orange-100" : "border-[#E5E7EB] bg-white hover:border-orange-200"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    isSelected ? "border-[#F97316] bg-[#F97316]" : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <span className="h-2 w-2 rounded-sm bg-white" />}
                </span>
                <span className="font-black text-[#0F172A]">{component.label}</span>
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-500">{component.description}</span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function CurrencySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-bold outline-none transition focus:border-[#F97316] focus:bg-white"
    >
      {currencies.map((currency) => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </select>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm outline-none transition focus:border-[#F97316] focus:bg-white"
    />
  );
}

function PlannerNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm font-bold leading-7 text-orange-900">
      {children}
    </div>
  );
}

function PrimaryButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="h-14 w-full rounded-2xl bg-[#F97316] px-6 text-base font-black text-white shadow-xl shadow-orange-500/20 transition hover:bg-[#ea580c]"
    >
      {children}
    </button>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      {children}
    </label>
  );
}
