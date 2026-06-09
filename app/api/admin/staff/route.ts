import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  STAFF_PERMISSIONS,
  STAFF_ROLES,
  canManageStaffRole,
  getDefaultPermissions,
  normalizePermissions,
  requireStaffPermission,
} from "@/lib/staff-permissions";
import { createStaff, listStaff } from "@/lib/staff-store";

const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(10).max(128),
  role: z.enum(STAFF_ROLES),
  permissions: z.array(z.enum(STAFF_PERMISSIONS)).optional(),
  status: z.enum(["active", "suspended"]).default("active"),
});

export async function GET(req: NextRequest) {
  try {
    const actor = await requireStaffPermission(req, "users.view");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const staff = await listStaff();
    return NextResponse.json({
      staff,
      actor: {
        role: actor.role,
        permissions: actor.permissions,
        legacyAdmin: actor.legacyAdmin,
      },
      roles: STAFF_ROLES,
      permissions: STAFF_PERMISSIONS,
      roleDefaults: Object.fromEntries(
        STAFF_ROLES.map((role) => [role, getDefaultPermissions(role)]),
      ),
    });
  } catch (error) {
    console.error(
      "[api/admin/staff] GET failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json(
      { error: "staff_fetch_failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireStaffPermission(req, "users.manage");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const validation = createStaffSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: "invalid_staff_data" }, { status: 400 });
    }

    const data = validation.data;
    if (!canManageStaffRole(actor, data.role)) {
      return NextResponse.json(
        { error: "super_admin_management_forbidden" },
        { status: 403 },
      );
    }

    const permissions =
      data.permissions && data.permissions.length > 0
        ? normalizePermissions(data.permissions)
        : getDefaultPermissions(data.role);
    const result = await createStaff({ ...data, permissions });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "staff_exists" ? 409 : 400 },
      );
    }

    return NextResponse.json({ staff: result.staff }, { status: 201 });
  } catch (error) {
    console.error(
      "[api/admin/staff] POST failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json(
      { error: "staff_create_failed" },
      { status: 500 },
    );
  }
}
