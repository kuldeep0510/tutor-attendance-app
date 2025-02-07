"use client";

import { cn } from "@/lib/utils";

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("w-full border-t py-4 px-4", className)}>
      <div className="container flex items-center justify-center text-sm text-muted-foreground">
        Made with <span className="text-red-500 px-1">♥</span> by Kuldeep Kumar
      </div>
    </footer>
  );
}
