"use client";

import { useState } from "react";

interface ReactionsProps {
  slug: string;
  initial: { like: number; heart: number; fire: number };
}

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "heart", emoji: "❤️", label: "Love" },
  { type: "fire", emoji: "🔥", label: "Fire" },
] as const;

export default function Reactions({ slug, initial }: ReactionsProps) {
  const [counts, setCounts] = useState(initial);
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  async function handleReact(type: "like" | "heart" | "fire") {
    if (reacted.has(type) || loading) return;
    setLoading(type);
    try {
      const res = await fetch(`/api/posts/${slug}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        setCounts(data.reactions);
        setReacted((prev) => new Set([...prev, type]));
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
      <span style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)", fontWeight: 500 }}>React:</span>
      {REACTIONS.map(({ type, emoji, label }) => {
        const done = reacted.has(type);
        return (
          <button
            key={type}
            onClick={() => handleReact(type)}
            disabled={done || !!loading}
            title={label}
            style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              background: done ? "var(--bg-secondary)" : "var(--bg-card)",
              border: `1px solid ${done ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "20px", padding: "0.375rem 0.75rem",
              cursor: done ? "default" : "pointer",
              fontSize: "0.875rem", fontWeight: 600, color: "var(--fg)",
              transition: "all 0.15s",
              transform: loading === type ? "scale(1.1)" : "scale(1)",
            }}
          >
            <span style={{ fontSize: "1rem" }}>{emoji}</span>
            <span style={{ color: "var(--fg-muted)" }}>{counts[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
