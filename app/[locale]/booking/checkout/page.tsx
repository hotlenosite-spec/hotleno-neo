"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
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
import { useAuth } from "@/components/providers/auth-provider";
import { AuthDialog } from "@/components/features/auth/auth-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  ArrowLeftIcon,
} from "@hugeicons/core-free-icons";
import { formatCurrency } from "@/hooks/use-hotels-enhanced";
import type { BookingRoom } from "@/types/travellanda";
import {
  isDevPreviewAllPagesEnabled,
  warnDevPreviewAllPagesEnabled,
} from "@/lib/security/dev-flags";

type Title = "Mr" | "Mrs" | "Miss" | "Ms" | "Dr" | "Child";

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
  documentType?: "passport" | "national_id" | "iqama";
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
  documentType?: "passport" | "national_id" | "iqama";
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

const TITLES: { value: Title; label: string }[] = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Miss", label: "Miss" },
  { value: "Ms", label: "Ms" },
  { value: "Dr", label: "Dr" },
  { value: "Child", label: "Child" },
];

const DOCUMENT_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "national_id", label: "National ID" },
  { value: "iqama", label: "Iqama" },
] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const locale = useLocale();
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
    phone: "",
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
          nationality: "",
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
          nationality: "",
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
      title: saved.title || updatedTravelers[index].title,
      firstName: saved.firstName || "",
      lastName: saved.lastName || "",
      gender: saved.gender || "",
      dateOfBirth: saved.dateOfBirth || saved.birthDate || "",
      nationality: saved.nationality || "",
      documentType: saved.documentType || "passport",
      documentNumber: saved.documentNumber || saved.passportNumber || saved.nationalId || "",
      passportExpiryDate: saved.passportExpiryDate || "",
      phone: saved.phone || "",
      email: saved.email || "",
    };
    setTravelers(updatedTravelers);
  };

  const validateForm = (): boolean => {
    for (const traveler of travelers) {
      if (!traveler.firstName.trim() || !traveler.lastName.trim()) {
        setError("Please fill in all traveler names");
        return false;
      }

      if (!traveler.nationality?.trim()) {
        setError("Please provide nationality for every traveler");
        return false;
      }

      if (!traveler.documentNumber?.trim()) {
        setError("Please provide document number for every traveler");
        return false;
      }

      if (
        traveler.travelerType === "child" &&
        traveler.age === undefined &&
        !traveler.dateOfBirth
      ) {
        setError("Please provide each child age or date of birth");
        return false;
      }

      if (traveler.travelerType === "adult") {
        const travelerEmail = traveler.email?.trim() || contactInfo.email.trim();
        const travelerPhone = traveler.phone?.trim() || contactInfo.phone.trim();

        if (!travelerEmail || !travelerPhone) {
          setError("Please provide phone and email for adult travelers");
          return false;
        }
      }
    }

    // Check contact info
    if (!contactInfo.email.trim()) {
      setError("Please provide an email address");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactInfo.email)) {
      setError("Please provide a valid email address");
      return false;
    }

    if (!contactInfo.phone.trim()) {
      setError("Please provide a phone number");
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
        setError("Booking data is missing");
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
          const adultTitle = traveler.title === "Child" ? "Mr" : traveler.title || "Mr";
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
        throw new Error("Please sign in to complete your booking");
      }

      const leadGuest = travelers.find((t) => t.travelerType === "adult");
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
              phone: traveler.phone,
              email: traveler.email,
            }),
          }).catch(() => null),
        ),
      );
      const bookingTravelers = travelers.map((traveler) => ({
        savedTravelerId: traveler.savedTravelerId || "",
        roomIndex: traveler.roomIndex,
        travelerType: traveler.travelerType,
        index: traveler.index,
        title: traveler.title || (traveler.travelerType === "child" ? "Child" : "Mr"),
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
          (traveler.travelerType === "adult" ? contactInfo.phone : ""),
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
          ? `${leadGuest.title || "Mr"} ${leadGuest.firstName} ${leadGuest.lastName}`
          : "Guest",
        contactEmail: contactInfo.email,
        contactPhone: contactInfo.phone,
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
        throw new Error(data?.error || "Failed to create booking");
      }

      const bookingResult = await bookingResponse.json();
      const bookingId = bookingResult.booking?._id;

      if (!bookingId) {
        throw new Error("Booking was created without a booking ID");
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
          setNotice(`Booking created with ID ${bookingId}. Your booking is confirmed.`);
        } else if (bookingStatus === "supplier_booking_failed") {
          setNotice(
            `Booking created with ID ${bookingId}. We could not confirm it automatically and will contact you.`,
          );
        } else {
          setNotice(
            `Booking created with ID ${bookingId}. Payment checkout is not enabled yet.`,
          );
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
        throw new Error(data?.error || "Failed to start payment");
      }

      const checkout = await checkoutResponse.json();
      if (!checkout.url) {
        throw new Error("Payment session did not return a checkout URL");
      }

      window.location.href = checkout.url;
    } catch (error) {
      console.error("Booking error:", error);
      if (error instanceof Error && error.name === "AbortError") {
        setError(
          "Booking request timed out. Please try again or contact support.",
        );
      } else if (error instanceof Error) {
        setError(error.message || "Booking failed. Please try again.");
      } else {
        setError("Booking failed. Please try again.");
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
  const formatAge = (age: number) => `${age} year${age === 1 ? "" : "s"}`;
  const getRoomChildAges = (roomIndex: number) => {
    const childrenPerRoom = bookingData?.searchParams.guests.children || 0;
    return (bookingData?.searchParams.guests.childrenAges || [])
      .slice(roomIndex * childrenPerRoom, (roomIndex + 1) * childrenPerRoom)
      .filter((age) => Number.isFinite(Number(age)));
  };

  const renderTravelerDocumentFields = (travelerIndex: number) => (
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div>
        <Label htmlFor={`gender-${travelerIndex}`}>Gender</Label>
        <Input
          id={`gender-${travelerIndex}`}
          value={travelers[travelerIndex]?.gender || ""}
          onChange={(e) => updateTraveler(travelerIndex, "gender", e.target.value)}
          placeholder="Gender"
        />
      </div>
      <div>
        <Label htmlFor={`dob-${travelerIndex}`}>Date of birth</Label>
        <Input
          id={`dob-${travelerIndex}`}
          type="date"
          value={travelers[travelerIndex]?.dateOfBirth || ""}
          onChange={(e) => updateTraveler(travelerIndex, "dateOfBirth", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`nationality-${travelerIndex}`}>
          Nationality <span className="text-red-500">*</span>
        </Label>
        <Input
          id={`nationality-${travelerIndex}`}
          value={travelers[travelerIndex]?.nationality || ""}
          onChange={(e) => updateTraveler(travelerIndex, "nationality", e.target.value)}
          placeholder="Nationality"
        />
      </div>
      <div>
        <Label htmlFor={`documentType-${travelerIndex}`}>Document type</Label>
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
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor={`documentNumber-${travelerIndex}`}>
          Document number <span className="text-red-500">*</span>
        </Label>
        <Input
          id={`documentNumber-${travelerIndex}`}
          value={travelers[travelerIndex]?.documentNumber || ""}
          onChange={(e) => updateTraveler(travelerIndex, "documentNumber", e.target.value)}
          placeholder="Document number"
        />
      </div>
      {(travelers[travelerIndex]?.documentType || "passport") === "passport" && (
        <div>
          <Label htmlFor={`passportExpiryDate-${travelerIndex}`}>Passport expiry date</Label>
          <Input
            id={`passportExpiryDate-${travelerIndex}`}
            type="date"
            value={travelers[travelerIndex]?.passportExpiryDate || ""}
            onChange={(e) => updateTraveler(travelerIndex, "passportExpiryDate", e.target.value)}
          />
        </div>
      )}
      <div>
        <Label htmlFor={`travelerPhone-${travelerIndex}`}>Phone</Label>
        <Input
          id={`travelerPhone-${travelerIndex}`}
          type="tel"
          value={travelers[travelerIndex]?.phone || ""}
          onChange={(e) => updateTraveler(travelerIndex, "phone", e.target.value)}
          placeholder="+966..."
        />
      </div>
      <div>
        <Label htmlFor={`travelerEmail-${travelerIndex}`}>Email</Label>
        <Input
          id={`travelerEmail-${travelerIndex}`}
          type="email"
          value={travelers[travelerIndex]?.email || ""}
          onChange={(e) => updateTraveler(travelerIndex, "email", e.target.value)}
          placeholder="traveler@email.com"
        />
      </div>
    </div>
  );

  const renderSavedTravelerPicker = (travelerIndex: number) => (
    <div className="mb-3">
      <Label>Saved traveler</Label>
      {savedTravelers.length ? (
        <Select
          value={travelers[travelerIndex]?.savedTravelerId || ""}
          onValueChange={(value) => applySavedTraveler(travelerIndex, value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose saved traveler" />
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
          No saved travelers yet. Add quick traveler details below or manage saved travelers from your account.
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6 -ml-2"
        onClick={() => router.back()}
      >
        <HugeiconsIcon icon={ArrowLeftIcon} className="mr-2 h-4 w-4" />
        Back to Review
      </Button>

      <h1 className="text-3xl font-bold mb-2">Complete Your Booking</h1>
      <p className="text-muted-foreground mb-8">
        Enter traveler details to finalize your reservation
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Traveler Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Traveler Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="h-5 w-5 text-green-500"
                />
                <h3 className="text-xl font-bold">Traveler Information</h3>
              </div>

              <div className="space-y-6">
                {Array.from({
                  length: bookingData?.searchParams.guests.rooms || 1,
                }).map((_, roomIndex) => (
                  <div
                    key={roomIndex}
                    className="border-b last:border-0 pb-6 last:pb-0"
                  >
                    <h4 className="font-semibold mb-4 text-muted-foreground">
                      Room {roomIndex + 1}
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
                        <div key={`adult-${adultIndex}`} className="mb-6">
                          <p className="font-medium mb-3 text-sm">
                            Adult {adultIndex + 1}
                          </p>
                          {renderSavedTravelerPicker(travelerIndex)}
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <Label htmlFor={`title-${travelerIndex}`}>
                                Title
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
                                  {TITLES.map((title) => (
                                    <SelectItem
                                      key={title.value}
                                      value={title.value}
                                    >
                                      {title.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-3">
                              <Label htmlFor={`firstName-${travelerIndex}`}>
                                First Name{" "}
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
                                placeholder="First name"
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <Label htmlFor={`lastName-${travelerIndex}`}>
                              Last Name <span className="text-red-500">*</span>
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
                              placeholder="Last name"
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
                        <div key={`child-${childIndex}`} className="mb-6">
                          <p className="font-medium mb-3 text-sm">
                            Child {childIndex + 1}
                            {bookingData?.searchParams.guests.childrenAges[
                              childIndex
                            ] && (
                              <Badge variant="secondary" className="ml-2">
                                Age:{" "}
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
                                First Name
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
                                placeholder="First name"
                              />
                            </div>
                            <div>
                              <Label
                                htmlFor={`child-lastName-${travelerIndex}`}
                              >
                                Last Name
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
                                placeholder="Last name"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`child-age-${travelerIndex}`}>
                                Age <span className="text-red-500">*</span>
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
                                placeholder="Age"
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

          {/* Contact Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Contact Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
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
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Booking confirmation will be sent here
                  </p>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={contactInfo.phone}
                    onChange={(e) =>
                      setContactInfo((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="specialRequests">
                  Special Requests (Optional)
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
                  placeholder="Any special requests or requirements... (e.g., early check-in, specific room location)"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Special requests are subject to availability and cannot be
                  guaranteed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Booking Summary */}
        <div>
          <Card className="sticky top-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Booking Summary</h3>

              <div className="mb-4">
                <h4 className="font-bold">{bookingData?.hotel.HotelName}</h4>
                <p className="text-muted-foreground text-sm">
                  {selectedOption?.RoomType}
                </p>
                <p className="text-muted-foreground text-sm">
                  {selectedOption?.BoardType}
                </p>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-in</span>
                  <span>
                    {bookingData?.searchParams?.dates?.checkIn
                      ? new Date(
                          bookingData.searchParams.dates.checkIn,
                        ).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-out</span>
                  <span>
                    {bookingData?.searchParams?.dates?.checkOut
                      ? new Date(
                          bookingData.searchParams.dates.checkOut,
                        ).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>
                    {nights} night{nights !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guests</span>
                  <span>
                    {bookingData?.searchParams?.guests?.adults ?? 0} Adult
                    {(bookingData?.searchParams?.guests?.adults ?? 0) !== 1
                      ? "s"
                      : ""}
                    {(bookingData?.searchParams?.guests?.children ?? 0) > 0 &&
                      `, ${bookingData!.searchParams.guests.children} Child`}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="mb-2 font-semibold text-slate-700">Room details</p>
                  <div className="space-y-2 text-slate-600">
                    {Array.from({
                      length: bookingData?.searchParams.guests.rooms || 1,
                    }).map((_, roomIndex) => {
                      const roomChildAges = getRoomChildAges(roomIndex);

                      return (
                        <div key={roomIndex}>
                          <p className="font-medium text-slate-800">
                            Room {roomIndex + 1}
                          </p>
                          <p>
                            Adults: {bookingData?.searchParams.guests.adults || 0}
                            {", "}
                            Children: {bookingData?.searchParams.guests.children || 0}
                          </p>
                          {(bookingData?.searchParams.guests.children || 0) > 0 ? (
                            <p>
                              Child ages:{" "}
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(
                      selectedOption?.Price || 0,
                      selectedOption?.Currency || "USD",
                    )}{" "}
                    x {nights} nights
                  </span>
                  <span>
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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Taxes & fees
                      </span>
                      <span>
                        {formatCurrency(
                          selectedOption.Taxes,
                          selectedOption.Currency ?? "USD",
                        )}
                      </span>
                    </div>
                  )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>
                    {formatCurrency(
                      totalPrice,
                      selectedOption?.Currency ?? "USD",
                    )}
                  </span>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  "Complete Booking"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By completing this booking, you agree to our Terms of Service
                and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
