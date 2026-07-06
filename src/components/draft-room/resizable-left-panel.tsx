"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 320;
const MAX_WIDTH = 620;
const DEFAULT_WIDTH = 420;
const STORAGE_KEY = "sleepersync_panel_width";

interface ResizableLeftPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function ResizableLeftPanel({ children, className }: ResizableLeftPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);
  const liveWidth = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed)) {
        const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed));
        liveWidth.current = clamped;
        setWidth(clamped);
      }
    }
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = liveWidth.current;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !panelRef.current) return;
    const next = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, startWidth.current + (e.clientX - startX.current)),
    );
    liveWidth.current = next;
    panelRef.current.style.width = `${next}px`;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setWidth(liveWidth.current);
    localStorage.setItem(STORAGE_KEY, String(liveWidth.current));
  }, []);

  return (
    <div
      ref={panelRef}
      className={cn("relative flex min-h-0 shrink-0 flex-col border-r border-border", className)}
      style={{ width }}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize player panel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none hover:bg-primary/20 active:bg-primary/30"
      />
    </div>
  );
}

export const PANEL_INSET = "px-3";
