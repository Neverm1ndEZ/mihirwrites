import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import AuditLog from "@/models/AuditLog";
import { isAdminAuthenticated } from "@/lib/auth";
import slugify from "slugify";

function calcReadingTime(content: string): number {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const mood = searchParams.get("mood");
    const tag = searchParams.get("tag");

    const now = new Date();
    // Base query: not soft-deleted
    const query: Record<string, unknown> = { deletedAt: null };

    if (!all) {
      query.published = true;
      // Show scheduled posts that have passed their publish date
      query.$or = [
        { scheduledAt: null },
        { scheduledAt: { $lte: now } },
      ];
    }

    if (mood) query.mood = mood;
    if (tag) query.tags = tag;

    const posts = await Post.find(query)
      .select("title slug excerpt coverImage tags published featured mood location readingTime viewCount reactions scheduledAt createdAt")
      .sort({ featured: -1, createdAt: -1 })
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
    const {
      title, excerpt, content, coverImage, tags, published,
      featured, seriesName, seriesPart, scheduledAt,
      mood, location, voiceIntroUrl, timeCapsuleUnlockAt,
    } = body;

    if (!title || !excerpt || !content) {
      return NextResponse.json(
        { error: "Title, excerpt, and content are required" },
        { status: 400 }
      );
    }

    let slug = slugify(title, { lower: true, strict: true });
    const existing = await Post.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    const readingTime = calcReadingTime(content);

    const post = await Post.create({
      title, slug, excerpt, content, coverImage,
      tags: tags || [],
      published: published !== false,
      readingTime,
      featured: featured || false,
      seriesName, seriesPart,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      mood, location, voiceIntroUrl,
      timeCapsuleUnlockAt: timeCapsuleUnlockAt ? new Date(timeCapsuleUnlockAt) : null,
      writingSnapshots: body.writingSnapshots || [],
    });

    await AuditLog.create({ action: "post_created", targetSlug: slug, detail: title });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
