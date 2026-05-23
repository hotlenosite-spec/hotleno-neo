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

type Title = "Mr" | "Mrs" | "Miss" | "Ms" | "Dr";

interface Traveler {
  roomIndex: number;
  travelerType: "adult" | "child";
  index: number;
  title?: Title;
  firstName: string;
  lastName: string;
}

interface BookingData {
  hotel: {
    HotelId: number;
    HotelName: string;
    HotelStars: number;
    CityName: string;
    CountryName: string;
    selectedOption: {
      OptionId: number;
      Price: number;
      Currency: string;
      Taxes?: number;
      RoomType?: string;
      BoardType?: string;
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
];

export default function CheckoutPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: "",
    specialRequests: "",
  });

  useEffect(() => {
    const data = localStorage.getItem("bookingData");
    if (!data) {
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
        });
      }

      // Add children
      for (let i = 0; i < searchParams.guests.children; i++) {
        travelersList.push({
          roomIndex,
          travelerType: "child",
          index: i,
          firstName: "",
          lastName: "",
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

    setLoading(false);
  }, [router, user]);

  const updateTraveler = (
    index: number,
    field: keyof Traveler,
    value: string,
  ) => {
    const updatedTravelers = [...travelers];
    updatedTravelers[index] = {
      ...updatedTravelers[index],
      [field]: value,
    };
    setTravelers(updatedTravelers);
  };

  const validateForm = (): boolean => {
    // Check all adults have required fields
    for (const traveler of travelers) {
      if (traveler.travelerType === "adult") {
        if (!traveler.firstName.trim() || !traveler.lastName.trim()) {
          setError("Please fill in all traveler names");
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

    return true;
  };

  const handleSubmit = async () => {
    setError(null);

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
          room.AdultNames.push({
            Title: traveler.title || "Mr",
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

      const bookingRequest = {
        RequestType: "HotelBooking",
        OptionId: bookingData.hotel.selectedOption.OptionId,
        YourReference: `HOTLENO-${Date.now()}`,
        Rooms: Array.from(roomsMap.values()),
      };

      // API call with 120 second timeout as per spec
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch("/api/travellanda", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Booking request failed");
      }

      const result = await response.json();

      // Check for API errors
      if (result.Error) {
        throw new Error(result.Error.Message);
      }

      // Save booking to database
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const leadGuest = travelers.find((t) => t.travelerType === "adult");
          const dbBooking = {
            bookingReference:
              result.BookingReference || bookingRequest.YourReference,
            travellandaReference: result.BookingReference,
            yourReference: bookingRequest.YourReference,
            hotelId: bookingData!.hotel.HotelId,
            hotelName: bookingData!.hotel.HotelName,
            location: `${bookingData!.hotel.CityName}, ${bookingData!.hotel.CountryName}`,
            checkInDate: bookingData!.searchParams.dates.checkIn,
            checkOutDate: bookingData!.searchParams.dates.checkOut,
            rooms: Array.from(roomsMap.values()).map((room) => ({
              roomId: room.RoomId,
              roomName:
                bookingData!.hotel.selectedOption.Rooms.find(
                  (r: { RoomId: number; RoomName: string }) =>
                    r.RoomId === room.RoomId,
                )?.RoomName || "Room",
              adults: room.AdultNames.length,
              children: room.ChildNames?.length || 0,
            })),
            leadGuest: leadGuest
              ? `${leadGuest.title || "Mr"} ${leadGuest.firstName} ${leadGuest.lastName}`
              : "Guest",
            contactEmail: contactInfo.email,
            contactPhone: contactInfo.phone,
            totalPrice:
              result.TotalPrice ||
              bookingData!.hotel.selectedOption.Price * nights,
            currency:
              result.Currency || bookingData!.hotel.selectedOption.Currency,
            status: result.BookingStatus?.toLowerCase() || "pending",
            specialRequests: contactInfo.specialRequests,
            cancellationPolicies: result.CancellationPolicies || [],
            alerts: result.Alerts || [],
            restrictions: result.Restrictions || [],
          };

          await fetch("/api/user/bookings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(dbBooking),
          });
        }
      } catch (dbError) {
        console.error("Failed to save booking to database:", dbError);
        // Don't throw - booking was successful with Travellanda
      }

      // Store booking confirmation
      localStorage.setItem(
        "bookingConfirmation",
        JSON.stringify({
          ...result,
          contactInfo,
          travelers,
          bookingRequest,
        }),
      );

      // Clear temporary data
      localStorage.removeItem("selectedOption");
      localStorage.removeItem("bookingData");

      // Redirect to confirmation page
      router.push(
        `/${locale}/booking/confirmation?reference=${result.BookingReference || bookingRequest.YourReference}`,
      );
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

  if (!isAuthenticated) {
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
                          <div className="grid grid-cols-2 gap-3">
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
                          </div>
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
