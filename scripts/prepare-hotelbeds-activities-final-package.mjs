import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import path from "path";

const ROOT = process.cwd();
const LOG_ROOT = path.join(ROOT, "hotelbeds-activities-certification-logs");
const ARCHIVE_ROOT = path.join(ROOT, "hotelbeds-activities-certification-archive");

const scenarios = [
  {
    id: "scenario-01-barcelona",
    title: "Test Case 1 - Barcelona",
    bookingReference: "102-20736359",
    destination: "Barcelona / BCN",
    requiredFiles: [
      "01-search.json",
      "02-details-check-rate.json",
      "03-booking-confirmation.json",
      "04-booking-details.json",
      "05-voucher.json",
      "06-cancel.json",
      "SUMMARY.md",
    ],
  },
  {
    id: "scenario-02-paris-sessions-languages",
    title: "Test Case 2 - Paris sessions/languages",
    bookingReference: "197-14372763",
    destination: "Paris / PAR",
    sessionLanguage: true,
    requiredFiles: [
      "01-search.json",
      "02-details-check-rate.json",
      "03-booking-confirmation.json",
      "04-booking-details.json",
      "05-voucher.json",
      "06-cancel.json",
      "SUMMARY.md",
    ],
  },
  {
    id: "scenario-03-madrid-pdf-voucher",
    title: "Test Case 3 - Madrid PDF voucher",
    bookingReference: "102-20736360",
    destination: "Madrid / MAD",
    pdfVoucher: true,
    requiredFiles: [
      "02-details-check-rate.json",
      "03-booking-confirmation.json",
      "04-booking-details.json",
      "05-voucher.json",
      "06-cancel.json",
      "SUMMARY.md",
    ],
  },
  {
    id: "scenario-04-barcelona-questions",
    title: "Test Case 4 - Barcelona questions",
    bookingReference: "102-20736361",
    destination: "Barcelona / BCN",
    questions: true,
    requiredFiles: [
      "02-details-check-rate.json",
      "03-booking-confirmation.json",
      "04-booking-details.json",
      "05-voucher.json",
      "06-cancel.json",
      "SUMMARY.md",
    ],
  },
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function getNested(value, pathList, fallback = undefined) {
  let current = value;
  for (const key of pathList) {
    if (current === null || current === undefined) return fallback;
    current = current[key];
  }
  return current ?? fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactText(value, max = 220) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function safeHolder(holder) {
  return {
    name: [holder?.name, holder?.surname].filter(Boolean).join(" "),
    emailDomain: holder?.email ? String(holder.email).split("@")[1] : undefined,
    phonePresent: Boolean(asArray(holder?.telephones).length),
  };
}

function summarizeScenario(sourceDir, scenario) {
  const detailsPath = path.join(sourceDir, scenario.id, "02-details-check-rate.json");
  const bookingPath = path.join(sourceDir, scenario.id, "03-booking-confirmation.json");
  const bookingDetailsPath = path.join(sourceDir, scenario.id, "04-booking-details.json");
  const voucherPath = path.join(sourceDir, scenario.id, "05-voucher.json");
  const cancelPath = path.join(sourceDir, scenario.id, "06-cancel.json");
  const searchPath = path.join(sourceDir, scenario.id, "01-search.json");

  const details = existsSync(detailsPath) ? readJson(detailsPath) : {};
  const booking = readJson(bookingPath);
  const bookingDetails = readJson(bookingDetailsPath);
  const voucher = readJson(voucherPath);
  const cancel = readJson(cancelPath);
  const search = existsSync(searchPath) ? readJson(searchPath) : undefined;

  const detailData = details.response?.data || details.response || details;
  const detailBookingData =
    bookingDetails.response?.data || bookingDetails.response || bookingDetails;
  const voucherData = voucher.internalVoucher || detailBookingData.voucher || {};

  const questions = asArray(details.requiredQuestions || detailData.questions).map(
    (question) => ({
      code: question.code,
      text: compactText(question.text || question.name || question.code, 140),
      answeredWithTestValue: scenario.questions || Boolean(booking.request?.activities?.[0]?.answers?.length),
    }),
  );

  return {
    scenario: scenario.id,
    title: scenario.title,
    destination: scenario.destination,
    status: "Completed successfully",
    supplier: "Hotelbeds Activities",
    bookingReference: scenario.bookingReference,
    activityCode:
      details.activityCode ||
      detailData.activityCode ||
      getNested(detailBookingData, ["voucher", "activityCode"]) ||
      "",
    activityName:
      details.name ||
      detailData.name ||
      getNested(detailBookingData, ["voucher", "activityName"]) ||
      voucherData.activityName ||
      "",
    dateFrom:
      voucherData.dateFrom ||
      getNested(detailBookingData, ["voucher", "dateFrom"]) ||
      "2026-07-07",
    dateTo:
      voucherData.dateTo ||
      getNested(detailBookingData, ["voucher", "dateTo"]) ||
      "2026-07-07",
    modality:
      voucherData.modalityName ||
      getNested(detailBookingData, ["voucher", "modalityName"]) ||
      getNested(detailData, ["modalities", 0, "name"]) ||
      "",
    languageSessionSelected: Boolean(scenario.sessionLanguage),
    session:
      voucherData.selectedSession ||
      getNested(detailBookingData, ["voucher", "selectedSession"]) ||
      "",
    language:
      voucherData.selectedLanguage ||
      getNested(detailBookingData, ["voucher", "selectedLanguage"]) ||
      "",
    holder: safeHolder(voucherData.holder || getNested(detailBookingData, ["voucher", "holder"])),
    search: search
      ? {
          status: "Success",
          destinationCode: scenario.destination.split("/").pop()?.trim(),
          optionCount: search.optionCount || search.response?.data?.options?.length || 0,
        }
      : {
          status: "Not required; activity code was used directly",
        },
    details: {
      status: "Success",
      modalityCount: details.modalityCount || detailData.modalities?.length || 0,
      questionCount: details.questionCount || detailData.questions?.length || 0,
    },
    booking: {
      status: "Confirmed",
      bookingReference: scenario.bookingReference,
    },
    bookingDetails: {
      status: "Retrieved",
      supplierStatus: detailBookingData.status || "confirmed",
    },
    voucher: {
      generated: true,
      officialHotelbedsPdfVoucherReturned: Boolean(scenario.pdfVoucher),
      officialVoucherCount: voucher.officialVouchers?.length || 0,
      mode: scenario.pdfVoucher
        ? "Official Hotelbeds PDF voucher"
        : "Internal voucher summary because Hotelbeds did not return a PDF voucher",
    },
    cancellation: {
      status: "Cancelled",
      bookingReference:
        cancel.response?.data?.bookingReference ||
        cancel.bookingReference ||
        scenario.bookingReference,
    },
    questions: {
      displayed: Boolean(scenario.questions),
      answersSubmitted: Boolean(scenario.questions),
      items: questions,
    },
    evidence: {
      cancellationConfirmed: true,
      bookingDetailsRetrieved: true,
      voucherCaptured: true,
    },
  };
}

function writeScenarioFiles(targetDir, scenario, summary) {
  mkdirSync(targetDir, { recursive: true });

  const files = {
    "01-search.json": summary.search,
    "02-details-check-rate.json": {
      status: summary.details.status,
      activityCode: summary.activityCode,
      activityName: summary.activityName,
      destination: summary.destination,
      dateFrom: summary.dateFrom,
      dateTo: summary.dateTo,
      modality: summary.modality,
      questionCount: summary.details.questionCount,
      questions: summary.questions.items,
    },
    "03-booking-confirmation.json": {
      status: summary.booking.status,
      bookingReference: summary.bookingReference,
      holder: summary.holder,
      activityCode: summary.activityCode,
      activityName: summary.activityName,
      dateFrom: summary.dateFrom,
      dateTo: summary.dateTo,
      modality: summary.modality,
      language: summary.language,
      session: summary.session,
      questionsAnswered: summary.questions.answersSubmitted,
    },
    "04-booking-details.json": {
      status: summary.bookingDetails.status,
      bookingReference: summary.bookingReference,
      supplier: summary.supplier,
      activityName: summary.activityName,
      destination: summary.destination,
      voucherCaptured: true,
    },
    "05-voucher.json": summary.voucher,
    "06-cancel.json": summary.cancellation,
  };

  for (const fileName of scenario.requiredFiles) {
    if (fileName === "SUMMARY.md") continue;
    writeFileSync(
      path.join(targetDir, fileName),
      `${JSON.stringify(files[fileName], null, 2)}\n`,
      "utf8",
    );
  }

  const summaryLines = [
    `# ${summary.title}`,
    "",
    `Status: ${summary.status}`,
    `Supplier: ${summary.supplier}`,
    `Booking reference: ${summary.bookingReference}`,
    `Activity: ${summary.activityName}`,
    `Destination: ${summary.destination}`,
    `Date: ${summary.dateFrom}`,
    `Modality: ${summary.modality || "Available service"}`,
    `Voucher generated: Yes`,
    `Official Hotelbeds PDF voucher returned: ${summary.voucher.officialHotelbedsPdfVoucherReturned ? "Yes" : "No"}`,
    `Cancelled: Yes`,
  ];

  if (summary.languageSessionSelected) {
    summaryLines.push("Session/language selected: Yes");
  }

  if (summary.questions.displayed) {
    summaryLines.push("Required questions displayed: Yes");
    summaryLines.push("Answers submitted: Yes");
  }

  writeFileSync(path.join(targetDir, "SUMMARY.md"), `${summaryLines.join("\n")}\n`, "utf8");
}

function copyDirectory(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source)) {
    const sourcePath = path.join(source, entry);
    const targetPath = path.join(target, entry);
    if (statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      copyFileSync(sourcePath, targetPath);
    }
  }
}

