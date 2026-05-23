"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useHotelsEnhanced, calculateNights, formatTimeRemaining } from "@/hooks/use-hotels-enhanced";
import { HotelCard } from "@/components/hotel/hotel-card";
import { HotelFiltersPanel, MobileHotelFilters } from "@/components/results/hotel-filters";
import { HotelsPagination } from "@/components/results/hotels-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  ArrowLeftIcon, 
  ClockIcon, 
  RefreshIcon, 
  FilterRemoveIcon,
  LeftTriangleIcon
} from "@hugeicons/core-free-icons";
import type { SortOption, SavedSearch } from "@/types/travellanda";

export default function ResultsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const {
    search,
    searchResults,
    loading,
    error,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    filteredHotels,
    totalFiltered,
    timeRemaining,
    isExpired,
    refreshSearch,
  } = useHotelsEnhanced();
  
  const [searchParams, _setSearchParams] = useState<SavedSearch | null>(() => {
    if (typeof window === 'undefined') return null;
    const savedSearch = localStorage.getItem('hotelSearch');
    if (!savedSearch) return null;
    return JSON.parse(savedSearch);
  });
  const [_showMobileFilters, _setShowMobileFilters] = useState(false);
  
  // Track filters key to reset page when filters change
  const filtersKey = useMemo(() => {
    return JSON.stringify({
      priceRange: filters.priceRange,
      starRatings: filters.starRatings,
      amenities: filters.amenities,
      boardTypes: filters.boardTypes,
      refundableOnly: filters.refundableOnly,
      sortBy,
    });
  }, [filters, sortBy]);
  
  const filtersKeyRef = useRef(filtersKey);
  const [page, setPage] = useState(1);
  
  // Reset page to 1 when filters change using microtask to avoid set-state-in-effect
  useEffect(() => {
    if (filtersKeyRef.current !== filtersKey) {
      filtersKeyRef.current = filtersKey;
      queueMicrotask(() => {
        setPage(1);
      });
    }
  }, [filtersKey]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!searchParams) {
      router.push('/');
      return;
    }

    // Calculate nights if not already set
    const params = { ...searchParams };
    if (!params.guests.nights) {
      params.guests.nights = calculateNights(params.dates.checkIn, params.dates.checkOut);
    }

    const apiParams = {
      cityId: params.destination?.type === 'city' ? params.destination.id : undefined,
      checkInDate: formatDate(params.dates.checkIn),
      checkOutDate: formatDate(params.dates.checkOut),
      rooms: [{
        NumAdults: params.guests.adults,
        Children: params.guests.children > 0 
          ? params.guests.childrenAges.slice(0, params.guests.children)
          : undefined,
      }],
      nationality: params.nationality,
      currency: params.currency,
      availableOnly: 1,
      getPolicies: 0,
    };

    search(apiParams).catch(console.error);
  }, [searchParams, search, router]);

  // Calculate price range from results
  const { minPrice, maxPrice, availableAmenities, availableBoardTypes } = useMemo(() => {
    if (!searchResults?.Hotels) {
      return { minPrice: 0, maxPrice: 1000, availableAmenities: [], availableBoardTypes: [] };
    }

    const prices = searchResults.Hotels.flatMap(h => 
      h.Options?.map(o => o.Price + (o.Taxes || 0)) || []
    );
    
    const amenities = new Set<string>();
    const boardTypes = new Set<string>();
    
    searchResults.Hotels.forEach(hotel => {
      hotel.Facilities?.forEach(f => amenities.add(f));
      hotel.Options?.forEach(o => o.BoardType && boardTypes.add(o.BoardType));
    });

    return {
      minPrice: Math.min(...prices, 0),
      maxPrice: Math.max(...prices, 1000),
      availableAmenities: Array.from(amenities),
      availableBoardTypes: Array.from(boardTypes),
    };
  }, [searchResults]);



  const getLocationName = () => {
    if (!searchParams?.destination) return "";
    return searchParams.destination.name;
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as SortOption);
  };

  const itemsPerPage = 10;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHotels = filteredHotels.slice(startIndex, endIndex);

  const nights = searchParams?.guests.nights || 1;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="w-64 h-8" />
            <Skeleton className="mt-2 w-1/2 h-5" />
          </div>
          <Skeleton className="rounded-full h-9 w-32" />
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="hidden lg:block w-80">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="flex-1 space-y-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <HugeiconsIcon icon={LeftTriangleIcon} className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('hotels.searchFailed')}</h2>
            <p className="text-red-500 mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => refreshSearch()} variant="outline">
                <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
                {t('hotels.tryAgain')}
              </Button>
              <Button onClick={() => router.push('/')}>
                <HugeiconsIcon icon={ArrowLeftIcon} className="mr-2 h-4 w-4" />
                {t('hotels.newSearch')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Expiration Warning */}
      {isExpired && (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={ClockIcon} className="h-4 w-4" />
          <AlertTitle>{t('hotels.searchExpired')}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{t('hotels.searchExpiredDesc')}</span>
            <Button size="sm" onClick={() => refreshSearch()}>
              <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
              {t('hotels.refresh')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isExpired && timeRemaining > 0 && timeRemaining < 300 && (
        <Alert className="mb-6 border-amber-500 text-amber-800">
          <HugeiconsIcon icon={ClockIcon} className="h-4 w-4 text-amber-500" />
          <AlertTitle>{t('hotels.expiringSoon')}</AlertTitle>
          <AlertDescription>
            {t('hotels.expiringSoonDesc')} {formatTimeRemaining(timeRemaining)} {t('hotels.moreMinutes')}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t('hotels.hotelsIn')} {getLocationName()}</h1>
          <p className="text-muted-foreground mt-2">
            {t('hotels.showing')} {totalFiltered} {t('hotels.of')} {searchResults?.HotelsReturned || 0} {t('hotels.propertiesFound')}
            {nights > 1 && ` • ${nights} ${t('hotels.nights')}`}
          </p>
        </div>
        <div className="flex gap-3">
          {/* Mobile Filters Button */}
          <MobileHotelFilters
            filters={filters}
            onFiltersChange={setFilters}
            minPrice={minPrice}
            maxPrice={maxPrice}
            availableAmenities={availableAmenities}
            availableBoardTypes={availableBoardTypes}
            totalResults={searchResults?.HotelsReturned || 0}
            filteredResults={totalFiltered}
          >
            <Button variant="outline" className="lg:hidden">
              <HugeiconsIcon icon={FilterRemoveIcon} className="mr-2 h-4 w-4" />
              {t('hotels.filters')}
            </Button>
          </MobileHotelFilters>
          
          <Button variant="outline" onClick={() => router.push('/')}>
            <HugeiconsIcon icon={ArrowLeftIcon} className="mr-2 h-4 w-4" />
            {t('hotels.newSearch')}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block w-80 shrink-0">
          <HotelFiltersPanel
            filters={filters}
            onFiltersChange={setFilters}
            minPrice={minPrice}
            maxPrice={maxPrice}
            availableAmenities={availableAmenities}
            availableBoardTypes={availableBoardTypes}
            totalResults={searchResults?.HotelsReturned || 0}
            filteredResults={totalFiltered}
          />
        </div>

        {/* Results */}
        <div className="flex-1">
          {/* Sort and Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('hotels.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="recommended">{t('hotels.recommended')}</SelectItem>
                  <SelectItem value="price-low-to-high">{t('hotels.priceLowToHigh')}</SelectItem>
                  <SelectItem value="price-high-to-low">{t('hotels.priceHighToLow')}</SelectItem>
                  <SelectItem value="star-rating">{t('hotels.starRating')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {!isExpired && timeRemaining > 0 && (
              <Badge variant="outline" className="text-muted-foreground">
                <HugeiconsIcon icon={ClockIcon} className="mr-1 h-3 w-3" />
                {t('hotels.validFor')} {formatTimeRemaining(timeRemaining)}
              </Badge>
            )}
          </div>

          {/* Hotel List */}
          <div className="space-y-6">
            {paginatedHotels.map((hotel) => (
              <Link 
                key={hotel.HotelId} 
                href={`/${locale}/hotel/${hotel.HotelId}`}
                className="block hover:no-underline"
              >
                <HotelCard
                  hotel={hotel}
                  currency={searchResults?.Currency || 'USD'}
                  nights={nights}
                />
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {filteredHotels.length > itemsPerPage && (
            <div className="mt-8">
              <HotelsPagination
                totalItems={filteredHotels.length}
                itemsPerPage={itemsPerPage}
                currentPage={page}
                onPageChange={setPage}
              />
            </div>
          )}

          {/* Empty State */}
          {filteredHotels.length === 0 && !loading && (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-lg mb-2">{t('hotels.noResults')}</p>
                <p className="text-muted-foreground mb-4">
                  {t('hotels.tryAdjusting')}
                </p>
                <Button variant="outline" onClick={() => setFilters({
                  priceRange: [minPrice, maxPrice],
                  starRatings: [],
                  amenities: [],
                  boardTypes: [],
                  refundableOnly: false,
                })}>
                  {t('hotels.clearFilters')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
