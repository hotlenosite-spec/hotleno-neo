import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LOG_ROOT = path.join(process.cwd(), "logs", "tbo-certification");
const DEFAULT_HOTEL_CODES = "1120548,1247101";
const DEFAULT_NATIONALITY = "AE";
const PAYMENT_MODE = "Limit";

const TIMEOUTS = {
  Search: 23_000,
  PreBook: 23_000,
  Book: 120_000,
  BookingDetail: 30_000,
};

const CASES = [
  {
    number: 1,
    name: "Room 1 - Adult 1",
    paxRooms: [{ Adults: 1, Children: 0, ChildrenAges: [] }],
  },
  {
    number: 2,
    name: "Room 1 - Adult 1, Child 1",
    paxRooms: [{ Adults: 1, Children: 1, ChildrenAges: [5] }],
  },
  {
    number: 3,
    name: "Room 1 - Adult 2, Child 2",
    paxRooms: [{ Adults: 2, Children: 2, ChildrenAges: [5, 8] }],
  },
  {
    number: 4,
    name: "Room 1 - Adult 1 + Room 2 - Adult 1",
    paxRooms: [
      { Adults: 1, Children: 0, ChildrenAges: [] },
      { Adults: 1, Children: 0, ChildrenAges: [] },
    ],
  },
  {
    number: 5,
    name: "Room 1 - Adult 1, Child 1 + Room 2 - Adult 1",
    paxRooms: [
      { Adults: 1, Children: 1, ChildrenAges: [6] },
      { Adults: 1, Children: 0, ChildrenAges: [] },
    ],
  },
  {
    number: 6,
    name: "Room 1 - Adult 1, Child 2 + Room 2 - Adult 2",
    paxRooms: [
      { Adults: 1, Children: 2, ChildrenAges: [4, 7] },
      { Adults: 2, Children: 0, ChildrenAges: [] },
    ],
  },
  {
    number: 7,
    name: "Booking room with supplements",
    paxRooms: [{ Adults: 2, Children: 0, ChildrenAges: [] }],
    requiresSupplements: true,
  },
];

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
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
  const missing = ["TBO_BASE_URL", "TBO_USERNAME", "TBO_PASSWORD", "TBO_ENV"].filter(
    (key) => !process.env[key],
  );

  if (missing.length > 0) {
    throw new Error(`Missing TBO environment variables: ${missing.join(", ")}`);
  }

  return {
    baseUrl: process.env.TBO_BASE_URL.replace(/\/+$/, ""),
    username: process.env.TBO_USERNAME,
    password: process.env.TBO_PASSWORD,
    environment: process.env.TBO_ENV,
  };
}

function getDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30);

  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);

  return {
    CheckIn: checkIn.toISOString().slice(0, 10),
    CheckOut: checkOut.toISOString().slice(0, 10),
  };
}

function caseDir(caseNumber) {
  return path.join(LOG_ROOT, `case-${String(caseNumber).padStart(2, "0")}`);
}

