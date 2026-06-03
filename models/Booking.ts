import mongoose, { Schema, Document } from 'mongoose';
import { BOOKING_STATUSES, type BookingStatus } from '@/lib/booking-status';

export interface IRoom {
  roomId: number;
  roomName: string;
  adults: number;
  children: number;
}

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  channel: 'b2c' | 'b2b';
  inventorySource: 'supplier' | 'hotel_partner';
  agencyId?: mongoose.Types.ObjectId;
  agencyUserId?: mongoose.Types.ObjectId;
  agencyRole?: string;
  agentName?: string;
  customerUserId?: mongoose.Types.ObjectId;
  customerEmail?: string;
  customerName?: string;
  hotelPartnerId?: mongoose.Types.ObjectId;
  hotelPropertyId?: mongoose.Types.ObjectId;
  hotelRoomId?: mongoose.Types.ObjectId;
  hotelRateId?: mongoose.Types.ObjectId;
  hotelAvailabilityId?: mongoose.Types.ObjectId;
  hotelPartnerBookingStatus?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  hotelPartnerNotes?: string;
  bookingReference: string;
  travellandaReference?: string;
  yourReference: string;
  supplier: string;
  supplierHotelId?: string;
  supplierRateKey?: string;
  supplierBookingReference?: string;
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
  netPrice: number;
  markupAmount: number;
  markupPercent: number;
  commissionAmount: number;
  finalSellingPrice: number;
  currency: string;
  paymentMethodType: 'card' | 'agency_balance' | 'bank_transfer';
  agencyBalanceBefore: number;
  agencyBalanceAfter: number;
  creditLimitUsed: number;
  status: BookingStatus;
  paymentStatus: 'pending' | 'paid' | 'succeeded' | 'failed' | 'cancelled' | 'refund_required' | 'refund_pending' | 'refunded';
  supplierStatus: 'not_started' | 'pending' | 'confirmed' | 'failed' | 'cancelled';
  stripeSessionId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  failureReason?: string;
  rawSupplierRequest?: unknown;
  rawSupplierResponse?: unknown;
  idempotencyKey?: string;
  retryCount: number;
  maxRetryCount: number;
  lastRetryAt?: Date;
  lastFailureReason?: string;
  metadata?: Record<string, unknown>;
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
    channel: {
      type: String,
      enum: ['b2c', 'b2b'],
      default: 'b2c',
      index: true,
    },
    inventorySource: {
      type: String,
      enum: ['supplier', 'hotel_partner'],
      default: 'supplier',
      index: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      default: null,
      index: true,
    },
    agencyUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    agencyRole: {
      type: String,
      default: '',
      trim: true,
    },
    agentName: {
      type: String,
      default: '',
      trim: true,
    },
    customerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    customerName: {
      type: String,
      trim: true,
      default: '',
    },
    hotelPartnerId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelPartner',
      default: null,
      index: true,
    },
    hotelPropertyId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelProperty',
      default: null,
      index: true,
    },
    hotelRoomId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelRoom',
      default: null,
      index: true,
    },
    hotelRateId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelRoomRate',
      default: null,
      index: true,
    },
    hotelAvailabilityId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelRoomAvailability',
      default: null,
      index: true,
    },
    hotelPartnerBookingStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },
    hotelPartnerNotes: {
      type: String,
      default: '',
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
    supplier: {
      type: String,
      required: true,
      default: 'none',
      trim: true,
    },
    supplierHotelId: {
      type: String,
      default: '',
      trim: true,
    },
    supplierRateKey: {
      type: String,
      default: '',
    },
    supplierBookingReference: {
      type: String,
      default: '',
      trim: true,
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
    netPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    markupAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    markupPercent: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalSellingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
    },
    paymentMethodType: {
      type: String,
      enum: ['card', 'agency_balance', 'bank_transfer'],
      default: 'card',
    },
    agencyBalanceBefore: {
      type: Number,
      default: 0,
    },
    agencyBalanceAfter: {
      type: Number,
      default: 0,
    },
    creditLimitUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending_payment',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'succeeded', 'failed', 'cancelled', 'refund_required', 'refund_pending', 'refunded'],
      default: 'pending',
    },
    supplierStatus: {
      type: String,
      enum: ['not_started', 'pending', 'confirmed', 'failed', 'cancelled'],
      default: 'not_started',
    },
    stripeSessionId: {
      type: String,
      default: '',
    },
    stripeCheckoutSessionId: {
      type: String,
      default: '',
    },
    stripePaymentIntentId: {
      type: String,
      default: '',
    },
    failureReason: {
      type: String,
      default: '',
    },
    rawSupplierRequest: {
      type: Schema.Types.Mixed,
      default: null,
    },
    rawSupplierResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },
    idempotencyKey: {
      type: String,
      default: '',
      trim: true,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRetryCount: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    lastRetryAt: {
      type: Date,
      default: null,
    },
    lastFailureReason: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

BookingSchema.pre('validate', function ensureIdempotencyKey(next) {
  if (!this.idempotencyKey) {
    const randomPart =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.idempotencyKey = `booking-${this._id?.toString() || randomPart}`;
  }

  next();
});

// Index for faster queries
BookingSchema.index({ userId: 1, createdAt: -1 });
BookingSchema.index({ channel: 1, createdAt: -1 });
BookingSchema.index({ agencyId: 1, createdAt: -1 });
BookingSchema.index({ customerUserId: 1, createdAt: -1 });
BookingSchema.index({ inventorySource: 1, createdAt: -1 });
BookingSchema.index({ hotelPartnerId: 1, createdAt: -1 });
BookingSchema.index({ hotelPropertyId: 1, createdAt: -1 });
BookingSchema.index({ supplier: 1, supplierBookingReference: 1 });
BookingSchema.index({ idempotencyKey: 1 });

const Booking = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
