import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminCustomerDetail, updateAdminCustomer } from "@/lib/admin-customers";
import { requireStaffPermission } from "@/lib/staff-permissions";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    customerType: z.enum(["normal", "vip"]).optional(),
    status: z.enum(["active", "blocked"]).optional(),
    internalNotes: z.string().max(4000).optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ customerId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await requireStaffPermission(request, "customers.view");
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const { customerId } = await context.params;
    const detail = await getAdminCustomerDetail(decodeURIComponent(customerId));
    if (!detail) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({
      ...detail,
      canManage: actor.role === "super_admin" || actor.permissions.includes("customers.manage"),
    });
  } catch (error) {
    console.error("[Admin Customer API] Unable to load customer", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ error: "Unable to load customer" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const actor = await requireStaffPermission(request, "customers.manage");
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const body = updateSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid customer update" }, { status: 400 });
    }

    const { customerId } = await context.params;
    const detail = await updateAdminCustomer(
      decodeURIComponent(customerId),
      body.data,
      actor.email || actor.userId,
    );
    if (!detail) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ ...detail, canManage: true });
  } catch (error) {
    console.error("[Admin Customer API] Unable to update customer", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ error: "Unable to update customer" }, { status: 500 });
  }
}
