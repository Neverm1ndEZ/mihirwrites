"use client";

import { useState } from "react";

export default function SubscribeWidget() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok || res.status === 200) {
        setStatus("success");
        setMsg(data.message || "Subscribed!");
        setEmail("");
      } else {
        throw new Error(data.error || "Failed");
      }
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "2rem",
        marginTop: "3rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✉️</div>
      <h3
        style={{
          fontFamily: "var(--font-lora), serif",
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "var(--fg)",
          marginBottom: "0.5rem",
        }}
      >
        Stay in the loop
      </h3>
      <p style={{ color: "var(--fg-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
        New posts land in your inbox. No noise, no ads.
      </p>

      {status === "success" ? (
        <p style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.9375rem" }}>{msg} 🎉</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", maxWidth: "400px", margin: "0 auto" }}>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ flex: 1, fontSize: "0.875rem" }}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="btn btn-primary"
            style={{ whiteSpace: "nowrap", opacity: status === "loading" ? 0.7 : 1 }}
          >
            {status === "loading" ? "…" : "Subscribe"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p style={{ color: "#dc2626", fontSize: "0.8125rem", marginTop: "0.5rem" }}>{msg}</p>
      )}
    </div>
  );
}
