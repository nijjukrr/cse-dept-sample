import * as React from "react";
import { cn } from "@/lib/utils";

const alertVariants = {
  default: "bg-slate-50 text-slate-900 border-slate-200",
  destructive: "border-rose-200 bg-rose-50 text-rose-800 [&>svg]:text-rose-600",
  warning: "border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-600",
  info: "border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 [&>svg]:text-emerald-600",
};

function Alert({ className, variant = "default", ...props }) {
  const variantClass = alertVariants[variant] || alertVariants.default;
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-3 text-xs [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-3.5 [&>svg]:h-4 [&>svg]:w-4",
        variantClass,
        className
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }) {
  return (
    <h5
      className={cn("mb-1 font-bold leading-none tracking-tight text-xs", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      className={cn("text-[11px] leading-relaxed opacity-90", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
