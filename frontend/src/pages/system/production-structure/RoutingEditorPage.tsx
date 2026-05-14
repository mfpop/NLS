import { useState, useEffect, useCallback } from "react";
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
import { ProductionLineProductScopeSummary } from "./components";
import type { ProductionLine } from "@/types/productionLine";

const PILL_BASE = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold";
const PILL_VARIANTS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  archived: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  configured: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  missing: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  invalid: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
};

function PillBadge({ variant = "draft", label }: { variant?: string; label: string }) {
  return <span className={`${PILL_BASE} ${PILL_VARIANTS[variant] || PILL_VARIANTS.draft}`}>{label}</span>;
}

const shortcutClass = "ml-1 hidden lg:inline text-[8px] opacity-50 font-mono";

function SecondaryButton({ children, onClick, disabled = false, shortcut }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; shortcut?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={shortcut ? `Shortcut: ${shortcut}` : undefined}
      className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 bg-white px-2.5 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
      {children}{shortcut ? <kbd className={shortcutClass}>{shortcut}</kbd> : null}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled = false, shortcut }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; shortcut?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={shortcut ? `Shortcut: ${shortcut}` : undefined}
      className="inline-flex h-7 items-center gap-1 rounded-md bg-amber-500 px-3 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">
      {children}{shortcut ? <kbd className={`${shortcutClass} text-white/60`}>{shortcut}</kbd> : null}
    </button>
  );
}

