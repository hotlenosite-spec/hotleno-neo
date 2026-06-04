"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingBreadcrumb } from "@/components/booking/booking-breadcrumb";
import { shouldSkipTravellandaForTbo } from "@/lib/hotels/tbo-mode";
import { HugeiconsIcon } from "@hugeicons/react";
import { LeftTriangleIcon, CheckmarkCircleIcon } from "@hugeicons/core-free-icons";

export default function ReviewPage() {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
interface HotelData {
  HotelName: string;
  RoomType: string;
  BoardType: string;
  Currency: string;
  Price: number;
  TotalPrice?: number;
  Taxes?: number;
  OptionId?: number;
  rateKey?: string;
  supplierRateKey?: string;
  BookingCode?: string;
  supplierHotelId?: string;
  HotelCode?: string;
  supplierTotalFare?: number;
  roomName?: string;
  price?: number;
  totalPrice?: number;
  currency?: string;
  refundable?: boolean;
  boardName?: string;
  mealType?: string;
  supplier?: string;
  hotelId?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: SearchParamsData["guests"];
  nights?: number;
}

interface PoliciesData {
  CancellationPolicy?: {
    Description: string;
    Deadline?: string;
  };
  ImportantInformation?: string[];
  CityTax?: {
    Currency: string;
    Amount: number;
  };
}

const createSupplierFallbackPolicies = useCallback((): PoliciesData => {
  return {
    CancellationPolicy: {
      Description: "سياسة الإلغاء حسب شروط المزود",
    },
    ImportantInformation: ["سياسة الإلغاء حسب شروط المزود"],
  };
}, []);

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function calculateNights(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return 1;

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : 1;
}

const normalizeSelectedRoomForReview = useCallback((
  optionData: Partial<HotelData> & Record<string, unknown>,
  bookingData: {
    hotel?: Record<string, unknown>;
    selectedRoom?: Record<string, unknown>;
  } | null,
  searchData: SearchParamsData,
): HotelData => {
  const selectedRoom = {
    ...(optionData || {}),
    ...((bookingData?.hotel?.selectedOption as Record<string, unknown> | undefined) || {}),
    ...(bookingData?.selectedRoom || {}),
  };
  const nights =
    toNumber(selectedRoom.nights) ||
    searchData.guests.nights ||
    calculateNights(searchData.dates.checkIn, searchData.dates.checkOut);
  const taxes = toNumber(selectedRoom.Taxes);
  const rawPrice = toNumber(selectedRoom.Price || selectedRoom.price);
  const rawTotalPrice = toNumber(selectedRoom.totalPrice || selectedRoom.TotalPrice);
  const price = rawPrice || (rawTotalPrice > 0 ? rawTotalPrice / nights - taxes : 0);
  const totalPrice = rawTotalPrice || (price + taxes) * nights;
  const currency =
    String(selectedRoom.Currency || selectedRoom.currency || searchData.currency || "USD");
  const supplier = String(selectedRoom.supplier || "").toLowerCase();

  return {
    ...(optionData as HotelData),
    ...(selectedRoom as Partial<HotelData>),
    HotelName: String(
      optionData.HotelName ||
        bookingData?.hotel?.HotelName ||
        selectedRoom.HotelName ||
        "",
    ),
    RoomType: String(selectedRoom.RoomType || selectedRoom.roomName || ""),
    BoardType: String(selectedRoom.BoardType || selectedRoom.boardName || selectedRoom.mealType || ""),
    Currency: currency,
    Price: price,
    TotalPrice: rawTotalPrice,
    totalPrice,
    Taxes: taxes,
    OptionId: toNumber(selectedRoom.OptionId) || undefined,
    rateKey: String(
      selectedRoom.rateKey ||
        selectedRoom.supplierRateKey ||
        selectedRoom.BookingCode ||
        selectedRoom.OptionId ||
        "",
    ),
    supplierRateKey: String(
      selectedRoom.supplierRateKey ||
        selectedRoom.rateKey ||
        selectedRoom.BookingCode ||
        selectedRoom.OptionId ||
        "",
    ),
    BookingCode: String(
      selectedRoom.BookingCode ||
        selectedRoom.supplierRateKey ||
        selectedRoom.rateKey ||
        "",
    ),
    supplierHotelId: String(
      selectedRoom.supplierHotelId ||
        selectedRoom.HotelCode ||
        selectedRoom.hotelId ||
        selectedRoom.HotelId ||
        "",
    ),
    HotelCode: String(
      selectedRoom.HotelCode ||
        selectedRoom.supplierHotelId ||
        selectedRoom.hotelId ||
        selectedRoom.HotelId ||
        "",
    ),
    supplierTotalFare: toNumber(selectedRoom.supplierTotalFare || rawTotalPrice || rawPrice),
    roomName: String(selectedRoom.roomName || selectedRoom.RoomName || selectedRoom.RoomType || ""),
    price,
    currency,
    refundable:
      typeof selectedRoom.refundable === "boolean"
        ? selectedRoom.refundable
        : selectedRoom.IsNonRefundable === true
          ? false
          : undefined,
    boardName: String(selectedRoom.boardName || selectedRoom.BoardName || selectedRoom.BoardType || ""),
    mealType: String(selectedRoom.mealType || selectedRoom.BoardType || selectedRoom.BoardName || ""),
    supplier,
    hotelId: toNumber(selectedRoom.hotelId || selectedRoom.HotelId) || undefined,
    checkIn: String(selectedRoom.checkIn || searchData.dates.checkIn || ""),
    checkOut: String(selectedRoom.checkOut || searchData.dates.checkOut || ""),
    guests: searchData.guests,
    nights,
  };
}, []);

  const [policies, setPolicies] = useState<PoliciesData | null>(null);
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
interface SearchParamsData {
  dates: {
    checkIn: string;
    checkOut: string;
  };
  guests: {
    adults: number;
    children: number;
    childrenAges?: number[];
    rooms: number;
    nights?: number;
  };
  currency?: string;
}

type Title = "Mr" | "Mrs" | "Ms" | "Miss" | "Child";

interface TravelerForm {
  roomIndex: number;
  travelerType: "adult" | "child";
  index: number;
  title?: Title;
  firstName: string;
  lastName: string;
  age?: number;
  nationality: string;
  documentType: "passport" | "national_id";
  documentNumber: string;
  phone: string;
  email: string;
}

const TITLES: { value: Title; label: string }[] = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Miss", label: "Miss" },
];

