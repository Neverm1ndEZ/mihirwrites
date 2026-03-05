"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Post {
  _id: string;
  title: string;
  slug: string;
  tags: string[];
  viewCount: number;
  mood?: string;
}

interface Node {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  viewCount: number;
  mood?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Link {
  source: string;
  target: string;
  strength: number;
}

const MOOD_COLORS: Record<string, string> = {
  curious: "#f59e0b",
  nostalgic: "#8b5cf6",
  excited: "#ef4444",
  reflective: "#3b82f6",
  angry: "#dc2626",
  lost: "#6b7280",
  "": "#b8732a",
};

export default function ConstellationView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<Node | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });
  const nodesRef = useRef<Node[]>([]);
  const linksRef = useRef<Link[]>([]);
  const animRef = useRef<number>(0);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/posts/constellation")
      .then((r) => r.json())
      .then((d) => { setPosts(d.posts || []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!posts.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    // Build nodes
    const nodes: Node[] = posts.map((p) => ({
      id: p._id,
      slug: p.slug,
      title: p.title,
      tags: p.tags,
      viewCount: p.viewCount || 0,
      mood: p.mood,
      x: Math.random() * W,
      y: Math.random() * H,
      vx: 0, vy: 0,
      radius: Math.max(18, Math.min(40, 18 + p.viewCount / 2)),
    }));
    nodesRef.current = nodes;

    // Build links between posts sharing tags
    const links: Link[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const shared = nodes[i].tags.filter((t) => nodes[j].tags.includes(t)).length;
        if (shared > 0) links.push({ source: nodes[i].id, target: nodes[j].id, strength: shared });
      }
    }
    linksRef.current = links;

    const isDark = document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    function simulate() {
      const k = 0.05;
      const repulsion = 3000;
      const linkDist = 200;

      for (const n of nodesRef.current) {
        // Center attraction
        n.vx += (W / 2 - n.x) * 0.003;
        n.vy += (H / 2 - n.y) * 0.003;

        // Repulsion between all nodes
        for (const m of nodesRef.current) {
          if (n === m) continue;
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          n.vx += (dx / dist) * force * k;
          n.vy += (dy / dist) * force * k;
        }

        // Link attraction
        for (const l of linksRef.current) {
          const other = l.source === n.id
            ? nodesRef.current.find((x) => x.id === l.target)
            : l.target === n.id
            ? nodesRef.current.find((x) => x.id === l.source)
            : null;
          if (!other) continue;
          const dx = other.x - n.x;
          const dy = other.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const diff = dist - linkDist;
          n.vx += (dx / dist) * diff * 0.02 * l.strength;
          n.vy += (dy / dist) * diff * 0.02 * l.strength;
        }

        // Damping
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;

        // Boundary
        n.x = Math.max(n.radius, Math.min(W - n.radius, n.x));
        n.y = Math.max(n.radius, Math.min(H - n.radius, n.y));
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Draw links
      for (const l of linksRef.current) {
        const s = nodesRef.current.find((n) => n.id === l.source);
        const t = nodesRef.current.find((n) => n.id === l.target);
        if (!s || !t) continue;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isDark ? `rgba(255,255,255,${0.03 * l.strength + 0.03})` : `rgba(0,0,0,${0.04 * l.strength + 0.03})`;
        ctx.lineWidth = l.strength;
        ctx.stroke();
      }

      // Draw nodes
      for (const n of nodesRef.current) {
        const isHov = hovered?.id === n.id;
        const color = MOOD_COLORS[n.mood || ""] || "#b8732a";

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + (isHov ? 4 : 0), 0, Math.PI * 2);
        ctx.fillStyle = color + (isDark ? "40" : "20");
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = isHov ? 2.5 : 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = isDark ? "#e5e7eb" : "#1f2937";
        ctx.font = `${isHov ? 600 : 400} ${Math.max(9, n.radius * 0.45)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const maxChars = Math.floor(n.radius / 4);
        const label = n.title.length > maxChars ? n.title.slice(0, maxChars) + "…" : n.title;
        ctx.fillText(label, n.x, n.y);
      }

      simulate();
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const found = nodesRef.current.find((n) => {
      const dx = n.x - mx; const dy = n.y - my;
      return Math.sqrt(dx * dx + dy * dy) < n.radius + 4;
    }) || null;
    setHovered(found);
    setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10 });
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const found = nodesRef.current.find((n) => {
      const dx = n.x - mx; const dy = n.y - my;
      return Math.sqrt(dx * dx + dy * dy) < n.radius + 4;
    });
    if (found) router.push(`/post/${found.slug}`);
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 120px)", minHeight: "500px" }}>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--fg-subtle)" }}>
          Building constellation…
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHovered(null)}
            onClick={handleClick}
            style={{ width: "100%", height: "100%", cursor: hovered ? "pointer" : "default", borderRadius: "12px", border: "1px solid var(--border)" }}
          />
          {hovered && (
            <div
              style={{
                position: "absolute", left: tooltip.x, top: tooltip.y,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "0.5rem 0.875rem",
                pointerEvents: "none", zIndex: 10, maxWidth: "200px",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--fg)", marginBottom: "0.25rem" }}>{hovered.title}</p>
              {hovered.tags.length > 0 && (
                <p style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)" }}>{hovered.tags.join(", ")}</p>
              )}
              <p style={{ fontSize: "0.6875rem", color: "var(--accent)", marginTop: "0.25rem" }}>Click to open →</p>
            </div>
          )}
          <div style={{ position: "absolute", bottom: "1rem", left: "1rem", fontSize: "0.75rem", color: "var(--fg-subtle)" }}>
            Connected by shared tags · Click any node to read
          </div>
        </>
      )}
    </div>
  );
}
