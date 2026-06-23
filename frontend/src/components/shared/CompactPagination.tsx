import { useMemo } from "react";

interface CompactPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function CompactPagination({ currentPage, totalItems, pageSize, onPageChange }: CompactPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, pageCount);

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;
    if (pageCount <= maxVisible + 2) {
      for (let i = 1; i <= pageCount; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, safePage - 1);
      const end = Math.min(pageCount - 1, safePage + 1);
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < pageCount - 1) pages.push("...");
      pages.push(pageCount);
    }
    return pages;
  }, [pageCount, safePage]);

  if (totalItems === 0) {
    return <span className="font-medium whitespace-nowrap text-xs text-slate-600">0 items</span>;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className="font-medium whitespace-nowrap">
        {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalItems)} of {totalItems}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(1)}
            className="inline-flex items-center justify-center h-7 min-w-7 rounded-[2px] text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="First page"
          >
            {"\u00AB"}
          </button>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            className="inline-flex items-center justify-center h-7 min-w-7 rounded-[2px] text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Previous page"
          >
            {"\u2039"}
          </button>
          <div className="flex items-center gap-0.5 mx-1">
            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="inline-flex items-center justify-center w-5 h-7 text-[10px] text-slate-400 select-none"
                >
                  {"\u2026"}
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`inline-flex items-center justify-center h-7 min-w-7 rounded-[2px] px-1 text-xs font-semibold transition-all ${
                    p === safePage
                      ? "bg-amber-50 border border-amber-300 text-amber-800"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <button
            type="button"
            disabled={safePage >= pageCount}
            onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
            className="inline-flex items-center justify-center h-7 min-w-7 rounded-[2px] text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Next page"
          >
            {"\u203A"}
          </button>
          <button
            type="button"
            disabled={safePage >= pageCount}
            onClick={() => onPageChange(pageCount)}
            className="inline-flex items-center justify-center h-7 min-w-7 rounded-[2px] text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Last page"
          >
            {"\u00BB"}
          </button>
        </div>
      )}
    </div>
  );
}
