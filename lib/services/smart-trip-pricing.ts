import {
  allocateTripBudget,
  type BudgetAllocation,
  type TripComponents,
  type TripStyle,
} from "@/lib/smart-trip-planner/budget-allocation";

export type PlannerTravelerInput = {
  adults?: number;
  children?: number;
  total: number;
};

export type SearchHotelsForPlannerInput = {
  city: string;
  checkIn: string;
  checkOut: string;
  travelers: PlannerTravelerInput;
  hotelBudget: number;
  interests: string[];
  tripStyle: TripStyle;
};

export type SearchFlightsForPlannerInput = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: PlannerTravelerInput;
  flightBudget: number;
  tripStyle: TripStyle;
};

export type SearchCarsForPlannerInput = {
  city: string;
  pickupDate: string;
  dropoffDate: string;
  travelers: PlannerTravelerInput;
  carBudget: number;
  tripStyle: TripStyle;
};

export type PlannerHotelOption = {
  id: string;
  supplier?: string;
  name: string;
  city: string;
  rating?: number;
  price: number;
  currency: string;
  refundable?: boolean;
  bookable: boolean;
  raw?: unknown;
};

export type PlannerFlightOption = {
  id: string;
  supplier?: string;
  airlineName: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  price: number;
  currency: string;
  bookable: boolean;
  raw?: unknown;
};

export type PlannerCarOption = {
  id: string;
  supplier?: string;
  companyName: string;
  carType: string;
  city: string;
  pickupDate: string;
  dropoffDate: string;
  price: number;
  currency: string;
  bookable: boolean;
  raw?: unknown;
};

export type SmartTripBookableItem =
  | { type: "hotel"; id: string; price: number; currency: string }
  | { type: "flight"; id: string; price: number; currency: string }
  | { type: "car"; id: string; price: number; currency: string };

export type BuildSmartTripPlanInput = {
  origin?: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  travelers: PlannerTravelerInput;
  totalBudget: number;
  nights: number;
  currency: string;
  interests: string[];
  tripStyle: TripStyle;
  components: TripComponents;
};

export type SmartTripPlan = {
  hotelOption: PlannerHotelOption | null;
  flightOption: PlannerFlightOption | null;
  carOption: PlannerCarOption | null;
  totalPrice: number;
  remainingBudget: number;
  budgetMatchPercentage: number;
  recommendationReason: string;
  bookableItems: SmartTripBookableItem[];
  budgetAllocation: BudgetAllocation;
};

export async function searchHotelsForPlanner(
  _input: SearchHotelsForPlannerInput,
): Promise<PlannerHotelOption[]> {
  // TODO: Integrate through the supplier layer with Hotelbeds / TBO / Travellanda.
  // Return normalized PlannerHotelOption objects only after real availability and pricing are verified.
  return [];
}

export async function searchFlightsForPlanner(
  _input: SearchFlightsForPlannerInput,
): Promise<PlannerFlightOption[]> {
  // TODO: Integrate a flight supplier/provider here when flight inventory is available.
  // Do not return synthetic production data; normalize real provider responses into PlannerFlightOption.
  return [];
}

export async function searchCarsForPlanner(
  _input: SearchCarsForPlannerInput,
): Promise<PlannerCarOption[]> {
  // TODO: Integrate a car-rental provider here when car inventory is available.
  // Do not return synthetic production data; normalize real provider responses into PlannerCarOption.
  return [];
}

function pickLowestPriceOption<T extends { price: number }>(options: T[]) {
  return options.reduce<T | null>((best, option) => {
    if (!best || option.price < best.price) {
      return option;
    }

    return best;
  }, null);
}

function getBudgetMatchPercentage(totalPrice: number, totalBudget: number) {
  if (totalBudget <= 0 || totalPrice <= 0) {
    return 0;
  }

  if (totalPrice <= totalBudget) {
    return Math.max(70, Math.round((totalPrice / totalBudget) * 100));
  }

  const overBudgetRatio = (totalPrice - totalBudget) / totalBudget;
  return Math.max(0, Math.round(70 - overBudgetRatio * 70));
}

