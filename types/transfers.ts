export type TransferLocationType =
  | "airport"
  | "hotel"
  | "station"
  | "port"
  | "other";

export type TransferLocationCodeType =
  | "IATA"
  | "ATLAS"
  | "GPS"
  | "PORT"
  | "STATION";

export type TransferBookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "failed"
  | "disabled";

export interface TransferLocation {
  code?: string;
  name: string;
  type?: TransferLocationType;
  codeType?: TransferLocationCodeType;
  subType?: string;
  countryCode?: string;
  destinationCode?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}

export interface TransferPassengerSummary {
  adults: number;
  children?: number;
  infants?: number;
  childAges?: number[];
}

export interface TransferLuggageSummary {
  bags: number;
  oversizedBags?: number;
}

export interface TransferSearchRequest {
  pickup: TransferLocation;
  dropoff: TransferLocation;
  pickupDateTime: string;
  returnDateTime?: string;
  passengers: TransferPassengerSummary;
  luggage?: TransferLuggageSummary;
  vehicleType?: string;
  language?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface TransferVehicle {
  type: string;
  name?: string;
  maxPassengers?: number;
  maxBags?: number;
  description?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface TransferPrice {
  amount: number;
  currency: string;
  net?: number;
  taxes?: number;
  fees?: number;
  metadata?: Record<string, unknown>;
}

export interface TransferCancellationPolicy {
  from?: string;
  amount?: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface TransferOptionalExtra {
  code: string;
  name?: string;
  description?: string;
  units?: number;
  price?: TransferPrice;
  mandatory?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TransferOption {
  id: string;
  supplier: "hotelbeds-transfers";
  pickup: TransferLocation;
  dropoff: TransferLocation;
  pickupDateTime: string;
  vehicle: TransferVehicle;
  price: TransferPrice;
  cancellationPolicies?: TransferCancellationPolicy[];
  optionalExtras?: TransferOptionalExtra[];
  mustCheckPickupTime?: boolean;
  checkPickup?: {
    url?: string;
    hoursBeforeConsulting?: number;
    description?: string;
    metadata?: Record<string, unknown>;
  };
  rateKey?: string;
  available: boolean;
  metadata?: Record<string, unknown>;
}

export interface TransferSearchResponse {
  supplier: "hotelbeds-transfers";
  enabled: boolean;
  options: TransferOption[];
  message?: string;
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
}

export interface TransferRateCheckRequest {
  rateKey: string;
  metadata?: Record<string, unknown>;
}

export interface TransferRateCheckResponse {
  supplier: "hotelbeds-transfers";
  available: boolean;
  option?: TransferOption;
  message?: string;
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
}

export interface TransferLeadPassenger {
  title?: "Mr" | "Ms" | "Mrs";
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

export interface TransferBookingHolder {
  name: string;
  surname: string;
  email?: string;
  phone?: string;
}

export interface TransferBookingPassenger {
  title?: "Mr" | "Ms" | "Mrs";
  name: string;
  surname: string;
  age?: number;
  type?: "AD" | "CH" | "IN";
}

export interface TransferBookingService {
  rateKey: string;
  transferDetails?: Array<Record<string, unknown>>;
  extras?: TransferOptionalExtra[];
  metadata?: Record<string, unknown>;
}

export interface TransferVoucher {
  supplier: "hotelbeds-transfers";
  bookingReference?: string;
  clientReference?: string;
  confirmationDate?: string;
  serviceName?: string;
  vehicleName?: string;
  vehicleType?: string;
  pickup?: TransferLocation;
  dropoff?: TransferLocation;
  pickupDateTime?: string;
  pickupTime?: string;
  mustCheckPickupTime?: boolean;
  checkPickupInfo?: string;
  meetingPoint?: string;
  holder?: TransferBookingHolder;
  passengers?: TransferBookingPassenger[];
  optionalExtras?: TransferOptionalExtra[];
  cancellationPolicies?: TransferCancellationPolicy[];
  paymentNote?: string;
  raw?: unknown;
}

export interface TransferBookingRequest {
  rateKey?: string;
  leadPassenger?: TransferLeadPassenger;
  holder?: TransferBookingHolder;
  passengers?: TransferPassengerSummary | TransferBookingPassenger[];
  services?: TransferBookingService[];
  language?: string;
  clientReference?: string;
  metadata?: Record<string, unknown>;
}

export interface TransferBookingResponse {
  supplier: "hotelbeds-transfers";
  status: TransferBookingStatus;
  bookingReference?: string;
  clientReference?: string;
  voucher?: TransferVoucher;
  message?: string;
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
}

export interface TransferBookingDetailsRequest {
  bookingReference: string;
  metadata?: Record<string, unknown>;
}

export interface TransferCancellationRequest {
  bookingReference: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface TransferCancellationResponse {
  supplier: "hotelbeds-transfers";
  status: TransferBookingStatus;
  bookingReference?: string;
  message?: string;
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
}

export interface TransferCertificationScenario {
  id: string;
  name: string;
  requiresCancel?: boolean;
  requiresOptionalExtra?: boolean;
  requiresMustCheckPickupTime?: boolean;
}

export interface TransferCertificationRunResponse {
  scenarioId: string;
  mode: "availability" | "confirm" | "details" | "cancel";
  search?: TransferSearchResponse;
  selectedOptions?: TransferOption[];
  booking?: TransferBookingResponse;
  cancellation?: TransferCancellationResponse;
  voucher?: TransferVoucher;
  debug?: Record<string, unknown>;
  message?: string;
}

export interface TransferLocationSearchRequest {
  query: string;
  language?: string;
  limit?: number;
}

export interface TransferLocationSearchResponse {
  supplier: "hotelbeds-transfers";
  enabled: boolean;
  locations: TransferLocation[];
  message?: string;
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
}
