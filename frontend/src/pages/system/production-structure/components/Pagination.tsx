import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, perPage, onChange }: PaginationProps) {
  if (total <= perPage) return null;

  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  const btnClass = "inline-flex items-center justify-center h-7 min-w-[28px] rounded-md text-xs font-medium transition-colors";
  const activeClass = "bg-slate-800 text-white";
  const inactiveClass = "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800";

  return (
    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
      <span>{start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={`${btnClass} ${inactiveClass} disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronLeft className="h-3.5 w-3.5 stroke-current" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className={`${btnClass} cursor-default text-slate-300`}>…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`${btnClass} ${p === page ? activeClass : inactiveClass}`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className={`${btnClass} ${inactiveClass} disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronRight className="h-3.5 w-3.5 stroke-current" />
        </button>
      </div>
    </div>
  );
}
