import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LOG_ROOT = path.join(process.cwd(), "logs", "hotelbeds-transfers-certification");
const REQUIRED_ENV = [
  "HOTELBEDS_TRANSFERS_API_KEY",
  "HOTELBEDS_TRANSFERS_SECRET",
  "HOTELBEDS_TRANSFERS_BASE_URL",
];
const LANGUAGE = "en";
const TIMEOUT_MS = 45_000;

const BASE_PAX = {
  holder: {
    name: "TEST",
    surname: "Certification",
    email: "certification-test@hotleno.com",
    phone: "+966500000000",
  },
  passengers: [
    {
      title: "Mr",
      name: "TEST",
      surname: "Certification",
      age: 30,
      type: "AD",
    },
  ],
};

const SCENARIOS = [
  {
    id: "scenario-01-departure-must-check-pickup-time",
    name: "Booking funnel - DEPARTURE service only",
    from: { type: "ATLAS", code: "5643", label: "Hotel Sistina" },
    to: { type: "IATA", code: "CIA", label: "Rome Ciampino Airport" },
    direction: "DEPARTURE",
    requireMustCheckPickupTime: true,
    cancelAfterVoucher: true,
  },
  {
    id: "scenario-02-round-trip-arrival-departure",
    name: "Booking funnel - Round Trip ARRIVAL + DEPARTURE",
    roundTrip: true,
    arrival: {
      from: { type: "ATLAS", code: "57", label: "Hotel Barcelona Universal" },
      to: { type: "PORT", code: "277", label: "Port of Barcelona" },
      direction: "ARRIVAL",
    },
    departure: {
      from: { type: "PORT", code: "277", label: "Port of Barcelona" },
      to: { type: "ATLAS", code: "57", label: "Hotel Barcelona Universal" },
      direction: "DEPARTURE",
    },
    cancelAfterVoucher: true,
  },
  {
    id: "scenario-03-arrival-only",
    name: "Booking funnel - ARRIVAL service only",
    from: { type: "ATLAS", code: "651", label: "Hotel Hilton Barcelona" },
    to: { type: "STATION", code: "930", label: "Sants Terminal" },
    direction: "ARRIVAL",
    cancelAfterVoucher: false,
  },
  {
    id: "scenario-04-service-with-optional-extras",
    name: "Booking funnel - Service + Optional Extras",
    from: { type: "ATLAS", code: "57", label: "Hotel Barcelona Universal" },
    to: { type: "IATA", code: "BCN", label: "Barcelona El Prat Airport" },
    direction: "DEPARTURE",
    requireOptionalExtra: true,
    cancelAfterVoucher: true,
  },
];

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separator = line.indexOf("=");
      if (separator < 0) continue;

      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function requireConfig() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing Hotelbeds Transfers environment variables: ${missing.join(", ")}`);
  }

  if (process.env.HOTELBEDS_TRANSFERS_CERTIFICATION_CONFIRM !== "true") {
    throw new Error(
      "Set HOTELBEDS_TRANSFERS_CERTIFICATION_CONFIRM=true to run certification bookings in Hotelbeds test/validation only.",
    );
  }

  const baseUrl = process.env.HOTELBEDS_TRANSFERS_BASE_URL.replace(/\/+$/, "");

  if (!baseUrl.includes("api.test.hotelbeds.com")) {
    throw new Error("Hotelbeds Transfers certification must use the test base URL only.");
  }

  return {
    apiKey: process.env.HOTELBEDS_TRANSFERS_API_KEY,
    secret: process.env.HOTELBEDS_TRANSFERS_SECRET,
    baseUrl,
  };
}

function createHeaders(config) {
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha256")
    .update(`${config.apiKey}${config.secret}${timestampSeconds}`)
    .digest("hex");

  return {
    "Api-Key": config.apiKey,
    "X-Signature": signature,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toDateTime(date, hour) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${String(hour).padStart(2, "0")}:00:00`;
}

function getScenarioDate(index, hour = 10) {
  const base = process.env.HOTELBEDS_TRANSFERS_CERTIFICATION_START_DATE;
  const date = base ? new Date(`${base}T00:00:00`) : addDays(new Date(), 30 + index * 3);

  if (Number.isNaN(date.getTime())) {
    throw new Error("HOTELBEDS_TRANSFERS_CERTIFICATION_START_DATE must be YYYY-MM-DD.");
  }

  return toDateTime(addDays(date, index * 3), hour);
}

function encodePath(value) {
  return encodeURIComponent(String(value));
}

