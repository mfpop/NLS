import { useMemo } from "react";
import { RecordListPanel } from "@/components/shared/RecordListPanel";
import type { LinePerformanceRecord } from "@/types/linePerformance";

interface Props {
  records: LinePerformanceRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  completed: "bg-slate-400",
  upcoming: "bg-sky-400",
  cancelled: "bg-red-400",
};

function fmtGap(gap: number): string {
  if (gap > 0) return `+${gap}`;
  return `${gap}`;
}

export function ShiftRecordList({ records, selectedId, onSelect }: Props) {
  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      // Active shifts first, then by date desc
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime);
    });
  }, [records]);

  return (    <RecordListPanel
      title="Shifts"
      records={sorted}
      selectedId={selectedId}
      onSelect={onSelect}
      getId={(r) => r.id}
      renderRecord={(record, _selected) => (
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_COLORS[record.status] ?? "bg-slate-300"}`} />
              <span className="text-xs font-semibold text-slate-900 truncate">{record.shiftName}</span>
            </div>
            <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold border rounded ${
              record.oeeStatus === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : record.oeeStatus === "warning" ? "border-amber-200 bg-amber-50 text-amber-700"
                  : record.oeeStatus === "critical" ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-slate-100 text-slate-600"
            }`}>
              {record.oeeStatus === "pending" ? "—" : record.oeeStatus === "good" ? "OK" : record.oeeStatus.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span>{record.date}</span>
            <span className="text-slate-300">·</span>
            <span>{record.startTime}–{record.endTime}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="font-medium text-slate-800 tabular-nums">
              {record.actualQuantity}/{record.plannedQuantity}
            </span>
            <span className={record.gap >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
              {fmtGap(record.gap)}
            </span>
            {record.downtimeMinutes > 0 && (
              <span className="text-slate-500 tabular-nums">{record.downtimeMinutes}m</span>
            )}
            {record.qualityIssueCount > 0 && (
              <span className="text-amber-600 font-medium">{record.qualityIssueCount}q</span>
            )}
          </div>
        </div>
      )}
      rowHeight={76}
      autoPageSize
      emptyMessage="No shifts found"
    />
  );
}
