import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "6rem 1.5rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-lora), serif",
          fontSize: "6rem",
          fontWeight: 700,
          color: "var(--border-strong)",
          lineHeight: 1,
          marginBottom: "1.5rem",
        }}
      >
        404
      </div>
      <h1
        style={{
          fontFamily: "var(--font-lora), serif",
          fontSize: "1.75rem",
          color: "var(--fg)",
          marginBottom: "0.75rem",
          letterSpacing: "-0.03em",
        }}
      >
        Page not found
      </h1>
      <p style={{ color: "var(--fg-muted)", marginBottom: "2rem" }}>
        This page doesn't exist or was moved.
      </p>
      <Link href="/" className="btn btn-primary">
        ← Back to Home
      </Link>
    </div>
  );
}
