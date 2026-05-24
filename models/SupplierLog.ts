import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplierLog extends Document {
  bookingId?: mongoose.Types.ObjectId;
  supplier?: string;
  type: string;
  status: 'started' | 'pending' | 'success' | 'failed' | 'skipped';
  message: string;
  request?: unknown;
  response?: unknown;
  error?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierLogSchema: Schema<ISupplierLog> = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
    supplier: {
      type: String,
      default: 'none',
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['started', 'pending', 'success', 'failed', 'skipped'],
      required: true,
    },
    message: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
  },
);

const SupplierLog =
  mongoose.models.SupplierLog ||
  mongoose.model<ISupplierLog>('SupplierLog', SupplierLogSchema);

export default SupplierLog;
