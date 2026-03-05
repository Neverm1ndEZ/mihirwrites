import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";

export async function GET() {
  try {
    await connectDB();
    const posts = await Post.find({ published: true, deletedAt: null })
      .select("title slug excerpt createdAt tags")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mihirwrites.com";

    const items = posts
      .map(
        (p) => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${siteUrl}/post/${p.slug}</link>
      <guid>${siteUrl}/post/${p.slug}</guid>
      <pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>
      <description><![CDATA[${p.excerpt}]]></description>
      ${p.tags.map((t: string) => `<category>${t}</category>`).join("")}
    </item>`
      )
      .join("");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Mihir Writes</title>
    <link>${siteUrl}</link>
    <description>Thoughts, ideas, and stories — written as they come.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Failed to generate feed", { status: 500 });
  }
}
