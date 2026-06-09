import { randomUUID } from "node:crypto";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";

export const PRICING_RULE_SCOPES = [
  "global",
  "b2c",
  "b2b",
  "supplier",
  "agency",
] as const;
export const PRICING_MARKUP_TYPES = ["percentage", "fixed"] as const;

export type PricingRuleScope = (typeof PRICING_RULE_SCOPES)[number];
export type PricingMarkupType = (typeof PRICING_MARKUP_TYPES)[number];

export type PricingRuleDocument = Document & {
  _id: string;
  id: string;
  name: string;
  scope: PricingRuleScope;
  supplierCode?: string | null;
  agencyId?: string | null;
  markupType: PricingMarkupType;
  markupValue: number;
  minProfit?: number | null;
  maxProfit?: number | null;
  enabled: boolean;
  priority: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  archived?: boolean;
  archivedAt?: Date | null;
  archivedBy?: string | null;
};

export type PricingRuleInput = {
  name: string;
  scope: PricingRuleScope;
  supplierCode?: string | null;
  agencyId?: string | null;
  markupType: PricingMarkupType;
  markupValue: number;
  minProfit?: number | null;
  maxProfit?: number | null;
  enabled: boolean;
  priority: number;
  notes?: string | null;
};

function normalizeText(value: string | null | undefined, max: number) {
  return String(value || "").trim().slice(0, max);
}

function normalizeRuleInput(input: PricingRuleInput): PricingRuleInput {
  const name = normalizeText(input.name, 120);
  if (!name) throw new Error("Rule name is required");

  const supplierCode =
    input.scope === "supplier"
      ? normalizeText(input.supplierCode, 60).toLowerCase()
      : null;
  const agencyId =
    input.scope === "agency" ? normalizeText(input.agencyId, 120) : null;
  if (input.scope === "supplier" && !supplierCode) {
    throw new Error("Supplier code is required");
  }
  if (input.scope === "agency" && !agencyId) {
    throw new Error("Agency ID is required");
  }

  const markupValue = Number(input.markupValue);
  const minProfit =
    input.minProfit === null || input.minProfit === undefined
      ? null
      : Number(input.minProfit);
  const maxProfit =
    input.maxProfit === null || input.maxProfit === undefined
      ? null
      : Number(input.maxProfit);
  if (!Number.isFinite(markupValue) || markupValue < 0) {
    throw new Error("Markup value must be zero or greater");
  }
  if (minProfit !== null && (!Number.isFinite(minProfit) || minProfit < 0)) {
    throw new Error("Minimum profit must be zero or greater");
  }
  if (maxProfit !== null && (!Number.isFinite(maxProfit) || maxProfit < 0)) {
    throw new Error("Maximum profit must be zero or greater");
  }
  if (minProfit !== null && maxProfit !== null && minProfit > maxProfit) {
    throw new Error("Minimum profit cannot exceed maximum profit");
  }

  return {
    name,
    scope: input.scope,
    supplierCode,
    agencyId,
    markupType: input.markupType,
    markupValue: Number(Math.min(markupValue, 1_000_000).toFixed(2)),
    minProfit: minProfit === null ? null : Number(minProfit.toFixed(2)),
    maxProfit: maxProfit === null ? null : Number(maxProfit.toFixed(2)),
    enabled: Boolean(input.enabled),
    priority: Math.round(Math.min(Math.max(Number(input.priority) || 1, 1), 1000)),
    notes: normalizeText(input.notes, 2_000) || null,
  };
}

function serializePricingRule(rule: PricingRuleDocument) {
  return {
    id: rule.id || rule._id,
    name: rule.name,
    scope: rule.scope,
    supplierCode: rule.supplierCode || null,
    agencyId: rule.agencyId || null,
    markupType: rule.markupType,
    markupValue: Number(rule.markupValue),
    minProfit:
      typeof rule.minProfit === "number" ? Number(rule.minProfit) : null,
    maxProfit:
      typeof rule.maxProfit === "number" ? Number(rule.maxProfit) : null,
    enabled: Boolean(rule.enabled),
    priority: Number(rule.priority),
    notes: rule.notes || "",
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

export async function listPricingRules() {
  const db = await getFirestoreMongoDb();
  const rules = await db
    .collection<PricingRuleDocument>("pricing_rules")
    .find({ archived: { $ne: true } })
    .sort({ priority: 1, updatedAt: -1 })
    .toArray();
  return rules.map(serializePricingRule);
}

export async function createPricingRule(
  input: PricingRuleInput,
  actorEmail: string,
) {
  const normalized = normalizeRuleInput(input);
  const db = await getFirestoreMongoDb();
  const now = new Date();
  const id = `pricing-rule-${randomUUID()}`;
  const rule: PricingRuleDocument = {
    _id: id,
    id,
    ...normalized,
    createdAt: now,
    updatedAt: now,
    createdBy: actorEmail,
    updatedBy: actorEmail,
    archived: false,
    archivedAt: null,
    archivedBy: null,
  };
  await db.collection<PricingRuleDocument>("pricing_rules").insertOne(rule);
  return serializePricingRule(rule);
}

export async function updatePricingRule(
  id: string,
  input: PricingRuleInput,
  actorEmail: string,
) {
  const normalized = normalizeRuleInput(input);
  const db = await getFirestoreMongoDb();
  const collection = db.collection<PricingRuleDocument>("pricing_rules");
  const result = await collection.updateOne(
    { _id: id, archived: { $ne: true } },
    {
      $set: {
        ...normalized,
        updatedAt: new Date(),
        updatedBy: actorEmail,
      },
    },
  );
  if (result.matchedCount === 0) return null;
  const updated = await collection.findOne({ _id: id });
  return updated ? serializePricingRule(updated) : null;
}

export async function archivePricingRule(id: string, actorEmail: string) {
  const db = await getFirestoreMongoDb();
  const now = new Date();
  const result = await db
    .collection<PricingRuleDocument>("pricing_rules")
    .updateOne(
      { _id: id, archived: { $ne: true } },
      {
        $set: {
          enabled: false,
          archived: true,
          archivedAt: now,
          archivedBy: actorEmail,
          updatedAt: now,
          updatedBy: actorEmail,
        },
      },
    );
  return result.matchedCount > 0;
}
