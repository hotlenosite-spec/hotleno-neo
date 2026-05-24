export type TripStyle = "economy" | "comfort" | "luxury";

export type TripComponents = {
  hotel: boolean;
  flight: boolean;
  car: boolean;
};

export type BudgetInput = {
  totalBudget: number;
  travelers: number;
  nights: number;
  tripStyle: TripStyle;
  components: TripComponents;
};

export type BudgetAllocation = {
  hotelBudget: number;
  flightBudget: number;
  carBudget: number;
  activitiesBudget: number;
  bufferBudget: number;
};

type AllocationRule = {
  hotel?: number;
  flight?: number;
  car?: number;
  activities?: number;
  buffer?: number;
};

type StyledAllocationRule = Record<TripStyle, AllocationRule>;

export const tripBudgetAllocationRules = {
  hotel_only: {
    hotel: 0.85,
    activities: 0.05,
    buffer: 0.1,
  },
  flight_only: {
    flight: 0.9,
    buffer: 0.1,
  },
  car_only: {
    car: 0.8,
    activities: 0.05,
    buffer: 0.15,
  },
  hotel_flight: {
    economy: {
      hotel: 0.45,
      flight: 0.45,
      buffer: 0.1,
    },
    comfort: {
      hotel: 0.5,
      flight: 0.4,
      buffer: 0.1,
    },
    luxury: {
      hotel: 0.6,
      flight: 0.3,
      buffer: 0.1,
    },
  },
  hotel_car: {
    hotel: 0.7,
    car: 0.2,
    buffer: 0.1,
  },
  flight_car: {
    flight: 0.7,
    car: 0.2,
    buffer: 0.1,
  },
  hotel_flight_car: {
    economy: {
      hotel: 0.4,
      flight: 0.4,
      car: 0.1,
      buffer: 0.1,
    },
    comfort: {
      hotel: 0.45,
      flight: 0.35,
      car: 0.1,
      buffer: 0.1,
    },
    luxury: {
      hotel: 0.55,
      flight: 0.25,
      car: 0.1,
      buffer: 0.1,
    },
  },
} satisfies Record<string, AllocationRule | StyledAllocationRule>;

function getComponentsKey(components: TripComponents) {
  const { hotel, flight, car } = components;

  if (hotel && flight && car) return "hotel_flight_car";
  if (hotel && flight) return "hotel_flight";
  if (hotel && car) return "hotel_car";
  if (flight && car) return "flight_car";
  if (hotel) return "hotel_only";
  if (flight) return "flight_only";
  if (car) return "car_only";

  return null;
}

function getAllocationRule(input: BudgetInput): AllocationRule {
  const key = getComponentsKey(input.components);

  if (!key) {
    return {
      activities: 0.9,
      buffer: 0.1,
    };
  }

  const rule = tripBudgetAllocationRules[key];

  if ("economy" in rule) {
    return rule[input.tripStyle];
  }

  return rule;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function allocateTripBudget(input: BudgetInput): BudgetAllocation {
  const totalBudget = Number.isFinite(input.totalBudget)
    ? Math.max(input.totalBudget, 0)
    : 0;
  const rule = getAllocationRule(input);

  return {
    hotelBudget: money(totalBudget * (rule.hotel || 0)),
    flightBudget: money(totalBudget * (rule.flight || 0)),
    carBudget: money(totalBudget * (rule.car || 0)),
    activitiesBudget: money(totalBudget * (rule.activities || 0)),
    bufferBudget: money(totalBudget * (rule.buffer || 0)),
  };
}
