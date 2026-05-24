import Image from "next/image";
import Link from "next/link";
import SearchForm from "@/components/search/search-form";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Hotel01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

const heroImage =
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2200&auto=format&fit=crop";

const destinations = [
  {
    cityAr: "دبي",
    cityEn: "Dubai",
    countryAr: "الإمارات",
    countryEn: "United Arab Emirates",
    price: "$89",
    image:
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?q=80&w=900&auto=format&fit=crop",
  },
  {
    cityAr: "إسطنبول",
    cityEn: "Istanbul",
    countryAr: "تركيا",
    countryEn: "Turkey",
    price: "$72",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=900&auto=format&fit=crop",
  },
  {
    cityAr: "الرياض",
    cityEn: "Riyadh",
    countryAr: "السعودية",
    countryEn: "Saudi Arabia",
    price: "$95",
    image:
      "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?q=80&w=900&auto=format&fit=crop",
  },
  {
    cityAr: "لندن",
    cityEn: "London",
    countryAr: "المملكة المتحدة",
    countryEn: "United Kingdom",
    price: "$120",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=900&auto=format&fit=crop",
  },
];

const hotelDeals = [
  {
    name: "Marina View Hotel",
    cityAr: "دبي",
    cityEn: "Dubai",
    rating: "4.8",
    price: "$129",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Old City Suites",
    cityAr: "إسطنبول",
    cityEn: "Istanbul",
    rating: "4.6",
    price: "$98",
    image:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Capital Stay",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    rating: "4.7",
    price: "$110",
    image:
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "West End Hotel",
    cityAr: "لندن",
    cityEn: "London",
    rating: "4.5",
    price: "$145",
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=600&auto=format&fit=crop",
  },
];

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";

  const copy = {
    heroTitle: isAr
      ? "احجز فنادقك ورحلاتك بسهولة"
      : "Book your hotels and trips with ease",
    heroSubtitle: isAr
      ? "أفضل الأسعار لأفضل الوجهات حول العالم"
      : "The best prices for top destinations around the world",
    popular: isAr ? "وجهات شائعة" : "Popular destinations",
    popularDesc: isAr
      ? "اختيارات مختصرة لوجهات يحبها المسافرون."
      : "A focused selection of traveler-loved destinations.",
    why: isAr ? "لماذا تحجز مع Hotleno؟" : "Why book with Hotleno?",
    deals: isAr ? "أفضل عروض الفنادق" : "Best hotel deals",
    from: isAr ? "يبدأ من" : "From",
    night: isAr ? "لليلة" : "night",
    plannerCta: isAr ? "خطط رحلتك بميزانيتك" : "Plan your trip by budget",
    blogCta: isAr ? "استكشف المدونة" : "Explore the blog",
  };

  const benefits = [
    isAr ? "إلغاء مجاني" : "Free cancellation",
    isAr ? "حجز آمن" : "Secure booking",
    isAr ? "أسعار منافسة" : "Competitive prices",
    isAr ? "دعم على مدار الساعة" : "24/7 support",
  ];

  const reasons = [
    isAr ? "دعم عملاء ممتاز" : "Excellent customer support",
    isAr ? "حجز سريع وسهل" : "Fast and easy booking",
    isAr ? "أسعار رائعة" : "Great prices",
    isAr ? "خيارات متنوعة" : "Wide range of options",
  ];

  return (
    <div className="bg-white text-[#0F172A]">
      <section className="relative -mt-20 min-h-[760px] overflow-hidden pt-20">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-white" />

        <div className="relative mx-auto flex min-h-[680px] max-w-7xl flex-col justify-center px-4 pb-10 pt-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-4 inline-flex rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
              HOTLENO OTA
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-white/90 sm:text-xl">
              {copy.heroSubtitle}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/${locale}/smart-trip-planner`}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F97316] px-6 text-sm font-black text-white shadow-xl shadow-orange-500/25 transition hover:bg-[#ea580c]"
              >
                {copy.plannerCta}
              </Link>
              <Link
                href={`/${locale}/blog`}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/40 bg-white/15 px-6 text-sm font-black text-white backdrop-blur transition hover:bg-white/25"
              >
                {copy.blogCta}
              </Link>
            </div>
          </div>

          <div className="mt-10">
            <SearchForm />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
                <HugeiconsIcon icon={Tick02Icon} className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold text-[#0F172A]">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-black text-[#0F172A]">
              {copy.popular}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {copy.popularDesc}
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((destination) => (
            <article
              key={destination.cityEn}
              className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-950/5"
            >
              <div className="relative h-44">
                <Image
                  src={destination.image}
                  alt={isAr ? destination.cityAr : destination.cityEn}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-black text-[#0F172A]">
                  {isAr ? destination.cityAr : destination.cityEn}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {isAr ? destination.countryAr : destination.countryEn}
                </p>
                <p className="mt-4 text-sm font-bold text-[#F97316]">
                  {copy.from} {destination.price}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#F8FAFC] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-[#0F172A]">{copy.why}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason) => (
              <div
                key={reason}
                className="rounded-3xl border border-[#E5E7EB] bg-white p-6"
              >
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
                  <HugeiconsIcon icon={Hotel01Icon} className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-black text-[#0F172A]">{reason}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-black text-[#0F172A]">{copy.deals}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {hotelDeals.map((hotel) => (
            <article
              key={hotel.name}
              className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm"
            >
              <div className="relative h-36">
                <Image
                  src={hotel.image}
                  alt={hotel.name}
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#0F172A]">{hotel.name}</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {isAr ? hotel.cityAr : hotel.cityEn}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#F97316]">
                    {hotel.rating}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm text-slate-500">{copy.from}</span>
                  <span className="text-2xl font-black text-[#F97316]">
                    {hotel.price}
                    <span className="text-xs font-bold text-slate-500">
                      /{copy.night}
                    </span>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
