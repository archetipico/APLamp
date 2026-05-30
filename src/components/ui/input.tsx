import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 sm:h-9 w-full bg-background border border-foreground/30 px-2.5 py-1 text-base sm:text-sm font-mono",
        "placeholder:text-muted-foreground/70 placeholder:not-italic placeholder:font-mono",
        "focus-visible:outline-none focus-visible:border-foreground",
        "transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
