"use client";

import { useState } from "react";

interface Comment {
  _id: string;
  name: string;
  content: string;
  isAdmin?: boolean;
  parentId?: string | null;
  mentions?: string[];
  createdAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = ["#b8732a","#2a7ab8","#2ab87a","#7a2ab8","#b82a7a","#7ab82a","#2ab8b8","#b8b82a"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

function renderContent(content: string): React.ReactNode {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} style={{ color: "var(--accent)", fontWeight: 600 }}>{part}</span>
    ) : part
  );
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
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyName, setReplyName] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  // Top-level comments
  const topLevel = comments.filter((c) => !c.parentId);
  // Replies map
  const repliesFor = (id: string) => comments.filter((c) => c.parentId === id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(false);
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
      if (!res.ok) throw new Error(data.error || "Failed");
      setComments([...comments, data.comment]);
      setContent(""); setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyingTo) return;
    if (!replyName.trim() || !replyContent.trim()) return;
    setReplyLoading(true);
    try {
      const res = await fetch(`/api/posts/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: replyName.trim(),
          content: replyContent.trim(),
          parentId: replyingTo.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setComments([...comments, data.comment]);
      setReplyingTo(null); setReplyContent(""); setReplyName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reply");
    } finally {
      setReplyLoading(false);
    }
  }

  function startReply(comment: Comment) {
    setReplyingTo({ id: comment._id, name: comment.name });
    setReplyContent(`@${comment.name} `);
    setReplyName(name || "");
  }

  function renderComment(comment: Comment, isReply = false) {
    const replies = !isReply ? repliesFor(comment._id) : [];
    return (
      <div key={comment._id} style={{ marginBottom: isReply ? "0.75rem" : "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
          {/* Avatar */}
          <div style={{
            width: isReply ? "28px" : "36px", height: isReply ? "28px" : "36px",
            borderRadius: "50%", background: getAvatarColor(comment.name),
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: isReply ? "0.625rem" : "0.75rem", fontWeight: 700,
            flexShrink: 0,
          }}>
            {getInitials(comment.name)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: isReply ? "0.8125rem" : "0.875rem", color: "var(--fg)" }}>
                {comment.name}
              </span>
              {comment.isAdmin && (
                <span style={{
                  background: "var(--accent)", color: "#fff",
                  fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.08em",
                  padding: "1px 6px", borderRadius: "4px", textTransform: "uppercase",
                }}>
                  Author
                </span>
              )}
              <time style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>
                {formatDate(comment.createdAt)}
              </time>
            </div>

            <p style={{ color: "var(--fg-muted)", fontSize: isReply ? "0.875rem" : "0.9375rem", lineHeight: 1.65, marginBottom: "0.5rem" }}>
              {renderContent(comment.content)}
            </p>

            {!isReply && (
              <button
                onClick={() => startReply(comment)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--fg-subtle)", fontSize: "0.75rem", padding: 0,
                  fontWeight: 500,
                }}
              >
                ↩ Reply
              </button>
            )}
          </div>
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div style={{ marginLeft: "44px", marginTop: "0.875rem", paddingLeft: "1rem", borderLeft: "2px solid var(--border)" }}>
            {replies.map((r) => renderComment(r, true))}
          </div>
        )}

        {/* Reply form */}
        {replyingTo?.id === comment._id && (
          <div style={{ marginLeft: "44px", marginTop: "0.75rem" }}>
            <form onSubmit={handleReply} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <input
                className="input" value={replyName} onChange={(e) => setReplyName(e.target.value)}
                placeholder="Your name" style={{ fontSize: "0.8125rem" }}
              />
              <textarea
                className="input" value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${replyingTo.name}…`} rows={3}
                style={{ fontSize: "0.8125rem", resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" disabled={replyLoading} className="btn btn-primary" style={{ fontSize: "0.8125rem", padding: "0.375rem 0.875rem" }}>
                  {replyLoading ? "…" : "Reply"}
                </button>
                <button type="button" onClick={() => setReplyingTo(null)} className="btn btn-ghost" style={{ fontSize: "0.8125rem", padding: "0.375rem 0.875rem" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <section style={{ marginTop: "4rem", paddingTop: "2.5rem", borderTop: "1px solid var(--border)" }}>
      <h2 style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--fg)", marginBottom: "2rem", letterSpacing: "-0.02em" }}>
        {comments.length > 0 ? `${comments.length} Comment${comments.length !== 1 ? "s" : ""}` : "Comments"}
      </h2>

      {topLevel.length > 0 ? (
        <div style={{ marginBottom: "2.5rem" }}>
          {topLevel.map((c) => renderComment(c))}
        </div>
      ) : (
        <p style={{ color: "var(--fg-subtle)", fontSize: "0.9375rem", marginBottom: "2rem" }}>
          No comments yet. Be the first.
        </p>
      )}

      {/* New comment form */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--fg)", marginBottom: "1.25rem" }}>Leave a comment</h3>
        {success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "7px", padding: "0.625rem 1rem", color: "#16a34a", fontSize: "0.875rem", marginBottom: "1rem" }}>
            Comment posted! ✓
          </div>
        )}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "7px", padding: "0.625rem 1rem", color: "#dc2626", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="label">Name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={80} />
          </div>
          <div>
            <label className="label">Comment * <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— use @name to mention someone</span></label>
            <textarea className="input" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write something thoughtful…" rows={4} maxLength={2000} style={{ resize: "vertical" }} />
            <div style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", textAlign: "right", marginTop: "0.25rem" }}>{content.length}/2000</div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ alignSelf: "flex-start", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Posting…" : "Post Comment"}
          </button>
        </form>
      </div>
    </section>
  );
}