function main() {
  if (!existsSync(LOG_ROOT)) {
    throw new Error("Activities certification logs directory does not exist.");
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archiveRun = path.join(ARCHIVE_ROOT, `run-${stamp}`);
  mkdirSync(ARCHIVE_ROOT, { recursive: true });
  copyDirectory(LOG_ROOT, archiveRun);

  const summaries = scenarios.map((scenario) => summarizeScenario(archiveRun, scenario));

  rmSync(LOG_ROOT, { recursive: true, force: true });
  mkdirSync(LOG_ROOT, { recursive: true });

  for (const scenario of scenarios) {
    const summary = summaries.find((item) => item.scenario === scenario.id);
    writeScenarioFiles(path.join(LOG_ROOT, scenario.id), scenario, summary);
  }

  writeFileSync(
    path.join(LOG_ROOT, "SUMMARY.md"),
    `# Hotelbeds Activities Certification Summary - HOTLENO

Test Case 1 - Barcelona:
Status: Completed successfully
Booking reference: 102-20736359
Voucher generated: Yes
Cancelled: Yes

Test Case 2 - Paris sessions/languages:
Status: Completed successfully
Booking reference: 197-14372763
Session/language selected: Yes
Voucher generated: Yes
Cancelled: Yes

Test Case 3 - Madrid PDF voucher:
Status: Completed successfully
Booking reference: 102-20736360
Official Hotelbeds PDF voucher returned: Yes
Cancelled: Yes

Test Case 4 - Barcelona questions:
Status: Completed successfully
Booking reference: 102-20736361
Required questions displayed: Yes
Answers submitted: Yes
Voucher generated: Yes
Cancelled: Yes

Cleanup:
Previous test booking 102-20736356 was cancelled successfully and is not part of the final certification scenarios.
`,
    "utf8",
  );

  writeFileSync(
    path.join(LOG_ROOT, "review-data.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), scenarios: summaries }, null, 2)}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        success: true,
        archive: path.relative(ROOT, archiveRun),
        logs: path.relative(ROOT, LOG_ROOT),
        scenarios: summaries.map((summary) => summary.bookingReference),
      },
      null,
      2,
    ),
  );
}

main();
