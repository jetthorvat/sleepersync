"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { IMPORT_FORMAT } from "@/lib/rankings/import-format";
import { cn } from "@/lib/utils";

interface ImportFormatHelpProps {
  compact?: boolean;
  className?: string;
}

export function ImportFormatHelp({ compact = false, className }: ImportFormatHelpProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={panelRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "rounded-full text-muted-foreground transition-colors hover:text-foreground",
          compact ? "p-0.5" : "p-1",
        )}
        aria-label="Import format help"
        aria-expanded={open}
      >
        <CircleHelp className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-72 rounded-md border border-border bg-background p-3 text-left shadow-lg",
            compact ? "right-0" : "left-1/2 -translate-x-1/2",
          )}
        >
          <p className="text-xs font-semibold">{IMPORT_FORMAT.title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{IMPORT_FORMAT.summary}</p>

          <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Required columns
          </p>
          <ul className="mt-1 space-y-1 text-[11px]">
            {IMPORT_FORMAT.required.map((item) => (
              <li key={item.column}>
                <span className="font-medium">{item.column}</span>
                <span className="text-muted-foreground"> — also: {item.aliases}</span>
              </li>
            ))}
          </ul>

          <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Optional columns
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {IMPORT_FORMAT.optional.map((item) => item.column).join(", ")}
          </p>

          <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Example
          </p>
          <pre className="mt-1 overflow-x-auto rounded bg-muted/50 p-2 font-mono text-[10px] leading-relaxed">
            {IMPORT_FORMAT.exampleHeaders}
            {"\n"}
            {IMPORT_FORMAT.exampleRow}
          </pre>
        </div>
      )}
    </div>
  );
}
