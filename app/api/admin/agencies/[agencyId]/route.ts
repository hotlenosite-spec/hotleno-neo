import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AGENCY_STATUSES,
  getAgencyDetail,
  updateAgency,
} from "@/lib/agency-admin-store";
import { requireStaffPermission } from "@/lib/staff-permissions";

const agencySchema = z.object({
  name: z.string().trim().min(2).max(200),
  commercialName: z.string().trim().max(200).nullable().optional(),
  country: z.string().trim().min(2).max(100),
  city: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().min(5).max(50),
  email: z.string().trim().email(),
  status: z.enum(AGENCY_STATUSES),
  commissionRate: z.number().min(0).max(100),
  markupRate: z.number().min(0).max(100),
  creditLimit: z.number().min(0).max(1_000_000_000),
  walletBalance: z.number().min(-1_000_000_000).max(1_000_000_000),
  currency: z.string().trim().length(3),
  apiEnabled: z.boolean(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> },
) {
  try {
    const actor = await requireStaffPermission(req, "agencies.view");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { agencyId } = await params;
    const detail = await getAgencyDetail(decodeURIComponent(agencyId));
    if (!detail) {
      return NextResponse.json({ error: "agency_not_found" }, { status: 404 });
    }
    return NextResponse.json(
      {
        success: true,
        ...detail,
        canManage:
          actor.role === "super_admin" ||
          actor.permissions.includes("agencies.manage"),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[admin/agencies/:agencyId] detail failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json({ error: "agency_fetch_failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> },
) {
  try {
    const actor = await requireStaffPermission(req, "agencies.manage");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const validation = agencySchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: "invalid_agency" }, { status: 400 });
    }
    const { agencyId } = await params;
    const agency = await updateAgency(
      decodeURIComponent(agencyId),
      validation.data,
      actor.email,
    );
    if (!agency) {
      return NextResponse.json({ error: "agency_not_found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, agency });
  } catch (error) {
    console.error(
      "[admin/agencies/:agencyId] update failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json({ error: "agency_update_failed" }, { status: 500 });
  }
}
