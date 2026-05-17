import { useState, useEffect, useCallback } from "react";
import { theme } from "../../../styles/themeTokens";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle, Plus, Trash2, RefreshCw, AlertTriangle, Settings2 } from "lucide-react";
import { useQuery } from "@apollo/client/react";
import { useRouting, useRoutingMutations, useStepCapacities } from "@/hooks/useRouting";
import type { RoutingStep } from "@/types/routing";
import { ConfirmDialog } from "./shared";
import { DEPARTMENTS_QUERY } from "@/graphql/manufacturingQueries";
import { RESOURCE_GROUPS_QUERY } from "@/graphql/manufacturingQueries";
import { RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { PRODUCTION_LINE_QUERY } from "@/graphql/productionLineQueries";
import { INVENTORY_LOCATIONS_QUERY, MATERIALS_QUERY } from "@/graphql/routingQueries";
import { ProductionLineProductScopeSummary } from "./components";
import type { ProductionLine } from "@/types/productionLine";

const PILL_BASE = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold";
const PILL_VARIANTS: Record<string, string> = {
  active: "bg-success text-success",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-danger text-danger",
  configured: "bg-success text-success",
  missing: "bg-muted text-muted-foreground",
  invalid: "bg-warning text-warning",
};

function PillBadge({ variant = "draft", label }: { variant?: string; label: string }) {
  return <span className={`${PILL_BASE} ${PILL_VARIANTS[variant] || PILL_VARIANTS.draft}`}>{label}</span>;
}

const shortcutClass = "ml-1 hidden lg:inline text-[8px] opacity-50 font-mono";

function SecondaryButton({ children, onClick, disabled = false, shortcut }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; shortcut?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={shortcut ? `Shortcut: ${shortcut}` : undefined}
      className={`inline-flex h-7 items-center gap-1 rounded border border-border ${theme.surfaceBg} px-2.5 text-[10px] font-medium ${theme.textSecondary} transition-colors ${theme.interactiveRow} disabled:cursor-not-allowed disabled:opacity-50`}>
      {children}{shortcut ? <kbd className={shortcutClass}>{shortcut}</kbd> : null}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled = false, shortcut }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; shortcut?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={shortcut ? `Shortcut: ${shortcut}` : undefined}
      className={`inline-flex h-7 items-center gap-1 rounded-md bg-warning px-3 text-[10px] font-semibold text-primary-foreground shadow-sm transition-colors hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50`}>
      {children}{shortcut ? <kbd className={`${shortcutClass} text-primary-foreground`}>{shortcut}</kbd> : null}
    </button>
  );
}

function buildStepInput(step: RoutingStep, routingId: string) {
  return {
    id: step.id,
    routingId,
    sequence: step.sequence,
    departmentId: step.departmentId || null,
    resourceGroupId: step.resourceGroupId || null,
    resourceId: step.resourceId || null,
    standardWorkId: null,
    cycleTimeSec: Number(step.cycleTimeSec || 0),
    setupTimeSec: Number(step.setupTimeSec || 0),
    changeoverTimeSec: Number(step.changeoverTimeSec || 0),
    requiredOperators: Number(step.requiredOperators || 1),
    scheduleSource: step.scheduleSource || "LINE",
    bufferType: step.bufferType || null,
    wipMin: step.wipMin ?? null,
    wipMax: step.wipMax ?? null,
    qualityCheckpoint: !!step.qualityCheckpoint,
    reworkAllowed: !!step.reworkAllowed,
    notes: step.notes || "",
    materialInputs: (step.materialInputs || []).map((item) => ({
      id: item.id || null,
      materialId: item.materialId || null,
      quantity: Number(item.quantity || 1),
      materialState: item.materialState || "RAW_MATERIAL",
      locationId: item.locationId || null,
    })),
    materialOutputs: (step.materialOutputs || []).map((item) => ({
      id: item.id || null,
      materialId: item.materialId || null,
      quantity: Number(item.quantity || 1),
      materialState: item.materialState || "WIP",
      locationId: item.locationId || null,
    })),
    movementRule: step.movementRule ? {
      ruleType: step.movementRule.ruleType || "NEXT_OPERATION",
      sourceLocationId: step.movementRule.sourceLocationId || null,
      destinationLocationId: step.movementRule.destinationLocationId || null,
      notes: step.movementRule.notes || "",
    } : null,
  };
}

function mutationErrorMessage(errors: any, fallback: string) {
  if (Array.isArray(errors) && errors.length) {
    return errors.map((error) => error.message).filter(Boolean).join("; ") || fallback;
  }
  return fallback;
}

