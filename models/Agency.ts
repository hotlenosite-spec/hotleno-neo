import mongoose, { Schema, Document } from 'mongoose';

export const AGENCY_STATUSES = [
  'pending',
  'active',
  'suspended',
  'rejected',
] as const;

export type AgencyStatus = (typeof AGENCY_STATUSES)[number];

export interface IAgency extends Document {
  name: string;
  commercialName: string;
  country: string;
  city: string;
  phone: string;
  email: string;
  status: AgencyStatus;
  commissionRate: number;
  markupRate: number;
  creditLimit: number;
  balance: number;
  currency: string;
  apiKeyHash?: string;
  apiKeyPrefix?: string;
  apiEnabled: boolean;
  apiKeyLastUsedAt?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AgencySchema: Schema<IAgency> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide an agency name'],
      trim: true,
    },
    commercialName: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    city: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: AGENCY_STATUSES,
      default: 'pending',
      index: true,
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    markupRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'USD',
      minlength: 3,
      maxlength: 3,
    },
    apiKeyHash: {
      type: String,
      default: '',
      select: false,
      index: true,
    },
    apiKeyPrefix: {
      type: String,
      default: '',
      trim: true,
    },
    apiEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    apiKeyLastUsedAt: {
      type: Date,
      default: null,
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

AgencySchema.index({ name: 1 });
AgencySchema.index({ status: 1, createdAt: -1 });

const Agency =
  mongoose.models.Agency || mongoose.model<IAgency>('Agency', AgencySchema);

export default Agency;
