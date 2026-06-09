import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  STAFF_PERMISSIONS,
  STAFF_ROLES,
  canManageStaffRole,
  getStaffByUserId,
  normalizePermissions,
  requireStaffPermission,
} from "@/lib/staff-permissions";
import { countActiveSuperAdmins, updateStaff } from "@/lib/staff-store";

const updateStaffSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    role: z.enum(STAFF_ROLES).optional(),
    permissions: z.array(z.enum(STAFF_PERMISSIONS)).optional(),
    status: z.enum(["active", "suspended"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const actor = await requireStaffPermission(req, "users.manage");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { staffId } = await params;
    const target = await getStaffByUserId(decodeURIComponent(staffId));
    if (!target) {
      return NextResponse.json({ error: "staff_not_found" }, { status: 404 });
    }

    if (!canManageStaffRole(actor, target.role)) {
      return NextResponse.json(
        { error: "super_admin_management_forbidden" },
        { status: 403 },
      );
    }

    const validation = updateStaffSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: "invalid_staff_data" }, { status: 400 });
    }

    const updates = validation.data;
    if (
      updates.role === "super_admin" &&
      !canManageStaffRole(actor, "super_admin")
    ) {
      return NextResponse.json(
        { error: "super_admin_management_forbidden" },
        { status: 403 },
      );
    }

    const removesActiveSuperAdmin =
      target.role === "super_admin" &&
      target.status === "active" &&
      (updates.role !== undefined && updates.role !== "super_admin" ||
        updates.status === "suspended");

    if (removesActiveSuperAdmin) {
      const remaining = await countActiveSuperAdmins(target.staffId);
      if (remaining === 0) {
        return NextResponse.json(
          { error: "last_super_admin_required" },
          { status: 409 },
        );
      }
    }

    const staff = await updateStaff(target.staffId, {
      ...updates,
      permissions:
        updates.permissions !== undefined
          ? normalizePermissions(updates.permissions)
          : undefined,
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error(
      "[api/admin/staff/:staffId] PATCH failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json(
      { error: "staff_update_failed" },
      { status: 500 },
    );
  }
}
