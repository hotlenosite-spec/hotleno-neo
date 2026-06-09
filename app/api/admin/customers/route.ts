import { NextRequest, NextResponse } from "next/server";
import { listAdminCustomers } from "@/lib/admin-customers";
import { requireStaffPermission } from "@/lib/staff-permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const actor = await requireStaffPermission(request, "customers.view");
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const params = request.nextUrl.searchParams;
    const result = await listAdminCustomers({
      search: params.get("search") || "",
      customerType: (params.get("customerType") || "all") as "normal" | "vip" | "all",
      status: (params.get("status") || "all") as "active" | "blocked" | "all",
      page: Number(params.get("page") || 1),
      limit: Number(params.get("limit") || 20),
    });

    return NextResponse.json({
      ...result,
      canManage: actor.role === "super_admin" || actor.permissions.includes("customers.manage"),
    });
  } catch (error) {
    console.error("[Admin Customers API] Unable to list customers", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ error: "Unable to load customers" }, { status: 500 });
  }
}
