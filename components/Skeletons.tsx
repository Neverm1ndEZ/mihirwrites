"use client";

// Reusable skeleton shimmer animation
const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, var(--bg-secondary) 25%, color-mix(in srgb, var(--bg-secondary) 60%, var(--border)) 50%, var(--bg-secondary) 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
  borderRadius: "6px",
};

function Bone({ w = "100%", h = "1rem", style = {} }: { w?: string; h?: string; style?: React.CSSProperties }) {
  return <div style={{ width: w, height: h, ...shimmerStyle, ...style }} />;
}

export function PostCardSkeleton() {
  return (
    <div style={{ paddingBottom: "2.5rem", marginBottom: "2.5rem", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", gap: "0.625rem", marginBottom: "0.75rem", alignItems: "center" }}>
        <Bone w="80px" h="0.75rem" />
        <Bone w="50px" h="0.75rem" />
        <Bone w="60px" h="1.5rem" style={{ borderRadius: "20px" }} />
      </div>
      <Bone h="1.5rem" style={{ marginBottom: "0.625rem" }} />
      <Bone w="70%" h="1.5rem" style={{ marginBottom: "1rem" }} />
      <Bone h="0.9375rem" style={{ marginBottom: "0.375rem" }} />
      <Bone w="85%" h="0.9375rem" style={{ marginBottom: "1rem" }} />
      <Bone w="90px" h="0.875rem" />
    </div>
  );
}

export function PostPageSkeleton() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <Bone w="60px" h="0.875rem" style={{ marginBottom: "2.5rem" }} />
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <Bone w="100px" h="0.875rem" />
        <Bone w="70px" h="0.875rem" />
      </div>
      <Bone h="2.5rem" style={{ marginBottom: "0.5rem" }} />
      <Bone w="60%" h="2.5rem" style={{ marginBottom: "1.25rem" }} />
      <Bone h="1.125rem" style={{ marginBottom: "0.5rem" }} />
      <Bone w="80%" h="1.125rem" style={{ marginBottom: "2rem" }} />
      <Bone h="300px" style={{ borderRadius: "12px", marginBottom: "2.5rem" }} />
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ marginBottom: "0.625rem" }}>
          <Bone h="1rem" w={i % 3 === 0 ? "75%" : i % 2 === 0 ? "90%" : "100%"} />
        </div>
      ))}
    </div>
  );
}

export function ThreadSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ padding: "1.5rem 0", borderBottom: "1px solid var(--border)", display: "flex", gap: "1rem" }}>
          <div style={{ width: "2px", background: "var(--border)", borderRadius: "1px", minHeight: "60px", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Bone h="1rem" style={{ marginBottom: "0.5rem" }} />
            <Bone w={i % 2 === 0 ? "80%" : "60%"} h="1rem" style={{ marginBottom: "0.75rem" }} />
            <Bone w="60px" h="0.75rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConstellationSkeleton() {
  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)", minHeight: "500px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
      <div style={{ width: "100%", height: "100%", ...shimmerStyle, borderRadius: "12px", opacity: 0.5 }} />
    </div>
  );
}

export function FullscreenLoader({ message = "Loading…" }: { message?: string }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "var(--bg)",
      zIndex: 500, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "1.25rem",
    }}>
      <div style={{ position: "relative", width: "40px", height: "40px" }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "3px solid var(--border)",
          borderTopColor: "var(--accent)",
          animation: "spin 0.8s linear infinite",
        }} />
      </div>
      <p style={{ fontSize: "0.875rem", color: "var(--fg-subtle)" }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function PageLoader() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0,
      height: "3px", zIndex: 999,
      background: "linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, transparent))",
      animation: "pageLoad 1.2s ease-in-out infinite",
      transformOrigin: "left",
    }}>
      <style>{`
        @keyframes pageLoad {
          0% { transform: scaleX(0); opacity: 1; }
          70% { transform: scaleX(0.85); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function SkeletonBlock() {
  return (
    <div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
