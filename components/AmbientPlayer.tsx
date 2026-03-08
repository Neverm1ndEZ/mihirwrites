"use client";

import { useState, useRef, useEffect } from "react";

const DEFAULT_TRACKS = [
  { label: "Late Night", url: "https://www.youtube.com/watch?v=qSi_E1m4wM0" },
  { label: "Focus", url: "http://youtube.com/watch?v=0wlulIyVh0g" },
];

interface AmbientPlayerProps {
  customTrackUrl?: string;
}

// ── URL classifiers ──────────────────────────────────────────────

type TrackType = "audio" | "youtube" | "spotify" | "soundcloud" | "applemusic" | "unknown";

function sanitizeUrl(url: string): string {
  // Strip any accidental backticks, quotes, whitespace
  return url.replace(/^[`'"]+|[`'"]+$/g, "").trim();
}

function classifyUrl(raw: string): { type: TrackType; url: string; embedUrl?: string } {
  const url = sanitizeUrl(raw);

  // Direct audio
  if (/\.(mp3|wav|ogg|flac|aac|m4a|opus)(\?|$)/i.test(url)) {
    return { type: "audio", url };
  }

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      type: "youtube",
      url,
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&loop=1&playlist=${ytMatch[1]}&controls=0&enablejsapi=1`,
    };
  }

  // Spotify
  const spotifyMatch = url.match(/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) {
    return {
      type: "spotify",
      url,
      embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}?utm_source=generator&theme=0`,
    };
  }

  // SoundCloud
  if (url.includes("soundcloud.com")) {
    return {
      type: "soundcloud",
      url,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23e8a23a&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false`,
    };
  }

  // Apple Music
  const appleMatch = url.match(/music\.apple\.com\/([a-z]+)\/(album|song|playlist)\/[^/]+\/([0-9]+)/);
  if (appleMatch) {
    return {
      type: "applemusic",
      url,
      embedUrl: `https://embed.music.apple.com/${appleMatch[1]}/${appleMatch[2]}/${appleMatch[3]}`,
    };
  }

  // Cloudinary or other CDN - try as audio
  if (url.includes("cloudinary.com") || url.includes("res.cloudinary")) {
    return { type: "audio", url };
  }

  // Unknown - attempt audio
  return { type: "unknown", url };
}

// ── YouTube IFrame API ───────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement, opts: {
        videoId: string;
        playerVars: Record<string, number | string>;
        events: { onReady?: () => void };
      }) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer { playVideo(): void; pauseVideo(): void; setVolume(v: number): void; destroy(): void; }

function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

// ── Component ────────────────────────────────────────────────────

