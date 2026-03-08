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

// ─── Device Fingerprinting ────────────────────────────────────────────────────
// Combines stable, passive browser signals into a deterministic device ID.
// Clearing localStorage does NOT reset this — a new UUID is only the fallback
// for environments where signals are unavailable (e.g. SSR / bots).
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("mw-fp", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("mw-fp", 4, 17);
    return canvas.toDataURL().slice(-40); // last 40 chars encode GPU/renderer diffs
  } catch {
    return "";
  }
}

async function getDeviceFingerprint(): Promise<string> {
  const CACHE_KEY = "mw_device_fp";

  // 1. Try cache first (localStorage might be cleared, but this is just a speed optimisation)
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached && cached.length >= 16) return cached;
  } catch { /* incognito may throw */ }

  // 2. Collect stable device signals
  const signals = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency ?? "",
    screen.colorDepth,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    navigator.platform ?? "",
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? "",
    getCanvasFingerprint(),
    // WebGL renderer — encodes GPU info
    (() => {
      try {
        const gl = document.createElement("canvas").getContext("webgl");
        const ext = gl?.getExtension("WEBGL_debug_renderer_info");
        return ext ? gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "" : "";
      } catch { return ""; }
    })(),
  ].join("||");

  const fp = await hashString(signals);

  // 3. Cache it — if localStorage is unavailable the hash is still computed fresh each time
  try { localStorage.setItem(CACHE_KEY, fp); } catch { /* */ }

  return fp;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Reactions({ slug, initial }: ReactionsProps) {
  const [counts, setCounts] = useState(initial);
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const key = `mw_reacted_${slug}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) setReacted(new Set(JSON.parse(saved)));
    } catch { /* */ }
    setReady(true);
  }, [slug]);

  async function handleReact(type: "like" | "heart" | "fire") {
    if (reacted.has(type) || loading) return;
    setLoading(type);

    // Optimistic update
    setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    const next = new Set([...reacted, type]);
    setReacted(next);
    try { localStorage.setItem(`mw_reacted_${slug}`, JSON.stringify([...next])); } catch { /* */ }

    try {
      // Use the stable device fingerprint — not a per-localStorage UUID
      const voterId = await getDeviceFingerprint();

      const res = await fetch(`/api/posts/${slug}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, voterId }),
      });
      const data = await res.json();

      if (res.status === 409) {
        // Already voted server-side — sync state, don't rollback UI
        return;
      }
      if (res.ok) {
        setCounts(data.reactions);
      } else {
        // Rollback on genuine error
        setCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
        const rolled = new Set(reacted);
        rolled.delete(type);
        setReacted(rolled);
        try { localStorage.setItem(`mw_reacted_${slug}`, JSON.stringify([...rolled])); } catch { /* */ }
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
        One reaction per device
      </span>
    </div>
  );
}
