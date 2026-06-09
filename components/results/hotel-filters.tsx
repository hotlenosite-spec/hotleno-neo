"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  StarIcon,
  FilterRemoveIcon,
  Money03Icon,
  Hotel01Icon,
  SpoonAndForkIcon,
  Shield02Icon,
} from "@hugeicons/core-free-icons";
import type { HotelFilters } from "@/types/travellanda";
import { formatCurrency } from "@/hooks/use-hotels-enhanced";

interface HotelFiltersProps {
  filters: HotelFilters;
  onFiltersChange: (filters: HotelFilters) => void;
  minPrice: number;
  maxPrice: number;
  availableAmenities: string[];
  availableBoardTypes: string[];
  totalResults: number;
  filteredResults: number;
  currency?: string;
}

const STAR_RATINGS = [5, 4, 3, 2, 1];

const COMMON_AMENITIES = [
  "WiFi",
  "Swimming Pool",
  "Fitness Center",
  "Spa",
  "Restaurant",
  "Bar",
  "Parking",
  "Air Conditioning",
  "Room Service",
  "Business Center",
  "Concierge",
  "Laundry",
];

const BOARD_TYPES = [
  { value: "Room Only", labelKey: "roomOnly" },
  { value: "Bed and Breakfast", labelKey: "bedAndBreakfast" },
  { value: "Half Board", labelKey: "halfBoard" },
  { value: "Full Board", labelKey: "fullBoard" },
  { value: "All Inclusive", labelKey: "allInclusive" },
];