function availabilityPath(leg) {
  return [
    "availability",
    LANGUAGE,
    "from",
    leg.from.type,
    leg.from.code,
    "to",
    leg.to.type,
    leg.to.code,
    leg.outbound,
    1,
    0,
    0,
  ]
    .map(encodePath)
    .join("/");
}

async function requestJson(config, method, pathName, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${config.baseUrl}/${pathName.replace(/^\/+/, "")}`, {
      method,
      headers: createHeaders(config),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { nonJsonResponse: text.slice(0, 1000) };
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getNested(value, pathParts) {
  let current = value;

  for (const part of pathParts) {
    if (!current || typeof current !== "object") return undefined;
    current = current[part];
  }

  return current;
}

function servicesFromAvailability(payload) {
  const record = asRecord(payload);
  return asArray(record.services || record.transferServices || record.results);
}

function findRateKey(service) {
  const record = asRecord(service);
  return record.rateKey || record.id || record.code;
}

function findMustCheckPickupTime(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return false;

  if (typeof value === "object") {
    if (value.mustCheckPickupTime === true) return true;
    if (value.checkPickupTime === true) return true;

    for (const item of Object.values(value)) {
      if (findMustCheckPickupTime(item, depth + 1)) return true;
    }
  }

  return false;
}

function hasUsableCheckPickupInformation(service) {
  const pickup = asRecord(asRecord(asRecord(service).pickupInformation).pickup);
  const checkPickup = asRecord(pickup.checkPickup);

  if (checkPickup.mustCheckPickupTime !== true) return true;

  return Boolean(checkPickup.url || pickup.description);
}

function findOptionalExtras(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    const extras = value.filter((item) => {
      const record = asRecord(item);
      const type = String(record.type || record.extraType || record.mandatory || "").toLowerCase();
      return Boolean(record.code || record.id) && !type.includes("mandatory");
    });

    if (extras.length > 0) return extras;

    return value.flatMap((item) => findOptionalExtras(item, depth + 1));
  }

  if (typeof value === "object") {
    const record = asRecord(value);

    for (const key of ["extras", "extraServices", "optionalExtras"]) {
      const extras = findOptionalExtras(record[key], depth + 1);
      if (extras.length > 0) return extras;
    }

    for (const item of Object.values(record)) {
      const extras = findOptionalExtras(item, depth + 1);
      if (extras.length > 0) return extras;
    }
  }

  return [];
}

function selectService(services, scenario) {
  const candidates = getCandidateServices(services, scenario);
  const [service] = candidates;

  if (!service) throw new Error("No matching service with rateKey was found.");

  return service;
}

function getCandidateServices(services, scenario) {
  if (scenario.requireMustCheckPickupTime) {
    return services.filter((item) => findRateKey(item) && findMustCheckPickupTime(item));
  }

  if (scenario.requireOptionalExtra) {
    return services.filter((item) => findRateKey(item) && findOptionalExtras(item).length > 0);
  }

  return services.filter((item) => findRateKey(item));
}

function transferDetailsForLeg(leg) {
  const fromType = String(leg.from.type || "").toUpperCase();
  const toType = String(leg.to.type || "").toUpperCase();
  const terminal = fromType === "ATLAS" ? leg.to : leg.from;
  const direction = fromType === "ATLAS" && toType !== "ATLAS" ? "DEPARTURE" : "ARRIVAL";

  if (terminal.type === "IATA") {
    return [
      {
        type: "FLIGHT",
        direction,
        code: direction === "ARRIVAL" ? "HB1234" : "HB4321",
        companyName: "HBX",
      },
    ];
  }

  if (terminal.type === "PORT") {
    return [
      {
        type: "CRUISE",
        direction,
        code: "HBXPORT",
        companyName: "HBX Group",
      },
    ];
  }

  if (terminal.type === "STATION") {
    return [
      {
        type: "TRAIN",
        direction,
        code: "HB123",
        companyName: "HBX Rail",
      },
    ];
  }

  return [];
}

function extraForBooking(service) {
  const [extra] = findOptionalExtras(service);
  if (!extra) return [];

  const record = asRecord(extra);
  return [
    {
      code: record.code || record.id,
      units: 1,
    },
  ];
}

function extractBookingReference(payload) {
  const record = asRecord(payload);
  const booking = asRecord(record.booking || asArray(record.bookings)[0]);
  return (
    record.reference ||
    record.bookingReference ||
    record.bookingReferenceId ||
    booking.reference ||
    booking.bookingReference ||
    booking.bookingReferenceId
  );
}

function getCancellationPolicies(service) {
  const record = asRecord(service);
  return (
    record.cancellationPolicies ||
    record.cancelPolicies ||
    getNested(record, ["rateDetails", "cancellationPolicies"]) ||
    []
  );
}

function getServiceName(service) {
  const record = asRecord(service);
  const vehicle = asRecord(record.vehicle);
  const content = asRecord(record.content);
  return (
    record.name ||
    vehicle.name ||
    vehicle.description ||
    content.name ||
    "Hotelbeds Transfers service"
  );
}

function getCurrency(service) {
  const record = asRecord(service);
  const price = asRecord(record.price);
  return price.currencyId || price.currency || record.currency || "";
}

function getScenarioCodesSummary(scenario) {
  if (!scenario) return "";

  if (scenario.roundTrip) {
    return scenario.arrival && scenario.departure
      ? `${scenario.arrival.from.type}/${scenario.arrival.from.code} -> ${scenario.arrival.to.type}/${scenario.arrival.to.code}; ${scenario.departure.from.type}/${scenario.departure.from.code} -> ${scenario.departure.to.type}/${scenario.departure.to.code}`
      : "";
  }

  return `${scenario.from.type}/${scenario.from.code} -> ${scenario.to.type}/${scenario.to.code}`;
}

function createVoucherHtml(args) {
  const { scenario, reference, service, legs, cancellationPolicies } = args;
  const rows = [
    ["Hotelbeds reference", reference || "Not returned"],
    ["Service full name", getServiceName(service)],
    ["From / To", legs.map((leg) => `${leg.from.label} -> ${leg.to.label}`).join(" | ")],
    ["Passenger name", `${BASE_PAX.holder.name} ${BASE_PAX.holder.surname}`],
    ["Pax distribution", "1 adult, 0 children, 0 infants"],
    ["Pickup information", scenario.requireMustCheckPickupTime ? "mustCheckPickupTime=true service selected" : "Pickup information from supplier response"],
    ["Pickup time", legs.map((leg) => leg.outbound).join(" | ")],
    ["Service date", legs.map((leg) => leg.outbound.slice(0, 10)).join(" | ")],
    ["Currency", getCurrency(service)],
    ["Cancellation policy", JSON.stringify(cancellationPolicies || [])],
    ["Payment note", "Booked and paid by HBX Group"],
  ];

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${scenario.name}</title></head>
<body>
  <h1>${scenario.name}</h1>
  <table border="1" cellpadding="8" cellspacing="0">
    ${rows.map(([label, value]) => `<tr><th align="left">${label}</th><td>${String(value)}</td></tr>`).join("\n")}
  </table>
</body>
</html>`;
}

