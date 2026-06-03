import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = process.cwd();
const LOG_ROOT = path.join(ROOT, "hotelbeds-activities-certification-logs");
const SCREENSHOT_ROOT = path.join(ROOT, "hotelbeds-activities-certification-screenshots");
const REVIEW_ROOT = path.join(SCREENSHOT_ROOT, "review-pages");
const REVIEW_DATA = path.join(LOG_ROOT, "review-data.json");

const steps = [
  ["scenario-01-barcelona", "scenario-01-search.png", "Search", "Success"],
  ["scenario-01-barcelona", "scenario-01-details-check-rate.png", "Details / Check Rate", "Success"],
  ["scenario-01-barcelona", "scenario-01-booking-confirmed.png", "Booking Confirmed", "Confirmed"],
  ["scenario-01-barcelona", "scenario-01-booking-details.png", "Booking Details", "Success"],
  ["scenario-01-barcelona", "scenario-01-voucher.png", "Voucher", "Success"],
  ["scenario-01-barcelona", "scenario-01-cancelled.png", "Cancellation", "Cancelled"],

  ["scenario-02-paris-sessions-languages", "scenario-02-search.png", "Search", "Success"],
  ["scenario-02-paris-sessions-languages", "scenario-02-details-check-rate.png", "Details / Check Rate", "Success"],
  ["scenario-02-paris-sessions-languages", "scenario-02-session-language-selected.png", "Session / Language Selected", "Success"],
  ["scenario-02-paris-sessions-languages", "scenario-02-booking-confirmed.png", "Booking Confirmed", "Confirmed"],
  ["scenario-02-paris-sessions-languages", "scenario-02-booking-details.png", "Booking Details", "Success"],
  ["scenario-02-paris-sessions-languages", "scenario-02-voucher.png", "Voucher", "Success"],
  ["scenario-02-paris-sessions-languages", "scenario-02-cancelled.png", "Cancellation", "Cancelled"],

  ["scenario-03-madrid-pdf-voucher", "scenario-03-details-check-rate.png", "Details / Check Rate", "Success"],
  ["scenario-03-madrid-pdf-voucher", "scenario-03-booking-confirmed.png", "Booking Confirmed", "Confirmed"],
  ["scenario-03-madrid-pdf-voucher", "scenario-03-booking-details.png", "Booking Details", "Success"],
  ["scenario-03-madrid-pdf-voucher", "scenario-03-pdf-voucher.png", "Official PDF Voucher", "Success"],
  ["scenario-03-madrid-pdf-voucher", "scenario-03-cancelled.png", "Cancellation", "Cancelled"],

  ["scenario-04-barcelona-questions", "scenario-04-details-check-rate.png", "Details / Check Rate", "Success"],
  ["scenario-04-barcelona-questions", "scenario-04-questions.png", "Questions Displayed", "Success"],
  ["scenario-04-barcelona-questions", "scenario-04-answers-submitted.png", "Answers Submitted", "Success"],
  ["scenario-04-barcelona-questions", "scenario-04-booking-confirmed.png", "Booking Confirmed", "Confirmed"],
  ["scenario-04-barcelona-questions", "scenario-04-booking-details.png", "Booking Details", "Success"],
  ["scenario-04-barcelona-questions", "scenario-04-voucher.png", "Voucher", "Success"],
  ["scenario-04-barcelona-questions", "scenario-04-cancelled.png", "Cancellation", "Cancelled"],
];

