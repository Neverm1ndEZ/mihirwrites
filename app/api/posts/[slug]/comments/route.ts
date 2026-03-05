import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import AuditLog from "@/models/AuditLog";
import { isAdminAuthenticated } from "@/lib/auth";

// Rate limiter: max 3 comments per IP per 5 min
const rateMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = 5 * 60 * 1000;
  const timestamps = (rateMap.get(ip) || []).filter(t => now - t < window);
  if (timestamps.length >= 3) return true;
  timestamps.push(now);
  rateMap.set(ip, timestamps);
  return false;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const comments = await Comment.find({ postSlug: slug }).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ comments: JSON.parse(JSON.stringify(comments)) });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many comments. Please wait." }, { status: 429 });
    }

    await connectDB();
    const { slug } = await params;
    const body = await req.json();
    const { name, content, parentId } = body;

    if (!name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Name and comment are required" }, { status: 400 });
    }
    if (name.trim().length > 80) return NextResponse.json({ error: "Name too long" }, { status: 400 });
    if (content.trim().length > 2000) return NextResponse.json({ error: "Comment too long" }, { status: 400 });

    const post = await Post.findOne({ slug, published: true });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // Extract @mentions
    const mentions = (content.match(/@(\w+)/g) || []).map((m: string) => m.slice(1));

    // Check if admin is posting
    const isAdmin = await isAdminAuthenticated();

    const comment = await Comment.create({
      postSlug: slug,
      name: name.trim(),
      content: content.trim(),
      isAdmin,
      parentId: parentId || null,
      mentions,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST comments error:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("id");
    if (!commentId) return NextResponse.json({ error: "Comment ID required" }, { status: 400 });

    const comment = await Comment.findOneAndDelete({ _id: commentId, postSlug: slug });
    if (comment) {
      // Also delete replies
      await Comment.deleteMany({ parentId: commentId });
      await AuditLog.create({ action: "comment_deleted", targetSlug: slug, targetId: commentId, detail: comment.content.slice(0, 80) });
    }
    return NextResponse.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("DELETE comments error:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
