import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, Save, RotateCcw, Check, ChevronDown } from "lucide-react";
import { theme } from "../../../styles/themeTokens";
import { useEntityVisualSettings } from "./hooks/useEntityVisualSettings";
import { EntityVisualPreview } from "./components/EntityVisualPreview";
import { getIconByKey, ALLOWED_ICON_KEYS, getIconLabel } from "../../../config/iconRegistry";
import { ALLOWED_COLOR_KEYS, getColorTokens } from "../../../config/entityColorRegistry";
import { PageHeader } from "@/pages/shared/PageHeader";

type EditState = Record<string, { displayLabel: string; iconKey: string; colorKey: string; description: string; isActive: boolean }>;

export function EntityVisualSettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSetting, resetSetting } = useEntityVisualSettings();
  const [editState, setEditState] = useState<EditState>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [openIconDropdown, setOpenIconDropdown] = useState<string | null>(null);
  const [openColorDropdown, setOpenColorDropdown] = useState<string | null>(null);

  const localState = useMemo(() => {
    const result: EditState = {};
    for (const s of settings) {
      result[s.entityType] = editState[s.entityType] || {
        displayLabel: s.displayLabel,
        iconKey: s.iconKey,
        colorKey: s.colorKey,
        description: s.description || "",
        isActive: s.isActive,
      };
    }
    return result;
  }, [settings, editState]);

  const setField = useCallback((entityType: string, field: string, value: string | boolean) => {
    setEditState((prev) => ({
      ...prev,
      [entityType]: { ...(prev[entityType] || localState[entityType]), [field]: value },
    }));
  }, [localState]);

  const handleSave = async (entityType: string) => {
    const e = editState[entityType];
    if (!e) return;
    setSaving(entityType);
    const ok = await updateSetting(entityType, {
      displayLabel: e.displayLabel,
      iconKey: e.iconKey,
      colorKey: e.colorKey,
      description: e.description || undefined,
      isActive: e.isActive,
    });
    setSaving(null);
    if (ok) {
      setEditState((prev) => { const n = { ...prev }; delete n[entityType]; return n; });
      setToast({ message: `${e.displayLabel} saved`, type: "success" });
      setTimeout(() => setToast(null), 2000);
    } else {
      setToast({ message: "Save failed", type: "error" });
    }
  };

  const handleReset = async (entityType: string) => {
    const ok = await resetSetting(entityType);
    if (ok) {
      setEditState((prev) => { const n = { ...prev }; delete n[entityType]; return n; });
      setToast({ message: "Reset to default", type: "success" });
      setTimeout(() => setToast(null), 2000);
    }
  };

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <PageHeader
        icon={<svg className="h-5 w-5 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>}
        iconClass={theme.iconBoxSubtle}
        title="Entity Visual Settings"
        subtitle="Configure icons, colors, and labels for manufacturing entity types."
      >
        <button type="button" onClick={() => navigate("/system/production-structure")}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/60">
          <X className="h-4 w-4 stroke-current" />Close
        </button>
      </PageHeader>

      {toast && (
        <div className={`mx-6 mt-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
          toast.type === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
        }`}>{toast.message}</div>
      )}

      <div className={`flex-1 overflow-y-auto ${theme.page} p-4`}>
        <div className={`rounded-xl border overflow-hidden ${theme.card}`}>
          <table className="w-full text-xs">
            <thead>
              <tr className={`border-b text-[10px] font-semibold uppercase tracking-wider ${theme.textMuted} ${theme.subHeader}`}>
                <th className="px-4 py-2.5 text-left w-36">Entity</th>
                <th className="px-4 py-2.5 text-left">Display Label</th>
                <th className="px-4 py-2.5 text-left w-40">Icon</th>
                <th className="px-4 py-2.5 text-left w-36">Color</th>
                <th className="px-4 py-2.5 text-left">Description</th>
                <th className="px-4 py-2.5 text-center w-16">Active</th>
                <th className="px-4 py-2.5 text-center w-36">Preview</th>
                <th className="px-4 py-2.5 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => {
                const e = localState[s.entityType];
                const tokens = getColorTokens(e.colorKey);
                const isRowDirty = !!editState[s.entityType];
                const isSaving = saving === s.entityType;
                return (
                  <tr key={s.entityType} className={`border-b last:border-b-0 border-slate-100 dark:border-slate-800 ${theme.interactiveRow}`}>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono text-[10px] font-medium ${theme.textMuted}`}>{s.entityType}</span>
                      {s.isSystem && <span className="ml-1.5 text-[8px] text-slate-400 uppercase">system</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={e.displayLabel}
                        onChange={(v) => setField(s.entityType, "displayLabel", v.target.value)}
                        className={`w-full rounded border bg-transparent px-2 py-1 text-xs ${theme.input} ${theme.focusRing}`}
                      />
                    </td>
                    <td className="px-4 py-2.5 relative">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenIconDropdown(openIconDropdown === s.entityType ? null : s.entityType)}
                          className="flex w-full items-center gap-2 rounded border bg-transparent px-2 py-1 text-xs cursor-pointer"
                        >
                          {(() => { const I = getIconByKey(e.iconKey); return <I className="h-4 w-4 stroke-current" />; })()}
                          <span className="flex-1 text-left">{getIconLabel(e.iconKey)}</span>
                          <ChevronDown className="h-3 w-3 stroke-current text-slate-400" />
                        </button>
                        {openIconDropdown === s.entityType && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenIconDropdown(null)} />
                            <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border bg-white p-2 shadow-lg dark:bg-slate-900 dark:border-slate-700 max-h-48 overflow-y-auto">
                              <div className="grid grid-cols-3 gap-1">
                                {ALLOWED_ICON_KEYS.map((ik) => {
                                  const I = getIconByKey(ik);
                                  const isSelected = e.iconKey === ik;
                                  return (
                                    <button
                                      key={ik}
                                      type="button"
                                      onClick={() => { setField(s.entityType, "iconKey", ik); setOpenIconDropdown(null); }}
                                      className={`flex flex-col items-center gap-0.5 rounded-md p-1.5 text-[9px] transition-colors ${
                                        isSelected ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                      }`}
                                    >
                                      <I className="h-4 w-4 stroke-current text-slate-600 dark:text-slate-300" />
                                      <span className="text-slate-500 dark:text-slate-400">{getIconLabel(ik)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 relative">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenColorDropdown(openColorDropdown === s.entityType ? null : s.entityType)}
                          className="flex w-full items-center gap-2 rounded border bg-transparent px-2 py-1 text-xs cursor-pointer"
                        >
                          <span className={`inline-block h-4 w-4 rounded ${tokens.bg} ${tokens.darkBg}`} />
                          <span className="flex-1 text-left capitalize">{e.colorKey}</span>
                          <ChevronDown className="h-3 w-3 stroke-current text-slate-400" />
                        </button>
                        {openColorDropdown === s.entityType && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenColorDropdown(null)} />
                            <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border bg-white p-2 shadow-lg dark:bg-slate-900 dark:border-slate-700">
                              <div className="grid grid-cols-2 gap-1">
                                {ALLOWED_COLOR_KEYS.map((ck) => {
                                  const ct = getColorTokens(ck);
                                  const isSelected = e.colorKey === ck;
                                  return (
                                    <button
                                      key={ck}
                                      type="button"
                                      onClick={() => { setField(s.entityType, "colorKey", ck); setOpenColorDropdown(null); }}
                                      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] transition-colors ${
                                        isSelected ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                      }`}
                                    >
                                      <span className={`inline-block h-3 w-3 rounded ${ct.bg} ${ct.darkBg}`} />
                                      <span className="capitalize text-slate-600 dark:text-slate-300">{ck}</span>
                                      {isSelected && <Check className="h-2.5 w-2.5 stroke-current text-slate-500 ml-auto" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={e.description}
                        onChange={(v) => setField(s.entityType, "description", v.target.value)}
                        placeholder="Description..."
                        className={`w-full rounded border bg-transparent px-2 py-1 text-xs ${theme.input} ${theme.focusRing}`}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => setField(s.entityType, "isActive", !e.isActive)}
                        disabled={s.isSystem}
                        className={`inline-flex h-5 w-9 rounded-full transition-colors ${
                          e.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                        } ${s.isSystem ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          e.isActive ? "translate-x-4.5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <EntityVisualPreview iconKey={e.iconKey} colorKey={e.colorKey} label={e.displayLabel} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSave(s.entityType)}
                          disabled={!isRowDirty || isSaving}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isSaving ? "..." : <Save className="h-3 w-3 stroke-current" />}
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReset(s.entityType)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <RotateCcw className="h-3 w-3 stroke-current" /> Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
