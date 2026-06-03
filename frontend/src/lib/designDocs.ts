// Registry of the repository's living design documents, rendered as the
// "How it works" reference section. Server-only: reads the markdown from the
// repo at BUILD time (static export — the list is known up front).
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface DesignDoc {
  slug: string;
  title: string;
  /** Path relative to the repository root. */
  file: string;
}

/** Order defines the sidebar order. */
export const DESIGN_DOCS: DesignDoc[] = [
  { slug: "idea", title: "The Idea", file: "IDEA.md" },
  { slug: "architecture", title: "Architecture", file: "design/architecture.md" },
  { slug: "benchmarks", title: "Benchmarks", file: "design/benchmarks.md" },
  { slug: "data", title: "Data", file: "design/data.md" },
  { slug: "frontend", title: "Frontend", file: "design/frontend.md" },
  { slug: "testing", title: "Testing", file: "design/testing.md" },
];

export function findDesignDoc(slug: string): DesignDoc | undefined {
  return DESIGN_DOCS.find((doc) => doc.slug === slug);
}

const REPO_ROOT = join(process.cwd(), "..");

/** Read a design document's markdown source (build time only). */
export function readDesignDoc(doc: DesignDoc): string {
  return readFileSync(join(REPO_ROOT, doc.file), "utf-8");
}

/**
 * Rewrite repo-relative markdown links into reference routes:
 * `architecture.md` / `design/data.md` / `../IDEA.md` → `/docs/how-it-works/<slug>/`.
 * External and anchor links pass through.
 */
export function resolveDocLink(href: string): string {
  if (/^(https?:)?\/\//.test(href) || href.startsWith("#") || href.startsWith("/")) return href;
  const file = href.replace(/^(\.\.\/|\.\/)+/, "").replace(/^design\//, "");
  const match = DESIGN_DOCS.find(
    (doc) => doc.file === file || doc.file === `design/${file}` || doc.file.endsWith(`/${file}`),
  );
  if (match) return `/docs/how-it-works/${match.slug}/`;
  if (file === "README.md" || file === "design/") return "/docs/how-it-works/";
  return href;
}
