"use client";

import { useState, useEffect } from "react";
import ThreadClient from "./ThreadClient";
import ThreadConstellationView from "./ThreadConstellationView";

interface Thread {
  _id: string;
  content: string;
  category?: "personal" | "professional";
  createdAt: string;
}

type Tab = "personal" | "professional";

function Paywall() {
  return (
    <div style={{
      textAlign: "center", padding: "5rem 2rem",
      border: "1px solid var(--border)", borderRadius: "12px",
      background: "var(--bg-secondary)",
    }}>
      <div style={{ fontSize: "2rem", marginBottom: "1.25rem" }}>🔒</div>
      <h2 style={{
        fontFamily: "var(--font-lora), serif", fontSize: "1.375rem",
        fontWeight: 700, color: "var(--fg)", marginBottom: "0.75rem",
        letterSpacing: "-0.02em",
      }}>
        Personal threads are members-only
      </h2>
      <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem", maxWidth: "36ch", margin: "0 auto 2rem", lineHeight: 1.65 }}>
        The unfiltered half-thoughts and midnight musings. Access opens up soon.
      </p>
      <span style={{
        display: "inline-block", padding: "0.625rem 1.5rem",
        border: "1px solid var(--border)", borderRadius: "8px",
        fontSize: "0.875rem", color: "var(--fg-muted)",
        cursor: "default",
      }}>
        Coming soon
      </span>
    </div>
  );
}

export default function ThreadsPageClient({ threads }: { threads: Thread[] }) {
  const [view, setView] = useState<"list" | "constellation">("list");
  const [tab, setTab] = useState<Tab>("professional");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin/audit").then((r) => { if (r.ok) setIsAdmin(true); });
  }, []);

  const tabThreads = threads
    .map((t) => ({ ...t, category: (t.category || "personal") as "personal" | "professional" }))
    .filter((t) => t.category === tab);

  const showPaywall = tab === "personal" && !isAdmin;

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

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "2rem" }}>
        {(["professional", "personal"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "0.625rem 0", marginRight: "2rem",
              fontSize: "0.9375rem", fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "var(--fg)" : "var(--fg-muted)",
              borderBottom: tab === t ? "2px solid var(--fg)" : "2px solid transparent",
              marginBottom: "-1px",
              transition: "color 0.15s, border-color 0.15s",
              fontFamily: "inherit",
            }}
          >
            {t === "personal" ? "Personal" : "Work"}
          </button>
        ))}
      </div>

      {/* Views */}
      {showPaywall ? (
        <Paywall />
      ) : view === "list" ? (
        <ThreadClient key={tab} initialThreads={tabThreads} activeCategory={tab} />
      ) : (
        <ThreadConstellationView threads={tabThreads} />
      )}
    </div>
  );
}
