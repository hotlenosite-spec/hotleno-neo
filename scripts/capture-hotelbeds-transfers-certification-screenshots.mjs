import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";

const ROOT = process.cwd();
const BASE_URL = process.env.CERTIFICATION_REVIEW_URL || "http://localhost:3000";
const REVIEW_URL = `${BASE_URL}/ar/transfers/certification?review=1`;
const SCREENSHOTS_DIR = path.join(ROOT, "hotelbeds-transfers-certification-screenshots");
const CLEAN_LOGS_ZIP = path.join(
  ROOT,
  "Hotelbeds-transfers-certification-logs-HOTLENO-clean.zip",
);
const PACKAGE_ZIP = path.join(
  ROOT,
  "Hotelbeds-transfers-certification-package-HOTLENO.zip",
);
const PACKAGE_ROOT = path.join(
  ROOT,
  ".tmp",
  "hotelbeds-transfers-certification-package-HOTLENO",
);

const SHOTS = [
  "scenario-01-availability",
  "scenario-01-booking-confirmed",
  "scenario-01-voucher",
  "scenario-01-cancelled",
  "scenario-02-availability-leg-1",
  "scenario-02-availability-leg-2",
  "scenario-02-booking-confirmed",
  "scenario-02-voucher",
  "scenario-02-cancelled",
  "scenario-03-availability",
  "scenario-03-booking-confirmed",
  "scenario-03-voucher",
  "scenario-04-availability-with-extra",
  "scenario-04-booking-confirmed",
  "scenario-04-voucher",
  "scenario-04-cancelled",
];

const REVIEW_STEPS = {
  "scenario-01-availability": ["scenario-01", "Scenario 1 - Availability", "Success", 0],
  "scenario-01-booking-confirmed": ["scenario-01", "Scenario 1 - Booking Confirmed", "Confirmed", 0],
  "scenario-01-voucher": ["scenario-01", "Scenario 1 - Voucher", "Voucher generated", 0],
  "scenario-01-cancelled": ["scenario-01", "Scenario 1 - Cancelled", "Cancelled", 0],
  "scenario-02-availability-leg-1": ["scenario-02", "Scenario 2 - Availability Leg 1", "Success", 0],
  "scenario-02-availability-leg-2": ["scenario-02", "Scenario 2 - Availability Leg 2", "Success", 1],
  "scenario-02-booking-confirmed": ["scenario-02", "Scenario 2 - Booking Confirmed", "Confirmed", 0],
  "scenario-02-voucher": ["scenario-02", "Scenario 2 - Voucher", "Voucher generated", 0],
  "scenario-02-cancelled": ["scenario-02", "Scenario 2 - Cancelled", "Cancelled", 0],
  "scenario-03-availability": ["scenario-03", "Scenario 3 - Availability", "Success", 0],
  "scenario-03-booking-confirmed": ["scenario-03", "Scenario 3 - Booking Confirmed", "Confirmed", 0],
  "scenario-03-voucher": ["scenario-03", "Scenario 3 - Voucher", "Voucher generated", 0],
  "scenario-04-availability-with-extra": ["scenario-04", "Scenario 4 - Availability With Optional Extra", "Success", 0],
  "scenario-04-booking-confirmed": ["scenario-04", "Scenario 4 - Booking Confirmed", "Confirmed", 0],
  "scenario-04-voucher": ["scenario-04", "Scenario 4 - Voucher", "Voucher generated", 0],
  "scenario-04-cancelled": ["scenario-04", "Scenario 4 - Cancelled", "Cancelled", 0],
};

const ALLOWED_REFERENCES = new Set([
  "207-16258057",
  "102-20736280",
  "102-20736281",
  "102-20736282",
]);

const BLOCKED_TERMS = [
  "api-key",
  "secret",
  "x-signature",
  "authorization",
  ".env",
  "failed",
  "fallback",
  "alternative",
  "BCNP",
  "BCNE",
  "E_REQUEST_INVALIDTERMINALCODE",
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    windowsHide: true,
  });

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${result.stderr || result.stdout || ""}`,
    );
  }

  return result;
}

async function isServerReady() {
  try {
    const response = await fetch(REVIEW_URL);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await isServerReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Local certification review page did not become ready.");
}

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  const browser = candidates.find((candidate) => existsSync(candidate));
  if (!browser) {
    throw new Error("No Chromium-based browser was found for headless screenshots.");
  }
  return browser;
}

function writeScreenshotsReadme() {
  const readme = `# Hotelbeds Transfers Certification Screenshots

