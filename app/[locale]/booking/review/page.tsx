"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
import {
  LeftTriangleIcon,
  CreditCardIcon,
  CustomerServiceIcon,
  Shield02Icon,
  Calendar03Icon,
  BedIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

export default function ReviewPage() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
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
  hotelbedsSelectedRooms?: Array<{
    roomIndex: number;
    adults: number;
    children: number;
    childAges?: number[];
    roomCode?: string;
    roomName?: string;
    boardCode?: string;
    boardName?: string;
    rateKey: string;
    price?: number;
    currency?: string;
    rateType?: string;
    rateClass?: string;
    allotment?: number;
    packaging?: boolean;
    net?: string | number;
    sellingRate?: string | number;
    sourceMarket?: string;
    rateComments?: unknown[];
    cancellationPolicies?: unknown[];
    taxes?: unknown;
  }>;
  hotelbedsPackage?: {
    packageId: string;
    packageName: string;
    displayRoomName: string;
    roomsCount: number;
    totalPrice: number;
    currency: string;
    hotelbedsEvidenceId?: string;
    boardName?: string;
    boardCode?: string;
    roomPriceBreakdown: Array<{
      roomIndex: number;
      roomName: string;
      roomCode?: string;
      price: number;
      currency?: string;
    }>;
    allRateKeyPrefixes: string[];
  };
  displayRoomName?: string;
  hotelbedsEvidenceId?: string;
  metadata?: Record<string, unknown>;
  roomsCount?: number;
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
  rspPrice?: number;
  roomPromotions?: unknown[];
  supplements?: unknown[];
  inclusions?: string[];
  cancellationPolicies?: unknown[];
  rateConditions?: unknown[];
  amenities?: string[];
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
      Description: t("booking.supplierPolicy"),
    },
    ImportantInformation: [t("booking.supplierPolicy")],
  };
}, [t]);

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
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
    const price = toNumber(record.Price || record.Amount || record.Value);
    const currency = typeof record.Currency === "string" ? record.Currency.trim() : "";
    const priceText = price > 0 ? `${currency ? `${currency} ` : ""}${price}` : "";
    const text = [label, priceText].filter(Boolean).join(" - ");

    return text ? [text] : [];
  });
}

function isValidGuestName(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 3 && trimmed.length <= 25 && /^[\p{L}\s]+$/u.test(trimmed);
}

function normalizeGuestTitle(value?: string): "Mr" | "Mrs" | "Ms" {
  return value === "Mrs" || value === "Ms" ? value : "Mr";
}

