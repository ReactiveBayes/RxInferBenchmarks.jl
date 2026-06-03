"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import type { ReactNode } from "react";

const RXINFER_DOCS = "https://docs.rxinfer.com";
const RXINFER_REPO = "https://github.com/ReactiveBayes/RxInfer.jl";

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-2">
      <Link href="/" className="flex items-center gap-2 text-base font-semibold">
        <Image
          src="/smalllogo.svg"
          alt="RxInfer logo"
          width={24}
          height={24}
          className="h-6 w-auto dark:hidden"
        />
        <Image
          src="/smalllogo-dark.svg"
          alt="RxInfer logo"
          width={24}
          height={24}
          className="hidden h-6 w-auto dark:block"
        />
        RxInfer Benchmarks
      </Link>
      <nav className="ml-2 hidden items-center gap-1 text-sm sm:flex">
        <Button asChild variant="ghost" size="sm">
          <Link href="/docs/how-it-works/">How it works</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/docs/adding-a-model/">Adding a model</Link>
        </Button>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <Button asChild variant="ghost" size="icon" aria-label="RxInfer documentation">
          <a href={RXINFER_DOCS} target="_blank" rel="noreferrer">
            <BookOpen />
          </a>
        </Button>
        <Button asChild variant="ghost" size="icon" aria-label="RxInfer on GitHub">
          <a href={RXINFER_REPO} target="_blank" rel="noreferrer">
            <GitHubIcon />
          </a>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
