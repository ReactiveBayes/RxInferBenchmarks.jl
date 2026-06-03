"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The site's two primary navigation links (How it works / Adding a model).
 * Shared between the desktop TopBar nav and the mobile drawer so the links
 * stay reachable on every viewport. `onNavigate` lets a containing drawer
 * close itself when a link is followed.
 */
export function PrimaryNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="justify-start sm:justify-center">
        <Link href="/docs/how-it-works/" onClick={onNavigate}>
          How it works
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="justify-start sm:justify-center">
        <Link href="/docs/adding-a-model/" onClick={onNavigate}>
          Adding a model
        </Link>
      </Button>
    </>
  );
}
