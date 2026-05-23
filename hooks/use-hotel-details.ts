import { useState, useEffect, useCallback } from 'react';
import { useTravellanda } from './use-travellanda';

export interface HotelImage {
  Url: string;
  Description?: string;
}

export interface HotelFacility {
  FacilityType: string;
  FacilityName: string;
}

export interface HotelDetails {
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
  Facilities: HotelFacility[];
  Images: HotelImage[];
}

interface GetHotelDetailsResponse {
  Hotels?: HotelDetails[];
  HotelsReturned?: number;
  Error?: {
    Id: number;
    Message: string;
  };
}

export function useHotelDetails(hotelId: number | null) {
  const { loading: apiLoading, execute } = useTravellanda();
  const [hotelDetails, setHotelDetails] = useState<HotelDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!hotelId) {
      setHotelDetails(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await execute('GetHotelDetails', { 
        HotelIds: [hotelId] 
      }) as GetHotelDetailsResponse;

      if (result.Error) {
        throw new Error(result.Error.Message);
      }

      if (result.Hotels && result.Hotels.length > 0) {
        setHotelDetails(result.Hotels[0]);
      } else {
        setError('Hotel details not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load hotel details';
      setError(errorMessage);
      console.error('Failed to load hotel details:', err);
    } finally {
      setLoading(false);
    }
  }, [execute, hotelId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    hotelDetails,
    loading: loading || apiLoading,
    error,
    refetch: fetchDetails,
  };
}