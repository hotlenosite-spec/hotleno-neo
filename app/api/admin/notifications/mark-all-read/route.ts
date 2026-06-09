import { NextRequest, NextResponse } from "next/server";
import { markAllAdminNotificationsRead } from "@/lib/admin-notifications";
import { requireStaffPermission } from "@/lib/staff-permissions";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireStaffPermission(req, "dashboard.view");
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedCount = await markAllAdminNotificationsRead(actor);
    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error(
      "[admin/notifications/mark-all-read] update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 },
    );
  }
}
