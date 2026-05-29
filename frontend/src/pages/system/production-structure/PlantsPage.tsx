import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Factory } from "lucide-react";
import { usePlants, EMPTY_FORM } from "@/hooks/usePlants";
import type { Plant, PlantInput } from "@/types/plant";
import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage, type FormMode } from "./components/EntityWorkspacePage";
import { PlantDetailView } from "./components/PlantDetailView";
import { ConfirmDialog } from "./shared";
import { EntityListItem } from "./components/EntityListItem";

const PER_PAGE = 10;

function normalizeStatus(value?: string | null): string {
  return (value || "active").trim().toLowerCase();
}

function getPlantStatus(plant?: Plant | null): { value: string; label: string; isActive: boolean } {
  const rawLabel = plant?.statusRef?.name || plant?.status || "Active";
  const rawValue = plant?.statusRef?.code || plant?.status || "ACTIVE";
  const normalized = normalizeStatus(rawValue);
  const labelNormalized = normalizeStatus(rawLabel);
  if (normalized === "active" || labelNormalized === "active") return { value: "active", label: "Active", isActive: true };
  if (normalized === "archived" || labelNormalized === "archived") return { value: "archived", label: "Archived", isActive: false };
  return { value: "inactive", label: "Inactive", isActive: false };
}