const DOCUMENT_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "national_id", label: "National ID" },
] as const;

  const [searchParams, setSearchParams] = useState<SearchParamsData | null>(null);
  const [travelers, setTravelers] = useState<TravelerForm[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const buildInitialTravelers = useCallback((searchData: SearchParamsData): TravelerForm[] => {
    const nextTravelers: TravelerForm[] = [];
    const rooms = Math.max(searchData.guests.rooms || 1, 1);
    const adults = Math.max(searchData.guests.adults || 1, 1);
    const children = Math.max(searchData.guests.children || 0, 0);
    const ages = searchData.guests.childrenAges || [];

    for (let roomIndex = 0; roomIndex < rooms; roomIndex += 1) {
      for (let index = 0; index < adults; index += 1) {
        nextTravelers.push({
          roomIndex,
          travelerType: "adult",
          index,
          title: "Mr",
          firstName: "",
          lastName: "",
          nationality: "",
          documentType: "passport",
          documentNumber: "",
          phone: "",
          email: "",
        });
      }

      for (let index = 0; index < children; index += 1) {
        const childAge = Number(ages[roomIndex * children + index] ?? ages[index]);
        nextTravelers.push({
          roomIndex,
          travelerType: "child",
          index,
          title: "Child",
          firstName: "",
          lastName: "",
          age: Number.isFinite(childAge) ? childAge : undefined,
          nationality: "",
          documentType: "passport",
          documentNumber: "",
          phone: "",
          email: "",
        });
      }
    }

    return nextTravelers;
  }, []);

  const updateTraveler = (
    travelerIndex: number,
    field: keyof TravelerForm,
    value: string,
  ) => {
    setTravelers((current) => {
      const next = [...current];
      next[travelerIndex] = {
        ...next[travelerIndex],
        [field]:
          field === "age"
            ? Number.isFinite(Number(value))
              ? Number(value)
              : undefined
            : value,
      };
      return next;
    });
  };

  useEffect(() => {
    const loadBookingData = async () => {
      try {
        const savedSearch = localStorage.getItem('hotelSearch');
        const selectedOption = localStorage.getItem('selectedOption');
        const bookingDataRaw = localStorage.getItem('bookingData');

        if (!savedSearch || !selectedOption) {
          router.push('/');
          return;
        }

        const searchData = JSON.parse(savedSearch);
        const optionData = JSON.parse(selectedOption);
        const bookingData = bookingDataRaw ? JSON.parse(bookingDataRaw) : null;
        const normalizedRoom = normalizeSelectedRoomForReview(optionData, bookingData, searchData);
        const sourceHotel = bookingData?.hotel || optionData?.hotel || null;
        const isTboBookingFlow =
          normalizedRoom.supplier === "tbo" || shouldSkipTravellandaForTbo(sourceHotel);

        setSearchParams(searchData);
        setHotel(normalizedRoom);
        setTravelers(buildInitialTravelers(searchData));

        if (isTboBookingFlow) {
          if (normalizedRoom.Price <= 0 && (normalizedRoom.totalPrice || 0) <= 0) {
            console.warn("Missing selected TBO room price");
          }
          console.info("Selected room pricing", {
            selectedRoomPrice: normalizedRoom.Price,
            selectedRoomCurrency: normalizedRoom.Currency,
            nights: normalizedRoom.nights,
            computedTotal: normalizedRoom.totalPrice,
            supplier: normalizedRoom.supplier,
          });
          console.info('Skipping policies fetch for TBO certification booking flow');
          setPolicies(
            bookingData?.policies?.CancellationPolicy
              ? bookingData.policies
              : createSupplierFallbackPolicies(),
          );
          setLoading(false);
          return;
        }

        // Get policies - Need HotelIds array for the API
        const hotelId = optionData.HotelId || optionData.hotel?.HotelId || searchData?.hotel?.HotelId;
        if (!hotelId) {
          console.warn('HotelId not found, skipping policies fetch');
          setLoading(false);
          return;
        }
        
        const response = await fetch('/api/travellanda', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            RequestType: 'HotelPolicies',
            HotelIds: [hotelId],
            OptionId: optionData.OptionId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch policies');
        }

        const data = await response.json();
        setPolicies(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadBookingData();
  }, [
    router,
    createSupplierFallbackPolicies,
    normalizeSelectedRoomForReview,
    buildInitialTravelers,
  ]);

  const validateTravelers = () => {
    for (const traveler of travelers) {
      if (!traveler.firstName.trim() || !traveler.lastName.trim()) {
        setError("Please enter first and last name for every traveler");
        return false;
      }
      if (!traveler.nationality.trim()) {
        setError("Please enter nationality for every traveler");
        return false;
      }
      if (!traveler.documentNumber.trim()) {
        setError("Please enter document number for every traveler");
        return false;
      }
      if (traveler.travelerType === "adult") {
        if (!traveler.phone.trim() || !traveler.email.trim()) {
          setError("Please enter phone and email for every adult traveler");
          return false;
        }
      }
      if (traveler.travelerType === "child" && traveler.age === undefined) {
        setError("Please enter age for every child traveler");
        return false;
      }
    }

    return true;
  };

  const handleContinue = async () => {
    setError(null);
    setNotice("");

    if (!acceptedTerms || !hotel || !searchParams) return;
    if (!validateTravelers()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please sign in to complete your booking");
      return;
    }

    try {
      setSubmitting(true);
      const bookingReference = `HOTLENO-${Date.now()}`;
      const leadTraveler =
        travelers.find((traveler) => traveler.travelerType === "adult") ||
        travelers[0];
      const rooms = Array.from({ length: guestRooms }).map((_, roomIndex) => {
        const roomTravelers = travelers.filter(
          (traveler) => traveler.roomIndex === roomIndex,
        );
        const childrenAges = roomTravelers
          .filter(
            (traveler) =>
              traveler.travelerType === "child" && traveler.age !== undefined,
          )
          .map((traveler) => Number(traveler.age));

        return {
          roomId: roomIndex + 1,
          roomName: hotel.roomName || hotel.RoomType || `Room ${roomIndex + 1}`,
          adults: roomTravelers.filter((traveler) => traveler.travelerType === "adult").length,
          children: roomTravelers.filter((traveler) => traveler.travelerType === "child").length,
          childrenAges,
        };
      });
      const bookingTravelers = travelers.map((traveler) => ({
        roomIndex: traveler.roomIndex,
        travelerType: traveler.travelerType,
        index: traveler.index,
        title: traveler.title || (traveler.travelerType === "child" ? "Child" : "Mr"),
        firstName: traveler.firstName.trim(),
        lastName: traveler.lastName.trim(),
        age: traveler.age,
        nationality: traveler.nationality.trim(),
        documentType: traveler.documentType,
        documentNumber: traveler.documentNumber.trim(),
        phone: traveler.phone.trim(),
        email: traveler.email.trim(),
      }));
      const selectedRoom = {
        hotel: {
          ...hotel,
          selectedOption: hotel,
        },
        selectedRoom: hotel,
        policies,
        searchParams,
        travelers: bookingTravelers,
      };

      localStorage.setItem("bookingData", JSON.stringify(selectedRoom));

      const response = await fetch("/api/user/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingReference,
          yourReference: bookingReference,
          supplier: hotel.supplier || "none",
          supplierHotelId: hotel.supplierHotelId || hotel.HotelCode || "",
          supplierRateKey:
            hotel.supplierRateKey || hotel.rateKey || hotel.BookingCode || "",
          supplierBookingReference: "",
          hotelId: hotel.hotelId || 0,
          hotelName: hotel.HotelName,
          location: "",
          checkInDate: searchParams.dates.checkIn,
          checkOutDate: searchParams.dates.checkOut,
          rooms,
          travelers: bookingTravelers,
          leadGuest: leadTraveler
            ? `${leadTraveler.title || "Mr"} ${leadTraveler.firstName} ${leadTraveler.lastName}`
            : "Guest",
          contactEmail: leadTraveler?.email || "",
          contactPhone: leadTraveler?.phone || "",
          totalPrice,
          currency: hotel.Currency,
          status: "pending_payment",
          paymentStatus: "pending",
          supplierStatus: "not_started",
          specialRequests: "",
          cancellationPolicies: [],
          alerts: [],
          restrictions: [],
          rawSupplierRequest: null,
          rawSupplierResponse: null,
          idempotencyKey: bookingReference,
          metadata: {
            checkoutFlow: "review_traveler_details_before_booking",
            supplierTotalFare: hotel.supplierTotalFare || totalPrice,
          },
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to create booking");
      }

      const bookingStatus = result?.booking?.bookingStatus || "";
      if (bookingStatus === "supplier_booking_confirmed") {
        setNotice(`Booking created with ID ${bookingReference}. Your booking is confirmed.`);
      } else if (bookingStatus === "supplier_booking_failed") {
        setNotice(
          `Booking created with ID ${bookingReference}. We could not confirm it automatically and will contact you.`,
        );
      } else {
        setNotice(`Booking created with ID ${bookingReference}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-1/3 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error && !hotel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={() => router.push('/')}>{t('hotels.newSearch')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nights =
    hotel?.nights ||
    searchParams?.guests.nights ||
    calculateNights(searchParams?.dates.checkIn, searchParams?.dates.checkOut);
  const nightlyPrice = hotel?.Price || 0;
  const taxes = hotel?.Taxes || 0;
const totalPrice = hotel?.totalPrice || (nightlyPrice + taxes) * nights;
  const guestRooms = Math.max(searchParams?.guests.rooms || 1, 1);
  const childAges = (searchParams?.guests.childrenAges || [])
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age) && age >= 0);
  const formatChildAges = (ages: number[]) =>
    ages.length > 0
      ? ages.map((age) => `${age} ${age === 1 ? "year" : "years"}`).join(", ")
      : "-";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <BookingBreadcrumb currentStep="review" hotelName={hotel?.HotelName} />
      </div>
      <h1 className="text-3xl font-bold mb-2">{t('booking.reviewPolicies')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('booking.reviewDescription')}
      </p>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Booking Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hotel Summary */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{hotel?.HotelName}</h3>
                  <p className="text-muted-foreground">{hotel?.RoomType}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hotel?.BoardType}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {hotel?.Currency} {hotel?.Price}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('hotels.perNight')}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">{t('booking.checkIn')}</p>
                  <p className="text-muted-foreground">
                    {searchParams?.dates.checkIn && new Date(searchParams.dates.checkIn).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('hotelDetails.checkInTime')}</p>
                </div>
                <div>
                  <p className="font-medium">{t('booking.checkOut')}</p>
                  <p className="text-muted-foreground">
                    {searchParams?.dates.checkOut && new Date(searchParams.dates.checkOut).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('hotelDetails.checkOutTime')}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="font-medium">{t('hotelDetails.guests')}</p>
                <p className="text-muted-foreground">
                  {searchParams?.guests.adults} {t('hotelDetails.adults')}
                  {searchParams?.guests.children && searchParams.guests.children > 0 && 
                    `, ${searchParams.guests.children} ${t('search.children')}`
                  }
                  {searchParams?.guests.rooms && searchParams.guests.rooms > 1 && 
                    `, ${searchParams.guests.rooms} ${t('search.rooms')}`
                  }
                </p>
                <div className="mt-3 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  {Array.from({ length: guestRooms }).map((_, roomIndex) => {
                    const roomChildAges = childAges.slice(
                      roomIndex * (searchParams?.guests.children || 0),
                      (roomIndex + 1) * (searchParams?.guests.children || 0),
                    );

                    return (
                      <div key={roomIndex} className="text-slate-700">
                        <p className="font-bold">Room {roomIndex + 1}</p>
                        <p>
                          Adults: {searchParams?.guests.adults || 0}
                          {", "}
                          Children: {searchParams?.guests.children || 0}
                        </p>
                        {(searchParams?.guests.children || 0) > 0 ? (
                          <p>Child ages: {formatChildAges(roomChildAges)}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">بيانات المسافرين</h3>
              <div className="space-y-6">
                {Array.from({ length: guestRooms }).map((_, roomIndex) => (
                  <div
                    key={roomIndex}
                    className="border-b pb-6 last:border-0 last:pb-0"
                  >
                    <h4 className="mb-4 font-semibold text-muted-foreground">
                      Room {roomIndex + 1}
                    </h4>

                    <div className="space-y-5">
                      {travelers
                        .map((traveler, travelerIndex) => ({
                          traveler,
                          travelerIndex,
                        }))
                        .filter(({ traveler }) => traveler.roomIndex === roomIndex)
                        .map(({ traveler, travelerIndex }) => (
                          <div
                            key={`${traveler.travelerType}-${traveler.index}-${travelerIndex}`}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <p className="mb-3 font-bold text-slate-800">
                              {traveler.travelerType === "adult"
                                ? `Adult ${traveler.index + 1}`
                                : `Child ${traveler.index + 1} - Age ${traveler.age ?? "-"}`}
                            </p>

                            <div className="grid gap-3 md:grid-cols-2">
                              {traveler.travelerType === "adult" ? (
                                <div>
                                  <Label>Title</Label>
                                  <Select
                                    value={traveler.title || "Mr"}
                                    onValueChange={(value) =>
                                      updateTraveler(travelerIndex, "title", value)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TITLES.map((title) => (
                                        <SelectItem key={title.value} value={title.value}>
                                          {title.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : null}

                              <div>
                                <Label>
                                  First name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  value={traveler.firstName}
                                  onChange={(event) =>
                                    updateTraveler(
                                      travelerIndex,
                                      "firstName",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="First name"
                                />
                              </div>

                              <div>
                                <Label>
                                  Last name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  value={traveler.lastName}
                                  onChange={(event) =>
                                    updateTraveler(
                                      travelerIndex,
                                      "lastName",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Last name"
                                />
                              </div>

                              {traveler.travelerType === "child" ? (
                                <div>
                                  <Label>
                                    Age <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={17}
                                    value={
                                      traveler.age !== undefined
                                        ? String(traveler.age)
                                        : ""
                                    }
                                    onChange={(event) =>
                                      updateTraveler(
                                        travelerIndex,
                                        "age",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Age"
                                  />
                                </div>
                              ) : null}

                              <div>
                                <Label>
                                  Nationality <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  value={traveler.nationality}
                                  onChange={(event) =>
                                    updateTraveler(
                                      travelerIndex,
                                      "nationality",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="SA"
                                />
                              </div>

                              <div>
                                <Label>Document type</Label>
                                <Select
                                  value={traveler.documentType}
                                  onValueChange={(value) =>
                                    updateTraveler(
                                      travelerIndex,
                                      "documentType",
                                      value,
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DOCUMENT_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>
                                  Document number <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  value={traveler.documentNumber}
                                  onChange={(event) =>
                                    updateTraveler(
                                      travelerIndex,
                                      "documentNumber",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Document number"
                                />
                              </div>

                              {traveler.travelerType === "adult" ? (
                                <>
                                  <div>
                                    <Label>
                                      Phone <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      value={traveler.phone}
                                      onChange={(event) =>
                                        updateTraveler(
                                          travelerIndex,
                                          "phone",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="+966..."
                                    />
                                  </div>
                                  <div>
                                    <Label>
                                      Email <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      type="email"
                                      value={traveler.email}
                                      onChange={(event) =>
                                        updateTraveler(
                                          travelerIndex,
                                          "email",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="guest@email.com"
                                    />
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Policies */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">{t('booking.importantPolicies')}</h3>
              
              {policies?.CancellationPolicy && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <HugeiconsIcon 
                      icon={LeftTriangleIcon} 
                      className="h-5 w-5 text-amber-500" 
                    />
                    <h4 className="font-bold">{t('booking.cancellationPolicy')}</h4>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800">
                      {policies.CancellationPolicy.Description}
                    </p>
                    {policies.CancellationPolicy.Deadline && (
                      <p className="font-medium mt-2 text-amber-800">
                        {t('booking.freeCancellationUntil')}: {policies.CancellationPolicy.Deadline}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {policies?.ImportantInformation && (
                <div className="space-y-3">
                  <h4 className="font-bold">{t('booking.importantInformation')}</h4>
                  <ul className="space-y-2">
                    {policies.ImportantInformation.map((info: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <HugeiconsIcon 
                          icon={LeftTriangleIcon} 
                          className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" 
                        />
                        <span>{info}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Terms Acceptance */}
              <div className="mt-8 pt-6 border-t">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="terms" className="font-medium">
                      {t('booking.termsAcceptance')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('booking.termsDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Price Summary */}
        <div>
          <Card className="sticky top-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">{t('booking.priceSummary')}</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{t('booking.roomPrice')} ({nights} {t('hotels.nights')})</span>
                  <span>{hotel?.Currency} {nightlyPrice * nights}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>{t('hotelDetails.taxesFees')}</span>
                  <span>{hotel?.Currency} {taxes}</span>
                </div>

                {policies?.CityTax && (
                  <div className="flex justify-between">
                    <span>{t('booking.cityTax')}</span>
                    <span>{policies.CityTax.Currency} {policies.CityTax.Amount}</span>
                  </div>
                )}

                <Separator className="my-2" />

                <div className="flex justify-between font-bold text-lg">
                  <span>{t('booking.total')}</span>
                  <span>
                    {hotel?.Currency} {totalPrice}
                  </span>
                </div>
              </div>

              <Button 
                className="w-full mt-6" 
                size="lg"
                onClick={handleContinue}
                disabled={!acceptedTerms || submitting}
              >
                {submitting ? "Processing..." : "تأكيد الحجز"}
              </Button>

              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <HugeiconsIcon icon={CheckmarkCircleIcon} className="h-5 w-5" />
                  <p className="text-sm font-medium">
                    {t('booking.bestPriceGuaranteed')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
