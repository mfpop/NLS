import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { DEPARTMENT_QUERY } from "@/graphql/manufacturingQueries";
import { UPDATE_DEPARTMENT_MUTATION, DELETE_DEPARTMENT_MUTATION } from "@/graphql/departmentMutations";
import { ENTITY_CONFIG } from "../config/entityConfig";
import { EntityEditPanel } from "./EntityEditPanel";
import { EntityFormHeader } from "./EntityFormHeader";
import { EntityFormActions } from "./EntityFormActions";
import { ReferenceSelect } from "../components/ReferenceSelect";
import { theme } from "@/styles/themeTokens";

interface DepartmentFormProps {
  departmentId: string;
  onClose: () => void;
  onSaved?: () => void;
  readOnlyContext?: { plantName?: string; };
}

interface TextFieldProps {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string; disabled?: boolean; error?: string;
}

function TextField({ label, value, onChange, required, placeholder, disabled, error }: TextFieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className={`w-full h-9 rounded-lg border px-3 text-sm outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          error ? "border-red-300 focus:ring-2 focus:ring-red-200" : `${theme.input} ${theme.focusRing}`
        } ${disabled ? "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400" : ""}`} />
      {error && <p className="mt-0.5 text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <div className="h-9 flex items-center text-sm font-medium text-slate-700 dark:text-slate-200 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-transparent">
        {value || "\u2014"}
      </div>
    </div>
  );
}

function Section({ title, children, twoColumns }: { title: string; children: React.ReactNode; twoColumns?: boolean }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 dark:border-slate-800">
        {title}
      </h3>
      <div className={twoColumns ? "grid grid-cols-2 gap-x-6 gap-y-3" : "space-y-3"}>{children}</div>
    </div>
  );
}

export function DepartmentForm({ departmentId, onClose, onSaved, readOnlyContext }: DepartmentFormProps) {
  const { data, loading } = useQuery<{ department: any }>(DEPARTMENT_QUERY, {
    variables: { id: departmentId },
    fetchPolicy: "network-only",
  });
  const [updateMutation, { loading: saving }] = useMutation(UPDATE_DEPARTMENT_MUTATION);
  const [deleteMutation, { loading: deleting }] = useMutation(DELETE_DEPARTMENT_MUTATION);

  const dept = data?.department;

  const [form, setForm] = useState<Record<string, string>>({});
  const [initialData, setInitialData] = useState<Record<string, string> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (dept && !initialData) {
      const data = {
        name: dept.name || "",
        code: dept.code || "",
        statusId: dept.statusId || "",
        manager: dept.manager || "",
        employees: String(dept.employees ?? ""),
      };
      setForm(data);
      setInitialData(data);
    }
  }, [dept, initialData]);

  const update = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const hasChanges = initialData !== null && Object.keys(initialData).some((k) => form[k] !== initialData[k]);
  const isDirty = hasChanges;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = "Name is required";
    if (!form.code?.trim()) errs.code = "Code is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaveError(null);
    setToast(null);
    try {
      await updateMutation({
        variables: {
          id: departmentId,
          input: {
            name: form.name,
            code: form.code,
            statusId: form.statusId || null,
            manager: form.manager || undefined,
            employees: form.employees ? Number(form.employees) : undefined,
          },
        },
      });
      setInitialData({ ...form });
      setToast("Department saved successfully.");
      setTimeout(() => setToast(null), 3000);
      onSaved?.();
    } catch {
      setSaveError("Failed to save department.");
    }
  };

  const handleDelete = async () => {
    setSaveError(null);
    try {
      await deleteMutation({ variables: { id: departmentId } });
      onSaved?.();
      onClose();
    } catch {
      setSaveError("Failed to delete department.");
      setDeleteConfirm(false);
    }
  };

  const handleCancel = () => {
    if (initialData) setForm({ ...initialData });
    setErrors({});
    setSaveError(null);
    onClose();
  };

  const cfg = ENTITY_CONFIG.department;
  const Icon = cfg.icon;

  return (
    <EntityEditPanel loading={loading && !dept} notFound={!loading && !dept} error={saveError}>
      <EntityFormHeader
        icon={<Icon className="h-5 w-5 stroke-current" />}
        iconBg={cfg.color}
        name={dept?.name || ""}
        entityType="Department"
        code={dept?.code || ""}
        status={dept?.status || ""}
        isDirty={isDirty}
        error={saveError}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto px-6 py-5 space-y-6" style={{ maxWidth: "1000px" }}>
          {toast && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              {toast}
            </div>
          )}

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {saveError}
            </div>
          )}

          <Section title="Identity" twoColumns>
            <TextField label="Name" value={form.name ?? ""} onChange={(v) => update("name", v)}
              required placeholder="e.g. Assembly" error={errors.name} />
            <TextField label="Code" value={form.code ?? ""} onChange={(v) => update("code", v)}
              required placeholder="e.g. ASM" error={errors.code} />
            <ReferenceSelect categoryCode="status" label="Status"
              value={form.statusId ?? ""} onChange={(v) => update("statusId", v)}
              includeInactive />
          </Section>

          <Section title="Context" twoColumns>
            {readOnlyContext ? (
              <ReadOnlyField label="Plant" value={readOnlyContext.plantName || ""} />
            ) : (
              <ReadOnlyField label="Plant" value={dept?.plantName || ""} />
            )}
            <ReadOnlyField label="Resource Groups" value={String(dept?.groupCount ?? 0)} />
            <ReadOnlyField label="Resources" value={String(dept?.resourceCount ?? 0)} />
          </Section>

          <Section title="Personnel" twoColumns>
            <TextField label="Manager" value={form.manager ?? ""} onChange={(v) => update("manager", v)}
              placeholder="e.g. John Smith" />
            <TextField label="Employees" value={form.employees ?? ""} onChange={(v) => update("employees", v)}
              placeholder="e.g. 45" />
          </Section>

          <Section title="Working Schedule Policy">
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Schedule inheritance is managed at the production line level.
                Configure shifts and patterns on the related production line.
              </p>
            </div>
          </Section>

          <Section title="Additional Information" twoColumns>
            <ReadOnlyField label="Created" value={dept?.createdAt || ""} />
            <ReadOnlyField label="Updated" value={dept?.updatedAt || ""} />
          </Section>

          <Section title="Notes">
            <textarea disabled
              className="w-full h-20 rounded-lg border px-3 py-2 text-sm outline-none bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 resize-none cursor-not-allowed"
              placeholder="Notes are not yet available in the current data model."
              value="" />
          </Section>
        </div>
      </div>

      <EntityFormActions
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={() => setDeleteConfirm(true)}
        saving={saving}
        hasChanges={!!hasChanges}
        deleteConfirm={deleteConfirm}
        onDeleteConfirm={handleDelete}
        onDeleteCancel={() => setDeleteConfirm(false)}
        deleting={deleting}
      />
    </EntityEditPanel>
  );
}