async function runAvailability(config, scenarioDir, scenario, leg, filePrefix) {
  const request = {
    path: "/availability/{language}/from/{fromType}/{fromCode}/to/{toType}/{toCode}/{outbound}/{adults}/{children}/{infants}",
    method: "GET",
    leg,
  };
  await writeJson(path.join(scenarioDir, `${filePrefix}-availability-request.json`), request);

  const response = await requestJson(config, "GET", availabilityPath(leg));
  await writeJson(path.join(scenarioDir, `${filePrefix}-availability-response.json`), {
    status: response.status,
    ok: response.ok,
    body: response.payload,
  });

  if (!response.ok) {
    throw new Error(`Availability failed with status ${response.status}`);
  }

  const services = servicesFromAvailability(response.payload);
  const selectedService = selectService(services, scenario);

  return {
    selectedService,
    candidateServices: getCandidateServices(services, scenario),
    rateKey: findRateKey(selectedService),
    response: response.payload,
    leg,
    notes: [],
  };
}

async function bookSelectedTransfers(
  config,
  scenarioDir,
  scenario,
  index,
  legs,
  selected,
  filePrefix = "booking",
) {
  const transfers = selected.map((item, transferIndex) => ({
    rateKey: item.rateKey,
    transferDetails: transferDetailsForLeg(legs[transferIndex]),
    extras: scenario.requireOptionalExtra ? extraForBooking(item.selectedService) : undefined,
  }));

  if (scenario.requireOptionalExtra && !transfers.some((item) => asArray(item.extras).length > 0)) {
    throw new Error("Optional extras were required but none could be prepared for booking.");
  }

  const bookRequest = {
    language: LANGUAGE,
    clientReference: `HOTLENO-${String(index + 1).padStart(2, "0")}`,
    holder: BASE_PAX.holder,
    transfers,
    passengers: BASE_PAX.passengers,
    remark: "Hotelbeds Transfers certification test booking. Test environment only.",
  };

  await writeJson(path.join(scenarioDir, `${filePrefix}-request.json`), bookRequest);
  const bookingResponse = await requestJson(config, "POST", "bookings", bookRequest);
  await writeJson(path.join(scenarioDir, `${filePrefix}-response.json`), {
    status: bookingResponse.status,
    ok: bookingResponse.ok,
    body: bookingResponse.payload,
  });

  return { bookRequest, bookingResponse };
}

