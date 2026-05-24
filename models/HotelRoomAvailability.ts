import mongoose, { Schema, Document } from 'mongoose';

export interface IHotelRoomAvailability extends Document {
  hotelPropertyId: mongoose.Types.ObjectId;
  hotelRoomId: mongoose.Types.ObjectId;
  date: Date;
  availableRooms: number;
  stopSell: boolean;
  minNights: number;
  maxNights: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const HotelRoomAvailabilitySchema: Schema<IHotelRoomAvailability> = new Schema(
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
    availableRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    stopSell: {
      type: Boolean,
      default: true,
      index: true,
    },
    minNights: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxNights: {
      type: Number,
      default: 0,
      min: 0,
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

HotelRoomAvailabilitySchema.index(
  { hotelRoomId: 1, date: 1 },
  { unique: true },
);
HotelRoomAvailabilitySchema.index({ hotelPropertyId: 1, date: 1 });
HotelRoomAvailabilitySchema.index({ hotelRoomId: 1, date: 1, stopSell: 1 });

const HotelRoomAvailability =
  mongoose.models.HotelRoomAvailability ||
  mongoose.model<IHotelRoomAvailability>(
    'HotelRoomAvailability',
    HotelRoomAvailabilitySchema,
  );

export default HotelRoomAvailability;
