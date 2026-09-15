import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  default: "bg-ssiet-green text-white hover:bg-ssiet-green-dark shadow-sm active:scale-[0.98]",
  secondary: "bg-ssiet-green-50 text-ssiet-green-800 hover:bg-ssiet-green-100 border border-ssiet-green-200",
  gold: "bg-ssiet-gold text-slate-900 font-semibold hover:bg-ssiet-gold-dark hover:text-white shadow-sm",
  outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm",
  ghost: "hover:bg-slate-100 text-slate-700",
  destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
  link: "text-ssiet-green underline-offset-4 hover:underline p-0 h-auto",
};

const buttonSizes = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-11 rounded-md px-8 text-base",
  icon: "h-9 w-9 p-0 flex items-center justify-center",
};

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ssiet-green disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant] || buttonVariants.default,
          buttonSizes[size] || buttonSizes.default,
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
