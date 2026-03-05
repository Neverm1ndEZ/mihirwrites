import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import AuditLog from "@/models/AuditLog";
import { isAdminAuthenticated } from "@/lib/auth";

function calcReadingTime(content: string): number {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const post = await Post.findOne({ slug, deletedAt: null }).lean();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const comments = await Comment.find({ postSlug: slug }).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ post, comments });
  } catch (error) {
    console.error("GET /api/posts/[slug] error:", error);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const { slug } = await params;
    const body = await req.json();
    const existing = await Post.findOne({ slug });
    if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const setOps: Record<string, unknown> = { ...body, updatedAt: new Date() };
    const pushOps: Record<string, unknown> = {};

    if (body.content && existing.content !== body.content) {
      pushOps.revisions = { content: existing.content, savedAt: new Date() };
      setOps.readingTime = calcReadingTime(body.content);
    }
    if (body.writingSnapshots?.length) {
      pushOps.writingSnapshots = { $each: body.writingSnapshots };
      delete setOps.writingSnapshots;
    }
    if (body.scheduledAt) setOps.scheduledAt = new Date(body.scheduledAt);
    if (body.timeCapsuleUnlockAt) setOps.timeCapsuleUnlockAt = new Date(body.timeCapsuleUnlockAt);

    const mongoUpdate: Record<string, unknown> = { $set: setOps };
    if (Object.keys(pushOps).length) mongoUpdate.$push = pushOps;

    const post = await Post.findOneAndUpdate({ slug }, mongoUpdate, { new: true, runValidators: true });
    await AuditLog.create({ action: "post_updated", targetSlug: slug, detail: post?.title });
    return NextResponse.json({ post });
  } catch (error) {
    console.error("PUT /api/posts/[slug] error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const { slug } = await params;
    const post = await Post.findOneAndUpdate({ slug }, { deletedAt: new Date(), published: false }, { new: true });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    await AuditLog.create({ action: "post_deleted", targetSlug: slug, detail: post.title });
    return NextResponse.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/posts/[slug] error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
