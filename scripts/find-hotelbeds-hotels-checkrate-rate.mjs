import { createHash } from "crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const WORKING_DIR = path.join(ROOT, "hotelbeds-hotels-certification-working");
const LOG_DIR = path.join(ROOT, "hotelbeds-hotels-certification-logs", "scenario-01");
const ARCHIVE_DIR = path.join(ROOT, "hotelbeds-hotels-certification-archive");
const BOOKING_BASE_URL = "https://api.test.hotelbeds.com/hotel-api/1.0";
const DELAY_MS = 1_100;
const MAX_REQUESTS = 5;
const MAX_CHECK_RATE_ATTEMPTS = 3;

let requestCount = 0;

function loadEnvFile() {
  const text = readFileSync(ENV_PATH, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    process.env[line.slice(0, index)] = line.slice(index + 1);
  }
}

function requireSafeEnvironment() {
  const bookingBaseUrl =
    process.env.HOTELBEDS_BOOKING_BASE_URL || BOOKING_BASE_URL;
  const contentBaseUrl = process.env.HOTELBEDS_CONTENT_BASE_URL || "";

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run in production.");
  }

  if (!bookingBaseUrl.includes("api.test.hotelbeds.com")) {
    throw new Error("HOTELBEDS_BOOKING_BASE_URL must point to test.");
  }

  if (!contentBaseUrl.includes("api.test.hotelbeds.com")) {
    throw new Error("HOTELBEDS_CONTENT_BASE_URL must point to test.");
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

function getBookingBaseUrl() {
  return (
    process.env.HOTELBEDS_BOOKING_BASE_URL || BOOKING_BASE_URL
  ).replace(/\/+$/, "");
}

function createHeaders() {
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

async function hotelbedsRequest(endpoint, body) {
  if (requestCount >= MAX_REQUESTS) {
    throw new Error("Request limit reached.");
  }

  await sleep(DELAY_MS);
  requestCount += 1;

  const response = await fetch(`${getBookingBaseUrl()}${endpoint}`, {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const safeMessage =
      payload?.error?.message ||
      payload?.message ||
      `Hotelbeds request failed with status ${response.status}`;
    const error = new Error(String(safeMessage));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildAvailabilityRequest() {
  const checkIn = addDays(35);
  const checkOut = addDays(36);
  const destinationCode =
    process.env.HOTELBEDS_HOTELS_CERTIFICATION_DESTINATION_CODE || "";
  const hotelCode = Number(
    process.env.HOTELBEDS_HOTELS_CERTIFICATION_HOTEL_CODE || 1,
  );
  const body = {
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
  };

  if (destinationCode) {
    body.destination = { code: destinationCode };
  } else {
    body.hotels = { hotel: [hotelCode] };
  }

  return body;
}

function flattenRates(payload) {
  const hotels = payload?.hotels?.hotels || [];
  const rows = [];

  for (const hotel of hotels) {
    for (const room of hotel.rooms || []) {
      for (const rate of room.rates || []) {
        if (!rate.rateKey) continue;
        rows.push({ hotel, room, rate });
      }
    }
  }

  return rows;
}

function rateScore(row, index) {
  let score = 0;
  if (row.rate?.rateKey) score += 100;
  if (row.rate?.rateClass === "NOR") score += 40;
  if (row.rate?.rateType && !String(row.rate.rateType).toLowerCase().includes("on")) {
    score += 10;
  }
  if (row.rate?.net) score += 10;
  if (row.room?.name) score += 5;
  return score - index / 1000;
}

function pickCandidateRates(payload) {
  const seenRooms = new Set();
  const sorted = flattenRates(payload)
    .map((row, index) => ({ ...row, index, score: rateScore(row, index) }))
    .sort((a, b) => b.score - a.score);
  const candidates = [];

  for (const row of sorted) {
    const roomKey = `${row.hotel?.code || "hotel"}:${row.room?.code || row.room?.name || "room"}`;
    if (seenRooms.has(roomKey) && candidates.length < sorted.length - 1) continue;
    seenRooms.add(roomKey);
    candidates.push(row);
    if (candidates.length >= MAX_CHECK_RATE_ATTEMPTS) break;
  }

  return candidates;
}

function maskRateKey(rateKey) {
  const value = String(rateKey || "");
  if (value.length <= 16) return `${value.slice(0, 4)}...${value.slice(-4)}`;
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function safeRateLog(row, checkRatePayload) {
  const checkedHotel = checkRatePayload?.hotel || checkRatePayload?.hotels?.hotels?.[0];
  const hotel = checkedHotel || row.hotel || {};
  const room = hotel?.rooms?.[0] || row.room || {};
  const rate = room?.rates?.[0] || row.rate || {};

  return {
    status: "success",
    supplier: "Hotelbeds Accommodation",
    hotelName: hotel.name || row.hotel?.name,
    hotelCode: hotel.code || row.hotel?.code,
    roomName: room.name || row.room?.name || room.code || row.room?.code,
    boardName: rate.boardName || row.rate?.boardName || rate.boardCode,
    amount: rate.net || rate.sellingRate || row.rate?.net || row.rate?.sellingRate,
    currency: rate.currency || hotel.currency || row.rate?.currency || row.hotel?.currency,
    cancellationPolicies:
      rate.cancellationPolicies || row.rate?.cancellationPolicies || [],
    rateKeyMasked: maskRateKey(rate.rateKey || row.rate?.rateKey),
  };
}

function getFinalRateKeyFromCheckRate(row, checkRatePayload) {
  const checkedHotel = checkRatePayload?.hotel || checkRatePayload?.hotels?.hotels?.[0];
  const room = checkedHotel?.rooms?.[0];
  const rate = room?.rates?.[0];
  return typeof rate?.rateKey === "string" && rate.rateKey
    ? rate.rateKey
    : row.rate.rateKey;
}

function writeJson(filePath, data) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function archiveFailure(attempt, data) {
  const filePath = path.join(
    ARCHIVE_DIR,
    `scenario-01-check-rate-attempt-${attempt}-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`,
  );
  writeJson(filePath, data);
}

async function main() {
  loadEnvFile();
  requireSafeEnvironment();

  rmSync(LOG_DIR, { recursive: true, force: true });
  mkdirSync(WORKING_DIR, { recursive: true });

  const availabilityRequest = buildAvailabilityRequest();
  const availability = await hotelbedsRequest("/hotels", availabilityRequest);
  writeJson(path.join(WORKING_DIR, "availability-safe.json"), {
    savedAt: new Date().toISOString(),
    note: "Working file only. Contains full rateKeys. Do not include in final ZIP.",
    request: availabilityRequest,
    response: availability,
  });

  const candidates = pickCandidateRates(availability);
  if (!candidates.length) {
    throw new Error("No candidate rates with rateKey were found.");
  }

  let success = null;
  let attempts = 0;

  for (const candidate of candidates.slice(0, MAX_CHECK_RATE_ATTEMPTS)) {
    attempts += 1;
    try {
      const checkRate = await hotelbedsRequest("/checkrates", {
        rooms: [{ rateKey: candidate.rate.rateKey }],
      });
      const finalRateKey = getFinalRateKeyFromCheckRate(candidate, checkRate);
      success = safeRateLog(candidate, checkRate);
      writeJson(path.join(WORKING_DIR, "check-rate-final-rate-key.json"), {
        savedAt: new Date().toISOString(),
        note: "Working file only. Contains full finalRateKey from Check Rate. Do not include in final ZIP.",
        finalRateKey,
        availabilityRateKey: candidate.rate.rateKey,
        finalRateKeyMasked: maskRateKey(finalRateKey),
        checkRatePayload: checkRate,
      });
      writeJson(path.join(LOG_DIR, "02-check-rate.json"), success);
      break;
    } catch (error) {
      archiveFailure(attempts, {
        status: "check_rate_not_accepted",
        attempt: attempts,
        safeError: error instanceof Error ? error.message : "Unknown error",
        statusCode: error?.status,
        selectedRate: {
          hotelName: candidate.hotel?.name,
          hotelCode: candidate.hotel?.code,
          roomName: candidate.room?.name || candidate.room?.code,
          boardName: candidate.rate?.boardName || candidate.rate?.boardCode,
          amount: candidate.rate?.net || candidate.rate?.sellingRate,
          currency: candidate.rate?.currency || candidate.hotel?.currency,
          rateKeyMasked: maskRateKey(candidate.rate?.rateKey),
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        success: Boolean(success),
        requestCount,
        availabilityExecuted: true,
        checkRateAttempts: attempts,
        bookingCreated: false,
        cancellationExecuted: false,
        workingFile: path.relative(
          ROOT,
          path.join(WORKING_DIR, "availability-safe.json"),
        ),
        finalLog: success
          ? path.relative(ROOT, path.join(LOG_DIR, "02-check-rate.json"))
          : "",
        result: success
          ? {
              hotelName: success.hotelName,
              roomName: success.roomName,
              boardName: success.boardName,
              amount: success.amount,
              currency: success.currency,
              rateKeyMasked: success.rateKeyMasked,
              cancellationPoliciesCount: success.cancellationPolicies.length,
            }
          : null,
      },
      null,
      2,
    ),
  );

  if (!success) process.exitCode = 1;
}

main().catch((error) => {
  console.log(
    JSON.stringify(
      {
        success: false,
        requestCount,
        safeError: error instanceof Error ? error.message : "Unknown error",
        bookingCreated: false,
        cancellationExecuted: false,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