export function PlantsPage() {
  const { search, statusFilter, setFooterContent, setToolbarVariant } = useToolbar();
  const registerActions = useRegisterActions();
  const { plants, loading, savePlant, archivePlant, refetch } = usePlants();

  const [mode, setMode] = useState<FormMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pendingPlantId, setPendingPlantId] = useState<string | null>(null);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [editState, setEditState] = useState({ dirty: false, valid: true, saving: false });
  const plantDetailRef = useRef<{ save: () => Promise<boolean>; cancel: () => void; isDirty: () => boolean }>(null);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = plants.filter((p) => statusFilter === "all" || getPlantStatus(p).value === normalizeStatus(statusFilter))
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? plants.find((p) => p.id === selectedId) ?? null : null;

  const handleCreatePlant = useCallback(async (input: PlantInput): Promise<{ ok: boolean; plant?: Plant; errors?: Record<string, string> }> => {
    const result = await savePlant({ ...EMPTY_FORM, ...(input as any) }, null);
    return result;
  }, [savePlant]);

  const hNew = useCallback(() => { setSelectedId(null); setMode("create"); }, []);
  const hEdit = useCallback(() => { if (sel) { setMode("edit"); } }, [sel]);
  const hCancel = useCallback(() => {
    if (mode === "edit" || mode === "create") {
      plantDetailRef.current?.cancel();
    }
    setMode("view");
  }, [mode]);

  const hSave = useCallback(async () => {
    if (selectedId || mode === "create") {
      const saved = await plantDetailRef.current?.save();
      if (saved) {
        setMode("view");
      }
      return;
    }
  }, [mode, selectedId]);

  const onPlantSaved = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const hDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setMutationError(null);
    const result = await archivePlant(confirmDelete);
    if (!result.success) {
      setMutationError(result.message || "Plant could not be archived.");
      setConfirmDelete(null);
      return;
    }
    setSelectedId(null); await refetch(); setConfirmDelete(null);
  }, [confirmDelete, archivePlant, refetch]);

  const hasUnsavedChanges = useCallback(() => {
    return !!plantDetailRef.current?.isDirty();
  }, []);

  const selectPlant = useCallback((plantId: string) => {
    if (plantId === selectedId) return;
    if (hasUnsavedChanges()) {
      setPendingPlantId(plantId);
      return;
    }
    setSelectedId(plantId);
    if (mode !== "view") {
      plantDetailRef.current?.cancel();
      setMode("view");
    }
  }, [hasUnsavedChanges, mode, selectedId]);

  const confirmPlantSwitch = useCallback(() => {
    if (!pendingPlantId) return;
    plantDetailRef.current?.cancel();
    setMode("view");
    setSelectedId(pendingPlantId);
    setPendingPlantId(null);
  }, [pendingPlantId]);

  const confirmLineNavigation = useCallback(() => {
    if (!pendingLineId) return;
    plantDetailRef.current?.cancel();
    setMode("view");
    setPendingLineId(null);
  }, [pendingLineId]);

  const selectedIndex = useMemo(() => paginated.findIndex((p) => p.id === selectedId), [paginated, selectedId]);
  useEffect(() => {
    if (mode !== "view") return;
    const h = (e: KeyboardEvent) => {
      const plantCount = paginated.length;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedId(paginated[Math.min(selectedIndex + 1, plantCount - 1)]?.id ?? null); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedId(paginated[Math.max(selectedIndex - 1, 0)]?.id ?? null); }
      if (e.key === "Enter" && selectedId) { e.preventDefault(); hEdit(); }
      if (e.key === "Delete" && selectedId) { e.preventDefault(); setConfirmDelete(selectedId); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mode, paginated, selectedIndex, selectedId, hEdit]);

  useEffect(() => {
    setToolbarVariant("splitListDetail");
    if (mode === "edit" || mode === "create") {
      registerActions({ onSave: hSave, onCancel: hCancel, isDirty: editState.dirty, isSaving: editState.saving });
    } else {
      registerActions({
        onAdd: hNew, onEdit: sel ? hEdit : undefined,
        onDelete: sel ? () => setConfirmDelete(sel.id) : undefined,
        onRefresh: () => refetch(), hasSelected: !!sel,
      });
    }
    setFooterContent(`${filtered.length} plant${filtered.length !== 1 ? "s" : ""}`);
  }, [mode, sel, filtered.length, hSave, hCancel, hNew, hEdit, registerActions, refetch, editState, setToolbarVariant]);

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className="flex flex-1 items-center justify-center bg-muted">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-entity-plant-bg">
              <Factory className="h-6 w-6 text-entity-plant stroke-current" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Plant Details</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Select a plant from the list or create a new one to view its configuration and operational details.</p>
          </div>
        </div>
      );
    }

    return (
      <PlantDetailView
        ref={plantDetailRef}
        plantId={mode === "create" ? null : sel!.id}
        createMode={mode === "create"}
        editing={mode === "edit"}
        onEditToggle={(editing) => setMode(editing ? "edit" : "view")}
        onError={setMutationError}
        onEditStateChange={setEditState}
        onSaved={onPlantSaved}
        onDirtyNavigateToLine={setPendingLineId}
        onCreatePlant={handleCreatePlant}
      />
    );
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
          title="Delete plant?"
          message={`Are you sure you want to delete "${plants.find((p) => p.id === confirmDelete)?.name || "this plant"}"? Existing structure records will be preserved.`}
          onConfirm={hDelete} />
      )}
      <ConfirmDialog open={!!pendingPlantId} onClose={() => setPendingPlantId(null)} title="Discard changes?" message="You have unsaved plant changes. Discard them and open the selected plant?" onConfirm={confirmPlantSwitch} />
      <ConfirmDialog open={!!pendingLineId} onClose={() => setPendingLineId(null)} title="Discard changes?" message="You have unsaved plant changes. Discard them before opening the selected production line?" onConfirm={confirmLineNavigation} />
      <EntityWorkspacePage
        toolbar={null}
        list={
          <>
            {mutationError && mode === "view" && (
              <div className="border-b border-danger/30 bg-danger/10 px-3 py-2 text-[11px] font-semibold text-danger">
                {mutationError}
              </div>
            )}
            <div className="flex-1 overflow-y-auto bg-muted/50 pl-2">
              {loading && plants.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-success animate-bounce" />Loading...</div>
                </div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                  <Factory className="h-5 w-5 text-muted-foreground mb-2 stroke-current" />
                  <p className="text-xs text-muted-foreground">No plants</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Create one to get started</p>
                </div>
              ) : (
                <div>
                  {paginated.map((plant) => (
                    <EntityListItem key={plant.id}
                      name={plant.name} code={plant.code}
                      meta={[plant.city, plant.state].filter(Boolean).join(", ") || plant.building || "No location"}
                      icon={<Factory className="h-3.5 w-3.5 stroke-current" />}
                      selected={selectedId === plant.id}
                      status={plant.status}
                      onClick={() => selectPlant(plant.id)}
                      entityType="plant" />
                  ))}
                </div>
              )}
            </div>
          </>
        }
        detail={renderDetail()}
        footer={null}
      />
    </>
  );
}