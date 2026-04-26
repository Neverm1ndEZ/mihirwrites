"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import MediaUploader from "./MediaUploader";
import MarkdownContent from "./MarkdownContent";
import VoiceRecorder from "./VoiceRecorder";

interface PostData {
  title: string; slug?: string; excerpt: string; content: string;
  coverImage: string; tags: string; published: boolean;
  category?: "personal" | "professional";
  featured?: boolean; seriesName?: string; seriesPart?: string;
  scheduledAt?: string; mood?: string; location?: string;
  voiceIntroUrl?: string; timeCapsuleUnlockAt?: string; ambientTrackUrl?: string;
}

interface PostEditorProps {
  initialData?: Partial<PostData>;
  mode: "create" | "edit";
  slug?: string;
}

const MOODS = ["", "curious", "nostalgic", "excited", "reflective", "angry", "lost"];
const MOOD_LABELS: Record<string, string> = {
  "": "None", curious: "🔍 Curious", nostalgic: "🌅 Nostalgic",
  excited: "⚡ Excited", reflective: "🌊 Reflective", angry: "🔥 Fired up", lost: "🌑 Lost",
};

const AUTOSAVE_INTERVAL = 20_000; // 20s
const SNAPSHOT_DEBOUNCE = 4_000;  // 4s after typing stops
const DB_DRAFT_KEY = "mw_draft_id";

type SidebarTab = "media" | "meta" | "advanced";

