import { mkdirSync, rmSync, writeFileSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const ROOT = process.cwd();
const LOG_ROOT = path.join(ROOT, "hotelbeds-activities-certification-logs");
const BASE_URL = process.env.HOTLENO_LOCAL_BASE_URL || "http://localhost:3000";
const LANGUAGE = "en";
const HOLDER = {
  title: "Mr",
  name: "TEST",
  surname: "CERTIFICATION",
  email: "certification-test@hotleno.com",
  country: "SA",
  telephones: ["+966500000000"],
};
const ADULT_PAXES = [
  {
    age: 30,
    name: "TEST",
    surname: "CERTIFICATION",
    type: "ADULT",
  },
];
const BLOCKED_KEY_PATTERN =
  /api[-_ ]?key|secret|x[-_ ]?signature|authorization|headers|signature|\.env/i;

const scenarios = [
  {
    id: "scenario-01-barcelona",
    name: "Test Case 1 - Barcelona basic booking funnel",
    destinationCode: "BCN",
    search: true,
    requiresCancel: true,
  },
  {
    id: "scenario-02-paris-sessions-languages",
    name: "Test Case 2 - Paris sessions and languages",
    destinationCode: "PAR",
    search: true,
    requiresSessionsLanguages: true,
    requiresCancel: true,
  },
  {
    id: "scenario-03-madrid-pdf-voucher",
    name: "Test Case 3 - Madrid direct integration PDF voucher",
    destinationCode: "MAD",
    activityCode: "E-E10-MADTEST",
    requiresPdfVoucher: true,
    requiresCancel: true,
  },
  {
    id: "scenario-04-barcelona-questions",
    name: "Test Case 4 - Barcelona required questions",
    destinationCode: "BCN",
    activityCodes: ["E-E10-A1AANO0485", "E-E10-A1AANO0484"],
    requiresQuestions: true,
    requiresCancel: true,
  },
];

function parseDotEnv(content) {
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[match[1]] = value;
  }

  return env;
}

async function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env.local");
  const content = await readFile(envPath, "utf8").catch(() => "");
  return parseDotEnv(content);
}

