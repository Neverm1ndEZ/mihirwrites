import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ logs: JSON.parse(JSON.stringify(logs)) });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
