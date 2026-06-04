"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  StarIcon,
  MapPinIcon,
  WifiIcon,
  CarIcon,
  SwimmingIcon,
  DumbbellIcon,
  SpoonIcon,
  CoffeeIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  TriangleIcon,
  Image01Icon,
} from "@hugeicons/core-free-icons";
import type { HotelSearchResult, HotelOption, HotelImage } from "@/types/travellanda";
import { formatCurrency } from "@/hooks/use-hotels-enhanced";
import { hasTboSupplierOffer, isTboCertificationMode } from "@/lib/hotels/tbo-mode";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

interface HotelCardProps {
  hotel: HotelSearchResult;
  currency: string;
  nights?: number;
}

// Map amenities to icons
const AMENITY_ICONS: Record<string, typeof WifiIcon> = {
  'WiFi': WifiIcon,
  'Internet': WifiIcon,
  'Parking': CarIcon,
  'Swimming Pool': SwimmingIcon,
  'Pool': SwimmingIcon,
  'Fitness Center': DumbbellIcon,
  'Gym': DumbbellIcon,
  'Restaurant': SpoonIcon,
  'Dining': SpoonIcon,
  'Bar': CoffeeIcon,
  'Spa': CoffeeIcon,
};

// Default hotel placeholder image
const HOTEL_PLACEHOLDER = '/hotel-image-placeholder.jpg';