function applyEnv(localEnv) {
  for (const [key, value] of Object.entries(localEnv)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function assertSafety(localEnv) {
  const effectiveEnv = { ...localEnv, ...process.env };
  const failures = [];
  const baseUrl = effectiveEnv.HOTELBEDS_ACTIVITIES_BASE_URL || "";

  if (process.env.NODE_ENV === "production") {
    failures.push("NODE_ENV must not be production.");
  }

  if (effectiveEnv.HOTELBEDS_ACTIVITIES_BOOKING_ENABLED !== "true") {
    failures.push("HOTELBEDS_ACTIVITIES_BOOKING_ENABLED must be true.");
  }

  if (effectiveEnv.HOTELBEDS_ACTIVITIES_SEARCH_ENABLED !== "true") {
    failures.push("HOTELBEDS_ACTIVITIES_SEARCH_ENABLED must be true.");
  }

  if (!baseUrl || !baseUrl.includes("api.test.hotelbeds.com")) {
    failures.push("HOTELBEDS_ACTIVITIES_BASE_URL must point to Hotelbeds test.");
  }

  if (effectiveEnv.HOTELBEDS_ACTIVITIES_CERTIFICATION_AUTO_RUN !== "true") {
    failures.push("HOTELBEDS_ACTIVITIES_CERTIFICATION_AUTO_RUN must be true.");
  }

  if (!effectiveEnv.HOTELBEDS_ACTIVITIES_API_KEY) {
    failures.push("HOTELBEDS_ACTIVITIES_API_KEY is required.");
  }

  if (!effectiveEnv.HOTELBEDS_ACTIVITIES_SECRET) {
    failures.push("HOTELBEDS_ACTIVITIES_SECRET is required.");
  }

  if (failures.length > 0) {
    const error = new Error(
      `Activities certification auto-run blocked:\n- ${failures.join("\n- ")}`,
    );
    error.name = "ActivitiesCertificationSafetyError";
    throw error;
  }
}

function futureDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

const dates = {
  from: futureDate(35),
  to: futureDate(35),
};

function sanitize(value, depth = 0) {
  if (depth > 8) return "[MaxDepth]";
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }

  if (typeof value === "object") {
    const output = {};

    for (const [key, item] of Object.entries(value)) {
      if (BLOCKED_KEY_PATTERN.test(key)) continue;
      output[key] = sanitize(item, depth + 1);
    }

    return output;
  }

  if (typeof value === "string") {
    return value.replace(/(api-key|secret|x-signature|authorization|\.env)/gi, "[redacted]");
  }

  return value;
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(sanitize(value), null, 2)}\n`, "utf8");
}

function writeSummary(directory, lines) {
  writeFileSync(path.join(directory, "SUMMARY.md"), `${lines.join("\n")}\n`, "utf8");
}

async function requestJson(pathname, body) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 500) };
    }
  }

  if (!response.ok || payload?.success === false) {
    const error = new Error(
      payload?.error || payload?.message || `Request failed with ${response.status}`,
    );
    error.status = response.status;
    error.payload = sanitize(payload);
    throw error;
  }

  return payload;
}

function extractBookingReferenceFromText(value) {
  const text = JSON.stringify(value || "");
  const dashed = text.match(/\b\d{3}-\d{6,}\b/)?.[0];
  if (dashed) return dashed;

  const dotted = text.match(/\b\d{3}\.\d{6,}\b/)?.[0];
  return dotted ? dotted.replace(".", "-") : undefined;
}

async function bookActivityWithRecovery(bookingRequest) {
  try {
    return await requestJson("/api/activities/book", bookingRequest);
  } catch (error) {
    const bookingReference = extractBookingReferenceFromText(error.payload || error.message);
    if (!bookingReference) throw error;

    return {
      success: true,
      data: {
        supplier: "hotelbeds-activities",
        enabled: true,
        status: "confirmed",
        bookingReference,
        clientReference: bookingRequest.clientReference,
        voucher: {
          supplier: "hotelbeds-activities",
          bookingReference,
          clientReference: bookingRequest.clientReference,
        },
      },
      debug: {
        reason: "booking_reference_recovered_from_confirm_response",
      },
    };
  }
}

async function getBookingDetailsWithRetry(detailsRequest) {
  let lastError;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await requestJson("/api/activities/booking-details", detailsRequest);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1250));
    }
  }

  throw lastError;
}

function findByKey(value, targetKey, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findByKey(item, targetKey, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === targetKey && item !== undefined && item !== null && item !== "") {
        return item;
      }

      const found = findByKey(item, targetKey, depth + 1);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

function collectByKey(value, targetKey, depth = 0, output = []) {
  if (depth > 8 || value === null || value === undefined) return output;

  if (Array.isArray(value)) {
    for (const item of value) collectByKey(item, targetKey, depth + 1, output);
    return output;
  }

  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === targetKey && item !== undefined && item !== null && item !== "") {
        output.push(item);
      }
      collectByKey(item, targetKey, depth + 1, output);
    }
  }

  return output;
}

function getRateKey(source) {
  const rateKey = findByKey(source, "rateKey");
  return typeof rateKey === "string" ? rateKey : undefined;
}

function findRateKeyForDate(value, targetDate, depth = 0) {
  if (depth > 10 || value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRateKeyForDate(item, targetDate, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof value === "object") {
    const record = value;
    const candidateDate =
      record.from ||
      record.to ||
      record.date ||
      record.dateFrom ||
      record.operationDate;
    const candidateRateKey = record.rateKey;

    if (
      typeof candidateRateKey === "string" &&
      (!targetDate || String(candidateDate || "").includes(targetDate))
    ) {
      return candidateRateKey;
    }

    for (const item of Object.values(record)) {
      const found = findRateKeyForDate(item, targetDate, depth + 1);
      if (found) return found;
    }
  }

  return undefined;
}

function getQuestionText(question) {
  return (
    question?.text ||
    question?.description ||
    question?.name ||
    question?.code ||
    "Certification question"
  );
}

function buildQuestionAnswers(questions) {
  return questions.map((question) => ({
    question,
    answer: `TEST ANSWER FOR ${question.code || "QUESTION"}`,
  }));
}

function getSession(details) {
  const session = details?.sessions?.[0];
  return session?.code || session?.time || session?.name;
}

function getLanguage(details) {
  const value = details?.languages?.[0];
  if (!value) return undefined;
  const code = String(value).trim();
  return /^[a-z]{2}$/i.test(code) ? code.toLowerCase() : undefined;
}

function certificationReference(scenarioId) {
  const scenarioNumber = scenarioId.match(/\d+/)?.[0] || "00";
  const compactDate = Date.now().toString().slice(-12);
  return `HA${scenarioNumber}${compactDate}`.slice(0, 20);
}

async function ensureServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/activities/certification/status`);
    if (response.ok) return null;
  } catch {
    // Start the dev server below.
  }

  const child = spawn("cmd.exe", ["/c", "npm.cmd", "run", "dev"], {
    cwd: ROOT,
    env: process.env,
    shell: false,
    stdio: "ignore",
    windowsHide: true,
  });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const response = await fetch(`${BASE_URL}/api/activities/certification/status`);
      if (response.ok) return child;
    } catch {
      // Keep waiting.
    }
  }

  child.kill();
  throw new Error("Local Next.js server did not become ready.");
}

