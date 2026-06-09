import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  PRICING_MARKUP_TYPES,
  PRICING_RULE_SCOPES,
  createPricingRule,
  listPricingRules,
} from "@/lib/pricing-rules";
import { requireStaffPermission } from "@/lib/staff-permissions";

const nullableMoney = z.number().min(0).max(1_000_000).nullable().optional();
const pricingRuleSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    scope: z.enum(PRICING_RULE_SCOPES),
    supplierCode: z.string().trim().max(60).nullable().optional(),
    agencyId: z.string().trim().max(120).nullable().optional(),
    markupType: z.enum(PRICING_MARKUP_TYPES),
    markupValue: z.number().min(0).max(1_000_000),
    minProfit: nullableMoney,
    maxProfit: nullableMoney,
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

export async function GET(req: NextRequest) {
  try {
    const actor = await requireStaffPermission(req, "pricing.view");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const rules = await listPricingRules();
    return NextResponse.json(
      {
        success: true,
        rules,
        canManage:
          actor.role === "super_admin" ||
          actor.permissions.includes("pricing.manage"),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[admin/pricing] list failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json({ error: "pricing_fetch_failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireStaffPermission(req, "pricing.manage");
    if (!actor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const validation = pricingRuleSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: "invalid_pricing_rule" }, { status: 400 });
    }
    const rule = await createPricingRule(validation.data, actor.email);
    return NextResponse.json({ success: true, rule }, { status: 201 });
  } catch (error) {
    console.error(
      "[admin/pricing] create failed:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json({ error: "pricing_create_failed" }, { status: 500 });
  }
}
