"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useCountries } from "@/hooks/use-countries";
import { useCities } from "@/hooks/use-cities";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { MapingIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface DestinationValue {
  CountryCode?: string;
  CountryName?: string;
  CityId?: number;
  CityName?: string;
}

interface DestinationSearchProps {
  onSelect: (type: 'country' | 'city', value: DestinationValue) => void;
  selectedCountry?: string;
  selectedCity?: number;
  selectedCountryName?: string;
}

export function DestinationSearch({ 
  onSelect, 
  selectedCountry, 
  selectedCity,
  selectedCountryName: propCountryName
}: DestinationSearchProps) {
  const t = useTranslations('search');
  
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const { countries, loading: countriesLoading } = useCountries();
  const { cities, loading: citiesLoading } = useCities(selectedCountry);

  // Calculate selected names from props (derived state)
  const selectedCountryName = useMemo(() => {
    // If prop is provided, use it (for when city is selected)
    if (propCountryName) return propCountryName;
    // Otherwise look up from countries list
    if (!selectedCountry || countries.length === 0) return "";
    const country = countries.find(c => c.CountryCode === selectedCountry);
    return country?.CountryName || "";
  }, [selectedCountry, countries, propCountryName]);

  const selectedCityName = useMemo(() => {
    if (!selectedCity || cities.length === 0) return "";
    const city = cities.find(c => c.CityId === selectedCity);
    return city?.CityName || "";
  }, [selectedCity, cities]);

  const handleCountrySelect = (country: DestinationValue) => {
    onSelect('country', country);
    setCountryOpen(false);
    setCountrySearchTerm("");
  };

  const handleCitySelect = (city: DestinationValue) => {
    // Add country name to the city object before passing it
    const country = countries.find(c => c.CountryCode === selectedCountry);
    const cityWithCountryName = {
      ...city,
      CountryName: country?.CountryName || '',
    };
    onSelect('city', cityWithCountryName);
    setCityOpen(false);
    setCitySearchTerm("");
  };

  const filteredCountries = countries.filter(country =>
    country.CountryName.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );

  const filteredCities = cities.filter(city =>
    city.CityName.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-[58px] items-center rtl:flex-row-reverse lg:min-h-[81px]">
      {/* Country Search */}
      <div className="space-y-2 flex-1">
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={countryOpen}
              className={cn("h-[58px] w-full justify-between rounded-r-none border-0 bg-transparent px-4 text-[18px] font-normal text-[#808080] shadow-none hover:bg-transparent lg:h-[81px] lg:text-[24px]")}
              disabled={countriesLoading}
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon 
                  icon={MapingIcon} 
                  className="h-6 w-6 text-[#1865a9]" 
                />
                <span className={cn(
                  "truncate",
                  !selectedCountryName && "text-muted-foreground"
                )}>
                  {countriesLoading 
                    ? t('loading') 
                    : selectedCountryName || t('searchCountries')
                  }
                </span>
              </div>
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-[133%] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={t('searchCountries')}
                value={countrySearchTerm}
                onValueChange={setCountrySearchTerm}
                disabled={countriesLoading}
              />
              
              <CommandList className="max-h-75">
                <CommandEmpty>
                  {countriesLoading ? t('loading') : t('noCountries')}
                </CommandEmpty>

                {filteredCountries.length > 0 && (
                  <CommandGroup heading={t('countries')}>
                    {filteredCountries.map((country) => (
                      <CommandItem
                        key={country.CountryCode}
                        value={`${country.CountryName} ${country.CountryCode}`}
                        onSelect={() => handleCountrySelect(country)}
                        className="cursor-pointer"
                      >
                        <span>{country.CountryName}</span>

                        <CommandShortcut>
                          <Badge variant="outline" className="text-xs">
                            {country.CountryCode}
                          </Badge>
                        </CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* City Search (only shown when a country is selected) */}
      <div className="space-y-2 flex-1">
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              className="h-[58px] w-full justify-between rounded-l-none border-0 bg-transparent px-4 text-[18px] font-normal text-[#808080] shadow-none hover:bg-transparent lg:h-[81px] lg:text-[24px]"
              disabled={!selectedCountry || citiesLoading}
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon 
                  icon={MapingIcon} 
                  className="h-6 w-6 text-[#1865a9]" 
                />
                <span className={cn(
                  "truncate",
                  !selectedCityName && "text-muted-foreground"
                )}>
                  {citiesLoading 
                    ? t('loading') 
                    : selectedCityName || `${t('searchCities')} ${selectedCountryName}`
                  }
                </span>
              </div>
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-[133%] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={`${t('searchCities')} ${selectedCountryName}`}
                value={citySearchTerm}
                onValueChange={setCitySearchTerm}
                disabled={citiesLoading}
              />
              
              <CommandList className="max-h-75">
                <CommandEmpty>
                  {citiesLoading ? t('loading') : t('noCities')}
                </CommandEmpty>

                {filteredCities.length > 0 && (
                  <CommandGroup heading={t('cities')}>
                    {filteredCities.map((city) => (
                      <CommandItem
                        key={city.CityId}
                        value={`${city.CityName}-${city.CityId}`}
                        onSelect={() => handleCitySelect(city)}
                        className="cursor-pointer"
                      >
                        {city.CityName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