export function HotelCard({ hotel, currency, nights = 1 }: HotelCardProps) {
  const t = useTranslations();
  const [images, setImages] = useState<HotelImage[]>(hotel.Images || []);
  const [imagesLoading, setImagesLoading] = useState(
    !(hotel.Images && hotel.Images.length > 0),
  );
  
  // Fetch hotel details for images
  useEffect(() => {
    let cancelled = false;
    const shouldSkipExternalImageFetch =
      isTboCertificationMode() || hasTboSupplierOffer(hotel);

    if (hotel.Images && hotel.Images.length > 0) {
      setImages(hotel.Images);
      setImagesLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (shouldSkipExternalImageFetch) {
      setImages([]);
      setImagesLoading(false);
      return () => {
        cancelled = true;
      };
    }
    
    async function fetchHotelImages() {
      try {
        const response = await fetch('/api/travellanda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            RequestType: 'GetHotelDetails',
            HotelIds: [hotel.HotelId],
          }),
        });

        if (!response.ok) {
          if (!cancelled) setImages([]);
          return;
        }

        const data = await response.json();
        
        if (!cancelled && data.Hotels?.[0]?.Images) {
          setImages(data.Hotels[0].Images);
        } else if (!cancelled) {
          setImages([]);
        }
      } catch {
        if (!cancelled) setImages([]);
      } finally {
        if (!cancelled) setImagesLoading(false);
      }
    }

    fetchHotelImages();
    
    return () => { cancelled = true; };
  }, [hotel]);

  const mainImage = images[0]?.Url || HOTEL_PLACEHOLDER;
  
  // Find the best option (lowest price per night)
  const bestOption = hotel.Options?.reduce((best: HotelOption, current: HotelOption) => {
    const currentPrice = (current?.Price ?? current?.TotalPrice ?? 0) + (current?.Taxes ?? 0);
    const bestPrice = (best?.Price ?? best?.TotalPrice ?? 0) + (best?.Taxes ?? 0);
    return currentPrice < bestPrice ? current : best;
  }, hotel.Options?.[0]);

  const pricePerNight = bestOption ? (bestOption.Price ?? bestOption.TotalPrice ?? 0) + (bestOption.Taxes ?? 0) : 0;
  const totalPrice = pricePerNight * nights;

  // Get facility icons
  const getFacilityIcon = (facility: string): typeof WifiIcon | null => {
    for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
      if (facility.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }
    return null;
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50">
      <div className="flex flex-col md:flex-row">
        {/* Hotel Image */}
        <div className="md:w-2/5 lg:w-1/3 relative">
          <div className="relative h-56 md:h-full min-h-[200px] bg-muted">
            {imagesLoading ? (
              <Skeleton className="absolute inset-0" />
            ) : images.length > 0 ? (
              <>
                <Image
                  src={mainImage}
                  alt={hotel.HotelName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 40vw"
                  priority
                />
                {/* Image overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center text-muted-foreground">
                  <HugeiconsIcon icon={Image01Icon} className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <span className="text-sm">{t('hotels.noImage')}</span>
                </div>
              </div>
            )}
            
            {/* Star Rating Badge */}
            {hotel.StarRating > 0 && (
              <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                <HugeiconsIcon icon={StarIcon} className="h-3.5 w-3.5 fill-current" />
                <span className="text-sm font-semibold">{hotel.StarRating}</span>
              </div>
            )}
            
            {/* Image count badge if multiple images */}
            {!imagesLoading && images.length > 1 && (
              <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded-md text-xs backdrop-blur-sm flex items-center gap-1">
                <HugeiconsIcon icon={Image01Icon} className="h-3 w-3" />
                {images.length} {t('hotels.photos')}
              </div>
            )}

          </div>
        </div>

        {/* Hotel Details */}
        <div className="md:w-3/5 lg:w-2/3">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              {/* Left Column - Hotel Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold mb-2 line-clamp-1" title={hotel.HotelName}>
                  {hotel.HotelName}
                </h3>
                
                <div className="flex items-center gap-2 mb-3">
                  <HugeiconsIcon icon={MapPinIcon} className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    {hotel.Address || hotel.CityName}
                    {hotel.CityName && hotel.CountryName && `, ${hotel.CountryName}`}
                  </span>
                </div>

                {/* Facilities with Icons */}
                {hotel.Facilities && hotel.Facilities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {hotel.Facilities.slice(0, 4).map((facility: string, index: number) => {
                      const IconComponent = getFacilityIcon(facility);
                      return (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="secondary" 
                              className="text-xs flex items-center gap-1 px-2 py-1 cursor-help"
                            >
                              {IconComponent && <HugeiconsIcon icon={IconComponent} className="h-3 w-3" />}
                              <span className="truncate max-w-[100px]">{facility}</span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{facility}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {hotel.Facilities.length > 4 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs cursor-help">
                              +{hotel.Facilities.length - 4} {t('hotels.more')}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-[200px]">
                            <p className="font-medium mb-1">{t('hotels.additionalAmenities')}:</p>
                            <ul className="text-sm">
                              {hotel.Facilities.slice(4).map((f, i) => (
                                <li key={i}>• {f}</li>
                              ))}
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}

                {/* Room Info */}
                {bestOption && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {bestOption.RoomType || bestOption.RoomName || t('hotels.standardRoom')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bestOption.BoardType}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - Price & CTA */}
              <div className="md:text-right md:pl-4 md:border-l md:border-border/50 flex flex-col justify-between min-w-[180px]">
                {/* Availability & Refund Badges */}
                <div className="flex flex-wrap gap-2 mb-3 md:justify-end">
                  {bestOption?.OnRequest === 1 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs cursor-help">
                          <HugeiconsIcon icon={InformationCircleIcon} className="h-3 w-3 mr-1" />
                          {t('hotels.onRequest')}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('hotels.onRequestTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs cursor-help">
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3 w-3 mr-1" />
                          {t('hotels.available')}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('hotels.availableTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {bestOption?.IsNonRefundable ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="destructive" className="text-xs cursor-help">
                          <HugeiconsIcon icon={TriangleIcon} className="h-3 w-3 mr-1" />
                          {t('hotels.nonRefundable')}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('hotels.nonRefundableTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs cursor-help">
                          {t('hotels.freeCancellation')}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('hotels.freeCancellationTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(totalPrice, currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(pricePerNight, currency)} {t('hotels.perNight')}
                  </div>
                  {nights > 1 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('hotels.for')} {nights} {nights === 1 ? t('hotels.night') : t('hotels.nights')}
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <Button className="w-full md:w-auto min-w-[140px]" size="lg">
                  {t('hotels.viewDetails')}
                </Button>

                {/* Price Match Guarantee */}
                <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center md:justify-end gap-1">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3 w-3 text-green-500" />
                  {t('hotels.bestPriceGuarantee')}
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
