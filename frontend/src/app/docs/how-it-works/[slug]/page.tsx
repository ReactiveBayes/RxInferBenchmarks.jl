import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MarkdownDoc } from "@/components/docs/MarkdownDoc";
import { DESIGN_DOCS, findDesignDoc, readDesignDoc } from "@/lib/designDocs";

// The design documents are known at build time — every page is prerendered
// into the static export.
export function generateStaticParams() {
  return DESIGN_DOCS.map((doc) => ({ slug: doc.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const doc = findDesignDoc((await params).slug);
  return { title: `${doc?.title ?? "Reference"} — RxInfer Benchmarks` };
}

export default async function DesignDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const doc = findDesignDoc((await params).slug);
  if (!doc) notFound();
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Rendered from <code className="font-mono">{doc.file}</code> — a living document in the
        repository.
      </p>
      <MarkdownDoc markdown={readDesignDoc(doc)} />
    </div>
  );
}
