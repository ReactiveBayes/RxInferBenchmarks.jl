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
    <nav aria-label="Benchmark reference" className="w-52 shrink-0">
      <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Benchmark reference
      </h2>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "block rounded-md px-2 py-1.5 text-sm hover:bg-accent",
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
