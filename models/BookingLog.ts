import mongoose, { Schema, Document } from 'mongoose';

export interface IBookingLog extends Document {
  bookingId?: mongoose.Types.ObjectId;
  type: string;
  status: 'started' | 'success' | 'failed' | 'skipped';
  message: string;
  request?: unknown;
  response?: unknown;
  error?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const BookingLogSchema: Schema<IBookingLog> = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['started', 'success', 'failed', 'skipped'],
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

const BookingLog =
  mongoose.models.BookingLog ||
  mongoose.model<IBookingLog>('BookingLog', BookingLogSchema);

export default BookingLog;