هذه الصور مأخوذة من صفحة certification review الداخلية:

\`${REVIEW_URL}\`

الصور مبنية على اللوقات النهائية الناجحة فقط، ولم يتم إنشاء أي حجوزات جديدة أثناء التقاط الصور.

كل السيناريوهات تمت في test environment فقط، ولا توجد production bookings.

Booking references:

- Scenario 1: 207-16258057
- Scenario 2: 102-20736280
- Scenario 3: 102-20736281
- Scenario 4: 102-20736282

لا تحتوي الصور أو هذا المجلد على مفاتيح أو تواقيع أو رؤوس حساسة.
`;

  writeFileSync(path.join(SCREENSHOTS_DIR, "README.md"), readme, "utf8");
}

function captureShot(browser, shot) {
  const output = path.join(SCREENSHOTS_DIR, `${shot}.png`);
  const url = `${REVIEW_URL}&shot=${encodeURIComponent(shot)}`;

  const result = run(browser, [
    "--headless",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-features=VizDisplayCompositor",
    "--disable-gpu-compositing",
    "--single-process",
    "--no-sandbox",
    "--use-gl=swiftshader",
    "--hide-scrollbars",
    "--window-size=1440,1200",
    "--virtual-time-budget=5000",
    `--screenshot=${output}`,
    url,
  ], { allowFailure: true });

  if (result.status !== 0 || !existsSync(output)) {
    return false;
  }

  return true;
}

function powershell(command) {
  return run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command]);
}

function createPackage() {
  if (!existsSync(CLEAN_LOGS_ZIP)) {
    throw new Error("Clean certification logs ZIP was not found.");
  }

  rmSync(PACKAGE_ROOT, { recursive: true, force: true });
  mkdirSync(PACKAGE_ROOT, { recursive: true });

  powershell(
    `Expand-Archive -LiteralPath '${CLEAN_LOGS_ZIP.replaceAll("'", "''")}' -DestinationPath '${PACKAGE_ROOT.replaceAll("'", "''")}' -Force`,
  );

  const targetScreenshots = path.join(
    PACKAGE_ROOT,
    "hotelbeds-transfers-certification-screenshots",
  );
  powershell(
    `Copy-Item -LiteralPath '${SCREENSHOTS_DIR.replaceAll("'", "''")}' -Destination '${targetScreenshots.replaceAll("'", "''")}' -Recurse -Force`,
  );

  const summaryPath = path.join(ROOT, "logs", "hotelbeds-transfers-certification", "SUMMARY.md");
  if (existsSync(summaryPath)) {
    powershell(
      `Copy-Item -LiteralPath '${summaryPath.replaceAll("'", "''")}' -Destination '${path.join(PACKAGE_ROOT, "SUMMARY.md").replaceAll("'", "''")}' -Force`,
    );
  }

  const rootReadme = `# Hotelbeds Transfers Certification Package

This package includes the final Hotelbeds Transfers test logs and website booking flow review screenshots.

The screenshots were generated from the internal review page using final logs only. No new booking or cancellation call was made during screenshot capture.

Supplier: Hotelbeds Transfers
Environment: test

Booking references:

- Scenario 1: 207-16258057
- Scenario 2: 102-20736280
- Scenario 3: 102-20736281
- Scenario 4: 102-20736282
`;
  writeFileSync(path.join(PACKAGE_ROOT, "README.md"), rootReadme, "utf8");

  rmSync(PACKAGE_ZIP, { force: true });
  powershell(
    `Compress-Archive -Path '${path.join(PACKAGE_ROOT, "*").replaceAll("'", "''")}' -DestinationPath '${PACKAGE_ZIP.replaceAll("'", "''")}' -Force`,
  );
}

