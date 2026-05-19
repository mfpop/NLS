import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  FolderOpen,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import {
  ARCHIVE_IMPORT_SOURCE_CONFIG,
  CREATE_IMPORT_SOURCE_CONFIG,
  UPDATE_IMPORT_SOURCE_CONFIG,
} from "@/graphql/importSourceMutations";
import { IMPORT_SOURCE_CONFIGS_QUERY } from "@/graphql/importSourceQueries";
import type { ImportDomain, ImportSourceConfig, ImportSourceConfigInput, ImportSourceType } from "@/types/importSource";
import { theme } from "@/styles/themeTokens";

const SOURCE_TYPES: Array<{ value: ImportSourceType; label: string }> = [
  { value: "EXCEL", label: "Excel" },
  { value: "CSV", label: "CSV" },
  { value: "ERP_EXPORT", label: "ERP export" },
];

const DOMAINS: Array<{ value: ImportDomain; label: string }> = [
  { value: "PLANT_STRUCTURE", label: "Plant structure" },
  { value: "MATERIALS", label: "Materials" },
  { value: "BOM", label: "BOM" },
  { value: "ROUTING", label: "Routing" },
  { value: "SCHEDULES", label: "Schedules" },
  { value: "INVENTORY", label: "Inventory" },
];

interface MutationError {
  field: string;
  code: string;
  message: string;
}

interface CreateImportSourceResponse {
  createImportSourceConfig?: { ok: boolean; errors?: MutationError[] };
}

interface UpdateImportSourceResponse {
  updateImportSourceConfig?: { ok: boolean; errors?: MutationError[] };
}

interface ArchiveImportSourceResponse {
  archiveImportSourceConfig?: { ok: boolean; errors?: MutationError[] };
}

const EMPTY_FORM: ImportSourceConfigInput = {
  name: "",
  sourceType: "EXCEL",
  domain: "PLANT_STRUCTURE",
  path: "",
  filePattern: "*.xlsx",
  archivePath: "",
  errorPath: "",
  isActive: true,
};

