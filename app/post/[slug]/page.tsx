import { cache } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MarkdownContent from "@/components/MarkdownContent";
import InlineMarkdown from "@/components/InlineMarkdown";
import Reactions from "@/components/Reactions";
import ReadingProgress from "@/components/ReadingProgress";
import BackToTop from "@/components/BackToTop";
import ViewTracker from "@/components/ViewTracker";
import ReaderMoodMode from "@/components/ReaderMoodMode";
import SubscribeWidget from "@/components/SubscribeWidget";
import { AmbientPlayerLazy, WritingReplayLazy, CommentSectionLazy } from "@/components/LazyWidgets";
import connectDB from "@/lib/mongodb";
import PostModel from "@/models/Post";
import CommentModel from "@/models/Comment";
import { isAdminAuthenticated } from "@/lib/auth";

// Always server-render — never cache, so searchParams (share token) is always read fresh
export const dynamic = "force-dynamic";

interface PostItem {
  _id: string; title: string; slug: string; excerpt: string; content: string;
  coverImage?: string; tags: string[]; createdAt: string; updatedAt: string;
  published: boolean; shareToken?: string; category?: "personal" | "professional";
  readingTime?: number; mood?: string; location?: string; voiceIntroUrl?: string; ambientTrackUrl?: string;
  timeCapsuleUnlockAt?: string;
  reactions: { like: number; heart: number; fire: number };
  writingSnapshots?: { content: string; capturedAt: string }[];
  seriesName?: string; seriesPart?: number;
}

interface CommentItem {
  _id: string; name: string; content: string; isAdmin?: boolean;
  parentId?: string | null; createdAt: string;
}

