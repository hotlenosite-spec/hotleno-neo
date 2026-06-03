import mongoose, { Schema, Document } from 'mongoose';

export const PROMO_CODE_STATUSES = ['active', 'inactive', 'expired'] as const;
export type PromoCodeStatus = (typeof PROMO_CODE_STATUSES)[number];

export interface IPromoCode extends Document {
  affiliateId?: mongoose.Types.ObjectId;
  code: string;
  description?: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  currency: string;
  status: PromoCodeStatus;
  maxUses: number;
  usedCount: number;
  startsAt?: Date;
  endsAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema: Schema<IPromoCode> = new Schema(
  {
    affiliateId: {
      type: Schema.Types.ObjectId,
      ref: 'Affiliate',
      default: null,
      index: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['percent', 'fixed'],
      default: 'percent',
    },
    discountValue: {
      type: Number,
      default: 0,
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
      enum: PROMO_CODE_STATUSES,
      default: 'active',
      index: true,
    },
    maxUses: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
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

const PromoCode =
  mongoose.models.PromoCode ||
  mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);

export default PromoCode;
