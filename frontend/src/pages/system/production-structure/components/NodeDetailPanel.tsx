import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { Database, Check, Pencil } from "lucide-react";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { ENTITY_CONFIG, TYPE_TITLES, formatStatusLabel, countEntityTypes, CHILD_TYPE_MAP } from "../config";
import { theme } from "@/styles/themeTokens";
import { DetailSection } from "./DetailSection";
import { RESOURCE_GROUP_QUERY } from "@/graphql/manufacturingQueries";
import { UPDATE_RESOURCE_GROUP, DELETE_RESOURCE_GROUP } from "@/graphql/dataManagementMutations";

export interface NodeDetailPanelProps {
  selectedNode: DataManagementTreeChild | null;
  selectedNodeKey?: string | null;
  selectedPath?: DataManagementTreeChild[];
  contextCounts?: Record<string, number> | null;
  workspaceMode: "view" | "edit" | "create";
  onAddChild?: () => void;
  onSave?: (data: Record<string, string>) => void;
}

export function NodeDetailPanel({
  selectedNode,
  selectedNodeKey,
  selectedPath,
  contextCounts,
  workspaceMode,
  onAddChild,
  onSave,
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
    return <EditContent node={selectedNode} onSave={onSave} />;
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
    <div>
      <DetailSection title="Summary" bodyClass="px-0 py-0" icon={ENTITY_CONFIG[node.type]?.icon && (
        <span className={`flex h-4 w-4 items-center justify-center rounded ${ENTITY_CONFIG[node.type].color}`}>
          {React.createElement(ENTITY_CONFIG[node.type].icon, { className: "h-2.5 w-2.5 stroke-current" })}
        </span>
      )}>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-2">
          <div className="col-span-2 xl:col-span-3">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Name</span>
            <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">{node.name}</div>
          </div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Type</span><div className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{title}</div></div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Code</span><div className="text-[14px] font-mono font-medium text-slate-700 dark:text-slate-200">{node.code || "\u2014"}</div></div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Status</span>
            <div className={`inline-flex items-center gap-1.5 text-[14px] font-medium ${node.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${node.status === "active" ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-500"}`} />
              {statusLabel}
            </div>
          </div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Children</span><div className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{node.children?.length ?? 0}</div></div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Descendants</span><div className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{node.childCount ?? 0}</div></div>
        </div>
      </DetailSection>

      <DetailSection title="Structure Position" bodyClass="px-0 py-0">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-2">
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Parent</span><div className="text-[14px] font-medium text-slate-700 dark:text-slate-200 truncate">{parentNode?.name || "\u2014"}</div></div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Depth</span><div className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{depth}</div></div>
          <div className="col-span-2 xl:col-span-3"><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Path</span><div className="text-[13px] font-medium text-slate-500 dark:text-slate-400 truncate" title={pathLabels}>{pathLabels || "\u2014"}</div></div>
        </div>
      </DetailSection>

      {(
        node.type === "plant" || node.type === "productionLine" || node.type === "line" ||
        node.type === "department" || node.type === "resourceGroup" || node.type === "group" ||
        node.type === "resource"
      ) && (
        <DetailSection title="Working Schedule" bodyClass="px-0 py-0">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-2">
            <div className="col-span-2 xl:col-span-3">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Shift Pattern</span>
              <div className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{node.shiftPatternName || "\u2014"}</div>
            </div>
            <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Schedule Status</span>
              <div className={`text-[14px] font-medium flex items-center gap-1 ${!node.scheduleStatus || node.scheduleStatus === "Missing schedule" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                <span className={`inline-block h-2 w-2 rounded-full ${!node.scheduleStatus || node.scheduleStatus === "Missing schedule" ? "bg-amber-500" : "bg-emerald-500"}`} />
                {node.scheduleStatus || "Missing Schedule"}
              </div>
            </div>
            {node.scheduleSource && (
              <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Schedule Source</span>
                <div className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{node.scheduleSource}</div>
              </div>
            )}
          </div>
        </DetailSection>
      )}

      {(hierarchyMix.plants > 0 || hierarchyMix.lines > 0 || hierarchyMix.departments > 0 || hierarchyMix.groups > 0 || hierarchyMix.resources > 0) && (
        <DetailSection title="Hierarchy Mix" bodyClass="px-0 py-0">
          <div className="flex flex-wrap gap-2">
            {hierarchyMix.plants > 0 && <MiniChip icon={ENTITY_CONFIG.plant.icon} value={String(hierarchyMix.plants)} label="Plants" color="text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10" />}
            {hierarchyMix.lines > 0 && <MiniChip icon={ENTITY_CONFIG.productionLine.icon} value={String(hierarchyMix.lines)} label="Lines" color="text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10" />}
            {hierarchyMix.departments > 0 && <MiniChip icon={ENTITY_CONFIG.department.icon} value={String(hierarchyMix.departments)} label="Depts" color="text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10" />}
            {hierarchyMix.groups > 0 && <MiniChip icon={ENTITY_CONFIG.resourceGroup.icon} value={String(hierarchyMix.groups)} label="Groups" color="text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10" />}
            {hierarchyMix.resources > 0 && <MiniChip icon={ENTITY_CONFIG.resource.icon} value={String(hierarchyMix.resources)} label="Resources" color="text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10" />}
          </div>
        </DetailSection>
      )}

      {node.children && node.children.length > 0 && (
        <DetailSection title="Direct Children" bodyClass="px-0 py-0" headerChildren={<span className="text-[13px] font-normal text-slate-400">{node.children.length}</span>}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {node.children.map((child) => {
              const childCfg = ENTITY_CONFIG[child.type] || ENTITY_CONFIG.resource;
              const ChildIcon = childCfg.icon;
              return (
                <div key={child.id} className="flex items-center gap-2 px-0 py-1.5 text-[15px] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${childCfg.color}`}>
                    <ChildIcon className="h-3 w-3 stroke-current" />
                  </span>
                  <span className="flex-1 font-medium text-slate-700 dark:text-slate-200 truncate">{child.name}</span>
                  {child.code && <span className="text-[11px] font-mono text-slate-400">{child.code}</span>}
                  <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${child.status === "active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                  <span className="text-[13px] text-slate-400 dark:text-slate-500">{TYPE_TITLES[child.type] || child.type}</span>
                </div>
              );
            })}
          </div>
        </DetailSection>
      )}

      <DetailSection title="Related Configuration">
        <div className="flex items-center justify-between h-9 text-[13px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 stroke-current shrink-0" />
            <span>No configuration links for this entity yet.</span>
          </div>
          <button type="button" onClick={() => navigate("/system/production-structure/references")} className="text-[13px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors shrink-0">
            Configure
          </button>
        </div>
      </DetailSection>

      {(() => {
        const childType = CHILD_TYPE_MAP[node.type];
        const actions: { label: string; desc: string; isAdd?: boolean; route?: string }[] = [];
        if (childType) actions.push({ label: `Add ${childType}`, desc: `Create a new ${childType.toLowerCase()} under this entity`, isAdd: true });
        if (node.type === "plant" || node.type === "productionLine" || node.type === "line") actions.push({ label: "Link Schedule", desc: "Associate a production schedule", route: "/system/production-structure/references/production_calendar" });
        if (node.type === "resourceGroup" || node.type === "group") {
          actions.push({ label: "Link Schedule", desc: "Associate a production schedule", route: "/system/production-structure/references/production_calendar" });
          actions.push({ label: "Assign Skills", desc: "Assign required skills to this group", route: "/system/production-structure/references" });
        }
        if (node.type === "department") actions.push({ label: "Link Resources", desc: "Link equipment or personnel", route: "/system/production-structure/references" });
        if (actions.length === 0) return null;
        return (
          <DetailSection title="Configuration Shortcuts">
            <div className="space-y-1">
              {actions.map((a) => (
                <div key={a.label} className="flex items-center justify-between min-h-10 text-[14px] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors rounded px-2">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-700 dark:text-slate-200">{a.label}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">{a.desc}</div>
                  </div>
                  <button type="button" onClick={() => { if (a.isAdd && onAddChild) onAddChild(); else if (a.route) navigate(a.route); }} className="shrink-0 h-6 px-2 rounded text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors">
                    {a.isAdd ? "Create" : "Open"}
                  </button>
                </div>
              ))}
            </div>
          </DetailSection>
        );
      })()}
    </div>
  );
}

