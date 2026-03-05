import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Comment from "@/models/Comment";
import AuditLog from "@/models/AuditLog";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const comments = await Comment.find().sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json({ comments: JSON.parse(JSON.stringify(comments)) });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const comment = await Comment.findByIdAndDelete(id);
    if (comment) {
      await AuditLog.create({
        action: "comment_deleted",
        targetSlug: comment.postSlug,
        targetId: id,
        detail: comment.content.slice(0, 100),
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
