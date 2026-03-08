"use client";

import { useEffect, useRef, useState } from "react";

interface Thread {
  _id: string;
  content: string;
  createdAt: string;
}

interface Node {
  id: string;
  content: string;
  createdAt: string;
  words: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  dayGroup: number; // day bucket for clustering
}

interface Link {
  source: string;
  target: string;
  strength: number;
}

// Extract meaningful keywords (ignore common stop words)
const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","is","it","was","are","be",
  "with","that","this","as","by","from","i","my","me","we","our","you","your","he","she","they",
  "his","her","their","have","has","had","do","did","will","would","can","could","should","not",
  "so","just","like","get","got","got","when","what","how","all","its","if","about","more",
  "some","there","been","than","then","them","these","those","up","out","also","into","over",
  "no","very","one","two","any","which","who","an","was","were","am","im","its"
]);

function extractKeywords(content: string): string[] {
  return content
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

function getDayBucket(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / (1000 * 60 * 60 * 24));
}

function truncate(str: string, maxLen: number): string {
  const first = str.split("\n")[0];
  if (first.length <= maxLen) return first;
  return first.slice(0, maxLen) + "…";
}

// HSL color based on day bucket (hue cycles slowly)
function nodeColor(dayGroup: number, opacity: string): string {
  const hue = (dayGroup * 37) % 360;
  return `hsla(${hue}, 60%, 55%, ${opacity})`;
}

export default function ThreadConstellationView({ threads }: { threads: Thread[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const linksRef = useRef<Link[]>([]);
  const animRef = useRef<number>(0);
  const [hovered, setHovered] = useState<Node | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!threads.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    const H = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);
    canvas.style.width = canvas.offsetWidth + "px";
    canvas.style.height = canvas.offsetHeight + "px";
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const cW = canvas.offsetWidth;
    const cH = canvas.offsetHeight;

    const nodes: Node[] = threads.map((t) => ({
      id: t._id,
      content: t.content,
      createdAt: t.createdAt,
      words: extractKeywords(t.content),
      x: Math.random() * cW,
      y: Math.random() * cH,
      vx: 0, vy: 0,
      radius: Math.min(28, Math.max(14, 10 + t.content.length / 20)),
      dayGroup: getDayBucket(t.createdAt),
    }));
    nodesRef.current = nodes;

    // Build links by shared keywords
    const links: Link[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const shared = nodes[i].words.filter(w => nodes[j].words.includes(w)).length;
        if (shared >= 1) {
          links.push({ source: nodes[i].id, target: nodes[j].id, strength: Math.min(shared, 4) });
        }
        // Also link same-day threads weakly
        if (nodes[i].dayGroup === nodes[j].dayGroup && shared === 0) {
          links.push({ source: nodes[i].id, target: nodes[j].id, strength: 0.5 });
        }
      }
    }
    linksRef.current = links;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    function simulate() {
      const repulsion = 2200;
      const linkDist = 160;

      for (const n of nodesRef.current) {
        n.vx += (cW / 2 - n.x) * 0.002;
        n.vy += (cH / 2 - n.y) * 0.002;

        for (const m of nodesRef.current) {
          if (n === m) continue;
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          n.vx += (dx / dist) * force * 0.05;
          n.vy += (dy / dist) * force * 0.05;
        }

        for (const l of linksRef.current) {
          const other = l.source === n.id
            ? nodesRef.current.find(x => x.id === l.target)
            : l.target === n.id
            ? nodesRef.current.find(x => x.id === l.source)
            : null;
          if (!other) continue;
          const dx = other.x - n.x;
          const dy = other.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const diff = dist - linkDist;
          n.vx += (dx / dist) * diff * 0.015 * l.strength;
          n.vy += (dy / dist) * diff * 0.015 * l.strength;
        }

        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x = Math.max(n.radius + 4, Math.min(cW - n.radius - 4, n.x + n.vx));
        n.y = Math.max(n.radius + 4, Math.min(cH - n.radius - 4, n.y + n.vy));
      }
    }

    function draw() {
      ctx.clearRect(0, 0, cW, cH);

      // Subtle grid dots
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.04)";
      for (let gx = 40; gx < cW; gx += 60) {
        for (let gy = 40; gy < cH; gy += 60) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Links
      for (const l of linksRef.current) {
        const s = nodesRef.current.find(n => n.id === l.source);
        const t = nodesRef.current.find(n => n.id === l.target);
        if (!s || !t) continue;
        const alpha = l.strength >= 1 ? 0.18 * l.strength : 0.07;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isDark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
        ctx.lineWidth = l.strength >= 1 ? 1 : 0.5;
        ctx.stroke();
      }

      // Nodes
      for (const n of nodesRef.current) {
        const isHov = hovered?.id === n.id;
        const color = nodeColor(n.dayGroup, "1");
        const r = n.radius + (isHov ? 3 : 0);

        // Glow
        if (isHov) {
          const grd = ctx.createRadialGradient(n.x, n.y, r * 0.5, n.x, n.y, r * 2.2);
          grd.addColorStop(0, nodeColor(n.dayGroup, "0.25"));
          grd.addColorStop(1, nodeColor(n.dayGroup, "0"));
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        // Fill
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor(n.dayGroup, isDark ? "0.18" : "0.12");
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = isHov ? 2 : 1.5;
        ctx.stroke();

        // Text
        const maxChars = Math.floor(r / 3.2);
        const label = truncate(n.content, maxChars);
        ctx.fillStyle = isDark ? "rgba(220,216,208,0.85)" : "rgba(28,25,23,0.8)";
        ctx.font = `${isHov ? "500" : "400"} ${Math.max(8, r * 0.38)}px 'DM Sans', system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, n.x, n.y);
      }

      simulate();
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const found = nodesRef.current.find(n => {
      const dx = n.x - mx; const dy = n.y - my;
      return Math.sqrt(dx * dx + dy * dy) < n.radius + 6;
    }) || null;
    setHovered(found);
    setTooltip({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 14 });
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;
    const found = nodesRef.current.find(n => {
      const dx = n.x - mx; const dy = n.y - my;
      return Math.sqrt(dx * dx + dy * dy) < n.radius + 10;
    }) || null;
    setHovered(found);
    setTooltip({ x: mx + 14, y: my - 14 });
  }

  if (!threads.length) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--fg-subtle)" }}>
        No threads to visualize yet.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 180px)", minHeight: "420px" }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setTimeout(() => setHovered(null), 2000)}
        style={{
          width: "100%",
          height: "100%",
          cursor: hovered ? "pointer" : "default",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          display: "block",
        }}
      />

      {hovered && (
        <div
          style={{
            position: "absolute",
            left: Math.min(tooltip.x, (canvasRef.current?.offsetWidth ?? 600) - 240),
            top: Math.max(8, tooltip.y),
            background: "var(--bg-card, var(--bg-secondary))",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.625rem 0.875rem",
            pointerEvents: "none",
            zIndex: 10,
            maxWidth: "230px",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <p style={{ fontSize: "0.8125rem", color: "var(--fg)", lineHeight: 1.5, marginBottom: "0.375rem", whiteSpace: "pre-wrap" }}>
            {hovered.content.length > 140 ? hovered.content.slice(0, 140) + "…" : hovered.content}
          </p>
          <p style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)" }}>
            {new Date(hovered.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      )}

      <div style={{ position: "absolute", bottom: "0.875rem", left: "0.875rem", fontSize: "0.6875rem", color: "var(--fg-subtle)" }}>
        Connected by shared keywords · Same color = same day
      </div>
    </div>
  );
}
