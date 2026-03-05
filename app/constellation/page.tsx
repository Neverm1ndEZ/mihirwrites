import ConstellationView from "@/components/ConstellationView";

export const metadata = { title: "Post Constellation · Mihir Writes" };
export const dynamic = "force-dynamic";

export default function ConstellationPage() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.75rem", fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.03em", marginBottom: "0.25rem" }}>
          Post Constellation
        </h1>
        <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem" }}>
          Every post as a star. Connected by shared ideas.
        </p>
      </div>
      <ConstellationView />
    </div>
  );
}
