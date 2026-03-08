import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import ReactionVote from "@/models/ReactionVote";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const { type, voterId } = await req.json();

    if (!["like", "heart", "fire"].includes(type)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }
    if (!voterId || typeof voterId !== "string" || voterId.length < 8) {
      return NextResponse.json({ error: "Missing voter ID" }, { status: 400 });
    }

    // Sanitize voterId
    const safeVoterId = voterId.slice(0, 64).replace(/[^a-zA-Z0-9-_]/g, "");

    // Check for duplicate
    const existing = await ReactionVote.findOne({ slug, type, voterId: safeVoterId });
    if (existing) {
      return NextResponse.json({ error: "Already reacted", alreadyVoted: true }, { status: 409 });
    }

    // Record the vote
    await ReactionVote.create({ slug, type, voterId: safeVoterId });

    const post = await Post.findOneAndUpdate(
      { slug, published: true },
      { $inc: { [`reactions.${type}`]: 1 } },
      { new: true }
    ).select("reactions");

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    return NextResponse.json({ reactions: post.reactions });
  } catch (err: unknown) {
    // MongoDB duplicate key error (race condition safety)
    if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
      return NextResponse.json({ error: "Already reacted", alreadyVoted: true }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
