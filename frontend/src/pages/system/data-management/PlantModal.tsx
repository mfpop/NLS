import { useState, useEffect, useRef, type FormEvent } from "react";
import { X } from "lucide-react";
import { TIMEZONE_OPTIONS, validatePlantForm, hasFormChanges, EMPTY_FORM } from "@/hooks/usePlants";
import type { Plant } from "@/types/plant";

interface PlantModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: typeof EMPTY_FORM) => Promise<{ ok: boolean; errors?: Record<string, string> }>;
  editingPlant?: Plant | null;
}

export function PlantModal({ open, onClose, onSave, editingPlant }: PlantModalProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const isEditing = !!editingPlant;

  /* ── Reset form when modal opens ── */
  useEffect(() => {
    if (open) {
      if (editingPlant) {
        setForm({
          name: editingPlant.name,
          code: editingPlant.code,
          status: editingPlant.status,
          building: editingPlant.building || "",
          address: editingPlant.address || "",
          timezone: editingPlant.timezone || TIMEZONE_OPTIONS[0].value,
          defaultCalendarId: editingPlant.defaultCalendarId || "",
          defaultScheduleId: editingPlant.defaultScheduleId || "",
          managerName: editingPlant.managerName || "",
          managerEmail: editingPlant.managerEmail || "",
          description: editingPlant.description || "",
        });
      } else {
        setForm({ ...EMPTY_FORM });
      }
      setErrors({});
      setDirty(false);
      setShowConfirmClose(false);
    }
  }, [open, editingPlant]);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const validation = validatePlantForm(form, [], editingPlant?.id);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSaving(true);
    const result = await onSave(form);
    setSaving(false);

    if (result.ok) {
      setDirty(false);
      onClose();
    } else if (result.errors) {
      setErrors(result.errors);
    }
  };

  const handleClose = () => {
    if (dirty && !showConfirmClose) {
      setShowConfirmClose(true);
      return;
    }
    setShowConfirmClose(false);
    onClose();
  };

  const hasChanges = isEditing ? hasFormChanges(form, editingPlant) : true;
  const canSave = hasChanges && !saving;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={handleClose} />
      <div className="fixed left-1/2 top-1/2 z-40 w-full -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900" style={{ maxWidth: "520px" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {isEditing ? "Edit Plant" : "Add Plant"}
          </h2>
          <button type="button" onClick={handleClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4" style={{ maxHeight: "calc(100vh - 220px)" }}>
          {/* 1. IDENTIFICATION */}
          <SectionTitle title="Identification" />
          <div className="space-y-3">
            <Field label="Plant Name" required error={errors.name}>
              <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Main Plant"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 ${errors.name ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-slate-300 dark:border-slate-600"}`} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plant Code" required error={errors.code}>
                <input type="text" value={form.code} onChange={(e) => updateField("code", e.target.value.toUpperCase())} placeholder="e.g. MP-01"
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 uppercase focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 ${errors.code ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-slate-300 dark:border-slate-600"}`} />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => updateField("status", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
          </div>

          {/* 2. LOCATION */}
          <SectionTitle title="Location" />
          <div className="space-y-3">
            <Field label="Building / Site">
              <input type="text" value={form.building} onChange={(e) => updateField("building", e.target.value)} placeholder="e.g. Building A"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500" />
            </Field>
            <Field label="Address">
              <input type="text" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="e.g. 123 Industrial Blvd, Detroit, MI"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500" />
            </Field>
            <Field label="Timezone">
              <select value={form.timezone} onChange={(e) => updateField("timezone", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                {TIMEZONE_OPTIONS.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </Field>
          </div>

          {/* 3. DEFAULTS */}
          <SectionTitle title="Defaults" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default Calendar">
              <select value={form.defaultCalendarId} onChange={(e) => updateField("defaultCalendarId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                <option value="">Not set</option>
                <option value="CAL-001">Standard 5-day Week</option>
                <option value="CAL-002">6-day Extended Week</option>
                <option value="CAL-003">24/7 Continuous</option>
              </select>
            </Field>
            <Field label="Default Schedule">
              <select value={form.defaultScheduleId} onChange={(e) => updateField("defaultScheduleId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                <option value="">Not set</option>
                <option value="SCH-001">Morning Shift (6:00-14:00)</option>
                <option value="SCH-002">Afternoon Shift (14:00-22:00)</option>
                <option value="SCH-003">Night Shift (22:00-6:00)</option>
                <option value="SCH-004">Rotating 8h</option>
                <option value="SCH-005">Fixed 12h</option>
              </select>
            </Field>
          </div>

          {/* 4. MANAGEMENT */}
          <SectionTitle title="Management" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plant Manager">
              <input type="text" value={form.managerName} onChange={(e) => updateField("managerName", e.target.value)} placeholder="e.g. John Smith"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500" />
            </Field>
            <Field label="Email (optional)" error={errors.managerEmail}>
              <input type="email" value={form.managerEmail} onChange={(e) => updateField("managerEmail", e.target.value)} placeholder="john@leansync.com"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 ${errors.managerEmail ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-slate-300 dark:border-slate-600"}`} />
            </Field>
          </div>

          {/* 5. NOTES */}
          <SectionTitle title="Notes" />
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="e.g. Primary assembly facility..." rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 resize-none" />
          </Field>

          {/* ── Validation feedback ── */}
          {errors._form && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errors._form}</div>
          )}

          {/* ── Confirm close warning ── */}
          {showConfirmClose && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              You have unsaved changes.
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => setShowConfirmClose(false)} className="rounded-md border border-amber-200 bg-white px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition-colors">Keep editing</button>
                <button type="button" onClick={() => { setDirty(false); onClose(); }} className="rounded-md bg-amber-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-amber-500 transition-colors">Discard</button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-700">
          <div>
            {isEditing && editingPlant && (editingPlant.lineCount > 0 || editingPlant.departmentCount > 0 || editingPlant.groupCount > 0 || editingPlant.resourceCount > 0) && (
              <span className="text-[10px] text-slate-400">Plant in use — disable instead of delete</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button type="submit" onClick={handleSubmit} disabled={!canSave}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-colors ${canSave ? "bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600" : "cursor-not-allowed bg-slate-300 dark:bg-slate-600"}`}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Helpers ── */

function SectionTitle({ title }: { title: string }) {
  return <h3 className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 first:mt-0 dark:text-slate-400">{title}</h3>;
}

function Field({ label, children, error, required }: { label: string; children: React.ReactNode; error?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-0.5 text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
