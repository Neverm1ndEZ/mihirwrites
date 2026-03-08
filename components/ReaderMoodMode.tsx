"use client";

import { useState, useEffect } from "react";

type Mode = "default" | "coffee" | "night" | "focus" | "story";

const MODES: { id: Mode; emoji: string; label: string; desc: string }[] = [
  { id: "default", emoji: "✦", label: "Default", desc: "Original reading experience" },
  { id: "coffee", emoji: "☕", label: "Coffee", desc: "Warm sepia, slow and cosy" },
  { id: "night", emoji: "🌙", label: "Night Thinker", desc: "Deep dark, soft typography" },
  { id: "focus", emoji: "⚡", label: "Focus", desc: "Just the text, nothing else" },
  { id: "story", emoji: "📖", label: "Story", desc: "Full-screen Kindle-like reading" },
];

const MODE_STYLES: Record<Mode, string> = {
  default: "",
  coffee: `
    .rm-active { --bg: #f5edd6 !important; --bg-secondary: #ede2c4 !important; --fg: #3b2f1e !important; --fg-muted: #6b5740 !important; --fg-subtle: #9a8265 !important; --border: #d9c9a8 !important; --card-bg: #faf4e4 !important; }
    .rm-active body { filter: sepia(18%); letter-spacing: 0.01em; }
    .rm-active * { transition: background-color 0.6s ease, color 0.6s ease !important; }
    .rm-active .animate-fade-up { animation-duration: 1.2s !important; }
  `,
  night: `
    .rm-active { --bg: #09090b !important; --bg-secondary: #101012 !important; --fg: #d4d0c8 !important; --fg-muted: #8a8680 !important; --fg-subtle: #5a5650 !important; --border: #1e1d1b !important; --card-bg: #111113 !important; --accent: #c8914a !important; }
    .rm-active body { font-size: 17px; line-height: 1.9; }
    .rm-active .prose { font-size: 1.1rem; max-width: 62ch; }
    .rm-active h1, .rm-active h2, .rm-active h3 { letter-spacing: -0.025em; font-weight: 500; }
  `,
  focus: `
    .rm-active nav, .rm-active footer,
    .rm-active [class*="subscribe"], .rm-active [class*="Subscribe"],
    .rm-active [class*="related"], .rm-active [class*="Related"],
    .rm-active [class*="comment"], .rm-active [class*="Comment"],
    .rm-active [class*="reaction"], .rm-active [class*="Reaction"],
    .rm-active [class*="ambient"], .rm-active [class*="Ambient"],
    .rm-active [class*="replay"], .rm-active [class*="Replay"],
    .rm-active [class*="voice"], .rm-active [class*="Voice"],
    .rm-active [class*="BackToTop"], .rm-active [class*="ReadingProgress"],
    .rm-active [class*="hire"], .rm-active [class*="Hire"],
    .rm-active .tag { display: none !important; }
    .rm-active { --bg: #fefefe !important; --fg: #1a1a1a !important; --bg-secondary: #f5f5f5 !important; }
    [data-theme="dark"] .rm-active { --bg: #0d0d0d !important; --fg: #e0e0e0 !important; }
    .rm-active .prose { max-width: 64ch; margin: 0 auto; font-size: 1.125rem; line-height: 1.85; }
    .rm-active .post-article { padding-top: 4rem !important; }
  `,
  story: `
    .rm-active nav { display: none !important; }
    .rm-active .post-article { max-width: 100vw !important; padding: 0 !important; }
    .rm-active article.post-article { max-width: 100vw !important; }
    .rm-story-wrap { position: fixed; inset: 0; z-index: 200; overflow-y: auto; background: var(--story-bg, #1a1208); display: flex; justify-content: center; padding: 5vh 1.5rem 8vh; }
    .rm-story-inner { max-width: 680px; width: 100%; }
    .rm-story-inner h1 { font-size: clamp(1.75rem, 3.5vw, 2.5rem); font-weight: 700; color: #e8dcc8; line-height: 1.22; margin-bottom: 0.75rem; letter-spacing: -0.03em; }
    .rm-story-inner .prose { font-family: 'Lora', Georgia, serif; font-size: 1.1rem; line-height: 1.95; color: #cfc4a8; }
    .rm-story-inner .prose p { margin: 1.4rem 0; }
    .rm-story-inner .prose h2 { color: #e8dcc8; font-size: 1.35rem; margin-top: 2.5rem; }
    .rm-story-inner time, .rm-story-inner .tag { color: #7a6e58 !important; font-size: 0.8rem; }
    .rm-story-close { position: fixed; top: 1.25rem; right: 1.5rem; z-index: 210; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: #cfc4a8; border-radius: 8px; padding: 0.375rem 0.75rem; font-size: 0.8125rem; cursor: pointer; font-family: inherit; }
    .rm-story-close:hover { background: rgba(255,255,255,0.14); }
  `,
};

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
    // Remove all mode classes from html element
    document.documentElement.classList.remove("rm-active");

    // Remove injected style
    const existing = document.getElementById("rm-style");
    if (existing) existing.remove();

    if (next !== "default") {
      document.documentElement.classList.add("rm-active");
      const style = document.createElement("style");
      style.id = "rm-style";
      style.textContent = MODE_STYLES[next];
      document.head.appendChild(style);
    }

    setMode(next);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* */ }
    }
    if (next !== "story") setOpen(false);
  }

  if (!mounted) return null;

  const currentMode = MODES.find((m) => m.id === mode)!;

  return (
    <>
      {/* Story mode escape */}
      {mode === "story" && (
        <button
          className="rm-story-close"
          onClick={() => applyMode("default")}
        >
          ✕ Exit story mode
        </button>
      )}

      {/* Trigger button — fixed bottom right */}
      {mode !== "story" && (
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
              minWidth: "230px",
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
      )}

      <style>{`
        .rm-label { display: none; }
        @media (min-width: 480px) { .rm-label { display: inline; } }
      `}</style>
    </>
  );
}
