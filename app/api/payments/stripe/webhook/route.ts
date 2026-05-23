import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const pendingSupplierStatus = "payment_succeeded_pending_supplier_booking";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const stripeEnv = process.env.STRIPE_ENV;

  if (!secretKey) {
    throw new Error("Stripe is not configured");
  }

  if (stripeEnv !== "test" || !secretKey.startsWith("sk_test_")) {
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

async function markPaymentPendingSupplierBooking(params: {
  stripeSessionId?: string | null;
  paymentIntentId?: string | null;
  bookingId?: string | null;
}) {
  console.info("Stripe payment accepted:", {
    bookingId: params.bookingId ?? null,
    stripeSessionId: params.stripeSessionId ?? null,
    paymentIntentId: params.paymentIntentId ?? null,
    status: pendingSupplierStatus,
  });
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
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        await markPaymentPendingSupplierBooking({
          stripeSessionId: session.id,
          paymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id,
          bookingId: session.metadata?.bookingId,
        });
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await markPaymentPendingSupplierBooking({
          paymentIntentId: paymentIntent.id,
          bookingId: paymentIntent.metadata?.bookingId,
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        console.info("Stripe payment failed:", {
          paymentIntentId: paymentIntent.id,
          bookingId: paymentIntent.metadata?.bookingId ?? null,
          status: "payment_failed",
        });
        break;
      }

      default:
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
