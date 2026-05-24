import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentLog extends Document {
  bookingId?: mongoose.Types.ObjectId;
  type: string;
  stripeEventId: string;
  stripeEventType: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  provider: 'stripe';
  status: 'processed' | 'skipped' | 'failed';
  amount?: number;
  currency?: string;
  message?: string;
  request?: unknown;
  response?: unknown;
  error?: unknown;
  rawEvent?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLogSchema: Schema<IPaymentLog> = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
    type: {
      type: String,
      required: true,
      default: 'stripe_webhook',
      index: true,
    },
    stripeEventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stripeEventType: {
      type: String,
      required: true,
    },
    stripeSessionId: {
      type: String,
      default: '',
    },
    stripePaymentIntentId: {
      type: String,
      default: '',
    },
    provider: {
      type: String,
      enum: ['stripe'],
      default: 'stripe',
    },
    status: {
      type: String,
      enum: ['processed', 'skipped', 'failed'],
      required: true,
    },
    amount: {
      type: Number,
    },
    currency: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      default: '',
    },
    request: {
      type: Schema.Types.Mixed,
      default: null,
    },
    response: {
      type: Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: Schema.Types.Mixed,
      default: null,
    },
    rawEvent: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const PaymentLog =
  mongoose.models.PaymentLog ||
  mongoose.model<IPaymentLog>('PaymentLog', PaymentLogSchema);

export default PaymentLog;
