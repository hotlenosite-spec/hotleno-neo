import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AirplaneTakeOff01Icon,
  CalendarIcon,
  Car01Icon,
  CustomerService01Icon,
  DollarCircleIcon,
  GlobalIcon,
  Hotel01Icon,
  PassportIcon,
  Search01Icon,
  SecurityCheckIcon,
  User02Icon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons";

const cityHotels = [
  "Steigenberger Resort Achti",
  "Hilton Luxor Resort & Spa",
  "Cleopatra Hotel Luxor",
];

const SaudiCities = ["Jeddah", "Riyadh", "Makkah", "Dammam", "AlUla", "Taif"];

function PageShell({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="relative -mt-20 min-h-screen overflow-hidden bg-[#d3e5f8]">
      <div className="absolute inset-0 bg-[linear-gradient(125deg,#d3e5f8_1%,#fce4ec_99%)]" />
      <Image
        src="/design-assets/home-hotel-bg.png"
        alt=""
        fill
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div
        className={`relative mx-auto w-full max-w-[1440px] px-4 pb-16 pt-32 sm:px-8 ${
          compact ? "lg:pt-32" : "lg:pt-40"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  icon,
  value,
}: {
  label: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  value?: string;
}) {
  return (
    <div className="flex min-h-[86px] flex-1 items-center gap-4 rounded-[24px] border border-[#33d7ff]/60 bg-[#d8d8d8]/70 px-6 shadow-[2px_4px_4px_rgba(0,0,0,0.2)] backdrop-blur-sm">
      <HugeiconsIcon icon={icon} className="h-7 w-7 shrink-0 text-[#052948]" />
      <div>
        <p className="text-[17px] font-semibold text-[#043052]">{label}</p>
        {value ? (
          <p className="mt-1 text-sm font-medium text-[#043052]/65">{value}</p>
        ) : null}
      </div>
    </div>
  );
}

function SearchPanel({ mode }: { mode: "flight" | "hotel" }) {
  return (
    <div className="w-full rounded-[34px] border border-white/50 bg-white/30 p-4 shadow-[2px_5px_4px_rgba(0,0,0,0.25)] backdrop-blur-md sm:p-6">
      {mode === "flight" ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 text-[#043052]">
          <span className="rounded-full bg-[#043052] px-5 py-2 text-sm font-semibold text-white">
            One way
          </span>
          <span className="rounded-full bg-white/75 px-5 py-2 text-sm font-semibold">
            Round Trip
          </span>
          <span className="ml-auto rounded-full bg-white/75 px-5 py-2 text-sm font-semibold">
            Direct flights only
          </span>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-4">
        <Field
          label={mode === "flight" ? "Where from?" : "Where to?"}
          icon={mode === "flight" ? AirplaneTakeOff01Icon : Search01Icon}
          value={mode === "flight" ? "United States" : "Search hotels"}
        />
        <Field
          label={mode === "flight" ? "Where to?" : "Check-in"}
          icon={mode === "flight" ? Search01Icon : CalendarIcon}
          value={mode === "flight" ? "Luxor" : "Select date"}
        />
        <Field
          label={mode === "flight" ? "Depart" : "Check-out"}
          icon={CalendarIcon}
          value="Select date"
        />
        <Field
          label={mode === "flight" ? "1 Passenger" : "Guests and rooms"}
          icon={User02Icon}
          value={mode === "flight" ? "Economy" : "2 adults, 1 room"}
        />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-[#043052]">
          <span className="rounded-full bg-white/75 px-5 py-2">$ USD</span>
          <span className="rounded-full bg-white/75 px-5 py-2">
            Price (Lowest first)
          </span>
        </div>
        <button className="rounded-[24px] bg-[#052948] px-9 py-3 text-base font-semibold text-white shadow-[2px_4px_4px_rgba(0,0,0,0.18)]">
          Search
        </button>
      </div>
    </div>
  );
}

export function FlightsStaticPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-7 flex w-full max-w-[655px] items-center justify-between rounded-[28px] border border-[#65c3dd]/70 bg-[#d9d9d9]/70 p-3 shadow-[2px_5px_4px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          <div className="flex h-[87px] flex-1 items-center justify-center gap-3 rounded-[28px] bg-white text-[28px] font-semibold text-[#052948] sm:text-[36px]">
            <HugeiconsIcon icon={AirplaneTakeOff01Icon} className="h-10 w-10" />
            <span>Flights</span>
          </div>
          <Link
            href="../"
            className="flex h-[87px] flex-1 items-center justify-center gap-3 rounded-[28px] text-[28px] font-semibold text-[#052948] transition hover:bg-white/45 sm:text-[36px]"
          >
            <HugeiconsIcon icon={Hotel01Icon} className="h-10 w-10" />
            <span>Hotels</span>
          </Link>
        </div>
        <h1 className="mb-6 text-[40px] font-semibold leading-tight text-[#052948] sm:text-[54px]">
          Best flight deals to Luxor
        </h1>
        <SearchPanel mode="flight" />
        <section className="mt-10">
          <h2 className="mb-5 text-[30px] font-semibold text-[#052948]">
            Popular Hotels in Luxor
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {cityHotels.map((hotel) => (
              <article
                key={hotel}
                className="rounded-[8px] border border-white/55 bg-white/55 p-5 shadow-[2px_5px_4px_rgba(0,0,0,0.15)] backdrop-blur-md"
              >
                <div className="mb-5 h-36 rounded-[8px] bg-[linear-gradient(135deg,#89c6ec,#fff0f5)]" />
                <h3 className="text-xl font-semibold text-[#052948]">
                  {hotel}
                </h3>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export function ServicesStaticPage() {
  const services = [
    {
      title: "Car Rental",
      text: "Choose the right car for every trip and move at your own pace.",
      icon: Car01Icon,
    },
    {
      title: "eSIM Packages",
      text: "Stay connected with travel data packages across destinations.",
      icon: Wifi01Icon,
    },
    {
      title: "Visa Requirements",
      text: "Review the essentials before you travel.",
      icon: PassportIcon,
    },
  ];

  const benefits = [
    { title: "24/7 customer service", icon: CustomerService01Icon },
    { title: "Multiple payment methods", icon: DollarCircleIcon },
    { title: "Thousands of flight and hotel offers", icon: GlobalIcon },
    { title: "Best travel deals in the United States", icon: SecurityCheckIcon },
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-[1160px]">
        <h1 className="mb-8 text-center text-[40px] font-semibold text-[#052948] sm:text-[56px]">
          With us, travel has meaning!
        </h1>
        <div className="grid gap-5 md:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="rounded-[8px] border border-white/60 bg-white/65 p-7 shadow-[2px_5px_4px_rgba(0,0,0,0.18)] backdrop-blur-md"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[8px] bg-[#052948] text-white">
                <HugeiconsIcon icon={service.icon} className="h-9 w-9" />
              </div>
              <h2 className="text-2xl font-semibold text-[#052948]">
                {service.title}
              </h2>
              <p className="mt-3 min-h-20 text-base leading-7 text-[#052948]/75">
                {service.text}
              </p>
              <button className="mt-6 rounded-[24px] bg-[#052948] px-6 py-3 text-sm font-semibold text-white">
                Discover more
              </button>
            </article>
          ))}
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-4">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex min-h-[138px] flex-col justify-center rounded-[8px] bg-white/55 p-5 text-[#052948] shadow-[2px_5px_4px_rgba(0,0,0,0.13)] backdrop-blur-md"
            >
              <HugeiconsIcon icon={benefit.icon} className="mb-3 h-8 w-8" />
              <p className="text-lg font-semibold leading-6">{benefit.title}</p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

export function AuthStaticPage({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login";
  const fields = isLogin
    ? ["Email Id", "Password"]
    : ["Username", "Email Id", "Password", "Confirm Password"];

  return (
    <PageShell compact>
      <div className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[8px] bg-white/80 p-7 shadow-[2px_5px_4px_rgba(0,0,0,0.18)] backdrop-blur-md">
          <h1 className="text-[38px] font-semibold text-[#052948]">Welcome</h1>
          <p className="mt-2 text-xl font-semibold text-[#052948]">
            {isLogin ? "Login with Email" : "Sign Up with Email"}
          </p>
          <div className="mt-8 space-y-5">
            {fields.map((field) => (
              <label key={field} className="block">
                <span className="text-sm font-semibold text-[#052948]">
                  {field}
                </span>
                <span className="mt-2 block h-12 rounded-[8px] border border-[#9fc3d7] bg-white" />
              </label>
            ))}
          </div>
          <button className="mt-8 w-full rounded-[24px] bg-[#052948] py-3 text-base font-semibold text-white">
            {isLogin ? "login" : "Sign Up"}
          </button>
          <div className="my-6 text-center text-sm font-semibold text-[#052948]">
            OR
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="rounded-[24px] border border-[#9fc3d7] bg-white px-4 py-3 text-sm font-semibold text-[#052948]">
              Google
            </button>
            <button className="rounded-[24px] border border-[#9fc3d7] bg-white px-4 py-3 text-sm font-semibold text-[#052948]">
              Facebook
            </button>
          </div>
          <p className="mt-7 text-center text-sm font-semibold text-[#052948]">
            {isLogin ? "Don't have an account ? " : "Already have an account? "}
            <Link
              href={isLogin ? "../sign-up" : "../login"}
              className="text-[#0b77bd]"
            >
              {isLogin ? "Sign Up" : "Login"}
            </Link>
          </p>
        </div>
        <div className="flex min-h-[560px] items-end rounded-[8px] bg-[linear-gradient(135deg,rgba(5,41,72,0.82),rgba(93,180,217,0.35))] p-8 shadow-[2px_5px_4px_rgba(0,0,0,0.18)]">
          <h2 className="max-w-[480px] text-[44px] font-semibold leading-tight text-white sm:text-[60px]">
            Start your amazing journey by one click, explore world!
          </h2>
        </div>
      </div>
    </PageShell>
  );
}

export function HotelCitiesStaticPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-[1120px]">
        <h1 className="mb-6 text-[40px] font-semibold text-[#052948] sm:text-[54px]">
          Hotels in Saudi Arabia
        </h1>
        <SearchPanel mode="hotel" />
        <section className="mt-10">
          <h2 className="mb-5 text-[30px] font-semibold text-[#052948]">
            Find Best Hotels in Popular Cities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SaudiCities.map((city) => (
              <article
                key={city}
                className="rounded-[8px] border border-white/55 bg-white/60 p-5 shadow-[2px_5px_4px_rgba(0,0,0,0.15)] backdrop-blur-md"
              >
                <div className="mb-4 h-32 rounded-[8px] bg-[linear-gradient(135deg,#85c4ec,#f8e4ed)]" />
                <h3 className="text-2xl font-semibold text-[#052948]">
                  {city}
                </h3>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function PolicyPage({ title }: { title: "Terms" | "Privacy" }) {
  const items = [
    "Security and Payment",
    "Service delivery and bookings",
    "Account and communication",
    "Cancellation and refunds",
    "Travel documents",
  ];

  return (
    <PageShell compact>
      <div className="mx-auto grid max-w-[1160px] gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-[8px] bg-white/70 p-5 shadow-[2px_5px_4px_rgba(0,0,0,0.16)] backdrop-blur-md">
          <div className="flex h-12 items-center gap-3 rounded-[8px] border border-[#9fc3d7] bg-white px-4 text-[#052948]">
            <HugeiconsIcon icon={Search01Icon} className="h-5 w-5" />
            <span className="text-sm font-semibold">Search</span>
          </div>
          <div className="mt-5 space-y-3">
            {items.map((item, index) => (
              <div
                key={item}
                className="rounded-[8px] bg-white/70 px-4 py-3 text-sm font-semibold text-[#052948]"
              >
                {index + 1}.{item}
              </div>
            ))}
          </div>
        </aside>
        <article className="rounded-[8px] bg-white/75 p-7 shadow-[2px_5px_4px_rgba(0,0,0,0.16)] backdrop-blur-md">
          <p className="mb-3 text-sm font-semibold text-[#0b77bd]">{title}</p>
          <h1 className="text-[38px] font-semibold text-[#052948]">
            {title === "Terms" ? "Services" : "Privacy"}
          </h1>
          <p className="mt-6 max-w-[780px] text-lg leading-9 text-[#052948]/78">
            Hotleno Pte Ltd, a Singaporean company with Travel Agency License
            TA03513 and IATA 32301474, provides travel booking services through
            this website. These pages collect the main service, payment,
            booking, privacy, and account terms in one clear place.
          </p>
          <button className="mt-8 rounded-[24px] bg-[#052948] px-7 py-3 text-sm font-semibold text-white">
            Read more
          </button>
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
