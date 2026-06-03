"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface DocsNavItem {
  href: string;
  title: string;
}

/** Left-hand legend for the "How it works" reference section. */
export function DocsSideNav({ items }: { items: DocsNavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname.replace(/\/$/, "") === href.replace(/\/$/, "");
  return (
    <nav aria-label="Benchmark reference" className="lg:w-52 lg:shrink-0">
      <h2 className="hidden px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:block">
        Benchmark reference
      </h2>
      {/* Horizontally scrollable chip row on mobile; vertical rail on lg+. */}
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => (
          <li key={item.href} className="shrink-0 lg:shrink">
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "block whitespace-nowrap rounded-md border px-2 py-1.5 text-sm hover:bg-accent lg:border-transparent",
                isActive(item.href) && "bg-accent font-medium",
              )}
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
