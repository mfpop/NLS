import { useState, useCallback, useMemo } from "react";
import { Footprints, Send, Loader2, AlertCircle } from "lucide-react";
import type { CreateGembaObservationInput, GembaCategory, GembaSeverity, GembaPriority } from "@/types/gemba";
import { GembaLocationPicker, type LocationSelection } from "./GembaLocationPicker";

interface Props {
  sessionId: number | null;
  onSave: (data: CreateGembaObservationInput) => Promise<void>;
  saving: boolean;
  readOnly?: boolean;
  structureError?: boolean;
  onRetryStructure?: () => void;
  /** Sidebar context */
  plantId: number | null;
  plantName: string | null;
  productionLineId: number | null;
  productionLineName: string | null;
}

const CATEGORIES: { value: GembaCategory; label: string }[] = [
  { value: "PRODUCTIVITY", label: "Productivity" },
  { value: "QUALITY", label: "Quality" },
  { value: "SAFETY", label: "Safety" },
  { value: "FIVE_S", label: "5S" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "MATERIAL", label: "Material" },
  { value: "MORALE", label: "Morale" },
  { value: "OTHER", label: "Other" },
];

const SEVERITIES: { value: GembaSeverity; label: string }[] = [
  { value: "INFO", label: "Info" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const PRIORITIES: { value: GembaPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export function GembaWalkForm({ sessionId, onSave, saving, readOnly, structureError, onRetryStructure, plantId, plantName, productionLineId, productionLineName }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [focus, setFocus] = useState("");
  const [category, setCategory] = useState<GembaCategory>("PRODUCTIVITY");
  const [severity, setSeverity] = useState<GembaSeverity>("INFO");
  const [priority, setPriority] = useState<GembaPriority>("MEDIUM");
  const [linkedResourceText, setLinkedResourceText] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && location !== null && sessionId !== null && !readOnly && description.trim().length > 0,
    [title, location, sessionId, readOnly, description]
  );

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!sessionId) { setError("No active session"); return; }
    if (!title.trim()) { setError("Title is required"); return; }
    if (!location) { setError("Location is required"); return; }

    const input: CreateGembaObservationInput = {
      sessionId,
      title: title.trim(),
      description: description.trim() || undefined,
      focus: focus.trim() || undefined,
      category,
      severity,
      priority,
      linkedResourceText: linkedResourceText.trim() || undefined,
      ownerName: ownerName.trim() || undefined,
      dueDate: dueDate || undefined,
      targetType: location.targetType,
      targetId: location.targetId,
      locationPath: location.locationPath,
      locationLabel: location.locationLabel,
      plantId: plantId,
      productionLineId: productionLineId,
    };

    try {
      await onSave(input);
      setTitle("");
      setDescription("");
      setFocus("");
      setCategory("PRODUCTIVITY");
      setSeverity("INFO");
      setPriority("MEDIUM");
      setLinkedResourceText("");
      setOwnerName("");
      setDueDate("");
      setLocation(null);
    } catch {
      setError("Failed to save observation");
    }
  }, [sessionId, title, description, focus, category, severity, priority, linkedResourceText, ownerName, dueDate, location, onSave]);

  const isDisabled = saving || readOnly;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-9 shrink-0 flex items-center gap-1.5 px-3 border-b border-slate-200 bg-slate-50">
        <Footprints className="h-4 w-4 text-slate-500" />
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">New Observation</h3>
      </div>

      {/* Form body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-2.5">
        {readOnly && (
          <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-xs text-amber-700">
            Session is completed. Observations are read-only.
          </div>
        )}

        {!sessionId && (
          <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-xs text-amber-700">
            Start a Gemba Walk session to record observations.
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What did you observe?"
            disabled={isDisabled}
            className="w-full h-8 rounded-[2px] border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-sky-500 placeholder:text-slate-400"
          />
        </div>

        {/* Location — structured selector replaces free-text Area */}
        <GembaLocationPicker
          value={location}
          onChange={setLocation}
          disabled={isDisabled}
          structureError={!!structureError}
          onRetryStructure={onRetryStructure ?? (() => {})}
          plantId={plantId ? String(plantId) : null}
          plantName={plantName}
          productionLineId={productionLineId ? String(productionLineId) : null}
          productionLineName={productionLineName}
        />

        {/* Focus */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Focus</label>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. WIP accumulation, tool wear, safety"
            disabled={isDisabled}
            className="w-full h-8 rounded-[2px] border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-sky-500 placeholder:text-slate-400"
          />
        </div>

        {/* Category + Severity + Priority */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as GembaCategory)}
              disabled={isDisabled}
              className="w-full h-8 rounded-[2px] border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-sky-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Severity *</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as GembaSeverity)}
              disabled={isDisabled}
              className="w-full h-8 rounded-[2px] border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-sky-500"
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as GembaPriority)}
              disabled={isDisabled}
              className="w-full h-8 rounded-[2px] border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-sky-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Owner + Due Date */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Owner</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Assignee name"
              disabled={isDisabled}
              className="w-full h-8 rounded-[2px] border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-sky-500 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isDisabled}
              className="w-full h-8 rounded-[2px] border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you observed in detail..."
            disabled={isDisabled}
            className="w-full rounded-[2px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-sky-500 resize-none placeholder:text-slate-400"
            style={{ minHeight: "56px" }}
          />
        </div>

        {/* Linked resource — only needed if extra text required beyond location */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Linked Resource</label>
          <input
            type="text"
            value={linkedResourceText}
            onChange={(e) => setLinkedResourceText(e.target.value)}
            placeholder="Optional additional reference"
            disabled={isDisabled}
            className="w-full h-8 rounded-[2px] border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-sky-500 placeholder:text-slate-400"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-1.5 rounded bg-red-50 border border-red-200 px-2 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span className="text-xs text-red-700">{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full inline-flex h-8 items-center justify-center gap-1.5 rounded-[2px] px-3 text-sm font-medium transition-colors ${
            !canSubmit
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : "bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900"
          }`}
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Send className="h-4 w-4" /> Record Observation</>
          )}
        </button>
      </div>
    </div>
  );
}
