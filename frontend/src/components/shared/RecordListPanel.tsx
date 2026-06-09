import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RecordListPanelProps<T> {
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
}

export function RecordListPanel<T>({
  title,
  records,
  selectedId,
  onSelect,
  getId,
  renderRecord,
  pageSize = 50,
  emptyMessage = "No records found",
  className = "",
  footerRight,
  selectedBorderClass = "bg-blue-500",
  selectedBgClass = "bg-blue-50/50",
}: RecordListPanelProps<T>) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginated = records.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [records.length]);

  return (
    <section className={`flex min-h-0 min-w-0 flex-col border-r border-border/60 bg-card ${className}`}>
      <div className="border-b border-border/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">{records.length}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {records.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">{emptyMessage}</div>
        ) : (
          <ul>
            {paginated.map((record) => {
              const id = getId(record);
              const selected = id === selectedId;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    className={`flex w-full items-start text-left pl-2 ${selected ? selectedBgClass : "hover:bg-muted/20"}`}
                  >
                    <span className={`w-0.5 self-stretch shrink-0 ${selected ? selectedBorderClass : "bg-transparent"}`} />
                    <span className="min-w-0 flex-1 pl-2 pr-2.5 py-1.5">
                      {renderRecord(record, selected)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-border/30 px-2 py-1.5 text-xs text-muted-foreground">
        <span>{records.length} total</span>
        <div className="flex items-center gap-1">
          {footerRight}
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5 stroke-current" />
              </button>
              <span className="min-w-[4rem] text-center font-medium tabular-nums">{safePage} / {pageCount}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5 stroke-current" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
