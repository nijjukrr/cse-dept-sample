import * as React from "react";
import { cn } from "@/lib/utils";

function Avatar({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100 items-center justify-center font-semibold text-slate-700 select-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function AvatarImage({ src, alt = "Avatar", className, ...props }) {
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({ children, className, ...props }) {
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center bg-ssiet-green-50 text-ssiet-green-800 font-bold text-xs uppercase", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
