import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { requireStaffPermission } from "@/lib/staff-permissions";

type StringIdDocument = Document & { _id: string };

const AGENCY_LEDGER_TYPES = ["credit", "debit", "payment", "refund", "adjustment"] as const;
const AGENCY_LEDGER_STATUSES = ["pending", "posted", "void", "cancelled"] as const;

function isAllowed(value: string, allowed: readonly string[]) {
  return allowed.includes(value);
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireStaffPermission(req, "agencies.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get("agencyId");
    const bookingId = searchParams.get("bookingId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    if (!agencyId) {
      return NextResponse.json({ error: "Valid agencyId is required" }, { status: 400 });
    }
    if (type && !isAllowed(type, AGENCY_LEDGER_TYPES)) {
      return NextResponse.json({ error: "Invalid ledger type" }, { status: 400 });
    }
    if (status && !isAllowed(status, AGENCY_LEDGER_STATUSES)) {
      return NextResponse.json({ error: "Invalid ledger status" }, { status: 400 });
    }

    const db = await getFirestoreMongoDb();
    const allLedger = (await db
      .collection<StringIdDocument>("agency_ledger")
      .find({ agencyId })
      .sort({ createdAt: -1 })
      .toArray()) as Record<string, unknown>[];
    const filteredLedger = allLedger.filter((entry) => {
      if (bookingId && String(entry.bookingId ?? "") !== bookingId) return false;
      if (type && String(entry.type ?? "") !== type) return false;
      if (status && String(entry.status ?? "") !== status) return false;
      return true;
    });
    const skip = (page - 1) * limit;
    const ledger = filteredLedger.slice(skip, skip + limit);

    console.info("[admin/agencies/ledger] collection=agency_ledger count=%d", filteredLedger.length);

    return NextResponse.json({
      ledger,
      pagination: {
        page,
        limit,
        total: filteredLedger.length,
        pages: Math.ceil(filteredLedger.length / limit),
      },
    });
  } catch (error) {
    console.error(
      "[admin/agencies/ledger] fetch failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Failed to fetch agency ledger" }, { status: 500 });
  }
}
