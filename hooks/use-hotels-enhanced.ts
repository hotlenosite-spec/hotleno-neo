import { useState, useCallback, useRef, useEffect } from 'react';
import { travellandaClient } from '@/lib/providers/travellanda';
import type { 
  HotelSearchParams, 
  HotelSearchResponse, 
  HotelPoliciesResponse,
  HotelFilters,
  SortOption,
  SavedSearch
} from '@/types/travellanda';

interface UseHotelsEnhancedReturn {
  // Search results
  searchResults: HotelSearchResponse | null;
  loading: boolean;
  error: string | null;
  
  // Search execution
  search: (params: HotelSearchParams) => Promise<HotelSearchResponse>;
  refreshSearch: () => Promise<void>;
  
  // Filters & sorting
  filters: HotelFilters;
  setFilters: (filters: HotelFilters) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  
  // Filtered results
  filteredHotels: HotelSearchResponse['Hotels'];
  totalFiltered: number;
  
  // Search expiration (30 min limit)
  searchTimestamp: number | null;
  timeRemaining: number; // seconds
  isExpired: boolean;
  
  // Reset
  reset: () => void;
}

const SEARCH_EXPIRY_MINUTES = 30;
const SEARCH_EXPIRY_MS = SEARCH_EXPIRY_MINUTES * 60 * 1000;

const defaultFilters: HotelFilters = {
  priceRange: [0, Infinity],
  starRatings: [],
  amenities: [],
  boardTypes: [],
  refundableOnly: false,
};

export function useHotelsEnhanced(): UseHotelsEnhancedReturn {
  const [searchResults, setSearchResults] = useState<HotelSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HotelFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [searchTimestamp, setSearchTimestamp] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const currentParamsRef = useRef<HotelSearchParams | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for search expiration
  useEffect(() => {
    if (searchTimestamp) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - searchTimestamp;
        const remaining = Math.max(0, Math.floor((SEARCH_EXPIRY_MS - elapsed) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [searchTimestamp]);

  const search = useCallback(async (params: HotelSearchParams): Promise<HotelSearchResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const requestParams: Record<string, unknown> = {
        CheckInDate: params.checkInDate,
        CheckOutDate: params.checkOutDate,
        Rooms: params.rooms,
        Nationality: params.nationality,
        Currency: params.currency,
        AvailableOnly: params.availableOnly ?? 1,
        GetPolicies: params.getPolicies ?? 0,
      };

      if (params.cityId) {
        requestParams.CityIds = [params.cityId];
      } else if (params.hotelIds && params.hotelIds.length > 0) {
        requestParams.HotelIds = params.hotelIds.slice(0, 200); // API limit
      }

      const response = await fetch('/api/hotels/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestParams),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || data?.error || 'Failed to search hotels');
      }

      const result = await response.json() as HotelSearchResponse;
      
      // Check for API errors
      if (result.Error) {
        throw new Error(result.Error.Message);
      }
      
      setSearchResults(result);
      setSearchTimestamp(Date.now());
      currentParamsRef.current = params;
      
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search hotels';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSearch = useCallback(async () => {
    if (currentParamsRef.current) {
      await search(currentParamsRef.current);
    }
  }, [search]);

  // Filter and sort hotels
  const filteredHotels = (() => {
    if (!searchResults?.Hotels) return [];
    
    let hotels = [...searchResults.Hotels];
    
    // Apply filters
    hotels = hotels.filter(hotel => {
      // Price filter - check lowest option price
      const lowestPrice = Math.min(...(hotel.Options?.map(o => o.Price + (o.Taxes || 0)) || [0]));
      if (lowestPrice < filters.priceRange[0] || lowestPrice > filters.priceRange[1]) {
        return false;
      }
      
      // Star rating filter
      if (filters.starRatings.length > 0 && !filters.starRatings.includes(Math.floor(hotel.StarRating))) {
        return false;
      }
      
      // Amenities filter
      if (filters.amenities.length > 0) {
        const hotelAmenities = hotel.Facilities?.map(f => f.toLowerCase()) || [];
        const hasAllAmenities = filters.amenities.every(amenity => 
          hotelAmenities.some(ha => ha.includes(amenity.toLowerCase()))
        );
        if (!hasAllAmenities) return false;
      }
      
      // Board type filter
      if (filters.boardTypes.length > 0) {
        const hasBoardType = hotel.Options?.some(o => 
          filters.boardTypes.includes(o.BoardType)
        );
        if (!hasBoardType) return false;
      }
      
      // Refundable only filter
      if (filters.refundableOnly) {
        const hasRefundable = hotel.Options?.some(o => !o.IsNonRefundable);
        if (!hasRefundable) return false;
      }
      
      return true;
    });
    
    // Apply sorting
    switch (sortBy) {
      case 'price-low-to-high':
        hotels.sort((a, b) => {
          const priceA = Math.min(...(a.Options?.map(o => o.Price + (o.Taxes || 0)) || [Infinity]));
          const priceB = Math.min(...(b.Options?.map(o => o.Price + (o.Taxes || 0)) || [Infinity]));
          return priceA - priceB;
        });
        break;
      case 'price-high-to-low':
        hotels.sort((a, b) => {
          const priceA = Math.max(...(a.Options?.map(o => o.Price + (o.Taxes || 0)) || [0]));
          const priceB = Math.max(...(b.Options?.map(o => o.Price + (o.Taxes || 0)) || [0]));
          return priceB - priceA;
        });
        break;
      case 'star-rating':
        hotels.sort((a, b) => (b.StarRating || 0) - (a.StarRating || 0));
        break;
      case 'recommended':
      default:
        // Keep original order or implement recommendation logic
        break;
    }
    
    return hotels;
  })();

  const reset = useCallback(() => {
    setSearchResults(null);
    setError(null);
    setFilters(defaultFilters);
    setSortBy('recommended');
    setSearchTimestamp(null);
    setTimeRemaining(0);
    currentParamsRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  return {
    searchResults,
    loading,
    error,
    search,
    refreshSearch,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    filteredHotels,
    totalFiltered: filteredHotels.length,
    searchTimestamp,
    timeRemaining,
    isExpired: timeRemaining === 0 && searchTimestamp !== null,
    reset,
  };
}

// Hook for fetching hotel policies
export function useHotelPolicies() {
  const [policies, setPolicies] = useState<HotelPoliciesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async (hotelId: number, optionId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await travellandaClient.request<HotelPoliciesResponse>({
        RequestType: 'HotelPolicies',
        HotelIds: [hotelId],
        OptionId: optionId,
      });
      
      if (result.Error) {
        throw new Error(result.Error.Message);
      }
      
      setPolicies(result);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch policies';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPolicies(null);
    setError(null);
  }, []);

  return {
    policies,
    loading,
    error,
    fetchPolicies,
    reset,
  };
}

// Hook for managing saved searches
export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('savedSearches');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse saved searches:', e);
      }
    }
    return [];
  });

  const saveSearch = useCallback((search: SavedSearch) => {
    setSavedSearches(prev => {
      // Remove duplicates and add to beginning
      const filtered = prev.filter(s => 
        s.destination.name !== search.destination.name ||
        s.dates.checkIn !== search.dates.checkIn
      );
      const updated = [search, ...filtered].slice(0, 5); // Keep last 5
      localStorage.setItem('savedSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearSearches = useCallback(() => {
    setSavedSearches([]);
    localStorage.removeItem('savedSearches');
  }, []);

  return {
    savedSearches,
    saveSearch,
    clearSearches,
  };
}

// Calculate nights between dates
export function calculateNights(checkIn: string | Date, checkOut: string | Date): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Format currency
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format time remaining
export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
