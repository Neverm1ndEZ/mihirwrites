import { redirect, notFound } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import PostEditor from "@/components/PostEditor";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";

export const metadata = { title: "Edit Post · Admin" };

async function getPost(slug: string) {
  try {
    await connectDB();
    const post = await Post.findOne({ slug }).lean();
    if (!post) return null;
    // Serialize — converts ObjectId, Date, Buffer to plain strings
    return JSON.parse(JSON.stringify(post));
  } catch {
    return null;
  }
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) redirect("/admin");

  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <PostEditor
      mode="edit"
      slug={slug}
      initialData={{
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage || "",
        tags: post.tags?.join(", ") || "",
        published: post.published,
        category: post.category || "personal",
      }}
    />
  );
}
