import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";

export async function GET() {
  try {
    await connectDB();
    const posts = await Post.find({ published: true, deletedAt: null, category: "professional" })
      .select("title slug tags viewCount reactions mood")
      .lean();
    return NextResponse.json({ posts: JSON.parse(JSON.stringify(posts)) });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
