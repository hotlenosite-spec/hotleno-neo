export type HotelbedsHotelCertificationStep =
  | "availability"
  | "check-rate"
  | "booking-confirmed"
  | "booking-details"
  | "voucher"
  | "cancelled";

export type HotelbedsHotelGuest = {
  title?: "Mr" | "Ms" | "Mrs";
  name: string;
  surname: string;
  type?: "AD" | "CH";
  age?: number;
  roomId?: number;
};

export type HotelbedsHotelHolder = {
  name: string;
  surname: string;
};

export type HotelbedsHotelAvailabilityRequest = {
  destinationCode?: string;
  hotelCodes?: Array<string | number>;
  checkIn: string;
  checkOut: string;
  rooms: Array<{
    adults: number;
    children?: number;
    childrenAges?: number[];
  }>;
  nationality?: string;
  currency?: string;
};

export type HotelbedsHotelCheckRateRequest = {
  rateKey: string;
  rateKeys?: string[];
  language?: string;
};

export type HotelbedsHotelBookingRequest = {
  clientReference: string;
  holder: HotelbedsHotelHolder;
  rateKey: string;
  finalRateKey?: string;
  rooms?: Array<{
    rateKey: string;
    guests: HotelbedsHotelGuest[];
  }>;
  guests: HotelbedsHotelGuest[];
  remark?: string;
  language?: string;
};

export type HotelbedsHotelBookingDetailsRequest = {
  bookingReference: string;
  language?: string;
};

export type HotelbedsHotelCancelRequest = {
  bookingReference: string;
  cancellationFlag?: "SIMULATION" | "CANCELLATION";
  language?: string;
};

export type HotelbedsHotelVoucher = {
  supplier: "hotelbeds-accommodation";
  hotlenoReference?: string;
  bookingReference?: string;
  hotelName?: string;
  hotelAddress?: string;
  hotelPhone?: string;
  checkIn?: string;
  checkOut?: string;
  roomName?: string;
  boardName?: string;
  rooms?: Array<{
    name?: string;
    board?: string;
    adults?: number;
    children?: number;
    childAges?: number[];
    guestNames?: string[];
    guests?: Array<{
      name: string;
      type?: "AD" | "CH";
      age?: number;
    }>;
  }>;
  holderName?: string;
  customerEmail?: string;
  customerPhone?: string;
  guestNames?: string[];
  supplierReference?: string;
  cancellationPolicies?: unknown[];
  remarks?: string[];
  amount?: number;
  currency?: string;
  status?: string;
  cancellationStatus?: string;
};

export type HotelbedsHotelCertificationScenario = {
  id: string;
  title: string;
  destination?: string;
  hotelName?: string;
  hotelCode?: string;
  checkIn?: string;
  checkOut?: string;
  room?: string;
  board?: string;
  rate?: string;
  currency?: string;
  bookingReference?: string;
  cancellationStatus?: string;
  voucherStatus?: string;
};
