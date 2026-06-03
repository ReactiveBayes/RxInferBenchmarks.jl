"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PrimaryNavLinks } from "./PrimaryNavLinks";

/**
 * Mobile navigation drawer. A hamburger button (hidden on `lg+`, where the
 * persistent sidebars take over) opens a left-side sheet that always exposes
 * the primary nav links, plus any page-specific navigation passed as a render
 * prop — which receives a `close` callback so selecting an item dismisses the
 * drawer.
 */
export function MobileNav({
  children,
  className,
}: {
  children?: (close: () => void) => ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          className={className ?? "lg:hidden"}
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[17rem] gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation and benchmark selection
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Primary" className="flex flex-col gap-0.5 border-b p-2">
          <PrimaryNavLinks onNavigate={close} />
        </nav>
        {children && <div className="min-h-0 flex-1 overflow-y-auto">{children(close)}</div>}
      </SheetContent>
    </Sheet>
  );
}
