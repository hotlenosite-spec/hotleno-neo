import { NextRequest, NextResponse } from "next/server";
import { listAdminNotifications } from "@/lib/admin-notifications";
import { requireStaffPermission } from "@/lib/staff-permissions";

export async function GET(req: NextRequest) {
  try {
    const actor = await requireStaffPermission(req, "dashboard.view");
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = new URL(req.url).searchParams;
    const readParam = searchParams.get("read");
    const read =
      readParam === "read" || readParam === "unread" ? readParam : "all";
    const limit = Number(searchParams.get("limit") || 50);
    const result = await listAdminNotifications({
      actor,
      read,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[admin/notifications] list failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}
