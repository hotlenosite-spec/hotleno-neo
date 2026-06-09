import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { Document } from "mongodb";
import { getFirestoreMongoDb } from "@/lib/firestore-mongo";
import { getUserById } from "@/lib/firebase-store";
import { verifyToken } from "@/lib/jwt";
import { requireStaffPermission } from "@/lib/staff-permissions";

export const runtime = "nodejs";

type BookingDocument = Document & {
  _id: string;
  customerEmail?: string;
  contactEmail?: string;
  currency?: string;
};

type PaymentAdjustmentDocument = Document & {
  _id: string;
  bookingId: string;
  amount?: number;
  currency?: string;
  status?: string;
};

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: "No token provided", status: 401 } as const;

  const decoded = verifyToken(token);
  const user = await getUserById(decoded.userId);
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized - Admin access required", status: 403 } as const;
  }

  return { user, decoded } as const;
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const stripeMode = process.env.STRIPE_MODE ?? process.env.STRIPE_ENV;
  if (!secretKey) throw new Error("Stripe is not configured");
  if (stripeMode !== "test" || !secretKey.startsWith("sk_test_")) {
    throw new Error("Stripe test mode is required");
  }
  return new Stripe(secretKey);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    if (!(await requireStaffPermission(req, "payments.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const auth = await requireAdmin(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const db = await getFirestoreMongoDb();
    const booking = await db
      .collection<BookingDocument>("bookings")
      .findOne({ _id: bookingId });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const adjustments = db.collection<PaymentAdjustmentDocument>("payment_adjustments");
    const existingAdjustment = await adjustments.findOne(
      {
        bookingId,
        status: { $in: ["pending", "payment_link_not_created_stripe_disabled"] },
      },
      { sort: { createdAt: -1 } },
    );
    const amount = Number(body.amount ?? existingAdjustment?.amount ?? 0);
    const currency = String(body.currency ?? existingAdjustment?.currency ?? booking.currency ?? "USD");
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "No positive payment adjustment was found" },
        { status: 400 },
      );
    }
    if (!reason) {
      return NextResponse.json({ error: "Payment adjustment reason is required" }, { status: 400 });
    }

    const now = new Date();
    const adjustmentId = existingAdjustment?._id || `adjustment-${bookingId}-${Date.now()}`;
    const stripeEnabled =
      process.env.STRIPE_CHECKOUT_ENABLED === "true" ||
      process.env.NEXT_PUBLIC_ENABLE_STRIPE_CHECKOUT === "true";

    if (!stripeEnabled) {
      await adjustments.updateOne(
        { _id: adjustmentId },
        {
          $set: {
            bookingId,
            customerEmail: booking.customerEmail || booking.contactEmail || "",
            amount,
            currency,
            reason,
            status: "payment_link_not_created_stripe_disabled",
            message: "Stripe checkout is disabled",
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      return NextResponse.json({
        success: true,
        paymentUrl: "",
        adjustmentId,
        status: "payment_link_not_created_stripe_disabled",
        message: "Stripe غير مفعّل، لم يتم إنشاء رابط الدفع.",
      });
    }

    const stripe = getStripeClient();
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `HOTLENO booking amendment ${bookingId}`,
            },
          },
        },
      ],
      metadata: {
        bookingId,
        adjustmentId,
        paymentPurpose: "booking_amendment_difference",
      },
      payment_intent_data: {
        metadata: {
          bookingId,
          adjustmentId,
          paymentPurpose: "booking_amendment_difference",
        },
      },
    });

    await adjustments.updateOne(
      { _id: adjustmentId },
      {
        $set: {
          bookingId,
          customerEmail: booking.customerEmail || booking.contactEmail || "",
          amount,
          currency,
          reason,
          status: "pending",
          paymentUrl: session.url || "",
          stripeSessionId: session.id,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    await db.collection<BookingDocument>("bookings").updateOne(
      { _id: bookingId },
      {
        $set: {
          "metadata.latestPaymentAdjustmentId": adjustmentId,
          "metadata.latestPaymentAdjustmentUrl": session.url || "",
          updatedAt: now,
        },
      },
    );

    return NextResponse.json({
      success: true,
      paymentUrl: session.url,
      adjustmentId,
      status: "pending",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create payment link";
    console.error("[admin/bookings/payment-link] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
