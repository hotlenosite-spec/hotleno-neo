import { useState, useEffect } from 'react';
import { useTravellanda } from './use-travellanda';

export interface Country {
  CountryCode: string;
  CountryName: string;
}

export function useCountries() {
  const { loading, error, execute } = useTravellanda();
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchCountries() {
      try {
        const result = await execute('GetCountries') as Record<string, unknown>;
        
        // Handle both array and object formats from API
        let countriesData: Country[] = [];
        const resultCountries = result.Countries;
        if (resultCountries) {
          if (Array.isArray(resultCountries)) {
            countriesData = resultCountries as Country[];
          } else {
            countriesData = [resultCountries as Country];
          }
        }
        
        if (!cancelled) setCountries(countriesData);
      } catch (err) {
        console.error('Failed to load countries:', err);
      }
    }
    
    fetchCountries();
    
    return () => { cancelled = true; };
  }, [execute]);

  return {
    countries,
    loading,
    error,
    refetch: () => {
      window.dispatchEvent(new CustomEvent('refetch-countries'));
    },
  };
}