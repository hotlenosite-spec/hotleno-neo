import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminActionLog extends Document {
  adminUserId?: mongoose.Types.ObjectId;
  targetType: 'agency' | 'user' | 'booking' | 'hotel_partner' | 'hotel_property' | 'system';
  targetId?: mongoose.Types.ObjectId;
  type: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  request?: unknown;
  response?: unknown;
  error?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const AdminActionLogSchema: Schema<IAdminActionLog> = new Schema(
  {
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['agency', 'user', 'booking', 'hotel_partner', 'hotel_property', 'system'],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'skipped'],
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

AdminActionLogSchema.index({ targetType: 1, createdAt: -1 });

const AdminActionLog =
  mongoose.models.AdminActionLog ||
  mongoose.model<IAdminActionLog>('AdminActionLog', AdminActionLogSchema);

export default AdminActionLog;
