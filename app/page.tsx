import Link from "next/link";
import Image from "next/image";
import connectDB from "@/lib/mongodb";
import PostModel from "@/models/Post";
import CommentModel from "@/models/Comment";
import HomeClient from "@/components/HomeClient";
export const dynamic = "force-dynamic";

interface PostItem {
  _id: string; title: string; slug: string; excerpt: string;
  coverImage?: string; tags: string[]; createdAt: string;
  featured?: boolean; readingTime?: number; mood?: string;
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
      .select("title slug excerpt coverImage tags featured readingTime mood reactions createdAt")
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    // Get comment counts
    const slugs = posts.map((p: { slug: string }) => p.slug);
    const counts = await CommentModel.aggregate([
      { $match: { postSlug: { $in: slugs } } },
      { $group: { _id: "$postSlug", count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    counts.forEach((c: { _id: string; count: number }) => { countMap[c._id] = c.count; });

    return JSON.parse(JSON.stringify(posts.map((p) => ({ ...p, _id: p._id.toString(), commentCount: countMap[p.slug] || 0, }))));
  } catch { return []; }
}

export default async function HomePage() {
  const posts = await getPosts();
  const featured = posts.find((p) => p.featured);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 1.5rem 5rem" }}>
      {/* Hero */}
      <div style={{ marginBottom: "3rem" }} className="animate-fade-up">
        <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(2.5rem, 5vw, 3.75rem)", fontWeight: 700, color: "var(--fg)", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
          Mihir Writes
        </h1>
        <p style={{ color: "var(--fg-muted)", fontSize: "1.0625rem", maxWidth: "42ch" }}>
          Thoughts, ideas, and stories — written as they come.
        </p>
      </div>

      {/* Featured post */}
      {featured && (
        <div style={{ marginBottom: "2.5rem" }}>
          <Link href={`/post/${featured.slug}`} style={{ textDecoration: "none" }}>
            <div className="card" style={{ padding: "0", overflow: "hidden", border: "1px solid var(--accent)", borderRadius: "12px" }}>
              {featured.coverImage && (
                <div style={{ position: "relative", height: "200px" }}>
                  <Image src={featured.coverImage} alt={featured.title} fill style={{ objectFit: "cover" }} sizes="800px" />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
                  <span style={{ position: "absolute", top: "0.75rem", left: "0.75rem", background: "var(--accent)", color: "#fff", fontSize: "0.6875rem", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Featured
                  </span>
                </div>
              )}
              <div style={{ padding: "1.25rem 1.5rem" }}>
                {!featured.coverImage && <span style={{ display: "inline-block", background: "var(--accent)", color: "#fff", fontSize: "0.6875rem", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Featured</span>}
                <h2 style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--fg)", lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>{featured.title}</h2>
                <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem", lineHeight: 1.65 }}>{featured.excerpt}</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Client: MoodGate + filtered posts list */}
      <HomeClient posts={posts} />
    </div>
  );
}
