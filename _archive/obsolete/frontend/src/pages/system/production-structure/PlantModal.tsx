import { useState, useEffect, useRef, type FormEvent } from "react";
import { X } from "lucide-react";
import { TIMEZONE_OPTIONS, validatePlantForm, hasFormChanges, EMPTY_FORM } from "@/hooks/usePlants";
import type { Plant } from "@/types/plant";
import { theme } from "../../../styles/themeTokens";

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
          status: editingPlant.status as string,
          statusId: editingPlant.statusId || "",
          building: editingPlant.building || "",
          address: editingPlant.address || "",
          city: editingPlant.city || "",
          state: editingPlant.state || "",
          country: editingPlant.country || "",
          countryId: editingPlant.countryId || "",
          zipcode: editingPlant.zipcode || "",
          timezone: editingPlant.timezone || TIMEZONE_OPTIONS[0].value,
          timezoneId: editingPlant.timezoneId || "",
          latitude: editingPlant.latitude || "",
          longitude: editingPlant.longitude || "",
          plantType: editingPlant.plantType || "",
          plantTypeId: editingPlant.plantTypeId || "",
          operatingSince: editingPlant.operatingSince || "",
          managerName: editingPlant.managerName || "",
          managerEmail: editingPlant.managerEmail || "",
          managerPhone: editingPlant.managerPhone || "",
          defaultCalendar: editingPlant.defaultCalendar || "",
          defaultCalendarId: editingPlant.defaultCalendarId || "",
          defaultShiftModel: editingPlant.defaultShiftModel || "",
          defaultShiftModelId: editingPlant.defaultShiftModelId || "",
          weekStartDay: editingPlant.weekStartDay || "",
          weekStartDayId: editingPlant.weekStartDayId || "",
          defaultSchedule: editingPlant.defaultSchedule || "",
          defaultScheduleId: editingPlant.defaultScheduleId || "",
          manufacturingFocus: editingPlant.manufacturingFocus || "",
          manufacturingFocusIds: editingPlant.manufacturingFocusRefs?.map((ref) => ref.id) ?? [],
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
      <div className={`fixed inset-0 z-30 ${theme.overlay}`} onClick={handleClose} />
      <div className={`fixed left-1/2 top-1/2 z-40 w-full -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-xl ${theme.modal}`} style={{ maxWidth: "520px" }}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-5 py-3.5 ${theme.subHeader}`}>
          <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>
            {isEditing ? "Edit Plant" : "Add Plant"}
          </h2>
          <button type="button" onClick={handleClose} className={`rounded-lg p-1 transition-colors ${theme.buttonGhost}`}>
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
                className={`w-full rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 bg-muted text-primary-foreground ${errors.name ? "border-danger focus:ring-danger" : "border-border focus:ring-ring border-border"}`} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plant Code" required error={errors.code}>
                <input type="text" value={form.code} onChange={(e) => updateField("code", e.target.value.toUpperCase())} placeholder="e.g. MP-01"
                  className={`w-full rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground uppercase focus:outline-none focus:ring-2 bg-muted text-primary-foreground ${errors.code ? "border-danger focus:ring-danger" : "border-border focus:ring-ring border-border"}`} />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => updateField("status", e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs ${theme.input} ${theme.focusRing}`}>
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
                className={`w-full rounded-lg border px-3 py-2 text-xs ${theme.input} ${theme.focusRing}`} />
            </Field>
            <Field label="Address">
              <input type="text" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="e.g. 123 Industrial Blvd, Detroit, MI"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border-border bg-muted text-primary-foreground" />
            </Field>
            <Field label="Timezone">
              <select value={form.timezone} onChange={(e) => updateField("timezone", e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-xs ${theme.input} ${theme.focusRing}`}>
                {TIMEZONE_OPTIONS.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </Field>
          </div>



          {/* 4. MANAGEMENT */}
          <SectionTitle title="Management" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plant Manager">
              <input type="text" value={form.managerName} onChange={(e) => updateField("managerName", e.target.value)} placeholder="e.g. John Smith"
                className={`w-full rounded-lg border px-3 py-2 text-xs ${theme.input} ${theme.focusRing}`} />
            </Field>
            <Field label="Email (optional)" error={errors.managerEmail}>
              <input type="email" value={form.managerEmail} onChange={(e) => updateField("managerEmail", e.target.value)} placeholder="john@leansync.com"
                className={`w-full rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 bg-muted text-primary-foreground ${errors.managerEmail ? "border-danger focus:ring-danger" : "border-border focus:ring-ring border-border"}`} />
            </Field>
          </div>

          {/* 5. NOTES */}
          <SectionTitle title="Notes" />
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="e.g. Primary assembly facility..." rows={3}
              className={`w-full rounded-lg border px-3 py-2 text-xs resize-none ${theme.input} ${theme.focusRing}`} />
          </Field>

          {/* ── Validation feedback ── */}
          {errors._form && (
            <div className="mt-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">{errors._form}</div>
          )}

          {/* ── Confirm close warning ── */}
          {showConfirmClose && (
            <div className="mt-3 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
              You have unsaved changes.
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => setShowConfirmClose(false)} className="rounded-md border border-warning/25 bg-card px-2 py-1 text-[10px] font-medium text-warning hover:bg-warning/10 transition-colors">Keep editing</button>
                <button type="button" onClick={() => { setDirty(false); onClose(); }} className="rounded-md bg-warning px-2 py-1 text-[10px] font-medium text-warning-foreground hover:bg-warning/90 transition-colors">Discard</button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className={`flex items-center justify-between border-t px-5 py-3 ${theme.subHeader}`}>
          <div>
            {isEditing && editingPlant && ((editingPlant.lineCount ?? 0) > 0 || (editingPlant.departmentCount ?? 0) > 0 || (editingPlant.groupCount ?? 0) > 0 || (editingPlant.resourceCount ?? 0) > 0) && (
              <span className={`text-[10px] ${theme.textMuted}`}>Plant in use - disable instead of delete</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleClose} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${theme.buttonSecondary}`}>
              Cancel
            </button>
            <button type="submit" onClick={handleSubmit} disabled={!canSave}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors ${canSave ? "bg-muted hover:bg-muted hover:bg-muted" : "cursor-not-allowed bg-muted"}`}>
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
  return <h3 className={`mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider first:mt-0 ${theme.textSecondary}`}>{title}</h3>;
}

function Field({ label, children, error, required }: { label: string; children: React.ReactNode; error?: string; required?: boolean }) {
  return (
    <div>
      <label className={`mb-1 block text-[11px] font-medium ${theme.textSecondary}`}>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error && <p className="mt-0.5 text-[10px] text-danger">{error}</p>}
    </div>
  );
}
