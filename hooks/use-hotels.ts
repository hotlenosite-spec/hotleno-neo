import { useState, useCallback } from 'react';
import { useTravellanda } from './use-travellanda';

export interface HotelSearchParams {
  cityId?: number;
  hotelIds?: number[];
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  rooms: Array<{
    NumAdults: number;
    Children?: number[];
  }>;
  nationality: string;
  currency: string;
  availableOnly?: number;
  getPolicies?: number;
}

export function useHotels() {
  const { 
    loading, 
    error, 
    execute 
  } = useTravellanda();
  
  const [searchResults, setSearchResults] = useState<Record<string, unknown> | null>(null);

  const search = useCallback(async (params: HotelSearchParams) => {
    try {
      const requestParams: Record<string, unknown> = {
        CheckInDate: params.checkInDate,
        CheckOutDate: params.checkOutDate,
        Rooms: params.rooms,
        Nationality: params.nationality,
        Currency: params.currency,
        AvailableOnly: params.availableOnly || 1,
        GetPolicies: params.getPolicies || 0,
      };

      if (params.cityId) {
        requestParams.CityIds = [params.cityId];
      } else if (params.hotelIds && params.hotelIds.length > 0) {
        requestParams.HotelIds = params.hotelIds;
      }

      const result = await execute('HotelSearch', requestParams);
      
      setSearchResults(result as Record<string, unknown>);
      return result;
    } catch (err) {
      console.error('Hotel search failed:', err);
      throw err;
    }
  }, [execute]);

  return {
    search,
    searchResults,
    loading,
    error,
    reset: () => setSearchResults(null),
  };
}