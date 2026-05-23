import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom {
  roomId: number;
  roomName: string;
  adults: number;
  children: number;
}

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  bookingReference: string;
  travellandaReference?: string;
  yourReference: string;
  hotelId: number;
  hotelName: string;
  location: string;
  checkInDate: Date;
  checkOutDate: Date;
  rooms: IRoom[];
  leadGuest: string;
  contactEmail: string;
  contactPhone?: string;
  totalPrice: number;
  currency: string;
  status: 'confirmed' | 'pending' | 'onrequest' | 'cancelled' | 'rejected' | 'completed';
  specialRequests?: string;
  cancellationPolicies?: unknown[];
  alerts?: unknown[];
  restrictions?: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema: Schema<IRoom> = new Schema({
  roomId: { type: Number, required: true },
  roomName: { type: String, required: true },
  adults: { type: Number, required: true },
  children: { type: Number, default: 0 },
}, { _id: false });

const BookingSchema: Schema<IBooking> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bookingReference: {
      type: String,
      required: true,
      unique: true,
    },
    travellandaReference: {
      type: String,
      default: '',
    },
    yourReference: {
      type: String,
      required: true,
    },
    hotelId: {
      type: Number,
      required: true,
    },
    hotelName: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
    },
    rooms: [RoomSchema],
    leadGuest: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
    },
    contactPhone: {
      type: String,
      default: '',
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['confirmed', 'pending', 'onrequest', 'cancelled', 'rejected', 'completed'],
      default: 'pending',
    },
    specialRequests: {
      type: String,
      default: '',
    },
    cancellationPolicies: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    alerts: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    restrictions: {
      type: [Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
BookingSchema.index({ userId: 1, createdAt: -1 });
BookingSchema.index({ bookingReference: 1 });

const Booking = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;