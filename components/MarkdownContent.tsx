// Shared component (no "use client"): renders on the server for the post page
// (zero markdown-parser JS shipped there) and is bundled client-side only where
// it's imported by a client component (e.g. the editor preview).
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Image from "next/image";

interface Props {
  content: string;
}

function getMediaType(src: string): "video" | "pdf" | "image" {
  const lower = src.toLowerCase();
  if (lower.match(/\.(mp4|webm|ogg|mov)(\?|$)/)) return "video";
  if (lower.match(/\.pdf(\?|$)/)) return "pdf";
  return "image";
}

// Helper to detect PDF href
function isPdfHref(href?: string): boolean {
  if (!href) return false;
  return (
    href.toLowerCase().includes("/raw/upload/") ||
    !!href.match(/\.pdf(\?|$)/i)
  );
}

export default function MarkdownContent({ content }: Props) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          table({ children }) {
            return (
              <div className="table-wrap">
                <table>{children}</table>
              </div>
            );
          },

          img({ src, alt }) {
            if (!src || typeof src !== "string") return null;
            const mediaType = getMediaType(src);

            if (mediaType === "video") {
              return (
                <video src={src} controls className="media-video" title={alt}>
                  Your browser does not support video playback.
                </video>
              );
            }

            if (mediaType === "pdf") {
              return (
                <span style={{ display: "block" }}>
                  <iframe src={src} title={alt || "PDF document"} className="media-pdf" />
                  <a href={src} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ marginTop: "0.5rem", fontSize: "0.8125rem" }}>
                    ↗ Open PDF in new tab
                  </a>
                </span>
              );
            }

            if (src.includes("res.cloudinary.com")) {
              return (
                <span style={{ display: "block", position: "relative", margin: "1.5rem 0" }}>
                  <Image
                    src={src}
                    alt={alt || ""}
                    width={800}
                    height={500}
                    style={{ width: "100%", height: "auto", borderRadius: "8px" }}
                  />
                  {alt && (
                    <span
                      style={{
                        display: "block",
                        textAlign: "center",
                        fontSize: "0.8125rem",
                        color: "var(--fg-subtle)",
                        marginTop: "0.5rem",
                        fontStyle: "italic",
                      }}
                    >
                      {alt}
                    </span>
                  )}
                </span>
              );
            }

            // eslint-disable-next-line @next/next/no-img-element
            return (
              <img
                src={src}
                alt={alt || ""}
                style={{
                  maxWidth: "100%",
                  borderRadius: "8px",
                  display: "block",
                  margin: "1.5rem auto",
                }}
              />
            );
          },

          a({ href, children }) {
            if (!href || typeof href !== "string") return <a href={undefined}>{children}</a>; 

            // Cloudinary raw uploads (PDFs) — detect by /raw/upload/ in URL or .pdf extension
            const isPdf =
              href.toLowerCase().includes("/raw/upload/") ||
              href.match(/\.pdf(\?|$)/i);

            if (isPdf) {
              return (
                <span style={{ display: "block" }}>
                  <iframe src={href} title={String(children)} className="media-pdf" />
                  <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ marginTop: "0.5rem", fontSize: "0.8125rem", display: "inline-flex" }}>
                    ↗ Open PDF in new tab
                  </a>
                </span>
              );
            }

            const isExternal = href.startsWith("http");
            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