export function RoutingEditorPage() {
  const { productionLineId, routingId } = useParams<{ productionLineId: string; routingId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationState = (window.history.state as any)?.usr;
  const isCreate = !routingId || routingId === "new";

  const { routing, refetch: refetchRouting } = useRouting(isCreate ? null : routingId!);
  const { saveRouting, activateRouting, saving } = useRoutingMutations();
  const { capacities } = useStepCapacities(routingId || null);

  const [localSteps, setLocalSteps] = useState<RoutingStep[]>([]);
  const [dirty, setDirty] = useState(false);
  const [savingState, setSavingState] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"process" | "material" | "bom" | "outputs" | "validation">("process");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [routingMeta, setRoutingMeta] = useState({
    productFamilyId: "",
    productModelId: "",
    version: "1.0",
    notes: "",
  });

  const { data: deptData } = useQuery<any>(DEPARTMENTS_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: rgData } = useQuery<any>(RESOURCE_GROUPS_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: resData } = useQuery<any>(RESOURCES_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: lineData } = useQuery<{ productionLine: ProductionLine }>(PRODUCTION_LINE_QUERY, {
    variables: { id: productionLineId || "" },
    skip: !productionLineId,
    fetchPolicy: "cache-and-network",
  });

  const departments = deptData?.departments ?? [];
  const resourceGroups = rgData?.resourceGroups ?? [];
  const resources = resData?.resources ?? [];
  const productionLine = lineData?.productionLine;
  const { data: materialData } = useQuery<any>(MATERIALS_QUERY, {
    variables: { status: "ACTIVE", limit: 500, offset: 0 },
    fetchPolicy: "cache-and-network",
  });
  const { data: locationData } = useQuery<any>(INVENTORY_LOCATIONS_QUERY, {
    variables: { plantId: productionLine?.plantId || null, status: "ACTIVE", limit: 500, offset: 0 },
    skip: !productionLine?.plantId,
    fetchPolicy: "cache-and-network",
  });
  const lineModels = productionLine?.productModels ?? [];
  const materials = materialData?.materials ?? [];
  const inventoryLocations = locationData?.inventoryLocations ?? [];
  const requestedScope = searchParams.get("routingScope");
  const resolveLineModelId = useCallback((id?: string | null, name?: string | null) => {
    if (!id && !name) return "";
    const byId = id ? lineModels.find((model) => model.id === id) : null;
    if (byId) return byId.id;
    const normalizedName = (name || "").trim().toLowerCase();
    return lineModels.find((model) => model.name.trim().toLowerCase() === normalizedName || model.code.trim().toLowerCase() === normalizedName)?.id || "";
  }, [lineModels]);
  const defaultModelId = requestedScope === "MODEL" && searchParams.get("productModelId")
    ? searchParams.get("productModelId") || ""
    : lineModels.find((model) => model.isPrimary)?.id || "ALL";

  useEffect(() => {
    if (!productionLine) return;
    const validIds = new Set(lineModels.map((model) => model.id));
    const requestedModelId = searchParams.get("productModelId");
    const requestedFamilyId = searchParams.get("productFamilyId");
    const requestedVersion = searchParams.get("version");
    if (requestedFamilyId && !routingMeta.productFamilyId) {
      setRoutingMeta((p) => ({ ...p, productFamilyId: requestedFamilyId }));
    }
    if (requestedVersion && routingMeta.version === "1.0") {
      setRoutingMeta((p) => ({ ...p, version: requestedVersion }));
    }
    if (requestedModelId && validIds.has(requestedModelId) && !routingMeta.productModelId) {
      setRoutingMeta((p) => ({ ...p, productModelId: requestedModelId }));
      return;
    }
    if (routingMeta.productModelId && routingMeta.productModelId !== "ALL" && !validIds.has(routingMeta.productModelId)) {
      setRoutingMeta((p) => ({ ...p, productModelId: defaultModelId }));
    }
    if (!routingMeta.productModelId && defaultModelId) {
      setRoutingMeta((p) => ({ ...p, productModelId: defaultModelId }));
    }
  }, [productionLine?.id, lineModels, routingMeta.productFamilyId, routingMeta.productModelId, defaultModelId, searchParams]);

  // Load routing data
  useEffect(() => {
    if (routing) {
      setLocalSteps([...routing.steps].sort((a, b) => a.sequence - b.sequence));
      setRoutingMeta({
        productFamilyId: routing.productFamilyId || "",
        productModelId: resolveLineModelId(routing.productModelId, routing.productModelName) || routing.productModelId || "",
        version: routing.version,
        notes: routing.notes,
      });
      setDirty(false);
    }
  }, [routing, resolveLineModelId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const markDirty = useCallback(() => setDirty(true), []);

  const validateSteps = useCallback((): string[] => {
    const errs: string[] = [];
    if (localSteps.length === 0) return ["No steps configured"];
    if (localSteps.length < 2) errs.push("Routing must have at least 2 steps");

    const seqs = localSteps.map((s) => s.sequence).sort((a, b) => a - b);
    const expected = Array.from({ length: localSteps.length }, (_, i) => i + 1);
    if (JSON.stringify(seqs) !== JSON.stringify(expected)) {
      errs.push("Step sequences must start at 1 and be continuous");
    }

    for (const s of localSteps) {
      if (!s.departmentId) errs.push(`Step ${s.sequence}: department required`);
      if (!s.cycleTimeSec || s.cycleTimeSec <= 0) errs.push(`Step ${s.sequence}: cycle time must be > 0`);
      if (s.resourceGroupId && s.departmentId) {
        const rg = resourceGroups.find((r: any) => r.id === s.resourceGroupId);
        if (rg && rg.departmentId !== s.departmentId) errs.push(`Step ${s.sequence}: resource group doesn't belong to department`);
      }
      if (s.resourceId && s.resourceGroupId) {
        const res = resources.find((r: any) => r.id === s.resourceId);
        if (res && res.resourceGroupId !== s.resourceGroupId) errs.push(`Step ${s.sequence}: resource doesn't belong to resource group`);
      }
    }
    return errs;
  }, [localSteps, resourceGroups, resources]);

  const validationErrors = validateSteps();
  const isValid = validationErrors.length === 0 && localSteps.length >= 2;

  const handleSave = useCallback(async () => {
    setSavingState(true);
    try {
      const modelId = routingMeta.productModelId === "ALL" ? null : routingMeta.productModelId || null;
      const result = await saveRouting({
        routingId: isCreate ? null : routingId!,
        productionLineId: productionLineId!,
        productFamilyId: routingMeta.productFamilyId || null,
        productModelId: modelId,
        version: routingMeta.version || "1.0",
        notes: routingMeta.notes || "",
        steps: localSteps.map((step) => buildStepInput(step, step.routingId || routingId || "")),
      });
      if (!result.ok || !result.routing) {
        setToast({ message: mutationErrorMessage(result.errors, "Failed to save routing"), type: "error" });
        setSavingState(false);
        return;
      }
      if (isCreate) {
        await refetchRouting();
        setToast({ message: "Routing saved", type: "success" });
        setDirty(false);
        const base = window.location.pathname.includes("/components/") ? "/system/production-structure/components/routing" : "/system/production-structure/flow/routing";
        navigate(`${base}/${productionLineId}/${result.routing.id}`, { replace: true });
      } else {
        await refetchRouting();
        setToast({ message: "Routing saved", type: "success" });
        setDirty(false);
      }
    } catch {
      setToast({ message: "Failed to save routing", type: "error" });
    }
    setSavingState(false);
  }, [isCreate, routingId, productionLineId, routingMeta, localSteps, saveRouting, refetchRouting, navigate]);

  const handleActivate = useCallback(async () => {
    if (!routingId) return;
    setSavingState(true);
    try {
      const result = await activateRouting(routingId);
      if (result.ok) {
        await refetchRouting();
        setToast({ message: "Routing activated", type: "success" });
        setDirty(false);
      } else {
        const msg = result.errors?.map((e: any) => e.message).join("; ") || "Failed to activate";
        setToast({ message: msg, type: "error" });
      }
    } catch {
      setToast({ message: "Failed to activate routing", type: "error" });
    }
    setSavingState(false);
  }, [routingId, activateRouting, refetchRouting]);

  const handleClose = useCallback(() => {
    if (dirty) { setConfirmClose(true); return; }
    const from = locationState?.from || `/system/production-structure/components/line`;
    navigate(from, { state: locationState?.returnState || undefined });
  }, [dirty, navigate, locationState]);

  const handleDeleteStep = useCallback(async (stepId: string) => {
    setLocalSteps((prev) => {
      const filtered = prev.filter((s) => s.id !== stepId);
      return filtered.map((s, i) => ({ ...s, sequence: i + 1 }));
    });
    setConfirmDelete(null);
    markDirty();
  }, [markDirty]);

  const addStep = useCallback(() => {
    const newSeq = localSteps.length + 1;
    const newStep: RoutingStep = {
      id: `new-${Date.now()}`,
      routingId: routingId || "",
      sequence: newSeq,
      cycleTimeSec: 0,
      scheduleSource: "LINE",
      qualityCheckpoint: false,
      reworkAllowed: false,
      notes: "",
      materialInputs: [],
      materialOutputs: [],
      movementRule: null,
      createdAt: "",
      updatedAt: "",
    };
    setLocalSteps((prev) => [...prev, newStep]);
    markDirty();
  }, [localSteps, routingId, markDirty]);

  const updateStepField = useCallback((stepId: string, field: string, value: any) => {
    setLocalSteps((prev) => prev.map((s) => {
      if (s.id !== stepId) return s;
      const updated = { ...s, [field]: value };
      if (field === "resourceGroupId" && value) {
        const rg = resourceGroups.find((r: any) => r.id === value);
        updated.resourceGroupName = rg?.name || null;
        if (rg?.departmentId && !updated.departmentId) {
          updated.departmentId = rg.departmentId;
        }
        if (rg?.departmentId && updated.departmentId !== rg.departmentId) {
          updated.resourceId = null;
          updated.resourceName = null;
        }
      }
      if (field === "departmentId" && value !== s.departmentId) {
        updated.resourceGroupId = null;
        updated.resourceGroupName = null;
        updated.resourceId = null;
        updated.resourceName = null;
        updated.standardWorkId = null;
        updated.standardWorkName = null;
      }
      if (field === "resourceId" && value) {
        const res = resources.find((r: any) => r.id === value);
        updated.resourceName = res?.name || null;
        if (res?.resourceGroupId) {
          const rg = resourceGroups.find((r: any) => r.id === res.resourceGroupId);
          updated.resourceGroupId = res.resourceGroupId;
          updated.resourceGroupName = rg?.name || null;
          if (!updated.departmentId && rg?.departmentId) {
            updated.departmentId = rg.departmentId;
          }
        }
      }
      if (field === "resourceGroupId" && !value) {
        updated.resourceGroupName = null;
        updated.resourceId = null;
        updated.resourceName = null;
      }
      return updated;
    }));
    markDirty();
  }, [markDirty, resourceGroups, resources]);

  const moveStepUp = useCallback((index: number) => {
    if (index <= 0) return;
    setLocalSteps((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((s, i) => ({ ...s, sequence: i + 1 }));
    });
    markDirty();
  }, [markDirty]);

  const moveStepDown = useCallback((index: number) => {
    setLocalSteps((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((s, i) => ({ ...s, sequence: i + 1 }));
    });
    markDirty();
  }, [markDirty]);

  const handleRefresh = useCallback(async () => {
    await refetchRouting();
    setDirty(false);
    setToast({ message: "Routing reloaded", type: "success" });
  }, [refetchRouting]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "s") {
        e.preventDefault();
        if (!dirty || savingState) return;
        handleSave();
        return;
      }
      if (ctrl && e.key === "n") {
        e.preventDefault();
        addStep();
        return;
      }
      if (ctrl && e.key === "r") {
        e.preventDefault();
        handleRefresh();
        return;
      }
      if (e.key === "Escape") {
        handleClose();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, savingState, handleSave, handleClose, addStep, handleRefresh]);

  const filteredRG = (deptId: string | null | undefined) =>
    resourceGroups.filter((rg: any) => !deptId || rg.departmentId === deptId);

  const filteredRes = (rgId: string | null | undefined) =>
    resources.filter((r: any) => !rgId || r.resourceGroupId === rgId);

  const selectedStep = localSteps.find((step) => step.id === selectedStepId) || localSteps[0] || null;
  const updateMaterialFlow = useCallback((stepId: string, patch: Partial<RoutingStep>) => {
    setLocalSteps((prev) => prev.map((step) => step.id === stepId ? { ...step, ...patch } : step));
    markDirty();
  }, [markDirty]);

  const addMaterialInput = useCallback(() => {
    if (!selectedStep) return;
    updateMaterialFlow(selectedStep.id, {
      materialInputs: [...(selectedStep.materialInputs || []), { id: `new-input-${Date.now()}`, materialId: null, quantity: 1, materialState: "RAW_MATERIAL", locationId: null }],
    });
  }, [selectedStep, updateMaterialFlow]);

  const addMaterialOutput = useCallback(() => {
    if (!selectedStep) return;
    updateMaterialFlow(selectedStep.id, {
      materialOutputs: [...(selectedStep.materialOutputs || []), { id: `new-output-${Date.now()}`, materialId: null, quantity: 1, materialState: "WIP", locationId: null }],
    });
  }, [selectedStep, updateMaterialFlow]);

  const updateMaterialItem = useCallback((kind: "input" | "output", itemId: string, field: string, value: any) => {
    if (!selectedStep) return;
    const key = kind === "input" ? "materialInputs" : "materialOutputs";
    updateMaterialFlow(selectedStep.id, {
      [key]: ((selectedStep as any)[key] || []).map((item: any) => item.id === itemId ? { ...item, [field]: value } : item),
    } as Partial<RoutingStep>);
  }, [selectedStep, updateMaterialFlow]);

  const removeMaterialItem = useCallback((kind: "input" | "output", itemId: string) => {
    if (!selectedStep) return;
    const key = kind === "input" ? "materialInputs" : "materialOutputs";
    updateMaterialFlow(selectedStep.id, {
      [key]: ((selectedStep as any)[key] || []).filter((item: any) => item.id !== itemId),
    } as Partial<RoutingStep>);
  }, [selectedStep, updateMaterialFlow]);

  const materialValidationErrors = localSteps.flatMap((step) => {
    const errs: string[] = [];
    if (!step.resourceGroupId) errs.push(`Step ${step.sequence}: resource group required`);
    if (!(step.materialInputs || []).length) errs.push(`Step ${step.sequence}: input material required`);
    if (!(step.materialOutputs || []).length) errs.push(`Step ${step.sequence}: output material/state required`);
    (step.materialInputs || []).forEach((item) => {
      if (!item.materialId) errs.push(`Step ${step.sequence}: input material missing`);
      if (!item.locationId) errs.push(`Step ${step.sequence}: source location missing`);
    });
    (step.materialOutputs || []).forEach((item) => {
      if (!item.materialId) errs.push(`Step ${step.sequence}: output material missing`);
      if (!item.materialState) errs.push(`Step ${step.sequence}: output state missing`);
      if (!item.locationId) errs.push(`Step ${step.sequence}: destination location missing`);
    });
    return errs;
  });

  const statusVariant = routing?.status === "ACTIVE" ? "active" : routing?.status === "ARCHIVED" ? "archived" : "draft";

  return (
    <div className={`flex h-full flex-col ${theme.surfaceBg}`}>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-xs font-medium shadow-lg ${
          toast.type === "success" ? `${theme.toastSuccess}` : `${theme.toastError}`
        }`}>{toast.message}</div>
      )}

      {confirmClose && (
        <ConfirmDialog open={true} onClose={() => setConfirmClose(false)} title="Discard unsaved routing changes?" message="Discard unsaved routing changes?" onConfirm={() => { setConfirmClose(false); const from = locationState?.from || `/system/production-structure/components/line`; navigate(from, { state: locationState?.returnState || undefined }); }} />
      )}
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete step?" message="This cannot be undone. The step will be permanently deleted." onConfirm={() => handleDeleteStep(confirmDelete)} />
      )}

      {/* ── Header (identity only) ── */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center text-warning">
            <Settings2 className="h-4 w-4 stroke-current" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-bold ${theme.textPrimary}`}>Flow / Routing</h2>
              <PillBadge variant={statusVariant} label={routing?.status || "DRAFT"} />
              {!isValid && localSteps.length > 0 && <PillBadge variant="invalid" label="Has errors" />}
            </div>
            <p className={`text-[10px] ${theme.textMuted} mt-0.5`}>
              {routing?.productionLineName || "Loading..."}
              {routing?.productModelName && ` · ${routing.productModelName}`}
              {routing?.productFamilyName && ` · ${routing.productFamilyName}`}
            </p>
            {productionLine && (
              <div className="mt-1 max-w-2xl">
                <ProductionLineProductScopeSummary
                  family={productionLine.productFamily ?? productionLine.productFamilies?.find((family) => family.isPrimary) ?? productionLine.productFamilies?.[0] ?? null}
                  models={productionLine.productModels ?? []}
                  maxVisibleModels={4}
                  showPrimaryRow={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Windows Explorer-style toolbar ── */}
      <div className={`shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border ${theme.toolbarBg}`}>
        <SecondaryButton onClick={handleClose} shortcut="Esc">
          <ArrowLeft className="h-3 w-3 stroke-current" /> Back
        </SecondaryButton>
        <select value={routingMeta.productModelId} onChange={(e) => { setRoutingMeta((p) => ({ ...p, productModelId: e.target.value })); markDirty(); }}
          className={`h-7 rounded ${theme.input} px-2 text-[10px] outline-none`}>
          {lineModels.length === 0 ? (
            <option value="" disabled>No models assigned</option>
          ) : (
            <>
              <option value="ALL">All models</option>
              {lineModels.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
            </>
          )}
        </select>
        <input type="text" value={routingMeta.version} onChange={(e) => { setRoutingMeta((p) => ({ ...p, version: e.target.value })); markDirty(); }}
          className="h-7 w-14 rounded border border-border bg-card px-2 text-[10px] outline-none border-border bg-muted text-foreground ml-1" />
        <div className={`w-px h-5 ${theme.dividerVertical} mx-1.5`} />
        <SecondaryButton onClick={addStep} disabled={(!routingId && isCreate) || (routing?.status === "ARCHIVED")} shortcut="Ctrl+N">
          <Plus className="h-3 w-3 stroke-current" /> Add Step
        </SecondaryButton>
        <SecondaryButton onClick={() => selectedStepId && setConfirmDelete(selectedStepId)} disabled={!selectedStepId}>
          <Trash2 className="h-3 w-3 stroke-current" /> Delete
        </SecondaryButton>
        <SecondaryButton onClick={() => { const idx = localSteps.findIndex((s) => s.id === selectedStepId); if (idx > 0) moveStepUp(idx); }} disabled={!selectedStepId || localSteps.findIndex((s) => s.id === selectedStepId) <= 0}>
          <span className="text-[9px]">▲</span> Up
        </SecondaryButton>
        <SecondaryButton onClick={() => { const idx = localSteps.findIndex((s) => s.id === selectedStepId); if (idx >= 0 && idx < localSteps.length - 1) moveStepDown(idx); }} disabled={!selectedStepId || localSteps.findIndex((s) => s.id === selectedStepId) >= localSteps.length - 1}>
          <span className="text-[9px]">▼</span> Down
        </SecondaryButton>
        <SecondaryButton onClick={handleRefresh} shortcut="Ctrl+R">
          <RefreshCw className="h-3 w-3 stroke-current" /> Refresh
        </SecondaryButton>
        <div className="w-px h-5 bg-muted mx-1.5" />
        <div className="flex-1" />
        {dirty && <span className={`text-[9px] ${theme.textWarning} mr-1`}>Unsaved changes</span>}
        <PrimaryButton onClick={handleSave} disabled={!dirty || savingState} shortcut="Ctrl+S">
          <Save className="h-3.5 w-3.5 stroke-current" /> Save
        </PrimaryButton>
        {!isCreate && (
          <PrimaryButton onClick={handleActivate} disabled={!isValid || saving || routing?.status === "ACTIVE"}>
            <CheckCircle className="h-3.5 w-3.5 stroke-current" /> Activate
          </PrimaryButton>
        )}
        <SecondaryButton onClick={handleClose} shortcut="Esc">Close</SecondaryButton>
      </div>

      {/* ── Validation Banner ── */}
      {!isValid && localSteps.length > 0 && (
        <div className={`shrink-0 flex items-center gap-2 px-4 py-1.5 ${theme.warningChip} border-b`}>
          <AlertTriangle className={`h-3 w-3 ${theme.textWarning} stroke-current shrink-0`} />
          <span className={`text-[10px] ${theme.textWarning}`}>{validationErrors[0]}</span>
        </div>
      )}

      <div className={`shrink-0 border-b border-border ${theme.surfaceBg} px-3 py-1.5`}>
        <div className={`inline-flex rounded-md border border-border ${theme.toolbarBg} p-0.5`}>
          {[
            ["process", "Process Flow"],
            ["material", "Material Flow"],
            ["bom", "BOM / Inputs"],
            ["outputs", "Outputs"],
            ["validation", "Validation"],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setActiveTab(id as any)}
              className={`h-6 rounded px-2.5 text-[10px] font-semibold transition-colors ${activeTab === id ? "bg-card text-warning shadow-sm" : `${theme.textMuted} hover:text-muted-foreground dark:hover:text-foreground`}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Steps Table ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="grid h-full min-h-0" style={{ gridTemplateColumns: "minmax(0, 1fr) 360px" }}>
          <div className="min-h-0 overflow-auto">
        {activeTab === "material" && (
          <div className="border-b border-border bg-muted px-3 py-2 text-[10px] text-muted-foreground border-border bg-muted text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-muted-foreground text-foreground">Material chain:</span>
              <span className="rounded bg-card px-2 py-0.5 bg-card">Warehouse RM</span>
              <span>→</span>
              <span className="rounded bg-card px-2 py-0.5 bg-card">Line-side/Input</span>
              <span>→</span>
              <span className="rounded bg-card px-2 py-0.5 bg-card">Operation</span>
              <span>→</span>
              <span className="rounded bg-card px-2 py-0.5 bg-card">WIP</span>
              <span>→</span>
              <span className="rounded bg-card px-2 py-0.5 bg-card">Buffer/FIFO/Kanban or Next Operation</span>
              <span>→</span>
              <span className="rounded bg-card px-2 py-0.5 bg-card">FG Warehouse</span>
            </div>
          </div>
        )}
        {activeTab === "validation" && (
          <div className="border-b border-border bg-card px-3 py-2 border-border bg-card">
            {[...validationErrors, ...materialValidationErrors].length > 0 ? (
              <div className="grid gap-1">
                {[...validationErrors, ...materialValidationErrors].map((error) => (
                  <div key={error} className="flex items-center gap-2 rounded border border-warning bg-warning px-2 py-1 text-[10px] text-warning">
                    <AlertTriangle className="h-3 w-3 stroke-current" /> {error}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[10px] text-success"><CheckCircle className="h-3 w-3 stroke-current" /> No validation issues.</div>
            )}
          </div>
        )}
        {localSteps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Settings2 className={`h-8 w-8 ${theme.icon} mb-2 stroke-current`} />
            <p className={`text-xs ${theme.textMuted} mb-2`}>No routing steps configured</p>
            {isCreate && !routing ? (
              <p className={`text-[10px] ${theme.textMuted} mb-3`}>Save the routing first, then add steps</p>
            ) : null}
            <SecondaryButton onClick={addStep}><Plus className="h-3 w-3 stroke-current" /> Add First Step</SecondaryButton>
          </div>
        ) : (
          <table className="w-full min-w-[1200px] table-fixed border-collapse">
            <thead className={`sticky top-0 z-10 ${theme.surfaceBg}`}>
              <tr className={`text-[9px] font-bold uppercase tracking-wider ${theme.textMuted} border-b border-border`}>
                <th className="w-8 px-1 py-1.5 text-center">#</th>
                <th className="w-10 px-1 py-1.5 text-center"></th>
                <th className="w-[140px] px-1 py-1.5 text-left">Department</th>
                <th className="w-[140px] px-1 py-1.5 text-left">Resource Group</th>
                <th className="w-[120px] px-1 py-1.5 text-left">Resource</th>
                <th className="w-[100px] px-1 py-1.5 text-left">Std Work</th>
                <th className="w-16 px-1 py-1.5 text-right" title="Cycle Time">CT</th>
                <th className="w-14 px-1 py-1.5 text-right" title="Setup Time">Setup</th>
                <th className="w-14 px-1 py-1.5 text-right" title="Changeover Time">Chg</th>
                <th className="w-12 px-1 py-1.5 text-right" title="Operators">Ops</th>
                <th className="w-[90px] px-1 py-1.5 text-left">Schedule</th>
                <th className="w-12 px-1 py-1.5 text-center" title="Quality Checkpoint">Qual</th>
                <th className="w-12 px-1 py-1.5 text-center" title="Rework Allowed">Rwk</th>
                <th className="w-12 px-1 py-1.5 text-center" title="Bottleneck">BN</th>
                <th className="w-16 px-1 py-1.5 text-center" title="Actions">Act</th>
              </tr>
            </thead>
            <tbody>
              {localSteps.map((step, index) => {
                const cap = capacities.find((c) => c.sequence === step.sequence);
                const isBottleneck = cap?.isBottleneck || false;
                const rowErrors = [
                  !step.departmentId ? "Missing department" : null,
                  !step.resourceGroupId ? "Missing resource group" : null,
                  !step.cycleTimeSec || step.cycleTimeSec <= 0 ? "Cycle time must be greater than 0" : null,
                ].filter(Boolean) as string[];
                return (
                  <tr key={step.id} onClick={() => setSelectedStepId(step.id)} className={`border-b border-border ${theme.interactiveRow} group cursor-pointer ${selectedStepId === step.id ? "${theme.badgeWarning}" : ""}`}>
                    <td className="px-1 py-1 text-center">
                      <span className={`text-[10px] font-mono ${theme.textMuted}`}>{step.sequence}</span>
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex flex-col items-center gap-0">
                        {rowErrors.length > 0 && (
                          <span title={rowErrors.join("; ")}>
                            <AlertTriangle className={`mb-0.5 h-3 w-3 ${theme.textWarning} stroke-current`} />
                          </span>
                        )}
                        <button onClick={() => moveStepUp(index)} disabled={index === 0}
                          className={`h-3 w-4 flex items-center justify-center ${theme.textMuted} hover:text-muted-foreground disabled:opacity-20 leading-none`}>
                          <span className="text-[7px]">▲</span>
                        </button>
                        <button onClick={() => moveStepDown(index)} disabled={index === localSteps.length - 1}
                          className="h-3 w-4 flex items-center justify-center text-muted-foreground hover:text-muted-foreground disabled:opacity-20 leading-none">
                          <span className="text-[7px]">▼</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <select value={step.departmentId || ""} onChange={(e) => updateStepField(step.id, "departmentId", e.target.value || null)}
                        className={`h-6 w-full rounded border bg-card px-1.5 text-[10px] outline-none transition-colors focus:border-warning focus:ring-1 focus:ring-warning bg-muted text-foreground ${!step.departmentId ? "border-danger" : "border-border"}`}>
                        <option value="">--</option>
                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <select value={step.resourceGroupId || ""} onChange={(e) => updateStepField(step.id, "resourceGroupId", e.target.value || null)}
                        className={`h-6 w-full rounded border bg-card px-1.5 text-[10px] outline-none transition-colors focus:border-warning focus:ring-1 focus:ring-warning bg-muted text-foreground ${!step.resourceGroupId ? "border-danger" : "border-border"}`}>
                        <option value="">--</option>
                        {filteredRG(step.departmentId).map((rg: any) => <option key={rg.id} value={rg.id}>{rg.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <select value={step.resourceId || ""} onChange={(e) => updateStepField(step.id, "resourceId", e.target.value || null)}
                        className="h-6 w-full rounded border border-border bg-card px-1.5 text-[10px] outline-none transition-colors focus:border-warning focus:ring-1 focus:ring-warning border-border bg-muted text-foreground">
                        <option value="">--</option>
                        {filteredRes(step.resourceGroupId).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <span className="block h-6 rounded border border-border bg-muted px-1.5 py-1 text-[10px] text-muted-foreground border-border bg-muted text-muted-foreground">
                        Not assigned
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" min="0" step="0.1" value={step.cycleTimeSec || ""} onChange={(e) => updateStepField(step.id, "cycleTimeSec", parseFloat(e.target.value) || 0)}
                        className={`h-6 w-full rounded border bg-card px-1.5 text-[10px] text-right outline-none transition-colors focus:border-warning focus:ring-1 focus:ring-warning bg-muted text-foreground ${!step.cycleTimeSec || step.cycleTimeSec <= 0 ? "border-danger" : "border-border"}`} />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" min="0" step="1" value={step.setupTimeSec ?? ""} onChange={(e) => updateStepField(step.id, "setupTimeSec", e.target.value ? parseInt(e.target.value) : null)}
                        className="h-6 w-full rounded border border-border bg-card px-1.5 text-[10px] text-right outline-none transition-colors focus:border-warning focus:ring-1 focus:ring-warning border-border bg-muted text-foreground" />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" min="0" step="1" value={step.changeoverTimeSec ?? ""} onChange={(e) => updateStepField(step.id, "changeoverTimeSec", e.target.value ? parseInt(e.target.value) : null)}
                        className="h-6 w-full rounded border border-border bg-card px-1.5 text-[10px] text-right outline-none transition-colors focus:border-warning focus:ring-1 focus:ring-warning border-border bg-muted text-foreground" />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" min="0" step="1" value={step.requiredOperators ?? ""} onChange={(e) => updateStepField(step.id, "requiredOperators", e.target.value ? parseInt(e.target.value) : null)}
                        className="h-6 w-full rounded border border-border bg-card px-1.5 text-[10px] text-right outline-none transition-colors focus:border-warning focus:ring-1 focus:ring-warning border-border bg-muted text-foreground" />
                    </td>
                    <td className="px-1 py-1">
                      <select value={step.scheduleSource} onChange={(e) => updateStepField(step.id, "scheduleSource", e.target.value)}
                        className="h-6 w-full rounded border border-border bg-card px-1.5 text-[9px] outline-none transition-colors focus:border-warning focus:ring-1 focus:ring-warning border-border bg-muted text-foreground">
                        <option value="LINE">LINE</option>
                        <option value="PLANT">PLANT</option>
                        <option value="DEPARTMENT">DEPT</option>
                        <option value="RESOURCE_GROUP">RG</option>
                        <option value="RESOURCE">RES</option>
                        <option value="CUSTOM">CUST</option>
                      </select>
                    </td>
                    <td className="px-1 py-1 text-center">
                      <input type="checkbox" checked={step.qualityCheckpoint} onChange={(e) => updateStepField(step.id, "qualityCheckpoint", e.target.checked)}
                        className="h-3 w-3 accent-emerald-500" />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <input type="checkbox" checked={step.reworkAllowed} onChange={(e) => updateStepField(step.id, "reworkAllowed", e.target.checked)}
                        className="h-3 w-3 accent-amber-500" />
                    </td>
                    <td className="px-1 py-1 text-center">
                      {isBottleneck ? <span className={`inline-block rounded ${theme.badgeCritical} px-1 text-[8px] font-bold`}>BN</span> : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button onClick={() => setConfirmDelete(step.id)}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded ${theme.textMuted} hover:text-danger hover:bg-danger transition-colors opacity-0 group-hover:opacity-100`}>
                        <Trash2 className="h-3 w-3 stroke-current" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
          </div>
          <div className="min-h-0 overflow-hidden border-l border-border ${theme.toolbarBg}">
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-border px-3 py-2 border-border">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>Selected Step Detail</p>
                <p className={`mt-0.5 truncate text-xs font-semibold ${theme.textPrimary}`}>
                  {selectedStep ? `Step ${selectedStep.sequence} - ${selectedStep.resourceGroupName || selectedStep.departmentName || "Unassigned"}` : "No step selected"}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-3">
                {selectedStep ? (
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Input Materials</p>
                        <button type="button" onClick={addMaterialInput} className={`text-[10px] font-semibold ${theme.textWarning}`}>+ Add</button>
                      </div>
                      {(selectedStep.materialInputs || []).map((item) => (
                        <div key={item.id} className="mb-1 rounded border border-border bg-card p-1.5 border-border bg-muted">
                          <select value={item.materialId || ""} onChange={(e) => updateMaterialItem("input", item.id || "", "materialId", e.target.value || null)} className="mb-1 h-6 w-full rounded border border-border bg-card px-1 text-[10px] border-border bg-card text-foreground">
                            <option value="">Input material</option>
                            {materials.map((material: any) => <option key={material.id} value={material.id}>{material.name} ({material.code})</option>)}
                          </select>
                          <div className="grid grid-cols-[1fr_1fr_24px] gap-1">
                            <input type="number" value={item.quantity || 1} onChange={(e) => updateMaterialItem("input", item.id || "", "quantity", Number(e.target.value || 1))} className="h-6 rounded border border-border px-1 text-[10px] border-border bg-card text-foreground" />
                            <select value={item.locationId || ""} onChange={(e) => updateMaterialItem("input", item.id || "", "locationId", e.target.value || null)} className="h-6 rounded border border-border bg-card px-1 text-[10px] border-border bg-card text-foreground">
                              <option value="">Source</option>
                              {inventoryLocations.map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}
                            </select>
                            <button type="button" onClick={() => removeMaterialItem("input", item.id || "")} className="text-danger"><Trash2 className="h-3 w-3 stroke-current" /></button>
                          </div>
                        </div>
                      ))}
                      {(selectedStep.materialInputs || []).length === 0 && <p className="text-[10px] text-warning">Input material required.</p>}
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Outputs / State</p>
                        <button type="button" onClick={addMaterialOutput} className="text-[10px] font-semibold text-warning">+ Add</button>
                      </div>
                      {(selectedStep.materialOutputs || []).map((item) => (
                        <div key={item.id} className="mb-1 rounded border border-border bg-card p-1.5 border-border bg-muted">
                          <select value={item.materialId || ""} onChange={(e) => updateMaterialItem("output", item.id || "", "materialId", e.target.value || null)} className="mb-1 h-6 w-full rounded border border-border bg-card px-1 text-[10px] border-border bg-card text-foreground">
                            <option value="">Output material</option>
                            {materials.map((material: any) => <option key={material.id} value={material.id}>{material.name} ({material.code})</option>)}
                          </select>
                          <div className="grid grid-cols-[0.7fr_0.9fr_1fr_24px] gap-1">
                            <input type="number" value={item.quantity || 1} onChange={(e) => updateMaterialItem("output", item.id || "", "quantity", Number(e.target.value || 1))} className="h-6 rounded border border-border px-1 text-[10px] border-border bg-card text-foreground" />
                            <select value={item.materialState || "WIP"} onChange={(e) => updateMaterialItem("output", item.id || "", "materialState", e.target.value)} className="h-6 rounded border border-border bg-card px-1 text-[10px] border-border bg-card text-foreground">
                              <option value="WIP">WIP</option>
                              <option value="FINISHED_GOOD">FG</option>
                              <option value="SCRAP">Scrap</option>
                              <option value="RAW_MATERIAL">RM</option>
                            </select>
                            <select value={item.locationId || ""} onChange={(e) => updateMaterialItem("output", item.id || "", "locationId", e.target.value || null)} className="h-6 rounded border border-border bg-card px-1 text-[10px] border-border bg-card text-foreground">
                              <option value="">Destination</option>
                              {inventoryLocations.map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}
                            </select>
                            <button type="button" onClick={() => removeMaterialItem("output", item.id || "")} className="text-danger"><Trash2 className="h-3 w-3 stroke-current" /></button>
                          </div>
                        </div>
                      ))}
                      {(selectedStep.materialOutputs || []).length === 0 && <p className="text-[10px] text-warning">Output material/state required.</p>}
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Movement Rule</p>
                      <select value={selectedStep.movementRule?.ruleType || "NEXT_OPERATION"} onChange={(e) => updateMaterialFlow(selectedStep.id, { movementRule: { ...(selectedStep.movementRule || {}), ruleType: e.target.value } })} className="mb-1 h-6 w-full rounded border border-border bg-card px-1 text-[10px] border-border bg-muted text-foreground">
                        <option value="LINE_SIDE">Line-side</option>
                        <option value="BUFFER">Buffer</option>
                        <option value="SUPERMARKET">Supermarket</option>
                        <option value="FIFO">FIFO</option>
                        <option value="KANBAN">Kanban</option>
                        <option value="NEXT_OPERATION">Next Operation</option>
                        <option value="FINISHED_GOODS">FG Warehouse</option>
                      </select>
                      <textarea value={selectedStep.movementRule?.notes || ""} onChange={(e) => updateMaterialFlow(selectedStep.id, { movementRule: { ...(selectedStep.movementRule || {}), notes: e.target.value } })} placeholder="Scrap/byproduct or material handling notes" className="h-14 w-full rounded border border-border bg-card px-2 py-1 text-[10px] border-border bg-muted text-foreground" />
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Select a process step to configure material flow.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Stats ── */}
      <div className={`h-14 shrink-0 border-t border-border bg-muted px-4 flex items-center gap-4 text-[9px] ${theme.textMuted}`}>
        <span>{localSteps.length} step{localSteps.length !== 1 ? "s" : ""}</span>
        {localSteps.length > 0 && (
          <>
            <span>First: <strong className="text-muted-foreground">{localSteps[0]?.departmentName || localSteps[0]?.departmentId ? departments.find((d: any) => d.id === localSteps[0]?.departmentId)?.name || "Unassigned" : "Unassigned"}</strong></span>
            <span>Last: <strong className="text-muted-foreground">{localSteps[localSteps.length - 1]?.departmentName || localSteps[localSteps.length - 1]?.departmentId ? departments.find((d: any) => d.id === localSteps[localSteps.length - 1]?.departmentId)?.name || "Unassigned" : "Unassigned"}</strong></span>
          </>
        )}
        {!isValid && <span className={`${theme.textWarning}`}>{validationErrors.length} error{validationErrors.length !== 1 ? "s" : ""}</span>}
        {dirty && <span className={`${theme.textWarning}`}>Unsaved changes</span>}
      </div>
    </div>
  );
}
