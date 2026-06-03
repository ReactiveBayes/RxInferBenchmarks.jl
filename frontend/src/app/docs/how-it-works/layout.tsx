import type { ReactNode } from "react";
import { DocsSideNav } from "@/components/docs/DocsSideNav";
import { DESIGN_DOCS } from "@/lib/designDocs";

export default function HowItWorksLayout({ children }: { children: ReactNode }) {
  const items = [
    { href: "/docs/how-it-works/", title: "Overview" },
    ...DESIGN_DOCS.map((doc) => ({ href: `/docs/how-it-works/${doc.slug}/`, title: doc.title })),
  ];
  return (
    <div className="flex gap-8">
      <DocsSideNav items={items} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
