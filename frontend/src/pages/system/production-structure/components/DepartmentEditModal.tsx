import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { X } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";
import { DEPARTMENT_QUERY } from "@/graphql/manufacturingQueries";
import { UPDATE_DEPARTMENT_MUTATION, DELETE_DEPARTMENT_MUTATION } from "@/graphql/departmentMutations";
import { getEntityIconProps, saveEntityConfig } from "../entityDisplay";
import { getIconByKey } from "../../../../config/iconRegistry";
import type { LucideIcon } from "lucide-react";
import { DepartmentSummary } from "./SummaryBlock";

interface DepartmentEditModalProps {
  departmentId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface DepartmentData {
  id: string;
  code: string;
  name: string;
  status: string;
  manager: string;
  employees: number;
  groupCount: number;
  resourceCount: number;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "select";
  options?: { label: string; value: string }[];
}

function Field({ label, value, onChange, required, placeholder, type, options }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className={`text-[11px] font-semibold uppercase tracking-wide ${theme.textSecondary}`}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {type === "select" && options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${theme.input}`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${theme.input}`}
        />
      )}
    </div>
  );
}

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const ICON_KEYS = ["layers", "component", "dumbbell", "landmark", "factory", "shield", "settings", "users"];

export function DepartmentEditModal({ departmentId, open, onClose, onSaved }: DepartmentEditModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("active");
  const [manager, setManager] = useState("");
  const [employees, setEmployees] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("layers");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, loading } = useQuery<{ department: DepartmentData }>(DEPARTMENT_QUERY, {
    variables: { id: departmentId },
    skip: !departmentId || !open,
    fetchPolicy: "network-only",
  });

  const [updateMutation] = useMutation(UPDATE_DEPARTMENT_MUTATION);
  const [deleteMutation] = useMutation(DELETE_DEPARTMENT_MUTATION);

  const dept = data?.department;
  const { textColor, bgColor } = getEntityIconProps("department", dept?.id ?? "");
  const IconComponent: LucideIcon = getIconByKey(selectedIcon);

  useEffect(() => {
    if (dept) {
      setName(dept.name);
      setCode(dept.code);
      setStatus(dept.status);
      setManager(dept.manager || "");
      setEmployees(String(dept.employees));
      setError(null);
      setConfirmDelete(false);
    }
  }, [dept]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (!code.trim()) { setError("Code is required"); return; }
    if (!departmentId) return;
    setSaving(true);
    setError(null);
    try {
      saveEntityConfig("department", departmentId, selectedIcon);
      const { data: res } = await updateMutation({
        variables: {
          id: departmentId,
          input: { name: name.trim(), code: code.trim(), status, manager: manager.trim() || undefined, employees: employees ? Number(employees) : undefined },
        },
      });
      if (res?.updateDepartment?.errors?.length) {
        setError(res.updateDepartment.errors.map((e: { message: string }) => e.message).join("; "));
        setSaving(false);
        return;
      }
      onSaved?.();
      onClose();
    } catch {
      setError("Failed to save department.");
    }
    setSaving(false);
  }, [departmentId, name, code, status, manager, employees, selectedIcon, updateMutation, onSaved, onClose]);

  const handleDelete = useCallback(async () => {
    if (!departmentId) return;
    setSaving(true);
    try {
      await deleteMutation({ variables: { id: departmentId } });
      onSaved?.();
      onClose();
    } catch {
      setError("Failed to delete department.");
    }
    setSaving(false);
  }, [departmentId, deleteMutation, onSaved, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative z-10 flex w-full max-w-2xl flex-col rounded-xl shadow-2xl border ${theme.modalBg} ${theme.modalBorder} max-h-[85vh]`}>
        {/* ── Header ── */}
        <div className={`flex items-center justify-between rounded-t-xl border-b px-5 py-3 ${theme.subHeader}`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgColor}`}>
              <IconComponent className={`h-4 w-4 ${textColor}`} />
            </span>
            <div>
              <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>Edit Department</h2>
              <p className={`text-[11px] ${theme.textMuted}`}>{dept?.code || "Loading..."}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className={`p-1.5 rounded-lg transition-colors ${theme.buttonGhost} ${saving ? "opacity-50" : ""}`}>
            <X className="h-4 w-4 stroke-current" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading && !dept ? (
            <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading department...</div>
          ) : error && !dept ? (
            <div className={`py-12 text-center text-sm ${theme.textCritical}`}>Failed to load department.</div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Icon & Color */}
              <div className="space-y-2">
                <label className={`text-[11px] font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Icon & Color</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_KEYS.map((key) => {
                    const Icon = getIconByKey(key);
                    const isSelected = selectedIcon === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedIcon(key)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/30"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name" value={name} onChange={setName} required placeholder="e.g. Assembly" />
                <Field label="Code" value={code} onChange={setCode} required placeholder="e.g. ASM" />
                <Field label="Status" value={status} onChange={setStatus} type="select" options={STATUS_OPTIONS} />
                <Field label="Manager" value={manager} onChange={setManager} placeholder="e.g. John Smith" />
                <Field label="Employees" value={employees} onChange={setEmployees} placeholder="e.g. 45" />
              </div>

              {/* Structure Summary */}
              {dept && (
                <div className="space-y-2">
                  <label className={`text-[11px] font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Structure Summary</label>
                  <DepartmentSummary groups={dept.groupCount} resources={dept.resourceCount} />
                </div>
              )}

              {/* Schedule Preview */}
              <div className={`rounded-lg border p-4 space-y-2 ${theme.card}`}>
                <label className={`text-[11px] font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Schedule Configuration</label>
                <div className={`text-xs ${theme.textMuted}`}>
                  Schedule inheritance is managed at the production line level.
                  Configure shifts and patterns on the related production line.
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={`flex items-center justify-between rounded-b-xl border-t px-5 py-3 ${theme.subHeader}`}>
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 dark:text-red-400">Confirm delete?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${theme.buttonSecondary}`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving || !dept}
                className={`rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10`}
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`rounded-lg border px-4 py-1.5 text-xs font-medium transition-colors ${theme.buttonSecondary} disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dept || !name.trim() || !code.trim()}
              className={`rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
