import Link from "next/link";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import WritingHeatmap from "@/components/WritingHeatmap";

export const dynamic = "force-dynamic";

interface YearData {
  year: number;
  totalPosts: number;
  totalWords: number;
  totalViews: number;
  mostViewed: { title: string; slug: string; views: number };
  mostReacted: { title: string; slug: string };
  topTags: { tag: string; count: number }[];
  topMood?: string;
  firstPost: { title: string; slug: string; date: string; firstSentence: string };
  lastPost: { title: string; slug: string; date: string; firstSentence: string };
  heatmap: Record<string, number>;
  empty?: boolean;
}

async function getYearData(year: number): Promise<YearData | null> {
  try {
    await connectDB();
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    const posts = await Post.find({ published: true, deletedAt: null, category: "professional", createdAt: { $gte: start, $lt: end } }).lean();
    if (!posts.length) return { year, empty: true, heatmap: {} } as YearData;

    const totalWords = posts.reduce((s, p) => s + p.content.split(/\s+/).length, 0);
    const mostViewed = posts.reduce((a, b) => (a.viewCount > b.viewCount ? a : b));
    const mostReacted = posts.reduce((a, b) => {
      const ra = (a.reactions?.like || 0) + (a.reactions?.heart || 0) + (a.reactions?.fire || 0);
      const rb = (b.reactions?.like || 0) + (b.reactions?.heart || 0) + (b.reactions?.fire || 0);
      return ra > rb ? a : b;
    });
    const tagCount: Record<string, number> = {};
    posts.forEach((p) => p.tags.forEach((t: string) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count }));
    const moodCount: Record<string, number> = {};
    posts.forEach((p) => { if (p.mood) moodCount[p.mood] = (moodCount[p.mood] || 0) + 1; });
    const topMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const sorted = [...posts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const firstPost = sorted[0]; const lastPost = sorted[sorted.length - 1];
    const fs = (t: string) => t.replace(/#+\s/g, "").replace(/\*/g, "").split(/[.!?]/)[0]?.trim() || "";

    // Build heatmap: date string -> count
    const heatmap: Record<string, number> = {};
    posts.forEach((p) => {
      const dateKey = new Date(p.createdAt).toISOString().slice(0, 10);
      heatmap[dateKey] = (heatmap[dateKey] || 0) + 1;
    });

    return {
      year, totalPosts: posts.length, totalWords,
      totalViews: posts.reduce((s, p) => s + (p.viewCount || 0), 0),
      mostViewed: { title: mostViewed.title, slug: mostViewed.slug, views: mostViewed.viewCount || 0 },
      mostReacted: { title: mostReacted.title, slug: mostReacted.slug },
      topTags, topMood,
      firstPost: { title: firstPost.title, slug: firstPost.slug, date: String(firstPost.createdAt), firstSentence: fs(firstPost.content) },
      lastPost: { title: lastPost.title, slug: lastPost.slug, date: String(lastPost.createdAt), firstSentence: fs(lastPost.content) },
      heatmap,
    };
  } catch { return null; }
}

const MOOD_EMOJIS: Record<string, string> = {
  curious: "🔍", nostalgic: "🌅", excited: "⚡", reflective: "🌊", lost: "🌑", angry: "🔥",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-lora), serif", fontSize: "2.5rem", fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)", marginTop: "0.5rem", fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", marginTop: "0.25rem" }}>{sub}</div>}
    </div>
  );
}

export default async function YearInReviewPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr);
  const data = await getYearData(year);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: Math.min(5, currentYear - 2025) }, (_, i) => currentYear - i);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>
      <Link href="/" style={{ color: "var(--fg-muted)", fontSize: "0.875rem", textDecoration: "none", display: "inline-block", marginBottom: "2rem" }}>← Back</Link>

      {/* Year selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
        {years.map((y) => (
          <Link key={y} href={`/year/${y}`} style={{
            padding: "0.375rem 0.875rem", borderRadius: "20px", fontSize: "0.875rem",
            border: `1px solid ${y === year ? "var(--accent)" : "var(--border)"}`,
            background: y === year ? "var(--accent)" : "var(--bg-card)",
            color: y === year ? "#fff" : "var(--fg-muted)",
            textDecoration: "none", fontWeight: y === year ? 600 : 400,
          }}>{y}</Link>
        ))}
      </div>

      <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
        {year} in Writing
      </h1>

      {!data || data.empty ? (
        <p style={{ color: "var(--fg-muted)", marginTop: "2rem" }}>No posts written in {year} yet.</p>
      ) : (
        <>
          <p style={{ color: "var(--fg-muted)", marginBottom: "2.5rem" }}>
            A year in words. {data.totalPosts} posts. {data.totalWords.toLocaleString()} words.
          </p>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
            <StatCard label="Posts" value={data.totalPosts} />
            <StatCard label="Words written" value={data.totalWords.toLocaleString()} />
            <StatCard label="Total views" value={data.totalViews.toLocaleString()} />
            {data.topMood && <StatCard label="Dominant mood" value={MOOD_EMOJIS[data.topMood] || "?"} sub={data.topMood} />}
          </div>

          {/* Heatmap */}
          <WritingHeatmap year={year} data={data.heatmap} />

          {/* Top posts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Most Read</div>
              <Link href={`/post/${data.mostViewed.slug}`} style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.0625rem", fontWeight: 600, color: "var(--fg)", textDecoration: "none", lineHeight: 1.4, display: "block", marginBottom: "0.5rem" }}>
                {data.mostViewed.title}
              </Link>
              <span style={{ fontSize: "0.8125rem", color: "var(--accent)" }}>{data.mostViewed.views} views</span>
            </div>
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Most Loved</div>
              <Link href={`/post/${data.mostReacted.slug}`} style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.0625rem", fontWeight: 600, color: "var(--fg)", textDecoration: "none", lineHeight: 1.4, display: "block" }}>
                {data.mostReacted.title}
              </Link>
            </div>
          </div>

          {/* Top tags */}
          {data.topTags.length > 0 && (
            <div style={{ marginBottom: "2.5rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--fg)", marginBottom: "1rem" }}>What you wrote about</h2>
              <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
                {data.topTags.map(({ tag, count }) => (
                  <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.875rem", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "20px", fontSize: "0.875rem", color: "var(--fg-muted)" }}>
                    {tag}
                    <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.75rem" }}>{count}×</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* First & Last */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            {[
              { label: "First post of the year", post: data.firstPost },
              { label: "Last post of the year", post: data.lastPost },
            ].map(({ label, post }) => (
              <div key={label} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>{label}</div>
                <Link href={`/post/${post.slug}`} style={{ fontFamily: "var(--font-lora), serif", fontSize: "1rem", fontWeight: 600, color: "var(--fg)", textDecoration: "none", lineHeight: 1.4, display: "block", marginBottom: "0.5rem" }}>
                  {post.title}
                </Link>
                {post.firstSentence && <p style={{ fontSize: "0.8125rem", color: "var(--fg-muted)", fontStyle: "italic" }}>&ldquo;{post.firstSentence}&rdquo;</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
