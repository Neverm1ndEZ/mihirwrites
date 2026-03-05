"use client";

import { useState, useEffect } from "react";

const MOODS = [
  { value: "", label: "All", emoji: "✦" },
  { value: "curious", label: "Curious", emoji: "🔍" },
  { value: "nostalgic", label: "Nostalgic", emoji: "🌅" },
  { value: "excited", label: "Excited", emoji: "⚡" },
  { value: "reflective", label: "Reflective", emoji: "🌊" },
  { value: "lost", label: "Lost", emoji: "🌑" },
  { value: "angry", label: "Fired up", emoji: "🔥" },
];

interface MoodGateProps {
  onMoodChange: (mood: string) => void;
}

export default function MoodGate({ onMoodChange }: MoodGateProps) {
  const [selected, setSelected] = useState("");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 300);
    return () => clearTimeout(timer);
  }, []);

  function selectMood(mood: string) {
    setSelected(mood);
    onMoodChange(mood);
  }

  if (!shown) return null;

  return (
    <div
      style={{
        marginBottom: "2.5rem",
        padding: "1.25rem 1.5rem",
        background: "var(--bg-secondary)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
      }}
    >
      <p style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)", marginBottom: "0.875rem", fontWeight: 500 }}>
        How are you feeling right now?
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {MOODS.map((m) => (
          <button
            key={m.value}
            onClick={() => selectMood(m.value)}
            style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              padding: "0.375rem 0.875rem", borderRadius: "20px",
              border: `1px solid ${selected === m.value ? "var(--accent)" : "var(--border)"}`,
              background: selected === m.value ? "var(--accent)" : "var(--bg-card)",
              color: selected === m.value ? "#fff" : "var(--fg-muted)",
              fontSize: "0.8125rem", fontWeight: selected === m.value ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <span>{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
