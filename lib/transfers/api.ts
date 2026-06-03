import { NextRequest, NextResponse } from "next/server";
import {
  createHotelbedsTransfersClient,
  HotelbedsTransfersClientError,
} from "@/lib/suppliers/hotelbeds-transfers-client";

export async function parseTransfersJsonBody(req: NextRequest) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createTransfersError(
  status: number,
  code: string,
  message: string,
) {
  return NextResponse.json(
    {
      success: false,
      error: code,
      message,
    },
    { status },
  );
}

export function createTransfersSuccess(data: unknown, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status },
  );
}

export function handleTransfersError(error: unknown) {
  if (error instanceof HotelbedsTransfersClientError) {
    return createTransfersError(
      error.status || 502,
      error.code,
      error.message,
    );
  }

  return createTransfersError(
    500,
    "TRANSFERS_INTERNAL_ERROR",
    "Unable to complete transfers request.",
  );
}

export function getTransfersClient() {
  return createHotelbedsTransfersClient();
}
