import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AGENCY_STAFF_ROLES,
  AGENCY_STAFF_STATUSES,
  updateAgencyStaff,
} from "@/lib/agency-admin-store";
import { requireStaffPermission } from "@/lib/staff-permissions";

const staffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  role: z.enum(AGENCY_STAFF_ROLES),
  status: z.enum(AGENCY_STAFF_STATUSES),
  permissions: z.array(z.string().trim().min(1).max(100)).max(50),
});

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ agencyId: string; staffId: string }> },
) {
  try {
    const actor = await requireStaffPermission(req, "agencies.manage");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const validation = staffSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: "invalid_agency_staff" }, { status: 400 });
    }
    const { agencyId, staffId } = await params;
    const result = await updateAgencyStaff(
      decodeURIComponent(agencyId),
      decodeURIComponent(staffId),
      validation.data,
      actor.email,
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "agency_staff_not_found" ? 404 : 409 },
      );
    }
    return NextResponse.json({ success: true, staff: result.staff });
  } catch (error) {
    console.error(
      "[admin/agencies/:agencyId/staff/:staffId] update failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json(
      { error: "agency_staff_update_failed" },
      { status: 500 },
    );
  }
}
