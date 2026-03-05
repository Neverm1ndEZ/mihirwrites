"use client";

import { useState, useRef, useCallback } from "react";

interface UploadedFile {
  url: string;
  filename: string;
  mimeType: string;
  resourceType: string;
}

interface MediaUploaderProps {
  onInsert: (markdown: string, url: string) => void;
}

export default function MediaUploader({ onInsert }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = "image/*,video/*,.pdf";

  function getMarkdown(file: UploadedFile): string {
    const { url, filename, mimeType } = file;
    if (mimeType === "application/pdf") {
      return `[📄 ${filename}](${url})`;  // link, not image
    }
    if (mimeType.startsWith("video/")) {
      return `![${filename}](${url})`;
    }
    return `![${filename}](${url})`;
  }

  const upload = useCallback(async (file: File) => {
    setError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const uploaded: UploadedFile = {
        url: data.url,
        filename: file.name,
        mimeType: file.type,
        resourceType: data.resourceType,
      };

      setRecent((prev) => [uploaded, ...prev.slice(0, 4)]);
      onInsert(getMarkdown(uploaded), data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onInsert]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File too large (max 50MB)");
      return;
    }
    upload(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function getIcon(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "🖼";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType === "application/pdf") return "📄";
    return "📎";
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
          borderRadius: "10px",
          padding: "1.5rem",
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          background: dragOver ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--bg-secondary)",
          transition: "all 0.15s",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleInputChange}
          style={{ display: "none" }}
          disabled={uploading}
        />

        {uploading ? (
          <div style={{ color: "var(--accent)" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⏳</div>
            <p style={{ fontSize: "0.875rem" }}>Uploading…</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
              {dragOver ? "⬇" : "☁"}
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--fg-muted)", marginBottom: "0.25rem" }}>
              <strong>Drop a file</strong> or click to upload
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>
              Images, Videos, PDFs — max 50MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: "0.75rem",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "7px",
            padding: "0.5rem 0.875rem",
            color: "#dc2626",
            fontSize: "0.8125rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Recently uploaded */}
      {recent.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--fg-subtle)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
              fontWeight: 500,
            }}
          >
            Recently uploaded — click to insert
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {recent.map((f, i) => (
              <button
                key={i}
                onClick={() => onInsert(getMarkdown(f), f.url)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "7px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  width: "100%",
                }}
              >
                <span>{getIcon(f.mimeType)}</span>
                <span
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--fg-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.filename}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
