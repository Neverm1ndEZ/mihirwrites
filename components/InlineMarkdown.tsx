// Shared component (no "use client") — server-rendered on the post page,
// bundled client-side where imported by client components (home cards, editor).
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

/**
 * Renders markdown inline — paragraphs are unwrapped so the result can live
 * inside an existing styled block (e.g. the post excerpt) without nested <p>s.
 * Supports the common inline features: bold, italic, code, links, strikethrough.
 */
export default function InlineMarkdown({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <>{children}</>,
        a: ({ href, children }) => {
          const isExternal = typeof href === "string" && href.startsWith("http");
          return (
            <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
