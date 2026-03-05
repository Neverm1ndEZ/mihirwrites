import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRevision {
  content: string;
  savedAt: Date;
}

export interface IWritingSnapshot {
  content: string;
  capturedAt: Date;
}

export interface IPost extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  tags: string[];
  published: boolean;
  deletedAt?: Date;
  // Content & Writing
  readingTime: number;
  featured: boolean;
  seriesName?: string;
  seriesPart?: number;
  scheduledAt?: Date;
  revisions: IRevision[];
  writingSnapshots: IWritingSnapshot[];
  // Discovery
  viewCount: number;
  reactions: { like: number; heart: number; fire: number };
  // X-Factor
  mood?: string;
  location?: string;
  voiceIntroUrl?: string;
  timeCapsuleUnlockAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    excerpt: { type: String, required: true, trim: true, maxlength: 300 },
    content: { type: String, required: true },
    coverImage: { type: String },
    tags: [{ type: String, trim: true }],
    published: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    // Content & Writing
    readingTime: { type: Number, default: 1 },
    featured: { type: Boolean, default: false },
    seriesName: { type: String, trim: true },
    seriesPart: { type: Number },
    scheduledAt: { type: Date },
    revisions: [{ content: String, savedAt: { type: Date, default: Date.now } }],
    writingSnapshots: [{ content: String, capturedAt: { type: Date, default: Date.now } }],
    // Discovery
    viewCount: { type: Number, default: 0 },
    reactions: {
      like: { type: Number, default: 0 },
      heart: { type: Number, default: 0 },
      fire: { type: Number, default: 0 },
    },
    // X-Factor
    mood: { type: String, enum: ["curious", "nostalgic", "excited", "reflective", "angry", "lost", ""] },
    location: { type: String, trim: true },
    voiceIntroUrl: { type: String },
    timeCapsuleUnlockAt: { type: Date },
  },
  { timestamps: true }
);

PostSchema.index({ slug: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ mood: 1 });
PostSchema.index({ featured: 1 });

const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