/* ── Edit Mode ── */

function EditContent({ node, onSave }: { node: DataManagementTreeChild; onSave?: (data: Record<string, string>) => void }) {
  if (node.type === "resourceGroup" || node.type === "group") {
    return <ResourceGroupEditContent node={node} onSave={onSave} />;
  }

  const title = TYPE_TITLES[node.type] || node.type;
  const statusLabel = formatStatusLabel(node.status);
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-amber-200/50 dark:border-amber-500/15 bg-amber-50/20 dark:bg-amber-500/5 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400">
        Editing {title}
      </div>
      <DetailSection title={`${title} Fields`} bodyClass="px-0 py-0">
        <div className="space-y-2">
          <Field label="Name" defaultValue={node.name} />
          <Field label="Code" defaultValue={node.code || ""} />
          <Field label="Status" defaultValue={statusLabel} />
        </div>
      </DetailSection>
    </div>
  );
}

/* ── Resource Group Details / Edit Mode ── */

const GROUP_TYPE_OPTIONS = ["Production", "Support", "Management", "Quality", "Logistics"];

function ResourceGroupEditContent({ node, onSave }: { node: DataManagementTreeChild; onSave?: (data: Record<string, string>) => void }) {
  const { data, loading } = useQuery<{ resourceGroup: {
    id: string; code: string; name: string; groupType: string; status: string;
    members: number; leader: string; departmentId?: string | null;
    departmentName: string; plantName: string; resourceCount: number;
  } }>(RESOURCE_GROUP_QUERY, { variables: { id: node.id } });
  const [updateMutation, { loading: saving }] = useMutation(UPDATE_RESOURCE_GROUP);
  const [deleteMutation, { loading: deleting }] = useMutation(DELETE_RESOURCE_GROUP);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const group = data?.resourceGroup;

  useEffect(() => {
    if (group && !initialized) {
      setForm({
        name: group.name,
        code: group.code || "",
        groupType: group.groupType,
        leader: group.leader || "",
        members: String(group.members ?? ""),
        status: group.status,
      });
      setInitialized(true);
    }
  }, [group, initialized]);

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!form.name?.trim()) { setSaveError("Name is required"); return; }
    setSaveError(null);
    try {
      const members = form.members ? parseInt(form.members, 10) : undefined;
      await updateMutation({
        variables: {
          id: node.id,
          input: {
            name: form.name,
            code: form.code || "",
            status: form.status || "active",
            groupType: form.groupType || "Production",
            members: members && !isNaN(members) ? members : undefined,
            leader: form.leader || "",
          },
        },
      });
      setIsEditing(false);
    } catch {
      setSaveError("Failed to save resource group.");
    }
  };

  const handleDelete = async () => {
    setSaveError(null);
    try {
      await deleteMutation({ variables: { id: node.id } });
      onSave?.({});
    } catch {
      setSaveError("Failed to delete resource group.");
      setDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-xs text-slate-400 dark:text-slate-500">
        Loading resource group data...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center py-12 text-xs text-red-500">
        Resource group not found.
      </div>
    );
  }

  return (
    <div>
      <div className={`flex items-center gap-2 border-b px-3 py-1.5 text-xs ${
        isEditing
          ? "border-amber-200/50 dark:border-amber-500/15 bg-amber-50/20 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400"
          : "border-sky-200/50 dark:border-sky-500/15 bg-sky-50/20 dark:bg-sky-500/5 text-sky-600 dark:text-sky-400"
      }`}>
        {isEditing ? "Editing Resource Group" : "Resource Group Details"}
      </div>
      <DetailSection title="Resource Group Fields" bodyClass="px-0 py-0">
        <div className="space-y-2">
          {isEditing ? (
            <>
              <InlineField label="Name" value={form.name ?? ""} onChange={(v) => update("name", v)} required />
              <InlineField label="Code" value={form.code ?? ""} onChange={(v) => update("code", v)} />
              <ReadOnlyField label="Department" value={group.departmentName || "\u2014"} />
              <ReadOnlyField label="Plant" value={group.plantName || "\u2014"} />
              <InlineSelect label="Type" value={form.groupType ?? ""} onChange={(v) => update("groupType", v)} options={GROUP_TYPE_OPTIONS} />
              <InlineField label="Leader" value={form.leader ?? ""} onChange={(v) => update("leader", v)} />
              <InlineField label="Members" value={form.members ?? ""} onChange={(v) => update("members", v)} type="number" />
              <InlineSelect label="Status" value={form.status ?? ""} onChange={(v) => update("status", v)} options={["active", "inactive"]} />
              <ReadOnlyField label="Resources" value={String(group.resourceCount)} />
            </>
          ) : (
            <>
              <ReadOnlyField label="Name" value={group.name} />
              <ReadOnlyField label="Code" value={group.code || "\u2014"} />
              <ReadOnlyField label="Department" value={group.departmentName || "\u2014"} />
              <ReadOnlyField label="Plant" value={group.plantName || "\u2014"} />
              <ReadOnlyField label="Type" value={group.groupType} />
              <ReadOnlyField label="Leader" value={group.leader || "\u2014"} />
              <ReadOnlyField label="Members" value={String(group.members)} />
              <ReadOnlyField label="Status" value={group.status} />
              <ReadOnlyField label="Resources" value={String(group.resourceCount)} />
            </>
          )}

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {saveError}
            </div>
          )}

          {deleteConfirm && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/20 dark:bg-red-500/10">
              <p className="text-xs text-red-600 dark:text-red-400 mb-2">Delete this resource group? This action cannot be undone.</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
                <button type="button" onClick={() => setDeleteConfirm(false)}
                  className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {isEditing ? (
              <>
                <button type="button" onClick={handleSave} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
                  <Check className="h-3.5 w-3.5 stroke-current" />
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button type="button" onClick={() => {
                  setForm({
                    name: group.name,
                    code: group.code || "",
                    groupType: group.groupType,
                    leader: group.leader || "",
                    members: String(group.members ?? ""),
                    status: group.status,
                  });
                  setIsEditing(false);
                  setSaveError(null);
                }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                  <Pencil className="h-3.5 w-3.5 stroke-current" />
                  Edit
                </button>
                <button type="button" onClick={() => setDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors">
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </DetailSection>
    </div>
  );
}

/* ── Create Mode ── */

function CreateContent({ node }: { node: DataManagementTreeChild }) {
  const childType = TYPE_TITLES[CHILD_TYPE_MAP[node.type]] || CHILD_TYPE_MAP[node.type] || "Child";
  const parentTitle = TYPE_TITLES[node.type] || node.type;

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-sky-200/50 dark:border-sky-500/15 bg-sky-50/20 dark:bg-sky-500/5 px-3 py-1.5 text-xs text-sky-600 dark:text-sky-400">
        Creating new {childType} under {node.name}
      </div>
      <DetailSection title={`New ${childType}`} bodyClass="px-0 py-0">
        <div className="space-y-2">
          <Field label="Name" defaultValue="" placeholder={`Enter ${childType} name`} />
          <Field label="Code" defaultValue="" placeholder={`Enter ${childType} code`} />
        </div>
      </DetailSection>
      <DetailSection title="Parent Context" bodyClass="px-0 py-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[15px]">
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Parent</span><div className="font-medium text-slate-700 dark:text-slate-200">{node.name}</div></div>
          <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Type</span><div className="font-medium text-slate-700 dark:text-slate-200">{parentTitle}</div></div>
          {node.code && <div><span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">Code</span><div className="font-mono font-medium text-slate-500 dark:text-slate-400">{node.code}</div></div>}
        </div>
      </DetailSection>
    </div>
  );
}

/* ── Sub-components ── */

function Field({ label, defaultValue, placeholder }: { label: string; defaultValue: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">{label}</label>
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder || label}
        className={`w-full h-7 rounded border px-2 text-[14px] outline-none transition-colors ${theme.input} ${theme.focusRing}`}
      />
    </div>
  );
}

function InlineField({ label, value, onChange, placeholder, type, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className={`w-full h-7 rounded border px-2 text-[14px] outline-none transition-colors ${theme.input} ${theme.focusRing}`}
      />
    </div>
  );
}

function InlineSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-7 rounded border px-2 text-[14px] outline-none transition-colors cursor-pointer ${theme.input} ${theme.focusRing}`}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
        ))}
      </select>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">{label}</label>
      <div className="h-7 flex items-center text-[14px] font-medium text-slate-700 dark:text-slate-200 px-2 rounded bg-slate-50 dark:bg-slate-800/50">
        {value}
      </div>
    </div>
  );
}

function MiniChip({ icon: Icon, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[13px] font-medium ${color}`}>
      <Icon className="h-2.5 w-2.5 stroke-current" /> {value}{" "}
      <span className="opacity-60">{label}</span>
    </span>
  );
}
