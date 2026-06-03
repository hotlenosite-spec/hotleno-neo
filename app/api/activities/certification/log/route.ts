import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const LOG_ROOT = path.join(process.cwd(), "hotelbeds-activities-certification-logs");

const BLOCKED_KEYS = new Set([
  "api-key",
  "apikey",
  "secret",
  "x-signature",
  "authorization",
  "headers",
  "rawsupplierrequest",
  "rawsupplierresponse",
  ".env",
]);

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") return value.slice(0, 1500);
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => sanitize(item, depth + 1));
  if (typeof value === "object") {
    const safe: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();
      if (BLOCKED_KEYS.has(normalizedKey)) continue;
      safe[key] = sanitize(item, depth + 1);
    }
    return safe;
  }
  return String(value);
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        success: false,
        error: "ACTIVITIES_CERTIFICATION_LOG_DISABLED",
        message: "Activities certification logging is disabled in production.",
      },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const scenarioId =
    typeof body?.scenarioId === "string" ? slug(body.scenarioId) : "unknown-scenario";
  const step = typeof body?.step === "string" ? slug(body.step) : "unknown-step";

  mkdirSync(path.join(LOG_ROOT, scenarioId), { recursive: true });

  const payload = {
    scenarioId,
    step,
    writtenAt: new Date().toISOString(),
    data: sanitize(body?.data || {}),
  };

  const filePath = path.join(LOG_ROOT, scenarioId, `${step}.json`);
  writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");

  return NextResponse.json({
    success: true,
    path: path.relative(process.cwd(), filePath),
  });
}
