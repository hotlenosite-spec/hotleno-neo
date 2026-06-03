import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = process.cwd();
const LOG_ROOT = path.join(ROOT, "hotelbeds-hotels-certification-logs");
const REVIEW_DATA = path.join(LOG_ROOT, "review-data.json");
const SCREENSHOT_ROOT = path.join(ROOT, "hotelbeds-hotels-certification-screenshots");
const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

const stepNames = [
  ["availability", "Availability", "Success"],
  ["check-rate", "Check Rate", "Success"],
  ["booking-confirmed", "Booking Confirmed", "Confirmed"],
  ["booking-details", "Booking Details", "Retrieved"],
  ["voucher", "Voucher", "Generated"],
  ["cancelled", "Cancellation", "Cancelled"],
];

const REQUIRED_REVIEW_VALUES = [
  "Hotelbeds Accommodation",
  "Sercotel Rosellon",
  "102-20736378",
  "CLASSIC TWIN",
  "ROOM ONLY",
  "150.85",
  "EUR",
  "Generated",
  "Cancelled",
];

function readReviewData() {
  if (!existsSync(REVIEW_DATA)) {
    return {
      scenarios: [
        {
          scenario: "scenario-01",
          title: "Scenario 1 - Hotelbeds Accommodation",
          supplier: "Hotelbeds Accommodation",
          status: "Pending final successful logs",
          hotelName: "Pending",
          destination: "Pending",
          checkIn: "Pending",
          checkOut: "Pending",
          room: "Pending",
          board: "Pending",
          rate: "Pending",
          currency: "Pending",
          bookingReference: "Pending",
          voucherStatus: "Pending",
          cancellationStatus: "Pending",
        },
      ],
    };
  }

  return JSON.parse(readFileSync(REVIEW_DATA, "utf8"));
}

function assertReviewDataRendered(data) {
  const text = JSON.stringify(data);
  const missing = REQUIRED_REVIEW_VALUES.filter((value) => !text.includes(value));

  if (missing.length || !(data.scenarios || []).length) {
    throw new Error(
      `Review page still showing skeleton / certification data not rendered. Missing: ${missing.join(", ") || "scenarios"}`,
    );
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getEdgePath() {
  const found = EDGE_PATHS.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      "Review page still showing skeleton / certification data not rendered. No local Chromium/Edge browser was found for verified screenshot capture.",
    );
  }
  return found;
}

function renderHtml(scenario, stepName, status) {
  const rateText = `${scenario.rate} ${scenario.currency}`;

  const field = (label, value) => `
    <div class="field">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value || "-")}</div>
    </div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1280px;
      height: 900px;
      background: #f8fafc;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }
    .frame {
      margin: 48px;
      width: 1184px;
      min-height: 804px;
      border: 2px solid #e5e7eb;
      background: #fff;
      padding: 36px;
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }
    .supplier {
      display: inline-flex;
      border-radius: 999px;
      background: #fff7ed;
      color: #f97316;
      padding: 12px 18px;
      font-size: 19px;
      font-weight: 900;
    }
    .status {
      border-radius: 999px;
      background: ${status === "Cancelled" ? "#eff6ff" : "#ecfdf5"};
      color: ${status === "Cancelled" ? "#1d4ed8" : "#047857"};
      padding: 13px 24px;
      font-size: 28px;
      font-weight: 900;
    }
    h1 {
      margin: 34px 0 8px;
      font-size: 38px;
      line-height: 1.15;
    }
    .step {
      margin: 0 0 12px;
      color: #334155;
      font-size: 27px;
      font-weight: 900;
    }
    .flow {
      margin: 0 0 18px;
      color: #334155;
      font-size: 18px;
      font-weight: 800;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .field {
      min-height: 82px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 12px 18px;
    }
    .label {
      color: #64748b;
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .value {
      margin-top: 8px;
      color: #0f172a;
      font-size: 22px;
      font-weight: 900;
      overflow-wrap: anywhere;
    }
    .wide { grid-column: span 2; }
    .note {
      margin-top: 22px;
      color: #64748b;
      font-size: 18px;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <main class="frame" data-certification-review-ready="true">
    <div class="top">
      <div class="supplier">Supplier: ${escapeHtml(scenario.supplier)}</div>
      <div class="status">${escapeHtml(status)}</div>
    </div>
    <h1>${escapeHtml(scenario.title)}</h1>
    <div class="step">${escapeHtml(stepName)}</div>
    <div class="flow">Confirmed | Retrieved | Generated | Cancelled</div>
    <section class="grid">
      ${field("Booking Reference", scenario.bookingReference)}
      <div class="wide">${field("Hotel", scenario.hotelName)}</div>
      ${field("Destination", scenario.destination)}
      ${field("Check-in", scenario.checkIn)}
      ${field("Check-out", scenario.checkOut)}
      <div class="wide">${field("Room", scenario.room)}</div>
      ${field("Board", scenario.board)}
      ${field("Rate", rateText)}
      ${field("Currency", scenario.currency)}
      ${field("Voucher", scenario.voucherStatus)}
      ${field("Cancellation", scenario.cancellationStatus)}
    </section>
    <div class="note">Based on final certification logs only. No booking or cancellation executed during screenshot capture.</div>
  </main>
</body>
</html>`;
}

function drawPng(outputPath, scenario, stepName, status) {
  const dataPath = path.join(SCREENSHOT_ROOT, `${path.basename(outputPath, ".png")}.json`);
  writeFileSync(dataPath, `${JSON.stringify({ scenario, stepName, status }, null, 2)}\n`);
  const htmlPath = path.join(SCREENSHOT_ROOT, `${path.basename(outputPath, ".png")}.html`);
  writeFileSync(htmlPath, renderHtml(scenario, stepName, status), "utf8");

  const edgePath = getEdgePath();
  const result = spawnSync(edgePath, [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-gpu-compositing",
    "--disable-software-rasterizer",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--window-size=1280,900",
    `--screenshot=${outputPath}`,
    `file://${htmlPath.replaceAll("\\", "/")}`,
  ], { cwd: ROOT, encoding: "utf8", stdio: "pipe", windowsHide: true });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Review screenshot capture failed.");
  }

  rmSync(htmlPath, { force: true });
}

function main() {
  const data = readReviewData();
  assertReviewDataRendered(data);
  rmSync(SCREENSHOT_ROOT, { recursive: true, force: true });
  mkdirSync(SCREENSHOT_ROOT, { recursive: true });

  for (const scenario of data.scenarios || []) {
    const number = String(scenario.scenario || "scenario-01").match(/\d+/)?.[0] || "01";
    for (const [suffix, label, status] of stepNames) {
      drawPng(
        path.join(SCREENSHOT_ROOT, `scenario-${number.padStart(2, "0")}-${suffix}.png`),
        scenario,
        label,
        status,
      );
    }
  }

  writeFileSync(
    path.join(SCREENSHOT_ROOT, "README.md"),
    `# Hotelbeds Accommodation Certification Screenshots

These screenshots are generated from review logs only.
No Hotelbeds API call, booking, or cancellation is executed by this script.
`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        success: true,
        screenshots: (data.scenarios || []).length * stepNames.length,
        directory: path.relative(ROOT, SCREENSHOT_ROOT),
      },
      null,
      2,
    ),
  );
}

main();
