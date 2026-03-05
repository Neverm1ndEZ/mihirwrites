"use client";

import { useState } from "react";

interface Comment {
  _id: string;
  name: string;
  content: string;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Simple hash → color for avatar
function getAvatarColor(name: string): string {
  const colors = [
    "#b8732a", "#2a7ab8", "#2ab87a", "#7a2ab8",
    "#b82a7a", "#7ab82a", "#2ab8b8", "#b8b82a",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

interface CommentSectionProps {
  slug: string;
  initialComments: Comment[];
}

export default function CommentSection({ slug, initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!content.trim()) { setError("Please write a comment."); return; }
    if (content.trim().length < 5) { setError("Comment is too short."); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), content: content.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post comment");

      setComments([data.comment, ...comments]);
      setName("");
      setContent("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: "4rem" }}>
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "2.5rem",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-lora), serif",
            fontSize: "1.375rem",
            fontWeight: 600,
            color: "var(--fg)",
            marginBottom: "2rem",
            letterSpacing: "-0.02em",
          }}
        >
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>

        {/* Comment form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "2.5rem",
          }}
        >
          <h3
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "var(--fg)",
              marginBottom: "1.25rem",
            }}
          >
            Leave a comment
          </h3>

          <div style={{ marginBottom: "1rem" }}>
            <label className="label">Your name *</label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              maxLength={80}
              required
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label className="label">Comment *</label>
            <textarea
              className="input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts…"
              maxLength={2000}
              rows={4}
              required
            />
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--fg-subtle)",
                marginTop: "0.25rem",
                textAlign: "right",
              }}
            >
              {content.length}/2000
            </div>
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
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "7px",
                padding: "0.625rem 0.875rem",
                color: "#16a34a",
                fontSize: "0.875rem",
                marginBottom: "1rem",
              }}
            >
              Comment posted successfully!
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Posting…" : "Post Comment"}
          </button>
        </form>

        {/* Comments list */}
        {comments.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--fg-subtle)",
              fontStyle: "italic",
            }}
          >
            Be the first to comment.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {comments.map((comment) => (
              <div
                key={comment._id}
                style={{
                  display: "flex",
                  gap: "1rem",
                  padding: "1.25rem",
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: getAvatarColor(comment.name),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(comment.name)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.9375rem",
                        color: "var(--fg)",
                      }}
                    >
                      {comment.name}
                    </span>
                    <time
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--fg-subtle)",
                      }}
                    >
                      {formatDate(comment.createdAt)}
                    </time>
                  </div>
                  <p
                    style={{
                      color: "var(--fg-muted)",
                      fontSize: "0.9375rem",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