function scrubSecrets(value) {
  if (Array.isArray(value)) {
    return value.map((item) => scrubSecrets(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => {
        if (/password|username|authorization|credential|token/i.test(key)) {
          return [key, "[REDACTED]"];
        }
        return [key, scrubSecrets(entryValue)];
      }),
    );
  }

  return value;
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(scrubSecrets(data), null, 2)}\n`, "utf8");
}

function isSuccess(responseBody) {
  return responseBody?.Status?.Code === 200;
}

function describeFailure(responseBody, fallback) {
  return (
    responseBody?.Status?.Description ||
    responseBody?.Error?.Message ||
    responseBody?.Message ||
    fallback ||
    "Unknown failure"
  );
}

function hasSupplements(room) {
  return Array.isArray(room?.Supplements) && room.Supplements.flat(Infinity).length > 0;
}

function selectRoom(searchResponse, requiresSupplements = false) {
  const hotelResults = Array.isArray(searchResponse?.HotelResult)
    ? searchResponse.HotelResult
    : [];

  for (const hotel of hotelResults) {
    const rooms = Array.isArray(hotel?.Rooms) ? hotel.Rooms : [];
    const room = requiresSupplements ? rooms.find(hasSupplements) : rooms[0];
    if (room?.BookingCode) {
      return { hotel, room };
    }
  }

  return { hotel: null, room: null };
}

function buildSearchRequest(testCase) {
  const dates = getDates();

  return {
    CheckIn: dates.CheckIn,
    CheckOut: dates.CheckOut,
    HotelCodes: DEFAULT_HOTEL_CODES,
    GuestNationality: DEFAULT_NATIONALITY,
    PaxRooms: testCase.paxRooms,
    ResponseTime: 23,
    IsDetailedResponse: true,
    Filters: {
      Refundable: false,
      NoOfRooms: 0,
      MealType: "All",
    },
  };
}

function buildPreBookRequest(bookingCode) {
  return {
    BookingCode: bookingCode,
    PaymentMode: PAYMENT_MODE,
  };
}

function buildCustomerDetails(paxRooms, caseNumber) {
  return paxRooms.map((room, roomIndex) => {
    const customerNames = [];

    for (let adultIndex = 0; adultIndex < room.Adults; adultIndex += 1) {
      customerNames.push({
        Title: adultIndex === 0 ? "Mr" : "Ms",
        FirstName: `TBOCert${caseNumber}A${adultIndex + 1}`,
        LastName: `Room${roomIndex + 1}`,
        Type: "Adult",
      });
    }

    for (let childIndex = 0; childIndex < room.Children; childIndex += 1) {
      customerNames.push({
        Title: "Master",
        FirstName: `TBOCert${caseNumber}C${childIndex + 1}`,
        LastName: `Room${roomIndex + 1}`,
        Type: "Child",
      });
    }

    return { CustomerNames: customerNames };
  });
}

function buildBookRequest(room, paxRooms, caseNumber) {
  const suffix = `${caseNumber}-${Date.now()}`;

  return {
    BookingCode: room.BookingCode,
    CustomerDetails: buildCustomerDetails(paxRooms, caseNumber),
    ClientReferenceId: `TBO-CERT-${suffix}`,
    BookingReferenceId: `TBO-BR-${suffix}`,
    TotalFare: room.TotalFare,
    EmailId: "certification@uranustravel.com",
    PhoneNumber: "971501234567",
    BookingType: "Voucher",
    PaymentMode: PAYMENT_MODE,
  };
}

function extractBookingIdentifier(bookResponse) {
  const candidates = [
    bookResponse?.ConfirmationNumber,
    bookResponse?.BookingId,
    bookResponse?.BookingReferenceId,
    bookResponse?.BookingReference,
    bookResponse?.HotelBooking?.ConfirmationNumber,
    bookResponse?.HotelBooking?.BookingId,
    bookResponse?.HotelBooking?.BookingReferenceId,
  ];

  return candidates.find((candidate) => typeof candidate === "string" && candidate.length > 0);
}

function buildBookingDetailRequests(identifier) {
  return [
    { ConfirmationNumber: identifier, PaymentMode: PAYMENT_MODE },
    { BookingId: identifier, PaymentMode: PAYMENT_MODE },
    { BookingReferenceId: identifier, PaymentMode: PAYMENT_MODE },
  ];
}

async function requestTbo(config, endpoint, requestBody, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = new Date().toISOString();

  try {
    const response = await fetch(`${config.baseUrl}/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString(
          "base64",
        )}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let body;
    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = { raw: rawText };
    }

    return {
      ok: response.ok,
      httpStatus: response.status,
      startedAt,
      endedAt: new Date().toISOString(),
      body,
    };
  } catch (error) {
    return {
      ok: false,
      httpStatus: 0,
      startedAt,
      endedAt: new Date().toISOString(),
      body: {
        error: error?.name === "AbortError" ? "Request timed out" : error?.message,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runStep(config, testCase, stepName, requestBody) {
  const dir = caseDir(testCase.number);
  const prefix = stepName.toLowerCase();

  await writeJson(path.join(dir, `${prefix}-request.json`), requestBody);

  const response = await requestTbo(
    config,
    stepName,
    requestBody,
    TIMEOUTS[stepName] ?? 30_000,
  );

  await writeJson(path.join(dir, `${prefix}-response.json`), response.body);

  return response;
}

async function runBookingDetail(config, caseNumber, identifier) {
  const dir = caseDir(caseNumber);
  const attempts = buildBookingDetailRequests(identifier);
  let lastResponse = null;

  for (const requestBody of attempts) {
    await writeJson(path.join(dir, "booking-detail-request.json"), requestBody);

    const response = await requestTbo(
      config,
      "BookingDetail",
      requestBody,
      TIMEOUTS.BookingDetail,
    );

    await writeJson(path.join(dir, "booking-detail-response.json"), response.body);
    lastResponse = response;

    if (isSuccess(response.body)) {
      return {
        success: true,
        request: requestBody,
        response: response.body,
      };
    }
  }

  return {
    success: false,
    request: attempts.at(-1),
    response: lastResponse?.body,
    error: describeFailure(lastResponse?.body, "BookingDetail failed"),
  };
}

async function runCase(config, testCase) {
  console.log(`Case ${testCase.number}: ${testCase.name}`);
  await mkdir(caseDir(testCase.number), { recursive: true });

  const result = {
    caseNumber: testCase.number,
    name: testCase.name,
    search: false,
    preBook: false,
    book: false,
    bookingDetail: false,
    bookingIdentifier: null,
    error: null,
  };

  const searchRequest = buildSearchRequest(testCase);
  const searchResponse = await runStep(config, testCase, "Search", searchRequest);

  if (!isSuccess(searchResponse.body)) {
    result.error = describeFailure(searchResponse.body, "Search failed");
    return result;
  }

  const { room } = selectRoom(searchResponse.body, testCase.requiresSupplements);
  if (!room) {
    result.search = true;
    result.error = testCase.requiresSupplements
      ? "Search succeeded but no room with supplements was available"
      : "Search succeeded but no bookable room was available";
    return result;
  }

  result.search = true;

  const preBookRequest = buildPreBookRequest(room.BookingCode);
  const preBookResponse = await runStep(config, testCase, "PreBook", preBookRequest);

  if (!isSuccess(preBookResponse.body)) {
    result.error = describeFailure(preBookResponse.body, "PreBook failed");
    return result;
  }

  result.preBook = true;

  const preBookRoom = selectRoom(preBookResponse.body).room ?? room;
  const bookRequest = buildBookRequest(preBookRoom, testCase.paxRooms, testCase.number);
  const bookResponse = await runStep(config, testCase, "Book", bookRequest);

  if (!isSuccess(bookResponse.body)) {
    result.error = describeFailure(bookResponse.body, "Book failed");
    return result;
  }

  result.book = true;
  result.bookingIdentifier = extractBookingIdentifier(bookResponse.body);

  if (!result.bookingIdentifier) {
    result.error = "Book succeeded but no booking identifier was found for BookingDetail";
    return result;
  }

  const bookingDetailResult = await runBookingDetail(
    config,
    testCase.number,
    result.bookingIdentifier,
  );

  result.bookingDetail = bookingDetailResult.success;
  if (!bookingDetailResult.success) {
    result.error = bookingDetailResult.error;
  }

  return result;
}

async function main() {
  await loadEnvFile(path.join(process.cwd(), ".env.local"));

  const config = requireConfig();
  const startedAt = new Date().toISOString();

  await mkdir(LOG_ROOT, { recursive: true });

  console.log("TBO certification test started");
  console.log(`Environment: ${config.environment}`);
  console.log(`Logs: ${LOG_ROOT}`);

  const results = [];

  for (const testCase of CASES) {
    const result = await runCase(config, testCase);
    results.push(result);
    console.log(
      `  Search=${result.search ? "OK" : "FAIL"} PreBook=${
        result.preBook ? "OK" : "FAIL"
      } Book=${result.book ? "OK" : "FAIL"} BookingDetail=${
        result.bookingDetail ? "OK" : "FAIL"
      }${result.error ? ` - ${result.error}` : ""}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  const summary = {
    startedAt,
    endedAt: new Date().toISOString(),
    environment: config.environment,
    logRoot: LOG_ROOT,
    totals: {
      cases: results.length,
      searchSucceeded: results.filter((result) => result.search).length,
      preBookSucceeded: results.filter((result) => result.preBook).length,
      bookSucceeded: results.filter((result) => result.book).length,
      bookingDetailSucceeded: results.filter((result) => result.bookingDetail).length,
    },
    cases: results,
  };

  await writeJson(path.join(LOG_ROOT, "summary.json"), summary);

  console.log("TBO certification test finished");
  console.log(`Summary: ${path.join(LOG_ROOT, "summary.json")}`);
}

main().catch(async (error) => {
  await mkdir(LOG_ROOT, { recursive: true });
  await writeJson(path.join(LOG_ROOT, "fatal-error.json"), {
    message: error?.message,
    stack: error?.stack,
  });
  console.error(error?.message || error);
  process.exitCode = 1;
});
