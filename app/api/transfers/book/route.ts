import { NextRequest } from "next/server";
import {
  createTransfersError,
  createTransfersSuccess,
  getTransfersClient,
  handleTransfersError,
  parseTransfersJsonBody,
} from "@/lib/transfers/api";
import dbConnect from "@/lib/mongodb";
import { isHotelbedsTransfersBookingEnabled } from "@/lib/suppliers/hotelbeds-transfers-auth";
import TransferBooking from "@/models/TransferBooking";
import type { TransferBookingRequest } from "@/types/transfers";

function sanitizeBookingResult<T extends { rawSupplierRequest?: unknown; rawSupplierResponse?: unknown }>(
  result: T,
) {
  if (process.env.NODE_ENV !== "production") return result;

  return {
    ...result,
    rawSupplierRequest: undefined,
    rawSupplierResponse: undefined,
  };
}

function hasBookingServices(body: Record<string, unknown>) {
  return (
    (Array.isArray(body.services) && body.services.length > 0) ||
    typeof body.rateKey === "string"
  );
}

function hasHolder(body: Record<string, unknown>) {
  const holder = body.holder as Record<string, unknown> | undefined;
  return Boolean(
    holder &&
      typeof holder.name === "string" &&
      holder.name.trim() &&
      typeof holder.surname === "string" &&
      holder.surname.trim() &&
      typeof holder.email === "string" &&
      holder.email.trim() &&
      typeof holder.phone === "string" &&
      holder.phone.trim(),
  );
}

function normalizeBookingBody(body: Record<string, unknown>) {
  const services = Array.isArray(body.services)
    ? body.services.map((service) => {
        if (!service || typeof service !== "object") return service;
        const nextService = { ...(service as Record<string, unknown>) };
        if (Array.isArray(nextService.extras) && nextService.extras.length === 0) {
          delete nextService.extras;
        }
        return nextService;
      })
    : body.services;

  return { ...body, services };
}

async function saveTransferBookingIfPossible(result: {
  bookingReference?: string;
  clientReference?: string;
  status?: string;
  voucher?: {
    pickup?: unknown;
    dropoff?: unknown;
    pickupDateTime?: string;
    holder?: unknown;
    serviceName?: string;
  };
}) {
  if (!result.bookingReference || !process.env.MONGODB_URI) return;

  try {
    await dbConnect();
    await TransferBooking.findOneAndUpdate(
      { bookingReference: result.bookingReference },
      {
        bookingReference: result.bookingReference,
        clientReference: result.clientReference || "",
        supplier: "hotelbeds-transfers",
        status: result.status || "confirmed",
        pickup: result.voucher?.pickup,
        dropoff: result.voucher?.dropoff,
        pickupDateTime: result.voucher?.pickupDateTime,
        holder: result.voucher?.holder,
        selectedService: {
          serviceName: result.voucher?.serviceName,
        },
        voucherData: result.voucher,
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Hotelbeds Transfers] transfer booking persistence skipped", {
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await parseTransfersJsonBody(req);

  if (!body || !hasBookingServices(body)) {
    return createTransfersError(
      400,
      "TRANSFERS_MISSING_RATE_KEY",
      "rateKey or services are required for Hotelbeds Transfers booking.",
    );
  }

  if (!hasHolder(body)) {
    return createTransfersError(
      400,
      "TRANSFERS_MISSING_CUSTOMER_DETAILS",
      "Customer holder name, surname, email, and phone are required.",
    );
  }

  if (!isHotelbedsTransfersBookingEnabled()) {
    return createTransfersError(
      403,
      "TRANSFERS_BOOKING_DISABLED",
      "Hotelbeds Transfers booking is disabled in this environment.",
    );
  }

  try {
    const normalizedBody = normalizeBookingBody(body);
    const result = await getTransfersClient().bookTransfer(
      normalizedBody as unknown as TransferBookingRequest,
    );
    await saveTransferBookingIfPossible(result);

    const safeResult = sanitizeBookingResult(result);

    return createTransfersSuccess({
      ...safeResult,
      debug:
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              bookingReference: result.bookingReference,
              status: result.status,
              hasVoucher: Boolean(result.voucher),
            },
    });
  } catch (error) {
    return handleTransfersError(error);
  }
}
