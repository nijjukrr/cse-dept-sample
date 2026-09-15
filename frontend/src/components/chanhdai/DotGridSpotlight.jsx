import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Chánh Đại Inspiration: Dot Grid Spotlight
 * Subtle engineering grid with radial gradient spotlight for technical hero sections.
 */
export function DotGridSpotlight({ className, children }) {
  return (
    <div className={cn("relative overflow-hidden bg-slate-50/50", className)}>
      {/* Background Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.45]"
        style={{
          backgroundImage: `radial-gradient(#2A7D14 0.75px, transparent 0.75px)`,
          backgroundSize: "24px 24px",
        }}
      />
      {/* Soft Radial Spotlight Center */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none rounded-full blur-3xl opacity-20"
        style={{
          background: "radial-gradient(circle, #3A9B22 0%, #F0B400 60%, transparent 80%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
