import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";

export const AGENCY_STATUSES = [
  "pending",
  "active",
  "suspended",
  "rejected",
] as const;
export const AGENCY_STAFF_ROLES = [
  "owner",
  "manager",
  "agent",
  "accountant",
] as const;
export const AGENCY_STAFF_STATUSES = ["active", "suspended"] as const;

export type AgencyStatus = (typeof AGENCY_STATUSES)[number];
export type AgencyStaffRole = (typeof AGENCY_STAFF_ROLES)[number];
export type AgencyStaffStatus = (typeof AGENCY_STAFF_STATUSES)[number];

export type AgencyDocument = Document & {
  _id: string;
  id?: string;
  name: string;
  commercialName?: string | null;
  country: string;
  city?: string | null;
  phone: string;
  email: string;
  status: AgencyStatus;
  commissionRate: number;
  markupRate: number;
  creditLimit: number;
  walletBalance?: number;
  balance?: number;
  currency: string;
  apiEnabled: boolean;
  apiKeyPrefix?: string | null;
  apiKeyHash?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AgencyStaffDocument = Document & {
  _id: string;
  id: string;
  agencyId: string;
  name: string;
  email: string;
  role: AgencyStaffRole;
  status: AgencyStaffStatus;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AgencyInput = {
  name: string;
  commercialName?: string | null;
  country: string;
  city?: string | null;
  phone: string;
  email: string;
  status: AgencyStatus;
  commissionRate: number;
  markupRate: number;
  creditLimit: number;
  walletBalance: number;
  currency: string;
  apiEnabled: boolean;
  notes?: string | null;
};

export type AgencyStaffInput = {
  name: string;
  email: string;
  role: AgencyStaffRole;
  status: AgencyStaffStatus;
  permissions: string[];
};

function clean(value: unknown, maximum: number) {
  return String(value || "").trim().slice(0, maximum);
}

function money(value: unknown, minimum = 0, maximum = 1_000_000_000) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(Math.min(Math.max(number, minimum), maximum).toFixed(2));
}

function serializeAgency(agency: AgencyDocument) {
  return {
    id: agency.id || agency._id,
    name: agency.name,
    commercialName: agency.commercialName || "",
    country: agency.country || "",
    city: agency.city || "",
    phone: agency.phone || "",
    email: agency.email || "",
    status: agency.status || "pending",
    commissionRate: money(agency.commissionRate, 0, 100),
    markupRate: money(agency.markupRate, 0, 100),
    creditLimit: money(agency.creditLimit),
    walletBalance: money(agency.walletBalance ?? agency.balance, -1_000_000_000),
    currency: clean(agency.currency || "USD", 3).toUpperCase(),
    apiEnabled: Boolean(agency.apiEnabled),
    apiKeyPrefix: agency.apiKeyPrefix || null,
    hasApiKey: Boolean(agency.apiKeyHash),
    notes: agency.notes || "",
    createdAt: agency.createdAt,
    updatedAt: agency.updatedAt,
  };
}

function serializeAgencyStaff(staff: AgencyStaffDocument) {
  return {
    id: staff.id || staff._id,
    agencyId: staff.agencyId,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    status: staff.status,
    permissions: Array.isArray(staff.permissions) ? staff.permissions : [],
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
  };
}

export async function listAgencies(params: {
  search?: string;
  status?: AgencyStatus | "";
  page?: number;
  limit?: number;
}) {
  const db = await getFirestoreMongoDb();
  const all = await db
    .collection<AgencyDocument>("agencies")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  const search = clean(params.search, 200).toLowerCase();
  const filtered = all
    .filter((agency) => agency._id !== "_meta")
    .filter((agency) => !params.status || agency.status === params.status)
    .filter((agency) => {
      if (!search) return true;
      return [
        agency.name,
        agency.commercialName,
        agency.email,
        agency.phone,
        agency.country,
        agency.city,
      ].some((value) => String(value || "").toLowerCase().includes(search));
    });
  const page = Math.max(params.page || 1, 1);
  const limit = Math.min(Math.max(params.limit || 20, 1), 100);
  const start = (page - 1) * limit;
  return {
    agencies: filtered.slice(start, start + limit).map(serializeAgency),
    pagination: {
      page,
      limit,
      total: filtered.length,
      pages: Math.max(1, Math.ceil(filtered.length / limit)),
    },
  };
}

export async function getAgency(agencyId: string) {
  const db = await getFirestoreMongoDb();
  const agency = await db
    .collection<AgencyDocument>("agencies")
    .findOne({ _id: agencyId });
  return agency ? serializeAgency(agency) : null;
}

export async function createAgency(input: AgencyInput, actorEmail: string) {
  const db = await getFirestoreMongoDb();
  const now = new Date();
  const id = `agency-${randomUUID()}`;
  const walletBalance = money(input.walletBalance, -1_000_000_000);
  const agency: AgencyDocument = {
    _id: id,
    id,
    name: clean(input.name, 200),
    commercialName: clean(input.commercialName, 200) || null,
    country: clean(input.country, 100),
    city: clean(input.city, 100) || null,
    phone: clean(input.phone, 50),
    email: clean(input.email, 254).toLowerCase(),
    status: input.status,
    commissionRate: money(input.commissionRate, 0, 100),
    markupRate: money(input.markupRate, 0, 100),
    creditLimit: money(input.creditLimit),
    walletBalance,
    balance: walletBalance,
    currency: clean(input.currency || "USD", 3).toUpperCase(),
    apiEnabled: Boolean(input.apiEnabled),
    apiKeyPrefix: null,
    apiKeyHash: null,
    notes: clean(input.notes, 5_000) || null,
    createdAt: now,
    updatedAt: now,
    createdBy: actorEmail,
    updatedBy: actorEmail,
  };
  await db.collection<AgencyDocument>("agencies").insertOne(agency);
  return serializeAgency(agency);
}

export async function updateAgency(
  agencyId: string,
  input: AgencyInput,
  actorEmail: string,
) {
  const db = await getFirestoreMongoDb();
  const collection = db.collection<AgencyDocument>("agencies");
  const current = await collection.findOne({ _id: agencyId });
  if (!current) return null;
  const walletBalance = money(input.walletBalance, -1_000_000_000);
  const result = await collection.updateOne(
    { _id: agencyId },
    {
      $set: {
        name: clean(input.name, 200),
        commercialName: clean(input.commercialName, 200) || null,
        country: clean(input.country, 100),
        city: clean(input.city, 100) || null,
        phone: clean(input.phone, 50),
        email: clean(input.email, 254).toLowerCase(),
        status: input.status,
        commissionRate: money(input.commissionRate, 0, 100),
        markupRate: money(input.markupRate, 0, 100),
        creditLimit: money(input.creditLimit),
        walletBalance,
        balance: walletBalance,
        currency: clean(input.currency || "USD", 3).toUpperCase(),
        apiEnabled: Boolean(input.apiEnabled && current.apiKeyHash),
        notes: clean(input.notes, 5_000) || null,
        updatedAt: new Date(),
        updatedBy: actorEmail,
      },
    },
  );
  if (result.matchedCount === 0) return null;
  return getAgency(agencyId);
}

export async function getAgencyDetail(agencyId: string) {
  const db = await getFirestoreMongoDb();
  const [agency, staff, bookings] = await Promise.all([
    getAgency(agencyId),
    db
      .collection<AgencyStaffDocument>("agency_staff")
      .find({ agencyId })
      .sort({ createdAt: 1 })
      .toArray(),
    db
      .collection<Document & { _id: string }>("bookings")
      .find({ agencyId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray(),
  ]);
  if (!agency) return null;
  return {
    agency,
    staff: staff.map(serializeAgencyStaff),
    bookings: bookings.map((booking) => ({
      id: booking._id,
      bookingReference: String(booking.bookingReference || booking._id),
      customerEmail: String(booking.customerEmail || ""),
      hotelName: String(booking.hotelName || ""),
      status: String(booking.bookingStatus || booking.status || ""),
      totalPrice: money(booking.totalPrice, -1_000_000_000),
      currency: String(booking.currency || agency.currency),
      createdAt: booking.createdAt || null,
    })),
  };
}

export async function createAgencyStaff(
  agencyId: string,
  input: AgencyStaffInput,
  actorEmail: string,
) {
  const db = await getFirestoreMongoDb();
  const agency = await db
    .collection<AgencyDocument>("agencies")
    .findOne({ _id: agencyId });
  if (!agency) return { error: "agency_not_found" as const };
  const email = clean(input.email, 254).toLowerCase();
  const collection =
    db.collection<AgencyStaffDocument>("agency_staff");
  if (await collection.findOne({ agencyId, email })) {
    return { error: "agency_staff_exists" as const };
  }
  const now = new Date();
  const id = `agency-staff-${randomUUID()}`;
  const staff: AgencyStaffDocument = {
    _id: id,
    id,
    agencyId,
    name: clean(input.name, 120),
    email,
    role: input.role,
    status: input.status,
    permissions: Array.from(new Set(input.permissions.map((item) => clean(item, 100)))),
    createdAt: now,
    updatedAt: now,
    createdBy: actorEmail,
    updatedBy: actorEmail,
  };
  await collection.insertOne(staff);
  return { staff: serializeAgencyStaff(staff) };
}

export async function updateAgencyStaff(
  agencyId: string,
  staffId: string,
  input: AgencyStaffInput,
  actorEmail: string,
) {
  const db = await getFirestoreMongoDb();
  const email = clean(input.email, 254).toLowerCase();
  const collection =
    db.collection<AgencyStaffDocument>("agency_staff");
  const duplicate = await collection.findOne({
    agencyId,
    email,
    _id: { $ne: staffId },
  });
  if (duplicate) return { error: "agency_staff_exists" as const };
  const result = await collection.updateOne(
    { _id: staffId, agencyId },
    {
      $set: {
        name: clean(input.name, 120),
        email,
        role: input.role,
        status: input.status,
        permissions: Array.from(
          new Set(input.permissions.map((item) => clean(item, 100))),
        ),
        updatedAt: new Date(),
        updatedBy: actorEmail,
      },
    },
  );
  if (result.matchedCount === 0) {
    return { error: "agency_staff_not_found" as const };
  }
  const staff = await collection.findOne({ _id: staffId, agencyId });
  return staff
    ? { staff: serializeAgencyStaff(staff) }
    : { error: "agency_staff_not_found" as const };
}

export async function generateAgencyApiKey(
  agencyId: string,
  actorEmail: string,
) {
  const db = await getFirestoreMongoDb();
  const rawSecret = randomBytes(32).toString("base64url");
  const apiKey = `hotleno_agency_${rawSecret}`;
  const prefix = apiKey.slice(0, 22);
  const hash = createHash("sha256").update(apiKey).digest("hex");
  const result = await db.collection<AgencyDocument>("agencies").updateOne(
    { _id: agencyId },
    {
      $set: {
        apiEnabled: true,
        apiKeyPrefix: prefix,
        apiKeyHash: hash,
        updatedAt: new Date(),
        updatedBy: actorEmail,
      },
    },
  );
  if (result.matchedCount === 0) return null;
  return { apiKey, apiKeyPrefix: prefix };
}

export async function disableAgencyApiKey(
  agencyId: string,
  actorEmail: string,
) {
  const db = await getFirestoreMongoDb();
  const result = await db.collection<AgencyDocument>("agencies").updateOne(
    { _id: agencyId },
    {
      $set: {
        apiEnabled: false,
        updatedAt: new Date(),
        updatedBy: actorEmail,
      },
    },
  );
  return result.matchedCount > 0;
}
