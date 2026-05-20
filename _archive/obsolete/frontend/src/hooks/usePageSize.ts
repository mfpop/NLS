import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Dynamically calculates how many cards fit in a container without scrolling.
 *
 * - `containerRef` — attach to the scrollable content wrapper
 * - `cardRef`      — attach to the FIRST rendered card element
 *
 * The hook measures the actual rendered card height (including border/padding)
 * and divides the available container height by it, subtracting `reservedPx`
 * for the pagination bar and bottom padding.
 *
 * @param reservedPx  Extra px to subtract (pagination bar + vertical padding)
 * @param gapPx       Gap between cards in px (must match CSS gap)
 * @param minItems    Minimum items shown regardless of space
 */
export function usePageSize(
  reservedPx = 56,
  gapPx = 8,
  minItems = 1
): {
  containerRef: React.RefObject<HTMLDivElement>;
  cardRef: React.RefObject<HTMLDivElement>;
  perPage: number;
} {
  const containerRef = useRef<HTMLDivElement>(null!);
  const cardRef = useRef<HTMLDivElement>(null!);
  const [perPage, setPerPage] = useState(5);

  const recalc = useCallback(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    if (!container) return;

    // Use measured card height; fall back to 80px estimate if card not yet mounted
    const cardH = card ? card.getBoundingClientRect().height + gapPx : 80 + gapPx;
    const available = container.clientHeight - reservedPx;
    const count = Math.max(minItems, Math.floor(available / cardH));
    setPerPage(count);
  }, [reservedPx, gapPx, minItems]);

  useEffect(() => {
    recalc();
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    if (cardRef.current) ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [recalc]);

  return { containerRef, cardRef, perPage };
}