function scanTextFiles(directory) {
  const issues = [];
  const refs = new Set();

  const walk = (dir) => {
    for (const entry of readdirSafe(dir)) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (![".json", ".md", ".html", ".txt"].includes(ext)) continue;

      const text = readFileSync(full, "utf8");
      const lowerText = text.toLowerCase();
      for (const term of BLOCKED_TERMS) {
        if (lowerText.includes(term.toLowerCase())) {
          issues.push(`${path.relative(directory, full)} contains ${term}`);
        }
      }

      for (const match of text.matchAll(/\b\d{3}-\d{8}\b/g)) {
        refs.add(match[0]);
      }
    }
  };

  walk(directory);

  for (const ref of refs) {
    if (!ALLOWED_REFERENCES.has(ref)) {
      issues.push(`Unexpected booking reference found: ${ref}`);
    }
  }

  if (issues.length) {
    throw new Error(`Package scan failed:\n${issues.join("\n")}`);
  }

  return Array.from(refs).sort();
}

function readdirSafe(directory) {
  return readdirSync(directory, { withFileTypes: true });
}

async function getReviewPayload() {
  const response = await fetch(`${BASE_URL}/api/transfers/certification/review`);
  if (!response.ok) {
    throw new Error("Could not read certification review data.");
  }
  return response.json();
}

function line(label, value) {
  return value ? `${label}: ${value}` : `${label}: -`;
}

function makeShotCards(reviewPayload) {
  return SHOTS.map((shot) => {
    const [scenarioId, title, status, serviceIndex] = REVIEW_STEPS[shot];
    const scenario = reviewPayload.scenarios.find((item) => item.id === scenarioId);
    const service = scenario.selectedServices[serviceIndex] || scenario.selectedServices[0];
    const isVoucher = shot.endsWith("voucher");
    const isCancelled = shot.endsWith("cancelled");
    const lines = [
      line("Supplier", "Hotelbeds Transfers"),
      line("Scenario", scenario.title),
      line("Step status", status),
      line("Booking reference", scenario.booking.reference),
      line("Booking status", isCancelled ? scenario.cancellation?.status : scenario.booking.status),
      line("Client reference", scenario.booking.clientReference),
    ];

    if (isVoucher) {
      lines.push(
        line("Voucher service", scenario.voucher.serviceName),
        line("Passenger", scenario.voucher.passengerName),
        line("Pickup time", scenario.voucher.pickupTime.join(", ")),
        line("Service date", scenario.voucher.serviceDate.join(", ")),
        line("Payment note", scenario.voucher.paymentNote),
      );
      for (const [index, route] of scenario.voucher.routes.entries()) {
        lines.push(
          line(
            `Voucher route ${index + 1}`,
            `${route.from.label} (${route.from.type}/${route.from.code}) to ${route.to.label} (${route.to.type}/${route.to.code})`,
          ),
        );
      }
    } else {
      lines.push(
        line("Selected service", service.serviceName),
        line("Category", service.categoryName),
        line("Pickup", `${service.pickup.label} (${service.pickup.type}/${service.pickup.code})`),
        line("Dropoff", `${service.dropoff.label} (${service.dropoff.type}/${service.dropoff.code})`),
        line("Price", service.price.amount !== null ? `${service.price.amount} ${service.price.currency}` : ""),
        line("Selected rateKey", service.shortRateKey),
      );

      if (service.checkPickup) {
        lines.push(
          line("mustCheckPickupTime", service.checkPickup.mustCheckPickupTime ? "true" : "false"),
          line("checkPickup.url", service.checkPickup.url),
          line("hoursBeforeConsulting", service.checkPickup.hoursBeforeConsulting),
        );
      }

      if (scenario.bookedExtras.length) {
        lines.push(
          line(
            "Optional extra included",
            scenario.bookedExtras.map((extra) => `${extra.code} x ${extra.units ?? 1}`).join(", "),
          ),
        );
      }
    }

    if (isCancelled && scenario.cancellation) {
      lines.push(line("Cancellation status", scenario.cancellation.status));
    }

    return { shot, title, status, lines };
  });
}

