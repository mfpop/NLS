import { useState, useEffect, useCallback, useRef } from "react";
import { Component, Plus, RefreshCw, Save, X, Trash2 } from "lucide-react";
import { ResourceGroupDetailView } from "./components";
import type { ResourceGroupDetailViewHandle } from "./components/ResourceGroupDetailView";
import { useQuery, useMutation } from "@apollo/client/react";
import { DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY, RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { CREATE_RESOURCE_GROUP, UPDATE_RESOURCE_GROUP, DELETE_RESOURCE_GROUP } from "@/graphql/dataManagementMutations";
import { useSearchParams } from "react-router-dom";
import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage, type FormMode } from "./components/EntityWorkspacePage";
import { ConfirmDialog } from "./shared";
import { PageToolbar, ToolbarSearch, ToolbarButton } from "@/components/layout/PageToolbar";
import { LEFT_COLUMN_WIDTH_CLASS } from "@/components/layout/layoutWidths";
import { RecordListPanel } from "@/components/shared/RecordListPanel";
import { ENTITY_COLORS } from "./config/entityColors";

const col = ENTITY_COLORS.resourceGroup;

const PER_PAGE = 10;

type ListResult<T> = T[] | { items?: T[] };

interface ResourceGroupForm {
  name: string; code: string; description: string; statusId: string;
  groupTypeId: string; departmentId: string; leader: string; supervisor: string;
  members: string; capabilityType: string; shiftPatternId: string;
  capacityModel: string; oeeTarget: string; isBottleneck: boolean; isConstraint: boolean;
}

interface ResourceGroup {
  id: string; code?: string; name?: string; description?: string;
  status?: string; statusId?: string;
  departmentId?: string; departmentName?: string; plantName?: string;
  members?: number | string; leader?: string; supervisor?: string;
  groupTypeId?: string; capabilityType?: string; shiftPatternId?: string;
  capacityModel?: string; oeeTarget?: number | null; isBottleneck?: boolean; isConstraint?: boolean;
  resourceCount?: number; createdAt?: string; updatedAt?: string;
  groupTypeRef?: { id: string; name: string } | null;
  shiftPatternRef?: { id: string; name: string } | null;
}

interface Department { id: string; name: string; plantName?: string }

interface Resource {
  id: string; code?: string; name?: string; status?: string;
  resourceTypeId?: string; shiftPattern?: string; utilization?: number;
  opStatus?: string; departmentId?: string; departmentName?: string;
  resourceGroupId?: string;
}

interface MutationError { field?: string | null; code?: string; message: string }
interface ResourceGroupPayload { ok: boolean; resourceGroup?: ResourceGroup | null; errors?: MutationError[] }

interface ResourceGroupInput {
  departmentId: string; code: string; name: string; description: string;
  statusId: string; members: number; leader: string; supervisor: string;
  groupTypeId: string | null; capabilityType: string; shiftPatternId: string | null;
  capacityModel: string; oeeTarget: number | null; isBottleneck: boolean; isConstraint: boolean;
}

