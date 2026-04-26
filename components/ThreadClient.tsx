"use client";

import { useState, useEffect } from "react";

interface Thread {
  _id: string;
  content: string;
  category?: "personal" | "professional";
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Render thread content preserving newlines and structure
function ThreadContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div style={{ color: "var(--fg)", fontSize: "1rem", lineHeight: 1.75 }}>
      {lines.map((line, i) => {
        if (line.trim() === "") {
          return <div key={i} style={{ height: "0.75em" }} />;
        }
        return (
          <p key={i} style={{ margin: 0, marginBottom: i < lines.length - 1 ? "0.125rem" : 0 }}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function ThreadClient({ initialThreads, activeCategory = "personal" }: { initialThreads: Thread[]; activeCategory?: "personal" | "professional" }) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/audit").then((r) => { if (r.ok) setIsAdmin(true); });
  }, []);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim(), category: activeCategory }),
      });
      const data = await res.json();
      if (res.ok) {
        setThreads([data.thread, ...threads]);
        setInput("");
      }
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this thought?")) return;
    const res = await fetch(`/api/threads?id=${id}`, { method: "DELETE" });
    if (res.ok) setThreads(threads.filter((t) => t._id !== id));
  }

  return (
    <div>
      {isAdmin && (
        <form onSubmit={handlePost} style={{ marginBottom: "2rem" }}>
          <textarea
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"What's on your mind?\n\nYou can use multiple lines — structure is preserved."}
            maxLength={500}
            rows={4}
            style={{ resize: "vertical", marginBottom: "0.625rem", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>{input.length}/500</span>
            <button type="submit" disabled={posting || !input.trim()} className="btn btn-primary">
              {posting ? "Posting…" : "Post thought"}
            </button>
          </div>
        </form>
      )}

      {threads.length === 0 ? (
        <p style={{ color: "var(--fg-subtle)", textAlign: "center", padding: "4rem 0" }}>Nothing here yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {threads.map((t, i) => (
            <div
              key={t._id}
              style={{
                padding: "1.5rem 0",
                borderBottom: i < threads.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
              }}
            >
              {/* Accent line */}
              <div style={{
                width: "2px",
                background: "var(--accent)",
                borderRadius: "1px",
                alignSelf: "stretch",
                minHeight: "24px",
                flexShrink: 0,
                marginTop: "4px",
                opacity: 0.7,
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <ThreadContent content={t.content} />
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.625rem" }}>
                  <time style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>{timeAgo(t.createdAt)}</time>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(t._id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: "0.75rem", padding: 0 }}
                    >
                      delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
