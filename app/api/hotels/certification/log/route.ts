import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const LOG_ROOT = path.join(process.cwd(), "hotelbeds-hotels-certification-logs");
const BLOCKED_KEY_PATTERN =
  /api[-_ ]?key|secret|x[-_ ]?signature|authorization|headers|signature|\.env/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[MaxDepth]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      if (BLOCKED_KEY_PATTERN.test(key)) continue;
      if (key.toLowerCase().startsWith("raw")) continue;
      output[key] = sanitize(item, depth + 1);
    }

    return output;
  }

  if (typeof value === "string") {
    return value.replace(BLOCKED_KEY_PATTERN, "[removed]");
  }

  return value;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "HOTELBEDS_HOTELS_CERTIFICATION_LOG_DISABLED" },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    scenarioId?: string;
    step?: string;
    data?: unknown;
  } | null;

  if (!body?.scenarioId || !body.step) {
    return NextResponse.json(
      { success: false, error: "HOTELBEDS_HOTELS_CERTIFICATION_LOG_INVALID" },
      { status: 400 },
    );
  }

  const safeScenarioId = body.scenarioId.replace(/[^a-z0-9-]/gi, "-");
  const safeStep = body.step.replace(/[^a-z0-9-]/gi, "-");
  const dir = path.join(LOG_ROOT, safeScenarioId);

  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, `${safeStep}.json`),
    `${JSON.stringify(sanitize(body.data || {}), null, 2)}\n`,
    "utf8",
  );

  return NextResponse.json({ success: true });
}
