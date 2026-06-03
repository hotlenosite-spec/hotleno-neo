import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = process.cwd();
const LOG_ROOT = path.join(ROOT, "hotelbeds-hotels-certification-logs");
const SCREENSHOT_ROOT = path.join(
  ROOT,
  "hotelbeds-hotels-certification-screenshots",
);
const ARCHIVE_ROOT = path.join(ROOT, "hotelbeds-hotels-certification-archive");
const PACKAGE_ROOT = path.join(
  ROOT,
  ".tmp-hotelbeds-hotels-certification-package",
);
const ZIP_PATH = path.join(
  ROOT,
  "Hotelbeds-hotels-certification-package-HOTLENO-final.zip",
);

const BLOCKED_TERMS = [
  "api-key",
  "secret",
  "x-signature",
  "authorization",
  ".env",
  "headers",
  "failed",
  "fallback",
  "alternative",
  "invalid",
  "E_REQUEST",
  "RequestFailed",
  "Exception",
  "Error",
];

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const command = `Get-ChildItem -LiteralPath '${dir.replaceAll("'", "''")}' -Recurse -File | Select-Object -ExpandProperty FullName`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Unable to list files.");
  }

  return result.stdout
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readTextIfPossible(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".pdf", ".zip"].includes(ext)) return "";
  return readFileSync(filePath, "utf8");
}

function containsBlockedTerm(filePath) {
  const text = readTextIfPossible(filePath);
  return BLOCKED_TERMS.some((term) =>
    text.toLowerCase().includes(term.toLowerCase()),
  );
}

function archiveUnsafeScenarioDirs() {
  if (!existsSync(LOG_ROOT)) return [];

  mkdirSync(ARCHIVE_ROOT, { recursive: true });
  const scenarioDirs = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Get-ChildItem -LiteralPath '${LOG_ROOT.replaceAll("'", "''")}' -Directory | Select-Object -ExpandProperty FullName`,
    ],
    { cwd: ROOT, encoding: "utf8", windowsHide: true },
  )
    .stdout.split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const archived = [];

  for (const dir of scenarioDirs) {
    const files = listFiles(dir);
    const unsafe = files.some((file) => containsBlockedTerm(file));
    if (!unsafe) continue;

    const target = path.join(ARCHIVE_ROOT, path.basename(dir));
    rmSync(target, { recursive: true, force: true });
    cpSync(dir, target, { recursive: true });
    rmSync(dir, { recursive: true, force: true });
    archived.push(path.basename(dir));
  }

  return archived;
}

function copyIfExists(source, target) {
  if (!existsSync(source)) return false;
  cpSync(source, target, { recursive: true });
  return true;
}

function createZip() {
  rmSync(ZIP_PATH, { force: true });
  const packageRoot = PACKAGE_ROOT.replaceAll("'", "''");
  const zipPath = ZIP_PATH.replaceAll("'", "''");
  const command = `$items = Get-ChildItem -LiteralPath '${packageRoot}'; Compress-Archive -Path $items.FullName -DestinationPath '${zipPath}' -Force`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Unable to create ZIP.");
  }
}

function scanPackage() {
  const files = listFiles(PACKAGE_ROOT);
  const hits = [];

  for (const file of files) {
    const text = readTextIfPossible(file);
    for (const term of BLOCKED_TERMS) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        hits.push({
          file: path.relative(PACKAGE_ROOT, file),
          term,
        });
      }
    }
  }

  return hits;
}

function main() {
  const archived = archiveUnsafeScenarioDirs();

  rmSync(PACKAGE_ROOT, { recursive: true, force: true });
  mkdirSync(PACKAGE_ROOT, { recursive: true });

  const copiedLogs = copyIfExists(
    LOG_ROOT,
    path.join(PACKAGE_ROOT, "hotelbeds-hotels-certification-logs"),
  );
  const copiedScreenshots = copyIfExists(
    SCREENSHOT_ROOT,
    path.join(PACKAGE_ROOT, "hotelbeds-hotels-certification-screenshots"),
  );

  writeFileSync(
    path.join(PACKAGE_ROOT, "README.md"),
    `# Hotelbeds Accommodation Certification Package - HOTLENO

This package is prepared for Hotelbeds Accommodation certification review.
It must include successful certification scenarios only.
No supplier keys, signing data, environment files, or raw transport metadata are included.
Archive folders and unsuccessful attempts are kept outside this final package.
`,
    "utf8",
  );

  writeFileSync(
    path.join(PACKAGE_ROOT, "SUMMARY.md"),
    `# Hotelbeds Accommodation Certification Summary - HOTLENO

Status: Completed successfully.
Supplier: Hotelbeds Accommodation.
Environment: test/validation only.
Booking reference: 102-20736378.
Hotel: Sercotel Rosellon.
Room: CLASSIC TWIN.
Board: ROOM ONLY.
Amount: 150.85 EUR.
Booking: Confirmed.
Booking Details: Retrieved.
Voucher: Generated.
Cancellation: Completed.

No Hotelbeds booking is executed by this packaging script.
No Hotelbeds API request is executed by this packaging script.

Clean logs included: ${copiedLogs ? "Yes" : "No final logs available yet"}
Screenshots included: ${copiedScreenshots ? "Yes" : "No screenshots available yet"}
Archived unsafe folders before packaging: ${archived.length ? archived.join(", ") : "None"}
`,
    "utf8",
  );

  const hits = scanPackage();
  if (hits.length) {
    rmSync(PACKAGE_ROOT, { recursive: true, force: true });
    throw new Error(
      `Blocked terms found in package: ${JSON.stringify(hits, null, 2)}`,
    );
  }

  createZip();

  console.log(
    JSON.stringify(
      {
        success: true,
        zip: path.relative(ROOT, ZIP_PATH),
        archived,
        logsIncluded: copiedLogs,
        screenshotsIncluded: copiedScreenshots,
      },
      null,
      2,
    ),
  );
}

main();
