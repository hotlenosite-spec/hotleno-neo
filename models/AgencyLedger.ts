import mongoose, { Schema, Document } from 'mongoose';

export const AGENCY_LEDGER_TYPES = [
  'credit',
  'debit',
  'hold',
  'release',
  'adjustment',
  'refund',
] as const;

export const AGENCY_LEDGER_STATUSES = [
  'pending',
  'completed',
  'failed',
  'cancelled',
] as const;

export type AgencyLedgerType = (typeof AGENCY_LEDGER_TYPES)[number];
export type AgencyLedgerStatus = (typeof AGENCY_LEDGER_STATUSES)[number];

export interface IAgencyLedger extends Document {
  agencyId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  type: AgencyLedgerType;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  status: AgencyLedgerStatus;
  reason: string;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AgencyLedgerSchema: Schema<IAgencyLedger> = new Schema(
  {
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: AGENCY_LEDGER_TYPES,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      required: true,
      default: 'USD',
      minlength: 3,
      maxlength: 3,
    },
    balanceBefore: {
      type: Number,
      required: true,
      default: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: AGENCY_LEDGER_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    reason: {
      type: String,
      required: true,
      default: '',
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

AgencyLedgerSchema.index({ agencyId: 1, createdAt: -1 });
AgencyLedgerSchema.index({ agencyId: 1, status: 1, createdAt: -1 });
AgencyLedgerSchema.index({ bookingId: 1, type: 1 });

const AgencyLedger =
  mongoose.models.AgencyLedger ||
  mongoose.model<IAgencyLedger>('AgencyLedger', AgencyLedgerSchema);

export default AgencyLedger;
