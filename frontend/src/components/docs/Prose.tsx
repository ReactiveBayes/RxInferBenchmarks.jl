import type { ReactNode } from "react";

/** Lightweight typographic helpers for the docs pages (no typography plugin). */

export function DocTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-3xl font-semibold tracking-tight">{children}</h1>;
}

export function DocLead({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-base text-muted-foreground">{children}</p>;
}

export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-foreground/90">{children}</div>
    </section>
  );
}

export function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <figure className="mt-2">
      {label && <figcaption className="mb-1 text-xs text-muted-foreground">{label}</figcaption>}
      <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-xs leading-5">
        <code>{children}</code>
      </pre>
    </figure>
  );
}
