"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { HotelCard } from "@/components/hotel/hotel-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  HotelSearchResponse,
  HotelSearchResult,
  SavedSearch,
} from "@/types/travellanda";

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
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HotelSearchResponse | null>(null);

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
    let cancelled = false;

    async function runSearch() {
      if (!request.checkIn || !request.checkOut) {
        setError("يرجى تحديد تاريخ الدخول وتاريخ المغادرة.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const savedSearch = buildSavedSearch(new URLSearchParams(paramsKey));
        localStorage.setItem("hotelSearch", JSON.stringify(savedSearch));
        const token = localStorage.getItem("token");

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
            Rooms: [
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
            Nationality: request.nationality,
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
              ? data.message || data.error || "فشل الاتصال بمورد الفنادق."
              : "فشل الاتصال بمورد الفنادق.",
          );
        }

        if (!cancelled) {
          setResults(data as HotelSearchResponse);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "تعذر تحميل نتائج الفنادق.",
          );
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
  }, [paramsKey, request]);

  const hotels = results?.Hotels ?? [];
  const nights =
    request.checkIn && request.checkOut
      ? calculateNights(request.checkIn, request.checkOut)
      : 1;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">
            نتائج البحث عن الفنادق
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {request.destination || "وجهة محددة"} ·{" "}
            {request.checkIn} - {request.checkOut}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}`}>بحث جديد</Link>
        </Button>
      </div>

      {loading && (
        <div className="space-y-6">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="mb-2 text-xl font-bold">تعذر تحميل النتائج</h2>
            <p className="mb-6 text-red-500">{error}</p>
            <Button asChild>
              <Link href={`/${locale}`}>العودة للبحث</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && hotels.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="mb-2 text-xl font-bold">لا توجد فنادق متاحة</h2>
            <p className="mb-6 text-muted-foreground">
              لم يرجع مورد الفنادق أي توفر مطابق لهذه التواريخ أو الأكواد.
            </p>
            <Button asChild variant="outline">
              <Link href={`/${locale}`}>تعديل البحث</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && hotels.length > 0 && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            تم العثور على {results?.HotelsReturned || hotels.length} فندق.
          </p>
          {hotels.map((hotel: HotelSearchResult) => (
            <Link
              key={hotel.HotelId}
              href={`/${locale}/hotel/${hotel.HotelId}`}
              onClick={() => {
                localStorage.setItem("selectedHotel", JSON.stringify(hotel));
              }}
              className="block hover:no-underline"
            >
              <HotelCard
                hotel={hotel}
                currency={results?.Currency || request.currency}
                nights={nights}
              />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
