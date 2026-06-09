import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import SearchForm from "@/components/search/search-form";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AirplaneTakeOff01Icon,
  Car01Icon,
  CreditCardIcon,
  CustomerServiceIcon,
  Hotel01Icon,
  Shield02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { buildLocalizedMetadata } from "@/lib/seo";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps) {
  const { locale } = await params;
  const isAr = locale === "ar";

  return buildLocalizedMetadata({
    locale,
    title: isAr
      ? "حجز الفنادق وإدارة رحلتك بسهولة"
      : "Hotel Search and Booking Management",
    description: isAr
      ? "HOTLENO منصة حجز فنادق تساعدك على البحث والمقارنة وإدارة حجوزاتك بسهولة."
      : "Search hotel availability, compare options, and manage your bookings through HOTLENO.",
  });
}

const heroImage =
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2200&auto=format&fit=crop";

const destinations = [
  {
    id: "dubai",
    image:
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: "istanbul",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: "riyadh",
    image:
      "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: "london",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=900&auto=format&fit=crop",
  },
] as const;

const stayInspirations = [
  {
    id: "waterfront",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "heritage",
    image:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "city",
    image:
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "central",
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=600&auto=format&fit=crop",
  },
] as const;

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "homePage" });

  const benefits = [
    { key: "trustedBooking", icon: Shield02Icon },
    { key: "customerSupport", icon: CustomerServiceIcon },
    { key: "securePayment", icon: CreditCardIcon },
    { key: "trustedProviders", icon: Tick02Icon },
  ] as const;

  const services = [
    {
      key: "transfers",
      href: `/${locale}/transfers`,
      icon: Car01Icon,
    },
    {
      key: "activities",
      href: `/${locale}/activities`,
      icon: AirplaneTakeOff01Icon,
    },
  ] as const;

  const reasons = [
    { key: "support", icon: CustomerServiceIcon },
    { key: "simpleBooking", icon: Tick02Icon },
    { key: "secureExperience", icon: Shield02Icon },
    { key: "hotelOptions", icon: Hotel01Icon },
  ] as const;

  return (
    <div className="overflow-x-clip bg-white text-[#0F172A]">
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
              {t("heroBadge")}
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-white/90 sm:text-xl">
              {t("heroSubtitle")}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/${locale}/smart-trip-planner`}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F97316] px-6 text-sm font-black text-white shadow-xl shadow-orange-500/25 transition hover:bg-[#ea580c]"
              >
                {t("plannerCta")}
              </Link>
              <Link
                href={`/${locale}/blog`}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/40 bg-white/15 px-6 text-sm font-black text-white backdrop-blur transition hover:bg-white/25"
              >
                {t("blogCta")}
              </Link>
            </div>
          </div>

          <div className="mt-10 min-w-0">
            <SearchForm />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ key, icon }) => (
            <div key={key} className="flex min-w-0 items-center gap-3 rounded-2xl p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
                <HugeiconsIcon icon={icon} className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold text-[#0F172A]">
                {t(`benefits.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {services.map((service) => (
            <article
              key={service.href}
              className="relative overflow-hidden rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] p-5 shadow-sm md:p-7"
            >
              <div className="pointer-events-none absolute -bottom-8 -end-8 flex h-36 w-36 items-center justify-center rounded-full bg-orange-50 text-[#F97316]/10">
                <HugeiconsIcon icon={service.icon} className="h-20 w-20" />
              </div>
              <div className="relative flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
                    <HugeiconsIcon icon={service.icon} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black text-[#0F172A]">
                      {t(`services.${service.key}.title`)}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                      {t(`services.${service.key}.description`)}
                    </p>
                  </div>
                </div>
                <Link
                  href={service.href}
                  className="inline-flex h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-[#F97316] px-6 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#ea580c] md:w-auto"
                >
                  {t(`services.${service.key}.cta`)}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-[#0F172A]">
            {t("destinations.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            {t("destinations.description")}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((destination) => (
            <article
              key={destination.id}
              className="group overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-950/5"
            >
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={destination.image}
                  alt={t(`destinations.items.${destination.id}.city`)}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-black text-[#0F172A]">
                  {t(`destinations.items.${destination.id}.city`)}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {t(`destinations.items.${destination.id}.country`)}
                </p>
                <p className="mt-4 text-sm font-bold text-[#F97316]">
                  {t("destinations.explore")}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#F8FAFC] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-[#0F172A]">
            {t("why.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            {t("why.description")}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map(({ key, icon }) => (
              <article
                key={key}
                className="rounded-3xl border border-[#E5E7EB] bg-white p-6"
              >
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
                  <HugeiconsIcon icon={icon} className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-black text-[#0F172A]">
                  {t(`why.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  {t(`why.items.${key}.description`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-[#0F172A]">
            {t("inspiration.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            {t("inspiration.description")}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stayInspirations.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-950/5"
            >
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={item.image}
                  alt={t(`inspiration.items.${item.id}.title`)}
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="font-black text-[#0F172A]">
                  {t(`inspiration.items.${item.id}.title`)}
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  {t(`inspiration.items.${item.id}.description`)}
                </p>
                <p className="mt-4 text-sm font-bold text-[#F97316]">
                  {t("inspiration.cta")}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
