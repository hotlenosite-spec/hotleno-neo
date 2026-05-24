import mongoose, { Schema, Document } from 'mongoose';

export const HOTEL_ROOM_RATE_STATUSES = ['active', 'inactive'] as const;

export type HotelRoomRateStatus = (typeof HOTEL_ROOM_RATE_STATUSES)[number];

export interface IHotelRoomRate extends Document {
  hotelPropertyId: mongoose.Types.ObjectId;
  hotelRoomId: mongoose.Types.ObjectId;
  date: Date;
  price: number;
  currency: string;
  mealPlan: string;
  cancellationPolicy: string;
  ratePlanName: string;
  status: HotelRoomRateStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const HotelRoomRateSchema: Schema<IHotelRoomRate> = new Schema(
  {
    hotelPropertyId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelProperty',
      required: true,
      index: true,
    },
    hotelRoomId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelRoom',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    price: {
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
    mealPlan: {
      type: String,
      trim: true,
      default: '',
    },
    cancellationPolicy: {
      type: String,
      default: '',
    },
    ratePlanName: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: HOTEL_ROOM_RATE_STATUSES,
      default: 'inactive',
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

HotelRoomRateSchema.index({ hotelRoomId: 1, date: 1 });
HotelRoomRateSchema.index({ hotelRoomId: 1, date: 1, status: 1 });
HotelRoomRateSchema.index({ hotelPropertyId: 1, date: 1 });

const HotelRoomRate =
  mongoose.models.HotelRoomRate ||
  mongoose.model<IHotelRoomRate>('HotelRoomRate', HotelRoomRateSchema);

export default HotelRoomRate;
