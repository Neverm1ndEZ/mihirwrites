import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MarkdownContent from "@/components/MarkdownContent";
import CommentSection from "@/components/CommentSection";
import connectDB from "@/lib/mongodb";
import PostModel from "@/models/Post";
import CommentModel from "@/models/Comment";

interface PostItem {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface CommentItem {
  _id: string;
  name: string;
  content: string;
  createdAt: string;
}

async function getPost(slug: string): Promise<{ post: PostItem; comments: CommentItem[] } | null> {
  try {
    await connectDB();
    const post = await PostModel.findOne({ slug, published: true }).lean();
    if (!post) return null;
    const comments = await CommentModel.find({ postSlug: slug })
      .sort({ createdAt: -1 })
      .lean();
    return JSON.parse(JSON.stringify({ post, comments }));
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPost(slug);
  if (!data) return { title: "Post Not Found" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL_MAIN || "";

  return {
    title: data.post.title,
    description: data.post.excerpt,
    alternates: {
      canonical: `${siteUrl}/post/${data.post.slug}`,
    },
    openGraph: {
      title: data.post.title,
      description: data.post.excerpt,
      type: "article",
      url: `${siteUrl}/post/${data.post.slug}`,
      publishedTime: data.post.createdAt,
      modifiedTime: data.post.updatedAt,
      images: data.post.coverImage
        ? [{ url: data.post.coverImage, width: 1200, height: 630 }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: data.post.title,
      description: data.post.excerpt,
      images: data.post.coverImage ? [data.post.coverImage] : [],
    },
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPost(slug);

  if (!data) notFound();

  const { post, comments }: { post: PostItem; comments: CommentItem[] } = data;

  return (
    <article
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "2rem 1.5rem 5rem",
      }}
    >
      {/* Back link */}
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          color: "var(--fg-muted)",
          fontSize: "0.875rem",
          textDecoration: "none",
          marginBottom: "2.5rem",
          transition: "color 0.15s",
        }}
        className="animate-fade-in"
      >
        ← Back
      </Link>

      {/* Meta */}
      <div
        className="animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.875rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <time
            style={{
              fontSize: "0.875rem",
              color: "var(--fg-subtle)",
              fontWeight: 500,
            }}
          >
            {formatDate(post.createdAt)}
          </time>
          {post.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>

        <h1
          style={{
            fontFamily: "var(--font-lora), serif",
            fontSize: "clamp(1.875rem, 4vw, 2.875rem)",
            fontWeight: 700,
            color: "var(--fg)",
            lineHeight: 1.2,
            letterSpacing: "-0.03em",
            marginBottom: "1rem",
          }}
        >
          {post.title}
        </h1>

        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--fg-muted)",
            lineHeight: 1.65,
            marginBottom: "2.5rem",
            fontStyle: "italic",
          }}
        >
          {post.excerpt}
        </p>
      </div>

      {/* Cover image */}
      {post.coverImage && (
        <div
          className="animate-fade-up"
          style={{
            animationDelay: "120ms",
            position: "relative",
            height: "clamp(200px, 40vw, 440px)",
            borderRadius: "12px",
            overflow: "hidden",
            marginBottom: "3rem",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            style={{ objectFit: "cover" }}
            priority
            sizes="(max-width: 800px) 100vw, 800px"
          />
        </div>
      )}

      {/* Content */}
      <div
        className="animate-fade-up"
        style={{ animationDelay: "180ms" }}
      >
        <MarkdownContent content={post.content} />
      </div>

      {/* Updated date if different */}
      {post.updatedAt !== post.createdAt && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--fg-subtle)",
            marginTop: "2rem",
            fontStyle: "italic",
          }}
        >
          Last updated {formatDate(post.updatedAt)}
        </p>
      )}

      {/* Comments */}
      <CommentSection slug={post.slug} initialComments={comments} />
    </article>
  );
}
