import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  filename: string,
  resourceType: "image" | "video" | "raw" = "image"
): Promise<{ url: string; publicId: string; resourceType: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "journal",
        resource_type: resourceType,
        // For raw files (PDFs etc), keep the extension in public_id so the URL is usable
      public_id: resourceType === "raw"
        ? `${Date.now()}-${filename}`
        : `${Date.now()}-${filename.replace(/\.[^/.]+$/, "")}`,
        transformation:
          resourceType === "image" ? [{ quality: "auto", fetch_format: "auto" }] : undefined,
      },
      (error, result) => {
        if (error || !result) reject(error || new Error("Upload failed"));
        else
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
          });
      }
    );
    uploadStream.end(fileBuffer);
  });
}

export { cloudinary };
