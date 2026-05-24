import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import Booking from "@/models/Booking";
import PaymentLog from "@/models/PaymentLog";
import SupplierLog from "@/models/SupplierLog";

export const runtime = "nodejs";

const paidBookingStatuses = new Set([
  "payment_succeeded",
  "supplier_booking_pending",
  "supplier_booking_confirmed",
]);

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const stripeMode = process.env.STRIPE_MODE ?? process.env.STRIPE_ENV;

  if (!secretKey) {
    throw new Error("Stripe is not configured");
  }

  if (stripeMode !== "test" || !secretKey.startsWith("sk_test_")) {
    throw new Error("Stripe test mode is required");
  }

  return new Stripe(secretKey);
}

function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Stripe webhook is not configured");
  }

  return webhookSecret;
}

function getPaymentIntentId(
  paymentIntent: Stripe.Checkout.Session["payment_intent"],
) {
  if (!paymentIntent) return "";
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

function getSucceededPaymentData(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    return {
      bookingId: session.metadata?.bookingId ?? "",
      stripeSessionId: session.id,
      stripePaymentIntentId: getPaymentIntentId(session.payment_intent),
      amount: session.amount_total ? session.amount_total / 100 : undefined,
      currency: session.currency?.toUpperCase(),
    };
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  return {
    bookingId: paymentIntent.metadata?.bookingId ?? "",
    stripeSessionId: "",
    stripePaymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount_received
      ? paymentIntent.amount_received / 100
      : undefined,
    currency: paymentIntent.currency?.toUpperCase(),
  };
}

function getFailedPaymentData(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  return {
    bookingId: paymentIntent.metadata?.bookingId ?? "",
    stripePaymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount ? paymentIntent.amount / 100 : undefined,
    currency: paymentIntent.currency?.toUpperCase(),
    failureReason:
      paymentIntent.last_payment_error?.message ?? "Stripe payment failed",
  };
}

async function createPaymentLog(params: {
  event: Stripe.Event;
  bookingId?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  status: "processed" | "skipped" | "failed";
  amount?: number;
  currency?: string;
  message?: string;
  error?: unknown;
}) {
  return PaymentLog.create({
    bookingId: params.bookingId || undefined,
    type: params.event.type,
    stripeEventId: params.event.id,
    stripeEventType: params.event.type,
    stripeSessionId: params.stripeSessionId ?? "",
    stripePaymentIntentId: params.stripePaymentIntentId ?? "",
    status: params.status,
    amount: params.amount,
    currency: params.currency,
    message: params.message,
    request: {
      eventId: params.event.id,
      eventType: params.event.type,
      livemode: params.event.livemode,
    },
    response: {
      bookingId: params.bookingId || null,
      stripeSessionId: params.stripeSessionId ?? "",
      stripePaymentIntentId: params.stripePaymentIntentId ?? "",
      amount: params.amount,
      currency: params.currency,
    },
    error: params.error ?? null,
    rawEvent: {
      id: params.event.id,
      type: params.event.type,
      livemode: params.event.livemode,
      created: params.event.created,
    },
  });
}

async function alreadyHandled(eventId: string) {
  return PaymentLog.exists({ stripeEventId: eventId });
}

async function handlePaymentSucceeded(event: Stripe.Event) {
  const data = getSucceededPaymentData(event);

  if (await alreadyHandled(event.id)) {
    return { handled: true, duplicate: true };
  }

  if (!data.bookingId) {
    await createPaymentLog({
      event,
      status: "failed",
      stripeSessionId: data.stripeSessionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      amount: data.amount,
      currency: data.currency,
      message: "Missing bookingId in Stripe metadata",
      error: { code: "missing_booking_id" },
    });
    return { handled: true, missingBookingId: true };
  }

  const booking = await Booking.findById(data.bookingId);

  if (!booking) {
    await createPaymentLog({
      event,
      bookingId: data.bookingId,
      status: "failed",
      stripeSessionId: data.stripeSessionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      amount: data.amount,
      currency: data.currency,
      message: "Booking not found",
      error: { code: "booking_not_found" },
    });
    return { handled: true, bookingNotFound: true };
  }

  if (booking.paymentStatus === "paid" && paidBookingStatuses.has(booking.status)) {
    await createPaymentLog({
      event,
      bookingId: data.bookingId,
      status: "skipped",
      stripeSessionId: data.stripeSessionId || booking.stripeSessionId,
      stripePaymentIntentId:
        data.stripePaymentIntentId || booking.stripePaymentIntentId,
      amount: data.amount,
      currency: data.currency,
      message: "Booking payment was already processed",
    });
    return { handled: true, alreadyPaid: true };
  }

  booking.status = "supplier_booking_pending";
  booking.paymentStatus = "paid";
  booking.supplierStatus = "pending";
  if (data.stripeSessionId) {
    booking.stripeSessionId = data.stripeSessionId;
    booking.stripeCheckoutSessionId = data.stripeSessionId;
  }
  if (data.stripePaymentIntentId) {
    booking.stripePaymentIntentId = data.stripePaymentIntentId;
  }
  booking.metadata = {
    ...(booking.metadata ?? {}),
    paymentSucceededAt: new Date().toISOString(),
    supplierBookingMode: "pending_without_real_supplier",
  };

  await booking.save();

  await createPaymentLog({
    event,
    bookingId: data.bookingId,
    status: "processed",
    stripeSessionId: data.stripeSessionId,
    stripePaymentIntentId: data.stripePaymentIntentId,
    amount: data.amount,
    currency: data.currency,
    message:
      "Payment succeeded; supplier booking is pending and no real supplier was called",
  });

  await SupplierLog.create({
    bookingId: booking._id,
    supplier: booking.supplier || "none",
    type: "supplier_booking_start",
    status: "pending",
    message:
      "Supplier booking marked pending after payment; no real supplier was called",
    request: {
      supplier: booking.supplier || "none",
      supplierHotelId: booking.supplierHotelId || "",
      supplierRateKey: booking.supplierRateKey || "",
      mode: "placeholder",
    },
    response: {
      bookingStatus: booking.status,
      supplierStatus: booking.supplierStatus,
    },
  });

  if (
    process.env.MOCK_SUPPLIER_BOOKING_ENABLED === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    booking.status = "supplier_booking_confirmed";
    booking.supplierStatus = "confirmed";
    booking.supplierBookingReference = `MOCK-SUP-${booking._id.toString()}`;
    booking.metadata = {
      ...(booking.metadata ?? {}),
      mockSupplierBookingSucceededAt: new Date().toISOString(),
    };
    await booking.save();

    await SupplierLog.create({
      bookingId: booking._id,
      supplier: "mock",
      type: "supplier_booking_success",
      status: "success",
      message: "Mock supplier booking completed for local development",
      request: {
        supplier: "mock",
        mode: "local_development_only",
      },
      response: {
        supplierBookingReference: booking.supplierBookingReference,
        bookingStatus: booking.status,
        supplierStatus: booking.supplierStatus,
      },
    });
  }

  return { handled: true, processed: true };
}

async function handlePaymentFailed(event: Stripe.Event) {
  const data = getFailedPaymentData(event);

  if (await alreadyHandled(event.id)) {
    return { handled: true, duplicate: true };
  }

  if (data.bookingId) {
    await Booking.findByIdAndUpdate(data.bookingId, {
      status: "cancelled",
      paymentStatus: "failed",
      stripePaymentIntentId: data.stripePaymentIntentId,
      failureReason: data.failureReason,
    });
  }

  await createPaymentLog({
    event,
    bookingId: data.bookingId,
    status: data.bookingId ? "processed" : "failed",
    stripePaymentIntentId: data.stripePaymentIntentId,
    amount: data.amount,
    currency: data.currency,
    message: data.bookingId
      ? data.failureReason
      : "Missing bookingId in Stripe metadata",
    error: data.bookingId ? null : { code: "missing_booking_id" },
  });

  return { handled: true, processed: true };
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    const webhookSecret = getWebhookSecret();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe signature" },
        { status: 400 },
      );
    }

    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook verification failed";

    console.error("Stripe webhook error:", message);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  try {
    await dbConnect();

    switch (event.type) {
      case "checkout.session.completed":
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event);
        break;

      default:
        if (!(await alreadyHandled(event.id))) {
          await createPaymentLog({
            event,
            status: "skipped",
            message: "Unhandled Stripe event type",
          });
        }
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handling failed";

    console.error("Stripe webhook handler error:", message);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
