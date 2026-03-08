import mongoose, { Schema, Model } from "mongoose";

export interface IReactionVote {
  slug: string;
  type: "like" | "heart" | "fire";
  voterId: string; // hashed client fingerprint
  createdAt: Date;
}

const ReactionVoteSchema = new Schema<IReactionVote>(
  {
    slug: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ["like", "heart", "fire"] },
    voterId: { type: String, required: true },
  },
  { timestamps: true }
);

// Compound unique index: one vote per voter per reaction per post
ReactionVoteSchema.index({ slug: 1, type: 1, voterId: 1 }, { unique: true });

const ReactionVote: Model<IReactionVote> =
  mongoose.models.ReactionVote ||
  mongoose.model<IReactionVote>("ReactionVote", ReactionVoteSchema);

export default ReactionVote;
