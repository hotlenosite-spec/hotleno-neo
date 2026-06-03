import mongoose, { Schema, Document } from 'mongoose';

export const REFERRAL_STATUSES = [
  'tracked',
  'converted',
  'expired',
  'cancelled',
] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export interface IReferral extends Document {
  affiliateId: mongoose.Types.ObjectId;
  referralCode: string;
  promoCode?: string;
  visitorId?: string;
  sessionId?: string;
  source?: string;
  landingPage?: string;
  bookingId?: mongoose.Types.ObjectId;
  status: ReferralStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema: Schema<IReferral> = new Schema(
  {
    affiliateId: {
      type: Schema.Types.ObjectId,
      ref: 'Affiliate',
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    promoCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: '',
      index: true,
    },
    visitorId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    sessionId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    source: {
      type: String,
      default: '',
      trim: true,
    },
    landingPage: {
      type: String,
      default: '',
      trim: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: REFERRAL_STATUSES,
      default: 'tracked',
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

ReferralSchema.index({ affiliateId: 1, createdAt: -1 });

const Referral =
  mongoose.models.Referral ||
  mongoose.model<IReferral>('Referral', ReferralSchema);

export default Referral;
