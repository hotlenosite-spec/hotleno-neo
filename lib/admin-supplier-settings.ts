import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";

export const ADMIN_SUPPLIER_CODES = [
  "tbo",
  "hotelbeds",
  "travellanda",
  "sabre",
] as const;

export const ADMIN_SUPPLIER_STATUSES = [
  "active",
  "inactive",
  "maintenance",
] as const;

export type AdminSupplierCode = (typeof ADMIN_SUPPLIER_CODES)[number];
export type AdminSupplierStatus = (typeof ADMIN_SUPPLIER_STATUSES)[number];

export type AdminSupplierSettingDocument = Document & {
  _id: AdminSupplierCode;
  supplierCode: AdminSupplierCode;
  displayName: string;
  enabled: boolean;
  searchEnabled: boolean;
  bookingEnabled: boolean;
  priority: number;
  timeoutMs: number;
  markupPercent: number;
  status: AdminSupplierStatus;
  lastError?: string | null;
  notes?: string | null;
  updatedAt: Date;
  updatedBy?: string | null;
  createdAt: Date;
};

export type AdminSupplierSettingInput = {
  supplierCode: AdminSupplierCode;
  displayName?: string;
  enabled?: boolean;
  searchEnabled?: boolean;
  bookingEnabled?: boolean;
  priority?: number;
  timeoutMs?: number;
  markupPercent?: number;
  status?: AdminSupplierStatus;
  notes?: string | null;
  updatedBy?: string | null;
};

const DEFAULTS: Record<
  AdminSupplierCode,
  Omit<
    AdminSupplierSettingDocument,
    "_id" | "supplierCode" | "createdAt" | "updatedAt"
  >
> = {
  tbo: {
    displayName: "TBO",
    enabled: false,
    searchEnabled: false,
    bookingEnabled: false,
    priority: 1,
    timeoutMs: 30_000,
    markupPercent: 0,
    status: "inactive",
    lastError: null,
    notes: null,
    updatedBy: "system",
  },
  hotelbeds: {
    displayName: "Hotelbeds",
    enabled: false,
    searchEnabled: false,
    bookingEnabled: false,
    priority: 2,
    timeoutMs: 30_000,
    markupPercent: 0,
    status: "inactive",
    lastError: null,
    notes: null,
    updatedBy: "system",
  },
  travellanda: {
    displayName: "Travellanda",
    enabled: false,
    searchEnabled: false,
    bookingEnabled: false,
    priority: 3,
    timeoutMs: 30_000,
    markupPercent: 0,
    status: "inactive",
    lastError: null,
    notes: null,
    updatedBy: "system",
  },
  sabre: {
    displayName: "Sabre",
    enabled: false,
    searchEnabled: false,
    bookingEnabled: false,
    priority: 4,
    timeoutMs: 30_000,
    markupPercent: 0,
    status: "inactive",
    lastError: null,
    notes: null,
    updatedBy: "system",
  },
};

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maximumLength);
}

export function isAdminSupplierCode(
  value: unknown,
): value is AdminSupplierCode {
  return (
    typeof value === "string" &&
    ADMIN_SUPPLIER_CODES.includes(value as AdminSupplierCode)
  );
}

export function isAdminSupplierStatus(
  value: unknown,
): value is AdminSupplierStatus {
  return (
    typeof value === "string" &&
    ADMIN_SUPPLIER_STATUSES.includes(value as AdminSupplierStatus)
  );
}

export async function ensureAdminSupplierSettings() {
  const db = await getFirestoreMongoDb();
  const collection =
    db.collection<AdminSupplierSettingDocument>("supplier_admin_settings");
  const now = new Date();

  await Promise.all(
    ADMIN_SUPPLIER_CODES.map((supplierCode) =>
      collection.updateOne(
        { _id: supplierCode },
        {
          $setOnInsert: {
            _id: supplierCode,
            supplierCode,
            ...DEFAULTS[supplierCode],
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      ),
    ),
  );
}

export async function getAdminSupplierSettings() {
  await ensureAdminSupplierSettings();
  const db = await getFirestoreMongoDb();
  const settings = await db
    .collection<AdminSupplierSettingDocument>("supplier_admin_settings")
    .find({ supplierCode: { $in: [...ADMIN_SUPPLIER_CODES] } })
    .sort({ priority: 1, supplierCode: 1 })
    .toArray();

  return settings.map((setting) => ({
    supplierCode: setting.supplierCode,
    displayName: setting.displayName,
    enabled: Boolean(setting.enabled),
    searchEnabled: Boolean(setting.searchEnabled),
    bookingEnabled: Boolean(setting.bookingEnabled),
    priority: Number(setting.priority),
    timeoutMs: Number(setting.timeoutMs),
    markupPercent: Number(setting.markupPercent),
    status: setting.status,
    lastError: setting.lastError || null,
    notes: setting.notes || "",
    updatedAt: setting.updatedAt,
    updatedBy: setting.updatedBy || null,
  }));
}

export async function updateAdminSupplierSetting(
  input: AdminSupplierSettingInput,
) {
  await ensureAdminSupplierSettings();
  const db = await getFirestoreMongoDb();
  const collection =
    db.collection<AdminSupplierSettingDocument>("supplier_admin_settings");
  const current = await collection.findOne({ _id: input.supplierCode });
  if (!current) throw new Error("Supplier setting not found");

  const updates: Partial<AdminSupplierSettingDocument> = {
    updatedAt: new Date(),
    updatedBy: input.updatedBy || null,
  };

  if (typeof input.displayName === "string") {
    const displayName = normalizeText(input.displayName, 80);
    if (!displayName) throw new Error("Display name is required");
    updates.displayName = displayName;
  }
  if (typeof input.enabled === "boolean") updates.enabled = input.enabled;
  if (typeof input.searchEnabled === "boolean") {
    updates.searchEnabled = input.searchEnabled;
  }
  if (typeof input.bookingEnabled === "boolean") {
    updates.bookingEnabled = input.bookingEnabled;
  }
  if (typeof input.priority === "number" && Number.isFinite(input.priority)) {
    updates.priority = Math.round(clampNumber(input.priority, 1, 100));
  }
  if (typeof input.timeoutMs === "number" && Number.isFinite(input.timeoutMs)) {
    updates.timeoutMs = Math.round(
      clampNumber(input.timeoutMs, 1_000, 120_000),
    );
  }
  if (
    typeof input.markupPercent === "number" &&
    Number.isFinite(input.markupPercent)
  ) {
    updates.markupPercent = Number(
      clampNumber(input.markupPercent, 0, 100).toFixed(2),
    );
  }
  if (input.status && isAdminSupplierStatus(input.status)) {
    updates.status = input.status;
  }
  if (input.notes === null || typeof input.notes === "string") {
    updates.notes = normalizeText(input.notes || "", 2_000) || null;
  }

  await collection.updateOne(
    { _id: input.supplierCode },
    { $set: updates },
  );
  return getAdminSupplierSettings();
}
