import { NextRequest } from "next/server";
import {
  createTransfersError,
  createTransfersSuccess,
  getTransfersClient,
  handleTransfersError,
  parseTransfersJsonBody,
} from "@/lib/transfers/api";
import dbConnect from "@/lib/mongodb";
import TransferBooking from "@/models/TransferBooking";
import type { TransferCancellationRequest } from "@/types/transfers";

function sanitizeCancellation<T extends { rawSupplierRequest?: unknown; rawSupplierResponse?: unknown }>(
  result: T,
) {
  if (process.env.NODE_ENV !== "production") return result;

  return {
    ...result,
    rawSupplierRequest: undefined,
    rawSupplierResponse: undefined,
  };
}

async function markTransferBookingCancelledIfPossible(bookingReference: string) {
  if (!bookingReference || !process.env.MONGODB_URI) return;

  try {
    await dbConnect();
    await TransferBooking.findOneAndUpdate(
      { bookingReference },
      { status: "cancelled" },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Hotelbeds Transfers] transfer cancellation persistence skipped", {
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await parseTransfersJsonBody(req);

  if (!body?.bookingReference) {
    return createTransfersError(
      400,
      "TRANSFERS_VALIDATION_ERROR",
      "bookingReference is required for transfers cancellation.",
    );
  }

  try {
    const result = await getTransfersClient().cancelTransferBooking(
      body as unknown as TransferCancellationRequest,
    );
    await markTransferBookingCancelledIfPossible(body.bookingReference as string);

    return createTransfersSuccess(sanitizeCancellation(result));
  } catch (error) {
    return handleTransfersError(error);
  }
}
