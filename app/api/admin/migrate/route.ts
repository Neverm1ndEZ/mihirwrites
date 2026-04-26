import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import Thread from "@/models/Thread";
import { isAdminAuthenticated } from "@/lib/auth";

// One-time migration: stamp all existing posts and threads as "personal"
export async function POST() {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const posts = await Post.updateMany(
    { category: { $exists: false } },
    { $set: { category: "personal" } }
  );

  const threads = await Thread.updateMany(
    { category: { $exists: false } },
    { $set: { category: "personal" } }
  );

  return NextResponse.json({
    posts: posts.modifiedCount,
    threads: threads.modifiedCount,
  });
}
