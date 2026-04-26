import connectDB from "@/lib/mongodb";
import PostModel from "@/models/Post";
import CommentModel from "@/models/Comment";
import HomeClient from "@/components/HomeClient";
import CommandPalette from "@/components/CommandPalette";
export const dynamic = "force-dynamic";

export interface PostItem {
  _id: string; title: string; slug: string; excerpt: string;
  coverImage?: string; tags: string[]; createdAt: string;
  featured?: boolean; readingTime?: number; mood?: string;
  category?: "personal" | "professional";
  reactions?: { like: number; heart: number; fire: number };
  commentCount?: number;
}

async function getPosts(): Promise<PostItem[]> {
  try {
    await connectDB();
    const now = new Date();
    const posts = await PostModel.find({
      published: true, deletedAt: null,
      $or: [{ scheduledAt: null }, { scheduledAt: { $lte: now } }],
    })
      .select("title slug excerpt coverImage tags featured readingTime mood category reactions createdAt")
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    const slugs = posts.map((p: { slug: string }) => p.slug);
    const counts = await CommentModel.aggregate([
      { $match: { postSlug: { $in: slugs } } },
      { $group: { _id: "$postSlug", count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    counts.forEach((c: { _id: string; count: number }) => { countMap[c._id] = c.count; });

    return JSON.parse(JSON.stringify(posts.map((p) => ({
      ...p,
      _id: p._id.toString(),
      category: (p as { category?: string }).category || "personal",
      commentCount: countMap[(p as { slug: string }).slug] || 0,
    }))));
  } catch { return []; }
}

export default async function HomePage() {
  const posts = await getPosts();

  return (
    <div className="home-page" style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 1.5rem 5rem" }}>
      <div style={{ marginBottom: "3rem" }} className="animate-fade-up">
        <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(2.5rem, 5vw, 3.75rem)", fontWeight: 700, color: "var(--fg)", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
          Mihir Writes
        </h1>
        <p style={{ color: "var(--fg-muted)", fontSize: "1.0625rem", maxWidth: "42ch" }}>
          Thoughts, ideas, and stories — written as they come.
        </p>
      </div>

      <CommandPalette posts={posts} />

      <HomeClient posts={posts} />
    </div>
  );
}
