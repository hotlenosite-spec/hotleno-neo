import { readFileSync, readdirSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

const LOG_ROOT = path.join(
  process.cwd(),
  "logs",
  "hotelbeds-transfers-certification",
);

const SCENARIOS = [
  {
    id: "scenario-01",
    folder: "scenario-01-departure-must-check-pickup-time",
    title: "Booking funnel - DEPARTURE service only",
    steps: [
      "scenario-01-availability",
      "scenario-01-booking-confirmed",
      "scenario-01-voucher",
      "scenario-01-cancelled",
    ],
  },
  {
    id: "scenario-02",
    folder: "scenario-02-round-trip-arrival-departure",
    title: "Booking funnel - Round Trip ARRIVAL + DEPARTURE",
    steps: [
      "scenario-02-availability-leg-1",
      "scenario-02-availability-leg-2",
      "scenario-02-booking-confirmed",
      "scenario-02-voucher",
      "scenario-02-cancelled",
    ],
  },
  {
    id: "scenario-03",
    folder: "scenario-03-arrival-only",
    title: "Booking funnel - ARRIVAL service only",
    steps: [
      "scenario-03-availability",
      "scenario-03-booking-confirmed",
      "scenario-03-voucher",
    ],
  },
  {
    id: "scenario-04",
    folder: "scenario-04-service-with-optional-extras",
    title: "Booking funnel - Service + Optional Extras",
    steps: [
      "scenario-04-availability-with-extra",
      "scenario-04-booking-confirmed",
      "scenario-04-voucher",
      "scenario-04-cancelled",
    ],
  },
];

function readJson(filePath: string): JsonRecord | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as JsonRecord;
  } catch {
    return null;
  }
}

function getNested(source: unknown, keys: Array<string | number>): unknown {
  return keys.reduce<unknown>((value, key) => {
    if (value == null) return undefined;
    if (typeof key === "number" && Array.isArray(value)) return value[key];
    if (typeof value === "object" && key in value) {
      return (value as JsonRecord)[key as string];
    }
    return undefined;
  }, source);
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object")
    : [];
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown) {
  return value === true;
}

function shortRateKey(rateKey: string) {
  if (!rateKey) return "";
  return rateKey.length > 68 ? `${rateKey.slice(0, 34)}...${rateKey.slice(-22)}` : rateKey;
}

function safeLocation(value: unknown) {
  const location = value && typeof value === "object" ? (value as JsonRecord) : {};
  return {
    label: asString(location.label) || asString(location.description) || asString(location.name),
    code: asString(location.code),
    type: asString(location.type) || asString(location.typeEnum),
  };
}

function findAvailabilityFiles(folderPath: string) {
  return readdirSync(folderPath)
    .filter((name) => name.endsWith("availability-response.json"))
    .sort();
}

function findSelectedServices(folderPath: string, rateKeys: string[]) {
  const services: JsonRecord[] = [];

  for (const fileName of findAvailabilityFiles(folderPath)) {
    const file = readJson(path.join(folderPath, fileName));
    const candidates = asArray(getNested(file, ["body", "services"]));
    for (const service of candidates) {
      const rateKey = asString(service.rateKey);
      if (rateKeys.includes(rateKey)) {
        services.push({ ...service, availabilityFile: fileName });
      }
    }
  }

  return services;
}

function mapService(service: JsonRecord, index: number) {
  const pickupInformation = service.pickupInformation as JsonRecord | undefined;
  const pickup = pickupInformation?.pickup as JsonRecord | undefined;
  const checkPickup = pickup?.checkPickup as JsonRecord | undefined;
  const price = service.price as JsonRecord | undefined;
  const content = service.content as JsonRecord | undefined;
  const vehicle =
    (service.vehicle as JsonRecord | undefined) || (content?.vehicle as JsonRecord | undefined);
  const category =
    (service.category as JsonRecord | undefined) || (content?.category as JsonRecord | undefined);
  const extras = asArray(content?.extras).map((extra) => ({
    code: asString(extra.code),
    name: asString(extra.type) || asString(extra.name),
    amount: typeof extra.amount === "number" ? extra.amount : null,
  }));

  return {
    leg: index + 1,
    file: asString(service.availabilityFile),
    serviceName: asString(vehicle?.name) || asString(service.transferType),
    categoryName: asString(category?.name),
    direction: asString(service.direction),
    transferType: asString(service.transferType),
    rateKey: asString(service.rateKey),
    shortRateKey: shortRateKey(asString(service.rateKey)),
    price: {
      amount:
        typeof price?.totalAmount === "number"
          ? price.totalAmount
          : typeof price?.netAmount === "number"
            ? price.netAmount
            : null,
      currency: asString(price?.currencyId),
    },
    pickup: safeLocation(pickupInformation?.from),
    dropoff: safeLocation(pickupInformation?.to),
    pickupDate: asString(pickupInformation?.date),
    pickupTime: asString(pickupInformation?.time),
    mustCheckPickupTime: asBoolean(checkPickup?.mustCheckPickupTime),
    checkPickup: checkPickup
      ? {
          mustCheckPickupTime: asBoolean(checkPickup.mustCheckPickupTime),
          url: asString(checkPickup.url),
          hoursBeforeConsulting:
            typeof checkPickup.hoursBeforeConsulting === "number"
              ? checkPickup.hoursBeforeConsulting
              : null,
        }
      : null,
    pickupDescription: asString(pickup?.description).slice(0, 700),
    optionalExtras: extras,
  };
}

