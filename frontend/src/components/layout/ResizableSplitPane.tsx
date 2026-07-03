import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface ResizableSplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftPercent?: number;
  minLeftPixels?: number;
  maxLeftPercent?: number;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
  /** Storage key for persisting width across page loads (localStorage). If omitted, width resets on each load. */
  storageKey?: string;
}

export function ResizableSplitPane({
  left,
  right,
  defaultLeftPercent = 20,
  minLeftPixels = 200,
  maxLeftPercent = 50,
  className,
  leftClassName,
  rightClassName,
  storageKey,
}: ResizableSplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [leftWidth, setLeftWidth] = useState<number | null>(null);

  // Keep config values in refs so the ResizeObserver effect doesn't need them as deps
  const minLeftPixelsRef = useRef(minLeftPixels);
  minLeftPixelsRef.current = minLeftPixels;
  const maxLeftPercentRef = useRef(maxLeftPercent);
  maxLeftPercentRef.current = maxLeftPercent;

  // Initialize width: first from localStorage, then from container percentage
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initial: number | null = null;

    // Try restoring from localStorage
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = Number(saved);
          if (!isNaN(parsed) && parsed >= minLeftPixels) {
            initial = parsed;
          }
        }
      } catch { /* ignore */ }
    }

    // Fall back to percentage of container
    if (initial === null) {
      initial = Math.round(container.offsetWidth * defaultLeftPercent / 100);
    }

    setLeftWidth(initial);
  }, [defaultLeftPercent, minLeftPixels, storageKey]);

  // Persist width to localStorage when it changes (debounced)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!storageKey || leftWidth === null) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, String(leftWidth)); } catch { /* ignore */ }
    }, 300);
    return () => { if (persistTimerRef.current) clearTimeout(persistTimerRef.current); };
  }, [leftWidth, storageKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const maxWidth = rect.width * maxLeftPercent / 100;
      setLeftWidth((prev) => {
        const next = Math.max(minLeftPixels, Math.min(maxWidth, newWidth));
        // Snap closure check: avoid unnecessary re-renders
        return Math.abs(next - (prev ?? 0)) < 2 ? prev : next;
      });
    },
    [minLeftPixels, maxLeftPercent],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle resize observer to clamp width when container size changes.
  // leftWidth is intentionally omitted from deps — the callback uses functional
  // setState and reads config from refs, so the observer only needs to be
  // (re-)created when the container element mounts or the components mounts.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect;
        const maxWidth = rect.width * maxLeftPercentRef.current / 100;
        setLeftWidth((current) => {
          if (current === null) return current;
          return Math.max(minLeftPixelsRef.current, Math.min(maxWidth, current));
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full min-h-0 overflow-hidden",
        isDragging && "cursor-col-resize",
        className,
      )}
    >
      {/* Left panel */}
      <div
        className={cn("shrink-0 overflow-hidden", leftClassName)}
        style={{ width: leftWidth ?? `${defaultLeftPercent}%` }}
      >
        {left}
      </div>

      {/* Draggable divider */}
      <div
        className={cn(
          "shrink-0 flex items-center justify-center relative z-10",
          "w-[5px] cursor-col-resize",
          "bg-slate-200 hover:bg-blue-400 active:bg-blue-500",
          "transition-colors duration-100",
          isDragging && "bg-blue-500",
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="h-8 w-[2px] rounded-full bg-slate-400" />
      </div>

      {/* Right panel */}
      <div className={cn("flex-1 min-w-0 overflow-hidden", rightClassName)}>
        {right}
      </div>
    </div>
  );
}
