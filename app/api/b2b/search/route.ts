import { NextRequest } from "next/server";
import {
  authenticateB2BRequest,
  createB2BError,
  createB2BResponse,
  isNextResponse,
  logB2BRequest,
  parseB2BJsonBody,
  requireFields,
} from "@/lib/b2b/api";
import { getB2BMockSupplierProvider } from "@/lib/b2b/supplier";
import { normalizeSupplierHotels } from "@/lib/hotels/normalize-hotels";
import type { SupplierGuestOccupancy } from "@/lib/suppliers";

function toRooms(value: unknown): SupplierGuestOccupancy[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ adults: 1, children: 0, childrenAges: [] }];
  }

  return value.map((room) => {
    const source = room as {
      adults?: number;
      children?: number;
      childrenAges?: number[];
    };

    return {
      adults: source.adults ?? 1,
      children: source.children ?? source.childrenAges?.length ?? 0,
      childrenAges: source.childrenAges ?? [],
    };
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateB2BRequest(req);
  if (isNextResponse(auth)) return auth;

  const body = await parseB2BJsonBody<Record<string, unknown>>(req, auth.requestId);
  if (isNextResponse(body)) return body;

  const missingFields = requireFields(body, ["checkIn", "checkOut"]);
  if (!body.cityName && !body.destinationCode) {
    missingFields.push("cityName or destinationCode");
  }

  if (missingFields.length > 0) {
    return createB2BError(
      auth.requestId,
      400,
      "B2B_VALIDATION_ERROR",
      `Missing required fields: ${missingFields.join(", ")}`,
    );
  }

  try {
    const provider = getB2BMockSupplierProvider();
    const supplierResponse = await provider.searchHotels({
      destinationCode: body.destinationCode as string | undefined,
      cityName: body.cityName as string | undefined,
      countryCode: body.countryCode as string | undefined,
      checkIn: body.checkIn as string,
      checkOut: body.checkOut as string,
      rooms: toRooms(body.rooms),
      nationality: body.nationality as string | undefined,
      currency: (body.currency as string | undefined) || auth.agency.currency,
      metadata: {
        agencyId: auth.agency._id.toString(),
        b2b: true,
      },
    });
    const hotels = normalizeSupplierHotels(
      supplierResponse.hotels,
      (body.currency as string | undefined) || auth.agency.currency,
    );

    const response = {
      supplierMode: "mock",
      hotels,
    };

    await logB2BRequest({
      requestId: auth.requestId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      agencyId: auth.agency._id.toString(),
      status: "success",
      message: "B2B hotel search completed",
      request: body,
      response: { hotelCount: hotels.length },
    });

    return createB2BResponse(auth.requestId, response);
  } catch (error) {
    await logB2BRequest({
      requestId: auth.requestId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      agencyId: auth.agency._id.toString(),
      status: "failed",
      message: "B2B hotel search failed",
      request: body,
      error: { message: error instanceof Error ? error.message : "Unknown error" },
    });

    return createB2BError(
      auth.requestId,
      500,
      "B2B_INTERNAL_ERROR",
      "Unable to complete B2B search request",
    );
  }
}
