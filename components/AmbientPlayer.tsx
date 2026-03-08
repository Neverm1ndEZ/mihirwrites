"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const DEFAULT_TRACKS = [
  { label: "Late Night", url: "https://www.youtube.com/watch?v=qSi_E1m4wM0" },
  { label: "Focus", url: "http://youtube.com/watch?v=0wlulIyVh0g" },
];

interface AmbientPlayerProps {
  customTrackUrl?: string;
}

type TrackType = "audio" | "youtube" | "spotify" | "soundcloud" | "applemusic" | "unknown";

function sanitizeUrl(url: string): string {
  return url.replace(/^[`'\"]+|[`'\"]+$/g, "").trim();
}

function classifyUrl(raw: string): { type: TrackType; url: string; embedUrl?: string } {
  const url = sanitizeUrl(raw);
  if (/\.(mp3|wav|ogg|flac|aac|m4a|opus)(\?|$)/i.test(url)) return { type: "audio", url };
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: "youtube", url, embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&loop=1&playlist=${ytMatch[1]}&controls=0&enablejsapi=1` };
  const spotifyMatch = url.match(/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) return { type: "spotify", url, embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}?utm_source=generator&theme=0` };
  if (url.includes("soundcloud.com")) return { type: "soundcloud", url, embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23e8a23a&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false` };
  const appleMatch = url.match(/music\.apple\.com\/([a-z]+)\/(album|song|playlist)\/[^/]+\/([0-9]+)/);
  if (appleMatch) return { type: "applemusic", url, embedUrl: `https://embed.music.apple.com/${appleMatch[1]}/${appleMatch[2]}/${appleMatch[3]}` };
  if (url.includes("cloudinary.com") || url.includes("res.cloudinary")) return { type: "audio", url };
  return { type: "unknown", url };
}

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement, opts: {
        videoId: string;
        playerVars: Record<string, number | string>;
        events: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
      }) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(v: number): void;
  destroy(): void;
  getDuration(): number;
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
}

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

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AmbientPlayer({ customTrackUrl }: AmbientPlayerProps) {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(35);
  const [trackIdx, setTrackIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");

  // Seek / progress — works for both audio and YT
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // A-B Loop
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [loopActive, setLoopActive] = useState(false);
  const [settingLoop, setSettingLoop] = useState<"A" | "B" | null>(null);

  // Crossfade (audio only)
  const [crossfadeDuration, setCrossfadeDuration] = useState(3);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytMountRef = useRef<HTMLDivElement | null>(null);
  const embedIframeRef = useRef<HTMLIFrameElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCrossfading = useRef(false);

  const tracks = customTrackUrl
    ? [{ label: "Author's pick", url: sanitizeUrl(customTrackUrl) }, ...DEFAULT_TRACKS]
    : DEFAULT_TRACKS;

  const track = classifyUrl(tracks[trackIdx].url);
  const usesEmbed = ["spotify", "soundcloud", "applemusic"].includes(track.type);
  const isYT = track.type === "youtube";
  const isAudio = track.type === "audio" || track.type === "unknown";
  // Seeking/looping supported for audio and YT
  const supportsSeek = isAudio || isYT;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => () => {
    audioRef.current?.pause();
    ytPlayerRef.current?.destroy();
    if (progressInterval.current) clearInterval(progressInterval.current);
  }, []);

  const startProgressPoll = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      let cur = 0, dur = 0;

      if (isAudio && audioRef.current) {
        cur = audioRef.current.currentTime;
        dur = audioRef.current.duration || 0;
      } else if (isYT && ytPlayerRef.current) {
        try {
          cur = ytPlayerRef.current.getCurrentTime() || 0;
          dur = ytPlayerRef.current.getDuration() || 0;
        } catch { return; }
      }

      setCurrentTime(cur);
      if (dur > 0) setDuration(dur);

      // A-B loop
      if (loopActive && loopA !== null && loopB !== null && cur >= loopB) {
        if (isAudio && audioRef.current) audioRef.current.currentTime = loopA;
        else if (isYT && ytPlayerRef.current) ytPlayerRef.current.seekTo(loopA, true);
      }

      // Crossfade (audio only — near end of track)
      if (isAudio && crossfadeEnabled && dur > 0 && cur >= dur - crossfadeDuration && !isCrossfading.current) {
        startCrossfade();
      }
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudio, isYT, loopActive, loopA, loopB, crossfadeEnabled, crossfadeDuration]);

  useEffect(() => {
    if (playing && supportsSeek) startProgressPoll();
    else if (progressInterval.current) clearInterval(progressInterval.current);
  }, [playing, supportsSeek, startProgressPoll]);

  function stopAll(updateState = true) {
    audioRef.current?.pause();
    ytPlayerRef.current?.pauseVideo();
    if (progressInterval.current) clearInterval(progressInterval.current);
    isCrossfading.current = false;
    if (updateState) setPlaying(false);
  }

  function startCrossfade() {
    if (!isAudio || !audioRef.current) return;
    isCrossfading.current = true;
    const nextIdx = (trackIdx + 1) % tracks.length;
    const nextTrack = classifyUrl(tracks[nextIdx].url);
    if (nextTrack.type !== "audio" && nextTrack.type !== "unknown") {
      goToNext(); return;
    }
    const nextAudio = new Audio(nextTrack.url);
    nextAudio.volume = 0;
    nextAudio.play().catch(() => {});
    nextAudioRef.current = nextAudio;
    const steps = 20;
    const stepDuration = (crossfadeDuration * 1000) / steps;
    let step = 0;
    const fade = setInterval(() => {
      step++;
      const ratio = step / steps;
      if (audioRef.current) audioRef.current.volume = Math.max(0, (volume / 100) * (1 - ratio));
      if (nextAudio) nextAudio.volume = Math.min(volume / 100, (volume / 100) * ratio);
      if (step >= steps) {
        clearInterval(fade);
        audioRef.current?.pause();
        audioRef.current = nextAudio;
        nextAudioRef.current = null;
        audioRef.current.volume = volume / 100;
        audioRef.current.loop = true;
        setTrackIdx(nextIdx);
        isCrossfading.current = false;
      }
    }, stepDuration);
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
            // Give YT a moment to load duration
            setTimeout(() => {
              const dur = ytPlayerRef.current?.getDuration() || 0;
              if (dur > 0) setDuration(dur);
            }, 1500);
          },
        },
      });
    } else if (isAudio) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = track.url;
      audioRef.current.volume = volume / 100;
      audioRef.current.loop = !crossfadeEnabled;
      audioRef.current.onerror = () => setError("Can't play this URL. Try uploading to Cloudinary.");
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration || 0);
      };
      audioRef.current.play()
        .then(() => setPlaying(true))
        .catch(() => setError("Playback blocked. Try clicking Play again."));
    } else if (usesEmbed) {
      setPlaying(true);
    }
  }

  function goToNext() {
    const nextIdx = (trackIdx + 1) % tracks.length;
    stopAll(false);
    setCurrentTime(0); setDuration(0);
    setLoopA(null); setLoopB(null); setLoopActive(false);
    setTrackIdx(nextIdx);
  }

  useEffect(() => {
    if (!mounted) return;
    stopAll(false);
    setCurrentTime(0); setDuration(0);
    if (playing) startTrack();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx, mounted]);

  async function togglePlay() {
    if (playing) stopAll(true);
    else await startTrack();
  }

  function applyVolume(v: number) {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v / 100;
    ytPlayerRef.current?.setVolume(v);
    if (nextAudioRef.current) nextAudioRef.current.volume = v / 100;
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (isAudio && audioRef.current) audioRef.current.currentTime = val;
    else if (isYT && ytPlayerRef.current) ytPlayerRef.current.seekTo(val, true);
  }

  function setLoopPoint(point: "A" | "B") {
    const cur = isYT
      ? (ytPlayerRef.current?.getCurrentTime() ?? currentTime)
      : (audioRef.current?.currentTime ?? currentTime);
    if (point === "A") {
      setLoopA(cur); setLoopB(null); setLoopActive(false);
    } else {
      if (loopA === null || cur <= loopA) return;
      setLoopB(cur); setLoopActive(true);
    }
    setSettingLoop(null);
  }

  function clearLoop() {
    setLoopA(null); setLoopB(null); setLoopActive(false); setSettingLoop(null);
  }

  const typeLabel: Record<TrackType, string> = { audio: "", youtube: "YT", spotify: "SPTFY", soundcloud: "SC", applemusic: "AM", unknown: "" };
  const typeBg: Record<TrackType, string> = { audio: "", youtube: "#ff0000", spotify: "#1DB954", soundcloud: "#ff5500", applemusic: "#fc3c44", unknown: "" };

  if (!mounted) return null;

  const loopProgress = duration > 0 && loopA !== null && loopB !== null
    ? { left: `${(loopA / duration) * 100}%`, width: `${((loopB - loopA) / duration) * 100}%` }
    : null;

  return (
    <>
      <div style={{ position: "fixed", left: "-9999px", top: 0, width: "1px", height: "1px", overflow: "hidden" }} aria-hidden>
        <div ref={ytMountRef} />
      </div>

      {usesEmbed && playing && track.embedUrl && (
        <iframe ref={embedIframeRef} src={track.embedUrl} allow="autoplay; encrypted-media"
          style={{ position: "fixed", left: "-9999px", top: 0, width: "1px", height: "1px" }} title="ambient" aria-hidden />
      )}

      <div style={{ position: "fixed", bottom: "1.5rem", left: "1.5rem", zIndex: 90, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        {expanded && (
          <div style={{
            background: "var(--bg-card, var(--bg-secondary))",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "1rem 1.125rem",
            marginBottom: "0.5rem",
            boxShadow: "var(--shadow-lg)",
            width: "280px",
          }}>
            {/* Header */}
            <div style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", marginBottom: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Ambient</div>

            {/* Track name */}
            <div style={{ fontSize: "0.8125rem", color: "var(--fg)", fontWeight: 500, marginBottom: "0.875rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              {playing && <span style={{ animation: "ambientPulse 2s ease infinite", display: "inline-block" }}>♪</span>}
              {tracks[trackIdx].label}
              {typeLabel[track.type] && (
                <span style={{ fontSize: "0.5625rem", background: typeBg[track.type], color: "#fff", borderRadius: "3px", padding: "1px 4px", fontWeight: 700 }}>
                  {typeLabel[track.type]}
                </span>
              )}
            </div>

            {/* ── Seek bar — audio AND youtube ── */}
            {supportsSeek && (
              <div style={{ marginBottom: "0.875rem" }}>
                <div style={{ position: "relative", marginBottom: "0.375rem" }}>
                  {/* A-B region highlight */}
                  {loopProgress && duration > 0 && (
                    <div style={{
                      position: "absolute", top: "50%", transform: "translateY(-50%)",
                      height: "4px", pointerEvents: "none",
                      left: loopProgress.left, width: loopProgress.width,
                      background: "var(--accent)", opacity: 0.45, borderRadius: "2px", zIndex: 1,
                    }} />
                  )}
                  <input
                    type="range" min={0} max={duration || 100} step={1}
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={duration === 0}
                    style={{ width: "100%", accentColor: "var(--accent)", cursor: duration > 0 ? "pointer" : "default", display: "block" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--fg-subtle)" }}>
                  <span>{fmtTime(currentTime)}</span>
                  <span>{duration > 0 ? fmtTime(duration) : (isYT ? "loading…" : "--:--")}</span>
                </div>
              </div>
            )}

            {/* ── Volume ── */}
            {!usesEmbed && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>🔈</span>
                <input type="range" min="0" max="100" step="5" value={volume}
                  onChange={(e) => applyVolume(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }} />
                <span style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", minWidth: "28px" }}>{volume}%</span>
              </div>
            )}

            {/* ── A-B Loop — audio AND youtube ── */}
            {supportsSeek && (
              <div style={{ marginBottom: "0.875rem", padding: "0.625rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                  A-B Loop {loopActive && <span style={{ color: "var(--accent)" }}>● active</span>}
                </div>
                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => settingLoop === "A" ? setLoopPoint("A") : setSettingLoop("A")}
                    style={{
                      padding: "0.25rem 0.625rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                      background: settingLoop === "A" ? "var(--accent)" : loopA !== null ? "color-mix(in srgb, var(--accent) 15%, var(--bg))" : "var(--bg-secondary)",
                      color: settingLoop === "A" ? "#fff" : loopA !== null ? "var(--accent)" : "var(--fg-muted)",
                      border: `1px solid ${loopA !== null ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {settingLoop === "A" ? "⏺ Tap A" : loopA !== null ? `A: ${fmtTime(loopA)}` : "Set A"}
                  </button>
                  <button
                    onClick={() => { if (loopA !== null) settingLoop === "B" ? setLoopPoint("B") : setSettingLoop("B"); }}
                    disabled={loopA === null && settingLoop !== "B"}
                    style={{
                      padding: "0.25rem 0.625rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit", cursor: loopA !== null ? "pointer" : "not-allowed",
                      background: settingLoop === "B" ? "var(--accent)" : loopB !== null ? "color-mix(in srgb, var(--accent) 15%, var(--bg))" : "var(--bg-secondary)",
                      color: settingLoop === "B" ? "#fff" : loopB !== null ? "var(--accent)" : "var(--fg-muted)",
                      border: `1px solid ${loopB !== null ? "var(--accent)" : "var(--border)"}`,
                      opacity: loopA === null ? 0.45 : 1,
                    }}
                  >
                    {settingLoop === "B" ? "⏺ Tap B" : loopB !== null ? `B: ${fmtTime(loopB)}` : "Set B"}
                  </button>
                  {(loopA !== null || loopB !== null) && (
                    <button onClick={clearLoop} style={{ padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", fontFamily: "inherit", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--fg-subtle)" }}>✕</button>
                  )}
                  {loopA !== null && loopB !== null && (
                    <button
                      onClick={() => setLoopActive((v) => !v)}
                      style={{
                        padding: "0.25rem 0.625rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                        background: loopActive ? "var(--accent)" : "var(--bg-secondary)",
                        color: loopActive ? "#fff" : "var(--fg-muted)",
                        border: "1px solid var(--border)",
                      }}
                    >{loopActive ? "⟳ On" : "Loop"}</button>
                  )}
                </div>
                {settingLoop && (
                  <p style={{ fontSize: "0.6875rem", color: "var(--accent)", marginTop: "0.4rem", fontStyle: "italic" }}>
                    Seek to your spot, then tap "Tap {settingLoop}" to mark it
                  </p>
                )}
              </div>
            )}

            {/* ── Crossfade (audio only) ── */}
            {isAudio && (
              <div style={{ marginBottom: "0.875rem", padding: "0.625rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: crossfadeEnabled ? "0.5rem" : 0 }}>
                  <label style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <input type="checkbox" checked={crossfadeEnabled} onChange={(e) => {
                      setCrossfadeEnabled(e.target.checked);
                      if (audioRef.current) audioRef.current.loop = !e.target.checked;
                    }} style={{ accentColor: "var(--accent)" }} />
                    Crossfade
                  </label>
                  {crossfadeEnabled && <span style={{ fontSize: "0.6875rem", color: "var(--accent)", fontWeight: 600 }}>{crossfadeDuration}s</span>}
                </div>
                {crossfadeEnabled && (
                  <input type="range" min={1} max={10} step={1} value={crossfadeDuration}
                    onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
                )}
              </div>
            )}

            {usesEmbed && playing && (
              <p style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)", marginBottom: "0.625rem", fontStyle: "italic" }}>Playing via embedded player</p>
            )}

            {error && <p style={{ fontSize: "0.6875rem", color: "#dc2626", marginBottom: "0.625rem" }}>{error}</p>}

            {/* Controls */}
            <div style={{ display: "flex", gap: "0.375rem" }}>
              <button onClick={togglePlay} className="btn btn-primary" style={{ padding: "0.3rem 0.875rem", fontSize: "0.875rem", flex: 1 }}>
                {playing ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                onClick={goToNext}
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
