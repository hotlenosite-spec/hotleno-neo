import { NextRequest, NextResponse } from "next/server";
import { markAdminNotificationRead } from "@/lib/admin-notifications";
import { requireStaffPermission } from "@/lib/staff-permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireStaffPermission(req, "dashboard.view");
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const notification = await markAdminNotificationRead(actor, id);
    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error(
      "[admin/notifications/:id] update failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 },
    );
  }
}
