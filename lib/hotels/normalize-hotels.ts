import type {
  SupplierHotelRate,
  SupplierHotelResult,
  SupplierProviderName,
} from "@/lib/suppliers";
import type { HotelOption, HotelSearchResult } from "@/types/travellanda";

export interface UnifiedSupplierOffer {
  supplier: SupplierProviderName;
  supplierHotelId: string;
  bestPrice: number;
  currency: string;
  rates: SupplierHotelRate[];
  rawHotel?: SupplierHotelResult;
}

export type UnifiedHotelResult = SupplierHotelResult & {
  bestPrice: number;
  currency: string;
  supplierOffers: UnifiedSupplierOffer[];
};

function normalizeText(value?: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\b(hotel|resort|suites|suite|inn|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getMergeKey(hotel: SupplierHotelResult) {
  return [
    normalizeText(hotel.hotelName),
    normalizeText(hotel.cityName),
    normalizeText(hotel.countryName),
  ].join("|");
}

function getRatePrice(rate: SupplierHotelRate) {
  return Number.isFinite(rate.price) ? rate.price : Infinity;
}

function getBestRate(rates: SupplierHotelRate[]) {
  return rates.reduce<SupplierHotelRate | null>((bestRate, rate) => {
    if (!bestRate || getRatePrice(rate) < getRatePrice(bestRate)) {
      return rate;
    }

    return bestRate;
  }, null);
}

function getRateCurrency(rate: SupplierHotelRate, fallbackCurrency: string) {
  return rate.hotelbedsPackage?.currency || rate.currency || fallbackCurrency;
}

function normalizeHotelbedsRateCurrency(rate: SupplierHotelRate, fallbackCurrency: string) {
  if (rate.hotelbedsPackage || rate.hotelbedsSelectedRooms?.length) {
    const normalizedCurrency = getRateCurrency(rate, fallbackCurrency);
    const selectedRoomCurrencies = (rate.hotelbedsSelectedRooms || [])
      .map((room) => room.currency)
      .filter(Boolean);
    const roomBreakdownCurrencies = (rate.hotelbedsPackage?.roomPriceBreakdown || [])
      .map((room) => room.currency)
      .filter(Boolean);
    const currencyMismatch =
      Boolean(normalizedCurrency) &&
      [...selectedRoomCurrencies, ...roomBreakdownCurrencies].some(
        (currency) => currency !== normalizedCurrency,
      );

    return {
      ...rate,
      currency: normalizedCurrency,
      hotelbedsSelectedRooms: rate.hotelbedsSelectedRooms?.map((room) => ({
        ...room,
        currency: normalizedCurrency,
      })),
      hotelbedsPackage: rate.hotelbedsPackage
        ? {
            ...rate.hotelbedsPackage,
            currency: normalizedCurrency,
            roomPriceBreakdown: rate.hotelbedsPackage.roomPriceBreakdown.map((room) => ({
              ...room,
              currency: normalizedCurrency,
            })),
          }
        : rate.hotelbedsPackage,
      metadata: {
        ...(rate.metadata || {}),
        hotelbedsCurrencyDiagnostics: {
          supplierCurrency: rate.currency,
          packageCurrency: rate.hotelbedsPackage?.currency,
          roomBreakdownCurrencies,
          selectedRoomCurrencies,
          normalizedCurrency,
          currencyMismatch,
          mismatchSource: currencyMismatch ? "normalize-hotels" : "",
          fixedDisplayCurrency: normalizedCurrency,
          currencyMismatchFixed: currencyMismatch,
        },
      },
    };
  }

  return {
    ...rate,
    currency: rate.currency || fallbackCurrency,
  };
}

function normalizeRates(
  rates: SupplierHotelRate[],
  fallbackCurrency: string,
): SupplierHotelRate[] {
  return rates
    .map((rate) => normalizeHotelbedsRateCurrency(rate, fallbackCurrency))
    .sort((a, b) => getRatePrice(a) - getRatePrice(b));
}

function stableNumericId(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 900000;
  }

  return 100000 + hash;
}

export function normalizeSupplierHotels(
  hotels: SupplierHotelResult[],
  targetCurrency = "",
): UnifiedHotelResult[] {
  const hotelMap = new Map<string, UnifiedHotelResult>();

  for (const hotel of hotels) {
    const supplierCurrency = (hotel as SupplierHotelResult & { currency?: string }).currency;
    const normalizedRates = normalizeRates(hotel.rates || [], targetCurrency);
    const bestRate = getBestRate(normalizedRates);
    const bestPrice = bestRate ? getRatePrice(bestRate) : Infinity;
    const currency = bestRate?.currency || supplierCurrency || targetCurrency;
    const offer: UnifiedSupplierOffer = {
      supplier: hotel.supplier,
      supplierHotelId: hotel.supplierHotelId,
      bestPrice,
      currency,
      rates: normalizedRates,
      rawHotel: hotel,
    };
    const key = getMergeKey(hotel) || `${hotel.supplier}:${hotel.supplierHotelId}`;
    const existingHotel = hotelMap.get(key);

    if (!existingHotel) {
      hotelMap.set(key, {
        ...hotel,
        hotelName: hotel.hotelName.trim(),
        cityName: hotel.cityName?.trim(),
        countryName: hotel.countryName?.trim(),
        rates: normalizedRates,
        bestPrice,
        currency,
        supplierOffers: [offer],
        metadata: {
          ...(hotel.metadata ?? {}),
          unifiedHotelKey: key,
          supplierOffers: [offer],
        },
      });
      continue;
    }

    const mergedRates = normalizeRates(
      [...existingHotel.rates, ...normalizedRates],
      targetCurrency,
    );
    const mergedBestRate = getBestRate(mergedRates);
    const mergedBestPrice = mergedBestRate ? getRatePrice(mergedBestRate) : Infinity;
    const mergedOffers = [...existingHotel.supplierOffers, offer].sort(
      (a, b) => a.bestPrice - b.bestPrice,
    );
    const bestOffer = mergedOffers[0];

    hotelMap.set(key, {
      ...existingHotel,
      supplier: bestOffer.supplier,
      supplierHotelId: bestOffer.supplierHotelId,
      rates: mergedRates,
      bestPrice: mergedBestPrice,
      currency: mergedBestRate?.currency || existingHotel.currency || targetCurrency,
      supplierOffers: mergedOffers,
      metadata: {
        ...(existingHotel.metadata ?? {}),
        unifiedHotelKey: key,
        supplierOffers: mergedOffers,
      },
    });
  }

  return Array.from(hotelMap.values()).sort((a, b) => a.bestPrice - b.bestPrice);
}

export function toLegacyHotelResult(hotel: UnifiedHotelResult): HotelSearchResult {
  const hotelId =
    typeof hotel.metadata?.legacyHotelId === "number"
      ? hotel.metadata.legacyHotelId
      : stableNumericId(`${hotel.supplier}:${hotel.supplierHotelId}`);

  const options: HotelOption[] = hotel.rates.map((rate, index) => {
    const displayRoomName = rate.hotelbedsPackage?.displayRoomName || rate.roomName;
    const totalPrice = rate.hotelbedsPackage?.totalPrice ?? rate.price;
    const optionCurrency = rate.hotelbedsPackage?.currency || rate.currency || hotel.currency;

    return {
    OptionId: stableNumericId(`${hotel.supplier}:${rate.rateKey}:${index}`),
    rateKey: rate.rateKey,
    supplier: hotel.supplier,
    supplierHotelId: hotel.supplierHotelId,
    supplierRateKey: rate.rateKey,
    hotelbedsSelectedRooms: rate.hotelbedsSelectedRooms?.map((room) => ({
      ...room,
      currency: optionCurrency,
    })),
    hotelbedsPackage: rate.hotelbedsPackage
      ? {
          ...rate.hotelbedsPackage,
          currency: optionCurrency,
          roomPriceBreakdown: rate.hotelbedsPackage.roomPriceBreakdown.map((room) => ({
            ...room,
            currency: optionCurrency,
          })),
        }
      : rate.hotelbedsPackage,
    displayRoomName,
    roomsCount: rate.hotelbedsPackage?.roomsCount || rate.hotelbedsSelectedRooms?.length || 1,
    BookingCode: rate.rateKey,
    HotelCode: hotel.supplierHotelId,
    supplierTotalFare: totalPrice,
    OnRequest: 0,
    BoardType: rate.boardName || "Room Only",
    BoardName: rate.boardName,
    RoomType: displayRoomName,
    RoomName: displayRoomName,
    Rooms: rate.hotelbedsSelectedRooms?.length
      ? rate.hotelbedsSelectedRooms.map((room) => ({
          RoomId: room.roomIndex + 1,
          RoomName: room.roomName || rate.roomName,
          NumAdults: room.adults,
          NumChildren: room.children,
          RoomPrice: room.price ?? 0,
          Currency: optionCurrency,
        }))
      : [
          {
            RoomId: index + 1,
            RoomName: rate.roomName,
            NumAdults: 2,
            NumChildren: 0,
            RoomPrice: rate.price,
            Currency: optionCurrency,
          },
        ],
    Adults: rate.hotelbedsSelectedRooms?.length
      ? rate.hotelbedsSelectedRooms.reduce((sum, room) => sum + room.adults, 0)
      : 2,
    Children: rate.hotelbedsSelectedRooms?.length
      ? rate.hotelbedsSelectedRooms.reduce((sum, room) => sum + room.children, 0)
      : 0,
    Price: totalPrice,
    TotalPrice: totalPrice,
    Taxes: 0,
    Currency: optionCurrency,
    IsNonRefundable: !rate.refundable,
    rspPrice: rate.rspPrice,
    roomPromotions: rate.roomPromotions,
    supplements: rate.supplements,
    inclusions: rate.inclusions,
    cancellationPolicies: rate.cancellationPolicies,
    rateConditions: rate.rateConditions,
    amenities: rate.amenities,
    metadata: {
      ...(rate.metadata || {}),
      hotelbedsCurrencyDiagnostics: rate.metadata?.hotelbedsCurrencyDiagnostics,
    },
    };
  });

  return {
    HotelId: hotelId,
    HotelName: hotel.hotelName,
    StarRating: hotel.stars ?? 0,
    Address: hotel.address ?? "",
    CityName: hotel.cityName ?? "",
    CountryName: hotel.countryName ?? "",
    Latitude: hotel.latitude,
    Longitude: hotel.longitude,
    Description: hotel.description,
    Images: (hotel.images ?? []).map((image) => ({
      Url: image.url,
      Description: image.description,
    })),
    Facilities: hotel.facilities ?? [],
    Options: options,
    supplierOffers: hotel.supplierOffers,
  };
}
