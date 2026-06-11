import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CERTIFICATION_ROOT = path.join(process.cwd(), "hotelbeds-certification");
const SEARCH_EVIDENCE_ROOT = path.join(CERTIFICATION_ROOT, ".search");
const SECRET_KEY_PATTERN =
  /api[-_ ]?key|secret|signature|authorization|password|token|bearer|x[-_ ]?signature/i;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type EvidenceTarget = {
  bookingReference?: string;
  evidenceId?: string;
};

type CertificationBookingSummary = {
  bookingReference?: string;
  _id?: string;
  hotelName?: string;
  supplier?: string;
  status?: string;
  bookingStatus?: string;
  supplierStatus?: string;
  cancellationStatus?: string;
  checkInDate?: string | Date;
  checkOutDate?: string | Date;
  rooms?: unknown[];
  travelers?: unknown[];
  currency?: string;
  totalPrice?: number;
  supplierReference?: string;
  supplierBookingReference?: string;
  metadata?: unknown;
};

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "unknown";
}

function redact(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? "[REDACTED]" : redact(item),
      ]),
    );
  }

  return String(value);
}

function getTargetDirectory(target: EvidenceTarget) {
  if (target.bookingReference) {
    return path.join(CERTIFICATION_ROOT, safePathSegment(target.bookingReference));
  }
  if (target.evidenceId) {
    return path.join(SEARCH_EVIDENCE_ROOT, safePathSegment(target.evidenceId));
  }
  return "";
}

async function writeJsonFile(filePath: string, payload: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(redact(payload), null, 2)}\n`, "utf8");
}

export function createHotelbedsEvidenceId() {
  return `hotelbeds-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export async function writeHotelbedsEvidenceLog(
  target: EvidenceTarget & {
    fileName: string;
    payload: unknown;
  },
) {
  const targetDirectory = getTargetDirectory(target);
  if (!targetDirectory) return;

  await writeJsonFile(
    path.join(targetDirectory, "logs", safePathSegment(target.fileName)),
    target.payload,
  );
}

export async function attachHotelbedsSearchEvidenceToBooking(params: {
  evidenceId?: string;
  bookingReference: string;
}) {
  if (!params.evidenceId || !params.bookingReference) return;

  const searchLogsDir = path.join(
    SEARCH_EVIDENCE_ROOT,
    safePathSegment(params.evidenceId),
    "logs",
  );
  const bookingLogsDir = path.join(
    CERTIFICATION_ROOT,
    safePathSegment(params.bookingReference),
    "logs",
  );

  try {
    const files = await readdir(searchLogsDir);
    await mkdir(bookingLogsDir, { recursive: true });
    await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map((file) => copyFile(path.join(searchLogsDir, file), path.join(bookingLogsDir, file))),
    );
  } catch {
    await writeHotelbedsEvidenceLog({
      bookingReference: params.bookingReference,
      fileName: "availability-evidence-link.json",
      payload: {
        evidenceId: params.evidenceId,
        copied: false,
        reason: "Availability evidence was not found in the temporary search store.",
      },
    });
    const baseDir = path.join(CERTIFICATION_ROOT, safePathSegment(params.bookingReference));
    await writeFile(
      path.join(baseDir, "missing-evidence-report.md"),
      `# Missing Evidence Report

- Missing Log: Availability Request / Availability Response
- Booking Reference: ${params.bookingReference}
- Search Evidence ID: ${params.evidenceId}
- Searched Path: ${searchLogsDir}
- Reason: Availability evidence was not found in the temporary search store when the booking package was created.
`,
      "utf8",
    );
  }
}