function formatLastChecked(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function ImportSourcesCard() {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ImportSourceConfigInput>(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ importSourceConfigs: ImportSourceConfig[] }>(
    IMPORT_SOURCE_CONFIGS_QUERY,
    { fetchPolicy: "cache-and-network" },
  );

  const [createConfig, { loading: creating }] = useMutation<CreateImportSourceResponse>(CREATE_IMPORT_SOURCE_CONFIG, {
    refetchQueries: [IMPORT_SOURCE_CONFIGS_QUERY],
  });
  const [updateConfig, { loading: updating }] = useMutation<UpdateImportSourceResponse>(UPDATE_IMPORT_SOURCE_CONFIG, {
    refetchQueries: [IMPORT_SOURCE_CONFIGS_QUERY],
  });
  const [archiveConfig] = useMutation<ArchiveImportSourceResponse>(ARCHIVE_IMPORT_SOURCE_CONFIG, {
    refetchQueries: [IMPORT_SOURCE_CONFIGS_QUERY],
  });

  const sources = useMemo(() => data?.importSourceConfigs ?? [], [data]);
  const isSaving = creating || updating;
  const isEditing = editingId !== null;

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startAdd = () => {
    resetForm();
    setEditingId("new");
  };

  const startEdit = (row: ImportSourceConfig) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      sourceType: row.sourceType,
      domain: row.domain,
      path: row.path,
      filePattern: row.filePattern,
      archivePath: row.archivePath ?? "",
      errorPath: row.errorPath ?? "",
      isActive: row.isActive,
    });
  };

  const handleSave = async () => {
    setMessage(null);
    if (!form.name.trim() || !form.path.trim() || !form.filePattern.trim()) {
      setMessage("Name, path, and file pattern are required.");
      return;
    }
    const input: ImportSourceConfigInput = {
      ...form,
      name: form.name.trim(),
      path: form.path.trim(),
      filePattern: form.filePattern.trim(),
      archivePath: form.archivePath?.trim() || null,
      errorPath: form.errorPath?.trim() || null,
    };
    try {
      if (editingId === "new") {
        const res = await createConfig({ variables: { input } });
        const payload = res.data?.createImportSourceConfig;
        if (!payload?.ok) {
          setMessage(payload?.errors?.map((err: MutationError) => err.message).join(", ") || "Create failed.");
          return;
        }
        setMessage("Import source added.");
      } else if (editingId) {
        const res = await updateConfig({ variables: { id: editingId, input } });
        const payload = res.data?.updateImportSourceConfig;
        if (!payload?.ok) {
          setMessage(payload?.errors?.map((err: MutationError) => err.message).join(", ") || "Update failed.");
          return;
        }
        setMessage("Import source updated.");
      }
      resetForm();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed.");
    }
  };

  const handleDisable = async (row: ImportSourceConfig) => {
    setMessage(null);
    try {
      const res = await updateConfig({
        variables: { id: row.id, input: { isActive: !row.isActive } },
      });
      if (!res.data?.updateImportSourceConfig?.ok) {
        setMessage("Could not update active state.");
        return;
      }
      setMessage(row.isActive ? "Source disabled." : "Source enabled.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const handleArchive = async (row: ImportSourceConfig) => {
    if (!window.confirm(`Archive "${row.name}"? It will no longer appear in import jobs.`)) return;
    setMessage(null);
    try {
      const res = await archiveConfig({ variables: { id: row.id } });
      if (!res.data?.archiveImportSourceConfig?.ok) {
        setMessage("Archive failed.");
        return;
      }
      setMessage("Source archived.");
      if (editingId === row.id) resetForm();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Archive failed.");
    }
  };

  const actionBtn =
    "inline-flex h-7 items-center gap-1 rounded border border-border/25 bg-card px-2 text-[10px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50";

  return (
    <section className="col-span-full flex flex-col rounded-lg border border-border/10 bg-card p-3 shadow-md shadow-foreground/5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <FolderOpen className="h-4 w-4 stroke-current" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-foreground">Import Sources</h2>
            <p className="text-[11px] text-muted-foreground">
              Configure ERP/Excel file locations for imports. This screen does not run imports — execution stays in domain import services.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={startAdd} className={actionBtn}>
            <Plus className="h-3.5 w-3.5" /> Add source
          </button>
          <button type="button" onClick={() => void refetch()} className={actionBtn}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button type="button" onClick={() => navigate("/system/diagnostics")} className={actionBtn}>
            <ScrollText className="h-3.5 w-3.5" /> Open import logs
          </button>
        </div>
      </div>

      {message && (
        <p className="mb-2 rounded border border-border/25 bg-muted/50 px-2.5 py-1.5 text-[11px] text-foreground">{message}</p>
      )}

      {isEditing && (
        <div className="mb-3 grid gap-2 rounded-lg border border-border/20 bg-muted/30 p-3 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
          <Field label="Domain" asSelect options={DOMAINS} value={form.domain} onChange={(v) => setForm((p) => ({ ...p, domain: v as ImportDomain }))} />
          <Field label="Source type" asSelect options={SOURCE_TYPES} value={form.sourceType} onChange={(v) => setForm((p) => ({ ...p, sourceType: v as ImportSourceType }))} />
          <Field label="Path" value={form.path} onChange={(v) => setForm((p) => ({ ...p, path: v }))} className="md:col-span-2" />
          <Field label="File pattern" value={form.filePattern} onChange={(v) => setForm((p) => ({ ...p, filePattern: v }))} />
          <Field label="Archive path" value={form.archivePath ?? ""} onChange={(v) => setForm((p) => ({ ...p, archivePath: v }))} />
          <Field label="Error path" value={form.errorPath ?? ""} onChange={(v) => setForm((p) => ({ ...p, errorPath: v }))} />
          <label className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 accent-primary" />
            Active
          </label>
          <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
            <button type="button" onClick={handleSave} disabled={isSaving} className={`${actionBtn} border-success/30 text-success hover:bg-success/10`}>
              {isSaving ? "Saving…" : editingId === "new" ? "Create source" : "Save changes"}
            </button>
            <button type="button" onClick={resetForm} className={actionBtn}>Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border/15">
        <table className="w-full min-w-[720px] text-left text-[11px]">
          <thead className="border-b border-border/20 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2.5 py-2">Name</th>
              <th className="px-2.5 py-2">Domain</th>
              <th className="px-2.5 py-2">Source type</th>
              <th className="px-2.5 py-2">Path</th>
              <th className="px-2.5 py-2">File pattern</th>
              <th className="px-2.5 py-2">Active</th>
              <th className="px-2.5 py-2">Last checked</th>
              <th className="px-2.5 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && sources.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Loading import sources…</td></tr>
            ) : sources.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No import sources configured.</td></tr>
            ) : (
              sources.map((row) => (
                <tr key={row.id} className="border-b border-border/10 hover:bg-muted/30">
                  <td className="px-2.5 py-2 font-semibold text-foreground">{row.name}</td>
                  <td className="px-2.5 py-2 text-muted-foreground">{DOMAINS.find((d) => d.value === row.domain)?.label ?? row.domain}</td>
                  <td className="px-2.5 py-2 text-muted-foreground">{row.sourceType}</td>
                  <td className="max-w-[180px] truncate px-2.5 py-2 font-mono text-[10px] text-foreground" title={row.path}>{row.path}</td>
                  <td className="px-2.5 py-2 font-mono text-[10px]">{row.filePattern}</td>
                  <td className="px-2.5 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${row.isActive ? "bg-success/12 text-success" : "bg-muted text-muted-foreground"}`}>
                      {row.isActive ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 text-muted-foreground">{formatLastChecked(row.lastCheckedAt)}</td>
                  <td className="px-2.5 py-2">
                    <div className="flex justify-end gap-1">
                      <button type="button" title="Edit" onClick={() => startEdit(row)} className={actionBtn}><Pencil className="h-3 w-3" /></button>
                      <button type="button" title={row.isActive ? "Disable" : "Enable"} onClick={() => void handleDisable(row)} className={actionBtn}><Power className="h-3 w-3" /></button>
                      <button type="button" title="Archive" onClick={() => void handleArchive(row)} className={actionBtn}><Archive className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  asSelect,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  asSelect?: boolean;
  options?: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
      {asSelect ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded border border-input bg-card px-2 text-[11px] outline-none focus:ring-2 focus:ring-ring/20">
          {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded border border-input bg-card px-2 text-[11px] outline-none focus:ring-2 focus:ring-ring/20" />
      )}
    </label>
  );
}
