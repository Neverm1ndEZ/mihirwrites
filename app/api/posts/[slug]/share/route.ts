import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import { isAdminAuthenticated } from "@/lib/auth";
import crypto from "crypto";

// POST /api/posts/[slug]/share — generate (or return existing) share token
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { slug } = await params;

  const existing = await Post.findOne({ slug, deletedAt: null }).select("shareToken published");
  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Reuse if already has a token
  let token = existing.shareToken;
  if (!token) {
    token = crypto.randomBytes(24).toString("base64url");
    await Post.updateOne({ slug }, { shareToken: token });
  }

  return NextResponse.json({ token });
}

// DELETE /api/posts/[slug]/share — revoke share token
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { slug } = await params;

  await Post.updateOne({ slug }, { shareToken: null });
  return NextResponse.json({ revoked: true });
}