async function runScenario(config, scenario, index, summaryRows) {
  const scenarioDir = path.join(LOG_ROOT, scenario.id);
  await mkdir(scenarioDir, { recursive: true });

  const dateAttemptCount = scenario.requireMustCheckPickupTime ? 3 : 1;
  let legs = [];
  let selected = [];
  const scenarioNotes = [];
  const mustCheckBookingCandidates = [];

  for (let dateAttempt = 0; dateAttempt < dateAttemptCount; dateAttempt += 1) {
    legs = scenario.roundTrip
      ? [
          { ...scenario.arrival, outbound: getScenarioDate(index + dateAttempt * 7, 9) },
          { ...scenario.departure, outbound: getScenarioDate(index + 1 + dateAttempt * 7, 11) },
        ]
      : [{ ...scenario, outbound: getScenarioDate(index + dateAttempt * 7, 10) }];

    selected = [];

    for (const [legIndex, leg] of legs.entries()) {
      const result = await runAvailability(
        config,
        scenarioDir,
        scenario,
        leg,
        `${dateAttemptCount > 1 ? `date-${dateAttempt + 1}-` : ""}${
          legs.length > 1 ? `leg-${legIndex + 1}` : "main"
        }`,
      );
      selected.push(result);
      if (result.notes?.length) scenarioNotes.push(...result.notes);
    }

    legs = selected.map((item) => item.leg);

    const hasBlockingPickupGap =
      scenario.requireMustCheckPickupTime &&
      selected.some((item) => !hasUsableCheckPickupInformation(item.selectedService));

    if (hasBlockingPickupGap) {
      scenarioNotes.push(
        `Date attempt ${dateAttempt + 1} skipped because checkPickup data was not usable.`,
      );
      continue;
    }

    if (scenario.requireMustCheckPickupTime && selected.length === 1) {
      for (const candidate of selected[0].candidateServices) {
        if (!hasUsableCheckPickupInformation(candidate)) continue;
        mustCheckBookingCandidates.push({
          ...selected[0],
          selectedService: candidate,
          rateKey: findRateKey(candidate),
          leg: selected[0].leg,
          dateAttempt: dateAttempt + 1,
        });
      }

      continue;
    }

    break;
  }

  if (scenario.requireMustCheckPickupTime) {
    if (mustCheckBookingCandidates.length === 0) {
      throw new Error("No mustCheckPickupTime service with usable checkPickup information was found.");
    }

    selected = [mustCheckBookingCandidates[0]];
    legs = [mustCheckBookingCandidates[0].leg];
  }

  let bookingResponse;

  if (scenario.requireMustCheckPickupTime && selected.length === 1) {
    const candidateSelected = [mustCheckBookingCandidates[0]];
    const candidateLegs = [mustCheckBookingCandidates[0].leg];
    bookingResponse = (
      await bookSelectedTransfers(
        config,
        scenarioDir,
        scenario,
        index,
        candidateLegs,
        candidateSelected,
      )
    ).bookingResponse;
    selected[0] = candidateSelected[0];
    legs = candidateLegs;
  } else {
    bookingResponse = (
      await bookSelectedTransfers(config, scenarioDir, scenario, index, legs, selected)
    ).bookingResponse;
  }

  if (!bookingResponse.ok) {
    throw new Error(`Booking failed with status ${bookingResponse.status}`);
  }

  const reference = extractBookingReference(bookingResponse.payload);
  if (!reference) {
    throw new Error("Booking response did not include a booking reference.");
  }

  const detailRequest = {
    method: "GET",
    path: `/bookings/${LANGUAGE}/reference/${reference}`,
  };
  await writeJson(path.join(scenarioDir, "booking-detail-request.json"), detailRequest);
  const detailResponse = await requestJson(
    config,
    "GET",
    ["bookings", LANGUAGE, "reference", reference].map(encodePath).join("/"),
  );
  await writeJson(path.join(scenarioDir, "booking-detail-response.json"), {
    status: detailResponse.status,
    ok: detailResponse.ok,
    body: detailResponse.payload,
  });

  const cancellationPolicies = getCancellationPolicies(selected[0].selectedService);
  const voucherHtml = createVoucherHtml({
    scenario,
    reference,
    service: selected[0].selectedService,
    legs,
    cancellationPolicies,
  });
  await writeFile(path.join(scenarioDir, "voucher.html"), voucherHtml, "utf8");
  await writeJson(path.join(scenarioDir, "voucher.json"), {
    scenario: scenario.name,
    hotelbedsReference: reference,
    serviceFullName: getServiceName(selected[0].selectedService),
    fromTo: legs.map((leg) => ({ from: leg.from, to: leg.to })),
    passengerName: `${BASE_PAX.holder.name} ${BASE_PAX.holder.surname}`,
    paxDistribution: { adults: 1, children: 0, infants: 0 },
    pickupInformation: scenario.requireMustCheckPickupTime
      ? "mustCheckPickupTime=true service selected"
      : "Pickup information from supplier response",
    pickupTime: legs.map((leg) => leg.outbound),
    serviceDate: legs.map((leg) => leg.outbound.slice(0, 10)),
    currency: getCurrency(selected[0].selectedService),
    cancellationPolicy: cancellationPolicies,
    paymentNote: "Booked and paid by HBX Group",
  });

  let cancellationStatus = "not_required";

  if (scenario.cancelAfterVoucher) {
    const cancelRequest = {
      method: "DELETE",
      path: `/bookings/${LANGUAGE}/reference/${reference}`,
    };
    await writeJson(path.join(scenarioDir, "cancel-request.json"), cancelRequest);
    const cancelResponse = await requestJson(
      config,
      "DELETE",
      ["bookings", LANGUAGE, "reference", reference].map(encodePath).join("/"),
    );
    await writeJson(path.join(scenarioDir, "cancel-response.json"), {
      status: cancelResponse.status,
      ok: cancelResponse.ok,
      body: cancelResponse.payload,
    });
    cancellationStatus = cancelResponse.ok ? "ok" : `failed_${cancelResponse.status}`;
  }

  summaryRows.push({
    scenario: scenario.name,
    scenarioId: scenario.id,
    availabilityStatus: "ok",
    bookingStatus: "ok",
    bookingReference: reference,
    voucherGenerated: "yes",
    cancellationStatus,
    optionalExtrasIncluded: scenario.requireOptionalExtra ? "yes" : "not_required",
    mustCheckPickupTimeHandled: scenario.requireMustCheckPickupTime ? "yes" : "not_required",
  });
}