function Toggle({ value, onToggle, label }: { value: boolean; onToggle: () => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
      <div
        onClick={onToggle}
        role="switch"
        aria-checked={value}
        style={{
          width: "38px", height: "22px", borderRadius: "11px",
          background: value ? "var(--accent)" : "var(--border-strong)",
          position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute", top: "3px",
          left: value ? "19px" : "3px",
          width: "16px", height: "16px", borderRadius: "50%",
          background: "#fff", transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </div>
      <span style={{ fontSize: "0.875rem", color: "var(--fg-muted)", userSelect: "none" }}>{label}</span>
    </label>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "var(--bg-secondary)", border: "none",
          padding: "0.75rem 1rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: "0.8125rem", fontWeight: 600, color: "var(--fg)",
          fontFamily: "inherit", textAlign: "left",
        }}
      >
        {title}
        <span style={{ color: "var(--fg-subtle)", fontSize: "0.75rem", transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.875rem", background: "var(--bg-card, var(--bg-secondary))" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function PostEditor({ initialData, mode, slug }: PostEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || "");
  const [tags, setTags] = useState(initialData?.tags || "");
  const [published, setPublished] = useState(initialData?.published !== false);
  const [category, setCategory] = useState<"personal" | "professional">(initialData?.category || "personal");
  const [featured, setFeatured] = useState(initialData?.featured || false);
  const [seriesName, setSeriesName] = useState(initialData?.seriesName || "");
  const [seriesPart, setSeriesPart] = useState(initialData?.seriesPart || "");
  const [scheduledAt, setScheduledAt] = useState(initialData?.scheduledAt || "");
  const [mood, setMood] = useState(initialData?.mood || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [voiceIntroUrl, setVoiceIntroUrl] = useState(initialData?.voiceIntroUrl || "");
  const [ambientTrackUrl, setAmbientTrackUrl] = useState(initialData?.ambientTrackUrl || "");
  const [timeCapsuleUnlockAt, setTimeCapsuleUnlockAt] = useState(initialData?.timeCapsuleUnlockAt || "");

  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const snapshotsRef = useRef<{ content: string; capturedAt: string }[]>(
    initialData ? [{ content: initialData.content || "", capturedAt: new Date().toISOString() }] : []
  );
  const lastSnapshotContentRef = useRef(initialData?.content || "");
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const router = useRouter();

  // Load DB draft on mount (create mode)
  useEffect(() => {
    if (mode !== "create") return;
    const savedId = localStorage.getItem(DB_DRAFT_KEY);
    if (!savedId) return;
    fetch("/api/drafts").then(r => r.json()).then(({ drafts }) => {
      const d = drafts?.find((x: { _id: string }) => x._id === savedId);
      if (d && !title && !content) {
        if (d.title) setTitle(d.title);
        if (d.content) setContent(d.content);
        if (d.excerpt) setExcerpt(d.excerpt);
        if (d.tags) setTags(d.tags);
        if (d.mood) setMood(d.mood);
        if (d.location) setLocation(d.location);
        if (d.coverImage) setCoverImage(d.coverImage);
        draftIdRef.current = d._id;
      }
    }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Autosave to DB
  useEffect(() => {
    if (mode !== "create" || (!title && !content)) return;
    const id = setInterval(async () => {
      try {
        const payload = { title, excerpt, content, tags, mood, location, coverImage };
        const res = draftIdRef.current
          ? await fetch("/api/drafts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draftIdRef.current, ...payload }) })
          : await fetch("/api/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.draft?._id) {
          draftIdRef.current = data.draft._id;
          localStorage.setItem(DB_DRAFT_KEY, data.draft._id);
        }
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 3000);
      } catch { /* silent */ }
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(id);
  }, [mode, title, excerpt, content, tags, mood, location, coverImage]);

  // Snapshot capture — debounced 4s after typing stops
  const scheduleSnapshot = useCallback((newContent: string) => {
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      if (newContent !== lastSnapshotContentRef.current && newContent.trim()) {
        snapshotsRef.current.push({ content: newContent, capturedAt: new Date().toISOString() });
        // Cap at 800 snapshots
        if (snapshotsRef.current.length > 800) {
          snapshotsRef.current = snapshotsRef.current.slice(-600);
        }
        lastSnapshotContentRef.current = newContent;
      }
    }, SNAPSHOT_DEBOUNCE);
  }, []);

  function handleContentChange(val: string) {
    setContent(val);
    scheduleSnapshot(val);
  }

  function insertAtCursor(text: string) {
    const ta = textareaRef.current;
    if (!ta) { setContent(prev => prev + "\n" + text + "\n"); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newContent = content.slice(0, start) + "\n" + text + "\n" + content.slice(end);
    setContent(newContent);
    scheduleSnapshot(newContent);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + text.length + 2; ta.focus(); }, 10);
  }

  async function handleSave() {
    setError("");
    if (!title.trim()) { setError("Title is required"); return; }
    if (!excerpt.trim()) { setError("Excerpt is required"); return; }
    if (!content.trim()) { setError("Content is required"); return; }

    // Final snapshot
    if (content !== lastSnapshotContentRef.current) {
      snapshotsRef.current.push({ content, capturedAt: new Date().toISOString() });
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(), excerpt: excerpt.trim(), content: content.trim(),
        coverImage: coverImage.trim(),
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        published, category, featured,
        seriesName: seriesName.trim() || undefined,
        seriesPart: seriesPart ? parseInt(seriesPart) : undefined,
        scheduledAt: scheduledAt || undefined,
        mood: mood || undefined,
        location: location.trim() || undefined,
        voiceIntroUrl: voiceIntroUrl.trim() || undefined,
        ambientTrackUrl: ambientTrackUrl.trim() || undefined,
        timeCapsuleUnlockAt: timeCapsuleUnlockAt || undefined,
        writingSnapshots: snapshotsRef.current,
      };
      const url = mode === "edit" ? `/api/posts/${slug}` : "/api/posts";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (mode === "create" && draftIdRef.current) {
        fetch(`/api/drafts?id=${draftIdRef.current}`, { method: "DELETE" }).catch(() => { });
        localStorage.removeItem(DB_DRAFT_KEY);
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        .editor-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 1.25rem;
          align-items: start;
        }
        .editor-sidebar { display: flex; flex-direction: column; gap: 0.75rem; position: sticky; top: 72px; }
        .editor-sidebar-mobile { display: none; }
        .editor-fab { display: none; }

        @media (max-width: 760px) {
          .editor-layout { grid-template-columns: 1fr; }
          .editor-sidebar { display: none; }
          .editor-sidebar-mobile { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.25rem; }
          .editor-fab { display: flex; }
        }

        .editor-textarea {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1rem 1.125rem;
          font-size: 0.9375rem;
          font-family: 'DM Mono', 'Fira Code', monospace;
          color: var(--fg);
          line-height: 1.7;
          outline: none;
          resize: vertical;
          min-height: 55vh;
          transition: border-color 0.15s;
        }
        .editor-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent); }

        .sidebar-drawer-overlay {
          display: none;
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 60;
          backdrop-filter: blur(2px);
        }
        .sidebar-drawer {
          display: none;
          position: fixed; right: 0; top: 0; bottom: 0; width: min(340px, 90vw);
          background: var(--bg); border-left: 1px solid var(--border);
          z-index: 61; overflow-y: auto; padding: 1.25rem;
          flex-direction: column; gap: 0.875rem;
          box-shadow: -8px 0 32px rgba(0,0,0,0.15);
        }
        @media (max-width: 760px) {
          .sidebar-drawer-overlay.open { display: block; }
          .sidebar-drawer.open { display: flex; }
        }
      `}</style>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "1.5rem", gap: "0.75rem", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <h1 style={{
            fontFamily: "var(--font-lora), serif",
            fontSize: "clamp(1.375rem, 3vw, 1.75rem)",
            fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.03em", margin: 0,
          }}>
            {mode === "create" ? "New Post" : "Edit Post"}
          </h1>
          {autoSaved && (
            <span style={{ fontSize: "0.75rem", color: "#16a34a", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span>✓</span> Draft saved
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <Toggle value={published} onToggle={() => setPublished(p => !p)} label={published ? "Published" : "Draft"} />
          <button onClick={() => setPreview(p => !p)} className="btn btn-ghost" style={{ fontSize: "0.8125rem" }}>
            {preview ? "← Edit" : "Preview"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ opacity: saving ? 0.7 : 1, fontSize: "0.875rem" }}
          >
            {saving ? "Saving…" : mode === "create" ? "Publish" : "Save Changes"}
          </button>
          {/* Mobile settings toggle */}
          <button
            className="editor-fab"
            onClick={() => setSidebarOpen(true)}
            style={{
              padding: "0.5rem 0.75rem", background: "var(--bg-secondary)",
              border: "1px solid var(--border)", borderRadius: "8px",
              cursor: "pointer", fontSize: "0.8125rem", color: "var(--fg-muted)",
              fontFamily: "inherit",
            }}
          >
            ⚙ Settings
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px",
          padding: "0.75rem 1rem", color: "#dc2626", fontSize: "0.875rem", marginBottom: "1.25rem",
        }}>
          {error}
        </div>
      )}

      <div className="editor-layout">
        {/* Main writing area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Title */}
          <input
            className="input"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post title…"
            style={{
              fontSize: "1.375rem", fontWeight: 700,
              fontFamily: "var(--font-lora), serif",
              padding: "0.75rem 1rem",
              letterSpacing: "-0.02em",
              border: "none", borderBottom: "1px solid var(--border)",
              borderRadius: 0, background: "transparent", outline: "none",
              width: "100%",
            }}
          />

          {/* Excerpt */}
          <textarea
            className="input"
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="One-line excerpt — what's this post about?"
            maxLength={300}
            rows={2}
            style={{
              resize: "none", fontStyle: "italic",
              fontSize: "1rem", lineHeight: 1.6,
              border: "none", borderBottom: "1px solid var(--border)",
              borderRadius: 0, background: "transparent", outline: "none",
              padding: "0.5rem 1rem",
            }}
          />

          {/* Toolbar */}
          <div style={{
            display: "flex", gap: "0.5rem", alignItems: "center",
            padding: "0 0.25rem", flexWrap: "wrap",
          }}>
            {[
              { label: "**B**", insert: "**bold**" },
              { label: "_I_", insert: "_italic_" },
              { label: "H1", insert: "# " },
              { label: "H2", insert: "## " },
              { label: "—", insert: "\n---\n" },
              { label: "> ", insert: "> " },
            ].map(({ label, insert }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const ta = textareaRef.current;
                  if (!ta) return;
                  const s = ta.selectionStart;
                  const e = ta.selectionEnd;
                  const selected = content.slice(s, e);
                  const wrapped = selected ? insert.replace("**bold**", `**${selected}**`).replace("_italic_", `_${selected}_`) : insert;
                  const newC = content.slice(0, s) + wrapped + content.slice(e);
                  setContent(newC);
                  scheduleSnapshot(newC);
                  setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + wrapped.length; }, 10);
                }}
                style={{
                  padding: "0.25rem 0.5rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  color: "var(--fg-muted)",
                  fontWeight: 600,
                }}
              >{label}</button>
            ))}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("inline-media-upload");
                el?.click();
              }}
              style={{
                padding: "0.25rem 0.625rem",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "0.75rem",
                color: "var(--fg-muted)",
              }}
            >↑ Media</button>
            <input
              id="inline-media-upload"
              type="file"
              accept="image/*,video/*,.pdf"
              style={{ display: "none" }}
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("file", file);
                try {
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  const data = await res.json();
                  if (res.ok) insertAtCursor(`![${file.name}](${data.url})`);
                } catch { /* */ }
                e.target.value = "";
              }}
            />
            <span style={{ marginLeft: "auto", fontSize: "0.6875rem", color: "var(--fg-subtle)" }}>
              {content.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>

          {/* Editor / Preview */}
          {preview ? (
            <div className="card" style={{ padding: "2rem", minHeight: "50vh" }}>
              {title && <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "2rem", fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.03em", marginBottom: "1rem" }}>{title}</h1>}
              {excerpt && <p style={{ color: "var(--fg-muted)", fontSize: "1.0625rem", fontStyle: "italic", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>{excerpt}</p>}
              <MarkdownContent content={content || "*Nothing to preview yet*"} />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              placeholder={"# Start writing...\n\nMarkdown supported. Just start typing."}
            />
          )}

          {/* Mobile settings sections (inline below content) */}
          <div className="editor-sidebar-mobile">
            <SidebarContent
              coverImage={coverImage} setCoverImage={setCoverImage}
              tags={tags} setTags={setTags}
              mood={mood} setMood={setMood}
              location={location} setLocation={setLocation}
              category={category} setCategory={setCategory}
              featured={featured} setFeatured={setFeatured}
              voiceIntroUrl={voiceIntroUrl} setVoiceIntroUrl={setVoiceIntroUrl}
              ambientTrackUrl={ambientTrackUrl} setAmbientTrackUrl={setAmbientTrackUrl}
              seriesName={seriesName} setSeriesName={setSeriesName}
              seriesPart={seriesPart} setSeriesPart={setSeriesPart}
              scheduledAt={scheduledAt} setScheduledAt={setScheduledAt}
              timeCapsuleUnlockAt={timeCapsuleUnlockAt} setTimeCapsuleUnlockAt={setTimeCapsuleUnlockAt}
              insertAtCursor={insertAtCursor}
            />
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside className="editor-sidebar">
          <SidebarContent
            coverImage={coverImage} setCoverImage={setCoverImage}
            tags={tags} setTags={setTags}
            mood={mood} setMood={setMood}
            location={location} setLocation={setLocation}
            category={category} setCategory={setCategory}
            featured={featured} setFeatured={setFeatured}
            voiceIntroUrl={voiceIntroUrl} setVoiceIntroUrl={setVoiceIntroUrl}
            ambientTrackUrl={ambientTrackUrl} setAmbientTrackUrl={setAmbientTrackUrl}
            seriesName={seriesName} setSeriesName={setSeriesName}
            seriesPart={seriesPart} setSeriesPart={setSeriesPart}
            scheduledAt={scheduledAt} setScheduledAt={setScheduledAt}
            timeCapsuleUnlockAt={timeCapsuleUnlockAt} setTimeCapsuleUnlockAt={setTimeCapsuleUnlockAt}
            insertAtCursor={insertAtCursor}
          />
        </aside>
      </div>

      {/* Mobile sidebar drawer */}
      <div className={`sidebar-drawer-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className={`sidebar-drawer ${sidebarOpen ? "open" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--fg)" }}>Post Settings</span>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: "1.25rem", lineHeight: 1 }}>×</button>
        </div>
        <SidebarContent
          coverImage={coverImage} setCoverImage={setCoverImage}
          tags={tags} setTags={setTags}
          mood={mood} setMood={setMood}
          location={location} setLocation={setLocation}
          category={category} setCategory={setCategory}
          featured={featured} setFeatured={setFeatured}
          voiceIntroUrl={voiceIntroUrl} setVoiceIntroUrl={setVoiceIntroUrl}
          ambientTrackUrl={ambientTrackUrl} setAmbientTrackUrl={setAmbientTrackUrl}
          seriesName={seriesName} setSeriesName={setSeriesName}
          seriesPart={seriesPart} setSeriesPart={setSeriesPart}
          scheduledAt={scheduledAt} setScheduledAt={setScheduledAt}
          timeCapsuleUnlockAt={timeCapsuleUnlockAt} setTimeCapsuleUnlockAt={setTimeCapsuleUnlockAt}
          insertAtCursor={insertAtCursor}
        />
      </div>
    </div>
  );
}

function L({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

// Sidebar content extracted so it can be rendered in desktop, mobile inline, or drawer
function SidebarContent({
  coverImage, setCoverImage,
  tags, setTags,
  mood, setMood,
  location, setLocation,
  category, setCategory,
  featured, setFeatured,
  voiceIntroUrl, setVoiceIntroUrl,
  ambientTrackUrl, setAmbientTrackUrl,
  seriesName, setSeriesName,
  seriesPart, setSeriesPart,
  scheduledAt, setScheduledAt,
  timeCapsuleUnlockAt, setTimeCapsuleUnlockAt,
  insertAtCursor,
}: {
  coverImage: string; setCoverImage: (v: string) => void;
  tags: string; setTags: (v: string) => void;
  mood: string; setMood: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  category: "personal" | "professional"; setCategory: (v: "personal" | "professional") => void;
  featured: boolean; setFeatured: (v: boolean) => void;
  voiceIntroUrl: string; setVoiceIntroUrl: (v: string) => void;
  ambientTrackUrl: string; setAmbientTrackUrl: (v: string) => void;
  seriesName: string; setSeriesName: (v: string) => void;
  seriesPart: string; setSeriesPart: (v: string) => void;
  scheduledAt: string; setScheduledAt: (v: string) => void;
  timeCapsuleUnlockAt: string; setTimeCapsuleUnlockAt: (v: string) => void;
  insertAtCursor: (text: string) => void;
}) {
  
  return (
    <>
      {/* Cover image */}
      <Section title="🖼  Cover Image" defaultOpen>
        <L label="Image URL">
          <input className="input" type="url" value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://…" style={{ fontSize: "0.8125rem" }} />
        </L>
        <MediaUploader onInsert={(_, url) => setCoverImage(url)} />
        {coverImage && (
          <div style={{ position: "relative", height: "110px", borderRadius: "7px", overflow: "hidden", border: "1px solid var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setCoverImage("")} />
            <button onClick={() => setCoverImage("")} style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", color: "#fff", fontSize: "0.875rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        )}
      </Section>

      {/* Tags & Feel */}
      <Section title="🏷  Tags & Feel" defaultOpen>
        <L label="Tags (comma-separated)">
          <input className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="life, work, travel" style={{ fontSize: "0.875rem" }} />
        </L>
        {tags && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
        <L label="Mood">
          <select className="input" value={mood} onChange={e => setMood(e.target.value)} style={{ fontSize: "0.875rem" }}>
            {["", "curious", "nostalgic", "excited", "reflective", "angry", "lost"].map(m => (
              <option key={m} value={m}>{({ "": "None", curious: "🔍 Curious", nostalgic: "🌅 Nostalgic", excited: "⚡ Excited", reflective: "🌊 Reflective", angry: "🔥 Fired up", lost: "🌑 Lost" } as Record<string, string>)[m]}</option>
            ))}
          </select>
        </L>
        <L label="Written in">
          <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Bangalore, 4am" style={{ fontSize: "0.875rem" }} />
        </L>
      </Section>

      {/* Voice intro */}
      <Section title="🎙  Voice Intro">
        <p style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", margin: 0 }}>
          Record a quick voice note — plays at the top of the post.
        </p>
        <VoiceRecorder
          existingUrl={voiceIntroUrl || undefined}
          onUpload={setVoiceIntroUrl}
        />
        {voiceIntroUrl && (
          <button onClick={() => setVoiceIntroUrl("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: "0.75rem", padding: 0, textAlign: "left" }}>
            × Remove
          </button>
        )}
      </Section>

      <AmbientTrackSection ambientTrackUrl={ambientTrackUrl} setAmbientTrackUrl={setAmbientTrackUrl} />

      {/* Flags & Advanced */}
      <Section title="⚙  Options">
        <div>
          <label className="label">Category</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {(["personal", "professional"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                style={{
                  flex: 1, padding: "0.4rem 0", fontSize: "0.8125rem", fontWeight: 500,
                  borderRadius: "6px", cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${category === c ? "var(--accent)" : "var(--border)"}`,
                  background: category === c ? "var(--accent)" : "transparent",
                  color: category === c ? "#fff" : "var(--fg-muted)",
                  transition: "all 0.15s",
                }}
              >
                {c === "personal" ? "Personal" : "Work"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Toggle value={featured} onToggle={() => setFeatured(!featured)} label="Featured post" />
        </div>
        <div>
          <label className="label">Series Name</label>
          <input className="input" value={seriesName} onChange={e => setSeriesName(e.target.value)} placeholder="My Series" style={{ fontSize: "0.875rem" }} />
        </div>
        <div>
          <label className="label">Part #</label>
          <input className="input" type="number" min="1" value={seriesPart} onChange={e => setSeriesPart(e.target.value)} placeholder="1" style={{ fontSize: "0.875rem" }} />
        </div>
        <div>
          <label className="label">Schedule Publish</label>
          <input className="input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ fontSize: "0.875rem" }} />
        </div>
        <div>
          <label className="label">🕰 Time Capsule — Unlock At</label>
          <input className="input" type="datetime-local" value={timeCapsuleUnlockAt} onChange={e => setTimeCapsuleUnlockAt(e.target.value)} style={{ fontSize: "0.875rem" }} />
          <p style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", marginTop: "0.25rem" }}>Hidden until this date</p>
        </div>
      </Section>
    </>
  );
}

function AmbientTrackSection({
  ambientTrackUrl,
  setAmbientTrackUrl,
}: {
  ambientTrackUrl: string;
  setAmbientTrackUrl: (v: string) => void;
}) {
  const [tab, setTab] = useState<"link" | "record">("link");
  const [linkInput, setLinkInput] = useState(ambientTrackUrl || "");

  const SERVICE_HINTS = "YouTube, Spotify, SoundCloud, Apple Music, Cloudinary, or any .mp3 URL";

  function handlePaste(val: string) {
    setLinkInput(val);
    setAmbientTrackUrl(val.trim());
  }

  return (
    <Section title="🎵  Ambient Track">
      <p style={{ fontSize: "0.75rem", color: "var(--fg-subtle)", margin: 0 }}>
        Plays quietly while readers read. Leave blank for default tracks.
      </p>

      {/* Tab switcher */}
      <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "7px", overflow: "hidden" }}>
        {(["link", "record"] as const).map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "0.375rem 0",
              border: "none",
              borderRight: i === 0 ? "1px solid var(--border)" : "none",
              background: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "#fff" : "var(--fg-muted)",
              fontSize: "0.75rem",
              fontWeight: tab === t ? 600 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {t === "link" ? "🔗 Paste Link" : "🎙 Record"}
          </button>
        ))}
      </div>

      {tab === "link" ? (
        <div>
          <input
            className="input"
            type="url"
            value={linkInput}
            onChange={e => handlePaste(e.target.value)}
            placeholder="Paste a link…"
            style={{ fontSize: "0.8125rem" }}
          />
          <p style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", marginTop: "0.375rem" }}>
            {SERVICE_HINTS}
          </p>
          {/* Preview if set */}
          {ambientTrackUrl && ambientTrackUrl === linkInput && (
            <div style={{
              marginTop: "0.5rem",
              padding: "0.5rem 0.75rem",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
            }}>
              <span style={{ fontSize: "0.75rem", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                ✓ {ambientTrackUrl}
              </span>
              <button
                onClick={() => { setLinkInput(""); setAmbientTrackUrl(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: "0.875rem", flexShrink: 0 }}
              >×</button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <VoiceRecorder
            existingUrl={ambientTrackUrl && !ambientTrackUrl.startsWith("http") ? ambientTrackUrl : undefined}
            onUpload={(url) => { setAmbientTrackUrl(url); setLinkInput(url); }}
          />
          {ambientTrackUrl && (
            <button
              onClick={() => { setAmbientTrackUrl(""); setLinkInput(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: "0.75rem", padding: 0, marginTop: "0.25rem" }}
            >
              × Remove
            </button>
          )}
        </div>
      )}
    </Section>
  );
}
