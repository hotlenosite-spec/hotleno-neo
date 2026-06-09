"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CountrySelect } from "@/components/shared/country-select";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthDialog } from "@/components/features/auth/auth-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  ArrowLeftIcon,
  CreditCardIcon,
  CustomerServiceIcon,
  Shield02Icon,
  UserGroupIcon,
  AiPhoneIcon,
  PassportIcon,
  NoteIcon,
  BedIcon,
} from "@hugeicons/core-free-icons";
import { formatCurrency } from "@/hooks/use-hotels-enhanced";
import { countries, getCountryByCode } from "@/lib/data/countries";
import type { BookingRoom } from "@/types/travellanda";
import {
  isDevPreviewAllPagesEnabled,
  warnDevPreviewAllPagesEnabled,
} from "@/lib/security/dev-flags";

type Title = "Mr" | "Mrs" | "Ms" | "Child";

interface Traveler {
  savedTravelerId?: string;
  roomIndex: number;
  travelerType: "adult" | "child";
  index: number;
  title?: Title;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  nationality?: string;
  documentType?: "passport" | "national_id" | "residence_permit" | "iqama";
  documentNumber?: string;
  passportExpiryDate?: string;
  phone?: string;
  email?: string;
}

interface SavedTraveler {
  _id: string;
  title?: Title;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  birthDate?: string;
  nationality?: string;
  documentType?: "passport" | "national_id" | "residence_permit" | "iqama";
  documentNumber?: string;
  passportNumber?: string;
  nationalId?: string;
  passportExpiryDate?: string;
  phone?: string;
  email?: string;
}

interface BookingData {
  hotel: {
    HotelId: number;
    HotelName: string;
    HotelStars: number;
    CityName: string;
    CountryName: string;
    selectedOption: {
      OptionId: number | string;
      Price: number;
      Currency: string;
      Taxes?: number;
      RoomType?: string;
      BoardType?: string;
      supplier?: string;
      supplierHotelId?: string;
      supplierRateKey?: string;
      hotelId?: number | string;
      rateKey?: string;
      BookingCode?: string;
      HotelCode?: string;
      supplierTotalFare?: number;
      roomName?: string;
      boardName?: string;
      Rooms: Array<{
        RoomId: number;
        RoomName: string;
      }>;
    };
  };
  searchParams: {
    dates: {
      checkIn: string;
      checkOut: string;
    };
    guests: {
      rooms: number;
      adults: number;
      children: number;
      childrenAges: number[];
      nights: number;
    };
  };
}

const TITLES: Title[] = ["Mr", "Mrs", "Ms", "Child"];

const DOCUMENT_TYPES = [
  { value: "passport" },
  { value: "national_id" },
  { value: "residence_permit" },
] as const;

function normalizeGuestTitle(value?: string): "Mr" | "Mrs" | "Ms" {
  return value === "Mrs" || value === "Ms" ? value : "Mr";
}

function isValidGuestName(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 3 && trimmed.length <= 25 && /^[\p{L}\s]+$/u.test(trimmed);
}

