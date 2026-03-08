"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface WritingReplayProps {
  snapshots: { content: string; capturedAt: string }[];
}

// Compute char-level edit sequence between two strings
function computeEdits(from: string, to: string): Array<{ type: "keep" | "insert" | "delete"; text: string }> {
  // Find longest common prefix
  let pre = 0;
  while (pre < from.length && pre < to.length && from[pre] === to[pre]) pre++;
  // Find longest common suffix (after prefix)
  let suf = 0;
  const maxSuf = Math.min(from.length - pre, to.length - pre);
  while (suf < maxSuf && from[from.length - 1 - suf] === to[to.length - 1 - suf]) suf++;

  const deleted = from.slice(pre, from.length - (suf || 0) || undefined);
  const inserted = to.slice(pre, to.length - (suf || 0) || undefined);
  const suffix = suf > 0 ? from.slice(from.length - suf) : "";

  const edits: Array<{ type: "keep" | "insert" | "delete"; text: string }> = [];
  if (pre > 0) edits.push({ type: "keep", text: from.slice(0, pre) });
  if (deleted) edits.push({ type: "delete", text: deleted });
  if (inserted) edits.push({ type: "insert", text: inserted });
  if (suffix) edits.push({ type: "keep", text: suffix });
  return edits;
}

// Build a flat sequence of "keystrokes" from snapshot transitions
function buildKeystrokes(snapshots: { content: string; capturedAt: string }[]) {
  if (!snapshots.length) return [];
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  // flat array of strings representing each display state
  const frames: string[] = [sorted[0].content];

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i].content;
    const to = sorted[i + 1].content;
    const edits = computeEdits(from, to);

    let current = from;

    for (const edit of edits) {
      if (edit.type === "keep") continue;
      if (edit.type === "delete") {
        // Delete char by char (backwards from the deletion point)
        // Find where in current the deletion starts
        const idx = current.indexOf(edit.text);
        if (idx >= 0) {
          for (let c = edit.text.length; c >= 0; c--) {
            current = current.slice(0, idx) + edit.text.slice(0, c) + current.slice(idx + edit.text.length);
            frames.push(current);
          }
        } else {
          current = current.replace(edit.text, "");
          frames.push(current);
        }
      } else if (edit.type === "insert") {
        // Find where in current to insert
        const insertAt = (() => {
          // The prefix before insertion = everything up to where deleted ended
          // We need to find insertion point relative to edits
          for (const e of edits) {
            if (e.type === "keep") {
              if (current.startsWith(e.text)) continue;
            }
            break;
          }
          // Use the position: prefix length
          const prefix = edits.find(e => e.type === "keep")?.text || "";
          return prefix.length;
        })();

        for (let c = 1; c <= edit.text.length; c++) {
          const newContent =
            current.slice(0, insertAt) +
            edit.text.slice(0, c) +
            current.slice(insertAt);
          frames.push(newContent);
        }
        current = current.slice(0, insertAt) + edit.text + current.slice(insertAt);
      }
    }
    // Ensure we reach the exact target
    frames.push(to);
  }

  return frames;
}

