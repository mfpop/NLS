import { useState, useEffect, useRef } from "react";
import { X, Clock, Loader2 } from "lucide-react";
import type { LiveShopfloorFilterOptions } from "@/types/liveShopfloor";

export interface LogShopfloorDowntimeFormData {
  reasonId: string;
  startTime: string;
  endTime: string;
  description: string;
  resourceId?: string;
  resourceGroupId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LogShopfloorDowntimeFormData) => void;
  saving: boolean;
  filters: LiveShopfloorFilterOptions | null;
  lineName: string;
  shiftName: string;
}

export function LogShopfloorDowntimeModal({ isOpen, onClose, onSave, saving, filters, lineName, shiftName }: Props) {
  const [reasonId, setReasonId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [resourceGroupId, setResourceGroupId] = useState("");
  const firstInputRef = useRef<HTMLSelectElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setStartTime(now.toISOString().slice(0, 16));
      setEndTime("");
      setReasonId("");
      setDescription("");
      setResourceGroupId("");
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const canSave = reasonId && startTime;

  return (
    <div ref={overlayRef} onClick={handleBackdropClick} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45" role="dialog" aria-modal="true" aria-label="Log downtime">
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Log Downtime</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 rounded px-3 py-2">
            <span className="font-medium text-foreground">{lineName}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{shiftName}</span>
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Reason *</label>
            <select
              ref={firstInputRef}
              value={reasonId}
              onChange={(e) => setReasonId(e.target.value)}
              className="w-full h-9 rounded border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            >
              <option value="">Select reason...</option>
              {(filters?.downtimeReasons || []).map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Start Time *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-9 rounded border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">End Time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-9 rounded border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Resource Group (optional)</label>
            <select
              value={resourceGroupId}
              onChange={(e) => setResourceGroupId(e.target.value)}
              className="w-full h-9 rounded border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            >
              <option value="">None</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description..."
              className="w-full rounded border border-border bg-card px-3 py-2 text-xs text-foreground outline-none resize-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/20">
          <button type="button" onClick={onClose} className="h-8 rounded px-4 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          <button
            type="button"
            onClick={() => onSave({ reasonId, startTime, endTime, description, resourceGroupId: resourceGroupId || undefined })}
            disabled={!canSave || saving}
            className="inline-flex h-8 items-center gap-2 rounded px-4 text-xs font-medium text-primary-foreground bg-primary hover:bg-accent transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