function getRecommendationReason({
  hasHotel,
  hasFlight,
  hasCar,
  totalPrice,
}: {
  hasHotel: boolean;
  hasFlight: boolean;
  hasCar: boolean;
  totalPrice: number;
}) {
  if (totalPrice <= 0) {
    return "لا توجد أسعار حية متاحة حاليًا لبناء خطة قابلة للحجز. سيتم تجهيز الخطة عند ربط مزودي الفنادق والطيران والسيارات.";
  }

  const parts = [
    hasHotel ? "فندق مناسب" : null,
    hasFlight ? "رحلة مناسبة" : null,
    hasCar ? "سيارة مناسبة" : null,
  ].filter(Boolean);

  return `تم اختيار ${parts.join(" و")} بناءً على أقل سعر متاح ضمن مكونات الرحلة المطلوبة.`;
}

export async function buildSmartTripPlan(
  input: BuildSmartTripPlanInput,
): Promise<SmartTripPlan> {
  const budgetAllocation = allocateTripBudget({
    totalBudget: input.totalBudget,
    travelers: input.travelers.total,
    nights: input.nights,
    tripStyle: input.tripStyle,
    components: input.components,
  });

  const [hotelOptions, flightOptions, carOptions] = await Promise.all([
    input.components.hotel
      ? searchHotelsForPlanner({
          city: input.destination,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          travelers: input.travelers,
          hotelBudget: budgetAllocation.hotelBudget,
          interests: input.interests,
          tripStyle: input.tripStyle,
        })
      : Promise.resolve([]),
    input.components.flight
      ? searchFlightsForPlanner({
          origin: input.origin || "",
          destination: input.destination,
          departureDate: input.checkIn,
          returnDate: input.checkOut,
          travelers: input.travelers,
          flightBudget: budgetAllocation.flightBudget,
          tripStyle: input.tripStyle,
        })
      : Promise.resolve([]),
    input.components.car
      ? searchCarsForPlanner({
          city: input.destination,
          pickupDate: input.checkIn,
          dropoffDate: input.checkOut,
          travelers: input.travelers,
          carBudget: budgetAllocation.carBudget,
          tripStyle: input.tripStyle,
        })
      : Promise.resolve([]),
  ]);

  const hotelOption = pickLowestPriceOption(hotelOptions);
  const flightOption = pickLowestPriceOption(flightOptions);
  const carOption = pickLowestPriceOption(carOptions);
  const totalPrice =
    (hotelOption?.price || 0) +
    (flightOption?.price || 0) +
    (carOption?.price || 0);
  const bookableItems: SmartTripBookableItem[] = [
    hotelOption?.bookable
      ? {
          type: "hotel",
          id: hotelOption.id,
          price: hotelOption.price,
          currency: hotelOption.currency,
        }
      : null,
    flightOption?.bookable
      ? {
          type: "flight",
          id: flightOption.id,
          price: flightOption.price,
          currency: flightOption.currency,
        }
      : null,
    carOption?.bookable
      ? {
          type: "car",
          id: carOption.id,
          price: carOption.price,
          currency: carOption.currency,
        }
      : null,
  ].filter((item): item is SmartTripBookableItem => Boolean(item));

  return {
    hotelOption,
    flightOption,
    carOption,
    totalPrice,
    remainingBudget: input.totalBudget - totalPrice,
    budgetMatchPercentage: getBudgetMatchPercentage(totalPrice, input.totalBudget),
    recommendationReason: getRecommendationReason({
      hasHotel: Boolean(hotelOption),
      hasFlight: Boolean(flightOption),
      hasCar: Boolean(carOption),
      totalPrice,
    }),
    bookableItems,
    budgetAllocation,
  };
}
