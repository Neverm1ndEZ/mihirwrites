"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import MoodGate from "./MoodGate";

interface PostItem {
  _id: string; title: string; slug: string; excerpt: string;
  coverImage?: string; tags: string[]; createdAt: string;
  featured?: boolean; readingTime?: number; mood?: string;
  reactions?: { like: number; heart: number; fire: number };
  commentCount?: number;
}

interface HomeClientProps {
  posts: PostItem[];
}

export default function HomeClient({ posts }: HomeClientProps) {
  const [mood, setMood] = useState("");

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  const moodEmojis: Record<string, string> = {
    curious: "🔍", nostalgic: "🌅", excited: "⚡", reflective: "🌊", lost: "🌑", angry: "🔥",
  };

  const filtered = mood ? posts.filter((p) => p.mood === mood) : posts;

  return (
    <>
      <MoodGate onMoodChange={setMood} />

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--fg-subtle)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✦</div>
          <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.125rem" }}>
            {mood ? `No posts tagged with "${mood}" mood yet.` : "No posts yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {filtered.map((post, i) => (
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
                  {post.excerpt}
                </p>

                {/* Footer row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.875rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--accent)", fontSize: "0.875rem", fontWeight: 500 }}>
                    Read more →
                  </span>
                  <div style={{ display: "flex", gap: "0.875rem", alignItems: "center" }}>
                    {post.commentCount !== undefined && post.commentCount > 0 && (
                      <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>
                        💬 {post.commentCount}
                      </span>
                    )}
                    {post.reactions && (
                      <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>
                        {(post.reactions.like + post.reactions.heart + post.reactions.fire > 0)
                          ? `${post.reactions.like + post.reactions.heart + post.reactions.fire} reactions`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
