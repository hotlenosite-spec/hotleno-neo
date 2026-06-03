import { NextRequest } from "next/server";
import {
  createTransfersError,
  createTransfersSuccess,
  getTransfersClient,
  handleTransfersError,
  parseTransfersJsonBody,
} from "@/lib/transfers/api";
import type {
  TransferBookingService,
  TransferLocation,
  TransferOption,
  TransferSearchRequest,
} from "@/types/transfers";

type ScenarioLocation = TransferLocation & {
  fallback?: TransferLocation & { reason: string };
};

type ScenarioLeg = {
  pickup: ScenarioLocation;
  dropoff: ScenarioLocation;
  direction: "ARRIVAL" | "DEPARTURE";
  hour: number;
};

type CertificationScenario = {
  id: string;
  name: string;
  legs: ScenarioLeg[];
  requiresCancel?: boolean;
  requiresOptionalExtra?: boolean;
  requiresMustCheckPickupTime?: boolean;
};

const SCENARIOS: CertificationScenario[] = [
  {
    id: "departure-sistina-cia",
    name: "Booking funnel - DEPARTURE service only",
    requiresCancel: true,
    requiresMustCheckPickupTime: true,
    legs: [
      {
        pickup: { name: "Hotel Sistina", code: "5643", codeType: "ATLAS", type: "hotel" },
        dropoff: { name: "Rome Ciampino Airport", code: "CIA", codeType: "IATA", type: "airport" },
        direction: "DEPARTURE",
        hour: 10,
      },
    ],
  },
  {
    id: "roundtrip-barcelona-port",
    name: "Booking funnel - Round Trip ARRIVAL + DEPARTURE",
    requiresCancel: true,
    legs: [
      {
        pickup: { name: "Hotel Barcelona Universal", code: "57", codeType: "ATLAS", type: "hotel" },
        dropoff: {
          name: "Port of Barcelona",
          code: "BCNP",
          codeType: "PORT",
          type: "port",
          fallback: {
            name: "Barcelona Port",
            code: "277",
            codeType: "PORT",
            type: "port",
            reason: "BCNP returned E_REQUEST_INVALIDTERMINALCODE; 277 is the Transfers Cache API code.",
          },
        },
        direction: "DEPARTURE",
        hour: 9,
      },
      {
        pickup: {
          name: "Port of Barcelona",
          code: "BCNP",
          codeType: "PORT",
          type: "port",
          fallback: {
            name: "Barcelona Port",
            code: "277",
            codeType: "PORT",
            type: "port",
            reason: "BCNP returned E_REQUEST_INVALIDTERMINALCODE; 277 is the Transfers Cache API code.",
          },
        },
        dropoff: { name: "Hotel Barcelona Universal", code: "57", codeType: "ATLAS", type: "hotel" },
        direction: "ARRIVAL",
        hour: 11,
      },
    ],
  },
  {
    id: "arrival-hilton-sants",
    name: "Booking funnel - ARRIVAL service only",
    legs: [
      {
        pickup: { name: "Hotel Hilton Barcelona", code: "651", codeType: "ATLAS", type: "hotel" },
        dropoff: {
          name: "Sants Terminal",
          code: "BCNE",
          codeType: "STATION",
          type: "station",
          fallback: {
            name: "Barcelona Sants Train Station",
            code: "930",
            codeType: "STATION",
            type: "station",
            reason: "BCNE returned E_REQUEST_INVALIDTERMINALCODE; 930 is the Transfers Cache API code.",
          },
        },
        direction: "DEPARTURE",
        hour: 10,
      },
    ],
  },
  {
    id: "extras-universal-bcn",
    name: "Booking funnel - Service + Optional Extras",
    requiresCancel: true,
    requiresOptionalExtra: true,
    legs: [
      {
        pickup: { name: "Hotel Barcelona Universal", code: "57", codeType: "ATLAS", type: "hotel" },
        dropoff: { name: "Barcelona El Prat Airport", code: "BCN", codeType: "IATA", type: "airport" },
        direction: "DEPARTURE",
        hour: 10,
      },
    ],
  },
];

function dateInFuture(days: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);

  return date.toISOString().slice(0, 19);
}

function getScenario(id: string) {
  return SCENARIOS.find((scenario) => scenario.id === id);
}

function createSearchRequest(leg: ScenarioLeg, index: number): TransferSearchRequest {
  return {
    pickup: leg.pickup,
    dropoff: leg.dropoff,
    pickupDateTime: dateInFuture(30 + index * 3, leg.hour),
    passengers: { adults: 1, children: 0, infants: 0 },
    language: "en",
  };
}

function isInvalidCodeError(error: unknown) {
  return error instanceof Error && error.message.includes("E_REQUEST_INVALIDTERMINALCODE");
}

function withFallback(location: ScenarioLocation): TransferLocation {
  return location.fallback || location;
}

