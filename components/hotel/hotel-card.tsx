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

function getOptionInclusions(option?: HotelOption) {
  return (option?.inclusions || [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

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
  
  const getOptionTotal = (option?: HotelOption) => {
    if (!option) return 0;
    if (typeof option.supplierTotalFare === "number" && Number.isFinite(option.supplierTotalFare)) {
      return option.supplierTotalFare;
    }
    if (typeof option.TotalPrice === "number" && Number.isFinite(option.TotalPrice)) {
      return option.TotalPrice;
    }
    const price = Number(option.Price || 0);
    const taxes = Number(option.Taxes || 0);
    return Number.isFinite(price + taxes) ? price + taxes : 0;
  };

  // Find the best option (lowest total returned by the supplier)
  const bestOption = hotel.Options?.reduce((best: HotelOption, current: HotelOption) => {
    const currentPrice = getOptionTotal(current);
    const bestPrice = getOptionTotal(best);
    return currentPrice < bestPrice ? current : best;
  }, hotel.Options?.[0]);

  const totalPrice = getOptionTotal(bestOption);
  const hotelCurrency = (hotel as HotelSearchResult & { Currency?: string }).Currency;
  const displayCurrency =
    bestOption?.hotelbedsPackage?.currency ||
    bestOption?.Currency ||
    hotelCurrency ||
    currency;
  const hasExplicitTotal =
    bestOption?.supplierTotalFare !== undefined || bestOption?.TotalPrice !== undefined;
  const perNightPrice =
    hasExplicitTotal && nights > 0 ? totalPrice / nights : undefined;
  const bestOptionInclusions = getOptionInclusions(bestOption);

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
    <Card className="group overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-950/5">
      <div className="flex flex-col md:flex-row">
        {/* Hotel Image */}
        <div className="md:w-2/5 lg:w-1/3 relative">
          <div className="relative h-56 min-h-[220px] bg-slate-100 md:h-full">
            {imagesLoading ? (
              <Skeleton className="absolute inset-0" />
            ) : images.length > 0 ? (
              <>
                <Image
                  src={mainImage}
                  alt={hotel.HotelName}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 40vw"
                  priority
                />
                {/* Image overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                <div className="text-center text-muted-foreground">
                  <HugeiconsIcon icon={Image01Icon} className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <span className="text-sm">{t('hotels.noImage')}</span>
                </div>
              </div>
            )}
            
            {/* Star Rating Badge */}
            {hotel.StarRating > 0 && (
              <div className="absolute start-3 top-3 flex items-center gap-1 rounded-lg bg-[#F97316] px-2.5 py-1 text-white shadow-lg">
                <HugeiconsIcon icon={StarIcon} className="h-3.5 w-3.5 fill-current" />
                <span className="text-sm font-semibold">{hotel.StarRating}</span>
              </div>
            )}
            
            {/* Image count badge if multiple images */}
            {!imagesLoading && images.length > 1 && (
              <div className="absolute bottom-3 start-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
                <HugeiconsIcon icon={Image01Icon} className="h-3 w-3" />
                {images.length} {t('hotels.photos')}
              </div>
            )}

          </div>
        </div>

        {/* Hotel Details */}
        <div className="md:w-3/5 lg:w-2/3">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-stretch">
              {/* Left Column - Hotel Info */}
              <div className="flex-1 min-w-0">
                <h3 className="mb-2 line-clamp-2 text-xl font-black leading-7 text-[#0F172A]" title={hotel.HotelName}>
                  {hotel.HotelName}
                </h3>
                
                <div className="flex items-center gap-2 mb-3">
                  <HugeiconsIcon icon={MapPinIcon} className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    {[hotel.Address || hotel.CityName, hotel.CountryName]
                      .filter(Boolean)
                      .join(", ") || t("hotels.locationUnavailable")}
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
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold text-[#0F172A]">
                      {bestOption.RoomType || bestOption.RoomName || t('hotels.standardRoom')}
                    </p>
                    {bestOption.BoardType && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bestOption.BoardType}
                      </p>
                    )}
                    {bestOptionInclusions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {bestOptionInclusions.slice(0, 3).map((inclusion) => (
                          <Badge
                            key={inclusion}
                            variant="outline"
                            className="border-green-200 bg-green-50 text-xs font-bold text-green-700"
                          >
                            {inclusion}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Price & CTA */}
              <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 md:min-w-[215px] md:max-w-[240px] md:text-end">
                {/* Availability & Refund Badges */}
                <div className="mb-4 flex flex-wrap gap-2 md:justify-end">
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
                  <div className="text-3xl font-black text-[#F97316]">
                    {formatCurrency(totalPrice, displayCurrency)}
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#0F172A]">
                    {hasExplicitTotal
                      ? t("hotels.totalStayPrice")
                      : t("hotels.priceReturnedBySupplier")}
                  </div>
                  {perNightPrice !== undefined && nights > 1 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(perNightPrice, displayCurrency)} {t("hotels.perNight")} •{" "}
                      {t("hotels.for")} {nights} {t("hotels.nights")}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("hotels.taxNotice")}
                  </p>
                </div>

                {/* CTA Button */}
                <Button
                  className="w-full min-w-[140px] bg-[#F97316] font-black text-white hover:bg-[#EA580C]"
                  size="lg"
                >
                  {t('hotels.viewDetails')}
                </Button>

                <p className="mt-3 flex items-start justify-center gap-1 text-xs leading-5 text-muted-foreground md:justify-end">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3 w-3 text-green-500" />
                  {t('hotels.availabilityNotice')}
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
