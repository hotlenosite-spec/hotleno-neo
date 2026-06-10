"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  TriangleIcon,
  UserIcon,
  BedIcon
} from "@hugeicons/core-free-icons";
import type { HotelOption, HotelPoliciesResponse } from "@/types/travellanda";
import { formatCurrency } from "@/hooks/use-hotels-enhanced";

interface RoomSelectorProps {
  options: HotelOption[];
  currency: string;
  onSelect: (option: HotelOption, policies: HotelPoliciesResponse) => void;
  nights: number;
  selectedOptionId?: number;
  isLoadingPolicies?: boolean;
  supplier?: string;
  roomOccupancies?: Array<{
    adults: number;
    children: number;
    childrenAges?: number[];
  }>;
}

interface RoomOptionCardProps {
  option: HotelOption;
  currency: string;
  nights: number;
  isSelected: boolean;
  onSelect: () => void;
  isLoadingPolicies: boolean;
}

function toNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getOptionSelectedRoom(
  option: HotelOption,
  roomIndex: number,
  occupancy: { adults: number; children: number; childrenAges?: number[] },
) {
  const source = option.hotelbedsSelectedRooms?.[0];

  return {
    roomIndex,
    adults: Math.max(1, toNumber(occupancy.adults, 1)),
    children: Math.max(0, toNumber(occupancy.children)),
    childAges: (occupancy.childrenAges || []).slice(0, Math.max(0, toNumber(occupancy.children))),
    roomCode: source?.roomCode || "",
    roomName: source?.roomName || option.RoomName || option.RoomType || "Hotelbeds room",
    boardCode: source?.boardCode || "",
    boardName: source?.boardName || option.BoardName || option.BoardType || "",
    rateKey: source?.rateKey || option.supplierRateKey || option.rateKey || option.BookingCode || "",
    price: toNumber(source?.price ?? option.Price),
    currency: source?.currency || option.Currency || "",
  };
}

function optionMatchesOccupancy(
  option: HotelOption,
  occupancy: { adults: number; children: number },
) {
  const source = option.hotelbedsSelectedRooms?.[0];
  if (!source) return false;

  return (
    toNumber(source.adults, 1) === Math.max(1, toNumber(occupancy.adults, 1)) &&
    toNumber(source.children) === Math.max(0, toNumber(occupancy.children))
  );
}

function compositeOptionId(options: HotelOption[]) {
  return options.reduce((hash, option) => {
    const value = String(option.OptionId || option.rateKey || option.supplierRateKey || "");
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) % 900000;
    }
    return hash;
  }, 100000);
}

function buildHotelbedsMultiRoomOption(
  selectedByRoom: Record<number, HotelOption>,
  roomOccupancies: NonNullable<RoomSelectorProps["roomOccupancies"]>,
): HotelOption {
  const selectedOptions = roomOccupancies.map((_, roomIndex) => selectedByRoom[roomIndex]);
  const baseOption = selectedOptions[0];
  const selectedRooms = selectedOptions.map((option, roomIndex) =>
    getOptionSelectedRoom(option, roomIndex, roomOccupancies[roomIndex]),
  );
  const price = selectedOptions.reduce((sum, option) => sum + toNumber(option.Price), 0);
  const taxes = selectedOptions.reduce((sum, option) => sum + toNumber(option.Taxes), 0);
  const roomNames = selectedRooms.map((room) => room.roomName).filter(Boolean);

  return {
    ...baseOption,
    OptionId: compositeOptionId(selectedOptions),
    rateKey: selectedRooms[0]?.rateKey || baseOption.rateKey,
    supplierRateKey: selectedRooms[0]?.rateKey || baseOption.supplierRateKey,
    BookingCode: selectedRooms[0]?.rateKey || baseOption.BookingCode,
    hotelbedsSelectedRooms: selectedRooms,
    RoomType: roomNames.join(" + ") || baseOption.RoomType,
    RoomName: roomNames.join(" + ") || baseOption.RoomName,
    Rooms: selectedRooms.map((room) => ({
      RoomId: room.roomIndex + 1,
      RoomName: room.roomName,
      NumAdults: room.adults,
      NumChildren: room.children,
      RoomPrice: room.price || 0,
    })),
    Adults: selectedRooms.reduce((sum, room) => sum + room.adults, 0),
    Children: selectedRooms.reduce((sum, room) => sum + room.children, 0),
    Price: price,
    TotalPrice: price,
    Taxes: taxes,
    Currency: baseOption.Currency,
  };
}

function asCleanTextArray(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];

  return values.flatMap((item): string[] => {
    if (Array.isArray(item)) return asCleanTextArray(item);
    if (typeof item === "string") return item.trim() ? [item.trim()] : [];
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const label = String(
      record.Description ||
        record.Name ||
        record.Type ||
        record.Policy ||
        record.Text ||
        "",
    ).trim();
    const price = toNumber(record.Price || record.Amount || record.Value);
    const currency = typeof record.Currency === "string" ? record.Currency.trim() : "";
    const priceText = price > 0 ? `${currency ? `${currency} ` : ""}${price}` : "";
    const text = [label, priceText].filter(Boolean).join(" - ");

    return text ? [text] : [];
  });
}

