import mongoose, { Schema, Document } from 'mongoose';

export const AFFILIATE_STATUSES = [
  'pending',
  'active',
  'suspended',
  'rejected',
] as const;

export type AffiliateStatus = (typeof AFFILIATE_STATUSES)[number];

export interface IAffiliate extends Document {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  referralCode: string;
  status: AffiliateStatus;
  commissionRate: number;
  currency: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AffiliateSchema: Schema<IAffiliate> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    referralCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: AFFILIATE_STATUSES,
      default: 'pending',
      index: true,
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'USD',
      minlength: 3,
      maxlength: 3,
    },
    notes: {
      type: String,
      default: '',
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

AffiliateSchema.index({ status: 1, createdAt: -1 });

const Affiliate =
  mongoose.models.Affiliate ||
  mongoose.model<IAffiliate>('Affiliate', AffiliateSchema);

export default Affiliate;
