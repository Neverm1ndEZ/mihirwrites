import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    await Post.findOneAndUpdate({ slug, published: true }, { $inc: { viewCount: 1 } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
