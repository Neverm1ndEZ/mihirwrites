import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import AuditLog from "@/models/AuditLog";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    const threads = await Thread.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ threads: JSON.parse(JSON.stringify(threads)) });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
    if (content.trim().length > 500) return NextResponse.json({ error: "Too long (max 500 chars)" }, { status: 400 });

    const thread = await Thread.create({ content: content.trim() });
    await AuditLog.create({ action: "thread_created", detail: content.slice(0, 80) });
    return NextResponse.json({ thread }, { status: 201 });
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

    await Thread.findByIdAndDelete(id);
    await AuditLog.create({ action: "thread_deleted", targetId: id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
