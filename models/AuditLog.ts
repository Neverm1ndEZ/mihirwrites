import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  targetSlug?: string;
  targetId?: string;
  detail?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    targetSlug: { type: String },
    targetId: { type: String },
    detail: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
