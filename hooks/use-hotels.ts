import { useState, useCallback } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Record<string, unknown> | null>(null);

  const search = useCallback(async (params: HotelSearchParams) => {
    setLoading(true);
    setError(null);

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

      const response = await fetch('/api/hotels/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== 'undefined' && localStorage.getItem('token')
            ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
            : {}),
        },
        body: JSON.stringify(requestParams),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || data?.error || 'Hotel search failed');
      }

      const result = await response.json();
      
      setSearchResults(result as Record<string, unknown>);
      return result;
    } catch (err) {
      console.error('Hotel search failed:', err);
      setError(err instanceof Error ? err.message : 'Hotel search failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    search,
    searchResults,
    loading,
    error,
    reset: () => setSearchResults(null),
  };
}
