"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { Button } from "@/components/ui/button";
import { PrimaryNavLinks } from "./PrimaryNavLinks";
import { ThemeToggle } from "./ThemeToggle";
import type { ReactNode } from "react";

const RXINFER_DOCS = "https://docs.rxinfer.com";
const RXINFER_REPO = "https://github.com/ReactiveBayes/RxInfer.jl";

export function TopBar({ children, leading }: { children?: ReactNode; leading?: ReactNode }) {
  return (
    <header className="flex items-center gap-2 border-b px-2 py-2 sm:gap-3 sm:px-4">
      {leading}
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold sm:text-base">
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
        <span className="hidden sm:inline">RxInfer Benchmarks</span>
        <span className="sm:hidden">Benchmarks</span>
      </Link>
      <nav className="ml-2 hidden items-center gap-1 text-sm sm:flex">
        <PrimaryNavLinks />
      </nav>
      <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
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
