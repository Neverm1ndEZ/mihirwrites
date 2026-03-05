"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  published: boolean;
  createdAt: string;
  tags: string[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const res = await fetch("/api/posts?all=true");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(slug: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/posts/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setPosts(posts.filter((p) => p.slug !== slug));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  async function togglePublish(post: Post) {
    try {
      const res = await fetch(`/api/posts/${post.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !post.published }),
      });
      if (res.ok) {
        setPosts(posts.map((p) =>
          p.slug === post.slug ? { ...p, published: !p.published } : p
        ));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-lora), serif",
              fontSize: "2rem",
              fontWeight: 700,
              color: "var(--fg)",
              letterSpacing: "-0.03em",
              marginBottom: "0.25rem",
            }}
          >
            Dashboard
          </h1>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem" }}>
            {posts.length} post{posts.length !== 1 ? "s" : ""} total
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/admin/new" className="btn btn-primary">
            + New Post
          </Link>
          <button onClick={handleLogout} className="btn btn-ghost">
            Sign Out
          </button>
        </div>
      </div>

      {/* Posts table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--fg-subtle)" }}>
          Loading…
        </div>
      ) : posts.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: "center", padding: "4rem 2rem" }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✦</div>
          <p
            style={{
              fontFamily: "var(--font-lora), serif",
              fontSize: "1.125rem",
              color: "var(--fg-muted)",
              marginBottom: "1.5rem",
            }}
          >
            No posts yet
          </p>
          <Link href="/admin/new" className="btn btn-primary">
            Write your first post
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {posts.map((post) => (
            <div
              key={post._id}
              className="card"
              style={{
                padding: "1.25rem 1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              {/* Status dot */}
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: post.published ? "#22c55e" : "#94a3b8",
                  flexShrink: 0,
                }}
              />

              {/* Title & meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--fg)",
                    fontSize: "0.9375rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: "0.2rem",
                  }}
                >
                  {post.title}
                </div>
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--fg-subtle)",
                    display: "flex",
                    gap: "0.75rem",
                  }}
                >
                  <span>{formatDate(post.createdAt)}</span>
                  <span
                    style={{
                      color: post.published ? "#22c55e" : "var(--fg-subtle)",
                      fontWeight: 500,
                    }}
                  >
                    {post.published ? "Published" : "Draft"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <Link
                  href={`/post/${post.slug}`}
                  target="_blank"
                  className="btn btn-ghost"
                  style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                >
                  View
                </Link>
                <button
                  onClick={() => togglePublish(post)}
                  className="btn btn-ghost"
                  style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                >
                  {post.published ? "Unpublish" : "Publish"}
                </button>
                <Link
                  href={`/admin/edit/${post.slug}`}
                  className="btn btn-ghost"
                  style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(post.slug, post.title)}
                  disabled={deleting === post.slug}
                  className="btn btn-danger"
                  style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                >
                  {deleting === post.slug ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
