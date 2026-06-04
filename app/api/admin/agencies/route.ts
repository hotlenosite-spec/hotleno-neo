import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { z } from "zod";
import { verifyToken } from "@/lib/jwt";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { createLog, getUserById } from "@/lib/firebase-store";

type StringIdDocument = Document & { _id: string };

const AGENCY_STATUSES = ["pending", "active", "suspended", "rejected"] as const;
const AGENCY_ROLES = ["owner", "manager", "agent", "accountant"] as const;
const agencyStatusSchema = z.enum(AGENCY_STATUSES);
const agencyRoleSchema = z.enum(AGENCY_ROLES);

const agencyPayloadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  commercialName: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().or(z.literal("")).optional(),
  status: agencyStatusSchema.optional(),
  commissionRate: z.number().min(0).optional(),
  markupRate: z.number().min(0).optional(),
  creditLimit: z.number().min(0).optional(),
  balance: z.number().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const createAgencySchema = agencyPayloadSchema.extend({
  name: z.string().min(1).max(200),
});

function getAgencyUserRole(agencyRole: z.infer<typeof agencyRoleSchema>) {
  switch (agencyRole) {
    case "owner":
      return "agency_owner";
    case "manager":
      return "agency_manager";
    case "agent":
      return "agency_agent";
    case "accountant":
      return "agency_accountant";
  }
}

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: "No token provided", status: 401 } as const;

  const decoded = verifyToken(token);
  const user = await getUserById(decoded.userId);
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized - Admin access required", status: 403 } as const;
  }

  return { user };
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function matchesAgencyFilters(agency: Record<string, unknown>, searchParams: URLSearchParams) {
  const status = searchParams.get("status");
  const city = searchParams.get("city")?.toLowerCase();
  const country = searchParams.get("country")?.toLowerCase();
  const search = searchParams.get("search")?.toLowerCase();
  if (status && String(agency.status ?? "") !== status) return false;
  if (city && !String(agency.city ?? "").toLowerCase().includes(city)) return false;
  if (country && !String(agency.country ?? "").toLowerCase().includes(country)) return false;
  if (search) {
    const searchable = [
      agency.name,
      agency.commercialName,
      agency.email,
      agency.phone,
    ].map((value) => String(value ?? "").toLowerCase());
    if (!searchable.some((value) => value.includes(search))) return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const db = await getFirestoreMongoDb();
    const allAgencies = (await db
      .collection<StringIdDocument>("agencies")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()) as Record<string, unknown>[];
    const filteredAgencies = allAgencies
      .filter((agency) => agency._id !== "_meta")
      .filter((agency) => matchesAgencyFilters(agency, searchParams));
    const skip = (page - 1) * limit;
    const agencies = filteredAgencies.slice(skip, skip + limit);

    console.info("[admin/agencies] collection=agencies count=%d", filteredAgencies.length);

    return NextResponse.json({
      agencies,
      pagination: {
        page,
        limit,
        total: filteredAgencies.length,
        pages: Math.ceil(filteredAgencies.length / limit),
      },
    });
  } catch (error) {
    console.error(
      "[admin/agencies] fetch failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to fetch agencies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const validation = createAgencySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 },
      );
    }

    const now = new Date();
    const agency = {
      _id: makeId("agency"),
      ...validation.data,
      status: validation.data.status ?? "pending",
      balance: 0,
      currency: validation.data.currency ?? "USD",
      createdAt: now,
      updatedAt: now,
    };
    const db = await getFirestoreMongoDb();
    await db.collection<StringIdDocument>("agencies").insertOne(agency);
    await createLog({
      type: "admin_agency_created",
      status: "success",
      message: "Admin created B2B agency",
      request: { agencyId: agency._id, status: agency.status },
      response: { agencyId: agency._id },
    });

    console.info("[admin/agencies] collection=agencies created=1");
    return NextResponse.json({ success: true, agency }, { status: 201 });
  } catch (error) {
    console.error(
      "[admin/agencies] create failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to create agency" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const agencyId = typeof body.agencyId === "string" ? body.agencyId : "";
    const db = await getFirestoreMongoDb();
    const agencies = db.collection<StringIdDocument>("agencies");
    const agency = agencyId ? await agencies.findOne({ _id: agencyId }) : null;
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    if (body.action === "link_user") {
      const roleValidation = agencyRoleSchema.safeParse(body.agencyRole);
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId || !roleValidation.success) {
        return NextResponse.json({ error: "Valid userId and agencyRole are required" }, { status: 400 });
      }

      await db.collection<StringIdDocument>("users").updateOne(
        { _id: userId },
        {
          $set: {
            agencyId,
            agencyRole: roleValidation.data,
            accountType: "b2b",
            role: getAgencyUserRole(roleValidation.data),
            updatedAt: new Date(),
          },
        },
      );
      const user = await db.collection<StringIdDocument>("users").findOne({ _id: userId });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      await createLog({
        type: "admin_agency_user_linked",
        status: "success",
        message: "Admin linked user to B2B agency",
        request: { agencyId, userId, agencyRole: roleValidation.data },
      });
      return NextResponse.json({ success: true, user });
    }

    const update =
      body.action === "change_status"
        ? { status: agencyStatusSchema.parse(body.status) }
        : Object.fromEntries(
            Object.entries(agencyPayloadSchema.parse(body)).filter(
              ([key, value]) => key !== "balance" && value !== undefined,
            ),
          );
    await agencies.updateOne({ _id: agencyId }, { $set: { ...update, updatedAt: new Date() } });
    const updatedAgency = await agencies.findOne({ _id: agencyId });
    await createLog({
      type: "admin_agency_updated",
      status: "success",
      message: "Admin updated B2B agency",
      request: { agencyId, fields: Object.keys(update) },
      response: { agencyId },
    });

    console.info("[admin/agencies] collection=agencies updated=1");
    return NextResponse.json({ success: true, agency: updatedAgency });
  } catch (error) {
    console.error(
      "[admin/agencies] update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to update agency" }, { status: 500 });
  }
}
