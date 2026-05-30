import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ConsoleBandProps {
  label: string;
  state?: "amber" | "green" | "red";
  className?: string;
  actions?: ReactNode;
}

export function ConsoleBand({ label, className, actions }: ConsoleBandProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 sm:px-5 pt-2.5 pb-2 border-b border-foreground/15",
        className
      )}
      role="presentation"
    >
      <span className="folio">{label}</span>
      <span className="flex-1 h-px bg-foreground/15" aria-hidden />
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