export default function CheckoutPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("checkout");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isDevPreviewAllPages = isDevPreviewAllPagesEnabled();
  const isStripeCheckoutEnabled =
    process.env.NEXT_PUBLIC_ENABLE_STRIPE_CHECKOUT === "true";
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [savedTravelers, setSavedTravelers] = useState<SavedTraveler[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phoneCountryCode: "SA",
    phoneNumber: "",
    nationality: "SA",
    countryOfResidence: "SA",
    documentType: "passport",
    documentNumber: "",
    specialRequests: "",
  });

  useEffect(() => {
    if (isDevPreviewAllPages) {
      warnDevPreviewAllPagesEnabled();
    }

    const data = localStorage.getItem("bookingData");
    if (!data) {
      if (isDevPreviewAllPages) {
        setLoading(false);
        return;
      }

      router.push("/");
      return;
    }

    const parsedData = JSON.parse(data);
    setBookingData(parsedData);

    // Initialize travelers form
    const searchParams = parsedData.searchParams;
    const travelersList: Traveler[] = [];

    // Add adults (RoomId from selected option's rooms)
    const selectedOption = parsedData.hotel.selectedOption;
    for (
      let roomIndex = 0;
      roomIndex < searchParams.guests.rooms;
      roomIndex++
    ) {
      const _roomId =
        selectedOption?.Rooms?.[roomIndex]?.RoomId || roomIndex + 1;

      for (let i = 0; i < searchParams.guests.adults; i++) {
        travelersList.push({
          roomIndex,
          travelerType: "adult",
          index: i,
          title: "Mr",
          firstName: "",
          lastName: "",
          gender: "",
          dateOfBirth: "",
          nationality: "SA",
          documentType: "passport",
          documentNumber: "",
          passportExpiryDate: "",
        });
      }

      // Add children
      for (let i = 0; i < searchParams.guests.children; i++) {
        const childAge = Number(searchParams.guests.childrenAges?.[i]);
        travelersList.push({
          roomIndex,
          travelerType: "child",
          index: i,
          title: "Child",
          firstName: "",
          lastName: "",
          gender: "",
          dateOfBirth: "",
          age: Number.isFinite(childAge) ? childAge : undefined,
          nationality: "SA",
          documentType: "passport",
          documentNumber: "",
          passportExpiryDate: "",
        });
      }
    }

    setTravelers(travelersList);

    // Pre-fill contact info if user is logged in
    if (user) {
      setContactInfo((prev) => ({
        ...prev,
        email: user.email || "",
      }));
    }

    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/account/travelers", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => response.json())
        .then((data) => setSavedTravelers(data.travelers || []))
        .catch(() => setSavedTravelers([]));
    }

    setLoading(false);
  }, [isDevPreviewAllPages, router, user]);

  const updateTraveler = (
    index: number,
    field: keyof Traveler,
    value: string,
  ) => {
    const updatedTravelers = [...travelers];
    const nextValue =
      field === "age"
        ? Number.isFinite(Number(value))
          ? Number(value)
          : undefined
        : value;
    updatedTravelers[index] = {
      ...updatedTravelers[index],
      [field]: nextValue,
    };
    setTravelers(updatedTravelers);
  };

  const applySavedTraveler = (index: number, travelerId: string) => {
    const saved = savedTravelers.find((traveler) => traveler._id === travelerId);
    if (!saved) return;
    const updatedTravelers = [...travelers];
    updatedTravelers[index] = {
      ...updatedTravelers[index],
      savedTravelerId: saved._id,
      title:
        updatedTravelers[index].travelerType === "child"
          ? "Child"
          : normalizeGuestTitle(saved.title),
      firstName: saved.firstName || "",
      lastName: saved.lastName || "",
      gender: saved.gender || "",
      dateOfBirth: saved.dateOfBirth || saved.birthDate || "",
      nationality: saved.nationality || "",
      documentType:
        saved.documentType === "iqama"
          ? "residence_permit"
          : saved.documentType || "passport",
      documentNumber: saved.documentNumber || saved.passportNumber || saved.nationalId || "",
      passportExpiryDate: saved.passportExpiryDate || "",
      phone: saved.phone || "",
      email: saved.email || "",
    };
    setTravelers(updatedTravelers);
  };

  const getCombinedPhone = () => {
    const phoneCode =
      getCountryByCode(contactInfo.phoneCountryCode)?.phoneCode || "";
    return `${phoneCode}${contactInfo.phoneNumber.trim()}`;
  };

  const validateForm = (): boolean => {
    const seenNames = new Set<string>();
    for (const traveler of travelers) {
      if (!traveler.firstName.trim() || !traveler.lastName.trim()) {
        setError(t("errors.travelerNames"));
        return false;
      }

      if (!isValidGuestName(traveler.firstName) || !isValidGuestName(traveler.lastName)) {
        setError("Guest names must be 3-25 letters and spaces only.");
        return false;
      }

      const fullNameKey = `${traveler.firstName.trim()} ${traveler.lastName.trim()}`
        .replace(/\s+/g, " ")
        .toLowerCase();
      if (seenNames.has(fullNameKey)) {
        setError("Duplicate guest names are not allowed in the same booking.");
        return false;
      }
      seenNames.add(fullNameKey);

      if (!traveler.nationality?.trim()) {
        setError(t("errors.travelerNationality"));
        return false;
      }

      if (!traveler.documentNumber?.trim()) {
        setError(t("errors.travelerDocumentNumber"));
        return false;
      }

      if (
        traveler.travelerType === "child" &&
        traveler.age === undefined &&
        !traveler.dateOfBirth
      ) {
        setError(t("errors.childAge"));
        return false;
      }

      if (traveler.travelerType === "adult") {
        const travelerEmail = traveler.email?.trim() || contactInfo.email.trim();
        const travelerPhone = traveler.phone?.trim() || getCombinedPhone();

        if (!travelerEmail || !travelerPhone) {
          setError(t("errors.adultContact"));
          return false;
        }
      }
    }

    // Check contact info
    if (!contactInfo.email.trim()) {
      setError(t("errors.emailRequired"));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactInfo.email)) {
      setError(t("errors.emailInvalid"));
      return false;
    }

    if (!contactInfo.phoneCountryCode || !contactInfo.phoneNumber.trim()) {
      setError(t("errors.phoneRequired"));
      return false;
    }

    if (!contactInfo.nationality) {
      setError(t("errors.nationalityRequired"));
      return false;
    }

    if (!contactInfo.countryOfResidence) {
      setError(t("errors.residenceRequired"));
      return false;
    }

    if (!contactInfo.documentType || !contactInfo.documentNumber.trim()) {
      setError(t("errors.documentRequired"));
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    setNotice(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      if (!bookingData) {
        setError(t("errors.bookingDataMissing"));
        return;
      }

      // Group travelers by room
      const roomsMap = new Map<number, BookingRoom>();

      travelers.forEach((traveler) => {
        if (!roomsMap.has(traveler.roomIndex)) {
          const roomId =
            bookingData.hotel.selectedOption?.Rooms?.[traveler.roomIndex]
              ?.RoomId || traveler.roomIndex + 1;
          roomsMap.set(traveler.roomIndex, {
            RoomId: roomId,
            AdultNames: [],
            ChildNames: [],
          });
        }

        const room = roomsMap.get(traveler.roomIndex)!;

        if (traveler.travelerType === "adult") {
          const adultTitle = normalizeGuestTitle(traveler.title);
          room.AdultNames.push({
            Title: adultTitle,
            FirstName: traveler.firstName.trim(),
            LastName: traveler.lastName.trim(),
          });
        } else {
          room.ChildNames = room.ChildNames || [];
          room.ChildNames.push({
            FirstName: traveler.firstName.trim(),
            LastName: traveler.lastName.trim(),
          });
        }
      });

      const yourReference = `HOTLENO-${Date.now()}`;

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(t("errors.signInRequired"));
      }

      const leadGuest = travelers.find((t) => t.travelerType === "adult");
      const combinedPhone = getCombinedPhone();
      const quickTravelers = travelers.filter(
        (traveler) => !traveler.savedTravelerId && traveler.firstName.trim() && traveler.lastName.trim(),
      );
      await Promise.all(
        quickTravelers.map((traveler) =>
          fetch("/api/account/travelers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: traveler.title,
              firstName: traveler.firstName,
              lastName: traveler.lastName,
              gender: traveler.gender,
              dateOfBirth: traveler.dateOfBirth,
              nationality: traveler.nationality,
              documentType: traveler.documentType,
              documentNumber: traveler.documentNumber,
              passportExpiryDate: traveler.passportExpiryDate,
              phone: traveler.phone || (traveler.travelerType === "adult" ? combinedPhone : ""),
              email: traveler.email || (traveler.travelerType === "adult" ? contactInfo.email : ""),
            }),
          }).catch(() => null),
        ),
      );
      const bookingTravelers = travelers.map((traveler) => ({
        savedTravelerId: traveler.savedTravelerId || "",
        roomIndex: traveler.roomIndex,
        travelerType: traveler.travelerType,
        index: traveler.index,
        title: traveler.travelerType === "child" ? "Child" : normalizeGuestTitle(traveler.title),
        firstName: traveler.firstName.trim(),
        lastName: traveler.lastName.trim(),
        gender: traveler.gender || "",
        dateOfBirth: traveler.dateOfBirth || "",
        age: traveler.age,
        nationality: traveler.nationality || "",
        documentType: traveler.documentType || "",
        documentNumber: traveler.documentNumber || "",
        passportExpiryDate: traveler.passportExpiryDate || "",
        phone:
          traveler.phone ||
          (traveler.travelerType === "adult" ? combinedPhone : ""),
        email:
          traveler.email ||
          (traveler.travelerType === "adult" ? contactInfo.email : ""),
      }));
      const selectedOption = bookingData.hotel.selectedOption;
      const selectedSupplier = String(
        selectedOption.supplier || "none",
      ).toLowerCase();
      const supplierHotelId = String(
        selectedOption.supplierHotelId ||
          selectedOption.hotelId ||
          selectedOption.HotelCode ||
          bookingData.hotel.HotelId ||
          "",
      );
      const supplierRateKey = String(
        selectedOption.supplierRateKey ||
          selectedOption.rateKey ||
          selectedOption.BookingCode ||
          selectedOption.OptionId ||
          "",
      );
      const supplierTotalFare =
        typeof selectedOption.supplierTotalFare === "number" && Number.isFinite(selectedOption.supplierTotalFare)
          ? selectedOption.supplierTotalFare
          : totalPrice;
      const dbBooking = {
        bookingReference: yourReference,
        travellandaReference: "",
        yourReference,
        supplier: selectedSupplier,
        supplierHotelId,
        supplierRateKey,
        supplierBookingReference: "",
        hotelId: bookingData.hotel.HotelId,
        hotelName: bookingData.hotel.HotelName,
        location: `${bookingData.hotel.CityName}, ${bookingData.hotel.CountryName}`,
        checkInDate: bookingData.searchParams.dates.checkIn,
        checkOutDate: bookingData.searchParams.dates.checkOut,
        rooms: Array.from(roomsMap.values()).map((room, roomIndex) => ({
          roomId: room.RoomId,
          roomName:
            bookingData.hotel.selectedOption.Rooms.find(
              (r: { RoomId: number; RoomName: string }) =>
                r.RoomId === room.RoomId,
            )?.RoomName || "Room",
          adults: room.AdultNames.length,
          children: room.ChildNames?.length || 0,
          childrenAges: travelers
            .filter(
              (traveler) =>
                traveler.roomIndex === roomIndex &&
                traveler.travelerType === "child" &&
                traveler.age !== undefined,
            )
            .map((traveler) => Number(traveler.age)),
        })),
        travelers: bookingTravelers,
        leadGuest: leadGuest
          ? `${normalizeGuestTitle(leadGuest.title)} ${leadGuest.firstName} ${leadGuest.lastName}`
          : "Guest",
        contactEmail: contactInfo.email,
        contactPhone: combinedPhone,
        totalPrice,
        currency: bookingData.hotel.selectedOption.Currency,
        status: "pending_payment",
        paymentStatus: "pending",
        supplierStatus: "not_started",
        specialRequests: contactInfo.specialRequests,
        cancellationPolicies: [],
        alerts: [],
        restrictions: [],
        rawSupplierRequest: null,
        rawSupplierResponse: null,
        idempotencyKey: yourReference,
        metadata: {
          checkoutFlow: "internal_booking_before_payment",
          stripeMetadataReady: true,
          supplierTotalFare,
          customerDetails: {
            firstName: leadGuest?.firstName?.trim() || "",
            lastName: leadGuest?.lastName?.trim() || "",
            email: contactInfo.email,
            phoneCountryCode: contactInfo.phoneCountryCode,
            phoneCode: getCountryByCode(contactInfo.phoneCountryCode)?.phoneCode || "",
            phoneNumber: contactInfo.phoneNumber,
            phone: combinedPhone,
            nationality: contactInfo.nationality,
            countryOfResidence: contactInfo.countryOfResidence,
            documentType: contactInfo.documentType,
            documentNumber: contactInfo.documentNumber,
            specialRequests: contactInfo.specialRequests,
          },
        },
      };

      const bookingResponse = await fetch("/api/user/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dbBooking),
      });

      if (!bookingResponse.ok) {
        const data = await bookingResponse.json().catch(() => null);
        if (process.env.NODE_ENV !== "production" && data?.error) {
          console.warn("[checkout] Booking creation failed:", data.error);
        }
        throw new Error(t("errors.bookingFailed"));
      }

      const bookingResult = await bookingResponse.json();
      const bookingId = bookingResult.booking?._id;

      if (!bookingId) {
        throw new Error(t("errors.bookingIdMissing"));
      }

      const pendingPaymentCheckout = {
        bookingId,
        bookingReference: yourReference,
        amount: totalPrice,
        currency: bookingData.hotel.selectedOption.Currency,
        stripeMetadata: {
          bookingId,
          bookingReference: yourReference,
          nextStatus: "payment_succeeded",
        },
      };

      localStorage.setItem(
        "pendingPaymentCheckout",
        JSON.stringify(pendingPaymentCheckout),
      );

      if (!isStripeCheckoutEnabled) {
        const bookingStatus = bookingResult.booking?.bookingStatus || "";
        if (bookingStatus === "supplier_booking_confirmed") {
          setNotice(t("notices.confirmed", { bookingId }));
        } else if (bookingStatus === "supplier_booking_failed") {
          setNotice(t("notices.failed", { bookingId }));
        } else {
          setNotice(t("notices.paymentDisabled", { bookingId }));
        }
        return;
      }

      const checkoutResponse = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalPrice,
          bookingId,
          currency: bookingData.hotel.selectedOption.Currency,
          description: `Hotleno booking ${yourReference}`,
          locale,
        }),
      });

      if (!checkoutResponse.ok) {
        const data = await checkoutResponse.json().catch(() => null);
        throw new Error(data?.error || t("errors.paymentStartFailed"));
      }

      const checkout = await checkoutResponse.json();
      if (!checkout.url) {
        throw new Error(t("errors.paymentUrlMissing"));
      }

      window.location.href = checkout.url;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Booking error:", error);
      }
      if (error instanceof Error && error.name === "AbortError") {
        setError(
          t("errors.timeout"),
        );
      } else if (error instanceof Error) {
        setError(error.message || t("errors.bookingFailed"));
      } else {
        setError(t("errors.bookingFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-1/3 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isDevPreviewAllPages && !bookingData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-dashed">
          <CardContent className="space-y-4 py-12 text-center">
            <Badge variant="secondary">Developer Preview</Badge>
            <HugeiconsIcon
              icon={AlertCircleIcon}
              className="mx-auto h-12 w-12 text-amber-500"
            />
            <h2 className="text-2xl font-bold">Checkout needs booking data</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              This protected page is open for local preview only. No fake checkout
              data is injected; the real page expects `bookingData` in localStorage
              from the hotel review flow.
            </p>
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to site
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isDevPreviewAllPages && !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="h-12 w-12 text-amber-500"
              />
            </div>
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to complete your booking
            </p>
            <AuthDialog />
          </CardContent>
        </Card>
      </div>
    );
  }

  const nights = bookingData?.searchParams?.guests?.nights || 1;
  const selectedOption = bookingData?.hotel?.selectedOption;
  const totalPrice = selectedOption
    ? (selectedOption.Price + (selectedOption.Taxes || 0)) * nights
    : 0;
  const formatAge = (age: number) => `${age} ${age === 1 ? t("year") : t("years")}`;
  const getRoomChildAges = (roomIndex: number) => {
    const childrenPerRoom = bookingData?.searchParams.guests.children || 0;
    return (bookingData?.searchParams.guests.childrenAges || [])
      .slice(roomIndex * childrenPerRoom, (roomIndex + 1) * childrenPerRoom)
      .filter((age) => Number.isFinite(Number(age)));
  };

  const renderTravelerDocumentFields = (travelerIndex: number) => (
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div>
        <Label htmlFor={`gender-${travelerIndex}`}>{t("gender")}</Label>
        <Input
          id={`gender-${travelerIndex}`}
          value={travelers[travelerIndex]?.gender || ""}
          onChange={(e) => updateTraveler(travelerIndex, "gender", e.target.value)}
          placeholder={t("gender")}
        />
      </div>
      <div>
        <Label htmlFor={`dob-${travelerIndex}`}>{t("dateOfBirth")}</Label>
        <Input
          id={`dob-${travelerIndex}`}
          type="date"
          value={travelers[travelerIndex]?.dateOfBirth || ""}
          onChange={(e) => updateTraveler(travelerIndex, "dateOfBirth", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`nationality-${travelerIndex}`}>
          {t("nationality")} <span className="text-red-500">*</span>
        </Label>
        <CountrySelect
          mode="nationality"
          value={travelers[travelerIndex]?.nationality || ""}
          onChange={(value) => updateTraveler(travelerIndex, "nationality", value)}
        />
      </div>
      <div>
        <Label htmlFor={`documentType-${travelerIndex}`}>{t("documentType")}</Label>
        <Select
          value={travelers[travelerIndex]?.documentType || "passport"}
          onValueChange={(value) => updateTraveler(travelerIndex, "documentType", value)}
        >
          <SelectTrigger id={`documentType-${travelerIndex}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {t(`documentTypes.${type.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor={`documentNumber-${travelerIndex}`}>
          {t("documentNumber")} <span className="text-red-500">*</span>
        </Label>
        <Input
          id={`documentNumber-${travelerIndex}`}
          value={travelers[travelerIndex]?.documentNumber || ""}
          onChange={(e) => updateTraveler(travelerIndex, "documentNumber", e.target.value)}
          placeholder={t("documentNumber")}
        />
      </div>
      {(travelers[travelerIndex]?.documentType || "passport") === "passport" && (
        <div>
          <Label htmlFor={`passportExpiryDate-${travelerIndex}`}>{t("passportExpiryDate")}</Label>
          <Input
            id={`passportExpiryDate-${travelerIndex}`}
            type="date"
            value={travelers[travelerIndex]?.passportExpiryDate || ""}
            onChange={(e) => updateTraveler(travelerIndex, "passportExpiryDate", e.target.value)}
          />
        </div>
      )}
      <div>
        <Label htmlFor={`travelerPhone-${travelerIndex}`}>{t("phoneNumber")}</Label>
        <Input
          id={`travelerPhone-${travelerIndex}`}
          type="tel"
          value={travelers[travelerIndex]?.phone || ""}
          onChange={(e) => updateTraveler(travelerIndex, "phone", e.target.value)}
          placeholder={t("phoneNumber")}
        />
      </div>
      <div>
        <Label htmlFor={`travelerEmail-${travelerIndex}`}>{t("email")}</Label>
        <Input
          id={`travelerEmail-${travelerIndex}`}
          type="email"
          value={travelers[travelerIndex]?.email || ""}
          onChange={(e) => updateTraveler(travelerIndex, "email", e.target.value)}
          placeholder={t("emailPlaceholder")}
        />
      </div>
    </div>
  );

  const renderSavedTravelerPicker = (travelerIndex: number) => (
    <div className="mb-3">
      <Label>{t("savedTraveler")}</Label>
      {savedTravelers.length ? (
        <Select
          value={travelers[travelerIndex]?.savedTravelerId || ""}
          onValueChange={(value) => applySavedTraveler(travelerIndex, value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("chooseSavedTraveler")} />
          </SelectTrigger>
          <SelectContent>
            {savedTravelers.map((traveler) => (
              <SelectItem key={traveler._id} value={traveler._id}>
                {[traveler.title, traveler.firstName, traveler.lastName].filter(Boolean).join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
          {t("noSavedTravelers")}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto overflow-x-clip px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6 -ml-2"
        onClick={() => router.back()}
      >
        <HugeiconsIcon icon={ArrowLeftIcon} className="mr-2 h-4 w-4" />
        {t("backToReview")}
      </Button>

      <h1 className="mb-2 text-3xl font-black text-[#0F172A]">{t("title")}</h1>
      <p className="mb-8 text-sm font-medium text-muted-foreground">
        {t("description")}
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Traveler Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Traveler Information */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#F97316]">
                  <HugeiconsIcon icon={UserGroupIcon} className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-black text-[#0F172A]">{t("travelerInformation")}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("travelerInformationHelp")}
                  </p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="space-y-6">
                {Array.from({
                  length: bookingData?.searchParams.guests.rooms || 1,
                }).map((_, roomIndex) => (
                  <div
                    key={roomIndex}
                    className="border-b border-slate-100 pb-6 last:border-0 last:pb-0"
                  >
                    <h4 className="mb-4 flex items-center gap-2 font-black text-[#0F172A]">
                      <HugeiconsIcon icon={BedIcon} className="h-4 w-4 text-[#F97316]" />
                      {t("room")} {roomIndex + 1}
                      {selectedOption?.Rooms?.[roomIndex]?.RoomName && (
                        <span className="font-normal">
                          {" "}
                          - {selectedOption.Rooms[roomIndex].RoomName}
                        </span>
                      )}
                    </h4>

                    {/* Adults */}
                    {Array.from({
                      length: bookingData?.searchParams.guests.adults || 0,
                    }).map((_, adultIndex) => {
                      const travelerIndex = travelers.findIndex(
                        (t) =>
                          t.roomIndex === roomIndex &&
                          t.travelerType === "adult" &&
                          t.index === adultIndex,
                      );

                      if (travelerIndex === -1) return null;

                      return (
                        <div
                          key={`adult-${adultIndex}`}
                          className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                        >
                          <p className="mb-3 text-sm font-black text-slate-800">
                            {t("adult")} {adultIndex + 1}
                          </p>
                          {renderSavedTravelerPicker(travelerIndex)}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                            <div>
                              <Label htmlFor={`title-${travelerIndex}`}>
                                {t("titleField")}
                              </Label>
                              <Select
                                value={travelers[travelerIndex]?.title || "Mr"}
                                onValueChange={(value) =>
                                  updateTraveler(travelerIndex, "title", value)
                                }
                              >
                                <SelectTrigger id={`title-${travelerIndex}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TITLES.filter((title) => title !== "Child").map((title) => (
                                    <SelectItem
                                      key={title}
                                      value={title}
                                    >
                                      {t(`titles.${title}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="sm:col-span-3">
                              <Label htmlFor={`firstName-${travelerIndex}`}>
                                {t("firstName")}{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id={`firstName-${travelerIndex}`}
                                value={
                                  travelers[travelerIndex]?.firstName || ""
                                }
                                onChange={(e) =>
                                  updateTraveler(
                                    travelerIndex,
                                    "firstName",
                                    e.target.value,
                                  )
                                }
                                placeholder={t("firstName")}
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <Label htmlFor={`lastName-${travelerIndex}`}>
                              {t("lastName")} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`lastName-${travelerIndex}`}
                              value={travelers[travelerIndex]?.lastName || ""}
                              onChange={(e) =>
                                updateTraveler(
                                  travelerIndex,
                                  "lastName",
                                  e.target.value,
                                )
                              }
                              placeholder={t("lastName")}
                            />
                          </div>
                          {renderTravelerDocumentFields(travelerIndex)}
                        </div>
                      );
                    })}

                    {/* Children */}
                    {Array.from({
                      length: bookingData?.searchParams.guests.children || 0,
                    }).map((_, childIndex) => {
                      const travelerIndex = travelers.findIndex(
                        (t) =>
                          t.roomIndex === roomIndex &&
                          t.travelerType === "child" &&
                          t.index === childIndex,
                      );

                      if (travelerIndex === -1) return null;

                      return (
                        <div
                          key={`child-${childIndex}`}
                          className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                        >
                          <p className="mb-3 text-sm font-black text-slate-800">
                            {t("child")} {childIndex + 1}
                            {bookingData?.searchParams.guests.childrenAges[
                              childIndex
                            ] && (
                              <Badge variant="secondary" className="ml-2">
                                {t("age")}:{" "}
                                {
                                  bookingData.searchParams.guests.childrenAges[
                                    childIndex
                                  ]
                                }
                              </Badge>
                            )}
                          </p>
                          {renderSavedTravelerPicker(travelerIndex)}
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div>
                              <Label
                                htmlFor={`child-firstName-${travelerIndex}`}
                              >
                                {t("firstName")}
                              </Label>
                              <Input
                                id={`child-firstName-${travelerIndex}`}
                                value={
                                  travelers[travelerIndex]?.firstName || ""
                                }
                                onChange={(e) =>
                                  updateTraveler(
                                    travelerIndex,
                                    "firstName",
                                    e.target.value,
                                  )
                                }
                                placeholder={t("firstName")}
                              />
                            </div>
                            <div>
                              <Label
                                htmlFor={`child-lastName-${travelerIndex}`}
                              >
                                {t("lastName")}
                              </Label>
                              <Input
                                id={`child-lastName-${travelerIndex}`}
                                value={travelers[travelerIndex]?.lastName || ""}
                                onChange={(e) =>
                                  updateTraveler(
                                    travelerIndex,
                                    "lastName",
                                    e.target.value,
                                  )
                                }
                                placeholder={t("lastName")}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`child-age-${travelerIndex}`}>
                                {t("age")} <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id={`child-age-${travelerIndex}`}
                                type="number"
                                min={0}
                                max={17}
                                value={
                                  travelers[travelerIndex]?.age !== undefined
                                    ? String(travelers[travelerIndex].age)
                                    : ""
                                }
                                onChange={(e) =>
                                  updateTraveler(
                                    travelerIndex,
                                    "age",
                                    e.target.value,
                                  )
                                }
                                placeholder={t("age")}
                              />
                            </div>
                          </div>
                          {renderTravelerDocumentFields(travelerIndex)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer details */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="font-black text-[#0F172A]">{t("customerDetails")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("customerDetailsHelp")}</p>
            </div>
            <CardContent className="p-6">
              <div className="space-y-6">
                <section>
                  <SectionTitle icon={UserGroupIcon}>
                    {t("leadTravelerSection")}
                  </SectionTitle>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                    {travelers.find((traveler) => traveler.travelerType === "adult")
                      ? t("leadTravelerHint")
                      : t("leadTravelerMissing")}
                  </div>
                </section>

                <section>
                  <SectionTitle icon={AiPhoneIcon}>
                    {t("contactSection")}
                  </SectionTitle>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_.7fr_1fr]">
                    <div>
                      <Label htmlFor="email">
                        {t("email")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) =>
                          setContactInfo((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder={t("emailPlaceholder")}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("emailHelp")}
                      </p>
                    </div>
                    <div>
                      <Label>
                        {t("phoneCountryCode")} <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={contactInfo.phoneCountryCode}
                        onValueChange={(value) =>
                          setContactInfo((prev) => ({
                            ...prev,
                            phoneCountryCode: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.phoneCode} · {country.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">
                        {t("phoneNumber")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={contactInfo.phoneNumber}
                        onChange={(e) =>
                          setContactInfo((prev) => ({
                            ...prev,
                            phoneNumber: e.target.value,
                          }))
                        }
                        placeholder={t("phoneNumberPlaceholder")}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <SectionTitle icon={Shield02Icon}>
                    {t("nationalityResidenceSection")}
                  </SectionTitle>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>
                        {t("nationality")} <span className="text-red-500">*</span>
                      </Label>
                      <CountrySelect
                        mode="nationality"
                        value={contactInfo.nationality}
                        onChange={(value) =>
                          setContactInfo((prev) => ({ ...prev, nationality: value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>
                        {t("countryOfResidence")} <span className="text-red-500">*</span>
                      </Label>
                      <CountrySelect
                        mode="country"
                        value={contactInfo.countryOfResidence}
                        onChange={(value) =>
                          setContactInfo((prev) => ({
                            ...prev,
                            countryOfResidence: value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <SectionTitle icon={PassportIcon}>
                    {t("documentSection")}
                  </SectionTitle>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>
                        {t("documentType")} <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={contactInfo.documentType}
                        onValueChange={(value) =>
                          setContactInfo((prev) => ({
                            ...prev,
                            documentType: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {t(`documentTypes.${type.value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="documentNumber">
                        {t("documentNumber")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="documentNumber"
                        value={contactInfo.documentNumber}
                        onChange={(e) =>
                          setContactInfo((prev) => ({
                            ...prev,
                            documentNumber: e.target.value,
                          }))
                        }
                        placeholder={t("documentNumber")}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <SectionTitle icon={NoteIcon}>
                    {t("specialRequestsSection")}
                  </SectionTitle>
                  <Label htmlFor="specialRequests">
                    {t("specialRequests")}
                  </Label>
                  <Textarea
                    id="specialRequests"
                    value={contactInfo.specialRequests}
                    onChange={(e) =>
                      setContactInfo((prev) => ({
                        ...prev,
                        specialRequests: e.target.value,
                      }))
                    }
                    placeholder={t("specialRequestsPlaceholder")}
                    rows={4}
                    className="resize-none rounded-xl border-slate-200"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("specialRequestsHelp")}
                  </p>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Booking Summary */}
        <div className="min-w-0">
          <Card className="sticky top-8 overflow-hidden border-slate-200 shadow-lg shadow-slate-950/5">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="text-lg font-black text-[#0F172A]">{t("bookingSummary")}</h3>
            </div>
            <CardContent className="p-6">

              <div className="mb-4">
                <h4 className="font-black leading-6 text-[#0F172A]">{bookingData?.hotel.HotelName}</h4>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {selectedOption?.RoomType || selectedOption?.roomName || t("roomDetails")}
                </p>
                {selectedOption?.BoardType && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedOption.BoardType}
                  </p>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t("checkIn")}</span>
                  <span className="text-end font-bold text-[#0F172A]">
                    {bookingData?.searchParams?.dates?.checkIn
                      ? new Date(
                          bookingData.searchParams.dates.checkIn,
                        ).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t("checkOut")}</span>
                  <span className="text-end font-bold text-[#0F172A]">
                    {bookingData?.searchParams?.dates?.checkOut
                      ? new Date(
                          bookingData.searchParams.dates.checkOut,
                        ).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t("duration")}</span>
                  <span className="text-end font-bold text-[#0F172A]">
                    {nights} {nights === 1 ? t("night") : t("nights")}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t("guests")}</span>
                  <span className="text-end font-bold text-[#0F172A]">
                    {bookingData?.searchParams?.guests?.adults ?? 0} {t("adult")}
                    {(bookingData?.searchParams?.guests?.children ?? 0) > 0 &&
                      `, ${bookingData!.searchParams.guests.children} ${t("child")}`}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="mb-2 flex items-center gap-2 font-black text-[#0F172A]">
                    <HugeiconsIcon icon={BedIcon} className="h-4 w-4 text-[#F97316]" />
                    {t("roomDetails")}
                  </p>
                  <div className="space-y-2 text-slate-600">
                    {Array.from({
                      length: bookingData?.searchParams.guests.rooms || 1,
                    }).map((_, roomIndex) => {
                      const roomChildAges = getRoomChildAges(roomIndex);

                      return (
                        <div key={roomIndex}>
                          <p className="font-medium text-slate-800">
                            {t("room")} {roomIndex + 1}
                          </p>
                          <p>
                            {t("adults")}: {bookingData?.searchParams.guests.adults || 0}
                            {", "}
                            {t("children")}: {bookingData?.searchParams.guests.children || 0}
                          </p>
                          {(bookingData?.searchParams.guests.children || 0) > 0 ? (
                            <p>
                              {t("childAges")}:{" "}
                              {roomChildAges.length
                                ? roomChildAges.map(formatAge).join(", ")
                                : "-"}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(
                      selectedOption?.Price || 0,
                      selectedOption?.Currency || "USD",
                    )}{" "}
                    x {nights} {nights === 1 ? t("night") : t("nights")}
                  </span>
                  <span className="font-bold text-[#0F172A]">
                    {formatCurrency(
                      (selectedOption?.Price || 0) * nights,
                      selectedOption?.Currency || "USD",
                    )}
                  </span>
                </div>
                {selectedOption &&
                  "Taxes" in selectedOption &&
                  selectedOption.Taxes !== undefined &&
                  selectedOption.Taxes > 0 && (
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {t("taxesFees")}
                      </span>
                      <span className="font-bold text-[#0F172A]">
                        {formatCurrency(
                          selectedOption.Taxes,
                          selectedOption.Currency ?? "USD",
                        )}
                      </span>
                    </div>
                  )}
                <Separator />
                <div className="flex justify-between gap-4 text-lg font-black text-[#0F172A]">
                  <span>{t("total")}</span>
                  <span className="text-[#F97316]">
                    {formatCurrency(
                      totalPrice,
                      selectedOption?.Currency ?? "USD",
                    )}
                  </span>
                </div>
              </div>

              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-muted-foreground">
                {t("feesNotice")}
              </p>

              <Button
                className="mt-6 w-full bg-[#F97316] font-black text-white shadow-lg shadow-orange-500/20 hover:bg-[#EA580C]"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="me-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t("processing")}
                  </>
                ) : (
                  t("completeBooking")
                )}
              </Button>

              <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
                {t("termsNotice")}
              </p>
            </CardContent>
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
              <div className="grid gap-3">
                <TrustItem icon={Shield02Icon} text={t("trust.protectedData")} />
                <TrustItem icon={CreditCardIcon} text={t("trust.securePayment")} />
                <TrustItem icon={CustomerServiceIcon} text={t("trust.supportAfterBooking")} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: typeof Shield02Icon;
  children: React.ReactNode;
}) {
  return (
    <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-[#0F172A]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#F97316]">
        <HugeiconsIcon icon={icon} className="h-4 w-4" />
      </span>
      {children}
    </h4>
  );
}

function TrustItem({
  icon,
  text,
}: {
  icon: typeof Shield02Icon;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#F97316]">
        <HugeiconsIcon icon={icon} className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </div>
  );
}
