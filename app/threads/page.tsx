import { Metadata } from "next";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import ThreadsPageClient from "@/components/ThreadsPageClient";

export const metadata: Metadata = { title: "Threads · Mihir Writes" };
export const dynamic = "force-dynamic";

async function getThreads() {
  try {
    await connectDB();
    const threads = await Thread.find().select("content category createdAt").sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(threads));
  } catch { return []; }
}

export default async function ThreadsPage() {
  const threads = await getThreads();
  return <ThreadsPageClient threads={threads} />;
}
