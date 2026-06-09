import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import type { HotelbedsHotelVoucher } from "@/types/hotelbeds-hotels-certification";

const LOG_ROOT = path.join(process.cwd(), "hotelbeds-hotels-certification-run-logs");
const LOG_FILE = path.join(LOG_ROOT, "current-run.json");
const SECRET_KEY_PATTERN =
  /api[-_ ]?key|secret|x[-_ ]?signature|authorization|password|token|headers|signature/i;

export type HotelbedsAccommodationCertificationStep =
  | "availability"
  | "checkrate"
  | "booking"
  | "details"
  | "voucher"
  | "cancel";

export type HotelbedsAccommodationCertificationLogEntry = {
  step: HotelbedsAccommodationCertificationStep;
  status: "success" | "failed";
  timestamp: string;
  endpoint: string;
  request?: unknown;
  response?: unknown;
  error?: unknown;
  supplierBookingReference?: string;
  internalBookingReference?: string;
  selectedRateKeys?: string[];
};

export type HotelbedsAccommodationCertificationRunLog = {
  supplier: "hotelbeds-accommodation";
  scenario: {
    title: string;
    rooms: Array<{
      adults: number;
      children: number;
      childAges?: number[];
    }>;
  };
  status: "not_started" | "in_progress" | "booked" | "cancelled" | "failed";
  updatedAt?: string;
  selectedRateKeys?: string[];
  supplierBookingReference?: string;
  internalBookingReference?: string;
  voucher?: HotelbedsHotelVoucher;
  entries: HotelbedsAccommodationCertificationLogEntry[];
};

export const HOTELBEDS_ACCOMMODATION_CERTIFICATION_SCENARIO =
  {
    title: "Hotelbeds Accommodation multi-room child certification test",
    rooms: [
      { adults: 1, children: 0, childAges: [] },
      { adults: 1, children: 1, childAges: [7] },
    ],
  } satisfies HotelbedsAccommodationCertificationRunLog["scenario"];

function emptyLog(): HotelbedsAccommodationCertificationRunLog {
  return {
    supplier: "hotelbeds-accommodation",
    scenario: HOTELBEDS_ACCOMMODATION_CERTIFICATION_SCENARIO,
    status: "not_started",
    entries: [],
  };
}

export function sanitizeCertificationLog(value: unknown, depth = 0): unknown {
  if (depth > 12) return "[MaxDepth]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeCertificationLog(item, depth + 1));
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        output[key] = "[removed]";
        continue;
      }
      output[key] = sanitizeCertificationLog(item, depth + 1);
    }
    return output;
  }

  return value;
}

export async function readAccommodationCertificationLog() {
  const text = await readFile(LOG_FILE, "utf8").catch(() => "");
  if (!text) return emptyLog();

  try {
    return JSON.parse(text) as HotelbedsAccommodationCertificationRunLog;
  } catch {
    return emptyLog();
  }
}

export async function writeAccommodationCertificationLog(
  log: HotelbedsAccommodationCertificationRunLog,
) {
  await mkdir(LOG_ROOT, { recursive: true });
  await writeFile(LOG_FILE, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

export async function appendAccommodationCertificationLog(
  entry: HotelbedsAccommodationCertificationLogEntry,
  updates: Partial<Omit<HotelbedsAccommodationCertificationRunLog, "entries" | "supplier" | "scenario">> = {},
) {
  const current = await readAccommodationCertificationLog();
  const next: HotelbedsAccommodationCertificationRunLog = {
    ...current,
    ...updates,
    updatedAt: entry.timestamp,
    entries: [
      ...current.entries,
      {
        ...entry,
        request: sanitizeCertificationLog(entry.request),
        response: sanitizeCertificationLog(entry.response),
        error: sanitizeCertificationLog(entry.error),
      },
    ],
  };

  await writeAccommodationCertificationLog(next);
  return next;
}

export async function clearAccommodationCertificationLog() {
  await rm(LOG_FILE, { force: true }).catch(() => undefined);
  return emptyLog();
}
