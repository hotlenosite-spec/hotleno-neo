"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AirplaneTakeOff01Icon,
  CalendarIcon,
  Car01Icon,
  DollarCircleIcon,
  PassportIcon,
  Search01Icon,
  SecurityCheckIcon,
  User02Icon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons";

const orange = "text-[#F97316]";

const cityCards = [
  { cityEn: "Riyadh", cityAr: "الرياض", countryEn: "Saudi Arabia", countryAr: "السعودية", priceEn: "From SAR 420", priceAr: "يبدأ من 420 ر.س" },
  { cityEn: "Jeddah", cityAr: "جدة", countryEn: "Saudi Arabia", countryAr: "السعودية", priceEn: "From SAR 390", priceAr: "يبدأ من 390 ر.س" },
  { cityEn: "Makkah", cityAr: "مكة", countryEn: "Saudi Arabia", countryAr: "السعودية", priceEn: "From SAR 360", priceAr: "يبدأ من 360 ر.س" },
  { cityEn: "AlUla", cityAr: "العلا", countryEn: "Saudi Arabia", countryAr: "السعودية", priceEn: "From SAR 510", priceAr: "يبدأ من 510 ر.س" },
];

const copy = {
  en: {
    tabsFlight: ["Flights", "Hotels", "Services"],
    tabsHotel: ["Hotels", "Flights", "Services"],
    from: "From",
    to: "To",
    destination: "Destination",
    checkIn: "Check-in",
    date: "Date",
    passenger: "Passenger",
    guests: "Guests",
    selectDeparture: "Select departure city",
    selectDestination: "Select destination",
    whereGoing: "Where are you going?",
    selectDate: "Select date",
    onePassenger: "1 passenger",
    twoAdults: "2 adults, 1 room",
    search: "Search",
    flightEyebrow: "Hotleno flights",
    flightTitle: "Find flights with a cleaner travel experience",
    flightDesc: "A simple OTA-style flight page prepared for the Hotleno identity, without changing supplier or booking logic.",
    flightFeatures: ["Flexible options", "Secure booking", "Competitive fares"],
    flightFeatureDesc: "Travel tools are styled consistently with the new Hotleno OTA interface.",
    servicesEyebrow: "Travel services",
    servicesTitle: "Everything around the trip, kept simple",
    servicesDesc: "Service cards now share the same clean orange style as the homepage.",
    services: [
      ["Car Rental", "Clean travel add-ons for local and international trips."],
      ["eSIM Packages", "Connectivity services prepared for a future travel marketplace."],
      ["Visa Requirements", "Simple guidance surfaces with the same Hotleno orange identity."],
    ],
    discoverMore: "Discover more",
    loginEyebrow: "Welcome back",
    signupEyebrow: "Create account",
    loginTitle: "Login to Hotleno",
    signupTitle: "Join Hotleno",
    authDesc: "A clean and secure account experience aligned with the new Hotleno identity.",
    login: "Login",
    createAccount: "Create account",
    fullName: "Full name",
    email: "Email address",
    password: "Password",
    confirmPassword: "Confirm password",
    or: "OR",
    noAccount: "Don't have an account? ",
    hasAccount: "Already have an account? ",
    signUp: "Sign up",
    authSide: "Book hotels and trips with a smoother OTA experience.",
    loginPanelTitle: "Book your hotels and trips with ease",
    loginPanelSubtitle:
      "Sign in to access your bookings and manage your trips quickly and smoothly.",
    signupPanelTitle: "Start your journey with Hotleno",
    signupPanelSubtitle:
      "Create your account now and enjoy a faster, easier, and smoother booking experience.",
    hotelsEyebrow: "Hotels",
    hotelsTitle: "Explore hotels with Hotleno",
    hotelsDesc: "A focused hotel page with a prominent search box, clean cards, and the new orange OTA identity.",
    popularDestinations: "Popular destinations",
    cleanCityPicks: "Clean city picks",
    policySearch: "Search",
    policyItems: ["Security and payment", "Service delivery and bookings", "Account and communication", "Cancellation and refunds", "Travel documents"],
    termsEyebrow: "Hotleno Terms",
    privacyEyebrow: "Hotleno Privacy",
    termsTitle: "Terms of service",
    privacyTitle: "Privacy policy",
    policyBody: "Hotleno provides travel booking services through a clear, secure, and professional interface. This page keeps the policy experience visually aligned with the refreshed OTA design while preserving the current application behavior."
  },
  ar: {
    tabsFlight: ["الطيران", "الفنادق", "الخدمات"],
    tabsHotel: ["الفنادق", "الطيران", "الخدمات"],
    from: "من",
    to: "إلى",
    destination: "الوجهة",
    checkIn: "تاريخ الدخول",
    date: "التاريخ",
    passenger: "المسافر",
    guests: "النزلاء",
    selectDeparture: "اختر مدينة المغادرة",
    selectDestination: "اختر الوجهة",
    whereGoing: "إلى أين تريد السفر؟",
    selectDate: "اختر التاريخ",
    onePassenger: "مسافر واحد",
    twoAdults: "بالغان، غرفة واحدة",
    search: "بحث",
    flightEyebrow: "رحلات Hotleno",
    flightTitle: "ابحث عن رحلاتك بتجربة سفر أوضح",
    flightDesc: "صفحة طيران جاهزة بصرياً لهوية Hotleno الجديدة بدون تغيير منطق الحجز أو الموردين.",
    flightFeatures: ["خيارات مرنة", "حجز آمن", "أسعار منافسة"],
    flightFeatureDesc: "أدوات السفر تظهر بنفس هوية Hotleno البرتقالية النظيفة.",
    servicesEyebrow: "خدمات السفر",
    servicesTitle: "كل ما تحتاجه حول رحلتك ببساطة",
    servicesDesc: "بطاقات الخدمات أصبحت متوافقة مع تصميم الصفحة الرئيسية الجديد.",
    services: [
      ["تأجير السيارات", "خدمات سفر إضافية منظمة للرحلات المحلية والدولية."],
      ["باقات eSIM", "خدمات اتصال جاهزة لاحقاً لسوق السفر."],
      ["متطلبات التأشيرة", "إرشادات مبسطة بنفس هوية Hotleno البرتقالية."],
    ],
    discoverMore: "اكتشف المزيد",
    loginEyebrow: "مرحباً بعودتك",
    signupEyebrow: "إنشاء حساب",
    loginTitle: "تسجيل الدخول إلى Hotleno",
    signupTitle: "انضم إلى Hotleno",
    authDesc: "تجربة حساب نظيفة وآمنة متوافقة مع هوية Hotleno الجديدة.",
    login: "تسجيل الدخول",
    createAccount: "إنشاء الحساب",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    or: "أو",
    noAccount: "ليس لديك حساب؟ ",
    hasAccount: "لديك حساب بالفعل؟ ",
    signUp: "إنشاء حساب",
    authSide: "احجز فنادقك ورحلاتك بتجربة OTA أكثر سلاسة.",
    loginPanelTitle: "احجز فنادقك ورحلاتك بسهولة",
    loginPanelSubtitle:
      "سجّل دخولك للوصول إلى حجوزاتك ومتابعة رحلاتك بسرعة وسهولة.",
    signupPanelTitle: "ابدأ رحلتك مع Hotleno",
    signupPanelSubtitle:
      "أنشئ حسابك الآن واستمتع بتجربة حجز أسرع وأسهل وأكثر سلاسة.",
    hotelsEyebrow: "الفنادق",
    hotelsTitle: "استكشف الفنادق مع Hotleno",
    hotelsDesc: "صفحة فنادق مركزة مع صندوق بحث واضح وكروت نظيفة وهوية برتقالية موحدة.",
    popularDestinations: "وجهات شائعة",
    cleanCityPicks: "اختيارات مدن مختصرة",
    policySearch: "بحث",
    policyItems: ["الأمان والدفع", "تقديم الخدمة والحجوزات", "الحساب والتواصل", "الإلغاء والاسترداد", "وثائق السفر"],
    termsEyebrow: "شروط Hotleno",
    privacyEyebrow: "خصوصية Hotleno",
    termsTitle: "شروط الخدمة",
    privacyTitle: "سياسة الخصوصية",
    policyBody: "تقدم Hotleno خدمات حجز السفر من خلال واجهة واضحة وآمنة واحترافية. تحافظ هذه الصفحة على تجربة السياسات بنفس التصميم الجديد دون تغيير سلوك التطبيق الحالي."
  }
};

