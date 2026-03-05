import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import PostEditor from "@/components/PostEditor";

export const metadata = { title: "New Post · Admin" };

export default async function NewPostPage() {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) redirect("/admin");

  return <PostEditor mode="create" />;
}
