import { NextRequest, NextResponse } from "next/server";
import { signAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      // Intentional delay to prevent brute force
      await new Promise((r) => setTimeout(r, 1000));
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = await signAdminToken();
    const cookieStore = await cookies();

    cookieStore.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  return NextResponse.json({ success: true });
}
