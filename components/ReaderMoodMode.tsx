"use client";

import { useState, useEffect } from "react";

type Mode = "default" | "coffee" | "night" | "focus";

const MODES: { id: Mode; emoji: string; label: string; desc: string }[] = [
  { id: "default", emoji: "✦", label: "Default", desc: "Original reading experience" },
  { id: "coffee", emoji: "☕", label: "Coffee", desc: "Warm sepia, slow and cosy" },
  { id: "night", emoji: "🌙", label: "Night Thinker", desc: "Deep dark, soft typography" },
  { id: "focus", emoji: "⚡", label: "Focus", desc: "Just the text, nothing else" },
];

const STORAGE_KEY = "mw_reader_mode";

export default function ReaderMoodMode() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Mode | null;
      if (saved && MODES.find((m) => m.id === saved)) applyMode(saved, false);
    } catch { /* */ }
  }, []);

  function applyMode(next: Mode, persist = true) {
    // All mode styles live in globals.css keyed off this attribute. Flipping an
    // attribute is far cheaper than inserting/removing a <style> tag, which
    // forces the browser to re-parse CSS and recalc the whole (huge) document.
    const commit = () => {
      if (next === "default") {
        document.documentElement.removeAttribute("data-reader-mode");
      } else {
        document.documentElement.setAttribute("data-reader-mode", next);
      }
    };

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Only animate on a real user switch (persist=true), not the mount-time
    // restore. The View Transition hides the (heavy) full-document restyle
    // behind a GPU-composited circular reveal from the centre of the viewport.
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };
    if (persist && !prefersReduced && typeof doc.startViewTransition === "function") {
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;
      const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const transition = doc.startViewTransition(commit);
      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
              opacity: [0.6, 1],
            },
            {
              duration: 750,
              // Gentle ease-in-out for a soft, even expansion (no fast snap).
              easing: "cubic-bezier(0.45, 0, 0.2, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => { /* transition skipped — state already committed */ });
    } else {
      commit();
    }

    setMode(next);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* */ }
    }
    setOpen(false);
  }

  if (!mounted) return null;

  const currentMode = MODES.find((m) => m.id === mode)!;

  return (
    <>
      {/* Trigger button — fixed bottom right */}
      <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 90 }}>
        {open && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 0.625rem)",
            right: 0,
            background: "var(--bg-card, var(--card-bg, var(--bg-secondary)))",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "0.625rem",
            boxShadow: "var(--shadow-lg)",
            width: "min(250px, calc(100vw - 3rem))",
            maxHeight: "calc(100vh - 6rem)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}>
            <p style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", padding: "0.25rem 0.5rem 0.375rem" }}>
              Reading Mode
            </p>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => applyMode(m.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem 0.625rem",
                  borderRadius: "9px",
                  border: mode === m.id ? "1px solid var(--accent)" : "1px solid transparent",
                  background: mode === m.id ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  fontFamily: "inherit",
                  transition: "all 0.12s",
                }}
              >
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{m.emoji}</span>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--fg)", lineHeight: 1.2 }}>{m.label}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", lineHeight: 1.3 }}>{m.desc}</div>
                </div>
                {mode === m.id && (
                  <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.75rem" }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          title="Reading mode"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            background: mode !== "default" ? "var(--accent)" : "var(--bg-secondary)",
            border: `1px solid ${mode !== "default" ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "20px",
            padding: "0.375rem 0.75rem",
            color: mode !== "default" ? "#fff" : "var(--fg-muted)",
            cursor: "pointer",
            fontSize: "0.8125rem",
            fontWeight: 500,
            boxShadow: "var(--shadow)",
            transition: "all 0.2s",
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>{currentMode.emoji}</span>
          <span className="rm-label">{currentMode.id === "default" ? "Reading" : currentMode.label}</span>
        </button>
      </div>

      <style>{`
        .rm-label { display: none; }
        @media (min-width: 480px) { .rm-label { display: inline; } }
      `}</style>
    </>
  );
}
