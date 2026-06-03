import mongoose, { Schema, Document } from "mongoose";

export interface ITransferBooking extends Document {
  bookingReference: string;
  clientReference?: string;
  supplier: "hotelbeds-transfers";
  status: string;
  amount?: number;
  currency?: string;
  pickup?: Record<string, unknown>;
  dropoff?: Record<string, unknown>;
  pickupDateTime?: string;
  holder?: Record<string, unknown>;
  selectedService?: Record<string, unknown>;
  voucherData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TransferBookingSchema = new Schema<ITransferBooking>(
  {
    bookingReference: { type: String, required: true, index: true, unique: true },
    clientReference: { type: String, default: "", index: true },
    supplier: {
      type: String,
      enum: ["hotelbeds-transfers"],
      default: "hotelbeds-transfers",
      index: true,
    },
    status: { type: String, required: true, index: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "" },
    pickup: { type: Schema.Types.Mixed, default: null },
    dropoff: { type: Schema.Types.Mixed, default: null },
    pickupDateTime: { type: String, default: "" },
    holder: { type: Schema.Types.Mixed, default: null },
    selectedService: { type: Schema.Types.Mixed, default: null },
    voucherData: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

TransferBookingSchema.index({ supplier: 1, bookingReference: 1 });

const TransferBooking =
  mongoose.models.TransferBooking ||
  mongoose.model<ITransferBooking>("TransferBooking", TransferBookingSchema);

export default TransferBooking;