export function HotelFiltersPanel({
  filters,
  onFiltersChange,
  minPrice,
  maxPrice,
  availableAmenities,
  availableBoardTypes,
  totalResults,
  filteredResults,
  currency = "USD",
}: HotelFiltersProps) {
  const t = useTranslations("hotels");
  // Local state for price slider - sync with filters prop
  const localPriceRange: [number, number] =
    filters.priceRange[1] === Infinity
      ? [minPrice, maxPrice]
      : (filters.priceRange as [number, number]);

  const handlePriceChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      priceRange: [value[0], value[1]] as [number, number],
    });
  };

  const toggleStarRating = (rating: number) => {
    const newRatings = filters.starRatings.includes(rating)
      ? filters.starRatings.filter((r) => r !== rating)
      : [...filters.starRatings, rating];

    onFiltersChange({
      ...filters,
      starRatings: newRatings,
    });
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];

    onFiltersChange({
      ...filters,
      amenities: newAmenities,
    });
  };

  const toggleBoardType = (boardType: string) => {
    const newBoardTypes = filters.boardTypes.includes(boardType)
      ? filters.boardTypes.filter((b) => b !== boardType)
      : [...filters.boardTypes, boardType];

    onFiltersChange({
      ...filters,
      boardTypes: newBoardTypes,
    });
  };

  const toggleRefundable = () => {
    onFiltersChange({
      ...filters,
      refundableOnly: !filters.refundableOnly,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      priceRange: [minPrice, maxPrice],
      starRatings: [],
      amenities: [],
      boardTypes: [],
      refundableOnly: false,
    });
  };

  const hasActiveFilters =
    filters.starRatings.length > 0 ||
    filters.amenities.length > 0 ||
    filters.boardTypes.length > 0 ||
    filters.refundableOnly ||
    filters.priceRange[0] > minPrice ||
    (filters.priceRange[1] !== Infinity && filters.priceRange[1] < maxPrice);

  const activeFiltersCount =
    filters.starRatings.length +
    filters.amenities.length +
    filters.boardTypes.length +
    (filters.refundableOnly ? 1 : 0) +
    (filters.priceRange[0] > minPrice ||
    (filters.priceRange[1] !== Infinity && filters.priceRange[1] < maxPrice)
      ? 1
      : 0);

  return (
    <Card className="sticky top-4 overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-black text-[#0F172A]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#F97316]">
              <HugeiconsIcon icon={FilterRemoveIcon} className="h-5 w-5" />
            </span>
            {t("filters")}
            {activeFiltersCount > 0 && (
              <Badge className="bg-[#F97316] text-white hover:bg-[#F97316]">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="font-bold text-[#F97316] hover:bg-orange-50 hover:text-[#EA580C]"
            >
              {t("clearAll")}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("showing")} {filteredResults} {t("of")} {totalResults}{" "}
          {t("propertiesFound")}
        </p>
      </CardHeader>

      <CardContent className="space-y-6 p-5">
        <Accordion
          type="multiple"
          defaultValue={["price", "stars"]}
          className="w-full"
        >
          {/* Price Range */}
          <AccordionItem value="price">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Money03Icon} className="h-4 w-4" />
                <span>{t("priceRange")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6 pt-4">
                {/* Price Display */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {t("min")}
                    </Label>
                    <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                      {formatCurrency(localPriceRange[0], currency)}
                    </div>
                  </div>
                  <div className="text-muted-foreground">-</div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {t("max")}
                    </Label>
                    <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                      {formatCurrency(localPriceRange[1], currency)}
                    </div>
                  </div>
                </div>

                {/* Dual Slider */}
                <div className="px-1">
                  <Slider
                    value={[localPriceRange[0], localPriceRange[1]]}
                    min={minPrice}
                    max={maxPrice}
                    step={Math.max(1, Math.round((maxPrice - minPrice) / 50))}
                    onValueChange={handlePriceChange}
                    className="w-full"
                  />
                </div>

                {/* Range Labels */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(minPrice, currency)}</span>
                  <span>{formatCurrency(maxPrice, currency)}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Star Rating */}
          <AccordionItem value="stars">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={StarIcon} className="h-4 w-4" />
                <span>{t("starRatingFilter")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {STAR_RATINGS.map((rating) => (
                  <div
                    key={rating}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 transition ${
                      filters.starRatings.includes(rating) ? "bg-orange-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <Checkbox
                      id={`star-${rating}`}
                      checked={filters.starRatings.includes(rating)}
                      onCheckedChange={() => toggleStarRating(rating)}
                    />
                    <Label
                      htmlFor={`star-${rating}`}
                      className="flex items-center gap-1 text-sm cursor-pointer"
                    >
                      {Array.from({ length: rating }).map((_, i) => (
                        <HugeiconsIcon
                          key={i}
                          icon={StarIcon}
                          className="h-4 w-4 text-yellow-500 fill-yellow-500"
                        />
                      ))}
                      <span className="ml-1">
                        {rating} {t("starRating")}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Amenities */}
          <AccordionItem value="amenities">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Hotel01Icon} className="h-4 w-4" />
                <span>{t("amenities")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2 max-h-48 overflow-y-auto">
                {(availableAmenities.length > 0
                  ? availableAmenities
                  : COMMON_AMENITIES
                ).map((amenity) => (
                  <div
                    key={amenity}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 transition ${
                      filters.amenities.includes(amenity) ? "bg-orange-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <Checkbox
                      id={`amenity-${amenity}`}
                      checked={filters.amenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <Label
                      htmlFor={`amenity-${amenity}`}
                      className="text-sm cursor-pointer"
                    >
                      {amenity}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Board Type */}
          <AccordionItem value="board">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={SpoonAndForkIcon} className="h-4 w-4" />
                <span>{t("mealPlan")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {(availableBoardTypes.length > 0
                  ? BOARD_TYPES.filter((b) =>
                      availableBoardTypes.includes(b.value),
                    )
                  : BOARD_TYPES
                ).map((board) => (
                  <div
                    key={board.value}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 transition ${
                      filters.boardTypes.includes(board.value) ? "bg-orange-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <Checkbox
                      id={`board-${board.value}`}
                      checked={filters.boardTypes.includes(board.value)}
                      onCheckedChange={() => toggleBoardType(board.value)}
                    />
                    <Label
                      htmlFor={`board-${board.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {t(`boardTypes.${board.labelKey}`)}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Refundable Only */}
          <AccordionItem value="refundable">
            <div className="py-4">
              <div
                className={`flex items-center gap-2 rounded-lg px-2 py-2 transition ${
                  filters.refundableOnly ? "bg-orange-50" : "hover:bg-slate-50"
                }`}
              >
                <Checkbox
                  id="refundable-only"
                  checked={filters.refundableOnly}
                  onCheckedChange={toggleRefundable}
                />
                <Label
                  htmlFor="refundable-only"
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <HugeiconsIcon icon={Shield02Icon} className="h-4 w-4" />
                  {t("freeCancellationOnly")}
                </Label>
              </div>
            </div>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// Mobile filter button with sheet
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileFiltersProps extends HotelFiltersProps {
  children: React.ReactNode;
}

export function MobileHotelFilters({ children, ...props }: MobileFiltersProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("hotels");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left" className="w-full sm:w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("filters")}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <HotelFiltersPanel {...props} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={() => setOpen(false)}>
            {t("showResults", { count: props.filteredResults })}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
