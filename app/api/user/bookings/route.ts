import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Collection, Document } from "mongodb";
import { isBookingStatus } from "@/lib/booking-status";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { createLog, getUserById } from "@/lib/firebase-store";
import { verifyToken } from "@/lib/jwt";
import {
  logTboCertificationBookingDiagnostics,
  TboSupplierProvider,
} from "@/lib/suppliers/tbo-provider";
import type {
  SupplierBookRequest,
  SupplierBookResponse,
  SupplierGuestOccupancy,
  SupplierPreBookResponse,
} from "@/lib/suppliers/types";

type BookingDocument = Document & {
  _id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

function toNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getBookingId(reference?: unknown) {
  const safeReference =
    typeof reference === "string" && reference.trim()
      ? reference.trim()
      : "";
  return safeReference || `booking-${randomUUID()}`;
}

function isEnabled(value?: string) {
  return String(value || "").trim().toLowerCase() === "true";
}

function safeErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : "Supplier booking failed")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

function splitName(value?: unknown) {
  const cleanName = String(value || "")
    .replace(/^(Mr|Mrs|Miss|Ms|Dr|Child)\.?\s+/i, "")
    .trim();
  const [firstName = "Guest", ...rest] = cleanName.split(/\s+/).filter(Boolean);

  return {
    firstName,
    lastName: rest.join(" ") || "Hotleno",
  };
}

function getRawSupplierObject(response: SupplierBookResponse) {
  return response.rawSupplierResponse &&
    typeof response.rawSupplierResponse === "object"
    ? (response.rawSupplierResponse as Record<string, unknown>)
    : {};
}

function getStatusDescription(response: SupplierBookResponse) {
  const raw = getRawSupplierObject(response);
  const status = raw.status;
  if (!status || typeof status !== "object") return "";
  const description = (status as Record<string, unknown>).Description;
  return typeof description === "string" ? description : "";
}

function getHttpStatusCode(response: SupplierBookResponse) {
  const value = getRawSupplierObject(response).httpStatusCode;
  return typeof value === "number" ? value : undefined;
}

function getSupplierResponseValue(response: SupplierBookResponse, key: string) {
  const value = getRawSupplierObject(response)[key];
  return typeof value === "string" ? value : "";
}

function getFirstSupplierResponseValue(
  response: SupplierBookResponse,
  keys: string[],
) {
  for (const key of keys) {
    const value = getSupplierResponseValue(response, key);
    if (value) return value;
  }

  return "";
}

function getBookingMetadataNumber(booking: BookingDocument, key: string) {
  const metadata =
    booking.metadata && typeof booking.metadata === "object"
      ? (booking.metadata as Record<string, unknown>)
      : {};
  const value = metadata[key];
  return toNumber(value);
}

function getSupplierStageErrorCode(stage: "prebook" | "book", message: string) {
  return message.toLowerCase().includes("session expired")
    ? `session_expired_${stage}`
    : message;
}

function buildSupplierOccupancy(booking: BookingDocument): SupplierGuestOccupancy[] {
  const rooms = Array.isArray(booking.rooms)
    ? (booking.rooms as Array<Record<string, unknown>>)
    : [];

  if (rooms.length === 0) {
    return [{ adults: 1, children: 0, childrenAges: [] }];
  }

  return rooms.map((room) => ({
    adults: Math.max(1, toNumber(room.adults, 1)),
    children: Math.max(0, toNumber(room.children)),
    childrenAges: Array.isArray(room.childrenAges)
      ? room.childrenAges.map((age) => toNumber(age)).filter((age) => age >= 0)
      : [],
  }));
}

function toDateString(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
}

