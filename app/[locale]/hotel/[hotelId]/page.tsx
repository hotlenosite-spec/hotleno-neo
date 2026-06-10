"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RoomSelector } from "@/components/hotel/room-selector";
import { HotelImageGallery } from "@/components/hotel/hotel-image-gallery";
import { BookingBreadcrumb } from "@/components/booking/booking-breadcrumb";
import { useHotelPolicies } from "@/hooks/use-hotels-enhanced";
import { shouldSkipTravellandaForTbo } from "@/lib/hotels/tbo-mode";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  StarIcon, 
  MapPinIcon, 
  AiPhoneIcon,
  ArrowLeftIcon,
  LeftTriangleIcon,
  RefreshIcon,
  CreditCardIcon,
  CustomerServiceIcon,
  Shield02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import type { HotelSearchResult, HotelOption, HotelPoliciesResponse, SavedSearch } from "@/types/travellanda";
import { formatCurrency, calculateNights } from "@/hooks/use-hotels-enhanced";

function createSupplierFallbackPolicies(
  option: HotelOption,
  currency: string,
  description: string,
): HotelPoliciesResponse {
  return {
    ServerTime: new Date().toISOString(),
    ServerType: "hotleno-supplier-layer",
    ExecutionTime: "0",
    ResponseType: "HotelPolicies",
    OptionId: option.OptionId,
    Currency: option.Currency || currency,
    TotalPrice: (option.Price ?? option.TotalPrice ?? 0) + (option.Taxes ?? 0),
    Policies: [],
    Restrictions: [
      {
        Type: "supplier_policy",
        Description: description,
      },
    ],
    Alerts: [],
  } as HotelPoliciesResponse;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asCleanTextArray(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];

  return values.flatMap((item): string[] => {
    if (Array.isArray(item)) return asCleanTextArray(item);
    if (typeof item === "string") return item.trim() ? [item.trim()] : [];
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const label = String(
      record.Description ||
        record.Name ||
        record.Type ||
        record.Policy ||
        record.Text ||
        "",
    ).trim();
    const number = Number(record.Price || record.Amount || record.Value);
    const price = Number.isFinite(number) && number > 0 ? number : 0;
    const currency = typeof record.Currency === "string" ? record.Currency.trim() : "";
    const priceText = price > 0 ? `${currency ? `${currency} ` : ""}${price}` : "";
    const text = [label, priceText].filter(Boolean).join(" - ");

    return text ? [text] : [];
  });
}

function getSelectedRoomSnapshot(
  option: HotelOption,
  hotelId: string,
  searchParams: SavedSearch,
  supplier: string,
) {
  const price = toNumber(option.Price || option.TotalPrice);
  const taxes = toNumber(option.Taxes);
  const nights = searchParams.guests.nights || 1;
  const currency = option.Currency || searchParams.currency || "USD";

  return {
    ...option,
    HotelId: Number.parseInt(hotelId, 10),
    roomName: option.RoomName || option.RoomType,
    rateKey: option.rateKey || option.supplierRateKey || option.BookingCode || String(option.OptionId),
    supplierRateKey: option.supplierRateKey || option.rateKey || option.BookingCode || String(option.OptionId),
    hotelbedsSelectedRooms: option.hotelbedsSelectedRooms || [],
    BookingCode: option.BookingCode || option.supplierRateKey || option.rateKey,
    supplierHotelId: option.supplierHotelId || option.HotelCode || hotelId,
    HotelCode: option.HotelCode || option.supplierHotelId || hotelId,
    supplierTotalFare: option.supplierTotalFare ?? option.TotalPrice ?? price,
    price,
    totalPrice: (price + taxes) * nights,
    currency,
    refundable: !option.IsNonRefundable,
    boardName: option.BoardName || option.BoardType,
    mealType: option.BoardType || option.BoardName,
    supplier,
    hotelId: Number.parseInt(hotelId, 10),
    checkIn: searchParams.dates.checkIn,
    checkOut: searchParams.dates.checkOut,
    guests: searchParams.guests,
    nights,
    Price: price,
    TotalPrice: option.TotalPrice ?? price,
    Taxes: taxes,
    Currency: currency,
    rspPrice: option.rspPrice,
    roomPromotions: option.roomPromotions || [],
    supplements: option.supplements || [],
    inclusions: option.inclusions || [],
    cancellationPolicies: option.cancellationPolicies || [],
    rateConditions: option.rateConditions || [],
    amenities: option.amenities || [],
  };
}

