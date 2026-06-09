import { NextRequest, NextResponse } from "next/server";
import {
  disableAgencyApiKey,
  generateAgencyApiKey,
} from "@/lib/agency-admin-store";
import { requireStaffPermission } from "@/lib/staff-permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> },
) {
  try {
    const actor = await requireStaffPermission(req, "agencies.manage");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { agencyId } = await params;
    const result = await generateAgencyApiKey(
      decodeURIComponent(agencyId),
      actor.email,
    );
    if (!result) {
      return NextResponse.json({ error: "agency_not_found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    console.error(
      "[admin/agencies/:agencyId/api-key] create failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json({ error: "api_key_create_failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> },
) {
  try {
    const actor = await requireStaffPermission(req, "agencies.manage");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { agencyId } = await params;
    const disabled = await disableAgencyApiKey(
      decodeURIComponent(agencyId),
      actor.email,
    );
    if (!disabled) {
      return NextResponse.json({ error: "agency_not_found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "[admin/agencies/:agencyId/api-key] disable failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json({ error: "api_key_disable_failed" }, { status: 500 });
  }
}