function buildTboBookRequest(booking: BookingDocument): SupplierBookRequest {
  const travelers = Array.isArray(booking.travelers)
    ? (booking.travelers as Array<Record<string, unknown>>)
    : [];
  const leadTraveler =
    travelers.find((traveler) => traveler.travelerType === "adult") ||
    travelers[0];
  const fallbackLeadGuest = splitName(booking.leadGuest);

  return {
    idempotencyKey: String(booking.idempotencyKey || booking.bookingReference),
    supplierHotelId: String(booking.supplierHotelId || booking.hotelId || ""),
    supplierRateKey: String(booking.supplierRateKey || ""),
    leadGuest: {
      title:
        typeof leadTraveler?.title === "string"
          ? leadTraveler.title
          : "Mr",
      firstName:
        typeof leadTraveler?.firstName === "string" && leadTraveler.firstName
          ? leadTraveler.firstName
          : fallbackLeadGuest.firstName,
      lastName:
        typeof leadTraveler?.lastName === "string" && leadTraveler.lastName
          ? leadTraveler.lastName
          : fallbackLeadGuest.lastName,
      email: String(booking.contactEmail || booking.customerEmail || ""),
      phone: String(booking.contactPhone || ""),
    },
    guests: travelers
      .filter((traveler) => traveler.firstName || traveler.lastName)
      .map((traveler) => ({
        title: typeof traveler.title === "string" ? traveler.title : "Mr",
        firstName: String(traveler.firstName || "Guest"),
        lastName: String(traveler.lastName || "Hotleno"),
        type: traveler.travelerType === "child" ? "child" : "adult",
      })),
    metadata: {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      supplierBookingReference: booking.yourReference || booking.bookingReference,
      totalFare:
        getBookingMetadataNumber(booking, "supplierTotalFare") ||
        booking.totalPrice,
      currency: booking.currency,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      source: "user_bookings_certification_flow",
    },
  };
}

