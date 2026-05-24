"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DestinationSearch } from "./destination-search";
import { GuestSelector } from "./guest-selector";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AirplaneTakeOff01Icon,
  CalendarIcon,
  Hotel01Icon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

const NATIONALITIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "AE", name: "United Arab Emirates" },
];

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
];

interface DestinationValue {
  CountryCode?: string;
  CountryName?: string;
  CityId?: number;
  CityName?: string;
}

export default function SearchForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const lang = useLocale();
  const t = useTranslations();
  const isAr = lang === "ar";

  const [destination, setDestination] = useState<{
    type: "country" | "city";
    code: string;
    id?: number;
    name: string;
    countryName?: string;
  } | null>(null);

  const [dates, setDates] = useState({
    checkIn: new Date(),
    checkOut: new Date(new Date().setDate(new Date().getDate() + 1)),
  });

  const [guests, setGuests] = useState({
    rooms: 1,
    adults: 2,
    children: 0,
    childrenAges: [] as number[],
  });

  const [nationality, setNationality] = useState("US");
  const [currency, setCurrency] = useState("USD");

  const copy = {
    title: isAr ? "ابدأ رحلتك الآن" : "Start your trip now",
    hotels: isAr ? "الفنادق" : "Hotels",
    flights: isAr ? "الطيران" : "Flights",
    services: isAr ? "الخدمات" : "Services",
    destination: isAr ? "وجهتك" : "Destination",
    checkIn: isAr ? "تاريخ الدخول" : "Check-in",
    checkOut: isAr ? "تاريخ المغادرة" : "Check-out",
    guests: isAr ? "الغرف والنزلاء" : "Rooms and guests",
    search: isAr ? "ابحث الآن" : "Search now",
    cancellation: isAr ? "إلغاء مجاني" : "Free cancellation",
  };

  const handleDestinationSelect = (
    type: "country" | "city",
    value: DestinationValue,
  ) => {
    if (type === "country") {
      setDestination({
        type: "country",
        code: value.CountryCode || "",
        name: value.CountryName || "",
      });
    } else {
      setDestination({
        type: "city",
        code: value.CountryCode || destination?.code || "",
        id: value.CityId,
        name: value.CityName || "",
        countryName: value.CountryName,
      });
    }
  };

  const handleSearch = async () => {
    if (!destination) {
      alert(t("search.selectDestination"));
      return;
    }

    setLoading(true);

    try {
      const searchParams = {
        destination,
        dates,
        guests,
        nationality,
        currency,
      };

      localStorage.setItem("hotelSearch", JSON.stringify(searchParams));
      router.push(`/${lang}/results`);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-[2rem] border border-white/70 bg-white p-4 text-[#0F172A] shadow-2xl shadow-slate-950/20 sm:p-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-normal text-[#0F172A]">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isAr
              ? "قارن أفضل الخيارات واحجز بثقة."
              : "Compare top options and book with confidence."}
          </p>
        </div>

        <div className="grid grid-cols-3 rounded-2xl bg-[#F8FAFC] p-1">
          <TabButton active icon={Hotel01Icon} label={copy.hotels} />
          <TabButton icon={AirplaneTakeOff01Icon} label={copy.flights} />
          <TabButton icon={Tick02Icon} label={copy.services} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1.35fr)_1fr_1fr_minmax(230px,1fr)_180px]">
        <SearchField label={copy.destination}>
          <DestinationSearch
            selectedCountry={destination?.code}
            selectedCity={destination?.id}
            selectedCountryName={
              destination?.countryName ||
              (destination?.type === "country" ? destination.name : undefined)
            }
            onSelect={handleDestinationSelect}
          />
        </SearchField>

        <SearchField label={copy.checkIn}>
          <DateButton
            date={dates.checkIn}
            label={copy.checkIn}
            onSelect={(date) =>
              date && setDates((prev) => ({ ...prev, checkIn: date }))
            }
            disabled={{ before: new Date() }}
          />
        </SearchField>

        <SearchField label={copy.checkOut}>
          <DateButton
            date={dates.checkOut}
            label={copy.checkOut}
            onSelect={(date) =>
              date && setDates((prev) => ({ ...prev, checkOut: date }))
            }
            disabled={{ before: dates.checkIn }}
          />
        </SearchField>

        <SearchField label={copy.guests}>
          <GuestSelector guests={guests} onChange={setGuests} />
        </SearchField>

        <Button
          onClick={handleSearch}
          disabled={loading || !destination}
          className="h-[74px] rounded-2xl bg-[#F97316] px-6 text-base font-black text-white shadow-lg shadow-orange-500/25 hover:bg-[#EA580C] disabled:opacity-60"
        >
          <HugeiconsIcon icon={Search01Icon} className="h-5 w-5" />
          {loading ? t("search.searching") : copy.search}
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex items-center gap-3 text-sm font-bold text-slate-600">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-50 text-[#F97316]">
            <HugeiconsIcon icon={Tick02Icon} className="h-4 w-4" />
          </span>
          {copy.cancellation}
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={nationality} onValueChange={setNationality}>
            <SelectTrigger className="h-11 w-full rounded-xl border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#0F172A] sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NATIONALITIES.map((nat) => (
                <SelectItem key={nat.code} value={nat.code}>
                  {nat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-11 w-full rounded-xl border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#0F172A] sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
}: {
  active?: boolean;
  icon: typeof Hotel01Icon;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition",
        active
          ? "bg-[#F97316] text-white shadow-sm"
          : "text-slate-500 hover:bg-white",
      )}
    >
      <HugeiconsIcon icon={icon} className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function SearchField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
      <p className="mb-2 px-1 text-xs font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <div className="min-h-11">{children}</div>
    </div>
  );
}

function DateButton({
  date,
  label,
  onSelect,
  disabled,
}: {
  date: Date;
  label: string;
  onSelect: (date?: Date) => void;
  disabled: { before: Date };
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 w-full justify-start rounded-xl bg-transparent px-1 text-base font-black text-[#0F172A] hover:bg-transparent"
        >
          <HugeiconsIcon
            icon={CalendarIcon}
            className="h-5 w-5 shrink-0 text-[#F97316]"
          />
          {date ? format(date, "MMM d, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto rounded-2xl border-[#E5E7EB] p-0 shadow-xl">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
