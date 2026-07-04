import {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from "lucide-react";

type PaginationConfig = {
  start?: number;
  end?: number;
  total: number;
  page: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
};

type RecordListPanelProps<T> = {
  title: string;
  count?: number;

  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchSlot?: ReactNode;

  items?: T[];
  renderItem?: (item: T, index: number) => ReactNode;
  children?: ReactNode;

  emptyState?: ReactNode;

  pagination?: PaginationConfig;
  autoPageSize?: boolean;
  rowHeight?: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;

  footer?: ReactNode;
  legend?: ReactNode;

  className?: string;
  bodyClassName?: string;
};

type RecordListItemProps = {
  active?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  titleText?: string;
  className?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function RecordListItem({
  active = false,
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onClick,
  titleText,
  className,
}: RecordListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titleText}
      className={cn(
        "group flex min-h-[52px] w-full items-center gap-2 border-b border-border/50 px-3 py-2 text-left",
        "hover:bg-background focus:outline-none",
        active
          ? "border-l-2 border-l-blue-600 bg-primary/10/30"
          : "border-l-2 border-l-transparent",
        className
      )}
    >
      {leading ? (
        <div className="flex shrink-0 items-center justify-center">{leading}</div>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {title}
        </div>

        {subtitle ? (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        ) : null}

        {meta ? <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div> : null}
      </div>

      {trailing ? (
        <div className="shrink-0 text-xs text-muted-foreground">{trailing}</div>
      ) : null}
    </button>
  );
}

export function RecordListFooter({
  pagination,
  footer,
}: {
  pagination?: PaginationConfig;
  footer?: ReactNode;
}) {
  if (footer) return <>{footer}</>;

  if (!pagination) return null;

  const total = pagination.total;
  const totalPages =
    pagination.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, pagination.end ?? 1)));

  const page = Math.min(Math.max(1, pagination.page), totalPages);

  const start =
    pagination.start ??
    (total === 0 ? 0 : Math.min(total, (page - 1) * Math.max(1, pagination.end ?? total) + 1));

  const end = pagination.end ?? total;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const go = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    pagination.onPageChange(nextPage);
  };

  return (
    <div className="flex h-full w-full items-center justify-between">
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {start}–{end} of {total}
      </span>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => go(1)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="First page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            disabled={!canPrev}
            onClick={() => go(page - 1)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {Array.from({ length: totalPages })
            .slice(0, 5)
            .map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => go(pageNumber)}
                  className={cn(
                    "inline-flex h-7 min-w-7 items-center justify-center rounded-[2px] px-2 text-xs",
                    pageNumber === page
                      ? "border border-amber-400 bg-warning/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {pageNumber}
                </button>
              );
            })}

          <button
            type="button"
            disabled={!canNext}
            onClick={() => go(page + 1)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            disabled={!canNext}
            onClick={() => go(totalPages)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function RecordListPanel<T>({
  title,
  count,

  searchValue,
  searchPlaceholder = "Search...",
  onSearchChange,
  searchSlot,

  items,
  renderItem,
  children,

  emptyState,

  pagination,
  autoPageSize = false,
  rowHeight = 56,
  pageSize,
  onPageSizeChange,

  footer,
  legend,

  className,
  bodyClassName,
}: RecordListPanelProps<T>) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [computedPageSize, setComputedPageSize] = useState(pageSize ?? 10);
  const onPageSizeChangeRef = useRef(onPageSizeChange);
  onPageSizeChangeRef.current = onPageSizeChange;

  useEffect(() => {
    if (!autoPageSize || !bodyRef.current) return;

    const element = bodyRef.current;

    const update = () => {
      const next = Math.max(1, Math.floor(element.clientHeight / rowHeight));

      setComputedPageSize((current) => {
        if (current === next) return current;
        onPageSizeChangeRef.current?.(next);
        return next;
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [autoPageSize, rowHeight]);

  const effectivePageSize = autoPageSize ? computedPageSize : pageSize;

  /* ── Internal pagination state — used when autoPageSize is true and no explicit pagination prop ── */
  const [internalPage, setInternalPage] = useState(1);
  const needsPagination =
    autoPageSize &&
    !pagination &&
    effectivePageSize != null &&
    items != null &&
    items.length > effectivePageSize;

  // Reset internal page when items list changes (e.g. search/filter changes)
  useEffect(() => {
    setInternalPage(1);
  }, [items?.length]);

  const visibleItems = useMemo(() => {
    if (!items) return undefined;
    if (needsPagination) {
      const totalPages = Math.max(1, Math.ceil(items.length / effectivePageSize));
      const page = Math.min(internalPage, totalPages);
      const startIndex = (page - 1) * effectivePageSize;
      return items.slice(startIndex, startIndex + effectivePageSize);
    }
    if (!effectivePageSize || !pagination) return items;

    const startIndex = Math.max(0, (pagination.page - 1) * effectivePageSize);
    return items.slice(startIndex, startIndex + effectivePageSize);
  }, [items, effectivePageSize, pagination, needsPagination, internalPage]);

  /* ── Computed pagination — always derives from items/count even when pagination prop is absent ── */
  const computedPagination = useMemo<PaginationConfig | undefined>(() => {
    // External pagination prop provided — trust the parent's values.
    // The parent controls the data slicing and page state, so we pass through as-is.
    if (pagination) {
      return pagination;
    }

    // Auto-derive pagination from items + computedPageSize when no explicit pagination prop.
    if (items && items.length > 0) {
      const total = items.length;

      // When autoPageSize is enabled and items exceed the computed page size,
      // paginate internally: slice items and show page controls.
      if (needsPagination) {
        const size = effectivePageSize;
        const totalPages = Math.max(1, Math.ceil(total / size));
        const page = Math.min(internalPage, totalPages);
        const start = (page - 1) * size + 1;
        const end = Math.min(total, page * size);
        return {
          total,
          page,
          start,
          end,
          totalPages,
          onPageChange: setInternalPage,
        };
      }

      // All items fit — show "1–N of N" with no controls
      return {
        total,
        page: 1,
        start: 1,
        end: total,
        totalPages: 1,
        onPageChange: () => {}, // no-op
      };
    }

    return undefined;
  }, [pagination, items, effectivePageSize, computedPageSize, needsPagination, internalPage]);

  const hasRenderedItems = visibleItems && visibleItems.length > 0;
  const hasChildren = Boolean(children);
  const hasSearch = searchSlot !== undefined || searchValue !== undefined || onSearchChange !== undefined;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-r border-border bg-muted",
        className
      )}
    >
      {/* Search bar — only shown when search props are provided */}
      {hasSearch && (
        <div className="flex h-10 shrink-0 items-center border-b border-border bg-muted px-2">
          {searchSlot ?? (
            <div className="relative w-full">
              <input
                value={searchValue ?? ""}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-[2px] border border-border bg-background px-2 pr-8 text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary"
              />
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Title row */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-muted px-3">
        <div className="truncate text-sm font-semibold text-foreground">{title}</div>

        {typeof count === "number" ? (
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {count}
          </span>
        ) : null}
      </div>

      {/* Scrollable body */}
      <div
        ref={bodyRef}
        className={cn(
          "min-h-0 flex-1 overflow-hidden bg-muted px-2",
          !autoPageSize && "overflow-y-auto",
          bodyClassName
        )}
      >
        {hasChildren ? children : null}

        {!hasChildren && hasRenderedItems && renderItem
          ? visibleItems.map((item, index) => renderItem(item, index))
          : null}

        {!hasChildren && !hasRenderedItems ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            {emptyState ?? "No records found."}
          </div>
        ) : null}
      </div>

      {/* Legend */}
      {legend ? (
        <div className="shrink-0 border-t border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          {legend}
        </div>
      ) : null}

      {/* Footer — pinned to bottom */}
      <div className="flex h-10 shrink-0 items-center border-t border-border bg-muted px-3 text-xs text-muted-foreground">
        <RecordListFooter pagination={computedPagination} footer={footer} />
      </div>
    </aside>
  );
}
