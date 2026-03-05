import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import { isAdminAuthenticated } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const body = await req.json();
    const { name, content } = body;

    if (!name?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "Name and comment are required" },
        { status: 400 }
      );
    }

    if (name.trim().length > 80) {
      return NextResponse.json({ error: "Name too long (max 80 chars)" }, { status: 400 });
    }

    if (content.trim().length > 2000) {
      return NextResponse.json(
        { error: "Comment too long (max 2000 chars)" },
        { status: 400 }
      );
    }

    // Check post exists and is published
    const post = await Post.findOne({ slug, published: true });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comment = await Comment.create({
      postSlug: slug,
      name: name.trim(),
      content: content.trim(),
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts/[slug]/comments error:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("id");

    if (!commentId) {
      return NextResponse.json({ error: "Comment ID required" }, { status: 400 });
    }

    await Comment.findOneAndDelete({ _id: commentId, postSlug: slug });
    return NextResponse.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("DELETE /api/posts/[slug]/comments error:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