export async function writeHotelbedsCertificationDocuments(params: {
  bookingReference: string;
  booking?: CertificationBookingSummary | null;
}) {
  const bookingReference = params.bookingReference;
  const booking = params.booking || {};
  const baseDir = path.join(CERTIFICATION_ROOT, safePathSegment(bookingReference));
  const metadata = booking.metadata && typeof booking.metadata === "object"
    ? (booking.metadata as Record<string, unknown>)
    : {};
  const hotelbedsFlow = metadata.hotelbedsFlow && typeof metadata.hotelbedsFlow === "object"
    ? (metadata.hotelbedsFlow as Record<string, unknown>)
    : {};
  const rooms = Array.isArray(booking.rooms) ? booking.rooms : [];

  await mkdir(path.join(baseDir, "workflow"), { recursive: true });
  await mkdir(path.join(baseDir, "summary"), { recursive: true });

  const roomLines = rooms.length
    ? rooms
        .map((room, index) => {
          const record = room && typeof room === "object" ? (room as Record<string, unknown>) : {};
          const childAges = Array.isArray(record.childrenAges)
            ? record.childrenAges.join(", ")
            : "";
          return `- Room ${index + 1}: adults=${record.adults ?? ""}, children=${record.children ?? ""}${
            childAges ? `, childAges=${childAges}` : ""
          }`;
        })
        .join("\n")
    : "- No room details were stored on the booking record.";

  const summary = `# Hotelbeds Accommodation Certification Summary

- Booking Reference: ${booking.bookingReference || bookingReference}
- Internal Booking ID: ${booking._id || bookingReference}
- Supplier: ${booking.supplier || "hotelbeds"}
- Hotel: ${booking.hotelName || ""}
- Check-in: ${booking.checkInDate ? new Date(booking.checkInDate).toISOString().slice(0, 10) : ""}
- Check-out: ${booking.checkOutDate ? new Date(booking.checkOutDate).toISOString().slice(0, 10) : ""}
- Booking Status: ${booking.status || booking.bookingStatus || ""}
- Supplier Status: ${booking.supplierStatus || ""}
- Cancellation Status: ${booking.cancellationStatus || ""}
- Supplier Reference: ${booking.supplierReference || booking.supplierBookingReference || ""}
- Test Environment Evidence: Hotelbeds Accommodation test evidence is captured from the runtime Hotelbeds integration.

## Occupancy

${roomLines}

## Flow Diagnostics

- CheckRate Status: ${hotelbedsFlow.checkRateStatus ?? metadata.hotelbedsCheckRateStatus ?? ""}
- Booking Status: ${hotelbedsFlow.bookingStatus ?? metadata.hotelbedsBookingStatus ?? ""}
- Hotelbeds Reference: ${hotelbedsFlow.hotelbedsReference ?? metadata.hotelbedsBookingReference ?? ""}
`;

  const workflow = `# HOTLENO Hotelbeds Accommodation Workflow

This package is generated automatically by HOTLENO for the booking reference ${bookingReference}.

1. Search: the public hotel search route builds a Hotelbeds Availability request from the selected destination, dates, room occupancies, nationality, and currency.
2. Availability: the Hotelbeds supplier provider sends the Availability request to the Hotelbeds Hotels API and stores the real request and response in this package.
3. Hotel Details: the selected Hotelbeds offer is carried through the hotel details page with its Hotelbeds room package, rate keys, occupancies, price, board, and policy data.
4. Room Selection: the selected package is stored on the booking payload without substituting rooms after user selection.
5. CheckRate: if Hotelbeds marks the rate as RECHECK, HOTLENO sends CheckRate before booking and stores request and response. If the selected rate is BOOKABLE, the package records that CheckRate was not sent because the supplier rate is directly bookable.
6. Review: traveler and room details are reviewed before confirmation.
7. Booking Confirmation: HOTLENO sends BookingRQ to Hotelbeds and stores the request and response.
8. Voucher: voucher evidence is available from the confirmed booking reference.
9. Cancellation: when cancellation is executed, HOTLENO sends the Hotelbeds cancellation request and stores request and response.
`;

  const readme = `# Hotelbeds Accommodation Certification Package

Booking reference: ${bookingReference}

This folder contains the automatically captured Hotelbeds Accommodation certification evidence for a real HOTLENO booking flow.

## Contents

- logs/availability-request.json
- logs/availability-response.json
- logs/checkrate-request.json
- logs/checkrate-response.json
- logs/booking-request.json
- logs/booking-response.json
- logs/cancellation-request.json
- logs/cancellation-response.json
- workflow/workflow-description.md
- summary/certification-summary.md

Sensitive authentication fields such as API keys, secrets, signatures, authorization values, tokens, and passwords are redacted when files are written.
`;

  await writeFile(path.join(baseDir, "summary", "certification-summary.md"), summary, "utf8");
  await writeFile(path.join(baseDir, "workflow", "workflow-description.md"), workflow, "utf8");
  await writeFile(path.join(baseDir, "README.md"), readme, "utf8");
}

export function getHotelbedsEvidenceIdFrom(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const metadata = record.metadata && typeof record.metadata === "object"
    ? (record.metadata as Record<string, unknown>)
    : {};

  return String(
    record.hotelbedsEvidenceId ||
      metadata.hotelbedsEvidenceId ||
      record.evidenceId ||
      metadata.evidenceId ||
      "",
  ).trim();
}

export async function writeHotelbedsEvidenceSafely(
  action: () => Promise<void>,
  context: string,
) {
  try {
    await action();
  } catch (error) {
    console.warn("[Hotelbeds Certification Evidence]", {
      context,
      error: error instanceof Error ? error.message : "Unable to write evidence",
    });
  }
}
