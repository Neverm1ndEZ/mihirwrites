import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subscriber from "@/models/Subscriber";
import { isAdminAuthenticated } from "@/lib/auth";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const last = rateLimitMap.get(ip) || 0;
  if (now - last < 60_000) {
    return NextResponse.json({ error: "Too many requests, wait a minute" }, { status: 429 });
  }
  rateLimitMap.set(ip, now);

  try {
    await connectDB();
    const { email } = await req.json();
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    try {
      await Subscriber.create({ email: email.trim().toLowerCase() });
    } catch (e: unknown) {
      if ((e as { code?: number }).code === 11000) {
        return NextResponse.json({ message: "Already subscribed!" });
      }
      throw e;
    }

    return NextResponse.json({ message: "Subscribed!" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET() {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const subscribers = await Subscriber.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ subscribers: JSON.parse(JSON.stringify(subscribers)), count: subscribers.length });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
