import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, Activity, Circle, X, Database } from "lucide-react";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { ENTITY_CONFIG, TYPE_TITLES, formatStatusLabel, countActiveInactive, countEntityTypes, CHILD_TYPE_MAP } from "../config";
import { theme } from "@/styles/themeTokens";

export interface NodeDetailPanelProps {
  selectedNode: DataManagementTreeChild | null;
  selectedNodeKey?: string | null;
  selectedPath?: DataManagementTreeChild[];
  contextCounts?: Record<string, number> | null;
  workspaceMode: "view" | "edit" | "create";
  onAddChild?: () => void;
}

export function NodeDetailPanel({
  selectedNode,
  selectedNodeKey,
  selectedPath,
  contextCounts,
  workspaceMode,
  onAddChild,
}: NodeDetailPanelProps) {
  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
          <Database className="h-4 w-4 stroke-current text-slate-300" />
        </div>
        <span className="text-sm font-semibold text-slate-400">No node selected</span>
        <span className="text-xs text-slate-400">Select a node from the production tree</span>
      </div>
    );
  }

  if (workspaceMode === "edit") {
    return <EditContent node={selectedNode} />;
  }

  if (workspaceMode === "create") {
    return <CreateContent node={selectedNode} />;
  }

  return <ViewContent node={selectedNode} nodeKey={selectedNodeKey} path={selectedPath} contextCounts={contextCounts} onAddChild={onAddChild} />;
}

/* ── View Mode ── */

