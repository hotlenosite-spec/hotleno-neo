import bcrypt from "bcryptjs";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import {
  getDefaultPermissions,
  normalizePermissions,
  type StaffPermission,
  type StaffRecord,
  type StaffRole,
  type StaffStatus,
} from "@/lib/staff-permissions";

type StaffDocument = Document & { _id: string };
type UserDocument = Document & { _id: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function serializeStaff(record: Record<string, unknown>): StaffRecord {
  return {
    staffId: String(record._id || record.staffId || record.userId || ""),
    userId: String(record.userId || record._id || ""),
    name: String(record.name || ""),
    email: String(record.email || ""),
    role: record.role as StaffRole,
    permissions: normalizePermissions(record.permissions),
    status: record.status === "suspended" ? "suspended" : "active",
    createdAt: record.createdAt instanceof Date ? record.createdAt : new Date(0),
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt : new Date(0),
    lastLoginAt: record.lastLoginAt instanceof Date ? record.lastLoginAt : null,
  };
}

export async function listStaff() {
  const db = await getFirestoreMongoDb();
  const records = await db
    .collection<StaffDocument>("staff")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return records.map(serializeStaff);
}

export async function countActiveSuperAdmins(excludeStaffId?: string) {
  const db = await getFirestoreMongoDb();
  return db.collection<StaffDocument>("staff").countDocuments({
    role: "super_admin",
    status: "active",
    ...(excludeStaffId ? { _id: { $ne: excludeStaffId } } : {}),
  });
}

export async function createStaff(params: {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  permissions?: StaffPermission[];
  status?: StaffStatus;
}) {
  const db = await getFirestoreMongoDb();
  const email = normalizeEmail(params.email);
  const existingStaff = await db
    .collection<StaffDocument>("staff")
    .findOne({ _id: email });
  if (existingStaff) return { error: "staff_exists" as const };

  const existingUser = await db
    .collection<UserDocument>("users")
    .findOne({ _id: email });
  const now = new Date();
  const password = await bcrypt.hash(params.password, 10);
  const permissions =
    params.permissions && params.permissions.length > 0
      ? normalizePermissions(params.permissions)
      : getDefaultPermissions(params.role);
  const status = params.status || "active";

  if (existingUser && existingUser.role !== "admin") {
    return { error: "email_in_use" as const };
  }

  await db.collection<UserDocument>("users").updateOne(
    { _id: email },
    {
      $set: {
        email,
        name: params.name,
        password,
        role: "admin",
        accountType: "admin",
        isActive: status === "active",
        updatedAt: now,
      },
      $setOnInsert: {
        avatar: "",
        phone: "",
        nationality: "",
        supplierScope: null,
        agencyId: null,
        agencyRole: null,
        hotelPartnerId: null,
        hotelRole: null,
        preferences: {
          currency: "USD",
          language: "en",
          emailNotifications: true,
          priceAlerts: false,
          newsletter: false,
          theme: "system",
        },
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await db.collection<StaffDocument>("staff").insertOne({
    _id: email,
    staffId: email,
    userId: email,
    name: params.name,
    email,
    role: params.role,
    permissions,
    status,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  });

  return {
    staff: serializeStaff(
      (await db
        .collection<StaffDocument>("staff")
        .findOne({ _id: email }))!,
    ),
  };
}

export async function updateStaff(
  staffId: string,
  updates: {
    name?: string;
    role?: StaffRole;
    permissions?: StaffPermission[];
    status?: StaffStatus;
  },
) {
  const db = await getFirestoreMongoDb();
  const current = await db
    .collection<StaffDocument>("staff")
    .findOne({ _id: staffId });
  if (!current) return null;

  const now = new Date();
  const $set: Record<string, unknown> = { updatedAt: now };
  if (updates.name !== undefined) $set.name = updates.name;
  if (updates.role !== undefined) $set.role = updates.role;
  if (updates.permissions !== undefined) {
    $set.permissions = normalizePermissions(updates.permissions);
  }
  if (updates.status !== undefined) $set.status = updates.status;

  await db
    .collection<StaffDocument>("staff")
    .updateOne({ _id: staffId }, { $set });
  await db.collection<UserDocument>("users").updateOne(
    { _id: String(current.userId || staffId) },
    {
      $set: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.status !== undefined
          ? { isActive: updates.status === "active" }
          : {}),
        role: "admin",
        accountType: "admin",
        updatedAt: now,
      },
    },
  );

  const updated = await db
    .collection<StaffDocument>("staff")
    .findOne({ _id: staffId });
  return updated ? serializeStaff(updated) : null;
}

export async function updateStaffLastLogin(userId: string, date: Date) {
  const db = await getFirestoreMongoDb();
  await db.collection<StaffDocument>("staff").updateOne(
    { userId },
    { $set: { lastLoginAt: date, updatedAt: date } },
  );
}
