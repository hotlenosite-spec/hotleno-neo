import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { BOOKING_STATUSES } from "@/lib/booking-status";
import dbConnect from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  amount: z.number().positive(),
  bookingId: z.string().min(1),
  description: z.string().min(1).max(500).optional(),
  currency: z.string().min(3).max(3).optional(),
  locale: z.string().min(2).max(10).optional(),
});

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

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(req, {
      keyPrefix: "payments:stripe-checkout",
      limit: 15,
      windowMs: 60_000,
    });

    if (rateLimitResponse) return rateLimitResponse;

    if (process.env.STRIPE_CHECKOUT_ENABLED !== "true") {
      return NextResponse.json(
        { error: "Stripe checkout is not enabled" },
        { status: 503 },
      );
    }

    const body = await req.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const {
      amount,
      bookingId,
      description = "Hotleno booking payment",
      currency = "usd",
      locale = "en",
    } = validation.data;

    await dbConnect();
    const booking = await Booking.findById(bookingId).select("_id");

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 },
      );
    }

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const safeLocale = locale.replace(/[^a-zA-Z-]/g, "") || "en";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${origin}/${safeLocale}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${safeLocale}/payment/cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: description,
            },
          },
        },
      ],
      metadata: {
        bookingId,
        nextStatus: "payment_succeeded",
        supportedStatuses: BOOKING_STATUSES.join(","),
      },
      payment_intent_data: {
        metadata: {
          bookingId,
          nextStatus: "payment_succeeded",
        },
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout";
    const status =
      message === "Stripe is not configured" ||
      message === "Stripe test mode is required"
        ? 500
        : 400;

    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status });
  }
}
