import { useState, useEffect } from 'react';
import { useTravellanda } from './use-travellanda';

export interface City {
  CityId: number;
  CityName: string;
  CountryCode: string;
  StateCode?: string;
}

export function useCities(countryCode?: string) {
  const { loading, error, execute } = useTravellanda();
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchCities() {
      if (!countryCode) {
        if (!cancelled) setCities([]);
        return;
      }

      try {
        const result = await execute('GetCities', { CountryCode: countryCode }) as Record<string, unknown>;
        
        // API returns Countries array with Cities inside
        let citiesData: City[] = [];
        const countries = result.Countries as Array<Record<string, unknown>> | undefined;
        if (countries && Array.isArray(countries) && countries.length > 0) {
          const country = countries[0];
          const countryCities = country.Cities as Array<Record<string, unknown>> | undefined;
          if (countryCities && Array.isArray(countryCities)) {
            citiesData = countryCities.map((city) => ({
              CityId: (city.CityId as number) || 0,
              CityName: (city.CityName as string) || '',
              CountryCode: countryCode,
              StateCode: city.StateCode as string | undefined,
            })) as City[];
          }
        }
        
        if (!cancelled) setCities(citiesData);
      } catch (err) {
        console.error('Failed to load cities:', err);
      }
    }
    
    fetchCities();
    
    return () => { cancelled = true; };
  }, [countryCode, execute]);

  return {
    cities,
    loading,
    error,
    refetch: () => {
      // Trigger refetch by toggling a dependency - handled by parent re-render
      window.dispatchEvent(new CustomEvent('refetch-cities', { detail: countryCode }));
    },
  };
}