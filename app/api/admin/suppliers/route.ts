import { NextRequest, NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/staff-permissions";
import {
  getAdminSupplierSettings,
  isAdminSupplierCode,
  isAdminSupplierStatus,
  updateAdminSupplierSetting,
} from "@/lib/admin-supplier-settings";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireStaffPermission(req, "suppliers.view");
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await getAdminSupplierSettings();
    const canManage =
      user.role === "super_admin" ||
      user.permissions.includes("suppliers.manage");

    return NextResponse.json(
      { success: true, settings, canManage },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[admin/suppliers] list failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to fetch supplier settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireStaffPermission(req, "suppliers.manage");
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    if (!isAdminSupplierCode(body.supplierCode)) {
      return NextResponse.json(
        { error: "Invalid supplier code" },
        { status: 400 },
      );
    }
    if (body.status !== undefined && !isAdminSupplierStatus(body.status)) {
      return NextResponse.json(
        { error: "Invalid supplier status" },
        { status: 400 },
      );
    }

    const settings = await updateAdminSupplierSetting({
      supplierCode: body.supplierCode,
      displayName:
        typeof body.displayName === "string" ? body.displayName : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      searchEnabled:
        typeof body.searchEnabled === "boolean"
          ? body.searchEnabled
          : undefined,
      bookingEnabled:
        typeof body.bookingEnabled === "boolean"
          ? body.bookingEnabled
          : undefined,
      priority:
        typeof body.priority === "number" ? body.priority : undefined,
      timeoutMs:
        typeof body.timeoutMs === "number" ? body.timeoutMs : undefined,
      markupPercent:
        typeof body.markupPercent === "number"
          ? body.markupPercent
          : undefined,
      status: body.status,
      notes:
        body.notes === null || typeof body.notes === "string"
          ? body.notes
          : undefined,
      updatedBy: user.email,
    });

    return NextResponse.json({ success: true, settings, canManage: true });
  } catch (error) {
    console.error(
      "[admin/suppliers] update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to update supplier settings" },
      { status: 500 },
    );
  }
}
