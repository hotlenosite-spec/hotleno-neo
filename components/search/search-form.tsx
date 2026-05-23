"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl"
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DestinationSearch } from "./destination-search";
import { GuestSelector } from "./guest-selector";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CalendarIcon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

const NATIONALITIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'AE', name: 'United Arab Emirates' },
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
];

export default function SearchForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const lang = useLocale();
  const t = useTranslations();
  
  const [destination, setDestination] = useState<{
    type: 'country' | 'city';
    code: string;
    id?: number;
    name: string;
    countryName?: string;
  } | null>(null);
  
  const [dates, setDates] = useState({
    checkIn: new Date(),
    checkOut: new Date(new Date().setDate(new Date().getDate() + 1)),
  });
  
  const [guests, setGuests] = useState({
    rooms: 1,
    adults: 2,
    children: 0,
    childrenAges: [] as number[],
  });
  
  const [nationality, setNationality] = useState('US');
  const [currency, setCurrency] = useState('USD');

interface DestinationValue {
  CountryCode?: string;
  CountryName?: string;
  CityId?: number;
  CityName?: string;
}

  const handleDestinationSelect = (type: 'country' | 'city', value: DestinationValue) => {
    if (type === 'country') {
      setDestination({
        type: 'country',
        code: value.CountryCode || '',
        name: value.CountryName || '',
      });
    } else {
      // When selecting a city, we need to keep the country info too
      setDestination({
        type: 'city',
        code: value.CountryCode || destination?.code || '',
        id: value.CityId,
        name: value.CityName || '',
        countryName: value.CountryName,
      });
    }
  };

  const handleSearch = async () => {
    if (!destination) {
      alert(t('search.selectDestination'));
      return;
    }

    setLoading(true);
    
    try {
      const searchParams = {
        destination,
        dates,
        guests,
        nationality,
        currency,
      };
      
      // Store in localStorage for results page
      localStorage.setItem('hotelSearch', JSON.stringify(searchParams));
      
      // Navigate to results page
      router.push(`/${lang}/results`);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1280px] rounded-[28px] bg-white/80 px-5 py-8 shadow-[2px_5px_4px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:px-9 lg:py-10">
      <h1 className="mb-12 text-[32px] font-semibold leading-none text-[#052948] sm:text-[40px]">
        Search for your perfect stay
      </h1>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(320px,415px)_239px_239px_minmax(230px,290px)]">
        <div className="rounded-[20px] border border-[#d9d9d9] bg-white/90 text-[#808080] shadow-sm lg:rounded-[28px]">
          <DestinationSearch
            selectedCountry={destination?.code}
            selectedCity={destination?.id}
            selectedCountryName={destination?.countryName || (destination?.type === 'country' ? destination.name : undefined)}
            onSelect={handleDestinationSelect}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-[58px] justify-start rounded-[20px] border-[#d9d9d9] bg-white/90 px-4 text-[18px] font-normal text-[#808080] shadow-sm lg:h-[81px] lg:rounded-[28px] lg:text-[24px]",
                dates.checkIn && "text-[#052948]"
              )}
            >
              <HugeiconsIcon icon={CalendarIcon} className="mr-3 h-6 w-6 text-[#1865a9]" />
              {dates.checkIn ? format(dates.checkIn, "MM/dd/yyyy") : "Check-in date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-[20px] p-0 shadow-[2px_16px_19px_rgba(0,0,0,0.09)]">
            <Calendar
              mode="single"
              selected={dates.checkIn}
              onSelect={(date) => date && setDates(prev => ({ ...prev, checkIn: date }))}
              initialFocus
              disabled={{ before: new Date() }}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-[58px] justify-start rounded-[20px] border-[#d9d9d9] bg-white/90 px-4 text-[18px] font-normal text-[#808080] shadow-sm lg:h-[81px] lg:rounded-[28px] lg:text-[24px]",
                dates.checkOut && "text-[#052948]"
              )}
            >
              <HugeiconsIcon icon={CalendarIcon} className="mr-3 h-6 w-6 text-[#1865a9]" />
              {dates.checkOut ? format(dates.checkOut, "MM/dd/yyyy") : "Check-out date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-[20px] p-0 shadow-[2px_16px_19px_rgba(0,0,0,0.09)]">
            <Calendar
              mode="single"
              selected={dates.checkOut}
              onSelect={(date) => date && setDates(prev => ({ ...prev, checkOut: date }))}
              initialFocus
              disabled={{ before: dates.checkIn }}
            />
          </PopoverContent>
        </Popover>

        <div className="rounded-[20px] border border-[#d9d9d9] bg-white/90 shadow-sm lg:rounded-[28px]">
          <GuestSelector
            guests={guests}
            onChange={setGuests}
          />
        </div>
      </div>

      <div className="mt-9 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex items-center gap-3 text-[20px] text-[#808080] sm:text-[24px]">
          <span className="flex h-[34px] w-[34px] items-center justify-center border-2 border-[#1865a9] bg-white">
            <HugeiconsIcon icon={Tick02Icon} className="h-5 w-5 text-transparent" />
          </span>
          Free cancellation
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={nationality} onValueChange={setNationality}>
            <SelectTrigger className="h-[58px] w-full rounded-[28px] border-[#1865a9] bg-white/90 px-5 text-[18px] text-[#052948] sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NATIONALITIES.map((nat) => (
                <SelectItem key={nat.code} value={nat.code}>
                  {nat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-[58px] w-full rounded-[28px] border-[#1865a9] bg-white/90 px-5 text-[18px] text-[#052948] sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleSearch}
            disabled={loading || !destination}
            className="h-[58px] rounded-[20px] bg-[#1865a9] px-9 text-[24px] font-bold text-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)] hover:bg-[#14558f] lg:h-[70px] lg:rounded-[28px] lg:text-[32px]"
          >
            <HugeiconsIcon icon={Search01Icon} className="mr-3 h-7 w-7" />
            {loading ? t('search.searching') : "Search"}
          </Button>
        </div>
      </div>
    </div>
  );
}