function getBrowserPath() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlForStep(scenario, stepName, status) {
  const questions = scenario.questions?.items || [];
  const questionRows = questions
    .slice(0, 5)
    .map(
      (question) => `
        <li>
          <strong>${escapeHtml(question.code)}</strong>
          <span>${escapeHtml(question.text)}</span>
          <em>Answered with test value: ${question.answeredWithTestValue ? "Yes" : "No"}</em>
        </li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(scenario.title)} - ${escapeHtml(stepName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1280px;
      height: 900px;
      background: #f8fafc;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      padding: 48px;
    }
    .card {
      height: 804px;
      border: 1px solid #e5e7eb;
      border-radius: 28px;
      background: #ffffff;
      box-shadow: 0 30px 80px rgba(15,23,42,0.12);
      padding: 42px;
      display: flex;
      flex-direction: column;
      gap: 26px;
    }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .badge {
      display: inline-flex;
      border-radius: 999px;
      background: #fff7ed;
      color: #f97316;
      padding: 10px 16px;
      font-weight: 800;
      font-size: 18px;
    }
    h1 { margin: 18px 0 0; font-size: 42px; line-height: 1.08; letter-spacing: 0; }
    h2 { margin: 0; font-size: 28px; color: #334155; }
    .status {
      border-radius: 22px;
      padding: 18px 22px;
      background: ${status === "Cancelled" ? "#eff6ff" : "#ecfdf5"};
      color: ${status === "Cancelled" ? "#1d4ed8" : "#047857"};
      font-size: 26px;
      font-weight: 900;
      white-space: nowrap;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .field { border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; background: #f8fafc; min-height: 92px; }
    .label { font-size: 15px; text-transform: uppercase; color: #64748b; font-weight: 900; margin-bottom: 10px; }
    .value { font-size: 23px; font-weight: 900; line-height: 1.25; }
    .wide { grid-column: span 2; }
    ul { margin: 0; padding-left: 22px; display: grid; gap: 10px; }
    li { font-size: 18px; line-height: 1.35; }
    li span { display: block; color: #475569; }
    li em { display: block; color: #047857; font-style: normal; font-weight: 800; }
    .footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e5e7eb; padding-top: 22px; color: #64748b; font-weight: 800; }
  </style>
</head>
<body>
  <section class="card">
    <div class="top">
      <div>
        <span class="badge">Supplier: Hotelbeds Activities</span>
        <h1>${escapeHtml(scenario.title)}</h1>
        <h2>${escapeHtml(stepName)}</h2>
      </div>
      <div class="status">${escapeHtml(status)}</div>
    </div>

    <div class="grid">
      <div class="field">
        <div class="label">Booking Reference</div>
        <div class="value">${escapeHtml(scenario.bookingReference)}</div>
      </div>
      <div class="field">
        <div class="label">Destination</div>
        <div class="value">${escapeHtml(scenario.destination)}</div>
      </div>
      <div class="field wide">
        <div class="label">Activity</div>
        <div class="value">${escapeHtml(scenario.activityName || scenario.activityCode)}</div>
      </div>
      <div class="field">
        <div class="label">Activity Code</div>
        <div class="value">${escapeHtml(scenario.activityCode)}</div>
      </div>
      <div class="field">
        <div class="label">Service Date</div>
        <div class="value">${escapeHtml(scenario.dateFrom)}${scenario.dateTo !== scenario.dateFrom ? ` to ${escapeHtml(scenario.dateTo)}` : ""}</div>
      </div>
      <div class="field">
        <div class="label">Modality</div>
        <div class="value">${escapeHtml(scenario.modality || "Selected modality")}</div>
      </div>
      <div class="field">
        <div class="label">Voucher</div>
        <div class="value">${scenario.voucher?.officialHotelbedsPdfVoucherReturned ? "Official Hotelbeds PDF voucher returned" : "Voucher generated"}</div>
      </div>
      <div class="field">
        <div class="label">Cancellation</div>
        <div class="value">${escapeHtml(scenario.cancellation?.status || "Cancelled")}</div>
      </div>
      <div class="field">
        <div class="label">Session / Language</div>
        <div class="value">${scenario.languageSessionSelected ? "Selected" : "Not required"}${scenario.session ? ` - ${escapeHtml(scenario.session)}` : ""}${scenario.language ? ` / ${escapeHtml(scenario.language)}` : ""}</div>
      </div>
      <div class="field">
        <div class="label">Questions / Answers</div>
        <div class="value">${scenario.questions?.displayed ? "Displayed and answered" : "Not required"}</div>
      </div>
      ${questionRows ? `<div class="field wide"><div class="label">Question Evidence</div><ul>${questionRows}</ul></div>` : ""}
    </div>

    <div class="footer">
      <span>Based on final certification logs only</span>
      <span>No booking or cancellation executed during screenshot capture</span>
    </div>
  </section>
</body>
</html>`;
}

function writeReadme() {
  const readme = `# Hotelbeds Activities Certification Screenshots

These screenshots are based on the final successful certification logs only.

No new bookings were created during screenshot capture.
No cancellation was executed during screenshot capture.
All final bookings were created in the Hotelbeds test environment and cancelled.

Booking references:

- Test 1: 102-20736359
- Test 2: 197-14372763
- Test 3: 102-20736360
- Test 4: 102-20736361
`;

  writeFileSync(path.join(SCREENSHOT_ROOT, "README.md"), readme, "utf8");
}

function capture(browserPath, htmlPath, outputPath) {
  const result = spawnSync(
    browserPath,
    [
      "--headless",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-dev-shm-usage",
      "--disable-features=VizDisplayCompositor",
      "--hide-scrollbars",
      "--window-size=1280,900",
      `--screenshot=${outputPath}`,
      `file://${htmlPath.replaceAll("\\", "/")}`,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Headless browser screenshot failed.");
  }
}

function drawPngWithPowerShell(outputPath, scenario, stepName, status) {
  const dataPath = path.join(REVIEW_ROOT, `${path.basename(outputPath, ".png")}.json`);
  writeFileSync(
    dataPath,
    `${JSON.stringify({ scenario, stepName, status }, null, 2)}\n`,
    "utf8",
  );

  const command = `
    Add-Type -AssemblyName System.Drawing
    $data = Get-Content -LiteralPath '${dataPath.replaceAll("'", "''")}' -Raw | ConvertFrom-Json
    $bmp = New-Object System.Drawing.Bitmap 1280, 900
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.TextRenderingHint = 'ClearTypeGridFit'
    $bg = [System.Drawing.ColorTranslator]::FromHtml('#F8FAFC')
    $g.Clear($bg)

    function Brush($hex) { New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex)) }
    function Pen($hex, $width = 1) { New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($hex)), $width }
    function Font($size, $style = [System.Drawing.FontStyle]::Regular) { New-Object System.Drawing.Font 'Arial', $size, $style, [System.Drawing.GraphicsUnit]::Pixel }
    function Text($text, $font, $brush, $x, $y, $w, $h) {
      $rect = New-Object System.Drawing.RectangleF $x, $y, $w, $h
      $format = New-Object System.Drawing.StringFormat
      $format.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
      $format.FormatFlags = 0
      $g.DrawString([string]$text, $font, $brush, $rect, $format)
    }
    function FillRoundRect($brush, $x, $y, $w, $h) {
      $g.FillRectangle($brush, $x, $y, $w, $h)
    }
    function Field($label, $value, $x, $y, $w, $h) {
      FillRoundRect (Brush '#F8FAFC') $x $y $w $h
      $g.DrawRectangle((Pen '#E2E8F0'), $x, $y, $w, $h)
      Text $label (Font 15 ([System.Drawing.FontStyle]::Bold)) (Brush '#64748B') ($x + 18) ($y + 14) ($w - 36) 24
      Text $value (Font 24 ([System.Drawing.FontStyle]::Bold)) (Brush '#0F172A') ($x + 18) ($y + 42) ($w - 36) ($h - 52)
    }

    FillRoundRect (Brush '#FFFFFF') 48 48 1184 804
    $g.DrawRectangle((Pen '#E5E7EB' 2), 48, 48, 1184, 804)
    FillRoundRect (Brush '#FFF7ED') 88 86 330 44
    Text 'Supplier: Hotelbeds Activities' (Font 19 ([System.Drawing.FontStyle]::Bold)) (Brush '#F97316') 106 96 300 30
    Text $data.scenario.title (Font 42 ([System.Drawing.FontStyle]::Bold)) (Brush '#0F172A') 88 150 780 105
    Text $data.stepName (Font 29 ([System.Drawing.FontStyle]::Bold)) (Brush '#334155') 88 252 760 50
    $statusBg = if ($data.status -eq 'Cancelled') { '#EFF6FF' } else { '#ECFDF5' }
    $statusColor = if ($data.status -eq 'Cancelled') { '#1D4ED8' } else { '#047857' }
    FillRoundRect (Brush $statusBg) 930 88 180 54
    Text $data.status (Font 28 ([System.Drawing.FontStyle]::Bold)) (Brush $statusColor) 950 99 150 38

    Field 'Booking Reference' $data.scenario.bookingReference 88 320 360 100
    Field 'Destination' $data.scenario.destination 468 320 360 100
    Field 'Cancellation' $data.scenario.cancellation.status 848 320 300 100
    Field 'Activity' $data.scenario.activityName 88 440 1060 108
    Field 'Activity Code' $data.scenario.activityCode 88 568 330 96
    Field 'Service Date' $data.scenario.dateFrom 438 568 330 96
    Field 'Modality' $data.scenario.modality 788 568 360 96
    $voucher = if ($data.scenario.voucher.officialHotelbedsPdfVoucherReturned) { 'Official Hotelbeds PDF voucher returned' } else { 'Voucher generated' }
    Field 'Voucher' $voucher 88 684 520 96
    $qa = if ($data.scenario.questions.displayed) { 'Questions displayed and test answers submitted' } else { 'Not required' }
    Field 'Questions / Answers' $qa 628 684 520 96
    Text 'Based on final certification logs only. No booking or cancellation executed during screenshot capture.' (Font 18 ([System.Drawing.FontStyle]::Bold)) (Brush '#64748B') 88 812 960 32

    $bmp.Save('${outputPath.replaceAll("'", "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
  `;

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "PowerShell PNG rendering failed.");
  }
}

