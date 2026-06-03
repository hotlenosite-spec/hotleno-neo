export interface ActivitySearchRequest {
  countryCode?: string;
  destinationCode: string;
  from: string;
  to: string;
  adults: number;
  childrenAges?: number[];
  language?: string;
  pagination?: {
    page: number;
    itemsPerPage: number;
  };
}

export interface ActivityPrice {
  amount: number;
  currency: string;
}

export interface ActivityCancellationPolicy {
  from?: string;
  amount?: number;
  currency?: string;
  description?: string;
  raw?: unknown;
}

export interface ActivityOption {
  id: string;
  supplier: "hotelbeds-activities";
  activityCode: string;
  name: string;
  destinationName: string;
  countryName: string;
  categoryName?: string;
  duration?: string;
  languages?: string[];
  imageUrl?: string;
  price: ActivityPrice;
  cancellationPolicies?: ActivityCancellationPolicy[];
  modalities?: unknown[];
  raw: unknown;
}

export interface ActivitySearchResponse {
  supplier: "hotelbeds-activities";
  enabled: boolean;
  options: ActivityOption[];
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
  message?: string;
}

export interface ActivityDestinationSuggestion {
  label: string;
  countryCode: string;
  countryName?: string;
  destinationCode: string;
  destinationName: string;
}

export interface ActivityPax {
  age: number;
  name?: string;
  surname?: string;
  type?: "AD" | "CH" | "ADULT" | "CHILD" | "INFANT";
  customerId?: string;
  passport?: string;
}

export interface ActivityDetailsRequest {
  activityCode: string;
  modalityCode?: string;
  destinationCode?: string;
  from: string;
  to: string;
  language?: string;
  paxes: ActivityPax[];
  rateKey?: string;
}

export interface ActivityQuestion {
  code: string;
  text?: string;
  required?: boolean;
  raw?: unknown;
}

export interface ActivitySession {
  code?: string;
  name?: string;
  time?: string;
  raw?: unknown;
}

export interface ActivityModality {
  code?: string;
  name?: string;
  rates?: unknown[];
  sessions?: ActivitySession[];
  languages?: string[];
  questions?: ActivityQuestion[];
  cancellationPolicies?: ActivityCancellationPolicy[];
  price?: ActivityPrice;
  raw?: unknown;
}

export interface ActivityDetailsResponse {
  supplier: "hotelbeds-activities";
  enabled: boolean;
  activityCode: string;
  name?: string;
  description?: string;
  images?: string[];
  destinationName?: string;
  countryName?: string;
  features?: string[];
  operationDates?: unknown[];
  modalities?: ActivityModality[];
  totalAmount?: number;
  currency?: string;
  cancellationPolicies?: ActivityCancellationPolicy[];
  questions?: ActivityQuestion[];
  sessions?: ActivitySession[];
  languages?: string[];
  contractRemarks?: string[];
  routes?: unknown[];
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
  message?: string;
}

export interface ActivityHolder {
  title?: "Mr" | "Ms" | "Miss";
  name: string;
  surname: string;
  email?: string;
  address?: string;
  zipCode?: string;
  mailing?: boolean;
  country?: string;
  telephones?: string[];
}

export interface ActivityAnswer {
  question: ActivityQuestion;
  answer: string;
}

export interface ActivityBookingItem {
  rateKey: string;
  from?: string;
  to?: string;
  session?: string;
  language?: string;
  paxes?: ActivityPax[];
  answers?: ActivityAnswer[];
  comments?: Array<{ type?: string; text: string }>;
}

export interface ActivityBookingRequest {
  language?: string;
  clientReference: string;
  holder: ActivityHolder;
  activities: ActivityBookingItem[];
  amount?: number;
  currency?: string;
}

export interface ActivityVoucherFile {
  code?: string;
  language?: string;
  url?: string;
  mimeType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ActivityVoucher {
  supplier: "hotelbeds-activities";
  bookingReference?: string;
  clientReference?: string;
  confirmationDate?: string;
  activityName?: string;
  dateFrom?: string;
  dateTo?: string;
  modalityName?: string;
  destinationName?: string;
  holder?: ActivityHolder;
  paxes?: ActivityPax[];
  childrenAges?: number[];
  contractRemarks?: string[];
  redeemInformation?: string[];
  supplierInfo?: string;
  providerInfo?: string;
  selectedLanguage?: string;
  selectedSession?: string;
  cancellationPolicies?: ActivityCancellationPolicy[];
  officialVouchers?: ActivityVoucherFile[];
  raw?: unknown;
}

export interface ActivityBookingResponse {
  supplier: "hotelbeds-activities";
  enabled: boolean;
  status: "disabled" | "confirmed" | "cancelled" | "failed" | "pending";
  bookingReference?: string;
  clientReference?: string;
  voucher?: ActivityVoucher;
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
  message?: string;
}

export interface ActivityBookingDetailsRequest {
  bookingReference: string;
  language?: string;
}

export interface ActivityCancelRequest {
  bookingReference: string;
  language?: string;
  cancellationFlag?: "SIMULATION" | "CANCELLATION";
}

export interface ActivityCertificationScenario {
  id: string;
  name: string;
  destinationCode: "BCN" | "PAR" | "MAD";
  activityCode?: string;
  requiresSessionLanguage?: boolean;
  requiresPdfVoucher?: boolean;
  requiresQuestions?: boolean;
  requiresCancel?: boolean;
}
