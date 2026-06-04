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

function normalizeRates(
  rates: SupplierHotelRate[],
  fallbackCurrency: string,
): SupplierHotelRate[] {
  return rates
    .map((rate) => ({
      ...rate,
      currency: rate.currency || fallbackCurrency,
    }))
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
  targetCurrency = "USD",
): UnifiedHotelResult[] {
  const hotelMap = new Map<string, UnifiedHotelResult>();

  for (const hotel of hotels) {
    const normalizedRates = normalizeRates(hotel.rates || [], targetCurrency);
    const bestRate = getBestRate(normalizedRates);
    const bestPrice = bestRate ? getRatePrice(bestRate) : Infinity;
    const currency = bestRate?.currency || targetCurrency;
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

  const options: HotelOption[] = hotel.rates.map((rate, index) => ({
    OptionId: stableNumericId(`${hotel.supplier}:${rate.rateKey}:${index}`),
    rateKey: rate.rateKey,
    supplier: hotel.supplier,
    supplierHotelId: hotel.supplierHotelId,
    supplierRateKey: rate.rateKey,
    BookingCode: rate.rateKey,
    HotelCode: hotel.supplierHotelId,
    supplierTotalFare: rate.price,
    OnRequest: 0,
    BoardType: rate.boardName || "Room Only",
    BoardName: rate.boardName,
    RoomType: rate.roomName,
    RoomName: rate.roomName,
    Rooms: [
      {
        RoomId: index + 1,
        RoomName: rate.roomName,
        NumAdults: 2,
        NumChildren: 0,
        RoomPrice: rate.price,
      },
    ],
    Adults: 2,
    Children: 0,
    Price: rate.price,
    TotalPrice: rate.price,
    Taxes: 0,
    Currency: rate.currency || hotel.currency,
    IsNonRefundable: !rate.refundable,
  }));

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