// Wrapped in cache() so generateMetadata + the page component share one result
// per request instead of each running the DB queries.
const getPost = cache(async (slug: string, token?: string) => {
  try {
    await connectDB();

    let post = null;

    if (token) {
      // Try token-gated access first (unpublished draft with matching token)
      post = await PostModel.findOne({
        slug,
        shareToken: token,
        deletedAt: { $in: [null, undefined] },
      }).lean();
    }

    // Fall back to normal published lookup
    if (!post) {
      post = await PostModel.findOne({
        slug,
        published: true,
        deletedAt: { $in: [null, undefined] },
      }).lean();
    }

    if (!post) return null;

    // Comments and related posts are independent of each other — fetch in
    // parallel to cut TTFB on this dynamically-rendered page.
    const relatedPromise = (() => {
      if (!(post.tags?.length && post.published)) return Promise.resolve([]);
      // Keep related posts within the same category — never surface personal
      // posts under a professional one (or vice versa). Legacy posts with no
      // category are treated as "personal".
      const cat = post.category || "personal";
      const categoryFilter =
        cat === "personal"
          ? { category: { $in: ["personal", null] } }
          : { category: "professional" };
      return PostModel.find({
        slug: { $ne: slug }, published: true, deletedAt: null,
        ...categoryFilter,
        tags: { $in: post.tags },
      }).select("title slug excerpt").limit(3).lean();
    })();

    const [comments, rel] = await Promise.all([
      CommentModel.find({ postSlug: slug }).sort({ createdAt: 1 }).lean(),
      relatedPromise,
    ]);
    const related: { title: string; slug: string; excerpt: string }[] = JSON.parse(JSON.stringify(rel));

    return JSON.parse(JSON.stringify({ post, comments, related }));
  } catch { return null; }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPost(slug);
  if (!data) return { title: "Post Not Found" };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  return {
    title: data.post.title,
    description: data.post.excerpt,
    robots: data.post.published ? undefined : { index: false, follow: false },
    alternates: data.post.published ? { canonical: `${siteUrl}/post/${data.post.slug}` } : undefined,
    openGraph: {
      title: data.post.title, description: data.post.excerpt,
      type: "article", url: `${siteUrl}/post/${data.post.slug}`,
      publishedTime: data.post.createdAt, modifiedTime: data.post.updatedAt,
      images: data.post.coverImage ? [{ url: data.post.coverImage, width: 1200, height: 630 }] : [],
    },
    twitter: { card: "summary_large_image", title: data.post.title, description: data.post.excerpt, images: data.post.coverImage ? [data.post.coverImage] : [] },
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const MOOD_EMOJIS: Record<string, string> = {
  curious: "🔍", nostalgic: "🌅", excited: "⚡", reflective: "🌊", lost: "🌑", angry: "🔥",
};

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  const [data, isAdmin] = await Promise.all([getPost(slug, token), isAdminAuthenticated()]);
  if (!data) notFound();

  const { post, comments, related }: { post: PostItem; comments: CommentItem[]; related: { title: string; slug: string; excerpt: string }[] } = data;

  const isPreview = !post.published && !!token;

  // Paywall: personal posts are members-only
  if ((post.category || "personal") === "personal" && !isAdmin && !isPreview) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1.25rem" }}>🔒</div>
        <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.75rem", fontWeight: 700, color: "var(--fg)", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
          {post.title}
        </h1>
        <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem", maxWidth: "36ch", margin: "0 auto 0.75rem", lineHeight: 1.65 }}>
          {post.excerpt}
        </p>
        <p style={{ color: "var(--fg-subtle)", fontSize: "0.875rem", marginBottom: "2rem" }}>
          This is personal writing — members only.
        </p>
        <span style={{ display: "inline-block", padding: "0.625rem 1.5rem", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.875rem", color: "var(--fg-muted)", cursor: "default" }}>
          Coming soon
        </span>
        <div style={{ marginTop: "2rem" }}>
          <Link href="/" style={{ color: "var(--fg-muted)", fontSize: "0.875rem", textDecoration: "none" }}>← Back</Link>
        </div>
      </div>
    );
  }

  // Time capsule: locked?
  const isLocked = post.timeCapsuleUnlockAt && new Date(post.timeCapsuleUnlockAt) > new Date();
  if (isLocked) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🕰️</div>
        <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.75rem", fontWeight: 700, color: "var(--fg)", marginBottom: "1rem" }}>{post.title}</h1>
        <p style={{ color: "var(--fg-muted)", marginBottom: "0.5rem" }}>This post is sealed until</p>
        <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent)" }}>{formatDate(post.timeCapsuleUnlockAt!)}</p>
        <Link href="/" style={{ display: "inline-block", marginTop: "2rem", color: "var(--fg-muted)", fontSize: "0.875rem", textDecoration: "none" }}>← Back to posts</Link>
      </div>
    );
  }

  return (
    <article className="post-article" style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>
      <ReadingProgress />
      <BackToTop />
      <AmbientPlayerLazy customTrackUrl={post.ambientTrackUrl} />
      <ReaderMoodMode />
      {post.published && <ViewTracker slug={post.slug} />}

      {/* Draft preview banner */}
      {isPreview && (
        <div style={{
          background: "color-mix(in srgb, #f59e0b 12%, var(--bg))",
          border: "1px solid #f59e0b",
          borderRadius: "10px",
          padding: "0.75rem 1.25rem",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.875rem",
          color: "var(--fg)",
        }}>
          <span style={{ fontSize: "1.25rem" }}>🔒</span>
          <div>
            <strong style={{ fontWeight: 600 }}>Draft preview</strong>
            <span style={{ color: "var(--fg-muted)", marginLeft: "0.5rem" }}>This post isn't published yet. Only people with this link can see it.</span>
          </div>
        </div>
      )}

      {/* Back link */}
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "var(--fg-muted)", fontSize: "0.875rem", textDecoration: "none", marginBottom: "2.5rem", transition: "color 0.15s" }} className="animate-fade-in">
        ← Back
      </Link>

      {/* Meta */}
      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <time style={{ fontSize: "0.875rem", color: "var(--fg-subtle)", fontWeight: 500 }}>{formatDate(post.createdAt)}</time>
          {post.readingTime && (
            <span style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)" }}>{post.readingTime} min read</span>
          )}
          {post.mood && (
            <span style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)" }} title={post.mood}>
              {MOOD_EMOJIS[post.mood] || ""} {post.mood}
            </span>
          )}
          {post.location && (
            <span style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)" }}>📍 {post.location}</span>
          )}
          {post.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </div>

        <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(1.875rem, 4vw, 2.875rem)", fontWeight: 700, color: "var(--fg)", lineHeight: 1.2, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
          {post.title}
        </h1>

        <div style={{ fontSize: "1.125rem", color: "var(--fg-muted)", lineHeight: 1.65, marginBottom: "1.5rem", fontStyle: "italic" }}>
          <InlineMarkdown content={post.excerpt} />
        </div>

        {/* Voice intro */}
        {post.voiceIntroUrl && (
          <div style={{ marginBottom: "1.5rem", padding: "0.875rem 1.25rem", background: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🎙️</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", marginBottom: "0.375rem", fontWeight: 500 }}>Author's voice intro</p>
              <audio controls src={post.voiceIntroUrl} style={{ width: "100%", height: "32px" }} />
            </div>
          </div>
        )}

        {/* Writing replay */}
        {post.writingSnapshots && post.writingSnapshots.length > 1 && (
          <div style={{ marginBottom: "2rem" }}>
            <WritingReplayLazy snapshots={post.writingSnapshots} />
          </div>
        )}
      </div>

      {/* Cover image */}
      {post.coverImage && (
        <div className="animate-fade-up" style={{ animationDelay: "120ms", position: "relative", height: "clamp(200px, 40vw, 440px)", borderRadius: "12px", overflow: "hidden", marginBottom: "3rem", boxShadow: "var(--shadow-lg)" }}>
          <Image src={post.coverImage} alt={post.title} fill style={{ objectFit: "cover" }} priority sizes="(max-width: 800px) 100vw, 800px" />
        </div>
      )}

      {/* Content */}
      <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
        <MarkdownContent content={post.content} />
      </div>

      {post.updatedAt !== post.createdAt && (
        <p style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)", marginTop: "2rem", fontStyle: "italic" }}>
          Last updated {formatDate(post.updatedAt)}
        </p>
      )}

      {/* Reactions — only on published posts */}
      {post.published && (
        <Reactions slug={post.slug} initial={post.reactions || { like: 0, heart: 0, fire: 0 }} />
      )}

      {/* Hire me CTA */}
      {post.published && process.env.NEXT_PUBLIC_HIRE_ME === "true" && (
        <div style={{ marginTop: "2.5rem", padding: "1.25rem 1.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontWeight: 600, color: "var(--fg)", fontSize: "0.9375rem", marginBottom: "0.25rem" }}>Available for freelance work</p>
            <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem" }}>Frontend engineering, product consulting, or just a conversation.</p>
          </div>
          <a href={process.env.NEXT_PUBLIC_CALENDLY_URL || "mailto:mihirsuman1@gmail.com"} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ whiteSpace: "nowrap", textDecoration: "none" }}>
            Book a call →
          </a>
        </div>
      )}

      {/* Related posts — only on published */}
      {post.published && related.length > 0 && (
        <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.25rem" }}>Related posts</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {related.map((r) => (
              <Link key={r.slug} href={`/post/${r.slug}`} style={{ textDecoration: "none" }}>
                <div className="card" style={{ padding: "1rem 1.25rem", transition: "all 0.15s" }}>
                  <p style={{ fontWeight: 600, color: "var(--fg)", fontSize: "0.9375rem", marginBottom: "0.25rem" }}>{r.title}</p>
                  <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {post.published && <SubscribeWidget />}

      {/* Comments — only on published */}
      {post.published && (
        <CommentSectionLazy slug={post.slug} initialComments={comments} />
      )}
    </article>
  );
}