async function submitTboCertificationBooking(params: {
  bookingsCollection: Collection<BookingDocument>;
  booking: BookingDocument;
  stripeCheckoutEnabled: boolean;
  tboBookingEnabled: boolean;
}) {
  const { bookingsCollection, booking, stripeCheckoutEnabled, tboBookingEnabled } = params;
  const provider = new TboSupplierProvider();
  const supplierRequest = buildTboBookRequest(booking);
  const now = new Date();

  try {
    let preBookResponse: SupplierPreBookResponse;
    try {
      preBookResponse = await provider.preBook({
        supplierHotelId: String(booking.supplierHotelId || booking.hotelId || ""),
        supplierRateKey: String(booking.supplierRateKey || ""),
        checkIn: toDateString(booking.checkInDate),
        checkOut: toDateString(booking.checkOutDate),
        rooms: buildSupplierOccupancy(booking),
        currency: String(booking.currency || "USD"),
        metadata: {
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
        },
      });
    } catch (error) {
      const message = safeErrorMessage(error);
      const supplierError = getSupplierStageErrorCode("prebook", message);
      const updates: Partial<BookingDocument> & Record<string, unknown> = {
        bookingStatus: "supplier_booking_failed",
        status: "supplier_booking_failed",
        supplierStatus: "failed",
        failureReason: message,
        "metadata.supplierSubmission": "failed",
        "metadata.supplierError": supplierError,
        "metadata.supplierFailureStage": "prebook",
        "metadata.supplierSubmittedAt": now.toISOString(),
        "metadata.stripeBypassedForCertification": !stripeCheckoutEnabled,
        updatedAt: now,
      };

      await bookingsCollection.updateOne({ _id: booking._id }, { $set: updates });
      logTboCertificationBookingDiagnostics({
        internalBookingId: booking._id,
        tboBookingEnabled,
        stripeCheckoutEnabled,
        stripeBypassedForCertification: !stripeCheckoutEnabled,
        error: supplierError,
      });
      await createLog({
        type: "supplier_prebook_failed",
        status: "failed",
        message: "TBO certification PreBook failed",
        request: {
          bookingId: booking._id,
          supplier: "tbo",
          hasRateKey: Boolean(booking.supplierRateKey),
          hasHotelCode: Boolean(booking.supplierHotelId),
        },
        response: {
          bookingId: booking._id,
          supplierStatus: "failed",
          supplierError,
        },
        error: supplierError,
      });

      return { ...booking, ...updates } as BookingDocument;
    }

    const bookRequest: SupplierBookRequest = {
      ...supplierRequest,
      supplierRateKey: preBookResponse.supplierRateKey || supplierRequest.supplierRateKey,
      metadata: {
        ...(supplierRequest.metadata || {}),
        bookingCodeSource: "prebook",
        totalFare: preBookResponse.price || getBookingMetadataNumber(booking, "supplierTotalFare") || booking.totalPrice,
        preBookAvailable: preBookResponse.available,
      },
    };
    const supplierResponse = await provider.book(bookRequest);
    const supplierBookingId = getFirstSupplierResponseValue(supplierResponse, [
      "bookingId",
      "BookingId",
      "BookingID",
    ]);
    const supplierConfirmationNo = getFirstSupplierResponseValue(
      supplierResponse,
      ["confirmationNo", "confirmationNumber", "ConfirmationNo", "ConfirmationNumber"],
    );
    const supplierReference =
      getFirstSupplierResponseValue(supplierResponse, [
        "supplierReference",
        "bookingReferenceId",
        "BookingReferenceId",
        "BookingRefNo",
      ]) || supplierResponse.supplierBookingReference;
    const supplierTraceId = getFirstSupplierResponseValue(supplierResponse, [
      "traceId",
      "TraceId",
      "TraceID",
    ]);
    const supplierVoucherStatus = getFirstSupplierResponseValue(supplierResponse, [
      "voucherStatus",
      "VoucherStatus",
    ]);
    const supplierResponseStatus =
      getFirstSupplierResponseValue(supplierResponse, ["responseStatus"]) ||
      getStatusDescription(supplierResponse);
    const updates: Partial<BookingDocument> & Record<string, unknown> = {
      bookingStatus: "supplier_booking_confirmed",
      status: "supplier_booking_confirmed",
      supplierStatus: "confirmed",
      supplierBookingReference: supplierReference,
      supplierBookingId,
      supplierConfirmationNo,
      supplierReference,
      supplierTraceId,
      supplierVoucherStatus,
      supplierResponseStatus,
      rawSupplierRequest: supplierResponse.rawSupplierRequest ?? null,
      rawSupplierResponse: supplierResponse.rawSupplierResponse ?? null,
      "metadata.supplierSubmission": "sent_to_supplier",
      "metadata.supplierSubmittedAt": now.toISOString(),
      "metadata.stripeBypassedForCertification": !stripeCheckoutEnabled,
      updatedAt: now,
    };

    await bookingsCollection.updateOne({ _id: booking._id }, { $set: updates });
    logTboCertificationBookingDiagnostics({
      internalBookingId: booking._id,
      tboBookingEnabled,
      stripeCheckoutEnabled,
      stripeBypassedForCertification: !stripeCheckoutEnabled,
      statusCode: getHttpStatusCode(supplierResponse),
      statusDescription: supplierResponseStatus,
      bookingIdReturned: Boolean(supplierBookingId),
    });
    await createLog({
      type: "supplier_booking_confirmed",
      status: "success",
      message: "TBO certification booking was submitted to supplier",
      request: {
        bookingId: booking._id,
        supplier: "tbo",
        hasRateKey: Boolean(booking.supplierRateKey),
        hasHotelCode: Boolean(booking.supplierHotelId),
      },
      response: {
        bookingId: booking._id,
        supplierStatus: "confirmed",
        supplierBookingIdPresent: Boolean(supplierBookingId),
      },
    });

    return { ...booking, ...updates } as BookingDocument;
  } catch (error) {
    const message = safeErrorMessage(error);
    const supplierError = getSupplierStageErrorCode("book", message);
    const updates: Partial<BookingDocument> & Record<string, unknown> = {
      bookingStatus: "supplier_booking_failed",
      status: "supplier_booking_failed",
      supplierStatus: "failed",
      failureReason: message,
      "metadata.supplierSubmission": "failed",
      "metadata.supplierError": supplierError,
      "metadata.supplierFailureStage": "book",
      "metadata.supplierSubmittedAt": now.toISOString(),
      "metadata.stripeBypassedForCertification": !stripeCheckoutEnabled,
      updatedAt: now,
    };

    await bookingsCollection.updateOne({ _id: booking._id }, { $set: updates });
    logTboCertificationBookingDiagnostics({
      internalBookingId: booking._id,
      tboBookingEnabled,
      stripeCheckoutEnabled,
      stripeBypassedForCertification: !stripeCheckoutEnabled,
      error: supplierError,
    });
    await createLog({
      type: "supplier_booking_failed",
      status: "failed",
      message: "TBO certification Book failed",
      request: {
        bookingId: booking._id,
        supplier: "tbo",
        hasRateKey: Boolean(booking.supplierRateKey),
        hasHotelCode: Boolean(booking.supplierHotelId),
      },
      response: {
        bookingId: booking._id,
        supplierStatus: "failed",
      },
      error: supplierError,
    });

    return { ...booking, ...updates } as BookingDocument;
  }
}

