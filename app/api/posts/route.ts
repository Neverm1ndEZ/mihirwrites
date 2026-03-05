import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import { isAdminAuthenticated } from "@/lib/auth";
import slugify from "slugify";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    const query = all ? {} : { published: true };
    const posts = await Post.find(query)
      .select("title slug excerpt coverImage tags published createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { title, excerpt, content, coverImage, tags, published } = body;

    if (!title || !excerpt || !content) {
      return NextResponse.json(
        { error: "Title, excerpt, and content are required" },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = slugify(title, { lower: true, strict: true });
    const existing = await Post.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const post = await Post.create({
      title,
      slug,
      excerpt,
      content,
      coverImage,
      tags: tags || [],
      published: published !== false,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
