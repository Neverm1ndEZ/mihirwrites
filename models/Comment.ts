import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComment extends Document {
  postSlug: string;
  name: string;
  content: string;
  isAdmin: boolean;
  parentId?: mongoose.Types.ObjectId;
  mentions: string[];
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    postSlug: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    isAdmin: { type: Boolean, default: false },
    parentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    mentions: [{ type: String }],
  },
  { timestamps: true }
);

const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
