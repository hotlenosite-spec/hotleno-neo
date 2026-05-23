import { HotelSearchResult } from "./travellanda";

export interface SearchRequest {
    destinationType: 'country' | 'city' | 'hotel';
    countryCode?: string;
    cityId?: number;
    cityName?: string;
    countryName?: string;
    checkInDate: Date;
    checkOutDate: Date;
    guests: {
        rooms: number;
        adults: number;
        children: number;
        childrenAges: number[];
    };
    freeCancellation: boolean;
    nationality: string;
    currency: string;
}

export interface SearchResult {
    searchRequest: SearchRequest;
    hotels: HotelSearchResult[];
    timestamp: string;
}