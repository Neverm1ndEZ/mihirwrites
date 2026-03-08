"use client";

import { useState, useRef, useEffect } from "react";

interface VoiceRecorderProps {
  onUpload: (url: string) => void;
  existingUrl?: string;
}

type RecordState = "idle" | "recording" | "recorded" | "uploading";

export default function VoiceRecorder({ onUpload, existingUrl }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordState>(existingUrl ? "recorded" : "idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(existingUrl || null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("recorded");
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      setError("Microphone access denied. Please allow mic access in browser settings.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  function discardRecording() {
    blobRef.current = null;
    setAudioUrl(existingUrl || null);
    setState(existingUrl ? "recorded" : "idle");
    setDuration(0);
  }

  async function uploadRecording() {
    if (!blobRef.current) return;
    setState("uploading");
    setError("");
    try {
      const file = new File([blobRef.current], `voice-intro-${Date.now()}.webm`, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAudioUrl(data.url);
      blobRef.current = null;
      setState("recorded");
      onUpload(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("recorded");
    }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Existing / recorded audio */}
      {audioUrl && (
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <span style={{ fontSize: "1.125rem" }}>🎙️</span>
          <audio controls src={audioUrl} style={{ flex: 1, height: "32px", minWidth: 0 }} />
          <button
            onClick={discardRecording}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: "1rem", flexShrink: 0, padding: "2px" }}
            title="Remove"
          >×</button>
        </div>
      )}

      {/* Controls */}
      {state === "idle" && (
        <button
          onClick={startRecording}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.625rem 1rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.875rem",
            color: "var(--fg-muted)",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--fg-muted)"; }}
        >
          <span style={{ width: "8px", height: "8px", background: "#ef4444", borderRadius: "50%", flexShrink: 0 }} />
          Record voice intro
        </button>
      )}

      {state === "recording" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={stopRecording}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.625rem 1rem",
              background: "#fef2f2",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.875rem",
              color: "#dc2626",
              fontFamily: "inherit",
            }}
          >
            <span style={{ width: "10px", height: "10px", background: "#ef4444", borderRadius: "2px", flexShrink: 0, animation: "pulse 1s infinite" }} />
            Stop recording
          </button>
          <span style={{ fontSize: "0.875rem", color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
            {fmt(duration)}
          </span>
        </div>
      )}

      {state === "recorded" && blobRef.current && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={uploadRecording} className="btn btn-primary" style={{ fontSize: "0.8125rem", padding: "0.375rem 0.875rem" }}>
            ↑ Use this recording
          </button>
          <button onClick={discardRecording} className="btn btn-ghost" style={{ fontSize: "0.8125rem", padding: "0.375rem 0.875rem" }}>
            Discard
          </button>
        </div>
      )}

      {state === "uploading" && (
        <div style={{ fontSize: "0.8125rem", color: "var(--fg-subtle)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
          Uploading…
        </div>
      )}

      {error && (
        <p style={{ fontSize: "0.8125rem", color: "#dc2626", margin: 0 }}>{error}</p>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