function calculateNights(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return 1;

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : 1;
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
  const supplier = String(selectedRoom.supplier || "").toLowerCase();
  const hotelbedsPackage =
    selectedRoom.hotelbedsPackage && typeof selectedRoom.hotelbedsPackage === "object"
      ? (selectedRoom.hotelbedsPackage as HotelData["hotelbedsPackage"])
      : undefined;
  const currency = String(
    hotelbedsPackage?.currency ||
      selectedRoom.Currency ||
      selectedRoom.currency ||
      searchData.currency ||
      "USD",
  );
  const packageCurrency = supplier === "hotelbeds" ? hotelbedsPackage?.currency || currency : currency;
  const hotelbedsSelectedRooms = Array.isArray(selectedRoom.hotelbedsSelectedRooms)
    ? selectedRoom.hotelbedsSelectedRooms
        .map((room) => {
          const record = room as Record<string, unknown>;
          return {
            roomIndex: toNumber(record.roomIndex),
            adults: toNumber(record.adults, 1),
            children: toNumber(record.children),
            childAges: Array.isArray(record.childAges)
              ? record.childAges.map((age) => toNumber(age)).filter(Number.isFinite)
              : [],
            roomCode: String(record.roomCode || ""),
            roomName: String(record.roomName || ""),
            boardCode: String(record.boardCode || ""),
            boardName: String(record.boardName || ""),
            rateKey: String(record.rateKey || ""),
            price: toNumber(record.price),
            currency: String(packageCurrency || record.currency || currency),
            rateType: String(record.rateType || ""),
            rateClass: String(record.rateClass || ""),
            allotment: Number.isFinite(Number(record.allotment))
              ? Number(record.allotment)
              : undefined,
            packaging:
              typeof record.packaging === "boolean" ? record.packaging : undefined,
            net:
              typeof record.net === "string" || typeof record.net === "number"
                ? record.net
                : undefined,
            sellingRate:
              typeof record.sellingRate === "string" || typeof record.sellingRate === "number"
                ? record.sellingRate
                : undefined,
            sourceMarket: String(record.sourceMarket || ""),
            rateComments: Array.isArray(record.rateComments) ? record.rateComments : [],
            cancellationPolicies: Array.isArray(record.cancellationPolicies)
              ? record.cancellationPolicies
              : [],
            taxes: record.taxes,
          };
        })
        .filter((room) => room.rateKey)
    : [];
  const hotelbedsRoomsTotal = hotelbedsSelectedRooms.reduce(
    (sum, room) => sum + toNumber(room.price),
    0,
  );
  const normalizedHotelbedsPackage = hotelbedsPackage
    ? {
        ...hotelbedsPackage,
        currency: packageCurrency,
        roomPriceBreakdown: (hotelbedsPackage.roomPriceBreakdown || []).map((room) => ({
          ...room,
          currency: packageCurrency,
        })),
      }
    : undefined;
  const isHotelbedsPackage =
    supplier === "hotelbeds" && (normalizedHotelbedsPackage || hotelbedsSelectedRooms.length > 1);
  const packageTotal = toNumber(normalizedHotelbedsPackage?.totalPrice) || hotelbedsRoomsTotal;
  const price = isHotelbedsPackage
    ? packageTotal || rawPrice || rawTotalPrice
    : rawPrice || (rawTotalPrice > 0 ? rawTotalPrice / nights - taxes : 0);
  const totalPrice = isHotelbedsPackage
    ? packageTotal || rawTotalPrice || rawPrice
    : rawTotalPrice || (price + taxes) * nights;
  return {
    ...(optionData as HotelData),
    ...(selectedRoom as Partial<HotelData>),
    HotelName: String(
      optionData.HotelName ||
        bookingData?.hotel?.HotelName ||
        selectedRoom.HotelName ||
        "",
    ),
    RoomType: String(
      normalizedHotelbedsPackage?.displayRoomName ||
        selectedRoom.displayRoomName ||
        selectedRoom.RoomType ||
        selectedRoom.roomName ||
        "",
    ),
    BoardType: String(selectedRoom.BoardType || selectedRoom.boardName || selectedRoom.mealType || ""),
    Currency: packageCurrency,
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
    supplierTotalFare: isHotelbedsPackage
      ? totalPrice
      : toNumber(selectedRoom.supplierTotalFare || rawTotalPrice || rawPrice),
    hotelbedsSelectedRooms,
    hotelbedsPackage: normalizedHotelbedsPackage,
    displayRoomName: String(
      normalizedHotelbedsPackage?.displayRoomName ||
        selectedRoom.displayRoomName ||
        selectedRoom.roomName ||
        selectedRoom.RoomName ||
        selectedRoom.RoomType ||
        "",
    ),
    roomsCount: toNumber(selectedRoom.roomsCount) || hotelbedsSelectedRooms.length || 1,
    roomName: String(
      normalizedHotelbedsPackage?.displayRoomName ||
        selectedRoom.roomName ||
        selectedRoom.RoomName ||
        selectedRoom.RoomType ||
        "",
    ),
    price,
    currency: packageCurrency,
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
    rspPrice: toNumber(selectedRoom.rspPrice) || undefined,
    roomPromotions: Array.isArray(selectedRoom.roomPromotions) ? selectedRoom.roomPromotions : [],
    supplements: Array.isArray(selectedRoom.supplements) ? selectedRoom.supplements : [],
    inclusions: asCleanTextArray(selectedRoom.inclusions),
    cancellationPolicies: Array.isArray(selectedRoom.cancellationPolicies)
      ? selectedRoom.cancellationPolicies
      : [],
    rateConditions: Array.isArray(selectedRoom.rateConditions) ? selectedRoom.rateConditions : [],
    amenities: asCleanTextArray(selectedRoom.amenities),
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
    roomDetails?: Array<{
      adults: number;
      children: number;
      childrenAges?: number[];
    }>;
  };
  currency?: string;
}

type Title = "Mr" | "Mrs" | "Ms" | "Child";

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

