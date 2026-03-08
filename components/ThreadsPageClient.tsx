"use client";

import { useState } from "react";
import ThreadClient from "./ThreadClient";
import ThreadConstellationView from "./ThreadConstellationView";

interface Thread {
  _id: string;
  content: string;
  createdAt: string;
}

export default function ThreadsPageClient({ threads }: { threads: Thread[] }) {
  const [view, setView] = useState<"list" | "constellation">("list");

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem 1.25rem 5rem" }}>
      {/* Header */}
      <div style={{
        marginBottom: "2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "1rem",
        flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-lora), serif",
            fontSize: "clamp(1.625rem, 4vw, 2rem)",
            fontWeight: 700,
            color: "var(--fg)",
            letterSpacing: "-0.03em",
            marginBottom: "0.375rem",
          }}>
            Thread of Thought
          </h1>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem" }}>
            Half-formed thoughts. Questions I&apos;m sitting with. Things I noticed.
          </p>
        </div>

        {/* View toggle */}
        <div style={{
          display: "flex",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          overflow: "hidden",
          flexShrink: 0,
          height: "fit-content",
        }}>
          {(["list", "constellation"] as const).map((v, i) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "0.4rem 0.875rem",
                fontSize: "0.8125rem",
                border: "none",
                borderRight: i === 0 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
                background: view === v ? "var(--accent)" : "transparent",
                color: view === v ? "#fff" : "var(--fg-muted)",
                fontFamily: "inherit",
                fontWeight: view === v ? 500 : 400,
                transition: "all 0.15s",
              }}
            >
              {v === "list" ? "☰ List" : "✦ Map"}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      {view === "list" ? (
        <ThreadClient initialThreads={threads} />
      ) : (
        <ThreadConstellationView threads={threads} />
      )}
    </div>
  );
}
