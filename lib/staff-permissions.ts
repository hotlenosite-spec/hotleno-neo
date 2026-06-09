import type { NextRequest } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-user";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import type { Document } from "mongodb";

export const STAFF_ROLES = [
  "super_admin",
  "admin",
  "support",
  "finance",
  "sales",
  "content_manager",
] as const;

export const STAFF_PERMISSIONS = [
  "dashboard.view",
  "bookings.view",
  "bookings.manage",
  "payments.view",
  "payments.manage",
  "support.view",
  "support.manage",
  "customers.view",
  "customers.manage",
  "agencies.view",
  "agencies.manage",
  "suppliers.view",
  "suppliers.manage",
  "pricing.view",
  "pricing.manage",
  "reports.view",
  "users.view",
  "users.manage",
  "settings.view",
  "settings.manage",
  "logs.view",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];
export type StaffStatus = "active" | "suspended";

export type StaffRecord = {
  staffId: string;
  userId: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: StaffPermission[];
  status: StaffStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
};

type StaffDocument = Document & { _id: string };

const rolePermissions: Record<StaffRole, StaffPermission[]> = {
  super_admin: [...STAFF_PERMISSIONS],
  admin: [...STAFF_PERMISSIONS],
  support: [
    "dashboard.view",
    "bookings.view",
    "support.view",
    "support.manage",
    "customers.view",
  ],
  finance: [
    "dashboard.view",
    "bookings.view",
    "payments.view",
    "payments.manage",
    "reports.view",
  ],
  sales: [
    "dashboard.view",
    "bookings.view",
    "customers.view",
    "agencies.view",
    "agencies.manage",
    "reports.view",
  ],
  content_manager: [
    "dashboard.view",
    "suppliers.view",
    "pricing.view",
    "pricing.manage",
  ],
};

export function getDefaultPermissions(role: StaffRole) {
  return [...rolePermissions[role]];
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && STAFF_ROLES.includes(value as StaffRole);
}

export function normalizePermissions(value: unknown): StaffPermission[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (permission): permission is StaffPermission =>
          typeof permission === "string" &&
          STAFF_PERMISSIONS.includes(permission as StaffPermission),
      ),
    ),
  );
}

function mapStaffRecord(data: Record<string, unknown>): StaffRecord {
  return {
    staffId: String(data._id || data.staffId || data.userId || ""),
    userId: String(data.userId || data._id || ""),
    name: String(data.name || ""),
    email: String(data.email || ""),
    role: isStaffRole(data.role) ? data.role : "admin",
    permissions: normalizePermissions(data.permissions),
    status: data.status === "suspended" ? "suspended" : "active",
    createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(0),
    updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(0),
    lastLoginAt: data.lastLoginAt instanceof Date ? data.lastLoginAt : null,
  };
}

export async function getStaffByUserId(userId: string) {
  const db = await getFirestoreMongoDb();
  const record = await db
    .collection<StaffDocument>("staff")
    .findOne({ userId });
  return record ? mapStaffRecord(record) : null;
}

export async function getStaffAccessForUser(
  userId: string,
  role: string,
  email: string,
) {
  if (role !== "admin") return null;
  const staff = await getStaffByUserId(userId);
  if (staff) return staff;

  return {
    staffId: userId,
    userId,
    name: email,
    email,
    role: "super_admin" as const,
    permissions: [...STAFF_PERMISSIONS],
    status: "active" as const,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    lastLoginAt: null,
  };
}

export type StaffActor = StaffRecord & {
  legacyAdmin: boolean;
};

export async function getStaffActorFromRequest(
  req: NextRequest,
): Promise<StaffActor | null> {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") return null;

  const staff = await getStaffAccessForUser(
    authUser.userId,
    authUser.role,
    authUser.email,
  );
  if (!staff || staff.status !== "active") return null;
  return {
    ...staff,
    legacyAdmin: staff.staffId === authUser.userId && staff.createdAt.getTime() === 0,
  };
}

export async function requireStaffPermission(
  req: NextRequest,
  permission: StaffPermission,
) {
  const actor = await getStaffActorFromRequest(req);
  if (!actor) return null;
  if (actor.role === "super_admin" || actor.permissions.includes(permission)) {
    return actor;
  }
  return null;
}

export function canManageStaffRole(actor: StaffActor, targetRole: StaffRole) {
  if (targetRole === "super_admin") return actor.role === "super_admin";
  return (
    actor.role === "super_admin" || actor.permissions.includes("users.manage")
  );
}
