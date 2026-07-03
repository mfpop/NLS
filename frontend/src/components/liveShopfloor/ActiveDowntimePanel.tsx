import { Clock, XCircle, AlertTriangle, User, Wrench, Plus } from "lucide-react";
import type { LiveShopfloorActiveDowntime } from "@/types/liveShopfloor";

interface Props {
  activeDowntime: LiveShopfloorActiveDowntime | null;
  onResolveDowntime: (id: string) => void;
  onCreateIssue: () => void;
}

export function ActiveDowntimePanel({ activeDowntime, onResolveDowntime, onCreateIssue }: Props) {
  if (!activeDowntime) {
    return (
      <div className="flex flex-col h-full min-h-[140px] overflow-hidden bg-slate-50 border-b border-slate-200">
        <div className="h-8 shrink-0 border-b border-slate-200 px-3 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Active Downtime</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            No active downtime
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[140px] overflow-hidden border-b border-slate-200">
      {/* Subtle red tint only when active downtime exists */}
      <div className="h-8 shrink-0 border-b border-red-200 px-3 flex items-center justify-between bg-red-50">
        <div className="flex items-center gap-1.5">
          <XCircle className="h-3.5 w-3.5 text-red-600" />
          <h3 className="text-[11px] font-semibold text-red-800 uppercase tracking-wide">Active Downtime</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-800 border border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            {activeDowntime.durationMinutes}m
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 bg-red-50/30">
        {/* Reason */}
        <div className="flex items-start gap-1.5 mb-1.5">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 leading-tight">{activeDowntime.reason}</p>
          </div>
        </div>

        {/* Resource info */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mb-2">
          {activeDowntime.affectedResourceName && (
            <div>
              <span className="text-slate-500">Resource</span>
              <p className="font-medium text-slate-800 truncate">{activeDowntime.affectedResourceName}</p>
            </div>
          )}
          {activeDowntime.affectedResourceGroupName && (
            <div>
              <span className="text-slate-500">Group</span>
              <p className="font-medium text-slate-800 truncate">{activeDowntime.affectedResourceGroupName}</p>
            </div>
          )}
          <div>
            <span className="text-slate-500">Started</span>
            <p className="font-medium text-slate-800">{activeDowntime.startTime}</p>
          </div>
          <div>
            <span className="text-slate-500">Duration</span>
            <p className="font-medium text-slate-800">{activeDowntime.durationMinutes} min</p>
          </div>
        </div>

        {/* Owner */}
        {activeDowntime.owner && (
          <div className="flex items-center gap-1 text-[10px] text-slate-600 mb-2">
            <User className="h-3 w-3 text-slate-400" />
            <span className="font-medium text-slate-700 truncate">{activeDowntime.owner}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onResolveDowntime(activeDowntime.id)}
            className="inline-flex h-7 items-center gap-1 rounded-[2px] bg-emerald-600 px-2 text-[10px] font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <Wrench className="h-3 w-3" />
            Resolve
          </button>
          <button
            type="button"
            onClick={onCreateIssue}
            className="inline-flex h-7 items-center gap-1 rounded-[2px] border border-red-200 bg-white px-2 text-[10px] font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Create Issue
          </button>
        </div>
      </div>
    </div>
  );
}
