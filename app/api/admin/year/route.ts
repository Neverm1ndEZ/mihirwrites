import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const posts = await Post.find({
      published: true,
      deletedAt: null,
      createdAt: { $gte: start, $lt: end },
    }).lean();

    if (!posts.length) {
      return NextResponse.json({ year, empty: true });
    }

    const totalWords = posts.reduce((sum, p) => sum + p.content.split(/\s+/).length, 0);
    const mostViewed = posts.reduce((a, b) => (a.viewCount > b.viewCount ? a : b));
    const mostReacted = posts.reduce((a, b) => {
      const ra = (a.reactions?.like || 0) + (a.reactions?.heart || 0) + (a.reactions?.fire || 0);
      const rb = (b.reactions?.like || 0) + (b.reactions?.heart || 0) + (b.reactions?.fire || 0);
      return ra > rb ? a : b;
    });

    // Tag frequency
    const tagCount: Record<string, number> = {};
    posts.forEach((p) => p.tags.forEach((t: string) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count }));

    // Mood frequency
    const moodCount: Record<string, number> = {};
    posts.forEach((p) => { if (p.mood) moodCount[p.mood] = (moodCount[p.mood] || 0) + 1; });
    const topMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const sortedByDate = [...posts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const firstPost = sortedByDate[0];
    const lastPost = sortedByDate[sortedByDate.length - 1];

    // First/last sentence helpers
    const firstSentence = (text: string) => text.replace(/#+\s/g, "").replace(/\*/g, "").split(/[.!?]/)[0]?.trim() || "";

    return NextResponse.json({
      year,
      totalPosts: posts.length,
      totalWords,
      totalViews: posts.reduce((sum, p) => sum + (p.viewCount || 0), 0),
      mostViewed: { title: mostViewed.title, slug: mostViewed.slug, views: mostViewed.viewCount },
      mostReacted: { title: mostReacted.title, slug: mostReacted.slug },
      topTags,
      topMood,
      firstPost: { title: firstPost.title, slug: firstPost.slug, date: firstPost.createdAt, firstSentence: firstSentence(firstPost.content) },
      lastPost: { title: lastPost.title, slug: lastPost.slug, date: lastPost.createdAt, firstSentence: firstSentence(lastPost.content) },
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
