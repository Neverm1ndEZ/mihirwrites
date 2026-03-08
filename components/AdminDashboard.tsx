"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Post {
  _id: string; title: string; slug: string; excerpt: string;
  published: boolean; createdAt: string; tags: string[];
  viewCount?: number; featured?: boolean;
  reactions?: { like: number; heart: number; fire: number };
  shareToken?: string;
}

interface Comment {
  _id: string; postSlug: string; name: string; content: string; isAdmin?: boolean; createdAt: string;
}

interface AuditLog {
  _id: string; action: string; targetSlug?: string; detail?: string; createdAt: string;
}

interface Subscriber { _id: string; email: string; createdAt: string; }

type Tab = "posts" | "comments" | "subscribers" | "audit" | "year";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function TabBtn({ tab, active, label, onClick }: { tab: Tab; active: Tab; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: active === tab ? 600 : 400,
      color: active === tab ? "var(--accent)" : "var(--fg-muted)",
      background: "none", border: "none", cursor: "pointer",
      borderBottom: `2px solid ${active === tab ? "var(--accent)" : "transparent"}`,
      transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [yearData, setYearData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOp, setBulkOp] = useState("");
  const router = useRouter();

  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/posts?all=true");
      const data = await res.json();
      setPosts(data.posts || []);
    } finally { setLoading(false); }
  }

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/comments");
      const data = await res.json();
      setComments(data.comments || []);
    } finally { setLoading(false); }
  }

  async function fetchSubscribers() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscribers");
      const data = await res.json();
      setSubscribers(data.subscribers || []);
    } finally { setLoading(false); }
  }

  async function fetchAudit() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit");
      const data = await res.json();
      setLogs(data.logs || []);
    } finally { setLoading(false); }
  }

  async function fetchYear() {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const res = await fetch(`/api/admin/year?year=${year}`);
      const data = await res.json();
      setYearData(data);
    } finally { setLoading(false); }
  }

  function switchTab(t: Tab) {
    setTab(t); setSelected(new Set());
    if (t === "comments" && !comments.length) fetchComments();
    else if (t === "subscribers" && !subscribers.length) fetchSubscribers();
    else if (t === "audit" && !logs.length) fetchAudit();
    else if (t === "year") fetchYear();
  }

  async function handleDelete(slug: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/posts/${slug}`, { method: "DELETE" });
      if (res.ok) setPosts(posts.filter((p) => p.slug !== slug));
    } finally { setDeleting(null); }
  }

  async function togglePublish(post: Post) {
    const res = await fetch(`/api/posts/${post.slug}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !post.published }),
    });
    if (res.ok) setPosts(posts.map((p) => p.slug === post.slug ? { ...p, published: !p.published } : p));
  }

  async function toggleFeatured(post: Post) {
    const res = await fetch(`/api/posts/${post.slug}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !post.featured }),
    });
    if (res.ok) setPosts(posts.map((p) => p.slug === post.slug ? { ...p, featured: !p.featured } : p));
  }

  async function handleShare(post: Post) {
    if (post.shareToken) {
      // Copy existing link
      const url = `${window.location.origin}/post/${post.slug}?token=${post.shareToken}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      alert(`Share link copied!\n\n${url}`);
      return;
    }
    // Generate a new token
    const res = await fetch(`/api/posts/${post.slug}/share`, { method: "POST" });
    if (res.ok) {
      const { token } = await res.json();
      const url = `${window.location.origin}/post/${post.slug}?token=${token}`;
      setPosts(posts.map((p) => p.slug === post.slug ? { ...p, shareToken: token } : p));
      await navigator.clipboard.writeText(url).catch(() => {});
      alert(`Share link generated and copied!\n\n${url}`);
    }
  }

  async function revokeShare(post: Post) {
    if (!confirm("Revoke this share link? Anyone with the old link won't be able to access the draft.")) return;
    const res = await fetch(`/api/posts/${post.slug}/share`, { method: "DELETE" });
    if (res.ok) setPosts(posts.map((p) => p.slug === post.slug ? { ...p, shareToken: undefined } : p));
  }

  async function handleBulk() {
    if (!bulkOp || !selected.size) return;
    if (!confirm(`${bulkOp} ${selected.size} post(s)?`)) return;
    const slugsToProcess = [...selected];
    for (const slug of slugsToProcess) {
      if (bulkOp === "delete") {
        await fetch(`/api/posts/${slug}`, { method: "DELETE" });
      } else {
        await fetch(`/api/posts/${slug}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: bulkOp === "publish" }),
        });
      }
    }
    setSelected(new Set()); setBulkOp("");
    fetchPosts();
  }

  async function handleDeleteComment(id: string, slug: string) {
    if (!confirm("Delete this comment?")) return;
    const res = await fetch(`/api/posts/${slug}/comments?id=${id}`, { method: "DELETE" });
    if (res.ok) setComments(comments.filter((c) => c._id !== id));
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "2rem", fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.03em", marginBottom: "0.25rem" }}>Dashboard</h1>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem" }}>{posts.length} post{posts.length !== 1 ? "s" : ""} total</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/admin/new" className="btn btn-primary">+ New Post</Link>
          <button onClick={handleLogout} className="btn btn-ghost">Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: "1.5rem", display: "flex", gap: "0", overflowX: "auto" }}>
        <TabBtn tab="posts" active={tab} label="Posts" onClick={() => switchTab("posts")} />
        <TabBtn tab="comments" active={tab} label="Comments" onClick={() => switchTab("comments")} />
        <TabBtn tab="subscribers" active={tab} label="Subscribers" onClick={() => switchTab("subscribers")} />
        <TabBtn tab="audit" active={tab} label="Audit Log" onClick={() => switchTab("audit")} />
        <TabBtn tab="year" active={tab} label={`${new Date().getFullYear()} Recap`} onClick={() => switchTab("year")} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--fg-subtle)" }}>Loading…</div>
      ) : (
        <>
          {/* POSTS TAB */}
          {tab === "posts" && (
            <>
              {/* Bulk actions */}
              {selected.size > 0 && (
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem", padding: "0.75rem 1rem", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.875rem", color: "var(--fg-muted)" }}>{selected.size} selected</span>
                  <select value={bulkOp} onChange={(e) => setBulkOp(e.target.value)} style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--fg)" }}>
                    <option value="">Choose action…</option>
                    <option value="publish">Publish</option>
                    <option value="unpublish">Unpublish</option>
                    <option value="delete">Delete</option>
                  </select>
                  <button onClick={handleBulk} disabled={!bulkOp} className="btn btn-primary" style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem" }}>Apply</button>
                  <button onClick={() => setSelected(new Set())} className="btn btn-ghost" style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem" }}>Clear</button>
                </div>
              )}

              {posts.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✦</div>
                  <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.125rem", color: "var(--fg-muted)", marginBottom: "1.5rem" }}>No posts yet</p>
                  <Link href="/admin/new" className="btn btn-primary">Write your first post</Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {posts.map((post) => (
                    <div key={post._id} className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                      {/* Checkbox */}
                      <input type="checkbox" checked={selected.has(post.slug)} onChange={(e) => {
                        const s = new Set(selected);
                        e.target.checked ? s.add(post.slug) : s.delete(post.slug);
                        setSelected(s);
                      }} />

                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: post.published ? "#22c55e" : "#94a3b8", flexShrink: 0 }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "var(--fg)", fontSize: "0.9375rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "0.2rem" }}>
                          {post.featured && <span style={{ fontSize: "0.6875rem", background: "var(--accent)", color: "#fff", padding: "1px 6px", borderRadius: "3px", marginRight: "0.5rem" }}>★</span>}
                          {post.title}
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                          <span>{formatDate(post.createdAt)}</span>
                          <span style={{ color: post.published ? "#22c55e" : "var(--fg-subtle)", fontWeight: 500 }}>{post.published ? "Published" : "Draft"}</span>
                          {post.viewCount !== undefined && <span>👁 {post.viewCount}</span>}
                          {post.reactions && <span>❤️ {post.reactions.like + post.reactions.heart + post.reactions.fire}</span>}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0, flexWrap: "wrap" }}>
                        <Link href={`/post/${post.slug}`} target="_blank" className="btn btn-ghost" style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}>View</Link>
                        <button onClick={() => togglePublish(post)} className="btn btn-ghost" style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}>{post.published ? "Unpublish" : "Publish"}</button>
                        <button onClick={() => toggleFeatured(post)} className="btn btn-ghost" style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}>{post.featured ? "Unfeature" : "Feature"}</button>
                        {!post.published && (
                          <button
                            onClick={() => handleShare(post)}
                            title={post.shareToken ? "Copy share link" : "Generate share link"}
                            className="btn btn-ghost"
                            style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem", color: post.shareToken ? "var(--accent)" : undefined }}
                          >
                            {post.shareToken ? "🔗 Copy link" : "🔗 Share"}
                          </button>
                        )}
                        {!post.published && post.shareToken && (
                          <button onClick={() => revokeShare(post)} className="btn btn-ghost" style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem", color: "#dc2626" }} title="Revoke share link">
                            Revoke
                          </button>
                        )}
                        <Link href={`/admin/edit/${post.slug}`} className="btn btn-ghost" style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}>Edit</Link>
                        <button onClick={() => handleDelete(post.slug, post.title)} disabled={deleting === post.slug} className="btn btn-danger" style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}>
                          {deleting === post.slug ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* COMMENTS TAB */}
          {tab === "comments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {comments.length === 0 ? <p style={{ color: "var(--fg-subtle)", padding: "2rem 0" }}>No comments yet.</p> : comments.map((c) => (
                <div key={c._id} className="card" style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.375rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--fg)" }}>{c.name}</span>
                        {c.isAdmin && <span style={{ background: "var(--accent)", color: "#fff", fontSize: "0.625rem", fontWeight: 700, padding: "1px 6px", borderRadius: "4px" }}>Author</span>}
                        <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>on</span>
                        <Link href={`/post/${c.postSlug}`} style={{ fontSize: "0.75rem", color: "var(--accent)" }}>{c.postSlug}</Link>
                        <time style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>{formatDate(c.createdAt)}</time>
                      </div>
                      <p style={{ color: "var(--fg-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>{c.content}</p>
                    </div>
                    <button onClick={() => handleDeleteComment(c._id, c.postSlug)} className="btn btn-danger" style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem", flexShrink: 0 }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SUBSCRIBERS TAB */}
          {tab === "subscribers" && (
            <div>
              <p style={{ color: "var(--fg-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>{subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {subscribers.map((s) => (
                  <div key={s._id} className="card" style={{ padding: "0.75rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.9375rem", color: "var(--fg)" }}>{s.email}</span>
                    <time style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>{formatDate(s.createdAt)}</time>
                  </div>
                ))}
                {subscribers.length === 0 && <p style={{ color: "var(--fg-subtle)", padding: "2rem 0" }}>No subscribers yet.</p>}
              </div>
            </div>
          )}

          {/* AUDIT LOG TAB */}
          {tab === "audit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {logs.map((l) => (
                <div key={l._id} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--accent)", background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "4px" }}>{l.action}</span>
                  {l.targetSlug && <span style={{ fontSize: "0.8125rem", color: "var(--fg)" }}>{l.targetSlug}</span>}
                  {l.detail && <span style={{ fontSize: "0.8125rem", color: "var(--fg-muted)", flex: 1 }}>{l.detail}</span>}
                  <time style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", marginLeft: "auto" }}>{new Date(l.createdAt).toLocaleString()}</time>
                </div>
              ))}
              {logs.length === 0 && <p style={{ color: "var(--fg-subtle)", padding: "2rem 0" }}>No audit logs yet.</p>}
            </div>
          )}

          {/* YEAR RECAP TAB */}
          {tab === "year" && yearData && (
            <div>
              {(yearData as { empty?: boolean }).empty ? (
                <p style={{ color: "var(--fg-subtle)", padding: "2rem 0" }}>No posts this year yet.</p>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                    {[
                      { label: "Posts", value: String((yearData as { totalPosts?: number }).totalPosts || 0) },
                      { label: "Words", value: ((yearData as { totalWords?: number }).totalWords || 0).toLocaleString() },
                      { label: "Views", value: ((yearData as { totalViews?: number }).totalViews || 0).toLocaleString() },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--font-lora), serif", fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>{value}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", marginTop: "0.375rem" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <Link href={`/year/${(yearData as { year?: number }).year}`} className="btn btn-ghost" style={{ textDecoration: "none" }}>
                    View full {(yearData as { year?: number }).year} recap →
                  </Link>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
