import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import type { SupplierProviderName } from "./types";

type SupplierSettingDocument = {
  _id: string;
  supplier: SupplierProviderName;
  enabled: boolean;
  environment: "staging" | "test" | "production" | "mock";
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function isSupplierEnvironment(
  value: string | undefined,
): value is SupplierSettingDocument["environment"] {
  return (
    value === "staging" ||
    value === "test" ||
    value === "production" ||
    value === "mock"
  );
}

export const SUPPLIER_CONTROL_NAMES: SupplierProviderName[] = [
  "tbo",
  "hotelbeds",
  "travellanda",
  "mock",
];

const DEFAULT_SUPPLIER_SETTINGS: Record<
  SupplierProviderName,
  { enabled: boolean; environment: "staging" | "test" | "mock" }
> = {
  tbo: { enabled: true, environment: "staging" },
  hotelbeds: { enabled: false, environment: "test" },
  travellanda: { enabled: false, environment: "staging" },
  mock: { enabled: false, environment: "mock" },
};

export async function ensureSupplierSettings() {
  const db = await getFirestoreMongoDb();
  for (const supplier of SUPPLIER_CONTROL_NAMES) {
    const defaults = DEFAULT_SUPPLIER_SETTINGS[supplier];
    await db.collection<SupplierSettingDocument>("supplier_settings").updateOne(
      { _id: supplier },
      {
        $setOnInsert: {
          supplier,
          enabled:
            supplier === "mock" && process.env.NODE_ENV === "production"
              ? false
              : defaults.enabled,
          environment: defaults.environment,
          updatedBy: "system",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}

export async function getSupplierSettings() {
  await ensureSupplierSettings();
  const db = await getFirestoreMongoDb();
  const settings = await db
    .collection<SupplierSettingDocument>("supplier_settings")
    .find({ supplier: { $in: SUPPLIER_CONTROL_NAMES } })
    .sort({ supplier: 1 })
    .toArray();

  return settings.map((setting) => ({
    supplier: setting.supplier as SupplierProviderName,
    enabled:
      setting.supplier === "mock" && process.env.NODE_ENV === "production"
        ? false
        : Boolean(setting.enabled),
    environment: setting.environment,
    updatedAt: setting.updatedAt ?? null,
    updatedBy: setting.updatedBy ?? null,
  }));
}

export async function updateSupplierSetting(params: {
  supplier: SupplierProviderName;
  enabled: boolean;
  environment?: string;
  updatedBy?: string;
}) {
  if (!SUPPLIER_CONTROL_NAMES.includes(params.supplier)) {
    throw new Error("Unsupported supplier");
  }

  if (params.supplier === "mock" && process.env.NODE_ENV === "production") {
    params.enabled = false;
  }

  await ensureSupplierSettings();
  const db = await getFirestoreMongoDb();
  const environment = isSupplierEnvironment(params.environment)
    ? params.environment
    : DEFAULT_SUPPLIER_SETTINGS[params.supplier].environment;

  await db
    .collection<SupplierSettingDocument>("supplier_settings")
    .updateOne(
      { _id: params.supplier },
      {
        $set: {
          supplier: params.supplier,
          enabled: params.enabled,
          environment,
          updatedBy: params.updatedBy ?? null,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

  return getSupplierSettings();
}

export async function getEnabledSupplierNamesForSearch(params?: {
  role?: string;
  supplierScope?: string | null;
}) {
  if (params?.role === "supplier_tester") {
    if (
      params.supplierScope === "tbo" ||
      params.supplierScope === "hotelbeds" ||
      params.supplierScope === "travellanda"
    ) {
      return [params.supplierScope] as SupplierProviderName[];
    }

    return [] as SupplierProviderName[];
  }

  const settings = await getSupplierSettings();
  return settings
    .filter((setting) => setting.enabled)
    .map((setting) => setting.supplier)
    .filter((supplier) => supplier !== "mock" || process.env.NODE_ENV !== "production");
}
