import mongoose, { Schema, Document } from 'mongoose';

export const HOTEL_ROOM_STATUSES = [
  'draft',
  'active',
  'inactive',
  'pending_review',
] as const;

export type HotelRoomStatus = (typeof HOTEL_ROOM_STATUSES)[number];

export interface IHotelRoomImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface IHotelRoom extends Document {
  hotelPropertyId: mongoose.Types.ObjectId;
  hotelPartnerId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  roomType: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bedType: string;
  size: string;
  amenities: string[];
  images: IHotelRoomImage[];
  basePrice: number;
  currency: string;
  status: HotelRoomStatus;
  cancellationPolicy: string;
  mealPlan: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const HotelRoomImageSchema: Schema<IHotelRoomImage> = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    alt: {
      type: String,
      trim: true,
      default: '',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const HotelRoomSchema: Schema<IHotelRoom> = new Schema(
  {
    hotelPropertyId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelProperty',
      required: true,
      index: true,
    },
    hotelPartnerId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelPartner',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a hotel room name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    roomType: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    maxAdults: {
      type: Number,
      default: 1,
      min: 0,
    },
    maxChildren: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxOccupancy: {
      type: Number,
      default: 1,
      min: 0,
    },
    bedType: {
      type: String,
      trim: true,
      default: '',
    },
    size: {
      type: String,
      trim: true,
      default: '',
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [HotelRoomImageSchema],
      default: [],
    },
    basePrice: {
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
    status: {
      type: String,
      enum: HOTEL_ROOM_STATUSES,
      default: 'draft',
      index: true,
    },
    cancellationPolicy: {
      type: String,
      default: '',
    },
    mealPlan: {
      type: String,
      trim: true,
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

HotelRoomSchema.index({ hotelPropertyId: 1, status: 1, createdAt: -1 });
HotelRoomSchema.index({ hotelPartnerId: 1, status: 1, createdAt: -1 });

const HotelRoom =
  mongoose.models.HotelRoom ||
  mongoose.model<IHotelRoom>('HotelRoom', HotelRoomSchema);

export default HotelRoom;
