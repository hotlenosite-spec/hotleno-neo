import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rate-limit";
import AdminActionLog from "@/models/AdminActionLog";
import Agency, { type IAgency } from "@/models/Agency";

export type B2BApiContext = {
  agency: IAgency;
  requestId: string;
};

export type B2BApiResponse<T> = {
  success: boolean;
  requestId: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

export function hashB2BApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

function getApiKey(req: NextRequest) {
  const headerKey = req.headers.get("x-api-key");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return headerKey || bearer || "";
}

export function createB2BResponse<T>(
  requestId: string,
  data: T,
  status = 200,
) {
  return NextResponse.json<B2BApiResponse<T>>(
    {
      success: true,
      requestId,
      data,
    },
    { status },
  );
}

export function createB2BError(
  requestId: string,
  status: number,
  code: string,
  message: string,
) {
  return NextResponse.json<B2BApiResponse<never>>(
    {
      success: false,
      requestId,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export async function authenticateB2BRequest(
  req: NextRequest,
): Promise<B2BApiContext | NextResponse> {
  const requestId = randomUUID();
  const rateLimitResponse = checkRateLimit(req, {
    keyPrefix: "b2b-api",
    limit: 60,
    windowMs: 60_000,
  });

  if (rateLimitResponse) return rateLimitResponse;

  const apiKey = getApiKey(req);

  if (!apiKey) {
    return createB2BError(
      requestId,
      401,
      "B2B_API_KEY_REQUIRED",
      "A valid API key is required",
    );
  }

  await dbConnect();

  const apiKeyHash = hashB2BApiKey(apiKey);
  const agency = await Agency.findOne({
    apiKeyHash,
    apiEnabled: true,
    status: "active",
  }).select("+apiKeyHash");

  if (!agency) {
    await logB2BRequest({
      requestId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      status: "failed",
      message: "Invalid B2B API key",
      request: {
        apiKeyPrefix: apiKey.slice(0, 8),
      },
      error: {
        code: "B2B_INVALID_API_KEY",
      },
    });

    return createB2BError(
      requestId,
      401,
      "B2B_INVALID_API_KEY",
      "Invalid API key",
    );
  }

  agency.apiKeyLastUsedAt = new Date();
  await agency.save();

  return {
    agency,
    requestId,
  };
}

export async function parseB2BJsonBody<T>(
  req: NextRequest,
  requestId: string,
): Promise<T | NextResponse> {
  try {
    return (await req.json()) as T;
  } catch {
    return createB2BError(
      requestId,
      400,
      "B2B_INVALID_JSON",
      "Request body must be valid JSON",
    );
  }
}

export async function logB2BRequest(params: {
  requestId: string;
  endpoint: string;
  method: string;
  agencyId?: string;
  status: "success" | "failed" | "skipped";
  message: string;
  request?: unknown;
  response?: unknown;
  error?: unknown;
}) {
  try {
    await dbConnect();
    await AdminActionLog.create({
      targetType: params.agencyId ? "agency" : "system",
      targetId: params.agencyId || null,
      type: `b2b_api:${params.method}:${params.endpoint}`,
      status: params.status,
      message: params.message,
      request: {
        requestId: params.requestId,
        endpoint: params.endpoint,
        method: params.method,
        payload: params.request ?? null,
      },
      response: params.response ?? null,
      error: params.error ?? null,
    });
  } catch {
    // API responses must not depend on internal logging availability.
  }
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export function requireFields(
  body: Record<string, unknown>,
  fields: string[],
): string[] {
  return fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === "";
  });
}
