"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { HotelCard } from "@/components/hotel/hotel-card";
import { HotelFiltersPanel, MobileHotelFilters } from "@/components/results/hotel-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CURRENCY_CHANGE_EVENT,
  getStoredCurrencyCode,
} from "@/lib/data/currencies";
import type {
  HotelFilters,
  HotelOption,
  HotelSearchResponse,
  HotelSearchResult,
  SavedSearch,
} from "@/types/travellanda";

type SortValue = "price-low" | "price-high" | "rating-high" | "value";

function toNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateNights(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.ceil(
    Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(nights, 1);
}

function parseChildrenAges(value: string | null, children: number) {
  return (value || "")
    .split(",")
    .map((age) => Number.parseInt(age.trim(), 10))
    .filter((age) => Number.isFinite(age) && age >= 0)
    .slice(0, children);
}

function buildCertificationRooms(params: {
  rooms: number;
  adults: number;
  children: number;
  childrenAges: number[];
}) {
  const roomCount = Math.max(params.rooms, 1);
  const result = Array.from({ length: roomCount }, (_, index) => ({
    NumAdults: index < params.adults ? 1 : 0,
    Children: [] as number[],
  }));

  for (let index = roomCount; index < params.adults; index += 1) {
    result[index % roomCount].NumAdults += 1;
  }
  params.childrenAges.slice(0, params.children).forEach((age, index) => {
    result[index % roomCount].Children.push(age);
  });

  return result.map((room) => ({
    NumAdults: Math.max(room.NumAdults, 1),
    Children: room.Children.length > 0 ? room.Children : undefined,
  }));
}

function getOptionTotal(option?: HotelOption) {
  if (!option) return 0;
  if (typeof option.supplierTotalFare === "number" && Number.isFinite(option.supplierTotalFare)) {
    return option.supplierTotalFare;
  }
  if (typeof option.TotalPrice === "number" && Number.isFinite(option.TotalPrice)) {
    return option.TotalPrice;
  }
  const price = Number(option.Price || 0);
  const taxes = Number(option.Taxes || 0);
  return Number.isFinite(price + taxes) ? price + taxes : 0;
}

function getBestOption(hotel: HotelSearchResult) {
  return hotel.Options?.reduce((best: HotelOption, current: HotelOption) => {
    return getOptionTotal(current) < getOptionTotal(best) ? current : best;
  }, hotel.Options?.[0]);
}

function getHotelTotal(hotel: HotelSearchResult) {
  return getOptionTotal(getBestOption(hotel));
}

function getAvailableAmenities(hotels: HotelSearchResult[]) {
  return Array.from(new Set(hotels.flatMap((hotel) => hotel.Facilities || []))).slice(0, 30);
}

function getAvailableBoardTypes(hotels: HotelSearchResult[]) {
  return Array.from(
    new Set(
      hotels.flatMap((hotel) =>
        (hotel.Options || []).map((option) => option.BoardType).filter(Boolean),
      ),
    ),
  );
}

function buildSavedSearch(params: URLSearchParams): SavedSearch {
  const destination = params.get("destination") || "";
  const checkIn = params.get("checkIn") || "";
  const checkOut = params.get("checkOut") || "";
  const adults = toNumber(params.get("adults"), 2);
  const children = toNumber(params.get("children"), 0);
  const childrenAges = parseChildrenAges(params.get("childrenAges"), children);
  const rooms = toNumber(params.get("rooms"), 1);

  return {
    destination: {
      type: params.get("cityId") || params.get("cityCode") ? "city" : "country",
      code: params.get("countryCode") || "",
      id:
        params.get("cityId") || params.get("cityCode")
          ? toNumber(params.get("cityId") || params.get("cityCode"), 0)
          : undefined,
      name: destination,
    },
    dates: {
      checkIn,
      checkOut,
    },
    guests: {
      rooms,
      adults,
      children,
      childrenAges,
      nights: calculateNights(checkIn, checkOut),
    },
    nationality: params.get("nationality") || "US",
    currency: params.get("currency") || "USD",
    timestamp: Date.now(),
  };
}

export default function SearchPage() {
  const locale = useLocale();
  const t = useTranslations("searchResults");
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HotelSearchResponse | null>(null);
  const [sortBy, setSortBy] = useState<SortValue>("value");
  const [currencyChangeNotice, setCurrencyChangeNotice] = useState(false);
  const [filters, setFilters] = useState<HotelFilters>({
    priceRange: [0, Infinity],
    starRatings: [],
    amenities: [],
    boardTypes: [],
    refundableOnly: false,
  });

  const request = useMemo(() => {
    const params = new URLSearchParams(paramsKey);
    const checkIn = params.get("checkIn");
    const checkOut = params.get("checkOut");
    const adults = toNumber(params.get("adults"), 2);
    const children = toNumber(params.get("children"), 0);
    const childrenAges = parseChildrenAges(params.get("childrenAges"), children);
    const rooms = toNumber(params.get("rooms"), 1);
    const hotelCode = params.get("hotelCode") || undefined;
    const hotelIds = params
      .get("hotelIds")
      ?.split(",")
      .map((code) => code.trim())
      .filter(Boolean);

    return {
      destination: params.get("destination") || "",
      type: params.get("type") || undefined,
      checkIn,
      checkOut,
      adults,
      children,
      childrenAges,
      rooms,
      nationality: params.get("nationality") || "US",
      currency: params.get("currency") || "USD",
      countryCode: params.get("countryCode") || undefined,
      hotelCode,
      destinationCode: params.get("destinationCode") || undefined,
      cityCode: params.get("cityCode") || undefined,
      zoneCode: params.get("zoneCode") || undefined,
      hotelIds: hotelCode ? [hotelCode] : hotelIds,
    };
  }, [paramsKey]);

  useEffect(() => {
    const checkCurrencyChange = () => {
      setCurrencyChangeNotice(getStoredCurrencyCode() !== request.currency);
    };

    checkCurrencyChange();
    window.addEventListener("storage", checkCurrencyChange);
    window.addEventListener(CURRENCY_CHANGE_EVENT, checkCurrencyChange);
    return () => {
      window.removeEventListener("storage", checkCurrencyChange);
      window.removeEventListener(CURRENCY_CHANGE_EVENT, checkCurrencyChange);
    };
  }, [request.currency]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!request.checkIn || !request.checkOut) {
        setError(t("missingDates"));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const savedSearch = buildSavedSearch(new URLSearchParams(paramsKey));
        localStorage.setItem("hotelSearch", JSON.stringify(savedSearch));
        const token = localStorage.getItem("token");
        const isTboCertificationSearch =
          request.destination.toLowerCase().includes("tbo certification") ||
          request.destination.toLowerCase().includes("tbo test");

        const response = await fetch("/api/hotels/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            destination: request.destination,
            type: request.type,
            countryCode: request.countryCode,
            hotelCode: request.hotelCode,
            destinationCode: request.destinationCode,
            cityCode: request.cityCode,
            zoneCode: request.zoneCode,
            hotelIds: request.hotelIds,
            CheckInDate: request.checkIn,
            CheckOutDate: request.checkOut,
            Rooms: isTboCertificationSearch
              ? buildCertificationRooms({
                  rooms: request.rooms,
                  adults: request.adults,
                  children: request.children,
                  childrenAges:
                    request.childrenAges.length > 0
                      ? request.childrenAges
                      : Array.from({ length: request.children }, () => 8),
                })
              : [
                  {
                    NumAdults: request.adults,
                    Children:
                      request.children > 0
                        ? request.childrenAges.length > 0
                          ? request.childrenAges
                          : Array.from({ length: request.children }, () => 8)
                        : undefined,
                  },
                ],
            Nationality: isTboCertificationSearch ? "SA" : request.nationality,
            Currency: request.currency,
            AvailableOnly: 1,
            GetPolicies: 0,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | HotelSearchResponse
          | { error?: string; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            data && "message" in data
              ? data.message || data.error || t("supplierError")
              : t("supplierError"),
          );
        }

        if (!cancelled) {
          setResults(data as HotelSearchResponse);
          setFilters({
            priceRange: [0, Infinity],
            starRatings: [],
            amenities: [],
            boardTypes: [],
            refundableOnly: false,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("loadError"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [paramsKey, request, t]);

  const hotels = results?.Hotels ?? [];
  const nights =
    request.checkIn && request.checkOut
      ? calculateNights(request.checkIn, request.checkOut)
      : 1;
  const minPrice = hotels.length ? Math.min(...hotels.map(getHotelTotal)) : 0;
  const maxPrice = hotels.length ? Math.max(...hotels.map(getHotelTotal)) : 0;
  const effectiveFilters: HotelFilters = {
    ...filters,
    priceRange:
      filters.priceRange[1] === Infinity && hotels.length
        ? [minPrice, maxPrice]
        : filters.priceRange,
  };
  const availableAmenities = getAvailableAmenities(hotels);
  const availableBoardTypes = getAvailableBoardTypes(hotels);
  const filteredHotels = hotels.filter((hotel) => {
    const total = getHotelTotal(hotel);
    const bestOption = getBestOption(hotel);
    const inPriceRange =
      total >= effectiveFilters.priceRange[0] &&
      total <= effectiveFilters.priceRange[1];
    const matchesStars =
      effectiveFilters.starRatings.length === 0 ||
      effectiveFilters.starRatings.includes(Math.round(Number(hotel.StarRating || 0)));
    const matchesAmenities =
      effectiveFilters.amenities.length === 0 ||
      effectiveFilters.amenities.every((amenity) =>
        (hotel.Facilities || []).some((facility) =>
          facility.toLowerCase().includes(amenity.toLowerCase()),
        ),
      );
    const matchesBoard =
      effectiveFilters.boardTypes.length === 0 ||
      (hotel.Options || []).some((option) =>
        effectiveFilters.boardTypes.includes(option.BoardType),
      );
    const matchesRefundable =
      !effectiveFilters.refundableOnly || bestOption?.IsNonRefundable !== true;

    return inPriceRange && matchesStars && matchesAmenities && matchesBoard && matchesRefundable;
  });
  const sortedHotels = [...filteredHotels].sort((a, b) => {
    if (sortBy === "price-low") return getHotelTotal(a) - getHotelTotal(b);
    if (sortBy === "price-high") return getHotelTotal(b) - getHotelTotal(a);
    if (sortBy === "rating-high") return Number(b.StarRating || 0) - Number(a.StarRating || 0);
    const aScore = Number(a.StarRating || 0) / Math.max(getHotelTotal(a), 1);
    const bScore = Number(b.StarRating || 0) / Math.max(getHotelTotal(b), 1);
    return bScore - aScore;
  });
  const displayDestination = request.destination || t("selectedDestination");
  const guestsSummary = `${request.rooms} ${t("rooms")} • ${request.adults} ${t("adults")}${
    request.children > 0 ? ` • ${request.children} ${t("children")}` : ""
  }`;
  const editSearchHref = `/${locale}`;
  const currencyForDisplay = results?.Currency || request.currency;

  return (
    <main className="container mx-auto overflow-x-clip px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-black text-[#0F172A]">{t("title")}</h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {t("subtitle", { count: results?.HotelsReturned || hotels.length })}
          </p>
        </div>
        <Button asChild variant="outline" className="w-full font-bold sm:w-auto">
          <Link href={editSearchHref}>{t("newSearch")}</Link>
        </Button>
      </div>

      {currencyChangeNotice && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
        >
          {t("currencyChangeNotice")}
        </div>
      )}

      <Card className="mb-7 overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-sm font-black text-[#0F172A]">{t("searchSummary")}</p>
        </div>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryItem label={t("destination")} value={displayDestination} />
            <SummaryItem label={t("checkIn")} value={request.checkIn || "-"} />
            <SummaryItem label={t("checkOut")} value={request.checkOut || "-"} />
            <SummaryItem
              label={t("nightsLabel")}
              value={`${nights} ${nights === 1 ? t("night") : t("nights")}`}
            />
            <SummaryItem label={t("guestsRooms")} value={guestsSummary} />
          </div>
          <Button
            asChild
            className="w-full shrink-0 bg-[#F97316] font-black text-white hover:bg-[#EA580C] lg:w-auto"
          >
            <Link href={editSearchHref}>{t("editSearch")}</Link>
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div>
          <div className="mb-5">
            <h2 className="text-xl font-black text-[#0F172A]">{t("loadingTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("loadingDescription")}</p>
          </div>
          <div className="space-y-5">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-[32%_1fr]"
              >
                <Skeleton className="h-52 w-full rounded-none md:h-64" />
                <div className="space-y-4 p-5">
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="px-6 py-14 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl font-black text-[#F97316]">
              !
            </div>
            <h2 className="mb-2 text-xl font-black text-[#0F172A]">{t("errorTitle")}</h2>
            <p className="mx-auto mb-6 max-w-lg text-sm leading-6 text-muted-foreground">
              {t("errorDescription")}
            </p>
            <Button asChild className="bg-[#F97316] font-black text-white hover:bg-[#EA580C]">
              <Link href={editSearchHref}>{t("backToSearch")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && hotels.length === 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="px-6 py-14 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-3xl text-[#F97316]">
              ⌕
            </div>
            <h2 className="mb-2 text-xl font-black text-[#0F172A]">{t("emptyTitle")}</h2>
            <p className="mx-auto mb-6 max-w-lg text-sm leading-6 text-muted-foreground">
              {t("emptyDescription")}
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="bg-[#F97316] font-black text-white hover:bg-[#EA580C]">
                <Link href={editSearchHref}>{t("editSearch")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}`}>{t("backToSearch")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && hotels.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="hidden lg:block">
            <HotelFiltersPanel
              filters={effectiveFilters}
              onFiltersChange={setFilters}
              minPrice={minPrice}
              maxPrice={maxPrice}
              availableAmenities={availableAmenities}
              availableBoardTypes={availableBoardTypes}
              totalResults={hotels.length}
              filteredResults={filteredHotels.length}
              currency={currencyForDisplay}
            />
          </aside>

          <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-black text-[#0F172A]">
                  {t("resultsCount", { count: filteredHotels.length })}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("taxNotice")}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <MobileHotelFilters
                  filters={effectiveFilters}
                  onFiltersChange={setFilters}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  availableAmenities={availableAmenities}
                  availableBoardTypes={availableBoardTypes}
                  totalResults={hotels.length}
                  filteredResults={filteredHotels.length}
                  currency={currencyForDisplay}
                >
                  <Button variant="outline" className="lg:hidden">
                    {t("filters")}
                  </Button>
                </MobileHotelFilters>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortValue)}>
                  <SelectTrigger className="h-10 w-full border-slate-200 bg-slate-50 font-bold sm:w-[210px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price-low">{t("sort.priceLow")}</SelectItem>
                    <SelectItem value="price-high">{t("sort.priceHigh")}</SelectItem>
                    <SelectItem value="rating-high">{t("sort.ratingHigh")}</SelectItem>
                    <SelectItem value="value">{t("sort.value")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sortedHotels.length === 0 ? (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="px-6 py-12 text-center">
                  <h2 className="mb-2 text-xl font-black text-[#0F172A]">
                    {t("filteredEmptyTitle")}
                  </h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    {t("filteredEmptyDescription")}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilters({
                        priceRange: [minPrice, maxPrice],
                        starRatings: [],
                        amenities: [],
                        boardTypes: [],
                        refundableOnly: false,
                      })
                    }
                  >
                    {t("clearFilters")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sortedHotels.map((hotel: HotelSearchResult) => (
                <Link
                  key={hotel.HotelId}
                  href={`/${locale}/hotel/${hotel.HotelId}`}
                  onClick={() => {
                    localStorage.setItem("selectedHotel", JSON.stringify(hotel));
                  }}
                  className="block hover:no-underline"
                >
                  <HotelCard hotel={hotel} currency={currencyForDisplay} nights={nights} />
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-[#0F172A]">{value}</p>
    </div>
  );
}