const TITLES: Title[] = ["Mr", "Mrs", "Ms"];

const DOCUMENT_TYPES = [
  "passport",
  "national_id",
] as const;

  const [searchParams, setSearchParams] = useState<SearchParamsData | null>(null);
  const [travelers, setTravelers] = useState<TravelerForm[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const getRoomOccupancies = useCallback((searchData?: SearchParamsData | null) => {
    const guests = searchData?.guests;
    const savedRooms =
      guests?.roomDetails
        ?.map((room) => {
          const children = Math.max(Number(room?.children || 0), 0);
          return {
            adults: Math.max(Number(room?.adults || 0), 1),
            children,
            childrenAges: (room?.childrenAges || [])
              .map((age) => Number(age))
              .filter((age) => Number.isFinite(age) && age >= 0)
              .slice(0, children),
          };
        })
        .filter((room) => room.adults > 0) || [];
    const roomCount = Math.max(guests?.rooms || savedRooms.length || 1, 1);

    if (savedRooms.length > 0) {
      return Array.from({ length: roomCount }, (_, index) => {
        const room = savedRooms[index];
        return {
          adults: room?.adults || 1,
          children: room?.children || 0,
          childrenAges: room?.childrenAges || [],
        };
      });
    }

    const adultTotal = Math.max(Number(guests?.adults || 1), 1);
    const childAges = (guests?.childrenAges || [])
      .map((age) => Number(age))
      .filter((age) => Number.isFinite(age) && age >= 0)
      .slice(0, Math.max(Number(guests?.children || 0), 0));
    const childTotal = Math.max(Number(guests?.children || childAges.length || 0), 0);
    const rooms = Array.from({ length: roomCount }, () => ({
      adults: 0,
      children: 0,
      childrenAges: [] as number[],
    }));

    for (let index = 0; index < adultTotal; index += 1) {
      rooms[index % roomCount].adults += 1;
    }

    for (let index = 0; index < childTotal; index += 1) {
      const room = rooms[index % roomCount];
      room.children += 1;
      const age = childAges[index];
      if (age !== undefined) {
        room.childrenAges.push(age);
      }
    }

    return rooms.map((room) => ({
      adults: Math.max(room.adults, 1),
      children: room.children,
      childrenAges: room.childrenAges.slice(0, room.children),
    }));
  }, []);

  const buildInitialTravelers = useCallback((searchData: SearchParamsData): TravelerForm[] => {
    const nextTravelers: TravelerForm[] = [];
    const roomOccupancies = getRoomOccupancies(searchData);

    roomOccupancies.forEach((room, roomIndex) => {
      for (let index = 0; index < room.adults; index += 1) {
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

      for (let index = 0; index < room.children; index += 1) {
        const childAge = Number(room.childrenAges[index]);
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
    });

    return nextTravelers;
  }, [getRoomOccupancies]);

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
          setError(t("booking.missingDataDescription"));
          setLoading(false);
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
      } catch (_err: unknown) {
        setError(t("booking.loadErrorDescription"));
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
    t,
  ]);

  const validateTravelers = () => {
    const seenNames = new Set<string>();
    for (const traveler of travelers) {
      if (!traveler.firstName.trim() || !traveler.lastName.trim()) {
        setError(t("checkout.errors.travelerNames"));
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
      if (!traveler.nationality.trim()) {
        setError(t("checkout.errors.travelerNationality"));
        return false;
      }
      if (!traveler.documentNumber.trim()) {
        setError(t("checkout.errors.travelerDocumentNumber"));
        return false;
      }
      if (traveler.travelerType === "adult") {
        if (!traveler.phone.trim() || !traveler.email.trim()) {
          setError(t("checkout.errors.adultContact"));
          return false;
        }
      }
      if (traveler.travelerType === "child" && traveler.age === undefined) {
        setError(t("checkout.errors.childAge"));
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
      setError(t("checkout.errors.signInRequired"));
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
        const selectedHotelbedsRoom = hotel.hotelbedsSelectedRooms?.find(
          (room) => room.roomIndex === roomIndex,
        );
        const childrenAges = roomTravelers
          .filter(
            (traveler) =>
              traveler.travelerType === "child" && traveler.age !== undefined,
          )
          .map((traveler) => Number(traveler.age));

        return {
          roomId: roomIndex + 1,
          roomName:
            selectedHotelbedsRoom?.roomName ||
            hotel.roomName ||
            hotel.RoomType ||
            `Room ${roomIndex + 1}`,
          roomCode: selectedHotelbedsRoom?.roomCode || "",
          boardCode: selectedHotelbedsRoom?.boardCode || "",
          boardName: selectedHotelbedsRoom?.boardName || hotel.boardName || hotel.BoardType || "",
          rateKey: selectedHotelbedsRoom?.rateKey || "",
          price: selectedHotelbedsRoom?.price || 0,
          adults: roomTravelers.filter((traveler) => traveler.travelerType === "adult").length,
          children: roomTravelers.filter((traveler) => traveler.travelerType === "child").length,
          childrenAges,
        };
      });
      const bookingTravelers = travelers.map((traveler) => ({
        roomIndex: traveler.roomIndex,
        travelerType: traveler.travelerType,
        index: traveler.index,
        title: traveler.travelerType === "child" ? "Child" : normalizeGuestTitle(traveler.title),
        firstName: traveler.firstName.trim(),
        lastName: traveler.lastName.trim(),
        age: traveler.age,
        nationality: traveler.nationality.trim(),
        documentType: traveler.documentType,
        documentNumber: traveler.documentNumber.trim(),
        phone: traveler.phone.trim(),
        email: traveler.email.trim(),
      }));
      const bookingSupplier = isHotelbedsTesterToken()
        ? "hotelbeds"
        : hotel.supplier || "none";
      const selectedRoom = {
        hotel: {
          ...hotel,
          supplier: bookingSupplier,
          selectedOption: hotel,
        },
        selectedRoom: {
          ...hotel,
          supplier: bookingSupplier,
        },
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
          supplier: bookingSupplier,
          supplierHotelId: hotel.supplierHotelId || hotel.HotelCode || "",
          supplierRateKey:
            hotel.supplierRateKey || hotel.rateKey || hotel.BookingCode || "",
          hotelbedsSelectedRooms: hotel.hotelbedsSelectedRooms || [],
          hotelbedsPackage: hotel.hotelbedsPackage || null,
          hotelbedsEvidenceId:
            hotel.hotelbedsEvidenceId ||
            hotel.metadata?.hotelbedsEvidenceId ||
            hotel.hotelbedsPackage?.hotelbedsEvidenceId ||
            "",
          supplierBookingReference: "",
          hotelId: hotel.hotelId || 0,
          hotelName: hotel.HotelName,
          location: "",
          checkInDate: searchParams.dates.checkIn,
          checkOutDate: searchParams.dates.checkOut,
          rooms,
          travelers: bookingTravelers,
          leadGuest: leadTraveler
            ? `${normalizeGuestTitle(leadTraveler.title)} ${leadTraveler.firstName} ${leadTraveler.lastName}`
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
            hotelbedsEvidenceId:
              hotel.hotelbedsEvidenceId ||
              hotel.metadata?.hotelbedsEvidenceId ||
              hotel.hotelbedsPackage?.hotelbedsEvidenceId ||
              "",
            hotelbedsSelectedRooms: hotel.hotelbedsSelectedRooms || [],
            hotelbedsPackage: hotel.hotelbedsPackage || null,
            roomPriceBreakdown,
            packageCurrency: hotel.supplier === "hotelbeds" ? hotel.hotelbedsPackage?.currency || hotel.Currency : undefined,
            roomBreakdownCurrencies: roomPriceBreakdown
              .map((room) => room.currency)
              .filter(Boolean),
            currencyMismatch:
              hotel.supplier === "hotelbeds" &&
              Boolean(hotel.hotelbedsPackage?.currency || hotel.Currency) &&
              roomPriceBreakdown.some(
                (room) => room.currency !== (hotel.hotelbedsPackage?.currency || hotel.Currency),
              ),
            currencyMismatchFixed: hotel.supplier === "hotelbeds",
            hotelbedsCurrencyDiagnostics:
              hotel.supplier === "hotelbeds"
                ? {
                    supplierCurrency: hotel.Currency,
                    packageCurrency: hotel.hotelbedsPackage?.currency,
                    roomBreakdownCurrencies: roomPriceBreakdown
                      .map((room) => room.currency)
                      .filter(Boolean),
                    selectedRoomCurrencies: (hotel.hotelbedsSelectedRooms || [])
                      .map((room) => room.currency)
                      .filter(Boolean),
                    normalizedCurrency: hotel.hotelbedsPackage?.currency || hotel.Currency,
                    currencyMismatch:
                      Boolean(hotel.hotelbedsPackage?.currency || hotel.Currency) &&
                      roomPriceBreakdown.some(
                        (room) => room.currency !== (hotel.hotelbedsPackage?.currency || hotel.Currency),
                      ),
                    mismatchSource: "review",
                    fixedDisplayCurrency: hotel.hotelbedsPackage?.currency || hotel.Currency,
                    currencyMismatchFixed: true,
                  }
                : undefined,
            expectedTotalPrice: isHotelbedsPackage ? packageTotal : totalPrice,
            actualReviewPrice: totalPrice,
            priceMismatch: isHotelbedsPackage
              ? Math.abs((packageTotal || 0) - totalPrice) > 0.01
              : false,
            summaryUsesFirstRoomOnly: isHotelbedsPackage
              ? roomPriceBreakdown.length > 1 && totalPrice <= roomPriceBreakdown[0]?.price
              : false,
            rspPrice: hotel.rspPrice || null,
            roomPromotions: hotel.roomPromotions || [],
            supplements: hotel.supplements || [],
            inclusions: hotel.inclusions || [],
            cancellationPolicies: hotel.cancellationPolicies || [],
            rateConditions: hotel.rateConditions || [],
            amenities: hotel.amenities || [],
          },
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to create booking");
      }

      const bookingStatus = result?.booking?.bookingStatus || "";
      if (bookingStatus === "supplier_booking_confirmed") {
        setNotice(t("checkout.notices.confirmed", { bookingId: bookingReference }));
      } else if (bookingStatus === "supplier_booking_failed") {
        const failureReason =
          typeof result?.booking?.failureReason === "string"
            ? result.booking.failureReason
            : "";
        const friendlyFailureReason = /insufficient allotment/i.test(failureReason)
          ? "الغرفة المختارة لم تعد متاحة بالعدد المطلوب. يرجى اختيار غرفة أخرى أو تقليل عدد الغرف."
          : failureReason;
        setNotice(
          bookingSupplier === "hotelbeds" && typeof result?.message === "string"
            ? `${result.message} رقم الطلب: ${bookingReference}${friendlyFailureReason ? ` السبب: ${friendlyFailureReason}` : ""}`
            : t("checkout.notices.failed", { bookingId: bookingReference }),
        );
      } else {
        setNotice(t("booking.requestCreated", { bookingId: bookingReference }));
      }
    } catch (_err) {
      setError(t("checkout.errors.bookingFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto overflow-x-clip px-4 py-8">
        <Skeleton className="mb-8 h-8 w-1/3" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
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
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="px-6 py-14 text-center">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
              <HugeiconsIcon icon={LeftTriangleIcon} className="h-7 w-7" />
            </span>
            <h1 className="text-xl font-black text-[#0F172A]">
              {t("booking.missingDataTitle")}
            </h1>
            <p className="mx-auto mb-6 mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              {error || t("booking.missingDataDescription")}
            </p>
            <Button
              onClick={() => router.push('/')}
              className="bg-[#F97316] font-black text-white hover:bg-[#EA580C]"
            >
              {t('hotels.newSearch')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nights =
    hotel?.nights ||
    searchParams?.guests.nights ||
    calculateNights(searchParams?.dates.checkIn, searchParams?.dates.checkOut);
  const isHotelbedsPackage = hotel?.supplier === "hotelbeds" && Boolean(hotel.hotelbedsSelectedRooms?.length);
  const hotelbedsRoomsTotal =
    hotel?.hotelbedsSelectedRooms?.reduce((sum, room) => sum + toNumber(room.price), 0) || 0;
  const packageTotal =
    toNumber(hotel?.hotelbedsPackage?.totalPrice) || hotelbedsRoomsTotal || hotel?.totalPrice || 0;
  const nightlyPrice = isHotelbedsPackage ? packageTotal : hotel?.Price || 0;
  const taxes = hotel?.Taxes || 0;
  const totalPrice = isHotelbedsPackage
    ? packageTotal
    : hotel?.totalPrice || (nightlyPrice + taxes) * nights;
  const hotelbedsPackageCurrency =
    hotel?.supplier === "hotelbeds" ? hotel?.hotelbedsPackage?.currency || hotel?.Currency : hotel?.Currency;
  const rawRoomPriceBreakdown =
    hotel?.hotelbedsPackage?.roomPriceBreakdown?.length
      ? hotel.hotelbedsPackage.roomPriceBreakdown
      : hotel?.hotelbedsSelectedRooms?.map((room) => ({
          roomIndex: room.roomIndex,
          roomName: room.roomName || `${t("booking.room")} ${room.roomIndex + 1}`,
          roomCode: room.roomCode,
          price: toNumber(room.price),
          currency: room.currency || hotel.Currency,
        })) || [];
  const roomPriceBreakdown = rawRoomPriceBreakdown.map((room) => ({
    ...room,
    currency:
      hotel?.supplier === "hotelbeds"
        ? hotelbedsPackageCurrency || room.currency || hotel?.Currency
        : room.currency || hotel?.Currency,
  }));
  const roomOccupancies = getRoomOccupancies(searchParams);
  const guestRooms = roomOccupancies.length;
  const totalAdults = roomOccupancies.reduce((sum, room) => sum + room.adults, 0);
  const totalChildren = roomOccupancies.reduce((sum, room) => sum + room.children, 0);
  const areTravelersComplete =
    travelers.length > 0 &&
    travelers.every((traveler) => {
      const hasBaseDetails =
        traveler.firstName.trim() &&
        traveler.lastName.trim() &&
        traveler.nationality.trim() &&
        traveler.documentNumber.trim();
      if (!hasBaseDetails) return false;
      if (traveler.travelerType === "child") return traveler.age !== undefined;
      return Boolean(traveler.phone.trim() && traveler.email.trim());
    });
  const canConfirmBooking = acceptedTerms && areTravelersComplete && !submitting;
  const formatChildAges = (ages: number[]) =>
    ages.length > 0
      ? ages.map((age) => t("booking.ageValue", { age })).join(", ")
      : "-";

  return (
    <div className="container mx-auto overflow-x-clip px-4 py-8">
      <div className="mb-6">
        <BookingBreadcrumb currentStep="review" hotelName={hotel?.HotelName} />
      </div>
      <h1 className="mb-2 text-3xl font-black text-[#0F172A]">{t('booking.reviewPolicies')}</h1>
      <p className="mb-8 text-sm font-medium text-muted-foreground">
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

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Booking Details */}
        <div className="space-y-6">
          {/* Hotel Summary */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="font-black text-[#0F172A]">{t("booking.hotelSummary")}</h2>
            </div>
            <CardContent className="p-6">
              <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <h3 className="text-xl font-black text-[#0F172A]">{hotel?.HotelName}</h3>
                  <p className="mt-1 font-bold text-slate-700">
                    {hotel?.displayRoomName || hotel?.RoomType || hotel?.roomName || t("hotels.standardRoom")}
                  </p>
                  {hotel?.BoardType && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {hotel.BoardType}
                    </p>
                  )}
                </div>
                <div className="shrink-0 rounded-xl bg-orange-50 px-4 py-3 text-end">
                  <p className="text-2xl font-black text-[#F97316]">
                    {hotel?.Currency} {totalPrice}
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    {isHotelbedsPackage ? t("booking.total") : t('hotels.perNight')}
                  </p>
                </div>
              </div>

              {roomPriceBreakdown.length > 0 ? (
                <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-3 font-black text-[#0F172A]">
                    {t("booking.roomDetails") === "booking.roomDetails"
                      ? locale === "ar"
                        ? "تفاصيل الغرف"
                        : "Room details"
                      : t("booking.roomDetails")}
                  </p>
                  <div className="space-y-2 text-sm">
                    {roomPriceBreakdown.map((room) => (
                      <div
                        key={`${room.roomIndex}-${room.roomCode || room.roomName}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"
                      >
                        <span className="font-bold text-slate-700">
                          {t("booking.room")} {room.roomIndex + 1}: {room.roomName}
                        </span>
                        <span className="font-black text-[#F97316]">
                          {room.currency || hotel?.Currency} {room.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <Separator className="my-4" />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 font-black text-[#0F172A]">
                    <HugeiconsIcon icon={Calendar03Icon} className="h-4 w-4 text-[#F97316]" />
                    {t('booking.checkIn')}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {searchParams?.dates.checkIn && new Date(searchParams.dates.checkIn).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 font-black text-[#0F172A]">
                    <HugeiconsIcon icon={Calendar03Icon} className="h-4 w-4 text-[#F97316]" />
                    {t('booking.checkOut')}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {searchParams?.dates.checkOut && new Date(searchParams.dates.checkOut).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/60 p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="font-black text-[#0F172A]">{t("booking.roomPrice")}</p>
                    <p className="mt-1 font-bold text-slate-700">
                      {hotel?.Currency} {isHotelbedsPackage ? totalPrice : nightlyPrice * nights}
                    </p>
                  </div>
                  <div>
                    <p className="font-black text-[#0F172A]">{t("hotelDetails.taxesFees")}</p>
                    <p className="mt-1 font-bold text-slate-700">
                      {hotel?.Currency} {taxes}
                    </p>
                  </div>
                  <div>
                    <p className="font-black text-[#0F172A]">{t("booking.total")}</p>
                    <p className="mt-1 text-xl font-black text-[#F97316]">
                      {hotel?.Currency} {totalPrice}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  {t("booking.taxNotice")}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 font-black text-[#0F172A]">
                    <HugeiconsIcon icon={UserGroupIcon} className="h-4 w-4 text-[#F97316]" />
                    {t('hotelDetails.guests')}
                  </p>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#F97316]">
                    {nights} {nights === 1 ? t("hotels.night") : t("hotels.nights")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {totalAdults} {t('hotelDetails.adults')}
                  {totalChildren > 0 &&
                    `, ${totalChildren} ${t('search.children')}`
                  }
                  {guestRooms > 1 &&
                    `, ${guestRooms} ${t('search.rooms')}`
                  }
                </p>
                <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
                  {roomOccupancies.map((room, roomIndex) => {
                    return (
                      <div key={roomIndex} className="text-slate-700">
                        <p className="flex items-center gap-2 font-bold">
                          <HugeiconsIcon icon={BedIcon} className="h-4 w-4 text-[#F97316]" />
                          {t("booking.room")} {roomIndex + 1}
                        </p>
                        <p>
                          {t("hotelDetails.adults")}: {room.adults}
                          {", "}
                          {t("hotelDetails.children")}: {room.children}
                        </p>
                        {room.children > 0 ? (
                          <p>{t("booking.childAges")}: {formatChildAges(room.childrenAges)}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="mb-2 text-xl font-black text-[#0F172A]">{t("booking.travelersInformation")}</h3>
              <p className="mb-5 text-sm text-muted-foreground">
                {t("booking.travelersDescription")}
              </p>
              <p className="mb-5 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-slate-700">
                <span className="text-red-500">*</span> {t("booking.requiredFieldsNotice")}
              </p>
              <div className="space-y-6">
                {Array.from({ length: guestRooms }).map((_, roomIndex) => (
                  <div
                    key={roomIndex}
                    className="border-b pb-6 last:border-0 last:pb-0"
                  >
                    <h4 className="mb-4 flex items-center gap-2 font-black text-[#0F172A]">
                      <HugeiconsIcon icon={BedIcon} className="h-4 w-4 text-[#F97316]" />
                      {t("booking.room")} {roomIndex + 1}
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
                            className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm"
                          >
                            <p className="mb-4 rounded-lg bg-orange-50 px-3 py-2 font-black text-[#0F172A]">
                              {traveler.travelerType === "adult"
                                ? `${t("booking.adult")} ${traveler.index + 1}`
                                : `${t("booking.child")} ${traveler.index + 1} - ${t("booking.age")} ${traveler.age ?? "-"}`}
                            </p>

                            <div className="grid gap-3 md:grid-cols-2">
                              {traveler.travelerType === "adult" ? (
                                <div>
                                  <Label className="font-bold text-[#0F172A]">
                                    {t("booking.title")} <span className="text-red-500">*</span>
                                  </Label>
                                  <Select
                                    value={traveler.title || "Mr"}
                                    onValueChange={(value) =>
                                      updateTraveler(travelerIndex, "title", value)
                                    }
                                  >
                                    <SelectTrigger className="mt-1 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TITLES.map((title) => (
                                        <SelectItem key={title} value={title}>
                                          {t(`booking.titles.${title}`)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : null}

                              <div>
                                <Label className="font-bold text-[#0F172A]">
                                  {t("booking.firstName")} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  className="mt-1 bg-white"
                                  value={traveler.firstName}
                                  onChange={(event) =>
                                    updateTraveler(
                                      travelerIndex,
                                      "firstName",
                                      event.target.value,
                                    )
                                  }
                                  placeholder={t("booking.firstName")}
                                />
                              </div>

                              <div>
                                <Label className="font-bold text-[#0F172A]">
                                  {t("booking.lastName")} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  className="mt-1 bg-white"
                                  value={traveler.lastName}
                                  onChange={(event) =>
                                    updateTraveler(
                                      travelerIndex,
                                      "lastName",
                                      event.target.value,
                                    )
                                  }
                                  placeholder={t("booking.lastName")}
                                />
                              </div>

                              {traveler.travelerType === "child" ? (
                                <div>
                                  <Label className="font-bold text-[#0F172A]">
                                    {t("booking.age")} <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    className="mt-1 bg-white"
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
                                    placeholder={t("booking.age")}
                                  />
                                </div>
                              ) : null}

                              <div>
                                <Label className="font-bold text-[#0F172A]">
                                  {t("booking.nationality")} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  className="mt-1 bg-white"
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
                                <Label className="font-bold text-[#0F172A]">
                                  {t("booking.documentType")} <span className="text-red-500">*</span>
                                </Label>
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
                                  <SelectTrigger className="mt-1 bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DOCUMENT_TYPES.map((type) => (
                                      <SelectItem key={type} value={type}>
                                        {t(`booking.documentTypes.${type}`)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="font-bold text-[#0F172A]">
                                  {t("booking.documentNumber")} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  className="mt-1 bg-white"
                                  value={traveler.documentNumber}
                                  onChange={(event) =>
                                    updateTraveler(
                                      travelerIndex,
                                      "documentNumber",
                                      event.target.value,
                                    )
                                  }
                                  placeholder={t("booking.documentNumber")}
                                />
                              </div>

                              {traveler.travelerType === "adult" ? (
                                <>
                                  <div>
                                    <Label className="font-bold text-[#0F172A]">
                                      {t("booking.phone")} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      className="mt-1 bg-white"
                                      value={traveler.phone}
                                      onChange={(event) =>
                                        updateTraveler(
                                          travelerIndex,
                                          "phone",
                                          event.target.value,
                                        )
                                      }
                                      placeholder={t("booking.phonePlaceholder")}
                                    />
                                  </div>
                                  <div>
                                    <Label className="font-bold text-[#0F172A]">
                                      {t("booking.email")} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      className="mt-1 bg-white"
                                      type="email"
                                      value={traveler.email}
                                      onChange={(event) =>
                                        updateTraveler(
                                          travelerIndex,
                                          "email",
                                          event.target.value,
                                        )
                                      }
                                      placeholder={t("booking.emailPlaceholder")}
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

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="terms" className="font-black text-[#0F172A]">
                    {t("booking.termsAcceptance")} <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-sm leading-6 text-slate-600">
                    {t("booking.termsDescription")}
                  </p>
                </div>
              </div>

              {!areTravelersComplete ? (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                  {t("booking.completeTravelersBeforeConfirm")}
                </p>
              ) : null}

              <Button
                className="mt-5 w-full bg-[#F97316] font-black text-white shadow-lg shadow-orange-500/20 hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-60"
                size="lg"
                onClick={handleContinue}
                disabled={!canConfirmBooking}
              >
                {submitting ? t("booking.processing") : t("booking.confirmBooking")}
              </Button>

              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
                <TrustItem icon={CreditCardIcon} text={t("booking.trust.securePayment")} />
                <TrustItem icon={Shield02Icon} text={t("booking.trust.protectedData")} />
                <TrustItem icon={CustomerServiceIcon} text={t("booking.trust.customerSupport")} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
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