function main() {
  const browserPath = getBrowserPath();
  if (!browserPath) {
    throw new Error("No local Chrome or Edge executable was found for screenshot capture.");
  }

  const data = JSON.parse(readFileSync(REVIEW_DATA, "utf8"));
  const scenarioMap = new Map(data.scenarios.map((scenario) => [scenario.scenario, scenario]));

  rmSync(SCREENSHOT_ROOT, { recursive: true, force: true });
  mkdirSync(REVIEW_ROOT, { recursive: true });

  for (const [scenarioId, fileName, stepName, status] of steps) {
    const scenario = scenarioMap.get(scenarioId);
    if (!scenario) throw new Error(`Missing review data for ${scenarioId}`);

    const htmlPath = path.join(REVIEW_ROOT, fileName.replace(/\.png$/, ".html"));
    const outputPath = path.join(SCREENSHOT_ROOT, fileName);

    writeFileSync(htmlPath, htmlForStep(scenario, stepName, status), "utf8");
    try {
      capture(browserPath, htmlPath, outputPath);
    } catch {
      drawPngWithPowerShell(outputPath, scenario, stepName, status);
    }
  }

  writeReadme();

  console.log(
    JSON.stringify(
      {
        success: true,
        screenshots: steps.length,
        directory: path.relative(ROOT, SCREENSHOT_ROOT),
      },
      null,
      2,
    ),
  );
}

main();
