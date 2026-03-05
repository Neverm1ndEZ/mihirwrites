"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              background: "var(--accent)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontSize: "1.375rem",
            }}
          >
            ✦
          </div>
          <h1
            style={{
              fontFamily: "var(--font-lora), serif",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--fg)",
              letterSpacing: "-0.03em",
              marginBottom: "0.375rem",
            }}
          >
            Admin Access
          </h1>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem" }}>
            Enter your password to continue
          </p>
        </div>

        <div className="card" style={{ padding: "2rem" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1.25rem" }}>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                // required
              />
            </div>

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: "7px",
                  padding: "0.625rem 0.875rem",
                  color: "#dc2626",
                  fontSize: "0.875rem",
                  marginBottom: "1.25rem",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