export default function AmbientPlayer({ customTrackUrl }: AmbientPlayerProps) {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(35);
  const [trackIdx, setTrackIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytMountRef = useRef<HTMLDivElement | null>(null);
  // For embed-based players (Spotify, SoundCloud, Apple Music), we use a hidden iframe
  const embedIframeRef = useRef<HTMLIFrameElement | null>(null);

  const tracks = customTrackUrl
    ? [{ label: "Author's pick", url: sanitizeUrl(customTrackUrl) }, ...DEFAULT_TRACKS]
    : DEFAULT_TRACKS;

  const track = classifyUrl(tracks[trackIdx].url);
  const usesEmbed = ["spotify", "soundcloud", "applemusic"].includes(track.type);
  const isYT = track.type === "youtube";
  const isAudio = track.type === "audio" || track.type === "unknown";

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => () => {
    audioRef.current?.pause();
    ytPlayerRef.current?.destroy();
  }, []);

  // When track changes
  useEffect(() => {
    if (!mounted) return;
    stopAll(false);
    if (playing) startTrack();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx, mounted]);

  function stopAll(updateState = true) {
    audioRef.current?.pause();
    ytPlayerRef.current?.pauseVideo();
    if (updateState) setPlaying(false);
  }

  async function startTrack() {
    setError("");

    if (isYT) {
      const ytMatch = track.url.match(/(?:watch\?.*v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (!ytMatch) { setError("Invalid YouTube URL"); return; }
      const videoId = ytMatch[1];
      await loadYTApi();
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = null;
      if (!ytMountRef.current) return;
      // Clear the container so YT can re-init
      ytMountRef.current.innerHTML = "";
      const el = document.createElement("div");
      ytMountRef.current.appendChild(el);
      ytPlayerRef.current = new window.YT.Player(el, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, loop: 1, playlist: videoId },
        events: {
          onReady: () => {
            ytPlayerRef.current?.setVolume(volume);
            ytPlayerRef.current?.playVideo();
            setPlaying(true);
          },
        },
      });
    } else if (isAudio) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = track.url;
      audioRef.current.volume = volume / 100;
      audioRef.current.loop = true;
      audioRef.current.onerror = () => setError("Can't play this URL directly. Try uploading to Cloudinary.");
      audioRef.current.play()
        .then(() => setPlaying(true))
        .catch(() => setError("Playback blocked. Try clicking Play again."));
    } else if (usesEmbed) {
      // Embed players auto-play via their src — just show the iframe and signal playing
      setPlaying(true);
    }
  }

  async function togglePlay() {
    if (playing) {
      stopAll(true);
    } else {
      await startTrack();
    }
  }

  function applyVolume(v: number) {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v / 100;
    ytPlayerRef.current?.setVolume(v);
  }

  const typeLabel: Record<TrackType, string> = {
    audio: "", youtube: "YT", spotify: "SPTFY", soundcloud: "SC", applemusic: "AM", unknown: "",
  };
  const typeBg: Record<TrackType, string> = {
    audio: "", youtube: "#ff0000", spotify: "#1DB954", soundcloud: "#ff5500", applemusic: "#fc3c44", unknown: "",
  };

  if (!mounted) return null;

  return (
    <>
      {/* Hidden YT mount */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, width: "1px", height: "1px", overflow: "hidden" }} aria-hidden>
        <div ref={ytMountRef} />
      </div>

      {/* Hidden embed iframe for Spotify/SC/Apple */}
      {usesEmbed && playing && track.embedUrl && (
        <iframe
          ref={embedIframeRef}
          src={track.embedUrl}
          allow="autoplay; encrypted-media"
          style={{ position: "fixed", left: "-9999px", top: 0, width: "1px", height: "1px" }}
          title="ambient"
          aria-hidden
        />
      )}

      <div style={{ position: "fixed", bottom: "1.5rem", left: "1.5rem", zIndex: 90, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        {expanded && (
          <div style={{
            background: "var(--bg-card, var(--bg-secondary))",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "0.875rem 1rem",
            marginBottom: "0.5rem",
            boxShadow: "var(--shadow-lg)",
            minWidth: "210px",
          }}>
            <div style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", marginBottom: "0.625rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Ambient
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--fg)", fontWeight: 500, marginBottom: "0.625rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              {playing && <span style={{ animation: "ambientPulse 2s ease infinite", display: "inline-block" }}>♪</span>}
              {tracks[trackIdx].label}
              {typeLabel[track.type] && (
                <span style={{ fontSize: "0.5625rem", background: typeBg[track.type], color: "#fff", borderRadius: "3px", padding: "1px 4px", fontWeight: 700, letterSpacing: "0.03em" }}>
                  {typeLabel[track.type]}
                </span>
              )}
            </div>

            {/* Volume — only meaningful for audio/yt */}
            {!usesEmbed && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>🔈</span>
                <input
                  type="range" min="0" max="100" step="5" value={volume}
                  onChange={(e) => applyVolume(Number(e.target.value))}
                  style={{ width: "100px", accentColor: "var(--accent)", cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>🔊</span>
              </div>
            )}

            {usesEmbed && playing && (
              <p style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", margin: "0 0 0.625rem", fontStyle: "italic" }}>
                Playing via embedded player
              </p>
            )}

            {error && (
              <p style={{ fontSize: "0.6875rem", color: "#dc2626", margin: "0 0 0.625rem" }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: "0.375rem" }}>
              <button onClick={togglePlay} className="btn btn-primary" style={{ padding: "0.3rem 0.875rem", fontSize: "0.875rem", flex: 1 }}>
                {playing ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                onClick={() => { stopAll(true); setTrackIdx((i) => (i + 1) % tracks.length); }}
                className="btn btn-ghost"
                style={{ padding: "0.3rem 0.625rem", fontSize: "0.875rem" }}
                title="Next track"
              >⏭</button>
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          title="Ambient player"
          style={{
            display: "flex", alignItems: "center", gap: "0.375rem",
            background: playing ? "var(--accent)" : "var(--bg-secondary)",
            border: `1px solid ${playing ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "20px", padding: "0.375rem 0.75rem",
            color: playing ? "#fff" : "var(--fg-muted)",
            cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500,
            boxShadow: "var(--shadow)", transition: "all 0.2s", fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: "0.9rem", display: "inline-block", animation: playing ? "ambientPulse 2s ease infinite" : "none" }}>
            {playing ? "♫" : "♪"}
          </span>
          <span className="ambient-label">{playing ? "Playing" : "Ambience"}</span>
        </button>
      </div>

      <style>{`
        @keyframes ambientPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .ambient-label { display: none; }
        @media (min-width: 480px) { .ambient-label { display: inline; } }
      `}</style>
    </>
  );
}
