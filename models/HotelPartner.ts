import mongoose, { Schema, Document } from 'mongoose';

export const HOTEL_PARTNER_STATUSES = [
  'pending',
  'active',
  'suspended',
  'rejected',
] as const;

export const HOTEL_PARTNER_VERIFICATION_STATUSES = [
  'unverified',
  'pending_review',
  'verified',
  'rejected',
] as const;

export type HotelPartnerStatus = (typeof HOTEL_PARTNER_STATUSES)[number];
export type HotelPartnerVerificationStatus =
  (typeof HOTEL_PARTNER_VERIFICATION_STATUSES)[number];

export interface IHotelPartner extends Document {
  companyName: string;
  legalName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city: string;
  address: string;
  status: HotelPartnerStatus;
  verificationStatus: HotelPartnerVerificationStatus;
  commissionRate: number;
  payoutMethod: string;
  payoutDetails?: Record<string, unknown>;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const HotelPartnerSchema: Schema<IHotelPartner> = new Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Please provide a hotel partner company name'],
      trim: true,
    },
    legalName: {
      type: String,
      trim: true,
      default: '',
    },
    contactName: {
      type: String,
      trim: true,
      default: '',
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
      index: true,
    },
    contactPhone: {
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
    address: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: HOTEL_PARTNER_STATUSES,
      default: 'pending',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: HOTEL_PARTNER_VERIFICATION_STATUSES,
      default: 'unverified',
      index: true,
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    payoutMethod: {
      type: String,
      trim: true,
      default: '',
    },
    payoutDetails: {
      type: Schema.Types.Mixed,
      default: {},
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

HotelPartnerSchema.index({ companyName: 1 });
HotelPartnerSchema.index({ status: 1, verificationStatus: 1, createdAt: -1 });

const HotelPartner =
  mongoose.models.HotelPartner ||
  mongoose.model<IHotelPartner>('HotelPartner', HotelPartnerSchema);

export default HotelPartner;
