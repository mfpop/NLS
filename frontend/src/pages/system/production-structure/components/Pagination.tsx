import { ChevronLeft, ChevronRight } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";

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

  const btnClass = "inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-medium transition-colors";
  const activeClass = `${theme.tabActive}`;
  const inactiveClass = `${theme.textSecondary} ${theme.interactiveRow}`;

  return (
    <div className={`flex w-full items-center justify-between text-[11px] ${theme.textSecondary}`}>
      <span className="shrink-0 font-medium">{start}–{end} of {total}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={`${btnClass} ${inactiveClass} disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronLeft className="h-3 w-3 stroke-current" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className={`${btnClass} cursor-default ${theme.textMuted}`}>…</span>
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
          <ChevronRight className="h-3 w-3 stroke-current" />
        </button>
      </div>
    </div>
  );
}
