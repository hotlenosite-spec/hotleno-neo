import { NextRequest } from "next/server";
import {
  createTransfersError,
  createTransfersSuccess,
  getTransfersClient,
  handleTransfersError,
  parseTransfersJsonBody,
} from "@/lib/transfers/api";
import type { TransferBookingRequest } from "@/types/transfers";

export async function POST(req: NextRequest) {
  const body = await parseTransfersJsonBody(req);

  if (!body?.rateKey || !body?.leadPassenger) {
    return createTransfersError(
      400,
      "TRANSFERS_VALIDATION_ERROR",
      "rateKey and leadPassenger are required for transfers booking.",
    );
  }

  try {
    const result = await getTransfersClient().bookTransfer(
      body as unknown as TransferBookingRequest,
    );

    return createTransfersSuccess(result);
  } catch (error) {
    return handleTransfersError(error);
  }
}