function getBooking(folderPath: string) {
  const bookingResponse = readJson(path.join(folderPath, "booking-response.json"));
  const booking = asArray(getNested(bookingResponse, ["body", "bookings"]))[0];
  const transfers = asArray(booking?.transfers);
  return {
    reference: asString(booking?.reference),
    status: asString(booking?.status),
    clientReference: asString(booking?.clientReference),
    creationDate: asString(booking?.creationDate),
    currency: asString(booking?.currency),
    transferStatuses: transfers.map((transfer, index) => ({
      leg: index + 1,
      status: asString(transfer.status),
      serviceName: asString((transfer.vehicle as JsonRecord | undefined)?.name),
      pickup: safeLocation((transfer.pickupInformation as JsonRecord | undefined)?.from),
      dropoff: safeLocation((transfer.pickupInformation as JsonRecord | undefined)?.to),
    })),
  };
}

function getCancellation(folderPath: string) {
  const cancelResponse = readJson(path.join(folderPath, "cancel-response.json"));
  if (!cancelResponse) return null;
  const booking = asArray(getNested(cancelResponse, ["body", "bookings"]))[0];
  return {
    reference: asString(booking?.reference),
    status: asString(booking?.status),
    transferStatuses: asArray(booking?.transfers).map((transfer, index) => ({
      leg: index + 1,
      status: asString(transfer.status),
    })),
  };
}

function getBookingRateKeys(folderPath: string) {
  const bookingRequest = readJson(path.join(folderPath, "booking-request.json"));
  return asArray(bookingRequest?.transfers).map((transfer) => asString(transfer.rateKey));
}

function getBookedExtras(folderPath: string) {
  const bookingRequest = readJson(path.join(folderPath, "booking-request.json"));
  return asArray(bookingRequest?.transfers).flatMap((transfer) =>
    asArray(transfer.extras).map((extra) => ({
      code: asString(extra.code),
      units: typeof extra.units === "number" ? extra.units : null,
    })),
  );
}

function getVoucher(folderPath: string) {
  const voucher = readJson(path.join(folderPath, "voucher.json")) || {};
  return {
    scenario: asString(voucher.scenario),
    bookingReference: asString(voucher.hotelbedsReference),
    serviceName: asString(voucher.serviceFullName),
    routes: asArray(voucher.fromTo).map((route) => ({
      from: safeLocation(route.from),
      to: safeLocation(route.to),
    })),
    passengerName: asString(voucher.passengerName),
    paxDistribution: voucher.paxDistribution || null,
    pickupInformation: asString(voucher.pickupInformation),
    pickupTime: Array.isArray(voucher.pickupTime) ? voucher.pickupTime.map(String) : [],
    serviceDate: Array.isArray(voucher.serviceDate) ? voucher.serviceDate.map(String) : [],
    currency: asString(voucher.currency),
    cancellationPolicy: Array.isArray(voucher.cancellationPolicy)
      ? voucher.cancellationPolicy
      : [],
    paymentNote: asString(voucher.paymentNote),
  };
}

export async function GET() {
  const scenarios = SCENARIOS.map((scenario) => {
    const folderPath = path.join(LOG_ROOT, scenario.folder);
    const rateKeys = getBookingRateKeys(folderPath);
    const selectedServices = findSelectedServices(folderPath, rateKeys).map(mapService);

    return {
      id: scenario.id,
      title: scenario.title,
      steps: scenario.steps,
      supplier: "Hotelbeds Transfers",
      selectedServices,
      booking: getBooking(folderPath),
      cancellation: getCancellation(folderPath),
      bookedExtras: getBookedExtras(folderPath),
      voucher: getVoucher(folderPath),
    };
  });

  return NextResponse.json({
    success: true,
    source: "logs/hotelbeds-transfers-certification",
    scenarios,
    allowedBookingReferences: [
      "207-16258057",
      "102-20736280",
      "102-20736281",
      "102-20736282",
    ],
  });
}
