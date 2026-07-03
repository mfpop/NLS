import { useState, useEffect, useCallback, useRef } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Layers, Plus, RefreshCw, Save, X, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DepartmentDetailView } from "./components";
import type { DepartmentDetailViewHandle } from "./components/DepartmentDetailView";
import { useDepartments } from "@/hooks/useDepartments";
import type { DepartmentNode } from "@/hooks/useDepartments";
import { useProductionLines } from "@/hooks/useProductionLines";
import { useReferenceCategory } from "@/hooks/useReferenceTables";
import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage, type FormMode } from "./components/EntityWorkspacePage";
import { ConfirmDialog } from "./shared";
import { PageToolbar, ToolbarSearch, ToolbarButton } from "@/components/layout/PageToolbar";
import { LEFT_COLUMN_WIDTH_CLASS } from "@/components/layout/layoutWidths";
import { RecordListPanel } from "@/components/shared/RecordListPanel";
import { ENTITY_COLORS } from "./config/entityColors";

const col = ENTITY_COLORS.department;

const PER_PAGE = 10;

const USERS_QUERY = gql`
  query DepartmentStaffUsers($search: String) {
    users(search: $search) {
      id
      name
      username
      role
      email
    }
  }
`;

const PLANTS_QUERY = gql`
  query DepartmentPlants {
    plants {
      id
      name
      code
      status
    }
  }
`;

type StaffOption = { id: string; name: string; username?: string; role?: string; email?: string };

type DepartmentForm = {
  plantId: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  statusId: string;
  description: string;
  manager: string;
  supervisor: string;
  productionLineIds: string[];
};

