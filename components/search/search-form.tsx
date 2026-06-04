"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { GuestSelector } from "./guest-selector";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import type { HotelbedsSearchSuggestion } from "@/types/hotelbeds-content";

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

type UnknownRecord = Record<string, unknown>;

const TBO_CERTIFICATION_SUGGESTION: HotelbedsSearchSuggestion = {
  type: "destination",
  label: "TBO Certification Test",
  value: "TBO Certification Test",
};

const TBO_DUBAI_SUGGESTION: HotelbedsSearchSuggestion = {
  type: "destination",
  label: "Dubai, United Arab Emirates",
  value: "Dubai",
  destinationCode: "115936",
  cityCode: "115936",
  countryCode: "AE",
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNumberAsString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return getString(value);
}

function getNestedRecord(source: UnknownRecord, key: string): UnknownRecord | null {
  const value = source[key];
  return isRecord(value) ? value : null;
}

function buildSuggestionLabel(record: UnknownRecord): string {
  const name =
    getString(record.label) ||
    getString(record.name) ||
    getString(record.description) ||
    getString(record.destinationName) ||
    getString(record.countryName) ||
    getString(record.zoneName) ||
    getString(record.hotelName) ||
    getString(record.contentName);

  const code =
    getNumberAsString(record.code) ||
    getString(record.destinationCode) ||
    getString(record.countryCode) ||
    getString(record.zoneCode) ||
    getString(record.hotelCode);

  return name || code;
}

function inferSuggestionType(record: UnknownRecord): HotelbedsSearchSuggestion["type"] {
  const rawType = getString(record.type).toLowerCase();

  if (rawType === "hotel") return "hotel";
  if (rawType === "country") return "country";
  if (rawType === "zone") return "zone";
  if (rawType === "destination" || rawType === "city") return "destination";

  if (record.hotelCode || record.hotel || record.hotelName) return "hotel";
  if (record.zoneCode || record.zoneName) return "zone";
  if (record.countryCode || record.countryName) return "country";

  return "destination";
}

function normalizeSuggestion(item: unknown): HotelbedsSearchSuggestion | null {
  if (!isRecord(item)) return null;

  const hotel = getNestedRecord(item, "hotel");
  const destination = getNestedRecord(item, "destination");
  const country = getNestedRecord(item, "country");
  const zone = getNestedRecord(item, "zone");

  const merged: UnknownRecord = {
    ...item,
    ...(hotel || {}),
    ...(destination || {}),
    ...(country || {}),
    ...(zone || {}),
  };

  const label = buildSuggestionLabel(merged);

  if (!label) return null;

  const type = inferSuggestionType(merged);

  const hotelCode =
    getNumberAsString(merged.hotelCode) ||
    (type === "hotel" ? getNumberAsString(merged.code) : undefined);

  const destinationCode =
    getString(merged.destinationCode) ||
    getString(merged.destination) ||
    (type === "destination" ? getString(merged.code) : undefined);

  const cityCode = getString(merged.cityCode);

  const countryCode =
    getString(merged.countryCode) ||
    (type === "country" ? getString(merged.code) : undefined);

  const zoneCode =
    getNumberAsString(merged.zoneCode) ||
    (type === "zone" ? getNumberAsString(merged.code) : undefined);

  const suggestionValue =
    getString(merged.value) ||
    hotelCode ||
    destinationCode ||
    countryCode ||
    zoneCode ||
    label;

  return {
    type,
    label,
    value: suggestionValue,
    hotelCode,
    destinationCode,
    cityCode,
    countryCode,
    zoneCode,
  };
}

function uniqueSuggestions(
  suggestions: HotelbedsSearchSuggestion[],
): HotelbedsSearchSuggestion[] {
  const seen = new Set<string>();
  const unique: HotelbedsSearchSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = [
      suggestion.type,
      suggestion.value,
      suggestion.label.toLowerCase(),
      suggestion.hotelCode || "",
      suggestion.destinationCode || "",
      suggestion.cityCode || "",
      suggestion.countryCode || "",
      suggestion.zoneCode || "",
    ].join(":");

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(suggestion);
  }

  return unique;
}

function getSuggestionPriority(type: HotelbedsSearchSuggestion["type"]) {
  if (type === "destination") return 1;
  if (type === "zone") return 2;
  if (type === "country") return 3;
  if (type === "hotel") return 4;
  return 5;
}

function sortSuggestions(
  suggestions: HotelbedsSearchSuggestion[],
): HotelbedsSearchSuggestion[] {
  return [...suggestions].sort((a, b) => {
    const priority = getSuggestionPriority(a.type) - getSuggestionPriority(b.type);

    if (priority !== 0) return priority;

    return a.label.localeCompare(b.label);
  });
}

