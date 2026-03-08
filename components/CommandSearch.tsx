"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface PostItem {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  mood?: string;
}

const MOOD_EMOJIS: Record<string, string> = {
  curious: "🔍", nostalgic: "🌅", excited: "⚡", reflective: "🌊", lost: "🌑", angry: "🔥",
};

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "color-mix(in srgb, var(--accent) 25%, transparent)", color: "inherit", borderRadius: "2px", padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function CommandSearch({ posts }: { posts: PostItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? posts.filter(p => {
        const q = query.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q)) ||
          (p.mood && p.mood.toLowerCase().includes(q))
        );
      }).slice(0, 8)
    : posts.slice(0, 6);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelected(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleOpen();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && filtered[selected]) {
      router.push(`/post/${filtered[selected].slug}`);
      setOpen(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.375rem 0.75rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.8125rem",
          color: "var(--fg-subtle)",
          fontFamily: "inherit",
          transition: "all 0.15s",
          width: "100%",
          maxWidth: "240px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <span>🔍</span>
          <span>Search posts…</span>
        </div>
        <kbd style={{
          fontSize: "0.6875rem",
          background: "var(--border)",
          border: "1px solid var(--border-strong)",
          borderRadius: "4px",
          padding: "1px 5px",
          color: "var(--fg-subtle)",
          fontFamily: "inherit",
        }}>⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 300,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "clamp(3rem, 10vw, 8rem) 1rem 1rem",
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            width: "100%",
            maxWidth: "560px",
            background: "var(--bg)",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
          }}>
            {/* Search input */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 1.25rem",
              borderBottom: filtered.length ? "1px solid var(--border)" : "none",
            }}>
              <span style={{ fontSize: "1.125rem", flexShrink: 0 }}>🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search by title, tag, mood…"
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
              <button
                onClick={() => setOpen(false)}
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "5px", padding: "2px 6px", fontSize: "0.75rem", color: "var(--fg-subtle)", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
              >
                Esc
              </button>
            </div>

            {/* Results */}
            {filtered.length > 0 && (
              <div style={{ maxHeight: "360px", overflow: "auto" }}>
                {!query && (
                  <div style={{ padding: "0.5rem 1.25rem 0.25rem", fontSize: "0.6875rem", color: "var(--fg-subtle)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Recent posts
                  </div>
                )}
                {filtered.map((post, i) => (
                  <button
                    key={post._id}
                    onClick={() => { router.push(`/post/${post.slug}`); setOpen(false); }}
                    onMouseEnter={() => setSelected(i)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      width: "100%",
                      padding: "0.75rem 1.25rem",
                      background: i === selected ? "var(--bg-secondary)" : "transparent",
                      border: "none",
                      borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {post.mood && <span style={{ fontSize: "0.875rem" }}>{MOOD_EMOJIS[post.mood]}</span>}
                      <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--fg)" }}>
                        {highlight(post.title, query)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {highlight(post.excerpt, query)}
                    </p>
                    {post.tags.length > 0 && (
                      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                        {post.tags.slice(0, 4).map(tag => (
                          <span key={tag} style={{
                            fontSize: "0.6875rem",
                            background: query && tag.toLowerCase().includes(query.toLowerCase()) ? "color-mix(in srgb, var(--accent) 15%, var(--bg-secondary))" : "var(--bg-secondary)",
                            border: `1px solid ${query && tag.toLowerCase().includes(query.toLowerCase()) ? "var(--accent)" : "var(--border)"}`,
                            color: "var(--fg-subtle)",
                            borderRadius: "20px",
                            padding: "1px 6px",
                          }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {query && filtered.length === 0 && (
              <div style={{ padding: "2rem 1.25rem", textAlign: "center", color: "var(--fg-subtle)", fontSize: "0.875rem" }}>
                No posts matching &ldquo;{query}&rdquo;
              </div>
            )}

            <div style={{ padding: "0.5rem 1.25rem", borderTop: "1px solid var(--border)", display: "flex", gap: "1rem", fontSize: "0.6875rem", color: "var(--fg-subtle)" }}>
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
