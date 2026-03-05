import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;

    const post = await Post.findOne({ slug }).lean();
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comments = await Comment.find({ postSlug: slug })
      .sort({ createdAt: -1 })
      .lean();

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
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { slug } = await params;
    const body = await req.json();

    const post = await Post.findOneAndUpdate(
      { slug },
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

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
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { slug } = await params;

    const post = await Post.findOneAndDelete({ slug });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Delete all comments for this post
    await Comment.deleteMany({ postSlug: slug });

    return NextResponse.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/posts/[slug] error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
