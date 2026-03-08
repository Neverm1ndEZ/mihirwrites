"use client";

import { useState, useEffect } from "react";

interface ReactionsProps {
  slug: string;
  initial: { like: number; heart: number; fire: number };
}

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "heart", emoji: "❤️", label: "Love" },
  { type: "fire", emoji: "🔥", label: "Fire" },
] as const;

function getOrCreateVoterId(): string {
  const key = "mw_voter_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function Reactions({ slug, initial }: ReactionsProps) {
  const [counts, setCounts] = useState(initial);
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load persisted reactions for this post
    const key = `mw_reacted_${slug}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setReacted(new Set(JSON.parse(saved))); } catch { /* */ }
    }
    setReady(true);
  }, [slug]);

  async function handleReact(type: "like" | "heart" | "fire") {
    if (reacted.has(type) || loading) return;
    setLoading(type);

    // Optimistic update
    setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    const next = new Set([...reacted, type]);
    setReacted(next);
    localStorage.setItem(`mw_reacted_${slug}`, JSON.stringify([...next]));

    try {
      const voterId = getOrCreateVoterId();
      const res = await fetch(`/api/posts/${slug}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, voterId }),
      });
      const data = await res.json();

      if (res.status === 409) {
        // Already voted server-side — just sync the state, counts stay
        return;
      }
      if (res.ok) {
        setCounts(data.reactions);
      } else {
        // Rollback
        setCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
        const rolled = new Set(reacted);
        rolled.delete(type);
        setReacted(rolled);
        localStorage.setItem(`mw_reacted_${slug}`, JSON.stringify([...rolled]));
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{
      display: "flex",
      gap: "0.625rem",
      alignItems: "center",
      marginTop: "2.5rem",
      paddingTop: "1.5rem",
      borderTop: "1px solid var(--border)",
      flexWrap: "wrap",
    }}>
      <span style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)", fontWeight: 500 }}>React:</span>
      {REACTIONS.map(({ type, emoji, label }) => {
        const done = reacted.has(type);
        const isLoading = loading === type;
        return (
          <button
            key={type}
            onClick={() => handleReact(type)}
            disabled={done || !!loading || !ready}
            title={done ? `You reacted with ${label}` : label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              background: done ? "color-mix(in srgb, var(--accent) 10%, var(--bg-card))" : "var(--bg-card, var(--bg-secondary))",
              border: `1px solid ${done ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "20px",
              padding: "0.375rem 0.875rem",
              cursor: done ? "default" : "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--fg)",
              transition: "all 0.15s",
              transform: isLoading ? "scale(1.12)" : "scale(1)",
              opacity: !ready ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: "1rem" }}>{emoji}</span>
            <span style={{ color: done ? "var(--accent)" : "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
              {counts[type]}
            </span>
          </button>
        );
      })}
      <span style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", marginLeft: "auto" }}>
        One reaction per person
      </span>
    </div>
  );
}