function extractSuggestions(payload: unknown): HotelbedsSearchSuggestion[] {
  if (!isRecord(payload)) return [];

  const data = isRecord(payload.data) ? payload.data : null;

  const possibleArrays = [
    payload.suggestions,
    data?.suggestions,
    payload.locations,
    data?.locations,
    payload.results,
    data?.results,
    payload.items,
    data?.items,
    payload.destinations,
    data?.destinations,
    payload.hotels,
    data?.hotels,
    payload.countries,
    data?.countries,
    payload.zones,
    data?.zones,
  ];

  const normalized = possibleArrays
    .flatMap((value) => asArray(value))
    .map(normalizeSuggestion)
    .filter((item): item is HotelbedsSearchSuggestion => Boolean(item));

  return sortSuggestions(uniqueSuggestions(normalized));
}

function decodeJwtPayload(token: string): UnknownRecord | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(
      normalizedPayload.padEnd(
        normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
        "=",
      ),
    );
    const parsed = JSON.parse(decodedPayload) as unknown;

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isTboTesterPayload(payload: UnknownRecord | null) {
  return (
    getString(payload?.email).toLowerCase() === "tbo.tester@hotleno.com" ||
    (getString(payload?.role) === "supplier_tester" &&
      getString(payload?.supplierScope) === "tbo")
  );
}

function getClientTboCertificationMode() {
  const envMode =
    process.env.NEXT_PUBLIC_TBO_CERTIFICATION_MODE === "true" ||
    process.env.TBO_CERTIFICATION_MODE === "true";

  if (envMode) return true;
  if (typeof window === "undefined") return false;

  return isTboTesterPayload(decodeJwtPayload(localStorage.getItem("token") || ""));
}

function buildTboCertificationSuggestion(label: string): HotelbedsSearchSuggestion {
  const normalizedLabel = label.trim() || TBO_CERTIFICATION_SUGGESTION.label;

  return {
    ...TBO_CERTIFICATION_SUGGESTION,
    label: normalizedLabel,
    value: normalizedLabel,
  };
}

function isDubaiSearchTerm(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "dubai" ||
    normalized === "dxb" ||
    normalized === "دبي" ||
    normalized.includes("dubai") ||
    normalized.includes("دبي")
  );
}

async function fetchHotelbedsSuggestions(
  term: string,
  signal: AbortSignal,
): Promise<HotelbedsSearchSuggestion[]> {
  const endpoint = `/api/integrations/hotelbeds/content/search?query=${encodeURIComponent(
    term,
  )}&limit=20`;

  try {
    const response = await fetch(endpoint, { signal });
    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const message =
        isRecord(payload) && getString(payload.error)
          ? getString(payload.error)
          : `HTTP ${response.status}`;

      console.warn("Hotelbeds destination autocomplete failed:", message);
      return [];
    }

    return extractSuggestions(payload);
  } catch (error) {
    if (signal.aborted) throw error;

    console.warn(
      "Hotelbeds destination autocomplete request failed:",
      error instanceof Error ? error.message : "Unknown request error",
    );

    return [];
  }
}

