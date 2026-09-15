import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-ssiet-green text-white hover:bg-ssiet-green-dark border-transparent",
  secondary: "bg-ssiet-green-50 text-ssiet-green-800 border-ssiet-green-200",
  gold: "bg-ssiet-gold-50 text-ssiet-gold-700 border-ssiet-gold-300 font-semibold",
  outline: "text-slate-600 border-slate-200 bg-slate-50",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  fresh: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium",
  stale: "bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium",
  // Verification Trust Statuses
  linked: "bg-amber-50 text-amber-900 border-amber-300 font-semibold",
  verified: "bg-emerald-100 text-emerald-900 border-emerald-400 font-bold",
  verification_failed: "bg-rose-100 text-rose-900 border-rose-300 font-semibold",
  sync_failed: "bg-orange-100 text-orange-900 border-orange-300 font-semibold",
  pending: "bg-indigo-50 text-indigo-900 border-indigo-200 font-semibold",
};

function Badge({ className, variant = "default", ...props }) {
  const variantClass = badgeVariants[variant] || badgeVariants.default;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none",
        variantClass,
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
