export type SupplierProviderName = "mock" | "hotelbeds" | "tbo" | "travellanda";

export interface SupplierGuestOccupancy {
  adults: number;
  children?: number;
  childrenAges?: number[];
}

export interface SupplierSearchHotelsRequest {
  destinationCode?: string;
  cityName?: string;
  countryCode?: string;
  checkIn: string;
  checkOut: string;
  rooms: SupplierGuestOccupancy[];
  nationality?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface SupplierHotelRate {
  rateKey: string;
  roomName: string;
  boardName?: string;
  price: number;
  currency: string;
  refundable: boolean;
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
  cancellationPolicies?: unknown[];
  rspPrice?: number;
  roomPromotions?: unknown[];
  supplements?: unknown[];
  inclusions?: string[];
  rateConditions?: unknown[];
  amenities?: string[];
  metadata?: Record<string, unknown>;
}

export interface SupplierHotelResult {
  supplier: SupplierProviderName;
  supplierHotelId: string;
  hotelName: string;
  cityName?: string;
  countryName?: string;
  address?: string;
  description?: string;
  images?: Array<{
    url: string;
    description?: string;
  }>;
  facilities?: string[];
  latitude?: number;
  longitude?: number;
  stars?: number;
  rates: SupplierHotelRate[];
  metadata?: Record<string, unknown>;
}

export interface SupplierSearchHotelsResponse {
  supplier: SupplierProviderName;
  hotels: SupplierHotelResult[];
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
}

export interface SupplierPreBookRequest {
  supplierHotelId: string;
  supplierRateKey: string;
  checkIn: string;
  checkOut: string;
  rooms: SupplierGuestOccupancy[];
  currency?: string;
  metadata?: Record<string, unknown>;
}

export type SupplierCheckAvailabilityRequest = SupplierPreBookRequest;

export interface SupplierPreBookResponse {
  supplier: SupplierProviderName;
  supplierHotelId: string;
  supplierRateKey: string;
  price: number;
  currency: string;
  available: boolean;
  cancellationPolicies?: unknown[];
  rspPrice?: number;
  roomPromotions?: unknown[];
  supplements?: unknown[];
  inclusions?: string[];
  rateConditions?: unknown[];
  amenities?: string[];
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
}

export type SupplierCheckAvailabilityResponse = SupplierPreBookResponse;

export interface SupplierBookRequest {
  idempotencyKey: string;
  supplierHotelId: string;
  supplierRateKey: string;
  leadGuest: {
    firstName: string;
    lastName: string;
    title?: string;
    email?: string;
    phone?: string;
  };
  guests?: Array<{
    title?: string;
    firstName: string;
    lastName: string;
    type: "adult" | "child";
    age?: number;
  }>;
  metadata?: Record<string, unknown>;
}

export type SupplierBookingStatus =
  | "pending"
  | "confirmed"
  | "failed"
  | "cancelled";

export interface SupplierBookResponse {
  supplier: SupplierProviderName;
  supplierBookingReference: string;
  status: SupplierBookingStatus;
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
}

export interface SupplierBookingDetailsRequest {
  supplierBookingReference: string;
  metadata?: Record<string, unknown>;
}

export interface SupplierBookingDetailsResponse {
  supplier: SupplierProviderName;
  supplierBookingReference: string;
  status: SupplierBookingStatus;
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
}

export interface SupplierCancelBookingRequest {
  supplierBookingReference: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface SupplierCancelBookingResponse {
  supplier: SupplierProviderName;
  supplierBookingReference: string;
  status: "cancelled" | "pending" | "failed";
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
}

export interface SupplierProvider {
  readonly name: SupplierProviderName;
  searchHotels(
    request: SupplierSearchHotelsRequest,
  ): Promise<SupplierSearchHotelsResponse>;
  preBook(request: SupplierPreBookRequest): Promise<SupplierPreBookResponse>;
  checkAvailability?(
    request: SupplierCheckAvailabilityRequest,
  ): Promise<SupplierCheckAvailabilityResponse>;
  checkRates?(request: SupplierPreBookRequest): Promise<SupplierPreBookResponse>;
  book(request: SupplierBookRequest): Promise<SupplierBookResponse>;
  getBookingDetails(
    request: SupplierBookingDetailsRequest,
  ): Promise<SupplierBookingDetailsResponse>;
  cancelBooking?(
    request: SupplierCancelBookingRequest,
  ): Promise<SupplierCancelBookingResponse>;
}
