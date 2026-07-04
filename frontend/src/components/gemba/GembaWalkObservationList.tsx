import { useMemo } from "react";
import { Footprints } from "lucide-react";
import type { GembaObservation } from "@/types/gemba";
import { GembaObservationRow } from "./GembaObservationRow";

interface Props {
  observations: GembaObservation[];
  openCount: number;
  criticalCount: number;
  totalCount: number;
  loading: boolean;
  categoryFilter: string;
  severityFilter: string;
  statusFilter: string;
  searchQuery: string;
  onSelectObservation: (obs: GembaObservation) => void;
  onAssign: (obs: GembaObservation) => void;
  onCreateIssue: (obs: GembaObservation) => void;
  onCreateAction: (obs: GembaObservation) => void;
  onResolve: (obs: GembaObservation) => void;
  onVerify: (obs: GembaObservation) => void;
  onClose: (obs: GembaObservation) => void;
  onReopen: (obs: GembaObservation) => void;
}

export function GembaWalkObservationList({
  observations, openCount, criticalCount, totalCount,
  loading, categoryFilter, severityFilter, statusFilter, searchQuery,
  onSelectObservation,
  onAssign, onCreateIssue, onCreateAction, onResolve, onVerify, onClose, onReopen,
}: Props) {
  const filtered = useMemo(() => {
    return observations.filter((o) => {
      if (categoryFilter !== "ALL" && o.category !== categoryFilter) return false;
      if (severityFilter !== "ALL" && o.severity !== severityFilter) return false;
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          o.title.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          o.area.toLowerCase().includes(q) ||
          o.focus.toLowerCase().includes(q) ||
          (o.locationLabel ?? "").toLowerCase().includes(q) ||
          (o.locationPath ?? "").toLowerCase().includes(q) ||
          (o.ownerName ?? "").toLowerCase().includes(q) ||
          (o.createdByName ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [observations, categoryFilter, severityFilter, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with summary counts */}
      <div className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-border bg-muted">
        <div className="flex items-center gap-1.5">
          <Footprints className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observations</h3>
          {loading && (
            <span className="h-3 w-3 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-muted-foreground">{totalCount} total</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-danger font-medium">{openCount} open</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-warning font-medium">{criticalCount} critical</span>
        </div>
      </div>

      {/* List body */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/50">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center">
            <Footprints className="h-10 w-10 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {observations.length === 0 ? "No observations recorded" : "No matching observations"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {observations.length === 0
                  ? "Record the first Gemba observation from the left panel."
                  : "Try adjusting the filters above."}
              </p>
            </div>
          </div>
        ) : (
          filtered.map((obs) => (
            <GembaObservationRow
              key={obs.id}
              observation={obs}
              onSelect={onSelectObservation}
              onAssign={onAssign}
              onCreateIssue={onCreateIssue}
              onCreateAction={onCreateAction}
              onResolve={onResolve}
              onVerify={onVerify}
              onClose={onClose}
              onReopen={onReopen}
            />
          ))
        )}
      </div>
    </div>
  );
}
