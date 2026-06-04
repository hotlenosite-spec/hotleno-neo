import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth-user";
import {
  getSupplierSettings,
  updateSupplierSetting,
  SUPPLIER_CONTROL_NAMES,
} from "@/lib/suppliers/supplier-settings";
import type { SupplierProviderName } from "@/lib/suppliers/types";

export const runtime = "nodejs";

function isSupplierName(value: unknown): value is SupplierProviderName {
  return (
    typeof value === "string" &&
    SUPPLIER_CONTROL_NAMES.includes(value as SupplierProviderName)
  );
}

export async function GET(req: NextRequest) {
  const user = requireAdminFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const settings = await getSupplierSettings();
  return NextResponse.json({ success: true, settings });
}

export async function PATCH(req: NextRequest) {
  const user = requireAdminFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  if (!isSupplierName(body.supplier) || typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "supplier and enabled are required" },
      { status: 400 },
    );
  }

  const settings = await updateSupplierSetting({
    supplier: body.supplier,
    enabled: body.enabled,
    environment: typeof body.environment === "string" ? body.environment : undefined,
    updatedBy: user.email,
  });

  return NextResponse.json({ success: true, settings });
}
