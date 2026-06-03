import mongoose, { Schema, Document } from 'mongoose';

export const AFFILIATE_COMMISSION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'paid',
  'cancelled',
] as const;

export type AffiliateCommissionStatus =
  (typeof AFFILIATE_COMMISSION_STATUSES)[number];

export interface IAffiliateCommission extends Document {
  affiliateId: mongoose.Types.ObjectId;
  referralId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  bookingReference?: string;
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
  status: AffiliateCommissionStatus;
  calculationMode: 'mock' | 'booking_confirmed';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AffiliateCommissionSchema: Schema<IAffiliateCommission> = new Schema(
  {
    affiliateId: {
      type: Schema.Types.ObjectId,
      ref: 'Affiliate',
      required: true,
      index: true,
    },
    referralId: {
      type: Schema.Types.ObjectId,
      ref: 'Referral',
      default: null,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    bookingReference: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'USD',
      minlength: 3,
      maxlength: 3,
    },
    status: {
      type: String,
      enum: AFFILIATE_COMMISSION_STATUSES,
      default: 'pending',
      index: true,
    },
    calculationMode: {
      type: String,
      enum: ['mock', 'booking_confirmed'],
      default: 'mock',
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

AffiliateCommissionSchema.index({ affiliateId: 1, createdAt: -1 });

const AffiliateCommission =
  mongoose.models.AffiliateCommission ||
  mongoose.model<IAffiliateCommission>(
    'AffiliateCommission',
    AffiliateCommissionSchema,
  );

export default AffiliateCommission;