export default function WritingReplay({ snapshots }: WritingReplayProps) {
  const [open, setOpen] = useState(false);
  const [frames, setFrames] = useState<string[]>([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(30); // ms per frame
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  // Build frames lazily when modal opens
  useEffect(() => {
    if (open && frames.length === 0 && sorted.length > 0) {
      const built = buildKeystrokes(sorted);
      setFrames(built);
      setFrameIdx(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Playback loop
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setFrameIdx(f => {
          if (f >= frames.length - 1) { setPlaying(false); return f; }
          return f + 1;
        });
      }, speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, frames.length]);

  // Auto-scroll to bottom of content while playing
  useEffect(() => {
    if (playing && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [frameIdx, playing]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleOpen = useCallback(() => {
    setFrames([]);
    setFrameIdx(0);
    setPlaying(false);
    setOpen(true);
  }, []);

  if (!sorted.length || sorted.length < 2) return null;

  const progress = frames.length > 1 ? (frameIdx / (frames.length - 1)) * 100 : 0;
  const currentText = frames[frameIdx] ?? sorted[sorted.length - 1]?.content ?? "";

  // Show cursor at end of current text
  const lines = currentText.split("\n");

  const duration = Math.round(
    (new Date(sorted[sorted.length - 1].capturedAt).getTime() - new Date(sorted[0].capturedAt).getTime()) / 60000
  );

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "var(--fg-muted)",
          fontFamily: "inherit",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = "var(--accent)";
          b.style.color = "var(--accent)";
        }}
        onMouseLeave={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = "var(--border)";
          b.style.color = "var(--fg-muted)";
        }}
      >
        <span>⌨️</span>
        Watch this being written
        {duration > 0 && (
          <span style={{
            background: "var(--border)",
            borderRadius: "4px",
            padding: "1px 6px",
            fontSize: "0.6875rem",
            color: "var(--fg-subtle)",
          }}>
            ~{duration}m
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#0a0a08",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.875rem 1.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em", fontFamily: "monospace" }}>
                WRITING REPLAY
              </span>
              {duration > 0 && (
                <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: "4px" }}>
                  {duration} minute session
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)", fontVariantNumeric: "tabular-nums", fontFamily: "monospace" }}>
                {frameIdx + 1} / {frames.length}
              </span>
              <select
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                style={{
                  fontSize: "0.6875rem",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value={80}>0.5×</option>
                <option value={30}>1×</option>
                <option value={12}>2.5×</option>
                <option value={4}>8×</option>
              </select>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "1rem",
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >×</button>
            </div>
          </div>

          {/* Writing area */}
          <div
            ref={contentRef}
            style={{
              flex: 1,
              overflow: "auto",
              padding: "clamp(2rem, 6vw, 5rem) clamp(1rem, 8vw, 8rem)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {frames.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.2)", fontFamily: "monospace", fontSize: "0.875rem", margin: "auto" }}>
                Building replay…
              </div>
            ) : (
              <div style={{
                maxWidth: "680px",
                width: "100%",
                margin: "0 auto",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: "clamp(1rem, 2vw, 1.1875rem)",
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.75)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: "4rem",
              }}>
                {currentText}
                {playing && (
                  <span style={{
                    display: "inline-block",
                    width: "2px",
                    height: "1.1em",
                    background: "rgba(232, 162, 58, 0.9)",
                    marginLeft: "1px",
                    verticalAlign: "text-bottom",
                    animation: "caretBlink 0.7s step-end infinite",
                  }} />
                )}
                {!playing && frameIdx < frames.length - 1 && (
                  <span style={{
                    display: "inline-block",
                    width: "2px",
                    height: "1.1em",
                    background: "rgba(232, 162, 58, 0.5)",
                    marginLeft: "1px",
                    verticalAlign: "text-bottom",
                  }} />
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "1rem 1.5rem",
            flexShrink: 0,
            background: "rgba(0,0,0,0.3)",
          }}>
            {/* Progress bar */}
            <div
              style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", marginBottom: "1rem", cursor: "pointer", position: "relative" }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                setFrameIdx(Math.round(pct * (frames.length - 1)));
              }}
            >
              <div style={{
                height: "100%",
                background: "rgba(232, 162, 58, 0.8)",
                borderRadius: "2px",
                width: `${progress}%`,
                transition: "width 0.05s linear",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", right: "-4px", top: "50%", transform: "translateY(-50%)",
                  width: "9px", height: "9px", background: "#e8a23a", borderRadius: "50%",
                  boxShadow: "0 0 6px rgba(232,162,58,0.6)",
                }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}>
              {[
                { label: "⏮", action: () => setFrameIdx(0), title: "Beginning" },
                { label: "◀", action: () => setFrameIdx(Math.max(0, frameIdx - 1)), title: "Back 1 frame" },
              ].map(({ label, action, title }) => (
                <button key={label} onClick={action} title={title} style={{
                  width: "34px", height: "34px", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px",
                  cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "0.875rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{label}</button>
              ))}

              <button
                onClick={() => {
                  if (frames.length === 0) return;
                  if (frameIdx >= frames.length - 1) setFrameIdx(0);
                  setPlaying(p => !p);
                }}
                style={{
                  width: "44px", height: "44px",
                  background: "rgba(232, 162, 58, 0.15)",
                  border: "1px solid rgba(232, 162, 58, 0.3)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "#e8a23a",
                  fontSize: "1.125rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {playing ? "⏸" : "▶"}
              </button>

              {[
                { label: "▶", action: () => setFrameIdx(Math.min(frames.length - 1, frameIdx + 1)), title: "Forward 1 frame" },
                { label: "⏭", action: () => setFrameIdx(frames.length - 1), title: "End" },
              ].map(({ label, action, title }) => (
                <button key={title} onClick={action} title={title} style={{
                  width: "34px", height: "34px", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px",
                  cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "0.875rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes caretBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