// GET - Fetch user's booking history
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const db = await getFirestoreMongoDb();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = toNumber(searchParams.get("limit"), 50);
    const page = toNumber(searchParams.get("page"), 1);
    const query: Record<string, unknown> = { userId: decoded.userId };

    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const bookingsCollection = db.collection<BookingDocument>("bookings");
    const bookings = await bookingsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const total = await bookingsCollection.countDocuments(query);

    return NextResponse.json({
      success: true,
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Bookings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}

// POST - Create a new booking before payment
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const body = await req.json();
    const db = await getFirestoreMongoDb();
    const user = await getUserById(decoded.userId);
    const stripeCheckoutEnabled =
      process.env.STRIPE_CHECKOUT_ENABLED === "true" ||
      process.env.NEXT_PUBLIC_ENABLE_STRIPE_CHECKOUT === "true";
    const tboBookingEnabled = isEnabled(process.env.TBO_BOOKING_ENABLED);
    const tboCertificationMode = isEnabled(process.env.TBO_CERTIFICATION_MODE);
    const supplier = String(body.supplier || "none").toLowerCase();
    const shouldSubmitTboCertificationBooking =
      supplier === "tbo" && tboCertificationMode && tboBookingEnabled;
    const internalOnlyBooking =
      !stripeCheckoutEnabled && !shouldSubmitTboCertificationBooking;
    const bookingStatus = internalOnlyBooking
      ? "supplier_booking_not_started"
      : shouldSubmitTboCertificationBooking
        ? "supplier_booking_processing"
        : isBookingStatus(body.status)
          ? body.status
          : "pending_payment";
    const channel =
      body.channel === "b2b" || user?.accountType === "b2b" ? "b2b" : "b2c";
    const totalPrice = toNumber(body.totalPrice);
    const finalSellingPrice = toNumber(body.finalSellingPrice, totalPrice);
    const now = new Date();
    const bookingId = getBookingId(body.bookingReference);
    const booking: BookingDocument = {
      _id: bookingId,
      userId: decoded.userId,
      channel,
      inventorySource: body.inventorySource || "supplier",
      agencyId: channel === "b2b" ? body.agencyId || user?.agencyId || null : null,
      agencyUserId: channel === "b2b" ? body.agencyUserId || decoded.userId : null,
      agencyRole: channel === "b2b" ? body.agencyRole || user?.agencyRole || "" : "",
      agentName: channel === "b2b" ? body.agentName || user?.name || "" : "",
      customerUserId: channel === "b2c" ? decoded.userId : body.customerUserId || null,
      customerEmail: body.customerEmail || body.contactEmail || user?.email || "",
      customerName: body.customerName || body.leadGuest || user?.name || "",
      bookingReference: body.bookingReference || bookingId,
      travellandaReference: body.travellandaReference || "",
      yourReference: body.yourReference || body.bookingReference || bookingId,
      supplier,
      supplierHotelId: body.supplierHotelId || "",
      supplierRateKey: body.supplierRateKey || "",
      supplierBookingReference: body.supplierBookingReference || "",
      hotelId: toNumber(body.hotelId),
      hotelName: body.hotelName || "",
      location: body.location || "",
      checkInDate: toDate(body.checkInDate),
      checkOutDate: toDate(body.checkOutDate),
      rooms: Array.isArray(body.rooms) ? body.rooms : [],
      travelers: Array.isArray(body.travelers) ? body.travelers : [],
      leadGuest: body.leadGuest || "Guest",
      contactEmail: body.contactEmail || user?.email || "",
      contactPhone: body.contactPhone || "",
      totalPrice,
      netPrice: toNumber(body.netPrice, totalPrice),
      markupAmount: toNumber(body.markupAmount),
      markupPercent: toNumber(body.markupPercent),
      commissionAmount: toNumber(body.commissionAmount),
      finalSellingPrice,
      currency: body.currency || "USD",
      paymentMethodType: body.paymentMethodType || "card",
      agencyBalanceBefore: toNumber(body.agencyBalanceBefore),
      agencyBalanceAfter: toNumber(body.agencyBalanceAfter),
      creditLimitUsed: toNumber(body.creditLimitUsed),
      status: bookingStatus,
      bookingStatus,
      paymentStatus: !stripeCheckoutEnabled
        ? "not_required_for_test"
        : body.paymentStatus || "pending",
      supplierStatus: shouldSubmitTboCertificationBooking
        ? "pending"
        : internalOnlyBooking
        ? "not_started"
        : body.supplierStatus || "not_started",
      specialRequests: body.specialRequests || "",
      cancellationPolicies: Array.isArray(body.cancellationPolicies)
        ? body.cancellationPolicies
        : [],
      alerts: Array.isArray(body.alerts) ? body.alerts : [],
      restrictions: Array.isArray(body.restrictions) ? body.restrictions : [],
      stripeSessionId: body.stripeSessionId || "",
      stripeCheckoutSessionId: body.stripeCheckoutSessionId || "",
      stripePaymentIntentId: body.stripePaymentIntentId || "",
      failureReason: body.failureReason || "",
      rawSupplierRequest: body.rawSupplierRequest ?? null,
      rawSupplierResponse: body.rawSupplierResponse ?? null,
      idempotencyKey: body.idempotencyKey || `booking-${bookingId}`,
      retryCount: 0,
      maxRetryCount: 3,
      metadata: {
        ...(body.metadata || {}),
        bookingMode: internalOnlyBooking ? "internal_only" : "payment_or_supplier_flow",
        tboBookingEnabled,
        tboCertificationMode,
        stripeBypassedForCertification:
          shouldSubmitTboCertificationBooking && !stripeCheckoutEnabled,
        stripeCheckoutEnabled,
        supplierSubmission: shouldSubmitTboCertificationBooking
          ? "pending_supplier_submission"
          : "not_sent_to_supplier",
      },
      createdAt: now,
      updatedAt: now,
    };

    const bookingsCollection = db.collection<BookingDocument>("bookings");
    await bookingsCollection.insertOne(booking);
    await createLog({
      type: "booking_created",
      status: "success",
      message: "Internal booking created before payment",
      request: {
        hotelId: body.hotelId,
        hotelName: body.hotelName,
        checkInDate: body.checkInDate,
        checkOutDate: body.checkOutDate,
        totalPrice: body.totalPrice,
        currency: body.currency,
        supplier: body.supplier || "none",
        channel,
      },
      response: {
        bookingId,
        bookingReference: booking.bookingReference,
        channel: booking.channel,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        supplierStatus: booking.supplierStatus,
      },
    });

    const responseBooking = shouldSubmitTboCertificationBooking
      ? await submitTboCertificationBooking({
          bookingsCollection,
          booking,
          stripeCheckoutEnabled,
          tboBookingEnabled,
        })
      : booking;

    return NextResponse.json(
      {
        success: true,
        message: "Booking created successfully",
        booking: responseBooking,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create booking",
      },
      { status: 500 },
    );
  }
}