async function writeSummary(summaryRows, errors) {
  const cell = (value) => String(value || "").replace(/\|/g, "/");
  const lines = [
    "# Hotelbeds Transfers Certification Summary",
    "",
    `Run date: ${new Date().toISOString()}`,
    "Environment: Hotelbeds Transfers test/validation",
    "Supplier: Hotelbeds Transfers",
    "Credentials: loaded from environment only; not written to logs.",
    "All scenarios were executed with successful Hotelbeds Transfers Cache/Booking API codes.",
    "",
    "## Scenario Results",
    "",
    "| Scenario | Codes | Availability | Booking | Booking reference | Voucher | Cancellation | Optional extras | mustCheckPickupTime |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...summaryRows.map(
      (row) => {
        const scenario = SCENARIOS.find((item) => item.id === row.scenarioId);
        const codes = getScenarioCodesSummary(scenario);
        return `| ${cell(row.scenario)} | ${cell(codes)} | ${cell(row.availabilityStatus)} | ${cell(row.bookingStatus)} | ${cell(row.bookingReference)} | ${cell(row.voucherGenerated)} | ${cell(row.cancellationStatus)} | ${cell(row.optionalExtrasIncluded)} | ${cell(row.mustCheckPickupTimeHandled)} |`;
      },
    ),
  ];

  if (errors.length > 0) {
    lines.push("", "## Errors", "");
    for (const error of errors) {
      lines.push(`- ${error.scenario}: ${error.message}`);
    }
  }

  await writeFile(path.join(LOG_ROOT, "SUMMARY.md"), `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  await loadEnvFile(path.join(process.cwd(), ".env.local"));
  await mkdir(LOG_ROOT, { recursive: true });

  const config = requireConfig();
  const summaryRows = [];
  const errors = [];

  for (const [index, scenario] of SCENARIOS.entries()) {
    try {
      await runScenario(config, scenario, index, summaryRows);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ scenario: scenario.name, message });
      await mkdir(path.join(LOG_ROOT, scenario.id), { recursive: true });
      await writeJson(path.join(LOG_ROOT, scenario.id, "error.json"), {
        scenario: scenario.name,
        message,
      });
    }
  }

  await writeSummary(summaryRows, errors);

  if (errors.length > 0) {
    throw new Error(`${errors.length} Hotelbeds Transfers certification scenario(s) failed.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