async function searchLeg(scenario: CertificationScenario, leg: ScenarioLeg, index: number) {
  const client = getTransfersClient();
  const request = createSearchRequest(leg, index);
  const notes: string[] = [];

  try {
    return {
      result: await client.searchTransfers(request),
      request,
      notes,
    };
  } catch (error) {
    if (!isInvalidCodeError(error) || (!leg.pickup.fallback && !leg.dropoff.fallback)) {
      throw error;
    }

    notes.push(leg.pickup.fallback?.reason || leg.dropoff.fallback?.reason || "Fallback used.");
    const fallbackRequest = createSearchRequest(
      {
        ...leg,
        pickup: withFallback(leg.pickup),
        dropoff: withFallback(leg.dropoff),
      },
      index,
    );

    return {
      result: await client.searchTransfers(fallbackRequest),
      request: fallbackRequest,
      notes,
    };
  }
}

function selectOption(scenario: CertificationScenario, options: TransferOption[]) {
  if (scenario.requiresMustCheckPickupTime) {
    const option = options.find((item) => item.mustCheckPickupTime);
    if (!option) throw new Error("No service with mustCheckPickupTime was found.");
    return option;
  }

  if (scenario.requiresOptionalExtra) {
    const option = options.find((item) => item.optionalExtras?.some((extra) => extra.code));
    if (!option) throw new Error("No service with optional extras was found.");
    return option;
  }

  const option = options[0];
  if (!option) throw new Error("No services found.");
  return option;
}

function transferDetailsForOption(option: TransferOption, direction: ScenarioLeg["direction"]) {
  const terminal = option.pickup.codeType === "ATLAS" ? option.dropoff : option.pickup;
  const normalizedDirection =
    option.pickup.codeType === "ATLAS" ? "DEPARTURE" : "ARRIVAL";

  if (terminal.codeType === "IATA") {
    return [{ type: "FLIGHT", direction: normalizedDirection, code: "HB1234", companyName: "HBX" }];
  }

  if (terminal.codeType === "PORT") {
    return [{ type: "CRUISE", direction: normalizedDirection, code: "HBXPORT", companyName: "HBX Group" }];
  }

  if (terminal.codeType === "STATION") {
    return [{ type: "TRAIN", direction: normalizedDirection || direction, code: "HB123", companyName: "HBX Rail" }];
  }

  return [];
}

async function runAvailability(scenario: CertificationScenario) {
  const searches = await Promise.all(
    scenario.legs.map((leg, index) => searchLeg(scenario, leg, index)),
  );
  const selectedOptions = searches.map((search) =>
    selectOption(scenario, search.result.options),
  );

  return {
    scenario,
    searches,
    selectedOptions,
    notes: searches.flatMap((search) => search.notes),
  };
}

export async function POST(req: NextRequest) {
  const body = await parseTransfersJsonBody(req);
  const scenarioId = typeof body?.scenarioId === "string" ? body.scenarioId : "";
  const mode = typeof body?.mode === "string" ? body.mode : "availability";
  const scenario = getScenario(scenarioId);

  if (!scenario) {
    return createTransfersError(
      400,
      "TRANSFERS_CERTIFICATION_UNKNOWN_SCENARIO",
      "Unknown Hotelbeds Transfers certification scenario.",
    );
  }

  try {
    if (mode === "cancel") {
      const bookingReference =
        typeof body?.bookingReference === "string" ? body.bookingReference : "";

      if (!bookingReference) {
        return createTransfersError(
          400,
          "TRANSFERS_MISSING_BOOKING_REFERENCE",
          "bookingReference is required for cancellation.",
        );
      }

      const cancellation = await getTransfersClient().cancelTransferBooking({
        bookingReference,
      });

      return createTransfersSuccess({
        scenarioId,
        mode,
        cancellation,
      });
    }

    const availability = await runAvailability(scenario);

    if (mode !== "confirm") {
      return createTransfersSuccess({
        scenarioId,
        mode: "availability",
        search: availability.searches.map((item) => item.result),
        selectedOptions: availability.selectedOptions,
        debug:
          process.env.NODE_ENV === "production"
            ? undefined
            : {
                notes: availability.notes,
                selectedRateKeys: availability.selectedOptions.map((option) => option.rateKey),
              },
      });
    }

    const services: TransferBookingService[] = availability.selectedOptions.map(
      (option, index) => ({
        rateKey: option.rateKey || "",
        transferDetails: transferDetailsForOption(option, scenario.legs[index].direction),
        extras: scenario.requiresOptionalExtra
          ? option.optionalExtras?.filter((extra) => extra.code).slice(0, 1)
          : undefined,
      }),
    );

    const booking = await getTransfersClient().bookTransfer({
      language: "en",
      clientReference: `HOTLENO-${Date.now()}`.slice(0, 20),
      holder: {
        name: "TEST",
        surname: "CERTIFICATION",
        email: "certification-test@hotleno.com",
        phone: "+966500000000",
      },
      passengers: [
        {
          title: "Mr",
          name: "TEST",
          surname: "CERTIFICATION",
          age: 30,
          type: "AD",
        },
      ],
      services,
      metadata: {
        remark: "Hotelbeds Transfers certification test booking.",
      },
    });

    return createTransfersSuccess({
      scenarioId,
      mode,
      selectedOptions: availability.selectedOptions,
      booking,
      voucher: booking.voucher,
      debug:
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              notes: availability.notes,
              selectedRateKeys: availability.selectedOptions.map((option) => option.rateKey),
              requiresCancel: scenario.requiresCancel,
            },
    });
  } catch (error) {
    return handleTransfersError(error);
  }
}
