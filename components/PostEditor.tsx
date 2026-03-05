"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import MediaUploader from "./MediaUploader";
import MarkdownContent from "./MarkdownContent";

interface PostData {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  coverImage: string;
  tags: string;
  published: boolean;
}

interface PostEditorProps {
  initialData?: Partial<PostData>;
  mode: "create" | "edit";
  slug?: string; // For edit mode
}

export default function PostEditor({ initialData, mode, slug }: PostEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || "");
  const [tags, setTags] = useState(initialData?.tags || "");
  const [published, setPublished] = useState(initialData?.published !== false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  function insertAtCursor(text: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((prev) => prev + "\n" + text + "\n");
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newContent = content.slice(0, start) + "\n" + text + "\n" + content.slice(end);
    setContent(newContent);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + text.length + 2;
      ta.focus();
    }, 10);
  }

  async function handleSave() {
    setError("");
    if (!title.trim()) { setError("Title is required"); return; }
    if (!excerpt.trim()) { setError("Excerpt is required"); return; }
    if (!content.trim()) { setError("Content is required"); return; }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        coverImage: coverImage.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        published,
      };

      const url = mode === "edit" ? `/api/posts/${slug}` : "/api/posts";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-lora), serif",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--fg)",
              letterSpacing: "-0.03em",
            }}
          >
            {mode === "create" ? "New Post" : "Edit Post"}
          </h1>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Published toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              color: "var(--fg-muted)",
            }}
          >
            <div
              onClick={() => setPublished(!published)}
              style={{
                width: "36px",
                height: "20px",
                borderRadius: "10px",
                background: published ? "var(--accent)" : "var(--border-strong)",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "2px",
                  left: published ? "18px" : "2px",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </div>
            {published ? "Published" : "Draft"}
          </label>

          <button
            onClick={() => setPreview(!preview)}
            className="btn btn-ghost"
          >
            {preview ? "Edit" : "Preview"}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : mode === "create" ? "Publish" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "7px",
            padding: "0.75rem 1rem",
            color: "#dc2626",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem" }}>
        {/* Main form */}
        <div>
          {preview ? (
            <div
              className="card"
              style={{ padding: "2rem", minHeight: "500px" }}
            >
              {title && (
                <h1
                  style={{
                    fontFamily: "var(--font-lora), serif",
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "var(--fg)",
                    letterSpacing: "-0.03em",
                    marginBottom: "1rem",
                  }}
                >
                  {title}
                </h1>
              )}
              {excerpt && (
                <p
                  style={{
                    color: "var(--fg-muted)",
                    fontSize: "1.0625rem",
                    fontStyle: "italic",
                    marginBottom: "2rem",
                    paddingBottom: "1.5rem",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {excerpt}
                </p>
              )}
              <MarkdownContent content={content || "*Nothing to preview yet*"} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label className="label">Title *</label>
                <input
                  className="input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Your post title…"
                  style={{ fontSize: "1.125rem", fontWeight: 600 }}
                />
              </div>

              <div>
                <label className="label">Excerpt * <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(shown in listing)</span></label>
                <textarea
                  className="input"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="A short summary of your post…"
                  maxLength={300}
                  rows={3}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", textAlign: "right", marginTop: "0.25rem" }}>
                  {excerpt.length}/300
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <label className="label" style={{ margin: 0 }}>Content * <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(Markdown)</span></label>
                  <button
                    type="button"
                    onClick={() => setShowUploader(!showUploader)}
                    className="btn btn-ghost"
                    style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
                  >
                    {showUploader ? "Hide" : "↑ Upload Media"}
                  </button>
                </div>

                {showUploader && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <MediaUploader
                      onInsert={(markdown) => {
                        insertAtCursor(markdown);
                        setShowUploader(false);
                      }}
                    />
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  className="input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`# Your heading\n\nWrite your post in **Markdown**.\n\n- Supports lists\n- Images, videos, PDFs\n- Code blocks\n\n> Blockquotes too`}
                  rows={20}
                  style={{ fontFamily: "monospace", fontSize: "0.875rem", lineHeight: 1.65 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Cover image */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--fg)", marginBottom: "1rem" }}>
              Cover Image
            </h3>
            <div style={{ marginBottom: "0.75rem" }}>
              <label className="label">Image URL</label>
              <input
                className="input"
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…"
                style={{ fontSize: "0.8125rem" }}
              />
            </div>
            <MediaUploader
              onInsert={(_, url) => setCoverImage(url)}
            />
            {coverImage && (
              <div
                style={{
                  marginTop: "0.75rem",
                  position: "relative",
                  height: "120px",
                  borderRadius: "7px",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Cover preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={() => setCoverImage("")}
                />
                <button
                  onClick={() => setCoverImage("")}
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    cursor: "pointer",
                    color: "#fff",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--fg)", marginBottom: "1rem" }}>
              Tags
            </h3>
            <input
              className="input"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="travel, tech, life"
              style={{ fontSize: "0.875rem" }}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", marginTop: "0.375rem" }}>
              Comma-separated
            </p>
            {tags && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.75rem" }}>
                {tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Markdown cheatsheet */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--fg)", marginBottom: "0.875rem" }}>
              Markdown Cheatsheet
            </h3>
            <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", lineHeight: 1.9 }}>
              <code style={{ background: "var(--bg-secondary)", padding: "0 4px", borderRadius: "3px", fontSize: "0.7rem" }}># Heading 1</code><br />
              <code style={{ background: "var(--bg-secondary)", padding: "0 4px", borderRadius: "3px", fontSize: "0.7rem" }}>**bold**</code> · <code style={{ background: "var(--bg-secondary)", padding: "0 4px", borderRadius: "3px", fontSize: "0.7rem" }}>*italic*</code><br />
              <code style={{ background: "var(--bg-secondary)", padding: "0 4px", borderRadius: "3px", fontSize: "0.7rem" }}>[text](url)</code> · link<br />
              <code style={{ background: "var(--bg-secondary)", padding: "0 4px", borderRadius: "3px", fontSize: "0.7rem" }}>![alt](url)</code> · image/video/pdf<br />
              <code style={{ background: "var(--bg-secondary)", padding: "0 4px", borderRadius: "3px", fontSize: "0.7rem" }}>{"> quote"}</code> · blockquote<br />
              <code style={{ background: "var(--bg-secondary)", padding: "0 4px", borderRadius: "3px", fontSize: "0.7rem" }}>```code```</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
