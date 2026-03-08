"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  mood?: string;
  createdAt: string;
}

const MOOD_EMOJIS: Record<string, string> = {
  curious: "🔍", nostalgic: "🌅", excited: "⚡", reflective: "🌊", lost: "🌑", angry: "🔥",
};

function fuzzyScore(query: string, post: Post): number {
  const q = query.toLowerCase();
  const title = post.title.toLowerCase();
  const excerpt = post.excerpt.toLowerCase();
  const tags = post.tags.join(" ").toLowerCase();

  if (title.includes(q)) return 100 + (q.length / title.length) * 100;
  if (excerpt.includes(q)) return 60;
  if (tags.includes(q)) return 40;

  // Word-level match
  const words = q.split(/\s+/);
  let score = 0;
  for (const w of words) {
    if (w.length < 2) continue;
    if (title.includes(w)) score += 20;
    if (excerpt.includes(w)) score += 10;
    if (tags.includes(w)) score += 8;
  }
  return score;
}

export default function CommandPalette({ posts }: { posts: Post[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = query.trim()
    ? posts
        .map((p) => ({ post: p, score: fuzzyScore(query, p) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 7)
        .map((r) => r.post)
    : posts.slice(0, 5);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected(0);
  }, []);

  const navigate = useCallback((slug: string) => {
    close();
    router.push(`/post/${slug}`);
  }, [close, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      if (results[selected]) navigate(results[selected].slug);
    }
  }

  function highlightMatch(text: string, q: string): React.ReactNode {
    if (!q.trim()) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent)", borderRadius: "2px", padding: "0 1px" }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          width: "100%",
          // maxWidth: "440px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "0.625rem 0.875rem",
          color: "var(--fg-subtle)",
          fontSize: "0.875rem",
          cursor: "pointer",
          textAlign: "left",
          marginBottom: "1.5rem",
          fontFamily: "inherit",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <span style={{ opacity: 0.6 }}>🔍</span>
        <span style={{ flex: 1 }}>Search posts…</span>
        <kbd style={{
          display: "inline-flex",
          gap: "2px",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "1px 5px",
          fontSize: "0.6875rem",
          color: "var(--fg-subtle)",
          fontFamily: "inherit",
        }}>⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 300,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "clamp(3rem, 12vh, 8rem)",
            padding: "clamp(3rem, 12vh, 8rem) 1rem 1rem",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div style={{
            background: "var(--bg-card, var(--bg-secondary))",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "560px",
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          }}>
            {/* Search input */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.875rem 1.125rem",
              borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: "1rem", opacity: 0.5 }}>🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by title, tag, excerpt…"
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  fontSize: "1rem",
                  color: "var(--fg)",
                  fontFamily: "inherit",
                }}
              />
              {query && (
                <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: "1rem", padding: 0, lineHeight: 1 }}>×</button>
              )}
              <kbd style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px 6px", cursor: "pointer" }} onClick={close}>
                esc
              </kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: "360px", overflowY: "auto" }}>
              {results.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--fg-subtle)", fontSize: "0.875rem" }}>
                  No posts match &ldquo;{query}&rdquo;
                </div>
              ) : (
                results.map((post, i) => (
                  <button
                    key={post._id}
                    onClick={() => navigate(post.slug)}
                    onMouseEnter={() => setSelected(i)}
                    style={{
                      width: "100%",
                      display: "flex",
                      gap: "0.875rem",
                      alignItems: "flex-start",
                      padding: "0.875rem 1.125rem",
                      background: selected === i ? "var(--bg-secondary)" : "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      transition: "background 0.1s",
                    }}
                  >
                    <span style={{ fontSize: "1.125rem", marginTop: "1px", flexShrink: 0 }}>
                      {post.mood ? MOOD_EMOJIS[post.mood] : "✦"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "var(--fg)", fontSize: "0.9375rem", marginBottom: "0.25rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {highlightMatch(post.title, query)}
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {highlightMatch(post.excerpt, query)}
                      </div>
                      {post.tags.length > 0 && (
                        <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem", flexWrap: "wrap" }}>
                          {post.tags.slice(0, 4).map((tag) => (
                            <span key={tag} style={{
                              fontSize: "0.6875rem",
                              background: query && tag.toLowerCase().includes(query.toLowerCase())
                                ? "color-mix(in srgb, var(--accent) 15%, var(--bg-secondary))"
                                : "var(--bg-secondary)",
                              border: "1px solid var(--border)",
                              borderRadius: "20px",
                              padding: "1px 7px",
                              color: query && tag.toLowerCase().includes(query.toLowerCase()) ? "var(--accent)" : "var(--fg-subtle)",
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", flexShrink: 0, marginTop: "3px" }}>
                      {selected === i ? "↵" : ""}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "0.5rem 1.125rem",
              display: "flex",
              gap: "1rem",
              fontSize: "0.6875rem",
              color: "var(--fg-subtle)",
              borderTop: "1px solid var(--border)",
            }}>
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>esc close</span>
              <span style={{ marginLeft: "auto" }}>{results.length} result{results.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
