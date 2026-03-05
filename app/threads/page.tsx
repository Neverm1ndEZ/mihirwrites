import { Metadata } from "next";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import ThreadClient from "@/components/ThreadClient";

export const metadata: Metadata = { title: "Threads · Mihir Writes" };
export const dynamic = "force-dynamic";

async function getThreads() {
  try {
    await connectDB();
    const threads = await Thread.find().sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(threads));
  } catch { return []; }
}

export default async function ThreadsPage() {
  const threads = await getThreads();
  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-lora), serif", fontSize: "2rem", fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
          Thread of Thought
        </h1>
        <p style={{ color: "var(--fg-muted)", fontSize: "0.9375rem" }}>
          Half-formed thoughts. Questions I'm sitting with. Things I noticed.
        </p>
      </div>
      <ThreadClient initialThreads={threads} />
    </div>
  );
}