function ViewContent({
  node,
  nodeKey,
  path,
  contextCounts,
  onAddChild,
}: {
  node: DataManagementTreeChild;
  nodeKey?: string | null;
  path?: DataManagementTreeChild[];
  contextCounts?: Record<string, number> | null;
  onAddChild?: () => void;
}) {
  const title = TYPE_TITLES[node.type] || node.type;
  const statusLabel = formatStatusLabel(node.status);
  const activeInactive = useMemo(() => countActiveInactive(node), [node]);
  const hierarchyMix = useMemo(() => {
    if (contextCounts) return contextCounts;
    const counts = countEntityTypes(node);
    return {
      plants: counts.plant || 0,
      lines: counts.productionLine || counts.line || 0,
      departments: counts.department || 0,
      groups: counts.resourceGroup || counts.group || 0,
      resources: counts.resource || 0,
    };
  }, [node, contextCounts]);
  const navigate = useNavigate();
  const depth = nodeKey ? nodeKey.split("/").length : 0;
  const parentNode = path && path.length > 1 ? path[path.length - 2] : null;
  const pathLabels = path ? path.map((n) => n.name).join("  \u203a  ") : "";

  return (
    <div className="space-y-1.5">
      {/* Summary Grid */}
      <section className="rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
          {ENTITY_CONFIG[node.type]?.icon && (
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${ENTITY_CONFIG[node.type].color}`}>
              {React.createElement(ENTITY_CONFIG[node.type].icon, { className: "h-2.5 w-2.5 stroke-current" })}
            </span>
          )}
          Summary
        </div>
        <div className="p-2.5 grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
          <div className="col-span-2 lg:col-span-3">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Name</span>
            <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug">{node.name}</div>
          </div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Type</span><div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{title}</div></div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Code</span><div className="text-[13px] font-mono font-medium text-slate-700 dark:text-slate-200">{node.code || "\u2014"}</div></div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Status</span>
            <div className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${node.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${node.status === "active" ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-500"}`} />
              {statusLabel}
            </div>
          </div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Children</span><div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{node.children?.length ?? 0}</div></div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Descendants</span><div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{node.childCount ?? 0}</div></div>
        </div>
      </section>

      {/* Structure Position */}
      <section className="rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
          Structure Position
        </div>
        <div className="p-2.5 space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 w-12 shrink-0">Parent</span>
            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{parentNode?.name || "\u2014"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 w-12 shrink-0">Depth</span>
            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{depth}</span>
          </div>
          {pathLabels && (
            <div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Path</span>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{pathLabels}</div>
            </div>
          )}
        </div>
      </section>

      {/* Status Chips */}
      {((node.children?.length ?? 0) > 0 || (node.childCount ?? 0) > 0) && (
        <div className="flex items-center gap-1 flex-wrap">
          {(node.children?.length ?? 0) > 0 && <MetaChip icon={GitBranch} value={String(node.children!.length)} label="direct" color="text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10" />}
          {(node.childCount ?? 0) > 0 && <MetaChip icon={Activity} value={String(node.childCount)} label="total" color="text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10" />}
          {activeInactive.active > 0 && <MetaChip icon={Circle} value={String(activeInactive.active)} label="active" color="text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10" />}
          {activeInactive.inactive > 0 && <MetaChip icon={X} value={String(activeInactive.inactive)} label="inactive" color="text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10" />}
        </div>
      )}

      {/* Hierarchy Mix */}
      {(hierarchyMix.plants > 0 || hierarchyMix.lines > 0 || hierarchyMix.departments > 0 || hierarchyMix.groups > 0 || hierarchyMix.resources > 0) && (
        <section className="rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
            Hierarchy Mix
          </div>
          <div className="p-2.5 flex items-center gap-1.5 flex-wrap">
            {hierarchyMix.plants > 0 && <MiniChip icon={ENTITY_CONFIG.plant.icon} value={String(hierarchyMix.plants)} label="Plants" color="text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10" />}
            {hierarchyMix.lines > 0 && <MiniChip icon={ENTITY_CONFIG.productionLine.icon} value={String(hierarchyMix.lines)} label="Lines" color="text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10" />}
            {hierarchyMix.departments > 0 && <MiniChip icon={ENTITY_CONFIG.department.icon} value={String(hierarchyMix.departments)} label="Depts" color="text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10" />}
            {hierarchyMix.groups > 0 && <MiniChip icon={ENTITY_CONFIG.resourceGroup.icon} value={String(hierarchyMix.groups)} label="Groups" color="text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10" />}
            {hierarchyMix.resources > 0 && <MiniChip icon={ENTITY_CONFIG.resource.icon} value={String(hierarchyMix.resources)} label="Resources" color="text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10" />}
          </div>
        </section>
      )}

      {/* Direct Children */}
      {node.children && node.children.length > 0 && (
        <section className="rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <span>Direct Children</span>
            <span className="text-[10px] font-normal text-slate-400">{node.children.length}</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50 max-h-48 overflow-y-auto">
            {node.children.map((child) => {
              const childCfg = ENTITY_CONFIG[child.type] || ENTITY_CONFIG.resource;
              const ChildIcon = childCfg.icon;
              return (
                <div key={child.id} className="flex items-center gap-2 px-2.5 py-1 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${childCfg.color}`}>
                    <ChildIcon className="h-3 w-3 stroke-current" />
                  </span>
                  <span className="flex-1 font-medium text-slate-700 dark:text-slate-200 truncate">{child.name}</span>
                  {child.code && <span className="text-[10px] font-mono text-slate-400">{child.code}</span>}
                  <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${child.status === "active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{TYPE_TITLES[child.type] || child.type}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Related Configuration — compact empty state */}
      <section className="rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
          Related Configuration
        </div>
        <div className="flex items-center gap-2 px-2.5 py-2 text-[11px] text-slate-400 dark:text-slate-500">
          <Database className="h-3.5 w-3.5 stroke-current shrink-0 text-slate-300" />
          <span>No configuration links for this entity yet.</span>
          <button type="button" onClick={() => navigate("/system/production-structure/references")} className="ml-auto text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors">
            Configure
          </button>
        </div>
      </section>

      {/* Quick Actions */}
      {(() => {
        const childType = CHILD_TYPE_MAP[node.type];
        const actions: { label: string; desc: string; isAdd?: boolean; route?: string }[] = [];
        if (childType) actions.push({ label: `Add ${childType}`, desc: `Create a new ${childType.toLowerCase()} under this entity`, isAdd: true });
        if (node.type === "plant" || node.type === "productionLine" || node.type === "line") actions.push({ label: "Link Schedule", desc: "Associate a production schedule", route: "/system/production-structure/references" });
        if (node.type === "resourceGroup" || node.type === "group") {
          actions.push({ label: "Link Schedule", desc: "Associate a production schedule", route: "/system/production-structure/references" });
          actions.push({ label: "Assign Skills", desc: "Assign required skills to this group", route: "/system/production-structure/references" });
        }
        if (node.type === "department") actions.push({ label: "Link Resources", desc: "Link equipment or personnel", route: "/system/production-structure/references" });
        if (actions.length === 0) return null;
        return (
          <section className="rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900">
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              Configuration Shortcuts
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {actions.map((a) => (
                <div key={a.label} className="flex items-center justify-between px-2.5 py-1.5 text-[12px] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-700 dark:text-slate-200">{a.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{a.desc}</div>
                  </div>
                  <button type="button" onClick={() => { if (a.isAdd && onAddChild) onAddChild(); else if (a.route) navigate(a.route); }} className="shrink-0 h-6 px-2 rounded text-[10px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                    {a.isAdd ? "Create" : "Open"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })()}
    </div>
  );
}

/* ── Edit Mode ── */

function EditContent({ node }: { node: DataManagementTreeChild }) {
  const title = TYPE_TITLES[node.type] || node.type;
  const statusLabel = formatStatusLabel(node.status);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-lg border border-amber-200/50 dark:border-amber-500/15 bg-amber-50/20 dark:bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400">
        Editing {title} \u2014 changes will be saved to the database.
      </div>
      <section className="rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
          {title} Fields
        </div>
        <div className="p-2.5 space-y-2">
          <Field label="Name" defaultValue={node.name} />
          <Field label="Code" defaultValue={node.code || ""} />
          <Field label="Status" defaultValue={statusLabel} />
        </div>
      </section>
    </div>
  );
}

/* ── Create Mode ── */

function CreateContent({ node }: { node: DataManagementTreeChild }) {
  const childType = TYPE_TITLES[CHILD_TYPE_MAP[node.type]] || CHILD_TYPE_MAP[node.type] || "Child";
  const parentTitle = TYPE_TITLES[node.type] || node.type;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-lg border border-sky-200/50 dark:border-sky-500/15 bg-sky-50/20 dark:bg-sky-500/5 px-2.5 py-1.5 text-xs text-sky-600 dark:text-sky-400">
        Creating new {childType} under {node.name}
      </div>
      <section className="rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
          New {childType}
        </div>
        <div className="p-2.5 space-y-2">
          <Field label="Name" defaultValue="" placeholder={`Enter ${childType} name`} />
          <Field label="Code" defaultValue="" placeholder={`Enter ${childType} code`} />
        </div>
      </section>
      <section className="rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
          Parent Context
        </div>
        <div className="p-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Parent</span><div className="font-medium text-slate-700 dark:text-slate-200">{node.name}</div></div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Type</span><div className="font-medium text-slate-700 dark:text-slate-200">{parentTitle}</div></div>
          {node.code && <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Code</span><div className="font-mono font-medium text-slate-500 dark:text-slate-400">{node.code}</div></div>}
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ── */

function Field({ label, defaultValue, placeholder }: { label: string; defaultValue: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">{label}</label>
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder || label}
        className={`w-full h-7 rounded border px-2 text-[12px] outline-none transition-colors ${theme.input} ${theme.focusRing}`}
      />
    </div>
  );
}

function MetaChip({ icon: Icon, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${color}`}>
      <Icon className="h-3 w-3 stroke-current" /> {value}{" "}
      <span className="text-[10px] font-medium opacity-70">{label}</span>
    </span>
  );
}

function MiniChip({ icon: Icon, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${color}`}>
      <Icon className="h-2.5 w-2.5 stroke-current" /> {value}{" "}
      <span className="opacity-60">{label}</span>
    </span>
  );
}
