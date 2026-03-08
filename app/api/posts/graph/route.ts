import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";

export async function GET() {
  try {
    await connectDB();
    const posts = await Post.find({ published: true, deletedAt: null })
      .select("title slug tags mood")
      .lean();

    // Build nodes
    const nodes = posts.map((p) => ({
      id: p.slug,
      title: p.title,
      slug: p.slug,
      tags: p.tags || [],
      mood: p.mood || "",
    }));

    // Build edges: posts sharing at least one tag are connected
    // Edge weight = number of shared tags
    const links: { source: string; target: string; weight: number; sharedTags: string[] }[] = [];
    for (let i = 0; i < posts.length; i++) {
      for (let j = i + 1; j < posts.length; j++) {
        const a = posts[i].tags || [];
        const b = posts[j].tags || [];
        const shared = a.filter((t: string) => b.includes(t));
        if (shared.length > 0) {
          links.push({
            source: posts[i].slug,
            target: posts[j].slug,
            weight: shared.length,
            sharedTags: shared,
          });
        }
      }
    }

    // Also build tag nodes — unique tags as hub nodes
    const allTags = [...new Set(posts.flatMap((p) => p.tags || []))];

    return NextResponse.json({ nodes, links, allTags });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
