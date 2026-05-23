interface TravellandaConfig {
  baseURL: string;
  username: string;
  password: string;
}

interface TravellandaRequest {
  RequestType: string;
  [key: string]: unknown;
}

export class TravellandaClient {
  private config: TravellandaConfig;

  constructor(config: TravellandaConfig) {
    this.config = config;
  }

  async request<T>(requestBody: TravellandaRequest): Promise<T> {
    try {
      const response = await fetch('/api/travellanda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Travellanda request failed:', error);
      throw error;
    }
  }

  // Data download methods
  async getCountries() {
    return this.request<{
      Countries?: Array<{ CountryCode: string; CountryName: string }>;
      Error?: { Id: number; Message: string };
    }>({ RequestType: 'GetCountries' });
  }

  async getCities(countryCode?: string) {
    return this.request<{
      Countries?: Array<{
        CountryCode: string;
        Cities?: Array<{ CityId: number; CityName: string; StateCode?: string }>;
      }>;
      Error?: { Id: number; Message: string };
    }>({ 
      RequestType: 'GetCities', 
      ...(countryCode && { CountryCode: countryCode })
    });
  }

  async getHotels(params: { countryCode?: string; cityId?: number }) {
    return this.request<{
      Hotels?: Array<{ HotelId: number; HotelName: string; CityId: number }>;
      Error?: { Id: number; Message: string };
    }>({
      RequestType: 'GetHotels',
      ...params,
    });
  }

  async getHotelDetails(hotelIds: number[]) {
    return this.request<{
      Hotels?: Array<{
        HotelId: number;
        HotelName: string;
        StarRating: string;
        Address: string;
        CityName: string;
        CountryName: string;
        Latitude: number;
        Longitude: number;
        PhoneNumber: string;
        Description: string;
        Facilities: Array<{ FacilityType: string; FacilityName: string }>;
        Images: Array<{ Url: string; Description?: string }>;
      }>;
      Error?: { Id: number; Message: string };
    }>({
      RequestType: 'GetHotelDetails',
      HotelIds: hotelIds,
    });
  }

  // Booking methods
  async searchHotels(params: {
    CityIds?: number[];
    HotelIds?: number[];
    CheckInDate: string;
    CheckOutDate: string;
    Rooms: Array<{ NumAdults: number; Children?: number[] }>;
    Nationality: string;
    Currency: string;
    AvailableOnly?: number;
    GetPolicies?: number;
  }) {
    return this.request<{
      Currency?: string;
      CheckInDate?: string;
      CheckOutDate?: string;
      HotelsReturned?: number;
      Hotels?: Array<{
        HotelId: number;
        HotelName: string;
        StarRating: number;
        Address: string;
        CityName: string;
        CountryName: string;
        Latitude?: number;
        Longitude?: number;
        Images?: Array<{ Url: string }>;
        Facilities?: string[];
        Options?: Array<{
          OptionId: number;
          OnRequest: number;
          BoardType: string;
          BoardName?: string;
          RoomType: string;
          RoomName?: string;
          Price: number;
          TotalPrice?: number;
          Taxes: number;
          Currency: string;
          IsNonRefundable?: boolean;
          CancellationDeadline?: string;
          Rooms: Array<{
            RoomId: number;
            RoomName: string;
            NumAdults: number;
            NumChildren: number;
          }>;
        }>;
      }>;
      Error?: { Id: number; Message: string };
    }>({
      RequestType: 'HotelSearch',
      ...params,
    });
  }

  async getPolicies(optionId: number) {
    return this.request<{
      OptionId?: number;
      Currency?: string;
      TotalPrice?: number;
      CancellationDeadline?: string;
      Policies?: Array<{
        From: string;
        Type: 'Amount' | 'Nights' | 'Percentage';
        Value: number;
      }>;
      Restrictions?: string[];
      Alerts?: Array<{ Type: string; Description: string }>;
      Error?: { Id: number; Message: string };
    }>({
      RequestType: 'HotelPolicies',
      OptionId: optionId,
    });
  }

  async bookHotel(params: {
    OptionId: number;
    YourReference: string;
    Rooms: Array<{
      RoomId: number;
      AdultNames: Array<{ Title: string; FirstName: string; LastName: string }>;
      ChildNames?: Array<{ FirstName: string; LastName: string }>;
    }>;
  }) {
    return this.request<{
      HotelBooking?: {
        BookingReference: string;
        BookingStatus: 'Confirmed' | 'On Request' | 'Rejected' | 'Pending';
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
        CancellationPolicies?: Array<{
          From: string;
          Type: string;
          Value: number;
        }>;
        Restrictions?: Array<{ Type: string; Description: string }>;
        Alerts?: Array<{ Type: string; Description: string }>;
      };
      Error?: { Id: number; Message: string };
    }>({
      RequestType: 'HotelBooking',
      ...params,
    });
  }
}

// Create singleton instance using environment variables
export const travellandaClient = new TravellandaClient({
  baseURL: process.env.NEXT_PUBLIC_TRAVELLANDA_API_URL || 'http://xmldemo.travellanda.com/apiv2',
  username: process.env.TRAVELLANDA_USERNAME || '',
  password: process.env.TRAVELLANDA_PASSWORD || '',
});
