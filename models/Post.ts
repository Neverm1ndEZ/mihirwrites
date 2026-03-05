import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPost extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  tags: string[];
  published: boolean;
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
  },
  { timestamps: true }
);

PostSchema.index({ slug: 1 });
PostSchema.index({ createdAt: -1 });

const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