function getBookingSupplier(hotel: HotelSearchResult, option: HotelOption) {
  if (shouldSkipTravellandaForTbo(hotel)) return "tbo";
  if (isHotelbedsTesterToken()) return "hotelbeds";

  const hotelSupplier =
    "supplier" in hotel ? String((hotel as { supplier?: unknown }).supplier || "") : "";
  const supplier = String(option.supplier || hotelSupplier).toLowerCase();
  return supplier || "travellanda";
}

function isHotelbedsTesterToken() {
  try {
    const token = localStorage.getItem("token") || "";
    const [, payload] = token.split(".");
    if (!payload) return false;
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(atob(normalizedPayload)) as {
      role?: string;
      supplierScope?: string | null;
    };

    return parsed.role === "supplier_tester" && parsed.supplierScope === "hotelbeds";
  } catch {
    return false;
  }
}

function buildRoomsPayloadFromSearch(searchParams: SavedSearch) {
  const roomDetails = searchParams.guests.roomDetails || [];

  if (roomDetails.length > 0) {
    return roomDetails.map((room) => ({
      NumAdults: Math.max(Number(room.adults || 1), 1),
      Children:
        room.children > 0
          ? room.childrenAges.slice(0, room.children)
          : undefined,
    }));
  }

  const roomCount = Math.max(Number(searchParams.guests.rooms || 1), 1);
  const adultTotal = Math.max(Number(searchParams.guests.adults || 1), 1);
  const childAges = (searchParams.guests.childrenAges || [])
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age) && age >= 0)
    .slice(0, Math.max(Number(searchParams.guests.children || 0), 0));
  const childTotal = Math.max(Number(searchParams.guests.children || childAges.length || 0), 0);
  const rooms = Array.from({ length: roomCount }, () => ({
    NumAdults: 0,
    Children: [] as number[],
  }));

  for (let index = 0; index < adultTotal; index += 1) {
    rooms[index % roomCount].NumAdults += 1;
  }

  for (let index = 0; index < childTotal; index += 1) {
    const age = childAges[index];
    if (age !== undefined) {
      rooms[index % roomCount].Children.push(age);
    }
  }

  return rooms.map((room) => ({
    NumAdults: Math.max(room.NumAdults, 1),
    Children: room.Children.length > 0 ? room.Children : undefined,
  }));
}

export default function HotelDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations();
  const hotelId = params.hotelId as string;
  
  const [hotel, setHotel] = useState<HotelSearchResult | null>(null);
