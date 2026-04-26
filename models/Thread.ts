import mongoose, { Schema, Document, Model } from "mongoose";

export interface IThread extends Document {
  content: string;
  category: "personal" | "professional";
  createdAt: Date;
}

const ThreadSchema = new Schema<IThread>(
  {
    content: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, enum: ["personal", "professional"], default: "personal" },
  },
  { timestamps: true }
);

ThreadSchema.index({ createdAt: -1 });

const Thread: Model<IThread> =
  mongoose.models.Thread || mongoose.model<IThread>("Thread", ThreadSchema);

export default Thread;