function listItems<T>(value: ListResult<T> | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

export function ResourceGroupsPage({ embeddedInFlow = false }: { embeddedInFlow?: boolean } = {}) {
  const { search, setSearch, statusFilter, setStatusFilter, setFooterContent, setToolbarVariant, showSystemMessage } = useToolbar();
  const registerActions = useRegisterActions();
  const [searchParams] = useSearchParams();
  const departmentFilterId = searchParams.get("departmentId") || "";
  const urlResourceGroupId = searchParams.get("resourceGroupId");

  const [mode, setMode] = useState<FormMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editState, setEditState] = useState({ dirty: false, valid: true, saving: false });

  const detailRef = useRef<ResourceGroupDetailViewHandle>(null);

  const { data, refetch: refetchRG } = useQuery<{ resourceGroups: ListResult<ResourceGroup> }>(RESOURCE_GROUPS_QUERY);
  const { data: departmentsData } = useQuery<{ departments: ListResult<Department> }>(DEPARTMENTS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: resourcesData } = useQuery<{ resources: ListResult<Resource> }>(RESOURCES_QUERY, {
    variables: { resourceGroupId: selectedId || undefined },
    skip: !selectedId, fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const [createRG] = useMutation<{ createResourceGroup: ResourceGroupPayload }, { input: ResourceGroupInput }>(CREATE_RESOURCE_GROUP);
  const [updateRG] = useMutation<{ updateResourceGroup: ResourceGroupPayload }, { id: string; input: ResourceGroupInput }>(UPDATE_RESOURCE_GROUP);
  const [deleteRG] = useMutation<{ archiveResourceGroup: ResourceGroupPayload }, { id: string }>(DELETE_RESOURCE_GROUP);

  const groups = listItems(data?.resourceGroups);
  const departments = listItems(departmentsData?.departments);
  const assignedResources = listItems(resourcesData?.resources);

  useEffect(() => {
    if (!embeddedInFlow || !urlResourceGroupId || groups.length === 0) return;
    const exists = groups.some((group) => group.id === urlResourceGroupId);
    if (!exists) return;
    setSelectedId(urlResourceGroupId);
    setMode("view");
  }, [embeddedInFlow, urlResourceGroupId, groups]);

  const filtered = groups.filter((g) => !departmentFilterId || g.departmentId === departmentFilterId)
    .filter((g) => statusFilter === "all" || g.status === statusFilter)
    .filter((g) => !search || (g.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const sel = selectedId ? groups.find((g) => g.id === selectedId) ?? null : null;

  useEffect(() => {
    if (mode !== "view") return;
    if (filtered.length === 0) return;
    if (selectedId && filtered.some((g) => g.id === selectedId)) return;
    setSelectedId(filtered[0].id);
  }, [filtered, selectedId, mode]);

  const hNew = useCallback(() => { setSelectedId(null); setMode("create"); setEditState({ dirty: false, valid: true, saving: false }); }, []);
  const hEdit = useCallback(() => { if (sel) setMode("edit"); }, [sel]);

  const hCancel = useCallback(() => {
    if (editState.dirty) { setConfirmCancel(true); return; }
    if (sel) { setMode("view"); }
  }, [editState.dirty, sel]);

  const discardChanges = useCallback(() => {
    setMode("view");
    setEditState({ dirty: false, valid: true, saving: false });
    setConfirmCancel(false);
  }, []);

  const hSave = useCallback(async () => {
    const ok = await detailRef.current?.save();
    if (ok) {
      await refetchRG();
      setMode("view");
      setEditState({ dirty: false, valid: true, saving: false });
    }
  }, [refetchRG]);

  const hDelete = useCallback(async () => {
    if (!confirmDelete) return;
    const result = await deleteRG({ variables: { id: confirmDelete } });
    const payload = result.data?.archiveResourceGroup;
    if (!payload?.ok) {
      const message = payload?.errors?.[0]?.message || "Resource group could not be archived.";
      showSystemMessage(message, "error");
      setConfirmDelete(null);
      return;
    }
    setSelectedId(null);
    await refetchRG();
    setConfirmDelete(null);
    showSystemMessage("Resource group archived", "success");
  }, [confirmDelete, deleteRG, refetchRG, showSystemMessage]);

  // ── Build save handler for the detail component ──
  const handleSaveResourceGroup = useCallback(async (form: ResourceGroupForm, id: string | null) => {
    const input: ResourceGroupInput = {
      departmentId: form.departmentId, code: form.code.trim(), name: form.name.trim(),
      description: form.description || "", statusId: form.statusId,
      members: Number(form.members) || 0, leader: form.leader || "",
      supervisor: form.supervisor || "", groupTypeId: form.groupTypeId || null,
      capabilityType: form.capabilityType || "SHARED",
      shiftPatternId: form.shiftPatternId || null,
      capacityModel: form.capacityModel || "",
      oeeTarget: form.oeeTarget ? Number(form.oeeTarget) : null,
      isBottleneck: form.isBottleneck, isConstraint: form.isConstraint,
    };
    let payload: ResourceGroupPayload | undefined;
    if (id) {
      const result = await updateRG({ variables: { id, input } });
      payload = result.data?.updateResourceGroup;
    } else {
      const result = await createRG({ variables: { input } });
      payload = result.data?.createResourceGroup;
    }
    if (!payload?.ok) {
      const nextErrors: Record<string, string> = {};
      if (payload?.errors) {
        for (const err of payload.errors) { if (err.field) nextErrors[err.field] = err.message; }
        const msg = payload.errors[0]?.message || "Resource group could not be saved.";
        nextErrors._form = msg;
      }
      return { ok: false, errors: nextErrors };
    }
    if (payload.resourceGroup?.id) setSelectedId(payload.resourceGroup.id);
    return { ok: true, resourceGroup: payload.resourceGroup ?? undefined };
  }, [createRG, updateRG]);

  // ── Toolbar & footer registration ──
  const isForm = mode === "edit" || mode === "create";
  useEffect(() => {
    setToolbarVariant("splitListDetail");
    if (isForm) {
      registerActions({
        onSave: hSave, onCancel: hCancel, onDiscardChanges: discardChanges,
        editLabel: "Editing", isDirty: editState.dirty,
        isValid: editState.valid, isSaving: editState.saving,
      });
    } else {
      registerActions({
        onAdd: hNew, onEdit: sel ? hEdit : undefined,
        onDelete: sel ? () => setConfirmDelete(sel.id) : undefined,
        onRefresh: () => refetchRG(), hasSelected: !!sel,
      });
    }
    const footerParts = [`${filtered.length} RG${filtered.length !== 1 ? "s" : ""}`];
    if (sel && mode !== "create") {
      const fmt = (d: string | null | undefined) => {
        if (!d) return "—";
        try { return new Date(d).toLocaleDateString(); } catch { return d; }
      };
      footerParts.push(`Created ${fmt(sel.createdAt)}`);
      footerParts.push(`Updated ${fmt(sel.updatedAt)}`);
    }
    setFooterContent(footerParts.join(" · "));
  }, [mode, sel, filtered.length, hSave, hCancel, hNew, hEdit, discardChanges,
      registerActions, refetchRG, setToolbarVariant, setFooterContent, editState, isForm]);

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Archive resource group?" message="This action cannot be undone." onConfirm={hDelete} />
      )}
      {confirmCancel && (
        <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Discard changes?" message="You have unsaved resource group changes. Discard them?" onConfirm={discardChanges} />
      )}
      <EntityWorkspacePage
        hideList={embeddedInFlow}
        toolbar={
          <PageToolbar
            leftWidthClass={LEFT_COLUMN_WIDTH_CLASS}
            leftSlot={
              <ToolbarSearch
                value={search}
                onChange={setSearch}
                placeholder="Search RGs..."
              />
            }
            filters={
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 w-36 rounded-[2px] border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            }
            actions={
              isForm ? (
                <>
                  <ToolbarButton variant="edit" icon={<Save className="h-4 w-4" />} onClick={hSave} disabled={editState.saving}>
                    Save
                  </ToolbarButton>
                  <ToolbarButton variant="danger" icon={<X className="h-4 w-4" />} onClick={hCancel}>
                    Cancel
                  </ToolbarButton>
                </>
              ) : (
                <>
                  <ToolbarButton variant="create" icon={<Plus className="h-4 w-4" />} onClick={hNew}>
                    New
                  </ToolbarButton>
                  <ToolbarButton variant="edit" icon={<Plus className="h-4 w-4" />} onClick={hEdit} disabled={!sel}>
                    Edit
                  </ToolbarButton>
                  <ToolbarButton variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => sel && setConfirmDelete(sel.id)} disabled={!sel}>
                    Archive
                  </ToolbarButton>
                  <ToolbarButton variant="neutral" icon={<RefreshCw className="h-4 w-4" />} onClick={() => refetchRG()}>
                    Refresh
                  </ToolbarButton>
                </>
              )
            }
          />
        }
        list={
          <RecordListPanel
            title="Resource Groups"
            records={filtered}
            selectedId={selectedId}
            onSelect={(id) => {
              if (editState.dirty) {
                if (!window.confirm("You have unsaved changes. Discard them?")) return;
                discardChanges();
              }
              setSelectedId(id);
              if (mode === "create") { setMode("view"); setEditState({ dirty: false, valid: true, saving: false }); }
            }}
            getId={(g) => g.id}
            pageSize={PER_PAGE}
            emptyMessage="No resource groups"
            selectedBorderClass={col.selectedBorder}
            selectedBgClass={col.selectedBg}
            renderRecord={(g) => {
              const isActive = (g.status || "").toLowerCase() === "active";
              return (
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${col.iconBg}`}>
                    <Component className={`h-3.5 w-3.5 ${col.iconFg} stroke-current`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                      <span className="min-w-0 truncate text-[14px] font-semibold text-foreground">{g.name || ""}</span>
                      <span className={`h-2 w-2 rounded-full ${isActive ? "bg-success" : "bg-muted-foreground/40"}`} title={g.status || "unknown"} />
                    </div>
                    <div className="mt-0.5 truncate text-[12px] font-medium text-muted-foreground">{g.departmentName || "Department required"}</div>
                  </div>
                </div>
              );
            }}
          />
        }
        detail={
          <ResourceGroupDetailView
            ref={detailRef}
            resourceGroupId={selectedId}
            createMode={mode === "create"}
            editing={mode === "edit"}
            resourceGroup={sel}
            departments={departments}
            assignedResources={assignedResources}
            onEditToggle={(editing) => setMode(editing ? "edit" : "view")}
            onEditStateChange={setEditState}
            onError={(msg) => { if (msg) showSystemMessage(msg, "error"); }}
            onSaved={async () => { await refetchRG(); }}
            onSaveResourceGroup={handleSaveResourceGroup}
          />
        }
        footer={null}
      />
    </>
  );
}