export function RoutingEditorPage() {
  const { productionLineId, routingId } = useParams<{ productionLineId: string; routingId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationState = (window.history.state as any)?.usr;
  const isCreate = !routingId || routingId === "new";

  const { routing, refetch: refetchRouting } = useRouting(isCreate ? null : routingId!);
  const { createRouting, updateRouting, activateRouting, createStep, updateStep, deleteStep, saving } = useRoutingMutations();
  const { capacities } = useStepCapacities(routingId || null);

  const [localSteps, setLocalSteps] = useState<RoutingStep[]>([]);
  const [dirty, setDirty] = useState(false);
  const [savingState, setSavingState] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
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
  const lineModels = productionLine?.productModels ?? [];
  const requestedScope = searchParams.get("routingScope");
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
        productModelId: routing.productModelId || "",
        version: routing.version,
        notes: routing.notes,
      });
      setDirty(false);
    }
  }, [routing]);

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
      if (isCreate) {
        const result = await createRouting({
          productionLineId: productionLineId!,
          productFamilyId: routingMeta.productFamilyId || null,
          productModelId: modelId,
          version: routingMeta.version || "1.0",
          notes: routingMeta.notes || "",
        });
        if (!result.ok) {
          setToast({ message: "Failed to create routing", type: "error" });
          setSavingState(false);
          return;
        }
        const newRoutingId = result.routing!.id;
        for (const step of localSteps) {
          await createStep({ ...step, routingId: newRoutingId });
        }
        await refetchRouting();
        setToast({ message: "Routing saved", type: "success" });
        setDirty(false);
        const base = window.location.pathname.includes("/components/") ? "/system/production-structure/components/routing" : "/system/production-structure/flow/routing";
        navigate(`${base}/${productionLineId}/${newRoutingId}`, { replace: true });
      } else {
        const result = await updateRouting(routingId!, {
          productionLineId: productionLineId!,
          productFamilyId: routingMeta.productFamilyId || null,
          productModelId: modelId,
          version: routingMeta.version || "1.0",
          notes: routingMeta.notes || "",
        });
        if (!result.ok) {
          setToast({ message: "Failed to update routing", type: "error" });
          setSavingState(false);
          return;
        }
        for (const step of localSteps) {
          if (step.id.startsWith("new-")) {
            await createStep({ ...step, routingId: routingId! });
          } else {
            await updateStep(step.id, step);
          }
        }
        await refetchRouting();
        setToast({ message: "Routing saved", type: "success" });
        setDirty(false);
      }
    } catch {
      setToast({ message: "Failed to save routing", type: "error" });
    }
    setSavingState(false);
  }, [isCreate, createRouting, routingId, productionLineId, routingMeta, localSteps, updateRouting, createStep, updateStep, refetchRouting, navigate]);

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
    if (!stepId.startsWith("new-")) {
      await deleteStep(stepId);
    }
    setLocalSteps((prev) => {
      const filtered = prev.filter((s) => s.id !== stepId);
      return filtered.map((s, i) => ({ ...s, sequence: i + 1 }));
    });
    setConfirmDelete(null);
    markDirty();
  }, [deleteStep, markDirty]);

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

  const statusVariant = routing?.status === "ACTIVE" ? "active" : routing?.status === "ARCHIVED" ? "archived" : "draft";

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-xs font-medium shadow-lg ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
        }`}>{toast.message}</div>
      )}

      {confirmClose && (
        <ConfirmDialog open={true} onClose={() => setConfirmClose(false)} title="Discard unsaved routing changes?" message="Discard unsaved routing changes?" onConfirm={() => { setConfirmClose(false); const from = locationState?.from || `/system/production-structure/components/line`; navigate(from, { state: locationState?.returnState || undefined }); }} />
      )}
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete step?" message="This cannot be undone. The step will be permanently deleted." onConfirm={() => handleDeleteStep(confirmDelete)} />
      )}

      {/* ── Header (identity only) ── */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
            <Settings2 className="h-4 w-4 stroke-current" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Flow / Routing</h2>
              <PillBadge variant={statusVariant} label={routing?.status || "DRAFT"} />
              {!isValid && localSteps.length > 0 && <PillBadge variant="invalid" label="Has errors" />}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
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
      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <SecondaryButton onClick={handleClose} shortcut="Esc">
          <ArrowLeft className="h-3 w-3 stroke-current" /> Back
        </SecondaryButton>
        <select value={routingMeta.productModelId} onChange={(e) => { setRoutingMeta((p) => ({ ...p, productModelId: e.target.value })); markDirty(); }}
          className="h-7 rounded border border-slate-200 bg-white px-2 text-[10px] outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
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
          className="h-7 w-14 rounded border border-slate-200 bg-white px-2 text-[10px] outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 ml-1" />
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5" />
        <SecondaryButton onClick={addStep} disabled={(!routingId && isCreate) || (routing?.status === "ARCHIVED")} shortcut="Ctrl+N">
          <Plus className="h-3 w-3 stroke-current" /> Add Step
        </SecondaryButton>
        <SecondaryButton onClick={() => selectedStepId && deleteStep(selectedStepId).then(() => { setLocalSteps((prev) => prev.filter((s) => s.id !== selectedStepId).map((s, i) => ({ ...s, sequence: i + 1 }))); setDirty(true); setSelectedStepId(null); })} disabled={!selectedStepId}>
          <Trash2 className="h-3 w-3 stroke-current" /> Delete
        </SecondaryButton>
        <SecondaryButton onClick={() => { const idx = localSteps.findIndex((s) => s.id === selectedStepId); if (idx > 0) moveStepUp(idx); }} disabled={!selectedStepId || localSteps.findIndex((s) => s.id === selectedStepId) <= 0}>
          <span className="text-[9px]">&#9650;</span> Up
        </SecondaryButton>
        <SecondaryButton onClick={() => { const idx = localSteps.findIndex((s) => s.id === selectedStepId); if (idx >= 0 && idx < localSteps.length - 1) moveStepDown(idx); }} disabled={!selectedStepId || localSteps.findIndex((s) => s.id === selectedStepId) >= localSteps.length - 1}>
          <span className="text-[9px]">&#9660;</span> Down
        </SecondaryButton>
        <SecondaryButton onClick={handleRefresh} shortcut="Ctrl+R">
          <RefreshCw className="h-3 w-3 stroke-current" /> Refresh
        </SecondaryButton>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5" />
        <div className="flex-1" />
        {dirty && <span className="text-[9px] text-amber-500 mr-1">Unsaved changes</span>}
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
        <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-orange-50 dark:bg-orange-500/10 border-b border-orange-100 dark:border-orange-500/20">
          <AlertTriangle className="h-3 w-3 text-orange-500 stroke-current shrink-0" />
          <span className="text-[10px] text-orange-700 dark:text-orange-300">{validationErrors[0]}</span>
        </div>
      )}

      {/* ── Steps Table ── */}
      <div className="flex-1 overflow-auto">
        {localSteps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Settings2 className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2 stroke-current" />
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">No routing steps configured</p>
            {isCreate && !routing ? (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3">Save the routing first, then add steps</p>
            ) : null}
            <SecondaryButton onClick={addStep}><Plus className="h-3 w-3 stroke-current" /> Add First Step</SecondaryButton>
          </div>
        ) : (
          <table className="w-full min-w-[1200px] table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
              <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
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
                  <tr key={step.id} onClick={() => setSelectedStepId(step.id)} className={`border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group cursor-pointer ${selectedStepId === step.id ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                    <td className="px-1 py-1 text-center">
                      <span className="text-[10px] font-mono text-slate-400">{step.sequence}</span>
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex flex-col items-center gap-0">
                        {rowErrors.length > 0 && (
                          <span title={rowErrors.join("; ")}>
                            <AlertTriangle className="mb-0.5 h-3 w-3 text-orange-500 stroke-current" />
                          </span>
                        )}
                        <button onClick={() => moveStepUp(index)} disabled={index === 0}
                          className="h-3 w-4 flex items-center justify-center text-slate-300 hover:text-slate-600 disabled:opacity-20 leading-none">
                          <span className="text-[7px]">&#9650;</span>
                        </button>
                        <button onClick={() => moveStepDown(index)} disabled={index === localSteps.length - 1}
                          className="h-3 w-4 flex items-center justify-center text-slate-300 hover:text-slate-600 disabled:opacity-20 leading-none">
                          <span className="text-[7px]">&#9660;</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <select value={step.departmentId || ""} onChange={(e) => updateStepField(step.id, "departmentId", e.target.value || null)}
                        className={`h-6 w-full rounded border bg-white px-1.5 text-[10px] outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-100 dark:bg-slate-800 dark:text-slate-200 ${!step.departmentId ? "border-red-300 dark:border-red-500/30" : "border-slate-200 dark:border-slate-700"}`}>
                        <option value="">--</option>
                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <select value={step.resourceGroupId || ""} onChange={(e) => updateStepField(step.id, "resourceGroupId", e.target.value || null)}
                        className={`h-6 w-full rounded border bg-white px-1.5 text-[10px] outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-100 dark:bg-slate-800 dark:text-slate-200 ${!step.resourceGroupId ? "border-red-300 dark:border-red-500/30" : "border-slate-200 dark:border-slate-700"}`}>
                        <option value="">--</option>
                        {filteredRG(step.departmentId).map((rg: any) => <option key={rg.id} value={rg.id}>{rg.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <select value={step.resourceId || ""} onChange={(e) => updateStepField(step.id, "resourceId", e.target.value || null)}
                        className="h-6 w-full rounded border border-slate-200 bg-white px-1.5 text-[10px] outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <option value="">--</option>
                        {filteredRes(step.resourceGroupId).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <select value={step.standardWorkId || ""} onChange={(e) => updateStepField(step.id, "standardWorkId", e.target.value || null)}
                        className="h-6 w-full rounded border border-slate-200 bg-white px-1.5 text-[10px] outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <option value="">--</option>
                        {lineModels.map((m: any) => <option key={m.id} value={m.id}>{m.code}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" min="0" step="0.1" value={step.cycleTimeSec || ""} onChange={(e) => updateStepField(step.id, "cycleTimeSec", parseFloat(e.target.value) || 0)}
                        className={`h-6 w-full rounded border bg-white px-1.5 text-[10px] text-right outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-100 dark:bg-slate-800 dark:text-slate-200 ${!step.cycleTimeSec || step.cycleTimeSec <= 0 ? "border-red-300 dark:border-red-500/30" : "border-slate-200 dark:border-slate-700"}`} />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" min="0" step="1" value={step.setupTimeSec ?? ""} onChange={(e) => updateStepField(step.id, "setupTimeSec", e.target.value ? parseInt(e.target.value) : null)}
                        className="h-6 w-full rounded border border-slate-200 bg-white px-1.5 text-[10px] text-right outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" min="0" step="1" value={step.changeoverTimeSec ?? ""} onChange={(e) => updateStepField(step.id, "changeoverTimeSec", e.target.value ? parseInt(e.target.value) : null)}
                        className="h-6 w-full rounded border border-slate-200 bg-white px-1.5 text-[10px] text-right outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" min="0" step="1" value={step.requiredOperators ?? ""} onChange={(e) => updateStepField(step.id, "requiredOperators", e.target.value ? parseInt(e.target.value) : null)}
                        className="h-6 w-full rounded border border-slate-200 bg-white px-1.5 text-[10px] text-right outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                    </td>
                    <td className="px-1 py-1">
                      <select value={step.scheduleSource} onChange={(e) => updateStepField(step.id, "scheduleSource", e.target.value)}
                        className="h-6 w-full rounded border border-slate-200 bg-white px-1.5 text-[9px] outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
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
                      {isBottleneck ? <span className="inline-block rounded bg-red-100 px-1 text-[8px] font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400">BN</span> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button onClick={() => setConfirmDelete(step.id)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
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

      {/* ── Footer Stats ── */}
      <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center gap-4 text-[9px] text-slate-400 dark:text-slate-500">
        <span>{localSteps.length} step{localSteps.length !== 1 ? "s" : ""}</span>
        {localSteps.length > 0 && (
          <>
            <span>First: <strong className="text-slate-500 dark:text-slate-400">{localSteps[0]?.departmentName || localSteps[0]?.departmentId ? departments.find((d: any) => d.id === localSteps[0]?.departmentId)?.name || "Unassigned" : "Unassigned"}</strong></span>
            <span>Last: <strong className="text-slate-500 dark:text-slate-400">{localSteps[localSteps.length - 1]?.departmentName || localSteps[localSteps.length - 1]?.departmentId ? departments.find((d: any) => d.id === localSteps[localSteps.length - 1]?.departmentId)?.name || "Unassigned" : "Unassigned"}</strong></span>
          </>
        )}
        {!isValid && <span className="text-orange-500">{validationErrors.length} error{validationErrors.length !== 1 ? "s" : ""}</span>}
        {dirty && <span className="text-amber-500">Unsaved changes</span>}
      </div>
    </div>
  );
}
