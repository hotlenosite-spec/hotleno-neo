import bcrypt from "bcryptjs";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import type { SupplierProviderName } from "@/lib/suppliers/types";

export const USER_ROLES = [
  "customer",
  "agency_owner",
  "agency_manager",
  "agency_agent",
  "agency_accountant",
  "hotel_owner",
  "hotel_manager",
  "hotel_staff",
  "admin",
  "supplier_tester",
  "user",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type FirestoreUser = {
  id: string;
  email: string;
  password?: string;
  name: string;
  avatar: string;
  role: UserRole;
  accountType: "b2c" | "b2b" | "hotel" | "admin" | "supplier_test";
  agencyId: string | null;
  agencyRole: string | null;
  hotelPartnerId: string | null;
  hotelRole: string | null;
  supplierScope: SupplierProviderName | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  phone: string;
  birthDate?: Date | null;
  nationality: string;
  nationalId: string;
  passportNumber: string;
  passportExpiryDate?: Date | null;
  preferences: {
    currency: string;
    language: string;
    emailNotifications: boolean;
    priceAlerts: boolean;
    newsletter: boolean;
    theme: "light" | "dark" | "system";
  };
  createdAt?: Date;
  updatedAt?: Date;
};

export type SupplierSettingRecord = {
  supplier: SupplierProviderName;
  enabled: boolean;
  environment: "staging" | "test" | "production" | "mock";
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type UserDocument = Document & {
  _id: string;
};

type MetaDocument = Document & {
  _id: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function fromStoredDate(value: unknown) {
  return value instanceof Date ? value : null;
}

function defaultPreferences() {
  return {
    currency: "USD",
    language: "en",
    emailNotifications: true,
    priceAlerts: false,
    newsletter: true,
    theme: "system" as const,
  };
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function mapUserDocument(data: Record<string, unknown> | null): FirestoreUser | null {
  if (!data) return null;

  return {
    id: String(data._id ?? data.email ?? ""),
    email: String(data.email ?? data._id ?? ""),
    password: typeof data.password === "string" ? data.password : undefined,
    name: String(data.name ?? ""),
    avatar: String(data.avatar ?? ""),
    role: (data.role ?? "customer") as UserRole,
    accountType: (data.accountType ?? "b2c") as FirestoreUser["accountType"],
    agencyId: nullableString(data.agencyId),
    agencyRole: nullableString(data.agencyRole),
    hotelPartnerId: nullableString(data.hotelPartnerId),
    hotelRole: nullableString(data.hotelRole),
    supplierScope: nullableString(data.supplierScope) as SupplierProviderName | null,
    isActive: data.isActive !== false,
    lastLoginAt: fromStoredDate(data.lastLoginAt),
    phone: String(data.phone ?? ""),
    birthDate: fromStoredDate(data.birthDate),
    nationality: String(data.nationality ?? ""),
    nationalId: String(data.nationalId ?? ""),
    passportNumber: String(data.passportNumber ?? ""),
    passportExpiryDate: fromStoredDate(data.passportExpiryDate),
    preferences: {
      ...defaultPreferences(),
      ...(typeof data.preferences === "object" && data.preferences
        ? data.preferences
        : {}),
    },
    createdAt: fromStoredDate(data.createdAt) ?? undefined,
    updatedAt: fromStoredDate(data.updatedAt) ?? undefined,
  };
}

export function publicUser(user: FirestoreUser) {
  return {
    _id: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountType: user.accountType,
    agencyId: user.agencyId,
    agencyRole: user.agencyRole,
    hotelPartnerId: user.hotelPartnerId,
    hotelRole: user.hotelRole,
    supplierScope: user.supplierScope,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    avatar: user.avatar,
    phone: user.phone,
    birthDate: user.birthDate,
    nationality: user.nationality,
    nationalId: user.nationalId,
    passportNumber: user.passportNumber,
    passportExpiryDate: user.passportExpiryDate,
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getUserById(userId: string) {
  const db = await getFirestoreMongoDb();
  const user = await db.collection<UserDocument>("users").findOne({ _id: userId });
  return mapUserDocument(user);
}

export async function getUserByEmail(email: string) {
  return getUserById(normalizeEmail(email));
}

export async function createUser(params: {
  name: string;
  email: string;
  password: string;
}) {
  const email = normalizeEmail(params.email);
  const db = await getFirestoreMongoDb();
  const users = db.collection<UserDocument>("users");
  const existing = await users.findOne({ _id: email });

  if (existing) return null;

  const password = await bcrypt.hash(params.password, 10);
  const now = new Date();
  await users.insertOne({
    _id: email,
    email,
    name: params.name,
    password,
    role: "customer",
    accountType: "b2c",
    supplierScope: null,
    isActive: true,
    avatar: "",
    agencyId: null,
    agencyRole: null,
    hotelPartnerId: null,
    hotelRole: null,
    phone: "",
    nationality: "",
    preferences: defaultPreferences(),
    createdAt: now,
    updatedAt: now,
  });

  return getUserById(email);
}

export async function validatePassword(user: FirestoreUser, password: string) {
  if (!user.password) return false;
  return bcrypt.compare(password, user.password);
}

export async function updateUserLastLogin(userId: string) {
  const db = await getFirestoreMongoDb();
  await db.collection<UserDocument>("users").updateOne(
    { _id: userId },
    {
      $set: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return getUserById(userId);
}

export function getAccountTypeForRole(role: string) {
  if (role === "admin") return "admin";
  if (role === "supplier_tester") return "supplier_test";
  if (role.startsWith("agency_")) return "b2b";
  if (role.startsWith("hotel_")) return "hotel";
  return "b2c";
}

export function getAgencyRoleForRole(role: string) {
  switch (role) {
    case "agency_owner":
      return "owner";
    case "agency_manager":
      return "manager";
    case "agency_agent":
      return "agent";
    case "agency_accountant":
      return "accountant";
    default:
      return null;
  }
}

export function getHotelRoleForRole(role: string) {
  switch (role) {
    case "hotel_owner":
      return "owner";
    case "hotel_manager":
      return "manager";
    case "hotel_staff":
      return "staff";
    default:
      return null;
  }
}

export async function listUsers(params: {
  role?: string | null;
  search?: string | null;
  page: number;
  limit: number;
}) {
  const db = await getFirestoreMongoDb();
  const users = await db.collection<UserDocument>("users").find({}).toArray();
  const search = params.search?.trim().toLowerCase();
  const filtered = users
    .map(mapUserDocument)
    .filter((user): user is FirestoreUser => Boolean(user))
    .filter((user) => !params.role || user.role === params.role)
    .filter(
      (user) =>
        !search ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search),
    )
    .sort(
      (a, b) =>
        (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );

  const start = (params.page - 1) * params.limit;
  return {
    users: filtered.slice(start, start + params.limit).map((user) => ({
      ...publicUser(user),
      bookingCount: 0,
    })),
    total: filtered.length,
  };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const db = await getFirestoreMongoDb();
  const users = db.collection<UserDocument>("users");
  const existing = await users.findOne({ _id: userId });
  if (!existing) return null;

  await users.updateOne(
    { _id: userId },
    {
      $set: {
        role,
        accountType: getAccountTypeForRole(role),
        agencyRole: getAgencyRoleForRole(role),
        hotelRole: getHotelRoleForRole(role),
        updatedAt: new Date(),
      },
    },
  );

  return getUserById(userId);
}

export async function seedCoreCollections() {
  const db = await getFirestoreMongoDb();
  for (const name of ["bookings", "logs"]) {
    await db.collection<MetaDocument>(name).updateOne(
      { _id: "_meta" },
      { $set: { initialized: true, updatedAt: new Date() } },
      { upsert: true },
    );
  }
}

export async function createLog(params: {
  supplier?: string;
  type: string;
  status: "started" | "pending" | "success" | "failed" | "timeout" | "skipped";
  message: string;
  request?: unknown;
  response?: unknown;
  error?: unknown;
}) {
  const db = await getFirestoreMongoDb();
  await db.collection("logs").insertOne({
    supplier: params.supplier ?? "none",
    type: params.type,
    status: params.status,
    message: params.message,
    request: params.request ?? null,
    response: params.response ?? null,
    error: params.error ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
