import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  PRICING_MARKUP_TYPES,
  PRICING_RULE_SCOPES,
  archivePricingRule,
  updatePricingRule,
} from "@/lib/pricing-rules";
import { requireStaffPermission } from "@/lib/staff-permissions";

const pricingRuleSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    scope: z.enum(PRICING_RULE_SCOPES),
    supplierCode: z.string().trim().max(60).nullable().optional(),
    agencyId: z.string().trim().max(120).nullable().optional(),
    markupType: z.enum(PRICING_MARKUP_TYPES),
    markupValue: z.number().min(0).max(1_000_000),
    minProfit: z.number().min(0).max(1_000_000).nullable().optional(),
    maxProfit: z.number().min(0).max(1_000_000).nullable().optional(),
    enabled: z.boolean(),
    priority: z.number().int().min(1).max(1000),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.scope === "supplier" && !value.supplierCode) {
      context.addIssue({ code: "custom", path: ["supplierCode"] });
    }
    if (value.scope === "agency" && !value.agencyId) {
      context.addIssue({ code: "custom", path: ["agencyId"] });
    }
    if (
      value.minProfit !== null &&
      value.minProfit !== undefined &&
      value.maxProfit !== null &&
      value.maxProfit !== undefined &&
      value.minProfit > value.maxProfit
    ) {
      context.addIssue({ code: "custom", path: ["maxProfit"] });
    }
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireStaffPermission(req, "pricing.manage");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const validation = pricingRuleSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: "invalid_pricing_rule" }, { status: 400 });
    }
    const { id } = await params;
    const rule = await updatePricingRule(
      decodeURIComponent(id),
      validation.data,
      actor.email,
    );
    if (!rule) {
      return NextResponse.json({ error: "pricing_rule_not_found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error(
      "[admin/pricing/:id] update failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json({ error: "pricing_update_failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireStaffPermission(req, "pricing.manage");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const archived = await archivePricingRule(
      decodeURIComponent(id),
      actor.email,
    );
    if (!archived) {
      return NextResponse.json({ error: "pricing_rule_not_found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "[admin/pricing/:id] archive failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json({ error: "pricing_archive_failed" }, { status: 500 });
  }
}
