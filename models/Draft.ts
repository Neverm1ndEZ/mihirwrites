import mongoose, { Schema, Model, Document } from "mongoose";

export interface IDraft extends Document {
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  tags: string;
  mood?: string;
  location?: string;
  voiceIntroUrl?: string;
  seriesName?: string;
  seriesPart?: string;
  scheduledAt?: string;
  timeCapsuleUnlockAt?: string;
  updatedAt: Date;
  createdAt: Date;
}

const DraftSchema = new Schema<IDraft>(
  {
    title: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    tags: { type: String, default: "" },
    mood: { type: String, default: "" },
    location: { type: String, default: "" },
    voiceIntroUrl: { type: String, default: "" },
    seriesName: { type: String, default: "" },
    seriesPart: { type: String, default: "" },
    scheduledAt: { type: String, default: "" },
    timeCapsuleUnlockAt: { type: String, default: "" },
  },
  { timestamps: true }
);

const Draft: Model<IDraft> =
  mongoose.models.Draft || mongoose.model<IDraft>("Draft", DraftSchema);

export default Draft;