export default function SearchForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const lang = useLocale();
  const t = useTranslations();
  const isAr = lang === "ar";

  const [destination, setDestination] =
    useState<HotelbedsSearchSuggestion | null>(null);
  const [tboCertificationMode, setTboCertificationMode] = useState(
    () => process.env.NEXT_PUBLIC_TBO_CERTIFICATION_MODE === "true",
  );

  useEffect(() => {
    setTboCertificationMode(getClientTboCertificationMode());
  }, []);

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
    destination: isAr ? "إلى أين تريد السفر؟" : "Where do you want to go?",
    destinationPlaceholder: isAr
      ? "اكتب المدينة أو الدولة أو اسم الفندق"
      : "Type a city, country, or hotel name",
    checkIn: isAr ? "تاريخ الدخول" : "Check-in",
    checkOut: isAr ? "تاريخ المغادرة" : "Check-out",
    guests: isAr ? "الغرف والنزلاء" : "Rooms and guests",
    search: isAr ? "ابحث الآن" : "Search now",
    cancellation: isAr ? "إلغاء مجاني" : "Free cancellation",
  };

  const handleSearch = async () => {
    if (!destination) {
      if (!tboCertificationMode) {
        alert(t("search.selectDestination"));
        return;
      }
    }

    setLoading(true);

    try {
      const selectedDestination =
        destination || buildTboCertificationSuggestion(TBO_CERTIFICATION_SUGGESTION.label);
      const searchParams = {
        destination: selectedDestination,
        dates,
        guests,
        nationality,
        currency,
      };

      localStorage.setItem("hotelSearch", JSON.stringify(searchParams));

      const query = new URLSearchParams({
        destination: selectedDestination.label,
        type: selectedDestination.type,
        checkIn: format(dates.checkIn, "yyyy-MM-dd"),
        checkOut: format(dates.checkOut, "yyyy-MM-dd"),
        adults: String(guests.adults),
        children: String(guests.children),
        rooms: String(guests.rooms),
        nationality,
        currency,
      });

      if (selectedDestination.hotelCode) {
        query.set("hotelCode", selectedDestination.hotelCode);
      }
      if (selectedDestination.destinationCode) {
        query.set("destinationCode", selectedDestination.destinationCode);
      }
      if (selectedDestination.cityCode) {
        query.set("cityCode", selectedDestination.cityCode);
      }
      if (selectedDestination.countryCode) {
        query.set("countryCode", selectedDestination.countryCode);
      }
      if (selectedDestination.zoneCode) {
        query.set("zoneCode", selectedDestination.zoneCode);
      }

      router.push(`/${lang}/search?${query.toString()}`);
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

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(300px,1.65fr)_1fr_1fr_minmax(230px,1fr)_180px]">
        <SearchField label={copy.destination}>
          <HotelbedsDestinationAutocomplete
            value={destination}
            placeholder={copy.destinationPlaceholder}
            onChange={setDestination}
            tboCertificationMode={tboCertificationMode}
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
          disabled={loading || (!destination && !tboCertificationMode)}
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

function getSuggestionTypeLabel(type: HotelbedsSearchSuggestion["type"]) {
  const labels = {
    hotel: "فندق",
    destination: "وجهة",
    country: "دولة",
    zone: "منطقة",
  };

  return labels[type];
}

function HotelbedsDestinationAutocomplete({
  value,
  placeholder,
  onChange,
  tboCertificationMode,
}: {
  value: HotelbedsSearchSuggestion | null;
  placeholder: string;
  onChange: (value: HotelbedsSearchSuggestion | null) => void;
  tboCertificationMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value?.label || "");
  const [loading, setLoading] = useState(false);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<HotelbedsSearchSuggestion[]>([]);

  const selectedLabel = useMemo(() => value?.label || "", [value?.label]);

  useEffect(() => {
    if (tboCertificationMode) return;
    if (query.trim() === selectedLabel) return;
    onChange(null);
  }, [onChange, query, selectedLabel, tboCertificationMode]);

  useEffect(() => {
    const term = query.trim();

    if (tboCertificationMode) {
      setLoading(false);
      setSearchCompleted(term.length >= 1);
      setError("");
      setSuggestions([TBO_CERTIFICATION_SUGGESTION]);
      if (term) onChange(buildTboCertificationSuggestion(term));
      return;
    }

    if (term.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setSearchCompleted(false);
      setError("");
      return;
    }

    if (isDubaiSearchTerm(term)) {
      const dubaiSuggestion = {
        ...TBO_DUBAI_SUGGESTION,
        label:
          term === "دبي"
            ? "دبي، الإمارات العربية المتحدة"
            : TBO_DUBAI_SUGGESTION.label,
      };

      setSuggestions([dubaiSuggestion]);
      setLoading(false);
      setSearchCompleted(true);
      setError("");
      onChange(dubaiSuggestion);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      setSearchCompleted(false);
      setError("");

      try {
        const nextSuggestions = await fetchHotelbedsSuggestions(
          term,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setSuggestions(nextSuggestions);
      } catch (err) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setError(err instanceof Error ? err.message : "فشل جلب الوجهات");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setSearchCompleted(true);
        }
      }
    }, 500);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [onChange, query, tboCertificationMode]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(true)}
          className="h-11 w-full justify-start rounded-xl bg-transparent px-1 text-base font-black text-[#0F172A] hover:bg-transparent"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value?.label || placeholder}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[min(520px,calc(100vw-2rem))] rounded-2xl border-[#E5E7EB] p-0 shadow-xl"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={(nextValue) => {
              setQuery(nextValue);
              setOpen(true);
            }}
            placeholder={placeholder}
          />
          <CommandList>
            {loading && (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                جاري جلب الاقتراحات...
              </div>
            )}

            {!loading && error && (
              <div className="px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            {!loading &&
              !error &&
              searchCompleted &&
              query.trim().length >= 2 &&
              suggestions.length === 0 && (
                <CommandEmpty>لا توجد نتائج مطابقة</CommandEmpty>
              )}

            {suggestions.length > 0 && (
              <CommandGroup
                heading={
                  tboCertificationMode
                    ? "TBO Certification"
                    : suggestions.some((suggestion) => suggestion.cityCode === "115936")
                      ? "TBO Normal Search"
                      : "نتائج Hotelbeds"
                }
              >
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={[
                      suggestion.type,
                      suggestion.value,
                      suggestion.hotelCode,
                      suggestion.destinationCode,
                      suggestion.cityCode,
                      suggestion.countryCode,
                      suggestion.zoneCode,
                      suggestion.label,
                    ]
                      .filter(Boolean)
                      .join(":")}
                    value={suggestion.value}
                    onSelect={() => {
                      onChange(suggestion);
                      setQuery(suggestion.label);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="truncate font-semibold">
                        {suggestion.label}
                      </span>
                      <span className="shrink-0 rounded-full bg-orange-50 px-2 py-1 text-xs font-bold text-[#F97316]">
                        {getSuggestionTypeLabel(suggestion.type)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  children: ReactNode;
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
