import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserPreferences {
  currency: string;
  language: string;
  emailNotifications: boolean;
  priceAlerts: boolean;
  newsletter: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  phone?: string;
  birthDate?: Date;
  nationality?: string;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const PreferencesSchema: Schema<IUserPreferences> = new Schema({
  currency: { type: String, default: 'USD' },
  language: { type: String, default: 'en' },
  emailNotifications: { type: Boolean, default: true },
  priceAlerts: { type: Boolean, default: false },
  newsletter: { type: Boolean, default: true },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
}, { _id: false });

const UserSchema: Schema<IUser> = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    birthDate: {
      type: Date,
      default: null,
    },
    nationality: {
      type: String,
      trim: true,
      default: '',
    },
    preferences: {
      type: PreferencesSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error('Unknown error'));
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if model exists before creating
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;