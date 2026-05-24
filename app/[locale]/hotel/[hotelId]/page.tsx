"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RoomSelector } from "@/components/hotel/room-selector";
import { HotelImageGallery } from "@/components/hotel/hotel-image-gallery";
import { BookingBreadcrumb } from "@/components/booking/booking-breadcrumb";
import { useHotelPolicies } from "@/hooks/use-hotels-enhanced";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  StarIcon, 
  MapPinIcon, 
  AiPhoneIcon,
  ArrowLeftIcon,
  LeftTriangleIcon,
  RefreshIcon
} from "@hugeicons/core-free-icons";
import type { HotelSearchResult, HotelOption, HotelPoliciesResponse, SavedSearch } from "@/types/travellanda";
import { formatCurrency, calculateNights } from "@/hooks/use-hotels-enhanced";

export default function HotelDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations();
  const hotelId = params.hotelId as string;
  
  const [hotel, setHotel] = useState<HotelSearchResult | null>(null);
interface HotelDetailsData {
  HotelName?: string;
  StarRating?: number;
  Address?: string;
  CityName?: string;
  CountryName?: string;
  Images?: Array<{ Url: string }>;
  Facilities?: string[];
  Description?: string;
  Phone?: string;
}

  const [hotelDetails, setHotelDetails] = useState<HotelDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<HotelOption | null>(null);
  const [searchParams, setSearchParams] = useState<SavedSearch | null>(null);
  const [policies, setPolicies] = useState<HotelPoliciesResponse | null>(null);
  
  const { fetchPolicies, loading: policiesLoading } = useHotelPolicies();

  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        // Get search params from localStorage
        const savedSearch = localStorage.getItem('hotelSearch');
        if (!savedSearch) {
          router.push('/');
          return;
        }

        const parsedSearch: SavedSearch = JSON.parse(savedSearch);
        setSearchParams(parsedSearch);

        // Calculate nights
        if (!parsedSearch.guests.nights) {
          parsedSearch.guests.nights = calculateNights(
            parsedSearch.dates.checkIn,
            parsedSearch.dates.checkOut
          );
        }

        const selectedHotel = localStorage.getItem('selectedHotel');
        if (selectedHotel) {
          const parsedHotel = JSON.parse(selectedHotel) as HotelSearchResult;
          if (parsedHotel.HotelId === parseInt(hotelId)) {
            setHotel(parsedHotel);
            setHotelDetails({
              HotelName: parsedHotel.HotelName,
              StarRating: parsedHotel.StarRating,
              Address: parsedHotel.Address,
              CityName: parsedHotel.CityName,
              CountryName: parsedHotel.CountryName,
              Images: parsedHotel.Images || [],
              Facilities: parsedHotel.Facilities || [],
            });
            setLoading(false);
            return;
          }
        }

        // Fetch hotel details first using GetHotelDetails
        const detailsResponse = await fetch('/api/travellanda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            RequestType: 'GetHotelDetails',
            HotelIds: [parseInt(hotelId)],
          }),
        });

        if (!detailsResponse.ok) {
          throw new Error('Failed to fetch hotel details');
        }

        const detailsData = await detailsResponse.json();
        if (detailsData.Hotels?.[0]) {
          const details = detailsData.Hotels[0];
          setHotelDetails({
            HotelName: details.HotelName,
            StarRating: parseFloat(details.StarRating) || 0,
            Address: details.Address,
            CityName: details.CityName,
            CountryName: details.CountryName,
            Images: details.Images?.map((img: { Url: string; Description?: string }) => ({ 
              Url: img.Url, 
              Description: img.Description 
            })) || [],
            Facilities: details.Facilities?.map((f: { FacilityName: string }) => f.FacilityName) || [],
            Description: details.Description,
            Phone: details.PhoneNumber,
          });
        }

        // Then fetch search results to get room options
        const searchResponse = await fetch('/api/travellanda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            RequestType: 'HotelSearch',
            CityIds: [detailsData.Hotels?.[0]?.CityId],
            CheckInDate: formatDate(parsedSearch.dates.checkIn),
            CheckOutDate: formatDate(parsedSearch.dates.checkOut),
            Rooms: [{
              NumAdults: parsedSearch.guests.adults,
              Children: parsedSearch.guests.children > 0 
                ? parsedSearch.guests.childrenAges.slice(0, parsedSearch.guests.children)
                : undefined,
            }],
            Nationality: parsedSearch.nationality,
            Currency: parsedSearch.currency,
            AvailableOnly: 1,
            GetPolicies: 0,
          }),
        });

        if (!searchResponse.ok) {
          throw new Error('Failed to fetch room options');
        }

        const searchData = await searchResponse.json();
        const currentHotel = searchData.Hotels?.find(
          (h: HotelSearchResult) => h.HotelId === parseInt(hotelId)
        );
        
        if (currentHotel) {
          setHotel(currentHotel);
        } else {
          throw new Error('Hotel not found in search results');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load hotel');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelData();
  }, [hotelId, router]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const handleRoomSelect = async (option: HotelOption, _fetchedPolicies: HotelPoliciesResponse) => {
    // Ensure option has valid numeric values
    const sanitizedOption = {
      ...option,
      Price: typeof option.Price === 'number' ? option.Price : parseFloat(option.Price as unknown as string) || 0,
      Taxes: typeof option.Taxes === 'number' ? option.Taxes : parseFloat(option.Taxes as unknown as string) || 0,
      Currency: option.Currency || 'USD',
    };
    setSelectedOption(sanitizedOption);
    
    // Fetch policies for the selected option
    try {
      const hotelIdNum = parseInt(hotelId);
      const policiesData = await fetchPolicies(hotelIdNum, option.OptionId);
      setPolicies(policiesData);
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    }
  };

  const handleBookNow = () => {
    if (selectedOption && hotel && searchParams) {
      // Store complete booking data
      const bookingData = {
        hotel: {
          ...hotel,
          selectedOption,
        },
        policies,
        searchParams,
      };
      
      // Add HotelId to selectedOption for policies API
      const optionWithHotelId = {
        ...selectedOption,
        HotelId: parseInt(hotelId),
      };
      
      localStorage.setItem('bookingData', JSON.stringify(bookingData));
      localStorage.setItem('selectedOption', JSON.stringify(optionWithHotelId));
      router.push(`/${locale}/booking/review`);
    }
  };

  const nights = searchParams?.guests.nights || 1;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <HugeiconsIcon icon={LeftTriangleIcon} className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('hotelDetails.errorLoading')}</h2>
            <p className="text-red-500 mb-6">{error || t('hotelDetails.notFound')}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline">
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

  // Filter valid images only
  const allImages = hotelDetails?.Images || hotel.Images || [];
  const validImages = allImages.filter((img: { Url?: string }) => img?.Url && img.Url.trim() !== '');

  const displayData = {
    ...hotel,
    ...hotelDetails,
    HotelName: hotel.HotelName || hotelDetails?.HotelName,
    StarRating: hotel.StarRating || hotelDetails?.StarRating,
    Address: hotel.Address || hotelDetails?.Address,
    CityName: hotel.CityName || hotelDetails?.CityName,
    Images: validImages,
    Facilities: hotelDetails?.Facilities || hotel.Facilities || [],
    Description: hotelDetails?.Description || 'No description available.',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-4">
        <BookingBreadcrumb currentStep="hotel" hotelName={displayData.HotelName} />
      </div>

      {/* Back Button */}
      <Button 
        variant="ghost" 
        className="mb-6 -ml-2"
        onClick={() => router.back()}
      >
        <HugeiconsIcon icon={ArrowLeftIcon} className="mr-2 h-4 w-4" />
        {t('hotelDetails.backToResults')}
      </Button>

      {/* Hotel Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold">{displayData.HotelName}</h1>
          {displayData.StarRating && displayData.StarRating > 0 && (
            <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg">
              <HugeiconsIcon icon={StarIcon} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold">{displayData.StarRating} {t('hotels.starHotel')}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <HugeiconsIcon icon={MapPinIcon} className="h-4 w-4" />
          <span>{displayData.Address}, {displayData.CityName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Hotel Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image Gallery */}
          {displayData.Images && displayData.Images.length > 0 && (
            <HotelImageGallery 
              images={displayData.Images} 
              hotelName={displayData.HotelName || ''}
            />
          )}

          {/* Room Selector */}
          {hotel.Options && hotel.Options.length > 0 && (
            <RoomSelector
              options={hotel.Options}
              currency={hotel.Options[0]?.Currency || 'USD'}
              onSelect={handleRoomSelect}
              nights={nights}
              selectedOptionId={selectedOption?.OptionId}
              isLoadingPolicies={policiesLoading}
            />
          )}

          {/* Hotel Details Tabs */}
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="description">{t('hotelDetails.description')}</TabsTrigger>
              <TabsTrigger value="facilities">{t('hotelDetails.facilities')}</TabsTrigger>
              <TabsTrigger value="location">{t('hotelDetails.location')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('hotelDetails.aboutHotel')}</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {displayData.Description}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="facilities" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('hotelDetails.hotelFacilities')}</h3>
                  {displayData.Facilities && displayData.Facilities.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {displayData.Facilities.map((facility: string, index: number) => (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="justify-center py-2 text-sm"
                        >
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{t('hotelDetails.noFacilities')}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="location" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('hotelDetails.location')}</h3>
                  <div className="space-y-3">
                    <p><strong>{t('hotelDetails.address')}:</strong> {displayData.Address}</p>
                    <p><strong>{t('hotelDetails.city')}:</strong> {displayData.CityName}</p>
                    <p><strong>{t('hotelDetails.country')}:</strong> {displayData.CountryName || hotel.CountryName}</p>
                    {hotelDetails?.Phone && (
                      <p className="flex items-center gap-2">
                        <HugeiconsIcon icon={AiPhoneIcon} className="h-4 w-4 text-muted-foreground" />
                        <strong>{t('hotelDetails.phone')}:</strong> {hotelDetails.Phone}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Booking Card */}
        <div>
          <Card className="sticky top-8">
            <CardContent className="p-6">
              {selectedOption ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-2">{selectedOption.RoomType || 'Room'}</h3>
                    <p className="text-muted-foreground">{selectedOption.BoardType || ''}</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {(() => {
                      const price = typeof selectedOption.Price === 'number' && !isNaN(selectedOption.Price) 
                        ? selectedOption.Price 
                        : 0;
                      const taxes = typeof selectedOption.Taxes === 'number' && !isNaN(selectedOption.Taxes) 
                        ? selectedOption.Taxes 
                        : 0;
                      const currency = selectedOption.Currency || 'USD';
                      
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {formatCurrency(price, currency)} x {nights} nights
                            </span>
                            <span>{formatCurrency(price * nights, currency)}</span>
                          </div>
                          {taxes > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{t('hotelDetails.taxesFees')}</span>
                              <span>{formatCurrency(taxes, currency)}</span>
                            </div>
                          )}
                          <div className="border-t pt-3">
                            <div className="flex justify-between font-bold text-lg">
                              <span>{t('booking.total')}</span>
                              <span>
                                {formatCurrency((price + taxes) * nights, currency)}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Cancellation Policy Preview */}
                  {policies?.CancellationDeadline && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>{t('hotelDetails.freeCancellationUntil')}</strong> {new Date(policies.CancellationDeadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {policies?.Alerts && policies.Alerts.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      {policies.Alerts.map((alert, idx) => (
                        <p key={idx} className="text-sm text-amber-800">
                          <strong>{alert.Type}:</strong> {alert.Description}
                        </p>
                      ))}
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleBookNow}
                    disabled={!selectedOption}
                  >
                    {t('hotelDetails.bookNow')}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    {t('hotelDetails.wontBeCharged')}
                  </p>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {hotel.Options?.length === 0 
                      ? t('hotelDetails.noRoomsAvailable')
                      : t('hotelDetails.selectRoomToContinue')
                    }
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/')}
                  >
                    {t('hotelDetails.modifySearch')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