export function DepartmentsPage({ embeddedInFlow = false }: { embeddedInFlow?: boolean } = {}) {
  const { search, setSearch, statusFilter, setStatusFilter, setFooterContent, setToolbarVariant, showSystemMessage } = useToolbar();
  const registerActions = useRegisterActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lineIdFilter = searchParams.get("lineId");
  const { departments, saveDepartment, assignDepartmentToLines, deleteDepartment, refetch } = useDepartments(lineIdFilter);
  const { lines: productionLines, refetch: refetchLines } = useProductionLines(500);
  const { values: statusValues } = useReferenceCategory("status");
  const { data: staffData } = useQuery<{ users: StaffOption[] }>(USERS_QUERY, { variables: { search: "" }, fetchPolicy: "cache-and-network" });
  const staffOptions = staffData?.users ?? [];
  const { data: plantsData } = useQuery<{ plants: Array<{ id: string; name: string; code: string; status: string }> }>(PLANTS_QUERY, { fetchPolicy: "cache-and-network" });
  const plants = plantsData?.plants ?? [];

  const [mode, setMode] = useState<FormMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plantFilter, setPlantFilter] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editState, setEditState] = useState({ dirty: false, valid: true, saving: false });

  const detailRef = useRef<DepartmentDetailViewHandle>(null);

  const filtered = departments
    .filter((d: DepartmentNode) => statusFilter === "all" || d.status === statusFilter)
    .filter((d) => plantFilter === "all" || d.plantId === plantFilter)
    .filter((d) => !search || `${d.name} ${d.code} ${d.plant?.name || ""} ${d.plant?.code || ""} ${d.managerRef?.name || d.manager || ""}`.toLowerCase().includes(search.toLowerCase()));
  const sel = selectedId ? departments.find((d: DepartmentNode) => d.id === selectedId) ?? null : null;
  const isForm = mode === "edit" || mode === "create";

  useEffect(() => {
    const departmentId = searchParams.get("departmentId");
    if (departmentId && departments.some((department: DepartmentNode) => department.id === departmentId)) {
      setSelectedId(departmentId);
      return;
    }
    if (filtered.length === 0) return;
    if (selectedId && filtered.some((d: DepartmentNode) => d.id === selectedId)) return;
    setSelectedId(filtered[0].id);
  }, [filtered, searchParams, selectedId]);

  const hNew = useCallback(() => {
    setSelectedId(null);
    setMode("create");
    setEditState({ dirty: false, valid: true, saving: false });
  }, []);

  const hEdit = useCallback(() => {
    if (sel) setMode("edit");
  }, [sel]);

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
      await refetch();
      await refetchLines();
      setMode("view");
      setEditState({ dirty: false, valid: true, saving: false });
    }
  }, [refetch, refetchLines]);

  const hDeleteCallback = useCallback(async () => {
    if (!confirmDelete) return;
    const result = await deleteDepartment(confirmDelete);
    if (result && !result.success) {
      const message = result.message || "Department could not be deleted.";
      showSystemMessage(message, "error");
      setConfirmDelete(null);
      return;
    }
    setSelectedId(null);
    await refetch();
    setConfirmDelete(null);
    showSystemMessage("Department deleted", "success");
  }, [confirmDelete, deleteDepartment, refetch, showSystemMessage]);

  const selectDepartment = useCallback((id: string) => {
    if (editState.dirty) {
      const discard = window.confirm("You have unsaved department changes. Discard them and select another department?");
      if (!discard) return;
      discardChanges();
    }
    setSelectedId(id);
    if (mode === "create") {
      setMode("view");
      setEditState({ dirty: false, valid: true, saving: false });
    }
  }, [editState.dirty, mode, discardChanges]);

  // ── Build department save/assign handlers for the detail component ──
  const handleSaveDepartment = useCallback(async (form: DepartmentForm, id: string | null) => {
    return await saveDepartment(form, id);
  }, [saveDepartment]);

  const handleAssignDepartmentToLines = useCallback(async (departmentId: string, lineIds: string[]) => {
    return await assignDepartmentToLines(departmentId, lineIds);
  }, [assignDepartmentToLines]);

  // ── Toolbar & footer registration ──
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
        onRefresh: () => { refetch(); refetchLines(); }, hasSelected: !!sel,
      });
    }
    const footerParts = [`${filtered.length} dept${filtered.length !== 1 ? "s" : ""}`];
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
      registerActions, refetch, refetchLines, setToolbarVariant, setFooterContent, editState, isForm]);

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete department?" message="This action cannot be undone." onConfirm={hDeleteCallback} />
      )}
      {confirmCancel && (
        <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Discard changes?" message="You have unsaved department changes. Discard them?" onConfirm={discardChanges} />
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
                placeholder="Search departments..."
              />
            }
            filters={
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 w-36 rounded-[2px] border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-blue-500"
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
                    Delete
                  </ToolbarButton>
                  <ToolbarButton variant="neutral" icon={<RefreshCw className="h-4 w-4" />} onClick={() => { refetch(); refetchLines(); }}>
                    Refresh
                  </ToolbarButton>
                </>
              )
            }
          />
        }
        list={
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <div className="shrink-0 border-b border-slate-200 flex h-9 items-center px-3 bg-slate-50">
              <select value={plantFilter} onChange={(event) => setPlantFilter(event.target.value)}
                className="h-6 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-900 outline-none focus:border-blue-500">
                <option value="all">All Plants</option>
                {plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.code} - {plant.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <RecordListPanel
                title="Departments"
                records={filtered}
                selectedId={selectedId}
                onSelect={selectDepartment}
                getId={(d: DepartmentNode) => d.id}
                pageSize={PER_PAGE}
                emptyMessage="No departments"
                selectedBorderClass={col.selectedBorder}
                selectedBgClass={col.selectedBg}
                renderRecord={(d: DepartmentNode) => {
                  const isActive = (d.status || "").toLowerCase() === "active";
                  const plantName = d.plant?.name || "";
                  const deptPlantOk = !!d.plantId && !!plantName;
                  return (
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${col.iconBg}`}>
                        <Layers className={`h-3.5 w-3.5 ${col.iconFg} stroke-current`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                          <span className="min-w-0 truncate text-[14px] font-semibold text-slate-900">{d.name}</span>
                          <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} title={d.status || "unknown"} />
                        </div>
                        <div className="mt-0.5 truncate text-[12px] font-medium text-slate-500">{deptPlantOk ? plantName : "Plant required"}</div>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </div>
        }
        detail={
          <DepartmentDetailView
            ref={detailRef}
            departmentId={selectedId}
            createMode={mode === "create"}
            editing={mode === "edit"}
            department={sel}
            plants={plants}
            staffOptions={staffOptions}
            productionLines={productionLines}
            statusValues={statusValues}
            departments={departments}
            onEditToggle={(editing) => setMode(editing ? "edit" : "view")}
            onEditStateChange={setEditState}
            onError={(msg) => { if (msg) showSystemMessage(msg, "error"); }}
            onSaved={async () => { await refetch(); await refetchLines(); }}
            onNavigateToLine={(lineId) => navigate(`/system/production-structure/line?productionLineId=${lineId}`)}
            showSystemMessage={showSystemMessage}
            onSaveDepartment={handleSaveDepartment}
            onAssignDepartmentToLines={handleAssignDepartmentToLines}
            refetch={async () => { await refetch(); }}
          />
        }
        footer={null}
      />
    </>
  );
}