interface HotelDetailsData {
  HotelName?: string;
  StarRating?: number;
  Address?: string;
  CityName?: string;
  CountryName?: string;
  Images?: Array<{ Url: string; Description?: string }>;
  Facilities?: string[];
  Description?: string;
  Phone?: string;
}

  const [hotelDetails, setHotelDetails] = useState<HotelDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<HotelOption | null>(null);
  const [searchParams, setSearchParams] = useState<SavedSearch | null>(null);
  const [policies, setPolicies] = useState<HotelPoliciesResponse | null>(null);
  const [bookingError, setBookingError] = useState("");
  
  const { fetchPolicies, loading: policiesLoading } = useHotelPolicies();

  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        // Get search params from localStorage
        const savedSearch = localStorage.getItem('hotelSearch');
        if (!savedSearch) {
          router.push('/');
          return;
        }

        const parsedSearch: SavedSearch = JSON.parse(savedSearch);
        setSearchParams(parsedSearch);

        // Calculate nights
        if (!parsedSearch.guests.nights) {
          parsedSearch.guests.nights = calculateNights(
            parsedSearch.dates.checkIn,
            parsedSearch.dates.checkOut
          );
        }

        const selectedHotel = localStorage.getItem('selectedHotel');
        if (selectedHotel) {
          const parsedHotel = JSON.parse(selectedHotel) as HotelSearchResult;
          if (parsedHotel.HotelId === parseInt(hotelId)) {
            setHotel(parsedHotel);
            setHotelDetails({
              HotelName: parsedHotel.HotelName,
              StarRating: parsedHotel.StarRating,
              Address: parsedHotel.Address,
              CityName: parsedHotel.CityName,
              CountryName: parsedHotel.CountryName,
              Images: parsedHotel.Images || [],
              Facilities: parsedHotel.Facilities || [],
              Description: parsedHotel.Description,
            });
            setLoading(false);
            return;
          }
        }

        // Fetch hotel details first using GetHotelDetails
        const detailsResponse = await fetch('/api/travellanda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            RequestType: 'GetHotelDetails',
            HotelIds: [parseInt(hotelId)],
          }),
        });

        if (!detailsResponse.ok) {
          throw new Error('Failed to fetch hotel details');
        }

        const detailsData = await detailsResponse.json();
        if (detailsData.Hotels?.[0]) {
          const details = detailsData.Hotels[0];
          setHotelDetails({
            HotelName: details.HotelName,
            StarRating: parseFloat(details.StarRating) || 0,
            Address: details.Address,
            CityName: details.CityName,
            CountryName: details.CountryName,
            Images: details.Images?.map((img: { Url: string; Description?: string }) => ({ 
              Url: img.Url, 
              Description: img.Description 
            })) || [],
            Facilities: details.Facilities?.map((f: { FacilityName: string }) => f.FacilityName) || [],
            Description: details.Description,
            Phone: details.PhoneNumber,
          });
        }

        // Then fetch search results to get room options
        const searchResponse = await fetch('/api/travellanda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            RequestType: 'HotelSearch',
            CityIds: [detailsData.Hotels?.[0]?.CityId],
            CheckInDate: formatDate(parsedSearch.dates.checkIn),
            CheckOutDate: formatDate(parsedSearch.dates.checkOut),
            Rooms: buildRoomsPayloadFromSearch(parsedSearch),
            Nationality: parsedSearch.nationality,
            Currency: parsedSearch.currency,
            AvailableOnly: 1,
            GetPolicies: 0,
          }),
        });

        if (!searchResponse.ok) {
          throw new Error('Failed to fetch room options');
        }

        const searchData = await searchResponse.json();
        const currentHotel = searchData.Hotels?.find(
          (h: HotelSearchResult) => h.HotelId === parseInt(hotelId)
        );
        
        if (currentHotel) {
          setHotel(currentHotel);
        } else {
          throw new Error('Hotel not found in search results');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load hotel');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelData();
  }, [hotelId, router]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const handleRoomSelect = async (option: HotelOption, _fetchedPolicies: HotelPoliciesResponse) => {
    setBookingError("");
    // Ensure option has valid numeric values
    const sanitizedOption = {
      ...option,
      Price: typeof option.Price === 'number' ? option.Price : parseFloat(option.Price as unknown as string) || 0,
      Taxes: typeof option.Taxes === 'number' ? option.Taxes : parseFloat(option.Taxes as unknown as string) || 0,
      Currency: option.Currency || 'USD',
    };
    setSelectedOption(sanitizedOption);
    
    if (shouldSkipTravellandaForTbo(hotel)) {
      console.info('Skipping policies fetch for TBO certification booking flow');
      setPolicies(
        createSupplierFallbackPolicies(
          sanitizedOption,
          hotel?.Options?.[0]?.Currency || 'USD',
          t("booking.supplierPolicy"),
        ),
      );
      return;
    }

    // Fetch policies for the selected option
    try {
      const hotelIdNum = parseInt(hotelId);
      const policiesData = await fetchPolicies(hotelIdNum, option.OptionId, {
        hotel,
        option: sanitizedOption,
        currency: hotel?.Options?.[0]?.Currency,
      });
      setPolicies(policiesData);
    } catch (err) {
      if (!shouldSkipTravellandaForTbo(hotel)) {
        console.error('Failed to fetch policies:', err);
      }
    }
  };

  const handleBookNow = () => {
    if (selectedOption && hotel && searchParams) {
      const supplier = getBookingSupplier(hotel, selectedOption);
      const requestedRoomsCount = Math.max(searchParams.guests.roomDetails?.length || searchParams.guests.rooms || 1, 1);
      const selectedRateRoomsCount = selectedOption.hotelbedsSelectedRooms?.length || 0;
      const hasExplicitRoomSelection = Array.from({ length: requestedRoomsCount }).every(
        (_, roomIndex) =>
          selectedOption.hotelbedsSelectedRooms?.some(
            (room) => room.roomIndex === roomIndex && Boolean(room.rateKey),
          ),
      );

      if (
        supplier === "hotelbeds" &&
        (selectedRateRoomsCount !== requestedRoomsCount || !hasExplicitRoomSelection)
      ) {
        setBookingError(
          "الغرفة المختارة لا تدعم عدد الغرف المطلوب أو لم تعد متاحة بالكمية المطلوبة. يرجى اختيار عرض آخر.",
        );
        return;
      }

      const selectedRoom = getSelectedRoomSnapshot(
        selectedOption,
        hotelId,
        searchParams,
        supplier,
      );
      // Store complete booking data
      const bookingData = {
        hotel: {
          ...hotel,
          selectedOption: selectedRoom,
        },
        selectedRoom,
        policies,
        searchParams,
      };
      
      // Add HotelId to selectedOption for policies API
      const optionWithHotelId = {
        ...selectedRoom,
        HotelId: parseInt(hotelId),
      };
      
      localStorage.setItem('bookingData', JSON.stringify(bookingData));
      localStorage.setItem('selectedOption', JSON.stringify(optionWithHotelId));
      router.push(`/${locale}/booking/review`);
    }
  };

  const nights = searchParams?.guests.nights || 1;
  const selectedInclusions = asCleanTextArray(selectedOption?.inclusions);
  const selectedAmenities = asCleanTextArray(selectedOption?.amenities);
  const selectedTboDetailGroups = selectedOption
    ? [
        { title: t("booking.tbo.promotions"), items: asCleanTextArray(selectedOption.roomPromotions) },
        { title: t("booking.tbo.supplements"), items: asCleanTextArray(selectedOption.supplements) },
        { title: t("booking.tbo.rateConditions"), items: asCleanTextArray(selectedOption.rateConditions) },
      ].filter((group) => group.items.length > 0)
    : [];

  if (loading) {
    return (
      <div className="container mx-auto overflow-x-clip px-4 py-8">
        <Skeleton className="mb-6 h-96 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="px-6 py-14 text-center">
            <div className="mb-4 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                <HugeiconsIcon icon={LeftTriangleIcon} className="h-7 w-7 text-[#F97316]" />
              </span>
            </div>
            <h2 className="mb-2 text-xl font-black text-[#0F172A]">{t('hotelDetails.errorLoading')}</h2>
            <p className="mx-auto mb-6 max-w-lg text-sm leading-6 text-muted-foreground">
              {t('hotelDetails.errorDescription')}
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => window.location.reload()} variant="outline">
                <HugeiconsIcon icon={RefreshIcon} className="me-2 h-4 w-4" />
                {t('hotels.tryAgain')}
              </Button>
              <Button
                onClick={() => router.push(`/${locale}`)}
                className="bg-[#F97316] text-white hover:bg-[#EA580C]"
              >
                <HugeiconsIcon icon={ArrowLeftIcon} className="me-2 h-4 w-4" />
                {t('hotels.newSearch')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter valid images only
  const allImages = hotelDetails?.Images || hotel.Images || [];
  const validImages = allImages.filter((img: { Url?: string }) => img?.Url && img.Url.trim() !== '');

  const displayData = {
    ...hotel,
    ...hotelDetails,
    HotelName: hotel.HotelName || hotelDetails?.HotelName,
    StarRating: hotel.StarRating || hotelDetails?.StarRating,
    Address: hotel.Address || hotelDetails?.Address,
    CityName: hotel.CityName || hotelDetails?.CityName,
    Images: validImages,
    Facilities: hotelDetails?.Facilities || hotel.Facilities || [],
    Description: hotelDetails?.Description || hotel.Description,
  };
  const displayLocation = [
    displayData.Address,
    displayData.CityName,
    displayData.CountryName || hotel.CountryName,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="container mx-auto overflow-x-clip px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-4">
        <BookingBreadcrumb currentStep="hotel" hotelName={displayData.HotelName} />
      </div>

      {/* Back Button */}
      <Button 
        variant="ghost" 
        className="mb-6 -ms-2 font-bold"
        onClick={() => router.back()}
      >
        <HugeiconsIcon icon={ArrowLeftIcon} className="me-2 h-4 w-4" />
        {t('hotelDetails.backToResults')}
      </Button>

      {/* Hotel Header */}
      <div className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
          <h1 className="min-w-0 text-3xl font-black leading-tight text-[#0F172A] md:text-4xl">
            {displayData.HotelName}
          </h1>
          {displayData.StarRating && displayData.StarRating > 0 && (
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-orange-50 px-3 py-2 text-[#F97316]">
              <HugeiconsIcon icon={StarIcon} className="h-5 w-5 fill-current" />
              <span className="font-black">{displayData.StarRating} {t('hotels.starHotel')}</span>
            </div>
          )}
        </div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon icon={MapPinIcon} className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
          <span>{displayLocation || t("hotelDetails.locationUnavailable")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Hotel Info */}
        <div className="space-y-8 lg:col-span-2">
          {/* Image Gallery */}
          <HotelImageGallery 
            images={displayData.Images || []} 
            hotelName={displayData.HotelName || ''}
          />

          {/* Room Selector */}
          {hotel.Options && hotel.Options.length > 0 && (
            <RoomSelector
              options={hotel.Options}
              currency={hotel.Options[0]?.Currency || 'USD'}
              onSelect={handleRoomSelect}
              nights={nights}
              selectedOptionId={selectedOption?.OptionId}
              isLoadingPolicies={policiesLoading}
            />
          )}

          {/* Hotel Details Tabs */}
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-3 bg-slate-100 p-1">
              <TabsTrigger value="description">{t('hotelDetails.description')}</TabsTrigger>
              <TabsTrigger value="facilities">{t('hotelDetails.facilities')}</TabsTrigger>
              <TabsTrigger value="location">{t('hotelDetails.location')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="mt-6">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-black text-[#0F172A]">{t('hotelDetails.aboutHotel')}</h3>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                    {displayData.Description || t("hotelDetails.noDescription")}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="facilities" className="mt-6">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-black text-[#0F172A]">{t('hotelDetails.hotelFacilities')}</h3>
                  {displayData.Facilities && displayData.Facilities.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {displayData.Facilities.map((facility: string, index: number) => (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="min-h-10 justify-center whitespace-normal py-2 text-center text-sm"
                        >
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{t('hotelDetails.noFacilities')}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="location" className="mt-6">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-black text-[#0F172A]">{t('hotelDetails.location')}</h3>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <DetailItem label={t('hotelDetails.address')} value={displayData.Address} />
                    <DetailItem label={t('hotelDetails.city')} value={displayData.CityName} />
                    <DetailItem
                      label={t('hotelDetails.country')}
                      value={displayData.CountryName || hotel.CountryName}
                    />
                    {hotelDetails?.Phone && (
                      <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
                        <HugeiconsIcon icon={AiPhoneIcon} className="h-4 w-4 text-muted-foreground" />
                        <span>
                          <strong className="text-[#0F172A]">{t('hotelDetails.phone')}:</strong>{" "}
                          {hotelDetails.Phone}
                        </span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Booking Card */}
        <div className="min-w-0">
          <Card className="sticky top-8 overflow-hidden border-slate-200 shadow-lg shadow-slate-950/5">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="font-black text-[#0F172A]">{t("hotelDetails.bookingSummary")}</h2>
            </div>
            <CardContent className="p-6">
              {selectedOption ? (
                <>
                  <div className="mb-6">
                    <h3 className="mb-2 text-xl font-black text-[#0F172A]">
                      {selectedOption.RoomType || selectedOption.RoomName || t("hotels.standardRoom")}
                    </h3>
                    {selectedOption.BoardType && (
                      <p className="text-sm text-muted-foreground">{selectedOption.BoardType}</p>
                    )}
                    {selectedInclusions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedInclusions.map((inclusion) => (
                          <Badge
                            key={inclusion}
                            variant="outline"
                            className="border-green-200 bg-green-50 text-xs font-bold text-green-700"
                          >
                            {inclusion}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {selectedAmenities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedAmenities.slice(0, 4).map((amenity) => (
                          <Badge key={amenity} variant="secondary" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {(selectedOption.rspPrice || selectedTboDetailGroups.length > 0) && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        {selectedOption.rspPrice ? (
                          <p className="mb-2 text-xs text-slate-700">
                            <span className="font-bold">{t("booking.tbo.rspPrice")}:</span>{" "}
                            {selectedOption.Currency} {selectedOption.rspPrice}
                          </p>
                        ) : null}
                        {selectedTboDetailGroups.map((group) => (
                          <div key={group.title} className="mt-2">
                            <p className="mb-1 text-xs font-bold text-[#0F172A]">{group.title}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {group.items.map((item) => (
                                <Badge key={`${group.title}-${item}`} variant="outline" className="text-xs">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {(() => {
                      const price = typeof selectedOption.Price === 'number' && !isNaN(selectedOption.Price) 
                        ? selectedOption.Price 
                        : 0;
                      const taxes = typeof selectedOption.Taxes === 'number' && !isNaN(selectedOption.Taxes) 
                        ? selectedOption.Taxes 
                        : 0;
                      const currency = selectedOption.Currency || 'USD';
                      
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {formatCurrency(price, currency)} × {nights}{" "}
                              {nights === 1 ? t("hotels.night") : t("hotels.nights")}
                            </span>
                            <span>{formatCurrency(price * nights, currency)}</span>
                          </div>
                          {taxes > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{t('hotelDetails.taxesFees')}</span>
                              <span>{formatCurrency(taxes, currency)}</span>
                            </div>
                          )}
                          <div className="border-t pt-3">
                            <div className="flex justify-between text-lg font-black text-[#0F172A]">
                              <span>{t('booking.total')}</span>
                              <span className="text-[#F97316]">
                                {formatCurrency((price + taxes) * nights, currency)}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">
                            {t("hotelDetails.taxNotice")}
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  {/* Cancellation Policy Preview */}
                  {policies?.CancellationDeadline && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>{t('hotelDetails.freeCancellationUntil')}</strong> {new Date(policies.CancellationDeadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {policies?.Alerts && policies.Alerts.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      {policies.Alerts.map((alert, idx) => (
                        <p key={idx} className="text-sm text-amber-800">
                          <strong>{alert.Type}:</strong> {alert.Description}
                        </p>
                      ))}
                    </div>
                  )}

                  {policies?.Restrictions && policies.Restrictions.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      {policies.Restrictions.map((restriction, idx) => (
                        <p key={idx} className="text-sm text-amber-800">
                          {restriction.Description}
                        </p>
                      ))}
                    </div>
                  )}

                  {bookingError ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                      {bookingError}
                    </div>
                  ) : null}

                  <Button 
                    className="w-full bg-[#F97316] font-black text-white shadow-lg shadow-orange-500/20 hover:bg-[#EA580C]" 
                    size="lg"
                    onClick={handleBookNow}
                    disabled={!selectedOption}
                  >
                    {t('hotelDetails.bookNow')}
                  </Button>

                  <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
                    {t('hotelDetails.wontBeCharged')}
                  </p>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {hotel.Options?.length === 0 
                      ? t('hotelDetails.noRoomsAvailable')
                      : t('hotelDetails.selectRoomToContinue')
                    }
                  </p>
                  <Button 
                    variant="outline" 
                    className="font-bold"
                    onClick={() => router.push(`/${locale}`)}
                  >
                    {t('hotelDetails.modifySearch')}
                  </Button>
                </div>
              )}
            </CardContent>
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
              <div className="grid gap-3 text-xs font-bold text-slate-600">
                <TrustItem icon={CreditCardIcon} text={t("hotelDetails.trust.securePayment")} />
                <TrustItem icon={CustomerServiceIcon} text={t("hotelDetails.trust.customerSupport")} />
                <TrustItem icon={Shield02Icon} text={t("hotelDetails.trust.supplierConfirmation")} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <p className="rounded-xl bg-slate-50 px-4 py-3">
      <strong className="text-[#0F172A]">{label}:</strong> {value}
    </p>
  );
}

function TrustItem({
  icon,
  text,
}: {
  icon: typeof CheckmarkCircle02Icon;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#F97316]">
        <HugeiconsIcon icon={icon} className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </div>
  );
}
