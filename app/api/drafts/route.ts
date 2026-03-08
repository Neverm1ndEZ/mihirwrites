import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Draft from "@/models/Draft";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const drafts = await Draft.find().sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ drafts });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const body = await req.json();
    const draft = await Draft.create(body);
    return NextResponse.json({ draft });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const { id, ...body } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const draft = await Draft.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json({ draft });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await Draft.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
