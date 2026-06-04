import mongoose, { Schema, Document } from "mongoose";
import type { SupplierProviderName } from "@/lib/suppliers/types";

export type SupplierEnvironment = "staging" | "test" | "production" | "mock";

export interface ISupplierSetting extends Document {
  supplier: SupplierProviderName;
  enabled: boolean;
  environment: SupplierEnvironment;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSettingSchema = new Schema<ISupplierSetting>(
  {
    supplier: {
      type: String,
      enum: ["tbo", "hotelbeds", "travellanda", "mock"],
      required: true,
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    environment: {
      type: String,
      enum: ["staging", "test", "production", "mock"],
      default: "staging",
    },
    updatedBy: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const SupplierSetting =
  mongoose.models.SupplierSetting ||
  mongoose.model<ISupplierSetting>("SupplierSetting", SupplierSettingSchema);

export default SupplierSetting;
