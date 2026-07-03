import { useState, useMemo } from "react";
import { Search, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { LinePerformanceRecord } from "@/types/linePerformance";
import { LinePerformanceEmptyState } from "./LinePerformanceEmptyState";

interface RecordListProps {
  records: LinePerformanceRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

function OeeBadge({ status }: { status: string }) {
  if (status === "good" || status === "on_target") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
        <CheckCircle2 className="h-3 w-3" />
        On Plan
      </span>
    );
  }
  if (status === "warning" || status === "needs_attention") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
        <AlertTriangle className="h-3 w-3" />
        Warning
      </span>
    );
  }
  if (status === "critical") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
        <XCircle className="h-3 w-3" />
        Critical
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

export function LinePerformanceRecordList({ records, selectedId, onSelect, loading }: RecordListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.shiftName.toLowerCase().includes(q) ||
        r.date.toLowerCase().includes(q)
    );
  }, [records, search]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return <LinePerformanceEmptyState />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative border-b border-border/20">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search records..."
          className="h-8 w-full border-0 bg-transparent px-3 pr-8 text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((record) => (
          <button
            key={record.id}
            type="button"
            onClick={() => onSelect(record.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-slate-100 transition-colors border-l-2 ${
              selectedId === record.id ? "bg-blue-50/30 border-l-blue-600" : "border-l-transparent hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-foreground truncate">{record.shiftName}</span>
              <OeeBadge status={record.oeeStatus} />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
              <span>{record.date}</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{record.startTime} – {record.endTime}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-foreground font-medium">{record.actualQuantity} / {record.plannedQuantity}</span>
              <span className={record.gap >= 0 ? "text-success" : "text-danger"}>
                {record.gap >= 0 ? `+${record.gap}` : record.gap}
              </span>
              <span className="text-muted-foreground">{record.downtimeMinutes}m</span>
              {record.qualityIssueCount > 0 && (
                <span className="text-warning">{record.qualityIssueCount} quality</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
