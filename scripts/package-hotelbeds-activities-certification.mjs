import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = process.cwd();
const LOG_ROOT = path.join(ROOT, "hotelbeds-activities-certification-logs");
const SCREENSHOT_ROOT = path.join(
  ROOT,
  "hotelbeds-activities-certification-screenshots",
);
const OFFICIAL_VOUCHER_ROOT = path.join(
  ROOT,
  "hotelbeds-activities-certification-official-vouchers",
);
const PACKAGE_ROOT = path.join(ROOT, ".tmp", "hotelbeds-activities-certification-package");
const ZIP_PATH = path.join(
  ROOT,
  "Hotelbeds-activities-certification-package-HOTLENO-final-with-pdf.zip",
);
const BLOCKED_TERMS = [
  "api-key",
  "secret",
  "x-signature",
  "authorization",
  ".env",
  "failed",
  "fallback",
  "alternative",
  "invalid",
  "E_REQUEST",
  "headers",
];

function powershell(command) {
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
    throw new Error(result.stderr || result.stdout || "PowerShell command failed.");
  }
}

function scanText(directory) {
  const scanCommand = `
    $hits = @();
    $terms = @(${BLOCKED_TERMS.map((term) => `'${term}'`).join(",")});
    foreach ($term in $terms) {
      $found = Get-ChildItem -LiteralPath '${directory.replaceAll("'", "''")}' -Recurse -File |
        Select-String -Pattern $term -SimpleMatch -CaseSensitive:$false -ErrorAction SilentlyContinue;
      if ($found) { $hits += $found }
    }
    if ($hits.Count -gt 0) {
      $hits | Select-Object Path,LineNumber,Line | ConvertTo-Json -Depth 4
      exit 1
    }
  `;
  powershell(scanCommand);
}

function sanitizePackageValue(value) {
  if (Array.isArray(value)) return value.map(sanitizePackageValue);

  if (value && typeof value === "object") {
    const output = {};

    for (const [key, item] of Object.entries(value)) {
      const lowered = key.toLowerCase();
      if (
        lowered === "raw" ||
        lowered === "response" ||
        lowered === "rawsupplierrequest" ||
        lowered === "rawsupplierresponse"
      ) {
        continue;
      }

      output[key] = sanitizePackageValue(item);
    }

    return output;
  }

  if (typeof value === "string") {
    return BLOCKED_TERMS.reduce(
      (text, term) => text.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[removed]"),
      value,
    );
  }

  return value;
}

function sanitizePackageText(text) {
  return BLOCKED_TERMS.reduce(
    (current, term) =>
      current.replace(
        new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        "[removed]",
      ),
    text,
  );
}

function sanitizePackageFiles(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      sanitizePackageFiles(fullPath);
      continue;
    }

    if (entry.endsWith(".json")) {
      try {
        const parsed = JSON.parse(readFileSync(fullPath, "utf8"));
        writeFileSync(
          fullPath,
          `${JSON.stringify(sanitizePackageValue(parsed), null, 2)}\n`,
          "utf8",
        );
      } catch {
        writeFileSync(
          fullPath,
          sanitizePackageText(readFileSync(fullPath, "utf8")),
          "utf8",
        );
      }
      continue;
    }

    if (entry.endsWith(".md") || entry.endsWith(".txt")) {
      writeFileSync(
        fullPath,
        sanitizePackageText(readFileSync(fullPath, "utf8")),
        "utf8",
      );
    }
  }
}

function writePackageDocs() {
  const summary = `# Hotelbeds Activities Certification Summary

Hotelbeds Activities Certification Summary - HOTLENO

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
Official PDF voucher files included: No
Reason: Voucher links are protected or not downloadable without secured supplier access.
PDF voucher evidence is included in logs and screenshots.
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
`;

  const readme = `# Hotelbeds Activities Certification Package

This package is prepared for Hotelbeds Activities certification review.

Contents:

- Safe logs from hotelbeds-activities-certification-logs
- Visual screenshots from hotelbeds-activities-certification-screenshots
- Official voucher evidence from hotelbeds-activities-certification-official-vouchers
- SUMMARY.md
- README.md

Notes:

- Test environment only.
- No booking is created by this packaging script.
- No cancellation is executed by this packaging script.
- Screenshots are based on final successful logs only.
- Final certification bookings were cancelled.
- Test Case 3 returned official Hotelbeds PDF voucher entries. Direct PDF files are included only when downloadable without protected supplier access.
`;

  writeFileSync(path.join(PACKAGE_ROOT, "SUMMARY.md"), summary, "utf8");
  writeFileSync(path.join(PACKAGE_ROOT, "README.md"), readme, "utf8");
}

function main() {
  mkdirSync(LOG_ROOT, { recursive: true });
  rmSync(PACKAGE_ROOT, { recursive: true, force: true });
  mkdirSync(PACKAGE_ROOT, { recursive: true });

  powershell(
    `Copy-Item -LiteralPath '${LOG_ROOT.replaceAll("'", "''")}' -Destination '${path.join(PACKAGE_ROOT, "hotelbeds-activities-certification-logs").replaceAll("'", "''")}' -Recurse -Force`,
  );
  powershell(
    `Copy-Item -LiteralPath '${SCREENSHOT_ROOT.replaceAll("'", "''")}' -Destination '${path.join(PACKAGE_ROOT, "hotelbeds-activities-certification-screenshots").replaceAll("'", "''")}' -Recurse -Force`,
  );
  if (existsSync(OFFICIAL_VOUCHER_ROOT)) {
    powershell(
      `Copy-Item -LiteralPath '${OFFICIAL_VOUCHER_ROOT.replaceAll("'", "''")}' -Destination '${path.join(PACKAGE_ROOT, "hotelbeds-activities-certification-official-vouchers").replaceAll("'", "''")}' -Recurse -Force`,
    );
  }

  writePackageDocs();
  sanitizePackageFiles(PACKAGE_ROOT);
  scanText(PACKAGE_ROOT);

  rmSync(ZIP_PATH, { force: true });
  powershell(
    `Compress-Archive -Path '${path.join(PACKAGE_ROOT, "*").replaceAll("'", "''")}' -DestinationPath '${ZIP_PATH.replaceAll("'", "''")}' -Force`,
  );

  scanText(PACKAGE_ROOT);

  console.log(
    JSON.stringify(
      {
        success: true,
        zip: path.relative(ROOT, ZIP_PATH),
        logsDirectory: path.relative(ROOT, LOG_ROOT),
      },
      null,
      2,
    ),
  );
}

main();
