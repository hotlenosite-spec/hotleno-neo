import mongoose, { Schema, Document } from 'mongoose';

export const HOTEL_PROPERTY_STATUSES = [
  'draft',
  'pending_review',
  'active',
  'suspended',
  'rejected',
] as const;

export const HOTEL_PROPERTY_SOURCES = ['hotel_partner'] as const;

export type HotelPropertyStatus = (typeof HOTEL_PROPERTY_STATUSES)[number];
export type HotelPropertySource = (typeof HOTEL_PROPERTY_SOURCES)[number];

export interface IHotelPropertyImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface IHotelPropertyPolicies {
  cancellation?: string;
  children?: string;
  pets?: string;
  smoking?: string;
  extraBeds?: string;
  payment?: string;
  other?: string;
}

export interface IHotelProperty extends Document {
  hotelPartnerId: mongoose.Types.ObjectId;
  ownerUserId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  starRating: number;
  country: string;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email: string;
  amenities: string[];
  images: IHotelPropertyImage[];
  policies: IHotelPropertyPolicies;
  checkInTime: string;
  checkOutTime: string;
  status: HotelPropertyStatus;
  source: HotelPropertySource;
  isPublished: boolean;
  adminNotes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const HotelPropertyImageSchema: Schema<IHotelPropertyImage> = new Schema(
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

const HotelPropertyPoliciesSchema: Schema<IHotelPropertyPolicies> = new Schema(
  {
    cancellation: { type: String, default: '' },
    children: { type: String, default: '' },
    pets: { type: String, default: '' },
    smoking: { type: String, default: '' },
    extraBeds: { type: String, default: '' },
    payment: { type: String, default: '' },
    other: { type: String, default: '' },
  },
  { _id: false },
);

const HotelPropertySchema: Schema<IHotelProperty> = new Schema(
  {
    hotelPartnerId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelPartner',
      required: true,
      index: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a hotel property name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    starRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
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
    latitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [HotelPropertyImageSchema],
      default: [],
    },
    policies: {
      type: HotelPropertyPoliciesSchema,
      default: () => ({}),
    },
    checkInTime: {
      type: String,
      trim: true,
      default: '',
    },
    checkOutTime: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: HOTEL_PROPERTY_STATUSES,
      default: 'draft',
      index: true,
    },
    source: {
      type: String,
      enum: HOTEL_PROPERTY_SOURCES,
      default: 'hotel_partner',
      immutable: true,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    adminNotes: {
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

HotelPropertySchema.index({ hotelPartnerId: 1, status: 1, createdAt: -1 });
HotelPropertySchema.index({ ownerUserId: 1, createdAt: -1 });
HotelPropertySchema.index({ isPublished: 1, status: 1 });

const HotelProperty =
  mongoose.models.HotelProperty ||
  mongoose.model<IHotelProperty>('HotelProperty', HotelPropertySchema);

export default HotelProperty;
