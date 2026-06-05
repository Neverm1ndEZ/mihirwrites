"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import MoodGate from "./MoodGate";
import InlineMarkdown from "./InlineMarkdown";

interface PostItem {
  _id: string; title: string; slug: string; excerpt: string;
  coverImage?: string; tags: string[]; createdAt: string;
  featured?: boolean; readingTime?: number; mood?: string;
  category?: "personal" | "professional";
  reactions?: { like: number; heart: number; fire: number };
  commentCount?: number;
}

interface HomeClientProps {
  posts: PostItem[];
}

type Tab = "personal" | "professional";

const moodEmojis: Record<string, string> = {
  curious: "🔍", nostalgic: "🌅", excited: "⚡", reflective: "🌊", lost: "🌑", angry: "🔥",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function Paywall() {
  return (
    <div style={{
      textAlign: "center", padding: "5rem 2rem",
      border: "1px solid var(--border)", borderRadius: "12px",
      background: "var(--bg-secondary)",
    }}>
      <div style={{ fontSize: "2rem", marginBottom: "1.25rem" }}>🔒</div>
      <h2 style={{
        fontFamily: "var(--font-lora), serif", fontSize: "1.375rem",
        fontWeight: 700, color: "var(--fg)", marginBottom: "0.75rem",
        letterSpacing: "-0.02em",
      }}>
        Personal writing is members-only
      </h2>
      <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem", maxWidth: "36ch", margin: "0 auto 2rem", lineHeight: 1.65 }}>
        The raw, unfiltered stuff — moods, memories, midnight thoughts. Access opens up soon.
      </p>
      <span style={{
        display: "inline-block", padding: "0.625rem 1.5rem",
        border: "1px solid var(--border)", borderRadius: "8px",
        fontSize: "0.875rem", color: "var(--fg-muted)",
        cursor: "default",
      }}>
        Coming soon
      </span>
    </div>
  );
}

function FeaturedCard({ post }: { post: PostItem }) {
  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <Link href={`/post/${post.slug}`} style={{ textDecoration: "none" }}>
        <div className="card" style={{ padding: "0", overflow: "hidden", border: "1px solid var(--accent)", borderRadius: "12px" }}>
          {post.coverImage && (
            <div style={{ position: "relative", height: "200px" }}>
              <Image src={post.coverImage} alt={post.title} fill style={{ objectFit: "cover" }} sizes="800px" />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
              <span style={{ position: "absolute", top: "0.75rem", left: "0.75rem", background: "var(--accent)", color: "#fff", fontSize: "0.6875rem", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Featured
              </span>
            </div>
          )}
          <div style={{ padding: "1.25rem 1.5rem" }}>
            {!post.coverImage && (
              <span style={{ display: "inline-block", background: "var(--accent)", color: "#fff", fontSize: "0.6875rem", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                Featured
              </span>
            )}
            <h2 style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--fg)", lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
              {post.title}
            </h2>
            <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem", lineHeight: 1.65 }}><InlineMarkdown content={post.excerpt} /></p>
          </div>
        </div>
      </Link>
    </div>
  );
}

function PostList({ posts, emptyLabel }: { posts: PostItem[]; emptyLabel: string }) {
  if (posts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--fg-subtle)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✦</div>
        <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.125rem" }}>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {posts.map((post, i) => (
        <article
          key={post._id}
          className="animate-fade-up"
          style={{ animationDelay: `${i * 60}ms`, paddingBottom: "2.5rem", marginBottom: "2.5rem", borderBottom: "1px solid var(--border)" }}
        >
          <Link href={`/post/${post.slug}`} style={{ textDecoration: "none", display: "block" }}>
            {post.coverImage && (
              <div style={{ position: "relative", height: "240px", borderRadius: "10px", overflow: "hidden", marginBottom: "1.25rem" }}>
                <Image src={post.coverImage} alt={post.title} fill style={{ objectFit: "cover" }} sizes="(max-width: 800px) 100vw, 800px" />
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
              <time style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)", fontWeight: 500, letterSpacing: "0.02em" }}>{formatDate(post.createdAt)}</time>
              {post.readingTime && <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>{post.readingTime} min</span>}
              {post.mood && <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }} title={post.mood}>{moodEmojis[post.mood]}</span>}
              {post.tags.slice(0, 3).map((tag) => <span key={tag} className="tag" style={{ fontSize: "0.6875rem" }}>{tag}</span>)}
            </div>

            <h2 style={{ fontFamily: "var(--font-lora), serif", fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)", fontWeight: 600, color: "var(--fg)", lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: "0.6rem", transition: "color 0.15s" }}>
              {post.title}
            </h2>

            <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem", lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              <InlineMarkdown content={post.excerpt} />
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.875rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--accent)", fontSize: "0.875rem", fontWeight: 500 }}>
                Read more →
              </span>
              <div style={{ display: "flex", gap: "0.875rem", alignItems: "center" }}>
                {post.commentCount !== undefined && post.commentCount > 0 && (
                  <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>💬 {post.commentCount}</span>
                )}
                {post.reactions && (post.reactions.like + post.reactions.heart + post.reactions.fire > 0) && (
                  <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>
                    {post.reactions.like + post.reactions.heart + post.reactions.fire} reactions
                  </span>
                )}
              </div>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}

export default function HomeClient({ posts }: HomeClientProps) {
  const [tab, setTab] = useState<Tab>("professional");
  const [mood, setMood] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin/audit").then((r) => { if (r.ok) setIsAdmin(true); });
  }, []);

  const tabPosts = posts.filter((p) => (p.category || "personal") === tab);
  const featured = tabPosts.find((p) => p.featured);
  const nonFeatured = tabPosts.filter((p) => !p.featured);
  const filtered = tab === "personal" && mood
    ? nonFeatured.filter((p) => p.mood === mood)
    : nonFeatured;

  const showPaywall = tab === "personal" && !isAdmin;

  return (
    <>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", marginBottom: "2.5rem", borderBottom: "1px solid var(--border)" }}>
        {(["professional", "personal"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMood(""); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "0.625rem 0", marginRight: "2rem",
              fontSize: "0.9375rem", fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "var(--fg)" : "var(--fg-muted)",
              borderBottom: tab === t ? "2px solid var(--fg)" : "2px solid transparent",
              marginBottom: "-1px",
              transition: "color 0.15s, border-color 0.15s",
              fontFamily: "inherit",
            }}
          >
            {t === "personal" ? "Personal" : "Work"}
          </button>
        ))}
      </div>

      {showPaywall ? (
        <Paywall />
      ) : (
        <>
          {featured && <FeaturedCard post={featured} />}
          {tab === "personal" && <MoodGate onMoodChange={setMood} />}
          <PostList
            posts={filtered}
            emptyLabel={
              mood
                ? `No posts tagged with "${mood}" mood yet.`
                : tab === "personal"
                ? "No personal posts yet."
                : "No work posts yet."
            }
          />
        </>
      )}
    </>
  );
}
