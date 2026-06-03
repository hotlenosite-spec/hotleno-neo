import { NextRequest } from "next/server";
import {
  createTransfersError,
  createTransfersSuccess,
  getTransfersClient,
  handleTransfersError,
  parseTransfersJsonBody,
} from "@/lib/transfers/api";
import type { TransferRateCheckRequest } from "@/types/transfers";

export async function POST(req: NextRequest) {
  const body = await parseTransfersJsonBody(req);

  if (!body?.rateKey) {
    return createTransfersError(
      400,
      "TRANSFERS_VALIDATION_ERROR",
      "rateKey is required for transfers rate check.",
    );
  }

  try {
    const result = await getTransfersClient().rateCheck(
      body as unknown as TransferRateCheckRequest,
    );

    return createTransfersSuccess(result);
  } catch (error) {
    return handleTransfersError(error);
  }
}
