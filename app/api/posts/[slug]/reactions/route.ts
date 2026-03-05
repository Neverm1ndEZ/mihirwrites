import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const { type } = await req.json();

    if (!["like", "heart", "fire"].includes(type)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    const post = await Post.findOneAndUpdate(
      { slug, published: true },
      { $inc: { [`reactions.${type}`]: 1 } },
      { new: true }
    ).select("reactions");

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    return NextResponse.json({ reactions: post.reactions });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