function useCopy() {
  const locale = useLocale();
  return locale === "ar" ? copy.ar : copy.en;
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F8FAFC] pt-24 text-[#0F172A]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#F97316]">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
}: {
  label: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  value: string;
}) {
  return (
    <div className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50">
        <HugeiconsIcon icon={icon} className={`h-6 w-6 ${orange}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-bold text-[#0F172A]">
          {value}
        </p>
      </div>
    </div>
  );
}

function SearchPanel({ mode }: { mode: "flight" | "hotel" }) {
  const c = useCopy();
  const tabs = mode === "flight" ? c.tabsFlight : c.tabsHotel;

  return (
    <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-xl shadow-slate-900/8 sm:p-5">
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab, index) => (
          <span
            key={tab}
            className={
              index === 0
                ? "rounded-full bg-[#F97316] px-5 py-2 text-sm font-black text-white"
                : "rounded-full border border-[#E5E7EB] bg-white px-5 py-2 text-sm font-bold text-slate-600"
            }
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
        <Field
          label={mode === "flight" ? c.from : c.destination}
          icon={mode === "flight" ? AirplaneTakeOff01Icon : Search01Icon}
          value={mode === "flight" ? c.selectDeparture : c.whereGoing}
        />
        <Field
          label={mode === "flight" ? c.to : c.checkIn}
          icon={mode === "flight" ? Search01Icon : CalendarIcon}
          value={mode === "flight" ? c.selectDestination : c.selectDate}
        />
        <Field label={c.date} icon={CalendarIcon} value={c.selectDate} />
        <Field
          label={mode === "flight" ? c.passenger : c.guests}
          icon={User02Icon}
          value={mode === "flight" ? c.onePassenger : c.twoAdults}
        />
        <button className="min-h-[76px] rounded-2xl bg-[#F97316] px-8 text-base font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#ea580c]">
          {c.search}
        </button>
      </div>
    </div>
  );
}

export function FlightsStaticPage() {
  const c = useCopy();
  const features = [
    { title: c.flightFeatures[0], icon: CalendarIcon },
    { title: c.flightFeatures[1], icon: SecurityCheckIcon },
    { title: c.flightFeatures[2], icon: DollarCircleIcon },
  ];

  return (
    <PageShell>
      <SectionHeader
        eyebrow={c.flightEyebrow}
        title={c.flightTitle}
        description={c.flightDesc}
      />
      <SearchPanel mode="flight" />

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm"
          >
            <HugeiconsIcon
              icon={feature.icon}
              className={`mb-4 h-8 w-8 ${orange}`}
            />
            <h2 className="text-lg font-black text-[#0F172A]">
              {feature.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {c.flightFeatureDesc}
            </p>
          </article>
        ))}
      </section>
    </PageShell>
  );
}

export function ServicesStaticPage() {
  const c = useCopy();
  const services = [
    {
      title: c.services[0][0],
      text: c.services[0][1],
      icon: Car01Icon,
    },
    {
      title: c.services[1][0],
      text: c.services[1][1],
      icon: Wifi01Icon,
    },
    {
      title: c.services[2][0],
      text: c.services[2][1],
      icon: PassportIcon,
    },
  ];

  return (
    <PageShell>
      <SectionHeader
        eyebrow={c.servicesEyebrow}
        title={c.servicesTitle}
        description={c.servicesDesc}
      />
      <div className="grid gap-5 md:grid-cols-3">
        {services.map((service) => (
          <article
            key={service.title}
            className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
              <HugeiconsIcon icon={service.icon} className={`h-8 w-8 ${orange}`} />
            </div>
            <h2 className="text-xl font-black text-[#0F172A]">
              {service.title}
            </h2>
            <p className="mt-3 min-h-20 text-sm leading-7 text-slate-600">
              {service.text}
            </p>
            <button className="mt-6 rounded-xl bg-[#F97316] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ea580c]">
              {c.discoverMore}
            </button>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function AuthVisualPanel({
  isLogin,
  title,
  subtitle,
}: {
  isLogin: boolean;
  title: string;
  subtitle: string;
}) {
  return (
    <aside className="relative order-first min-h-[320px] overflow-hidden rounded-[28px] p-8 text-white shadow-xl shadow-orange-500/10 lg:min-h-[560px]">
      <Image
        src={isLogin ? "/hero2.jpg" : "/hero1.jpg"}
        alt=""
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
        priority={false}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.74),rgba(249,115,22,0.68))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_34%)]" />

      <div className="relative flex h-full min-h-[256px] flex-col justify-end lg:min-h-[496px]">
        <p className="mb-4 inline-flex w-fit rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur">
          Hotleno
        </p>
        <h2 className="max-w-md text-3xl font-black leading-tight sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-md text-sm font-semibold leading-7 text-white/90 sm:text-base">
          {subtitle}
        </p>
      </div>
    </aside>
  );
}

export function AuthStaticPage({ mode }: { mode: "login" | "signup" }) {
  const c = useCopy();
  const isLogin = mode === "login";
  const fields = isLogin
    ? [c.email, c.password]
    : [c.fullName, c.email, c.password, c.confirmPassword];

  return (
    <PageShell>
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="order-last rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-xl shadow-slate-900/8 sm:p-8 lg:order-last">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F97316]">
            {isLogin ? c.loginEyebrow : c.signupEyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#0F172A]">
            {isLogin ? c.loginTitle : c.signupTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {c.authDesc}
          </p>

          <div className="mt-7 space-y-4">
            {fields.map((field) => (
              <label key={field} className="block">
                <span className="text-sm font-bold text-[#0F172A]">{field}</span>
                <span className="mt-2 block h-12 rounded-xl border border-[#E5E7EB] bg-white" />
              </label>
            ))}
          </div>

          <button className="mt-7 w-full rounded-xl bg-[#F97316] py-3 text-base font-black text-white transition hover:bg-[#ea580c]">
            {isLogin ? c.login : c.createAccount}
          </button>

          <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-[#E5E7EB]" />
            {c.or}
            <span className="h-px flex-1 bg-[#E5E7EB]" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-black text-[#0F172A]">
              Google
            </button>
            <button className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-black text-[#0F172A]">
              Facebook
            </button>
          </div>

          <p className="mt-7 text-center text-sm font-bold text-slate-600">
            {isLogin ? c.noAccount : c.hasAccount}
            <Link
              href={isLogin ? "../sign-up" : "../login"}
              className="font-black text-[#F97316]"
            >
              {isLogin ? c.signUp : c.login}
            </Link>
          </p>
        </section>

        <AuthVisualPanel
          isLogin={isLogin}
          title={isLogin ? c.loginPanelTitle : c.signupPanelTitle}
          subtitle={isLogin ? c.loginPanelSubtitle : c.signupPanelSubtitle}
        />
      </div>
    </PageShell>
  );
}

export function HotelCitiesStaticPage() {
  const c = useCopy();
  const locale = useLocale();
  const isAr = locale === "ar";
  return (
    <PageShell>
      <SectionHeader
        eyebrow={c.hotelsEyebrow}
        title={c.hotelsTitle}
        description={c.hotelsDesc}
      />
      <SearchPanel mode="hotel" />

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F97316]">
              {c.popularDestinations}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#0F172A]">
              {c.cleanCityPicks}
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cityCards.map((item) => (
            <article
              key={item.cityEn}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm"
            >
              <div className="mb-4 h-28 rounded-2xl bg-[linear-gradient(135deg,#FFF7ED,#FFEDD5)]" />
              <h3 className="text-xl font-black text-[#0F172A]">
                {isAr ? item.cityAr : item.cityEn}
              </h3>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {isAr ? item.countryAr : item.countryEn}
              </p>
              <p className="mt-4 text-sm font-black text-[#F97316]">
                {isAr ? item.priceAr : item.priceEn}
              </p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function PolicyPage({ title }: { title: "Terms" | "Privacy" }) {
  const c = useCopy();
  const items = c.policyItems;

  return (
    <PageShell>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex h-12 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-slate-500">
            <HugeiconsIcon icon={Search01Icon} className="h-5 w-5 text-[#F97316]" />
            <span className="text-sm font-bold">{c.policySearch}</span>
          </div>
          <div className="mt-5 space-y-2">
            {items.map((item, index) => (
              <div
                key={item}
                className="rounded-xl bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-[#0F172A]"
              >
                {index + 1}. {item}
              </div>
            ))}
          </div>
        </aside>

        <article className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm sm:p-9">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F97316]">
            {title === "Terms" ? c.termsEyebrow : c.privacyEyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-black text-[#0F172A]">
            {title === "Terms" ? c.termsTitle : c.privacyTitle}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600">
            {c.policyBody}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {items.slice(0, 4).map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-sm font-bold text-[#0F172A]"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </div>
    </PageShell>
  );
}

export function TermsStaticPage() {
  return <PolicyPage title="Terms" />;
}

export function PrivacyStaticPage() {
  return <PolicyPage title="Privacy" />;
}
