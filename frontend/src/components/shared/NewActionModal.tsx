import { useState, useEffect, useRef } from "react";
import { X, ListChecks, Loader2 } from "lucide-react";

export interface NewActionFormData {
  title: string;
  description: string;
  priority: string;
  assignedTo: string;
  dueDate: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewActionFormData) => void;
  saving: boolean;
  lineName: string;
  shiftName: string;
  sourceType: string;
  initialTitle?: string;
  initialDescription?: string;
}

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "text-danger" },
  { value: "high", label: "High", color: "text-warning" },
  { value: "medium", label: "Medium", color: "text-accent" },
  { value: "low", label: "Low", color: "text-muted-foreground" },
];

export function NewActionModal({ isOpen, onClose, onSave, saving, lineName, shiftName, sourceType, initialTitle, initialDescription }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle ?? "");
      setDescription(initialDescription ?? "");
      setPriority("medium");
      setAssignedTo("");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDueDate(tomorrow.toISOString().slice(0, 10));
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isOpen, initialTitle, initialDescription]);

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

  const canSave = title.trim().length > 0;

  return (
    <div ref={overlayRef} onClick={handleBackdropClick} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45" role="dialog" aria-modal="true" aria-label="New action">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">New Action</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground font-mono">
              {sourceType}
            </span>
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
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Control Area: Production Control</span>
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Title *</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe the task to fix or follow up..."
              className="w-full h-9 rounded border border-border bg-card px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional details about the action..."
              className="w-full rounded border border-border bg-card px-3 py-2 text-xs text-foreground outline-none resize-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Priority</label>
              <div className="flex gap-1">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`flex-1 h-8 rounded border text-[10px] font-medium transition-colors ${
                      priority === opt.value
                        ? `${opt.color} border-current bg-current/10`
                        : "text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 rounded border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Assigned To</label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Assign to (name or role)..."
              className="w-full h-9 rounded border border-border bg-card px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/20">
          <button type="button" onClick={onClose} className="h-8 rounded px-4 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ title: title.trim(), description, priority, assignedTo, dueDate })}
            disabled={!canSave || saving}
            className="inline-flex h-8 items-center gap-2 rounded px-4 text-xs font-medium text-primary-foreground bg-primary hover:bg-accent transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Creating..." : "Create Action"}
          </button>
        </div>
      </div>
    </div>
  );
}
