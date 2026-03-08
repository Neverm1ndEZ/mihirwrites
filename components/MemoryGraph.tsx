"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface GraphNode {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  mood: string;
  // simulation fields
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isTag?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  weight: number;
  sharedTags: string[];
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

const TAG_COLOR = "#22c55e";

export default function MemoryGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showTagNodes, setShowTagNodes] = useState(true);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/posts/graph")
      .then((r) => r.json())
      .then((data) => {
        const W = 900, H = 600;

        // Post nodes
        const postNodes: GraphNode[] = data.nodes.map((n: Omit<GraphNode, "x"|"y"|"vx"|"vy"|"radius">) => ({
          ...n,
          x: W / 2 + (Math.random() - 0.5) * 400,
          y: H / 2 + (Math.random() - 0.5) * 300,
          vx: 0,
          vy: 0,
          radius: 10 + Math.min(n.tags.length * 2, 12),
          isTag: false,
        }));

        // Tag hub nodes
        const tagNodes: GraphNode[] = (data.allTags as string[]).map((tag: string) => ({
          id: `tag:${tag}`,
          title: `#${tag}`,
          slug: "",
          tags: [tag],
          mood: "",
          x: W / 2 + (Math.random() - 0.5) * 600,
          y: H / 2 + (Math.random() - 0.5) * 400,
          vx: 0,
          vy: 0,
          radius: 7,
          isTag: true,
        }));

        const allNodes = [...postNodes, ...tagNodes];
        setNodes(allNodes);
        setLinks(data.links);
        setAllTags(data.allTags);
        nodesRef.current = allNodes;
        linksRef.current = data.links;
        setLoading(false);
      });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const visible = nodesRef.current.filter(
      (n) => filter === "all" || n.tags.includes(filter) || n.id === `tag:${filter}`
    );
    const visibleIds = new Set(visible.map((n) => n.id));

    // Draw links
    linksRef.current.forEach((link) => {
      if (!visibleIds.has(link.source) || !visibleIds.has(link.target)) return;
      const src = nodesRef.current.find((n) => n.id === link.source);
      const tgt = nodesRef.current.find((n) => n.id === link.target);
      if (!src || !tgt) return;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = `rgba(184,115,42,${Math.min(0.1 + link.weight * 0.12, 0.55)})`;
      ctx.lineWidth = Math.min(link.weight * 0.8, 3);
      ctx.stroke();
    });

    // Draw tag-to-post links (if tag nodes visible)
    if (showTagNodes) {
      visible.filter((n) => n.isTag).forEach((tagNode) => {
        const tagName = tagNode.tags[0];
        visible.filter((n) => !n.isTag && n.tags.includes(tagName)).forEach((postNode) => {
          ctx.beginPath();
          ctx.moveTo(tagNode.x, tagNode.y);
          ctx.lineTo(postNode.x, postNode.y);
          ctx.strokeStyle = "rgba(34,197,94,0.15)";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      });
    }

    // Draw nodes
    visible.forEach((node) => {
      if (node.isTag && !showTagNodes) return;
      const isHov = hovered?.id === node.id;
      const color = node.isTag ? TAG_COLOR : (MOOD_COLORS[node.mood] || MOOD_COLORS[""]);

      // Glow on hover
      if (isHov) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = `${color}28`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = isHov ? color : `${color}cc`;
      ctx.fill();
      ctx.strokeStyle = isHov ? "#fff" : `${color}44`;
      ctx.lineWidth = isHov ? 2 : 1;
      ctx.stroke();

      // Label
      if (isHov || node.radius >= 14) {
        const label = node.isTag ? node.title : (node.title.length > 22 ? node.title.slice(0, 20) + "…" : node.title);
        ctx.font = `${node.isTag ? 400 : 500} ${node.isTag ? 10 : 11}px 'DM Sans', sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.textAlign = "center";
        ctx.fillText(label, node.x, node.y + node.radius + 14);
      }
    });
  }, [hovered, filter, showTagNodes]);

  // Force simulation
  useEffect(() => {
    if (loading) return;

    function tick() {
      const ns = nodesRef.current;
      const ls = linksRef.current;
      const W = 900, H = 600;
      const alpha = 0.06;

      // Repulsion between all nodes
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x;
          const dy = ns[j].y - ns[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = ns[i].radius + ns[j].radius + 40;
          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.5;
            const fx = dx * force;
            const fy = dy * force;
            ns[i].vx -= fx;
            ns[i].vy -= fy;
            ns[j].vx += fx;
            ns[j].vy += fy;
          }
        }
      }

      // Attraction along links
      ls.forEach((link) => {
        const src = ns.find((n) => n.id === link.source);
        const tgt = ns.find((n) => n.id === link.target);
        if (!src || !tgt) return;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = 120 - link.weight * 10;
        const force = (dist - target) / dist * alpha * (link.weight * 0.5);
        src.vx += dx * force;
        src.vy += dy * force;
        tgt.vx -= dx * force;
        tgt.vy -= dy * force;
      });

      // Tag-to-post attraction
      ns.filter((n) => n.isTag).forEach((tagNode) => {
        const tag = tagNode.tags[0];
        ns.filter((n) => !n.isTag && n.tags.includes(tag)).forEach((postNode) => {
          const dx = postNode.x - tagNode.x;
          const dy = postNode.y - tagNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const target = 100;
          const force = (dist - target) / dist * alpha * 0.3;
          tagNode.vx += dx * force;
          tagNode.vy += dy * force;
          postNode.vx -= dx * force;
          postNode.vy -= dy * force;
        });
      });

      // Center gravity
      ns.forEach((n) => {
        n.vx += (W / 2 - n.x) * 0.002;
        n.vy += (H / 2 - n.y) * 0.002;
        // Damping
        n.vx *= 0.88;
        n.vy *= 0.88;
        n.x += n.vx;
        n.y += n.vy;
        // Bounds
        n.x = Math.max(n.radius + 10, Math.min(W - n.radius - 10, n.x));
        n.y = Math.max(n.radius + 10, Math.min(H - n.radius - 10, n.y));
      });

      draw();
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [loading, draw]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let found: GraphNode | null = null;
    for (const node of nodesRef.current) {
      const dx = mx - node.x, dy = my - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < node.radius + 6) { found = node; break; }
    }
    setHovered(found);
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    canvas.style.cursor = found ? "pointer" : "default";
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    for (const node of nodesRef.current) {
      const dx = mx - node.x, dy = my - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < node.radius + 6) {
        if (!node.isTag && node.slug) router.push(`/post/${node.slug}`);
        else if (node.isTag) setFilter(node.tags[0]);
        break;
      }
    }
  }

  return (
    <div style={{ padding: "2rem 1.5rem 4rem", maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "var(--font-lora, serif)", fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 700, color: "var(--fg)", marginBottom: "0.5rem" }}>
          Memory Graph
        </h1>
        <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem" }}>
          How ideas connect across posts — nodes sized by tag count, colored by mood.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setFilter("all")}
          style={{
            padding: "0.3rem 0.875rem", borderRadius: "20px", fontSize: "0.8125rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
            background: filter === "all" ? "var(--accent)" : "var(--bg-secondary)",
            color: filter === "all" ? "#fff" : "var(--fg-muted)",
            border: `1px solid ${filter === "all" ? "var(--accent)" : "var(--border)"}`,
          }}
        >All</button>
        {allTags.slice(0, 12).map((tag) => (
          <button
            key={tag}
            onClick={() => setFilter(filter === tag ? "all" : tag)}
            style={{
              padding: "0.3rem 0.875rem", borderRadius: "20px", fontSize: "0.8125rem", fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
              background: filter === tag ? "var(--accent)" : "var(--bg-secondary)",
              color: filter === tag ? "#fff" : "var(--fg-muted)",
              border: `1px solid ${filter === tag ? "var(--accent)" : "var(--border)"}`,
            }}
          >#{tag}</button>
        ))}
        <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8125rem", color: "var(--fg-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={showTagNodes} onChange={(e) => setShowTagNodes(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
          Tag hubs
        </label>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg-secondary)", boxShadow: "var(--shadow-lg)" }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", fontSize: "0.875rem" }}>
            Loading graph…
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={900}
          height={540}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
          onClick={handleClick}
          style={{ width: "100%", height: "auto", display: "block" }}
        />

        {/* Tooltip */}
        {hovered && (
          <div style={{
            position: "absolute",
            left: Math.min(tooltip.x + 12, 680),
            top: Math.max(tooltip.y - 40, 8),
            background: "var(--bg-card, var(--card-bg, var(--bg-secondary)))",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.5rem 0.875rem",
            fontSize: "0.8125rem",
            color: "var(--fg)",
            boxShadow: "var(--shadow-lg)",
            pointerEvents: "none",
            maxWidth: "220px",
          }}>
            <div style={{ fontWeight: 600, marginBottom: hovered.isTag ? 0 : "0.25rem" }}>{hovered.title}</div>
            {!hovered.isTag && hovered.tags.length > 0 && (
              <div style={{ color: "var(--fg-subtle)", fontSize: "0.75rem" }}>
                {hovered.tags.map((t) => `#${t}`).join(" · ")}
              </div>
            )}
            {!hovered.isTag && (
              <div style={{ color: "var(--accent)", fontSize: "0.6875rem", marginTop: "0.25rem" }}>Click to open →</div>
            )}
            {hovered.isTag && (
              <div style={{ color: TAG_COLOR, fontSize: "0.6875rem", marginTop: "0.125rem" }}>Click to filter</div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1.25rem", marginTop: "1rem", flexWrap: "wrap" }}>
        {Object.entries(MOOD_COLORS).filter(([k]) => k).map(([mood, color]) => (
          <div key={mood} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--fg-subtle)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
            {mood}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--fg-subtle)" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: TAG_COLOR, display: "inline-block" }} />
          tag hub
        </div>
      </div>
    </div>
  );
}
