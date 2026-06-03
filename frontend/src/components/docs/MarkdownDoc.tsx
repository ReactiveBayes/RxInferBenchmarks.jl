import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { resolveDocLink } from "@/lib/designDocs";

/** Render a design document's markdown with repo-relative links mapped to reference routes. */
export function MarkdownDoc({ markdown }: { markdown: string }) {
  return (
    <article className="space-y-4 text-sm leading-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-semibold tracking-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 border-b pb-1 text-xl font-semibold tracking-tight">{children}</h2>
          ),
          h3: ({ children }) => <h3 className="mt-5 text-base font-semibold">{children}</h3>,
          a: ({ href, children }) => {
            const resolved = resolveDocLink(href ?? "");
            if (/^(https?:)?\/\//.test(resolved)) {
              return (
                <a
                  href={resolved}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {children}
                </a>
              );
            }
            return (
              <Link href={resolved} className="text-primary underline-offset-4 hover:underline">
                {children}
              </Link>
            );
          },
          code: ({ children, className }) =>
            className ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
            ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-xs leading-5">
              {children}
            </pre>
          ),
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/40 bg-muted/40 px-4 py-2 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border bg-muted/50 px-2 py-1 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border px-2 py-1 align-top">{children}</td>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
