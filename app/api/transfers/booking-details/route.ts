import { NextRequest } from "next/server";
import {
  createTransfersError,
  createTransfersSuccess,
  getTransfersClient,
  handleTransfersError,
  parseTransfersJsonBody,
} from "@/lib/transfers/api";

function sanitizeBookingDetails<T extends { rawSupplierRequest?: unknown; rawSupplierResponse?: unknown }>(
  result: T,
) {
  if (process.env.NODE_ENV !== "production") return result;

  return {
    ...result,
    rawSupplierRequest: undefined,
    rawSupplierResponse: undefined,
  };
}

export async function POST(req: NextRequest) {
  const body = await parseTransfersJsonBody(req);
  const bookingReference =
    typeof body?.bookingReference === "string" ? body.bookingReference : "";

  if (!bookingReference) {
    return createTransfersError(
      400,
      "TRANSFERS_MISSING_BOOKING_REFERENCE",
      "bookingReference is required for Hotelbeds Transfers booking details.",
    );
  }

  try {
    const result = await getTransfersClient().getTransferBookingDetails({
      bookingReference,
      metadata:
        typeof body?.metadata === "object" && body.metadata
          ? (body.metadata as Record<string, unknown>)
          : undefined,
    });

    return createTransfersSuccess(sanitizeBookingDetails(result));
  } catch (error) {
    return handleTransfersError(error);
  }
}