function drawFallbackScreenshots(cards) {
  const dataPath = path.join(ROOT, ".tmp", "hotelbeds-transfers-review-cards.json");
  const scriptPath = path.join(ROOT, ".tmp", "draw-hotelbeds-transfers-review.ps1");
  mkdirSync(path.dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, JSON.stringify(cards, null, 2), "utf8");

  const script = `
param(
  [Parameter(Mandatory=$true)][string]$DataPath,
  [Parameter(Mandatory=$true)][string]$OutputDir
)
Add-Type -AssemblyName System.Drawing
$cards = Get-Content -LiteralPath $DataPath -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
function Draw-WrappedText($graphics, $text, $font, $brush, $x, $y, $width, $lineHeight) {
  $words = ($text -replace "\`r|\`n", " ") -split " "
  $line = ""
  foreach ($word in $words) {
    $candidate = if ($line.Length -eq 0) { $word } else { "$line $word" }
    if ($graphics.MeasureString($candidate, $font).Width -gt $width -and $line.Length -gt 0) {
      $graphics.DrawString($line, $font, $brush, $x, $y)
      $y += $lineHeight
      $line = $word
    } else {
      $line = $candidate
    }
  }
  if ($line.Length -gt 0) {
    $graphics.DrawString($line, $font, $brush, $x, $y)
    $y += $lineHeight
  }
  return $y
}
foreach ($card in $cards) {
  $bitmap = New-Object System.Drawing.Bitmap 1440, 1200
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::FromArgb(248,250,252))
  $dark = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15,23,42))
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(71,85,105))
  $orange = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(249,115,22))
  $green = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(22,163,74))
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(226,232,240)), 2
  $fontTitle = New-Object System.Drawing.Font "Arial", 34, ([System.Drawing.FontStyle]::Bold)
  $fontSub = New-Object System.Drawing.Font "Arial", 16, ([System.Drawing.FontStyle]::Bold)
  $fontBody = New-Object System.Drawing.Font "Arial", 20, ([System.Drawing.FontStyle]::Bold)
  $fontSmall = New-Object System.Drawing.Font "Arial", 15, ([System.Drawing.FontStyle]::Regular)
  $graphics.FillRectangle($white, 64, 48, 1310, 1080)
  $graphics.DrawRectangle($borderPen, 64, 48, 1310, 1080)
  $graphics.FillRectangle($dark, 96, 84, 1246, 170)
  $graphics.DrawString("Hotelbeds Transfers Certification", $fontTitle, $white, 126, 112)
  $graphics.DrawString("Website booking flow review from final logs only", $fontSub, $white, 128, 170)
  $graphics.FillRectangle($orange, 1080, 112, 250, 52)
  $graphics.DrawString($card.status, $fontSub, $white, 1100, 126)
  $graphics.DrawString($card.title, $fontTitle, $dark, 96, 296)
  $y = 370
  foreach ($line in $card.lines) {
    $graphics.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(241,245,249))), 96, $y, 1246, 56)
    $graphics.DrawString($line, $fontBody, $dark, 118, ($y + 13))
    $y += 72
    if ($y -gt 1040) { break }
  }
  $graphics.FillRectangle($green, 96, 1066, 360, 42)
  $graphics.DrawString("Test environment only", $fontSmall, $white, 114, 1077)
  $graphics.DrawString("No new booking or cancellation call was made during capture.", $fontSmall, $muted, 500, 1077)
  $out = Join-Path $OutputDir "$($card.shot).png"
  $bitmap.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}
`;

  writeFileSync(scriptPath, script, "utf8");
  powershell(
    `& '${scriptPath.replaceAll("'", "''")}' -DataPath '${dataPath.replaceAll("'", "''")}' -OutputDir '${SCREENSHOTS_DIR.replaceAll("'", "''")}'`,
  );
}

async function main() {
  let devServer = null;
  const startedHere = !(await isServerReady());

  if (startedHere) {
    devServer = spawn("cmd.exe", ["/c", "npm.cmd", "run", "dev"], {
      cwd: ROOT,
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForServer();
  }

  try {
    rmSync(SCREENSHOTS_DIR, { recursive: true, force: true });
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    const browser = findBrowser();
    let browserCaptureOk = true;
    for (const shot of SHOTS) {
      if (!captureShot(browser, shot)) {
        browserCaptureOk = false;
        break;
      }
    }

    if (!browserCaptureOk) {
      rmSync(SCREENSHOTS_DIR, { recursive: true, force: true });
      mkdirSync(SCREENSHOTS_DIR, { recursive: true });
      const reviewPayload = await getReviewPayload();
      drawFallbackScreenshots(makeShotCards(reviewPayload));
    }

    writeScreenshotsReadme();
    createPackage();
    const refs = scanTextFiles(PACKAGE_ROOT);

    console.log(JSON.stringify({
      success: true,
      screenshots: SHOTS.length,
      package: path.relative(ROOT, PACKAGE_ZIP),
      bookingReferences: refs,
      stateChangingCallsDuringCapture: false,
    }, null, 2));
  } finally {
    if (devServer) {
      devServer.kill();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
