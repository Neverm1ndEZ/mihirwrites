import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine resource type
    const mime = file.type;
    let resourceType: "image" | "video" | "raw" = "raw";
    if (mime.startsWith("image/")) resourceType = "image";
    else if (mime.startsWith("video/")) resourceType = "video";
    // PDFs and other files use "raw"

    const result = await uploadToCloudinary(buffer, file.name, resourceType);

    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
      resourceType: result.resourceType,
      filename: file.name,
      mimeType: mime,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