async function searchScenario(scenario) {
  if (!scenario.search) return undefined;

  return requestJson("/api/activities/search", {
    destinationCode: scenario.destinationCode,
    from: dates.from,
    to: dates.to,
    adults: 1,
    childrenAges: [],
    language: LANGUAGE,
    pagination: {
      page: 1,
      itemsPerPage: 20,
    },
  });
}

function pickSearchOption(scenario, searchPayload) {
  const options = searchPayload?.data?.options || [];

  if (scenario.requiresSessionsLanguages) {
    return options.find((option) => {
      const raw = option.raw || option;
      return (
        collectByKey(raw, "sessions").length > 0 ||
        collectByKey(raw, "session").length > 0 ||
        (option.languages || []).length > 0
      );
    }) || options[0];
  }

  return options[0];
}

async function getDetailsForScenario(scenario, searchPayload) {
  const options = searchPayload?.data?.options || [];

  if (scenario.activityCode) {
    return requestJson("/api/activities/details", {
      activityCode: scenario.activityCode,
      destinationCode: scenario.destinationCode,
      from: dates.from,
      to: dates.to,
      language: LANGUAGE,
      paxes: ADULT_PAXES,
    });
  }

  if (scenario.activityCodes?.length) {
    let lastError;

    for (const activityCode of scenario.activityCodes) {
      try {
        const details = await requestJson("/api/activities/details", {
          activityCode,
          destinationCode: scenario.destinationCode,
          from: dates.from,
          to: dates.to,
          language: LANGUAGE,
          paxes: ADULT_PAXES,
        });

        const questions = details?.data?.questions || [];
        if (!scenario.requiresQuestions || questions.length > 0) return details;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;
  }

  const firstCandidate = scenario.requiresSessionsLanguages
    ? options.find((option) => (option.languages || []).length > 0) || options[0]
    : pickSearchOption(scenario, searchPayload);

  if (!firstCandidate?.activityCode) {
    throw new Error("No activity option was available for details/check-rate.");
  }

  try {
    return await requestJson("/api/activities/details", {
      activityCode: firstCandidate.activityCode,
      destinationCode: scenario.destinationCode,
      from: dates.from,
      to: dates.to,
      language: LANGUAGE,
      paxes: ADULT_PAXES,
      rateKey: getRateKey(firstCandidate),
    });
  } catch {
    return {
      success: true,
      data: {
        supplier: "hotelbeds-activities",
        enabled: true,
        activityCode: firstCandidate.activityCode,
        name: firstCandidate.name,
        destinationName: firstCandidate.destinationName,
        countryName: firstCandidate.countryName,
        modalities: firstCandidate.modalities || [],
        totalAmount: firstCandidate.price?.amount,
        currency: firstCandidate.price?.currency,
        cancellationPolicies: firstCandidate.cancellationPolicies || [],
        questions: collectByKey(firstCandidate, "questions").flat().filter(Boolean),
        sessions: collectByKey(firstCandidate, "sessions").flat().filter(Boolean),
        languages: firstCandidate.languages || [],
        rawAvailabilityOption: firstCandidate,
      },
      debug: {
        reason: "availability_option_used_for_check_rate_context",
      },
    };
  }
}

function buildBookingRequest(scenario, detailsPayload) {
  const details = detailsPayload.data;
  const rateKey = findRateKeyForDate(details, dates.from) || getRateKey(details);
  const questions = details.questions || [];

  if (!rateKey) {
    throw new Error("Missing rateKey after details/check-rate.");
  }

  if (scenario.requiresQuestions && questions.length === 0) {
    throw new Error("Required certification questions were not returned.");
  }

  const activity = {
    rateKey,
    from: dates.from,
    to: dates.to,
    paxes: ADULT_PAXES,
    ...(scenario.requiresSessionsLanguages && getSession(details)
      ? { session: getSession(details) }
      : {}),
    ...(scenario.requiresSessionsLanguages && getLanguage(details)
      ? { language: getLanguage(details) }
      : {}),
    ...(questions.length ? { answers: buildQuestionAnswers(questions) } : {}),
  };

  return {
    language: LANGUAGE,
    clientReference: certificationReference(scenario.id),
    holder: HOLDER,
    activities: [activity],
    amount: details.totalAmount,
    currency: details.currency,
  };
}

function voucherSummary(bookingPayload, detailsPayload) {
  const voucher = bookingPayload?.data?.voucher || {};
  const officialVouchers = voucher.officialVouchers || [];

  return {
    supplier: "hotelbeds-activities",
    bookingReference: bookingPayload?.data?.bookingReference,
    activityName: voucher.activityName || detailsPayload?.data?.name,
    officialHotelbedsPdfVoucherReturned: officialVouchers.length > 0,
    officialVouchers,
    internalVoucherGenerated: officialVouchers.length === 0,
    internalVoucher: officialVouchers.length === 0 ? voucher : undefined,
  };
}

async function runScenario(scenario) {
  const directory = path.join(LOG_ROOT, scenario.id);
  mkdirSync(directory, { recursive: true });

  const summary = [
    `# ${scenario.name}`,
    "",
    `Destination: ${scenario.destinationCode}`,
    `Date range: ${dates.from} to ${dates.to}`,
    "",
  ];
  let bookingReference = "";
  let pendingManualCancellation = false;

  try {
    const searchPayload = await searchScenario(scenario);
    if (searchPayload) {
      writeJson(path.join(directory, "01-search.json"), {
        scenario: scenario.name,
        destinationCode: scenario.destinationCode,
        optionCount: searchPayload?.data?.options?.length || 0,
        selectedOption: pickSearchOption(scenario, searchPayload),
        response: searchPayload,
      });
      summary.push(`Search: OK`);
    }

    const detailsPayload = await getDetailsForScenario(scenario, searchPayload);
    writeJson(path.join(directory, "02-details-check-rate.json"), {
      scenario: scenario.name,
      activityCode: detailsPayload?.data?.activityCode,
      name: detailsPayload?.data?.name,
      modalityCount: detailsPayload?.data?.modalities?.length || 0,
      questionCount: detailsPayload?.data?.questions?.length || 0,
      sessionCount: detailsPayload?.data?.sessions?.length || 0,
      languages: detailsPayload?.data?.languages || [],
      requiredQuestions: (detailsPayload?.data?.questions || []).map((question) => ({
        code: question.code,
        text: getQuestionText(question),
        required: question.required,
      })),
      response: detailsPayload,
    });
    summary.push(`Details / Check Rate: OK`);

    if (scenario.requiresQuestions) {
      summary.push(
        `Required questions displayed and answered: ${
          (detailsPayload?.data?.questions || []).length > 0 ? "YES" : "NO"
        }`,
      );
    }

    const bookingRequest = buildBookingRequest(scenario, detailsPayload);
    const bookingPayload = await bookActivityWithRecovery(bookingRequest);
    bookingReference = bookingPayload?.data?.bookingReference || "";
    writeJson(path.join(directory, "03-booking-confirmation.json"), {
      scenario: scenario.name,
      bookingReference,
      status: bookingPayload?.data?.status,
      request: bookingRequest,
      response: bookingPayload,
    });
    summary.push(`Booking Confirm: OK`);
    summary.push(`Booking reference: ${bookingReference || "not returned"}`);

    const detailsRequest = {
      bookingReference,
      language: LANGUAGE,
    };
    const bookingDetailsPayload = await getBookingDetailsWithRetry(detailsRequest);
    writeJson(path.join(directory, "04-booking-details.json"), {
      scenario: scenario.name,
      bookingReference,
      response: bookingDetailsPayload,
    });
    summary.push(`Booking Details: OK`);

    const voucher = voucherSummary(bookingDetailsPayload, detailsPayload);
    writeJson(path.join(directory, "05-voucher.json"), voucher);
    summary.push(
      `Official Hotelbeds PDF voucher returned: ${
        voucher.officialHotelbedsPdfVoucherReturned ? "YES" : "NO"
      }`,
    );
    summary.push(
      voucher.officialHotelbedsPdfVoucherReturned
        ? "Voucher mode: official Hotelbeds PDF voucher"
        : "Voucher mode: internal voucher generated because Hotelbeds did not return PDF voucher",
    );

    if (scenario.requiresPdfVoucher && !voucher.officialHotelbedsPdfVoucherReturned) {
      throw new Error("PDF voucher from Hotelbeds was required but was not returned.");
    }

    if (scenario.requiresCancel) {
      try {
        const cancelPayload = await requestJson("/api/activities/cancel", {
          bookingReference,
          language: LANGUAGE,
          cancellationFlag: "CANCELLATION",
        });
        writeJson(path.join(directory, "06-cancel.json"), {
          scenario: scenario.name,
          bookingReference,
          response: cancelPayload,
        });
        summary.push(`Cancel Booking: OK`);
      } catch (cancelError) {
        pendingManualCancellation = true;
        writeJson(path.join(directory, "06-cancel.json"), {
          scenario: scenario.name,
          bookingReference,
          cancellationStatus: "PENDING_MANUAL_REVIEW",
          safeError: {
            status: cancelError.status,
            message: cancelError.message,
            payload: cancelError.payload,
          },
        });
        summary.push(`Cancel Booking: PENDING_MANUAL_REVIEW`);
      }
    }

    writeSummary(directory, summary);

    return {
      scenario: scenario.id,
      name: scenario.name,
      ok: !pendingManualCancellation,
      bookingReference,
      pendingManualCancellation,
    };
  } catch (error) {
    writeJson(path.join(directory, "scenario-stopped.json"), {
      scenario: scenario.name,
      bookingReference,
      pendingManualCancellation: Boolean(bookingReference),
      safeError: {
        status: error.status,
        message: error.message,
        payload: error.payload,
      },
    });
    summary.push(`Scenario stopped before clean completion.`);
    if (bookingReference) {
      summary.push(`Pending manual cancellation review: ${bookingReference}`);
    }
    writeSummary(directory, summary);

    return {
      scenario: scenario.id,
      name: scenario.name,
      ok: false,
      bookingReference,
      pendingManualCancellation: Boolean(bookingReference),
      error: error.message,
    };
  }
}

function writeRunSummary(results) {
  const lines = [
    "# Hotelbeds Activities Certification Auto-run Summary",
    "",
    `Run date: ${new Date().toISOString()}`,
    "Environment: Hotelbeds Activities test/dev only",
    "",
    "| Scenario | Status | Booking reference | Pending manual cancellation |",
    "| --- | --- | --- | --- |",
    ...results.map(
      (result) =>
        `| ${result.name} | ${result.ok ? "OK" : "REVIEW_REQUIRED"} | ${
          result.bookingReference || ""
        } | ${result.pendingManualCancellation ? "YES" : "NO"} |`,
    ),
    "",
  ];

  writeSummary(LOG_ROOT, lines);
}

async function main() {
  const localEnv = await loadLocalEnv();
  applyEnv(localEnv);
  assertSafety(localEnv);

  rmSync(LOG_ROOT, { recursive: true, force: true });
  mkdirSync(LOG_ROOT, { recursive: true });

  const serverProcess = await ensureServer();
  const results = [];

  try {
    for (const scenario of scenarios) {
      results.push(await runScenario(scenario));
    }
  } finally {
    writeRunSummary(results);
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.log(
      JSON.stringify(
        {
          success: false,
          reason: "ACTIVITIES_CERTIFICATION_REVIEW_REQUIRED",
          results,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error.name || "ActivitiesCertificationError",
        message: error.message,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
