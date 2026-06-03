import { createHash } from "crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const LOG_ROOT = path.join(ROOT, "hotelbeds-hotels-certification-logs");
const ARCHIVE_ROOT = path.join(ROOT, "hotelbeds-hotels-certification-archive");
const SCENARIO_ID = "scenario-01-accommodation";
const SCENARIO_DIR = path.join(LOG_ROOT, SCENARIO_ID);

const REQUEST_DELAY_MS = 1_100;
const MAX_REQUESTS = 10;
let requestCount = 0;

function parseEnvFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  const env = {};

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    env[line.slice(0, index)] = line.slice(index + 1);
  }

  return { text, env };
}

function setEnvTextValue(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(text)) return text.replace(pattern, line);
  return `${text.replace(/\s*$/, "")}\n${line}\n`;
}

function writeEnvFlags(values) {
  let text = readFileSync(ENV_PATH, "utf8");
  for (const [key, value] of Object.entries(values)) {
    text = setEnvTextValue(text, key, value);
  }
  writeFileSync(ENV_PATH, text, "utf8");
}

function loadEnv() {
  const { env } = parseEnvFile(ENV_PATH);
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
}

function requireTestEnvironment() {
  const bookingBaseUrl = process.env.HOTELBEDS_BOOKING_BASE_URL || "";
  const contentBaseUrl = process.env.HOTELBEDS_CONTENT_BASE_URL || "";

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run in production.");
  }

  if (process.env.HOTELBEDS_HOTELS_SEARCH_ENABLED !== "true") {
    throw new Error("HOTELBEDS_HOTELS_SEARCH_ENABLED must be true.");
  }

  if (process.env.HOTELBEDS_HOTELS_BOOKING_ENABLED !== "true") {
    throw new Error("HOTELBEDS_HOTELS_BOOKING_ENABLED must be true.");
  }

  if (process.env.HOTELBEDS_HOTELS_CERTIFICATION_AUTO_RUN !== "true") {
    throw new Error("HOTELBEDS_HOTELS_CERTIFICATION_AUTO_RUN must be true.");
  }

  if (!bookingBaseUrl.includes("api.test.hotelbeds.com")) {
    throw new Error("HOTELBEDS_BOOKING_BASE_URL must point to Hotelbeds test.");
  }

  if (!contentBaseUrl.includes("api.test.hotelbeds.com")) {
    throw new Error("HOTELBEDS_CONTENT_BASE_URL must point to Hotelbeds test.");
  }

  if (!process.env.HOTELBEDS_API_KEY) {
    throw new Error("HOTELBEDS_API_KEY is missing.");
  }

  if (!(process.env.HOTELBEDS_API_SECRET || process.env.HOTELBEDS_SECRET)) {
    throw new Error("HOTELBEDS_SECRET is missing.");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHeaders() {
  const apiKey = process.env.HOTELBEDS_API_KEY;
  const secret = process.env.HOTELBEDS_API_SECRET || process.env.HOTELBEDS_SECRET;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha256")
    .update(`${apiKey}${secret}${timestamp}`)
    .digest("hex");

  return {
    "Api-Key": apiKey,
    "X-Signature": signature,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip",
  };
}

function bookingBaseUrl() {
  return (process.env.HOTELBEDS_BOOKING_BASE_URL || "").replace(/\/+$/, "");
}

async function hotelbedsRequest(endpoint, options) {
  if (requestCount >= MAX_REQUESTS) {
    throw new Error("Safe request limit reached.");
  }

  await sleep(REQUEST_DELAY_MS);
  requestCount += 1;

  const response = await fetch(`${bookingBaseUrl()}${endpoint}`, {
    method: options.method,
    headers: getHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Non JSON response at ${endpoint}.`);
    }
  }

  if (!response.ok) {
    const safeMessage =
      payload?.error?.message ||
      payload?.message ||
      `Hotelbeds request failed with status ${response.status}`;
    throw new Error(String(safeMessage));
  }

  return payload;
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function firstBookableRate(availabilityPayload) {
  const hotels = availabilityPayload?.hotels?.hotels || [];

  for (const hotel of hotels) {
    for (const room of hotel.rooms || []) {
      for (const rate of room.rates || []) {
        if (!rate.rateKey) continue;
        return { hotel, room, rate };
      }
    }
  }

  return null;
}

function selectedRateFromCheckRate(payload, fallback) {
  const hotel = payload?.hotel || payload?.hotels?.hotels?.[0] || fallback.hotel;
  const room = hotel?.rooms?.[0] || fallback.room;
  const rate = room?.rates?.[0] || fallback.rate;
  return { hotel, room, rate };
}

function getFinalRateKeyFromCheckRate(payload, fallbackRateKey) {
  const hotel = payload?.hotel || payload?.hotels?.hotels?.[0];
  const room = hotel?.rooms?.[0];
  const rate = room?.rates?.[0];
  const finalRateKey = rate?.rateKey;

  if (typeof finalRateKey === "string" && finalRateKey.length > 0) {
    return finalRateKey;
  }

  return fallbackRateKey;
}

function safeRateSummary(selected) {
  return {
    hotelCode: selected.hotel?.code,
    hotelName: selected.hotel?.name,
    destinationCode: selected.hotel?.destinationCode,
    destinationName: selected.hotel?.destinationName,
    checkIn: selected.hotel?.checkIn,
    checkOut: selected.hotel?.checkOut,
    roomCode: selected.room?.code,
    roomName: selected.room?.name,
    boardCode: selected.rate?.boardCode,
    boardName: selected.rate?.boardName,
    rateClass: selected.rate?.rateClass,
    rateType: selected.rate?.rateType,
    net: selected.rate?.net,
    currency: selected.rate?.currency || selected.hotel?.currency,
    cancellationPolicies: selected.rate?.cancellationPolicies || [],
    rateKeySuffix: selected.rate?.rateKey
      ? String(selected.rate.rateKey).slice(-12)
      : undefined,
  };
}

function extractBookingReference(payload) {
  return payload?.booking?.reference || payload?.bookingReference || payload?.reference;
}

function voucherSummary(detailsPayload, bookingReference, selected) {
  const booking = detailsPayload?.booking || detailsPayload || {};
  const hotel = booking.hotel || selected.hotel || {};
  const room = hotel.rooms?.[0] || selected.room || {};
  const rate = room.rates?.[0] || selected.rate || {};
  const holder = booking.holder || {};

  return {
    supplier: "Hotelbeds Accommodation",
    bookingReference,
    status: booking.status,
    hotelName: hotel.name || selected.hotel?.name,
    checkIn: hotel.checkIn || selected.hotel?.checkIn,
    checkOut: hotel.checkOut || selected.hotel?.checkOut,
    roomName: room.name || selected.room?.name,
    boardName: rate.boardName || selected.rate?.boardName,
    holder: [holder.name, holder.surname].filter(Boolean).join(" "),
    cancellationPolicies: rate.cancellationPolicies || selected.rate?.cancellationPolicies || [],
    remarks: booking.remark || booking.remarks || [],
    voucherGenerated: true,
  };
}

function writeJson(fileName, data) {
  mkdirSync(SCENARIO_DIR, { recursive: true });
  writeFileSync(
    path.join(SCENARIO_DIR, fileName),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

function moveExistingLogsToArchive() {
  if (!existsSync(SCENARIO_DIR)) return;
  mkdirSync(ARCHIVE_ROOT, { recursive: true });
  const target = path.join(
    ARCHIVE_ROOT,
    `${SCENARIO_ID}-${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  rmSync(target, { recursive: true, force: true });
  mkdirSync(path.dirname(target), { recursive: true });
  renameOrCopy(SCENARIO_DIR, target);
}

function renameOrCopy(source, target) {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  const command = `Copy-Item -LiteralPath '${source.replaceAll("'", "''")}\\*' -Destination '${target.replaceAll("'", "''")}' -Recurse -Force; Remove-Item -LiteralPath '${source.replaceAll("'", "''")}' -Recurse -Force`;
  const result = spawnPowerShell(command);
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Unable to archive logs.");
  }
}

function spawnPowerShell(command) {
  return spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
}

async function run() {
  const originalEnvText = readFileSync(ENV_PATH, "utf8");
  let bookingReference = "";
  let cancelStatus = "not_run";
  let voucherGenerated = false;
  let bookingCreated = false;

  try {
    writeEnvFlags({
      HOTELBEDS_HOTELS_SEARCH_ENABLED: "true",
      HOTELBEDS_HOTELS_BOOKING_ENABLED: "true",
      HOTELBEDS_HOTELS_CERTIFICATION_AUTO_RUN: "true",
    });
    loadEnv();
    requireTestEnvironment();
    moveExistingLogsToArchive();

    const hotelCode = Number(process.env.HOTELBEDS_HOTELS_CERTIFICATION_HOTEL_CODE || 1);
    const checkIn = addDays(35);
    const checkOut = addDays(36);
    const availabilityRequest = {
      stay: { checkIn, checkOut },
      occupancies: [
        {
          rooms: 1,
          adults: 2,
          children: 0,
          paxes: [
            { type: "AD", age: 30 },
            { type: "AD", age: 30 },
          ],
        },
      ],
      hotels: { hotel: [hotelCode] },
    };

    const availability = await hotelbedsRequest("/hotels", {
      method: "POST",
      body: availabilityRequest,
    });
    const selected = firstBookableRate(availability);
    if (!selected) {
      throw new Error("No bookable rate found from the single availability request.");
    }

    writeJson("01-availability.json", {
      status: "success",
      request: {
        checkIn,
        checkOut,
        hotels: [hotelCode],
        occupancies: "1 room, 2 adults",
      },
      selectedRate: safeRateSummary(selected),
    });

    const checkRate = await hotelbedsRequest("/checkrates", {
      method: "POST",
      body: { rooms: [{ rateKey: selected.rate.rateKey }] },
    });
    const finalRateKey = getFinalRateKeyFromCheckRate(
      checkRate,
      selected.rate.rateKey,
    );
    const checked = selectedRateFromCheckRate(checkRate, selected);
    checked.rate.rateKey = finalRateKey;
    writeJson(path.join(LOG_ROOT, "check-rate-working-final-rate.json"), {
      savedAt: new Date().toISOString(),
      note: "Working file only. Contains full finalRateKey from Check Rate. Do not include in final ZIP.",
      finalRateKey,
      availabilityRateKey: selected.rate.rateKey,
      finalRateKeyMasked: safeRateSummary(checked).rateKeySuffix,
      checkRatePayload: checkRate,
    });
    writeJson("02-check-rate.json", {
      status: "success",
      selectedRate: safeRateSummary(checked),
      rateSource: "Hotelbeds Check Rate",
    });

    const clientReference = `HOTLENO-HOTELS-CERT-${Date.now()}`;
    const booking = await hotelbedsRequest("/bookings", {
      method: "POST",
      body: {
        clientReference,
        holder: { name: "TEST", surname: "CERTIFICATION" },
        rooms: [
          {
            rateKey: checked.rate.rateKey,
            paxes: [
              {
                roomId: 1,
                type: "AD",
                name: "TEST",
                surname: "CERTIFICATION",
              },
              {
                roomId: 1,
                type: "AD",
                name: "TESTTWO",
                surname: "CERTIFICATION",
              },
            ],
          },
        ],
        remark: "Hotelbeds Accommodation certification test booking.",
      },
    });
    bookingCreated = true;
    bookingReference = String(extractBookingReference(booking) || "");
    if (!bookingReference) {
      throw new Error("Booking succeeded but no booking reference was returned.");
    }
    writeJson("03-booking-confirmation.json", {
      status: "confirmed",
      bookingReference,
      clientReference,
      selectedRate: safeRateSummary(checked),
    });

    const details = await hotelbedsRequest(
      `/bookings/ENG/${encodeURIComponent(bookingReference)}`,
      { method: "GET" },
    );
    writeJson("04-booking-details.json", {
      status: "success",
      bookingReference,
      voucher: voucherSummary(details, bookingReference, checked),
    });

    const voucher = voucherSummary(details, bookingReference, checked);
    voucherGenerated = true;
    writeJson("05-voucher.json", voucher);

    const cancel = await hotelbedsRequest(
      `/bookings/ENG/${encodeURIComponent(bookingReference)}?cancellationFlag=CANCELLATION`,
      { method: "DELETE" },
    );
    cancelStatus = "cancelled";
    writeJson("06-cancel.json", {
      status: "cancelled",
      bookingReference,
      supplierStatus: cancel?.booking?.status || cancel?.status || "cancelled",
    });

    writeJson("SUMMARY.json", {
      scenario: "Hotelbeds Accommodation single certification scenario",
      status: "completed",
      supplier: "Hotelbeds Accommodation",
      requestCount,
      bookingReference,
      bookingCreated,
      voucherGenerated,
      cancelStatus,
      selectedRate: safeRateSummary(checked),
    });

    writeFileSync(
      path.join(SCENARIO_DIR, "SUMMARY.md"),
      `# Hotelbeds Accommodation Certification Scenario

Status: Completed
Supplier: Hotelbeds Accommodation
Requests used: ${requestCount}
Booking reference: ${bookingReference}
Voucher generated: ${voucherGenerated ? "Yes" : "No"}
Cancellation status: ${cancelStatus}
`,
      "utf8",
    );

    const reviewData = {
      scenarios: [
        {
          scenario: "scenario-01",
          title: "Scenario 1 - Hotelbeds Accommodation booking funnel",
          supplier: "Hotelbeds Accommodation",
          status: "Completed successfully",
          bookingReference,
          hotelName: checked.hotel?.name || selected.hotel?.name || "Hotelbeds hotel",
          destination:
            checked.hotel?.destinationName ||
            selected.hotel?.destinationName ||
            checked.hotel?.destinationCode ||
            selected.hotel?.destinationCode,
          checkIn: checked.hotel?.checkIn || selected.hotel?.checkIn || checkIn,
          checkOut: checked.hotel?.checkOut || selected.hotel?.checkOut || checkOut,
          room: checked.room?.name || selected.room?.name,
          board: checked.rate?.boardName || selected.rate?.boardName,
          rate: String(checked.rate?.net || selected.rate?.net || ""),
          currency:
            checked.rate?.currency ||
            checked.hotel?.currency ||
            selected.rate?.currency ||
            selected.hotel?.currency,
          voucherStatus: "Generated",
          cancellationStatus: "Cancelled",
        },
      ],
    };
    writeFileSync(
      path.join(LOG_ROOT, "review-data.json"),
      `${JSON.stringify(reviewData, null, 2)}\n`,
      "utf8",
    );

    console.log(
      JSON.stringify(
        {
          success: true,
          requestCount,
          bookingCreated,
          bookingReference,
          voucherGenerated,
          cancelStatus,
          logs: path.relative(ROOT, SCENARIO_DIR),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    mkdirSync(ARCHIVE_ROOT, { recursive: true });
    if (existsSync(SCENARIO_DIR)) {
      const target = path.join(
        ARCHIVE_ROOT,
        `${SCENARIO_ID}-stopped-${new Date().toISOString().replace(/[:.]/g, "-")}`,
      );
      renameOrCopy(SCENARIO_DIR, target);
    }

    console.log(
      JSON.stringify(
        {
          success: false,
          requestCount,
          bookingCreated,
          bookingReference,
          voucherGenerated,
          cancelStatus,
          safeError: error instanceof Error ? error.message : "Unknown error",
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    writeFileSync(ENV_PATH, originalEnvText, "utf8");
    writeEnvFlags({
      HOTELBEDS_HOTELS_BOOKING_ENABLED: "false",
      HOTELBEDS_HOTELS_CERTIFICATION_AUTO_RUN: "false",
    });
  }
}

run();
