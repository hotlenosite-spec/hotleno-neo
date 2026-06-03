import { NextRequest } from "next/server";
import {
  createTransfersError,
  createTransfersSuccess,
  getTransfersClient,
  handleTransfersError,
} from "@/lib/transfers/api";

export async function GET(req: NextRequest) {
  const bookingReference = req.nextUrl.searchParams.get("bookingReference");

  if (!bookingReference) {
    return createTransfersError(
      400,
      "TRANSFERS_VALIDATION_ERROR",
      "bookingReference is required for transfers booking status.",
    );
  }

  try {
    const result = await getTransfersClient().getTransferBookingDetails({
      bookingReference,
    });

    return createTransfersSuccess(result);
  } catch (error) {
    return handleTransfersError(error);
  }
}
