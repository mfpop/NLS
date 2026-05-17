import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { UPDATE_RESOURCE_GROUP } from "@/graphql/dataManagementMutations";
import { ENTITY_CONFIG } from "../config/entityConfig";
import { EntityEditPanel } from "./EntityEditPanel";
import { EntityFormHeader } from "./EntityFormHeader";
import { EntityFormActions } from "./EntityFormActions";
import { ReferenceSelect } from "../components/ReferenceSelect";
import { theme } from "@/styles/themeTokens";

interface ResourceFormProps {
  resourceId: string;
  onClose: () => void;
  onSaved?: () => void;
  readOnlyContext?: { plantName?: string; departmentName?: string; groupName?: string; };
}

interface TextFieldProps {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string; disabled?: boolean; error?: string;
}

function TextField({ label, value, onChange, required, placeholder, disabled, error }: TextFieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
        {label}{required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className={`w-full h-9 rounded-lg border px-3 text-sm outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          error ? "border-danger focus:ring-2 focus:ring-danger" : `${theme.input} ${theme.focusRing}`
        } ${disabled ? "bg-muted text-muted-foreground" : ""}`} />
      {error && <p className="mt-0.5 text-[10px] text-danger">{error}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">{label}</label>
      <div className="h-9 flex items-center text-sm font-medium text-muted-foreground px-3 rounded-lg bg-muted border border-transparent">
        {value || "\u2014"}
      </div>
    </div>
  );
}

function Section({ title, children, twoColumns }: { title: string; children: React.ReactNode; twoColumns?: boolean }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1.5 border-b border-border">{title}</h3>
      <div className={twoColumns ? "grid grid-cols-2 gap-x-6 gap-y-3" : "space-y-3"}>{children}</div>
    </div>
  );
}

export function ResourceForm({ resourceId, onClose, onSaved, readOnlyContext }: ResourceFormProps) {
  const { data, loading } = useQuery<{ resources: any[] }>(RESOURCES_QUERY, {
    variables: {},
    fetchPolicy: "network-only",
  });
  const [updateMutation, { loading: saving }] = useMutation(UPDATE_RESOURCE_GROUP);
  const resource = data?.resources?.find((r: any) => r.id === resourceId);

  const [form, setForm] = useState<Record<string, string>>({});
  const [initialData, setInitialData] = useState<Record<string, string> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (resource && !initialData) {
      const data = {
        name: resource.name || "",
        code: resource.code || "",
        statusId: resource.statusId || "",
        resourceTypeId: resource.resourceTypeId || "",
        opStatus: resource.opStatus || "",
        utilization: String(resource.utilization ?? ""),
        shift: resource.shift || "",
      };
      setForm(data);
      setInitialData(data);
    }
  }, [resource, initialData]);

  const update = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const hasChanges = initialData !== null && Object.keys(initialData).some((k) => form[k] !== initialData[k]);
  const isDirty = hasChanges;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = "Name is required";
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
          id: resourceId,
          input: {
            name: form.name,
            code: form.code || "",
            statusId: form.statusId || null,
            resourceTypeId: form.resourceTypeId || null,
          },
        },
      });
      setInitialData({ ...form });
      setToast("Resource saved successfully.");
      setTimeout(() => setToast(null), 3000);
      onSaved?.();
    } catch {
      setSaveError("Failed to save resource.");
    }
  };

  const handleDelete = async () => {
    setSaveError(null);
    try {
      await updateMutation({ variables: { id: resourceId, input: { status: "inactive" } } });
      onSaved?.();
      onClose();
    } catch {
      setSaveError("Failed to deactivate resource.");
      setDeleteConfirm(false);
    }
  };

  const handleCancel = () => {
    if (initialData) setForm({ ...initialData });
    setErrors({});
    setSaveError(null);
    onClose();
  };

  const cfg = ENTITY_CONFIG.resource;
  const Icon = cfg.icon;

  return (
    <EntityEditPanel loading={loading && !resource} notFound={!loading && !resource} error={saveError}>
      <EntityFormHeader
        icon={<Icon className="h-5 w-5 stroke-current" />}
        iconBg={cfg.color}
        name={resource?.name || ""}
        entityType="Resource"
        code={resource?.code || ""}
        status={resource?.status || ""}
        isDirty={isDirty}
        error={saveError}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto px-6 py-5 space-y-6" style={{ maxWidth: "1000px" }}>
          {toast && (
            <div className="rounded-lg border border-success bg-success px-4 py-2 text-xs text-success border-success bg-success text-success">{toast}</div>
          )}
          {saveError && (
            <div className="rounded-lg border border-danger bg-danger px-4 py-2 text-xs text-danger border-danger bg-danger text-danger">{saveError}</div>
          )}

          <Section title="Identity" twoColumns>
            <TextField label="Name" value={form.name ?? ""} onChange={(v) => update("name", v)}
              required placeholder="e.g. CNC Machine 03" error={errors.name} />
            <TextField label="Code / Asset Number" value={form.code ?? ""} onChange={(v) => update("code", v)}
              placeholder="e.g. CNC-003" />
            <ReferenceSelect categoryCode="resource_type" label="Resource Type"
              value={form.resourceTypeId ?? ""} onChange={(v) => update("resourceTypeId", v)} />
            <ReferenceSelect categoryCode="status" label="Status"
              value={form.statusId ?? ""} onChange={(v) => update("statusId", v)}
              includeInactive />
          </Section>

          <Section title="Context" twoColumns>
            {readOnlyContext ? (
              <>
                <ReadOnlyField label="Plant" value={readOnlyContext.plantName || ""} />
                <ReadOnlyField label="Department" value={readOnlyContext.departmentName || ""} />
                <ReadOnlyField label="Resource Group" value={readOnlyContext.groupName || ""} />
              </>
            ) : (
              <>
                <ReadOnlyField label="Plant" value={resource?.plantName || ""} />
                <ReadOnlyField label="Department" value={resource?.departmentName || ""} />
                <ReadOnlyField label="Resource Group" value={resource?.groupName || ""} />
              </>
            )}
          </Section>

          <Section title="Operational Status" twoColumns>
            <ReadOnlyField label="Operational Status" value={resource?.opStatus || "\u2014"} />
            <ReadOnlyField label="Utilization" value={resource?.utilization != null ? `${resource.utilization}%` : "\u2014"} />
            <ReadOnlyField label="Shift" value={resource?.shift || "\u2014"} />
            <ReadOnlyField label="Last Activity" value={resource?.lastActivity || "\u2014"} />
          </Section>

          <Section title="Working Schedule">
            <div className="rounded-lg border border-dashed border-border bg-muted px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Schedule and shift pattern are inherited from the resource group.
                Configure at the production line or resource group level.
              </p>
            </div>
          </Section>

          <Section title="Maintenance">
            <div className="rounded-lg border border-dashed border-border bg-muted px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Maintenance status tracking is not yet available in the current data model.
              </p>
            </div>
          </Section>

          <Section title="Notes">
            <textarea disabled
              className="w-full h-20 rounded-lg border px-3 py-2 text-sm outline-none bg-muted text-muted-foreground resize-none cursor-not-allowed"
              placeholder="Notes are not yet available in the current data model." value="" />
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
        deleting={false}
      />
    </EntityEditPanel>
  );
}
