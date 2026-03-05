"use client";

import { useState, useEffect, useRef } from "react";

interface WritingReplayProps {
  snapshots: { content: string; capturedAt: string }[];
}

export default function WritingReplay({ snapshots }: WritingReplayProps) {
  const [open, setOpen] = useState(false);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(120); // ms per frame
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setFrame((f) => {
          if (f >= sorted.length - 1) {
            setPlaying(false);
            return f;
          }
          return f + 1;
        });
      }, speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, sorted.length]);

  if (!sorted.length) return null;

  const currentContent = sorted[frame]?.content || "";
  const progress = sorted.length > 1 ? (frame / (sorted.length - 1)) * 100 : 100;

  return (
    <>
      <button
        onClick={() => { setOpen(true); setFrame(0); setPlaying(false); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.375rem",
          background: "none", border: "1px solid var(--border)",
          borderRadius: "20px", padding: "0.375rem 0.875rem",
          color: "var(--fg-muted)", fontSize: "0.8125rem", cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        ⏱ Watch this being written
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{
              background: "var(--bg-card)", borderRadius: "16px",
              width: "100%", maxWidth: "700px", maxHeight: "85vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            {/* Header */}
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--fg)" }}>Writing Replay</span>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>{frame + 1} / {sorted.length}</span>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--fg)" }}
                >
                  <option value={300}>0.5×</option>
                  <option value={120}>1×</option>
                  <option value={60}>2×</option>
                  <option value={30}>4×</option>
                </select>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: "1.25rem", lineHeight: 1 }}>×</button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "auto", padding: "1.25rem", fontFamily: "monospace", fontSize: "0.8125rem", lineHeight: 1.75, color: "var(--fg-muted)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {currentContent || <span style={{ color: "var(--fg-subtle)" }}>…</span>}
            </div>

            {/* Controls */}
            <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
              {/* Progress bar */}
              <div
                style={{ height: "4px", background: "var(--border)", borderRadius: "2px", marginBottom: "0.875rem", cursor: "pointer" }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  setFrame(Math.round(pct * (sorted.length - 1)));
                }}
              >
                <div style={{ height: "100%", background: "var(--accent)", borderRadius: "2px", width: `${progress}%`, transition: "width 0.1s" }} />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => setFrame(0)} className="btn btn-ghost" style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}>⏮</button>
                <button onClick={() => setFrame(Math.max(0, frame - 1))} className="btn btn-ghost" style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}>◀</button>
                <button
                  onClick={() => {
                    if (frame >= sorted.length - 1) setFrame(0);
                    setPlaying(!playing);
                  }}
                  className="btn btn-primary"
                  style={{ padding: "0.375rem 1rem", fontSize: "0.875rem", minWidth: "60px" }}
                >
                  {playing ? "⏸" : "▶"}
                </button>
                <button onClick={() => setFrame(Math.min(sorted.length - 1, frame + 1))} className="btn btn-ghost" style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}>▶</button>
                <button onClick={() => setFrame(sorted.length - 1)} className="btn btn-ghost" style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}>⏭</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
