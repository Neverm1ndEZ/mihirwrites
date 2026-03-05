import mongoose, { Schema, Document, Model } from "mongoose";

export interface IThread extends Document {
  content: string;
  createdAt: Date;
}

const ThreadSchema = new Schema<IThread>(
  {
    content: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

ThreadSchema.index({ createdAt: -1 });

const Thread: Model<IThread> =
  mongoose.models.Thread || mongoose.model<IThread>("Thread", ThreadSchema);

export default Thread;
