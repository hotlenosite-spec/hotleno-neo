// Comprehensive Travellanda API Types

// Base Response Structure
export interface TravellandaResponse {
  ServerTime: string;
  ServerType: string;
  ExecutionTime: string;
  ResponseType: string;
  Error?: {
    Id: number;
    Message: string;
  };
}

// GetCountries Response
export interface Country {
  CountryCode: string;
  CountryName: string;
}

export interface GetCountriesResponse extends TravellandaResponse {
  Countries: Country[];
}

// GetCities Response
export interface City {
  CityId: number;
  CityName: string;
  CountryCode: string;
  StateCode?: string;
}

export interface GetCitiesResponse extends TravellandaResponse {
  Cities: City[];
}

// GetHotels Response
export interface HotelBasic {
  HotelId: number;
  HotelName: string;
  CityId: number;
  CountryCode: string;
}

export interface GetHotelsResponse extends TravellandaResponse {
  Hotels: HotelBasic[];
}

// GetHotelDetails Response
export interface HotelImage {
  Url: string;
  Description?: string;
}

export interface HotelFacility {
  Facility: string;
  Category?: string;
}

export interface HotelDetail {
  HotelId: number;
  HotelName: string;
  StarRating: number;
  Address: string;
  CityName: string;
  CountryName: string;
  Latitude?: number;
  Longitude?: number;
  Phone?: string;
  Fax?: string;
  Email?: string;
  Website?: string;
  Description: string;
  Facilities: string[];
  Images: HotelImage[];
  CheckInTime?: string;
  CheckOutTime?: string;
}

export interface GetHotelDetailsResponse extends TravellandaResponse {
  Hotels: HotelDetail[];
}

// HotelSearch Response
export interface RoomInOption {
  RoomId: number;
  RoomName: string;
  NumAdults: number;
  NumChildren: number;
  RoomPrice: number;
}

export interface HotelOption {
  OptionId: number;
  rateKey?: string;
  supplier?: string;
  supplierHotelId?: string;
  supplierRateKey?: string;
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
  displayRoomName?: string;
  roomsCount?: number;
  BookingCode?: string;
  HotelCode?: string;
  supplierTotalFare?: number;
  OnRequest: number; // 0 = available, 1 = on request
  BoardType: string;
  BoardName?: string;
  RoomType: string;
  RoomName?: string;
  Rooms: RoomInOption[];
  Adults: number;
  Children: number;
  Price: number;
  TotalPrice?: number; // Some API responses use this instead
  Taxes: number;
  Currency: string;
  CancellationDeadline?: string;
  IsNonRefundable?: boolean;
  rspPrice?: number;
  roomPromotions?: unknown[];
  supplements?: unknown[];
  inclusions?: string[];
  cancellationPolicies?: unknown[];
  rateConditions?: unknown[];
  amenities?: string[];
}

export interface HotelSearchResult {
  HotelId: number;
  HotelName: string;
  StarRating: number;
  Address: string;
  CityName: string;
  CountryName: string;
  Latitude?: number;
  Longitude?: number;
  Description?: string;
  Images: HotelImage[];
  Facilities: string[];
  Options: HotelOption[];
  supplierOffers?: unknown[];
}

export interface HotelSearchResponse extends TravellandaResponse {
  Currency: string;
  CheckInDate: string;
  CheckOutDate: string;
  HotelsReturned: number;
  Hotels: HotelSearchResult[];
}

// HotelPolicies Response
export interface CancellationPolicy {
  From: string;
  Type: 'Amount' | 'Nights' | 'Percentage';
  Value: number;
}

export interface PolicyRestriction {
  Type: string;
  Description: string;
}

export interface PolicyAlert {
  Type: string;
  Description: string;
}

export interface HotelPoliciesResponse extends TravellandaResponse {
  OptionId: number;
  Currency: string;
  TotalPrice: number;
  CancellationDeadline?: string;
  Policies: CancellationPolicy[];
  Restrictions: PolicyRestriction[];
  Alerts: PolicyAlert[];
}

// HotelBooking Request & Response
export interface TravelerName {
  Title?: 'Mr' | 'Mrs' | 'Ms';
  FirstName: string;
  LastName: string;
}

export interface BookingRoom {
  RoomId: number;
  AdultNames: TravelerName[];
  ChildNames?: Array<{ FirstName: string; LastName: string }>;
}

export interface HotelBookingRequest {
  OptionId: number;
  YourReference: string;
  Rooms: BookingRoom[];
}

export interface HotelBookingResponse extends TravellandaResponse {
  BookingReference: string;
  BookingStatus: 'Confirmed' | 'Pending' | 'OnRequest' | 'Rejected' | 'Cancelled';
  YourReference: string;
  Currency: string;
  TotalPrice: number;
  HotelId: number;
  HotelName: string;
  CheckInDate: string;
  CheckOutDate: string;
  Rooms: Array<{
    RoomId: number;
    RoomName: string;
    Adults: number;
    Children: number;
  }>;
  LeadGuest: string;
  BookingDate: string;
  CancellationPolicies?: CancellationPolicy[];
  Restrictions?: PolicyRestriction[];
  Alerts?: PolicyAlert[];
}

// HotelBookingDetails Response
export interface HotelBookingDetailsResponse extends TravellandaResponse {
  Bookings: Array<HotelBookingResponse & {
    ContactPerson: {
      Email: string;
      Phone?: string;
    };
    SpecialRequests?: string;
  }>;
}

// HotelBookingCancel Response
export interface HotelBookingCancelResponse extends TravellandaResponse {
  BookingReference: string;
  BookingStatus: 'Cancelled' | 'Cancellation Pending';
  RequestStatus?: string;
}

// Search Parameters
export interface HotelSearchParams {
  cityId?: number;
  hotelIds?: number[];
  checkInDate: string;
  checkOutDate: string;
  rooms: Array<{
    NumAdults: number;
    Children?: number[];
  }>;
  nationality: string;
  currency: string;
  availableOnly?: number;
  getPolicies?: number;
}

// Filter Types
export interface HotelFilters {
  priceRange: [number, number];
  starRatings: number[];
  amenities: string[];
  boardTypes: string[];
  refundableOnly: boolean;
}

// Sort Types
export type SortOption = 'recommended' | 'price-low-to-high' | 'price-high-to-low' | 'star-rating' | 'guest-rating';

// Local Storage Types
export interface SavedSearch {
  destination: {
    type: 'country' | 'city';
    code: string;
    id?: number;
    name: string;
  };
  dates: {
    checkIn: string;
    checkOut: string;
  };
  guests: {
    rooms: number;
    adults: number;
    children: number;
    childrenAges: number[];
    roomDetails?: Array<{
      adults: number;
      children: number;
      childrenAges: number[];
    }>;
    nights: number;
  };
  nationality: string;
  currency: string;
  timestamp: number;
}

export interface BookingState {
  hotel: HotelSearchResult;
  selectedOption: HotelOption;
  policies: HotelPoliciesResponse;
  searchParams: SavedSearch;
}