function RoomOptionCard({
  option,
  currency,
  nights,
  isSelected,
  onSelect,
  isLoadingPolicies
}: RoomOptionCardProps) {
  const t = useTranslations();
  
  // Sanitize price values
  const price = typeof option.Price === 'number' && !isNaN(option.Price) 
    ? option.Price 
    : parseFloat(option.Price as unknown as string) || 0;
  const taxes = typeof option.Taxes === 'number' && !isNaN(option.Taxes) 
    ? option.Taxes 
    : parseFloat(option.Taxes as unknown as string) || 0;
  const safeCurrency = currency || 'USD';
  
  const totalPrice = (price + taxes) * nights;
  const pricePerNight = price + taxes;
  const tboDetailGroups = [
    { title: t("booking.tbo.inclusions"), items: asCleanTextArray(option.inclusions) },
    { title: t("booking.tbo.promotions"), items: asCleanTextArray(option.roomPromotions) },
    { title: t("booking.tbo.supplements"), items: asCleanTextArray(option.supplements) },
    { title: t("booking.tbo.rateConditions"), items: asCleanTextArray(option.rateConditions) },
    { title: t("booking.tbo.amenities"), items: asCleanTextArray(option.amenities) },
  ].filter((group) => group.items.length > 0);
  
  return (
    <Card 
      className={`cursor-pointer border-slate-200 transition-all duration-200 hover:border-orange-200 hover:shadow-md ${
        isSelected ? 'border-[#F97316] bg-orange-50/50 ring-2 ring-[#F97316]' : 'bg-white'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {/* Selection Indicator */}
          <div
            className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
              isSelected ? 'border-[#F97316] bg-[#F97316]' : 'border-slate-300 bg-white'
            }`}
          >
            {isSelected && (
              <div className="w-3 h-3 rounded-full bg-white" />
            )}
          </div>

          {/* Room Details */}
          <div className="flex-1">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-lg font-black text-[#0F172A]">
                  {option.RoomType || option.RoomName || t("hotels.standardRoom")}
                </h4>
                {option.BoardType && (
                  <p className="mt-1 text-sm text-muted-foreground">{option.BoardType}</p>
                )}
              </div>
              
              <div className="text-end">
                <div className="text-2xl font-black text-[#F97316]">
                  {formatCurrency(totalPrice, safeCurrency)}
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  {formatCurrency(pricePerNight, safeCurrency)} {t('hotels.perNight')}
                </p>
              </div>
            </div>

            {/* Room Configuration */}
            <div className="flex flex-wrap gap-2 mb-3">
              {option.Rooms.map((room, idx) => (
                <Badge key={idx} variant="secondary" className="flex max-w-full items-center gap-1 py-1.5">
                  <HugeiconsIcon icon={BedIcon} className="h-3 w-3" />
                  {room.RoomName}
                  <span className="text-xs">
                    ({room.NumAdults} <HugeiconsIcon icon={UserIcon} className="h-3 w-3 inline" />
                    {room.NumChildren > 0 && ` + ${room.NumChildren} ${t("hotelDetails.children")}`})
                  </span>
                </Badge>
              ))}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {option.OnRequest === 1 ? (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <HugeiconsIcon icon={InformationCircleIcon} className="h-3 w-3 mr-1" />
                  {t('hotels.onRequest')}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3 w-3 mr-1" />
                  {t('hotels.available')}
                </Badge>
              )}

              {option.IsNonRefundable ? (
                <Badge variant="destructive">
                  <HugeiconsIcon icon={TriangleIcon} className="h-3 w-3 mr-1" />
                  {t('hotels.nonRefundable')}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {t('hotels.freeCancellation')}
                </Badge>
              )}
            </div>

            {(option.rspPrice || tboDetailGroups.length > 0) && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {option.rspPrice ? (
                  <p className="mb-2 text-xs text-slate-700">
                    <span className="font-bold">{t("booking.tbo.rspPrice")}:</span>{" "}
                    {option.Currency || safeCurrency} {option.rspPrice}
                  </p>
                ) : null}
                <div className="space-y-2">
                  {tboDetailGroups.map((group) => (
                    <div key={group.title}>
                      <p className="mb-1 text-xs font-bold text-[#0F172A]">{group.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item) => (
                          <Badge key={`${group.title}-${item}`} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isSelected && isLoadingPolicies && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              {t('hotelDetails.loadingPolicies')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RoomSelector({
  options,
  currency,
  onSelect,
  nights,
  selectedOptionId,
  isLoadingPolicies = false,
  supplier,
  roomOccupancies = [],
}: RoomSelectorProps) {
  const t = useTranslations();
  const [selectedId, setSelectedId] = useState<string>(selectedOptionId?.toString() || "");
  const [selectedByRoom, setSelectedByRoom] = useState<Record<number, HotelOption>>({});
  const [_showPolicies, _setShowPolicies] = useState(false);
  const [_selectedOption, _setSelectedOption] = useState<HotelOption | null>(null);
  const isHotelbedsMultiRoom =
    supplier === "hotelbeds" && roomOccupancies.length > 1;

  const handleSelect = (option: HotelOption, roomIndex?: number) => {
    if (isHotelbedsMultiRoom && roomIndex !== undefined) {
      setSelectedByRoom((current) => {
        const next = { ...current, [roomIndex]: option };
        const isComplete = roomOccupancies.every((_, index) => Boolean(next[index]));

        if (isComplete) {
          const compositeOption = buildHotelbedsMultiRoomOption(next, roomOccupancies);
          setSelectedId(compositeOption.OptionId.toString());
          _setSelectedOption(compositeOption);
          onSelect(compositeOption, {} as HotelPoliciesResponse);
        }

        return next;
      });
      return;
    }

    setSelectedId(option.OptionId.toString());
    _setSelectedOption(option);
    // Fetch policies before confirming selection
    onSelect(option, {} as HotelPoliciesResponse);
  };

  // Group options by room type
  const groupedOptions = options.reduce((acc, option) => {
    const key = option.RoomType || option.RoomName || 'Standard';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(option);
    return acc;
  }, {} as Record<string, HotelOption[]>);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-2xl font-black text-[#0F172A]">{t('hotelDetails.selectYourRoom')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('hotelDetails.roomOptions', { count: options.length, nights })}
        </p>
      </div>

      {isHotelbedsMultiRoom ? (
        <div className="space-y-6">
          {roomOccupancies.map((occupancy, roomIndex) => {
            const roomOptions = options.filter((option) =>
              optionMatchesOccupancy(option, occupancy),
            );

            return (
              <div key={roomIndex} className="space-y-3">
                <h4 className="font-semibold text-lg text-muted-foreground">
                  {t("booking.room")} {roomIndex + 1} - {occupancy.adults}{" "}
                  {t("hotelDetails.adults")}
                  {occupancy.children > 0
                    ? ` + ${occupancy.children} ${t("hotelDetails.children")}`
                    : ""}
                </h4>
                {roomOptions.map((option) => {
                  const isOptionSelected =
                    selectedByRoom[roomIndex]?.OptionId === option.OptionId;
                  return (
                    <RoomOptionCard
                      key={`${roomIndex}-${option.OptionId}`}
                      option={option}
                      currency={currency}
                      nights={nights}
                      isSelected={isOptionSelected}
                      onSelect={() => handleSelect(option, roomIndex)}
                      isLoadingPolicies={isOptionSelected && isLoadingPolicies}
                    />
                  );
                })}
                {roomOptions.length === 0 ? (
                  <Card>
                    <CardContent className="p-5 text-sm font-bold text-red-700">
                      الغرفة المختارة لا تدعم عدد الغرف المطلوب أو لم تعد متاحة بالكمية المطلوبة. يرجى اختيار عرض آخر.
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
      <div className="space-y-4">
        {Object.entries(groupedOptions).map(([roomType, roomOptions]) => (
          <div key={roomType} className="space-y-3">
            <h4 className="font-semibold text-lg text-muted-foreground">{roomType}</h4>
            {roomOptions.map((option) => {
              const isOptionSelected = selectedId === option.OptionId.toString();
              return (
                <RoomOptionCard
                  key={option.OptionId}
                  option={option}
                  currency={currency}
                  nights={nights}
                  isSelected={isOptionSelected}
                  onSelect={() => handleSelect(option)}
                  isLoadingPolicies={isOptionSelected && isLoadingPolicies}
                />
              );
            })}
          </div>
        ))}
      </div>
      )}

      {options.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t('hotelDetails.noRoomsAvailable')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Compact room selector for hotel cards
interface CompactRoomSelectorProps {
  options: HotelOption[];
  currency: string;
  onSelect: (option: HotelOption) => void;
  nights: number;
}

export function CompactRoomSelector({ options, currency, onSelect, nights }: CompactRoomSelectorProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  
  // Get the best option (lowest price, refundable if possible)
  const bestOption = options.reduce((best, current) => {
    const currentPrice = current.Price + (current.Taxes || 0);
    const bestPrice = best.Price + (best.Taxes || 0);
    
    if (currentPrice < bestPrice) return current;
    if (currentPrice === bestPrice && !current.IsNonRefundable && best.IsNonRefundable) {
      return current;
    }
    return best;
  }, options[0]);

  const totalPrice = (bestOption.Price + (bestOption.Taxes || 0)) * nights;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">
            {formatCurrency(totalPrice, currency)}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('hotels.for')} {nights} {nights !== 1 ? t('hotels.nights') : t('hotels.night')}
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">{t('hotels.viewOptions', { count: options.length })}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('hotelDetails.selectRoomTitle')}</DialogTitle>
            </DialogHeader>
            <RoomSelector
              options={options}
              currency={currency}
              onSelect={(option) => {
                onSelect(option);
                setIsOpen(false);
              }}
              nights={nights}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {!bestOption.IsNonRefundable && (
          <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
            {t('hotels.freeCancellation')}
          </Badge>
        )}
        {bestOption.OnRequest === 1 && (
          <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
            {t('hotels.onRequest')}
          </Badge>
        )}
      </div>
    </div>
  );
}
