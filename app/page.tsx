import Link from "next/link";
import Image from "next/image";
import connectDB from "@/lib/mongodb";
import PostModel from "@/models/Post";

interface PostItem {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  tags: string[];
  createdAt: string;
}

async function getPosts(): Promise<PostItem[]> {
  try {
    await connectDB();
    const posts = await PostModel.find({ published: true })
      .select("title slug excerpt coverImage tags createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return JSON.parse(JSON.stringify(posts));
  } catch {
    return [];
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function HomePage() {
  const posts = await getPosts();

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "3rem 1.5rem 5rem",
      }}
    >
      {/* Hero header */}
      <div
        style={{ marginBottom: "4rem" }}
        className="animate-fade-up"
      >
        <h1
          style={{
            fontFamily: "var(--font-lora), serif",
            fontSize: "clamp(2.5rem, 5vw, 3.75rem)",
            fontWeight: 700,
            color: "var(--fg)",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: "0.75rem",
          }}
        >
          Mihir Writes
        </h1>
        <p style={{ color: "var(--fg-muted)", fontSize: "1.0625rem", maxWidth: "42ch" }}>
          Thoughts, ideas, and stories — written as they come.
        </p>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "5rem 2rem",
            color: "var(--fg-subtle)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✦</div>
          <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.125rem" }}>
            No posts yet. Start writing.
          </p>
          <Link href="/admin" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
            Go to Admin →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {posts.map((post: PostItem, i: number) => (
            <article key={post._id}
              className="animate-fade-up"
              style={{
                animationDelay: `${i * 60}ms`,
                paddingBottom: "2.5rem",
                marginBottom: "2.5rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <Link href={`/post/${post.slug}`} style={{ textDecoration: "none", display: "block" }}>
                {/* Cover image */}
                {post.coverImage && (
                  <div
                    style={{
                      position: "relative",
                      height: "240px",
                      borderRadius: "10px",
                      overflow: "hidden",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="(max-width: 800px) 100vw, 800px"
                    />
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.6rem" }}>
                  <time
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--fg-subtle)",
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {formatDate(post.createdAt)}
                  </time>
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag" style={{ fontSize: "0.6875rem" }}>
                      {tag}
                    </span>
                  ))}
                </div>

                <h2
                  style={{
                    fontFamily: "var(--font-lora), serif",
                    fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)",
                    fontWeight: 600,
                    color: "var(--fg)",
                    lineHeight: 1.3,
                    letterSpacing: "-0.02em",
                    marginBottom: "0.6rem",
                    transition: "color 0.15s",
                  }}
                >
                  {post.title}
                </h2>

                <p
                  style={{
                    color: "var(--fg-muted)",
                    fontSize: "0.9375rem",
                    lineHeight: 1.7,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {post.excerpt}
                </p>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    marginTop: "0.875rem",
                    color: "var(--accent)",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  Read more →
                </span>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
