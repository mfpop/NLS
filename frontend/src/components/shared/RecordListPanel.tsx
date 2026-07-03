import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Database } from "lucide-react";

export interface RecordListPanelProps<T> {
  title: string;
  records: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  getId: (record: T) => string;
  renderRecord: (record: T, selected: boolean) => React.ReactNode;
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
  footerRight?: React.ReactNode;
  selectedBorderClass?: string;
  selectedBgClass?: string;
  /** Estimated row height in px for auto page sizing */
  rowHeight?: number;
  /** Enable auto page size calculation based on container height */
  autoPageSize?: boolean;
}

function PaginationFooter({ page, pageCount, total, pageSize = 50, onPageChange }: {
  page: number; pageCount: number; total: number; pageSize?: number; onPageChange: (p: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const items: (number | "ellipsis")[] = [1];
    if (page > 4) items.push("ellipsis");
    for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) items.push(i);
    if (page < pageCount - 3) items.push("ellipsis");
    items.push(pageCount);
    return items;
  }, [page, pageCount]);

  return (
    <div className="flex items-center justify-between h-10 px-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
      <span className="font-medium tabular-nums">{start}–{end} of {total}</span>
      {pageCount > 1 && (
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => onPageChange(1)} disabled={page <= 1}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30 transition-colors">
            <ChevronsLeft className="h-3.5 w-3.5 stroke-current" />
          </button>
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5 stroke-current" />
          </button>
          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <span key={`e${i}`} className="inline-flex h-6 w-4 items-center justify-center text-[10px] text-slate-500">…</span>
            ) : (
              <button key={p} type="button" onClick={() => onPageChange(p)}
                className={`inline-flex h-6 min-w-[22px] items-center justify-center rounded px-1 text-xs font-medium transition-colors ${
                  p === page ? "bg-blue-500 text-white" : "text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                }`}>
                {p}
              </button>
            )
          )}
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30 transition-colors">
            <ChevronRight className="h-3.5 w-3.5 stroke-current" />
          </button>
          <button type="button" onClick={() => onPageChange(pageCount)} disabled={page >= pageCount}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30 transition-colors">
            <ChevronsRight className="h-3.5 w-3.5 stroke-current" />
          </button>
        </div>
      )}
    </div>
  );
}

export function RecordListPanel<T>({
  title,
  records,
  selectedId,
  onSelect,
  getId,
  renderRecord,
  pageSize: propPageSize = 50,
  emptyMessage = "No records found",
  className = "",
  footerRight,
  selectedBorderClass = "border-l-blue-600",
  selectedBgClass = "bg-blue-600/10",
  rowHeight = 56,
  autoPageSize = false,
}: RecordListPanelProps<T>) {
  const [page, setPage] = useState(1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);

  const pageSize = autoPageSize && bodyHeight !== null
    ? Math.max(1, Math.floor(bodyHeight / rowHeight))
    : propPageSize;

  // ResizeObserver for auto page sizing
  useEffect(() => {
    if (!autoPageSize || !bodyRef.current) return;
    const el = bodyRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setBodyHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    // Initial measurement
    setBodyHeight(el.clientHeight);
    return () => observer.disconnect();
  }, [autoPageSize]);

  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginated = records.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [records.length]);

  return (
    <section className={`flex h-full min-h-0 flex-col overflow-hidden border-r border-slate-300 bg-slate-50 ${className}`}>
      {/* Title row */}
      <div className="h-9 shrink-0 border-b border-slate-200 bg-slate-50 px-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
        <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500 tabular-nums">
          {records.length}
        </span>
      </div>
      {/* Body */}
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-hidden bg-slate-50 px-2">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-xs text-slate-500">
            <div className="mb-2 rounded-full bg-slate-100 p-2.5">
              <Database className="h-4 w-4 text-slate-400" />
            </div>
            <span className="text-sm font-medium text-slate-600">{emptyMessage}</span>
          </div>
        ) : (
          <ul>
            {paginated.map((record) => {
              const id = getId(record);
              const selected = id === selectedId;
              return (
                <li key={id} className="group">
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    className={`flex w-full items-center text-left border-l-2 px-3 py-2 border-b border-slate-100 transition-all min-h-[52px] ${
                      selected
                        ? `${selectedBgClass} ${selectedBorderClass}`
                        : "border-l-transparent hover:bg-slate-100 hover:border-l-slate-300"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      {renderRecord(record, selected)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {footerRight}
      <PaginationFooter page={safePage} pageCount={pageCount} total={records.length} pageSize={pageSize} onPageChange={setPage} />
    </section>
  );
}
