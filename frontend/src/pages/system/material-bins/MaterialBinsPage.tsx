import { useState, useEffect, useCallback, useRef } from "react";
import { theme } from "../../../styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { CheckCircle, Package, Factory, Layers, Warehouse, Box, RefreshCw, Plus, Pencil, Trash2, X, GripVertical, Check, Map, Route, Database, ArrowRight, ArrowLeft, AlertTriangle, Building2, Shield, LayoutGrid, LineChart, CheckSquare, XSquare } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PRODUCTION_LINES_QUERY, RESOURCE_GROUPS_QUERY, MATERIAL_BINS_QUERY } from "@/graphql/manufacturingQueries";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { CREATE_MATERIAL_BIN, UPDATE_MATERIAL_BIN, ARCHIVE_MATERIAL_BIN } from "@/graphql/dataManagementMutations";
import { useToolbar, useRegisterActions } from "../production-structure/components/ToolbarContext";
import { Pagination } from "../production-structure/components";
import { ConfirmDialog } from "../production-structure/shared";
import { formatAppDate } from "@/utils/dateFormat";
import { BIN_TYPE_OPTIONS, REPLENISHMENT_OPTIONS } from "@/types/materialBin";

const PER_PAGE = 10;

type ListResult<T> = T[] | { items?: T[] };

interface Plant { id: string; code: string; name: string }
interface ProductionLine { id: string; code: string; name: string; plantId: string }
interface ResourceGroup { id: string; code: string; name: string; departmentName?: string; plantId?: string }
interface MaterialBin {
  id: string; plantId: string; plantName: string;
  productionLineId?: string | null; productionLineName?: string | null;
  resourceGroupId?: string | null; resourceGroupName?: string | null;
  code: string; name: string; description: string; binType: string;
  materialId?: string | null; materialCode?: string | null; materialName?: string | null;
  materialGroup: string; capacity: number;
  uomId?: string | null; uomName?: string | null;
  replenishmentMode?: string | null;
  fifoEnabled: boolean; supermarketEnabled: boolean;
  locationCode: string; locationReference: string; warehouseCode: string;
  isActive: boolean; createdAt: string; updatedAt: string;
}

interface BinForm {
  plantId: string; productionLineId: string; resourceGroupId: string;
  code: string; name: string; description: string; binType: string;
  materialId: string; materialGroup: string; capacity: string; minLevel: string;
  maxLevel: string; reorderPoint: string; uomId: string; replenishmentMode: string;
  binMode: string;
  locationCode: string; locationReference: string; warehouseCode: string; isActive: boolean;
}

interface MutationError { field?: string | null; code?: string; message: string }
interface BinPayload { ok: boolean; materialBin?: MaterialBin | null; errors?: MutationError[] }

function listItems<T>(value: ListResult<T> | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

const BIN_MODE_OPTIONS = [
  { value: "standard", label: "Standard Bin" },
  { value: "fifo", label: "FIFO Lane" },
  { value: "supermarket", label: "Supermarket" },
];

const TYPE_COLORS: Record<string, string> = {
  RM: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  INPUT: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  OUTPUT: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  WIP: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  FIFO: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  SUPERMARKET: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  FG: "bg-green-500/10 text-green-600 border-green-500/20",
  SCRAP: "bg-red-500/10 text-red-600 border-red-500/20",
  QUARANTINE: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  SPARES: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  LINE_SIDE: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const ET: Record<string, string> = {
  description: "No description", productionLineId: "Not assigned",
  resourceGroupId: "Not assigned", materialId: "No material",
  materialGroup: "Not set", uomId: "Not set",
  locationCode: "Not set", locationReference: "Not set",
  warehouseCode: "Not set", minLevel: "Not set", maxLevel: "Not set", reorderPoint: "Not set",
};

function Badge({ label, variant = "default" }: { label: string; variant?: "active" | "inactive" | "new" | "default" | "rose" | "warning" }) {
  const m: Record<string, string> = {
    active: `${theme.badgeActive}`, inactive: `${theme.badgeInactive}`,
    rose: `${theme.badgeCritical}`, warning: `${theme.badgeWarning}`,
    new: `${theme.iconBoxBlue}`, default: `${theme.badgeInactive}`,
  };
  return <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ${m[variant]}`}>{label}</span>;
}

function SectionCard({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border/40 ${theme.surfaceBg} p-2 shadow-sm shadow-foreground/5 ${className}`}>
      <div className="mb-1.5 flex min-h-6 items-center gap-2">
        <h3 className={`flex-1 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function InlineRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "100px minmax(0,1fr)" }}>
      <span className={`flex items-center gap-1 text-[10px] font-medium ${theme.textMuted} truncate`}>
        {icon && <span className="shrink-0">{icon}</span>}
        {label}
      </span>
      <span className={`text-[12px] font-medium ${theme.textPrimary} min-w-0 truncate`}>{value}</span>
    </div>
  );
}

function ValidationPill({ ok, label, warning }: { ok: boolean; label: string; warning?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium border ${
      ok ? "bg-success/8 text-success border-success/15"
      : warning ? "bg-warning/8 text-warning border-warning/15"
      : "bg-danger/8 text-danger border-danger/15"
    }`}>
      {ok ? <CheckCircle className="h-2.5 w-2.5 stroke-current" /> : <AlertTriangle className="h-2.5 w-2.5 stroke-current" />}
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const opt = BIN_TYPE_OPTIONS.find((o) => o.value === type);
  const colors = TYPE_COLORS[type] || "bg-slate-500/10 text-slate-600 border-slate-500/20";
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${colors}`}>{opt?.label || type}</span>;
}

function ModeChip({ mode, active, onClick }: { mode: string; active: boolean; onClick: () => void }) {
  const m = BIN_MODE_OPTIONS.find((o) => o.value === mode);
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
        active
          ? "bg-sidebar-material-bins/10 text-sidebar-material-bins border-sidebar-material-bins/25 shadow-sm"
          : "bg-transparent text-muted-foreground border-border/40 hover:border-border/60"
      }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-sidebar-material-bins" : "bg-muted-foreground/40"}`} />
      {m?.label || mode}
    </button>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex h-6 items-center gap-1 rounded border border-border/60 ${theme.surfaceBg} px-2 text-[10px] font-medium ${theme.textSecondary} transition-colors ${theme.interactiveRow} whitespace-nowrap`}>
      {icon}{label}
    </button>
  );
}

export function MaterialBinsPage() {
  const { search, setSearch, statusFilter, setStatusFilter, setFooterContent, setToolbarVariant, showSystemMessage } = useToolbar();
  const registerActions = useRegisterActions();

  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ plantId: "", binType: "" });
  const [form, setForm] = useState<BinForm>({
    plantId: "", productionLineId: "", resourceGroupId: "", code: "", name: "",
    description: "", binType: "INPUT", materialId: "", materialGroup: "",
    capacity: "0", minLevel: "", maxLevel: "", reorderPoint: "", uomId: "", replenishmentMode: "",
    binMode: "standard",
    locationCode: "", locationReference: "", warehouseCode: "", isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [showLinesModal, setShowLinesModal] = useState(false);
  const [showZonesModal, setShowZonesModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);

  const splitRef = useRef<HTMLDivElement>(null);

  const [leftPct, setLeftPct] = useState(20);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(Math.max(pct, 10), 50));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const { data: binsData, loading, refetch: refetchBins } = useQuery<{ materialBins: ListResult<MaterialBin> }>(MATERIAL_BINS_QUERY, {
    variables: {
      plantId: filters.plantId || undefined,
      binType: filters.binType || undefined,
      isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      search: search || undefined,
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const { data: plantsData } = useQuery<{ plants: ListResult<Plant> }>(PLANTS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: linesData } = useQuery<{ productionLines: ListResult<ProductionLine> }>(PRODUCTION_LINES_QUERY, {
    variables: { plantId: form.plantId || undefined },
    fetchPolicy: "cache-and-network", errorPolicy: "all", skip: !form.plantId,
  });
  const { data: rgData } = useQuery<{ resourceGroups: ListResult<ResourceGroup> }>(RESOURCE_GROUPS_QUERY, {
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const [createBin] = useMutation<{ createMaterialBin: BinPayload }>(CREATE_MATERIAL_BIN);
  const [updateBin] = useMutation<{ updateMaterialBin: BinPayload }>(UPDATE_MATERIAL_BIN);
  const [archiveBin] = useMutation<{ archiveMaterialBin: BinPayload }>(ARCHIVE_MATERIAL_BIN);

  const bins = listItems(binsData?.materialBins);
  const plants = listItems(plantsData?.plants);
  const lines = listItems(linesData?.productionLines);
  const rgList = listItems(rgData?.resourceGroups);
  const plantOptions = plants.map((p) => ({ id: p.id, code: p.code, name: p.name }));

  const filtered = bins.filter((b) => {
    if (filters.plantId && b.plantId !== filters.plantId) return false;
    if (filters.binType && b.binType !== filters.binType) return false;
    if (statusFilter !== "all") { const active = statusFilter === "active"; if (b.isActive !== active) return false; }
    if (search && !`${b.code} ${b.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? bins.find((b) => b.id === selectedId) ?? null : null;
  const isForm = mode === "edit" || mode === "create";

  const groupedByPlant = plantOptions.map((pl) => ({
    plant: pl,
    bins: paginated.filter((b) => b.plantId === pl.id),
  })).filter((g) => g.bins.length > 0);

  const clearForm = useCallback(() => {
    setForm({
      plantId: "", productionLineId: "", resourceGroupId: "", code: "", name: "",
      description: "", binType: "INPUT", materialId: "", materialGroup: "",
      capacity: "0", minLevel: "", maxLevel: "", reorderPoint: "", uomId: "", replenishmentMode: "",
      binMode: "standard",
      locationCode: "", locationReference: "", warehouseCode: "", isActive: true,
    });
    setErrors({}); setMutationError(null);
  }, []);

  const loadForm = useCallback((b: MaterialBin) => {
    const hasFifo = !!b.fifoEnabled;
    const hasSuper = !!b.supermarketEnabled;
    const binMode = hasFifo ? "fifo" : hasSuper ? "supermarket" : "standard";
    setForm({
      plantId: b.plantId || "", productionLineId: b.productionLineId || "", resourceGroupId: b.resourceGroupId || "",
      code: b.code || "", name: b.name || "", description: b.description || "",
      binType: b.binType || "INPUT", materialId: b.materialId || "", materialGroup: b.materialGroup || "",
      capacity: String(b.capacity ?? 0), minLevel: "", maxLevel: "", reorderPoint: "",
      uomId: b.uomId || "", replenishmentMode: b.replenishmentMode || "",
      binMode,
      locationCode: b.locationCode || "", locationReference: b.locationReference || "",
      warehouseCode: b.warehouseCode || "", isActive: b.isActive,
    });
    setErrors({}); setMutationError(null);
  }, []);

  const hNew = useCallback(() => { clearForm(); setSelectedId(null); setMode("create"); }, [clearForm]);
  const hEdit = useCallback(() => { if (sel) { loadForm(sel); setMode("edit"); } }, [sel, loadForm]);
  const hCancel = useCallback(() => { if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); } }, [sel, loadForm, clearForm]);

  const hSave = useCallback(async () => {
    setMutationError(null);
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = "Required";
    if (!form.code?.trim()) errs.code = "Required";
    if (!form.plantId) errs.plantId = "Required";
    if (["RM", "FG"].includes(form.binType) && !form.warehouseCode?.trim()) errs.warehouseCode = "Warehouse reference required";
    if (["INPUT", "OUTPUT", "WIP"].includes(form.binType) && !form.resourceGroupId && !form.productionLineId) {
      errs.resourceGroupId = "Resource group or line required";
    }
    if (form.binMode !== "standard" && (!form.capacity || Number(form.capacity) <= 0)) errs.capacity = "Capacity required for FIFO/Supermarket";
    if (Object.keys(errs).length > 0) {
      setErrors(errs); showSystemMessage("Please fix validation errors", "error"); return;
    }
    const fifo = form.binMode === "fifo";
    const supermarket = form.binMode === "supermarket";
    const input: Record<string, unknown> = {
      plantId: form.plantId, productionLineId: form.productionLineId || null,
      resourceGroupId: form.resourceGroupId || null,
      code: form.code.trim(), name: form.name.trim(), description: form.description || "",
      binType: form.binType, materialId: form.materialId || null,
      materialGroup: form.materialGroup || "", capacity: Number(form.capacity) || 0,
      uomId: form.uomId || null, replenishmentMode: form.replenishmentMode || null,
      fifoEnabled: fifo, supermarketEnabled: supermarket,
      locationCode: form.locationCode || "", locationReference: form.locationReference || "",
      warehouseCode: form.warehouseCode || "", isActive: true,
    };
    let payload: BinPayload | undefined;
    if (mode === "edit" && selectedId) {
      const result = await updateBin({ variables: { id: selectedId, input } });
      payload = result.data?.updateMaterialBin;
    } else {
      const result = await createBin({ variables: { input } });
      payload = result.data?.createMaterialBin;
    }
    if (!payload?.ok) {
      const nextErrors: Record<string, string> = {};
      for (const err of payload?.errors ?? []) { if (err.field) nextErrors[err.field] = err.message; }
      setErrors(nextErrors);
      const msg = payload?.errors?.[0]?.message || "Bin could not be saved.";
      setMutationError(msg); showSystemMessage(msg, "error"); return;
    }
    if (payload.materialBin?.id) setSelectedId(payload.materialBin.id);
    await refetchBins(); setMode("view"); showSystemMessage("Bin saved", "success");
  }, [form, mode, selectedId, createBin, updateBin, refetchBins, showSystemMessage]);

  const hArchive = useCallback(async () => {
    if (!confirmArchive) return;
    setMutationError(null);
    const result = await archiveBin({ variables: { id: confirmArchive } });
    const payload = result.data?.archiveMaterialBin;
    if (!payload?.ok) {
      const msg = payload?.errors?.[0]?.message || "Bin could not be archived.";
      setMutationError(msg); showSystemMessage(msg, "error"); setConfirmArchive(null); return;
    }
    setSelectedId(null); await refetchBins(); setConfirmArchive(null);
    showSystemMessage("Bin archived", "success");
  }, [confirmArchive, archiveBin, refetchBins, showSystemMessage]);

  useEffect(() => { setPage(1); }, [search, statusFilter, filters]);

  useEffect(() => {
    setToolbarVariant("splitListDetail");
    if (mode === "edit" || mode === "create") {
      registerActions({ onSave: hSave, onCancel: hCancel });
    } else {
      registerActions({
        onAdd: hNew, onEdit: sel ? hEdit : undefined,
        onDelete: sel ? () => setConfirmArchive(sel.id) : undefined,
        onRefresh: () => refetchBins(), hasSelected: !!sel,
      });
    }
    setFooterContent(`${filtered.length} bin${filtered.length !== 1 ? "s" : ""}`);
  }, [mode, sel, filtered.length, hSave, hCancel, hNew, hEdit, registerActions, refetchBins, setToolbarVariant, setFooterContent]);

  const g = (k: keyof BinForm) => String(form[k] ?? "");
  const s = (k: keyof BinForm, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  const ev = (k: string, v: string | number | boolean | null | undefined) =>
    v !== null && v !== undefined && String(v).trim()
      ? <span className={`${theme.textPrimary}`}>{String(v)}</span>
      : <span className={`${theme.textMuted} italic text-[11px]`}>{ET[k] || "-"}</span>;

  const iCls = `h-7 w-full rounded-md ${theme.input} px-2 text-[11px] outline-none ${theme.textPrimary} transition-all ${theme.focusRingCritical}`;
  const sCls = `h-7 w-full rounded-md ${theme.input} px-2 text-[11px] outline-none ${theme.textPrimary} transition-all ${theme.focusRingCritical}`;

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <Package className="h-5 w-5 text-muted-foreground stroke-current" />
            </div>
            <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1`}>Material Bin Details</h3>
            <p className={`text-xs ${theme.textSecondary} leading-relaxed`}>Select a bin or create a new one to manage its configuration.</p>
          </div>
        </div>
      );
    }

    const title = mode === "create" ? "New Material Bin" : `${sel!.code} - ${sel!.name}`;
    const bin: Partial<MaterialBin> = sel ?? {};
    const binMode = bin.fifoEnabled ? "fifo" : bin.supermarketEnabled ? "supermarket" : "standard";

    const validations = bin.plantId ? {
      plant: true,
      rg: !!bin.resourceGroupId || ["RM", "FG", "SCRAP", "QUARANTINE", "SPARES"].includes(bin.binType || ""),
      warehouse: !!bin.warehouseCode || !["RM", "FG"].includes(bin.binType || ""),
      capacity: (bin.capacity ?? 0) > 0 || bin.binType === "LINE_SIDE",
      uom: !!bin.uomId || (bin.capacity ?? 0) <= 0,
      replenishment: !["FIFO", "SUPERMARKET"].includes(bin.binType || "") || !!bin.replenishmentMode,
    } : { plant: false, rg: false, warehouse: false, capacity: true, uom: true, replenishment: true };

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/50">
          <div className="flex items-stretch gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-entity-warehouse-bg text-entity-warehouse shadow-sm">
              <Package className="h-4 w-4 stroke-current" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className={`truncate text-[16px] font-bold leading-5 ${theme.textPrimary}`}>{title}</h2>
                {bin.code && <span className={`shrink-0 rounded px-1.5 py-px font-mono text-[9px] ${theme.codeBadge}`}>{bin.code}</span>}
              </div>
              <div className={`mt-1 flex flex-wrap items-center gap-1.5 text-[10px] ${theme.textMuted}`}>
                <span className="flex items-center gap-0.5"><Factory className="h-2.5 w-2.5 stroke-current" />{bin.plantName || "-"}</span>
                <span className="text-muted-foreground">·</span>
                <TypeBadge type={bin.binType || ""} />
                {bin.warehouseCode && (<><span className="text-muted-foreground">·</span><span className="flex items-center gap-0.5"><Warehouse className="h-2.5 w-2.5 stroke-current" />{bin.warehouseCode}</span></>)}
              </div>
            </div>
            {/* Detail header actions */}
            <div className="flex items-center gap-1">
              <ActionButton icon={<Shield className="h-3 w-3 stroke-current" />} label="Validate" onClick={() => setShowValidateModal(true)} />
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              {bin.fifoEnabled && <span className={`inline-flex items-center rounded-md border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-cyan-600`}>FIFO</span>}
              {bin.supermarketEnabled && <span className={`inline-flex items-center rounded-md border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-orange-600`}>SM</span>}
              <Badge label={bin.isActive ? "active" : "inactive"} variant={bin.isActive ? "active" : "inactive"} />
              {isForm && <Badge label="Editing" variant="rose" />}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {mutationError && mode !== "view" && (
            <div className="shrink-0 px-4 pt-2"><p className={`text-[10px] font-medium ${theme.textCritical}`}>{mutationError}</p></div>
          )}

          <div className="flex-1 flex min-h-0 overflow-hidden p-3 gap-3">
            {/* LEFT COLUMN: Identity + Ownership + Capacity */}
            <div className="flex flex-col min-h-0 w-2/5 gap-2 overflow-y-auto">
              <SectionCard title="Identity">
                {isForm ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div><input type="text" value={g("name")} onChange={(e) => s("name", e.target.value)} placeholder="Name *" className={iCls} />{errors.name && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.name}</p>}</div>
                      <div><input type="text" value={g("code")} onChange={(e) => s("code", e.target.value)} placeholder="Code *" className={iCls} />{errors.code && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.code}</p>}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select value={g("binType")} onChange={(e) => s("binType", e.target.value)} className={sCls}>{BIN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                      <select value={g("plantId")} onChange={(e) => s("plantId", e.target.value)} className={sCls}><option value="">Select Plant *</option>{plants.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select>
                    </div>
                    {errors.plantId && <p className={`text-[9px] ${theme.textCritical}`}>{errors.plantId}</p>}
                    <div><textarea value={g("description")} onChange={(e) => s("description", e.target.value)} placeholder="Description" className={`h-10 w-full rounded-md ${theme.input} px-2 text-[11px] outline-none ${theme.textPrimary} resize-none`} /></div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="space-y-px">
                      <InlineRow label="Name" value={bin.name} />
                      <InlineRow label="Code" value={bin.code} />
                      <InlineRow label="Type" value={<TypeBadge type={bin.binType || ""} />} />
                      <InlineRow label="Plant" value={bin.plantName} icon={<Factory className="h-2.5 w-2.5" />} />
                      <InlineRow label="Description" value={ev("description", bin.description)} />
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Ownership">
                {isForm ? (
                  <div className="space-y-1.5">
                    <div>
                      <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Resource Group</label>
                      <select value={g("resourceGroupId")} onChange={(e) => s("resourceGroupId", e.target.value)} className={sCls}>
                        <option value="">None</option>
                        {rgList.filter((rg) => !form.plantId || !rg.plantId || rg.plantId === form.plantId).map((rg) => (<option key={rg.id} value={rg.id}>{rg.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Production Line</label>
                      <select value={g("productionLineId")} onChange={(e) => s("productionLineId", e.target.value)} className={sCls}><option value="">None</option>{lines.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}</select>
                    </div>
                    {errors.resourceGroupId && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.resourceGroupId}</p>}
                    <div>
                      <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Warehouse Code</label>
                      <input type="text" value={g("warehouseCode")} onChange={(e) => s("warehouseCode", e.target.value)} placeholder="e.g. WH-MAIN" className={iCls} />
                      {errors.warehouseCode && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.warehouseCode}</p>}
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="space-y-px">
                      <InlineRow label="Resource Group" value={ev("resourceGroupId", bin.resourceGroupName)} icon={<Layers className="h-2.5 w-2.5" />} />
                      <InlineRow label="Production Line" value={ev("productionLineId", bin.productionLineName)} icon={<Box className="h-2.5 w-2.5" />} />
                      <InlineRow label="Warehouse" value={ev("warehouseCode", bin.warehouseCode)} icon={<Warehouse className="h-2.5 w-2.5" />} />
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Capacity / Replenishment">
                {isForm ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Capacity</label>
                        <input type="number" value={g("capacity")} onChange={(e) => s("capacity", e.target.value)} className={iCls} min="0" />
                        {errors.capacity && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.capacity}</p>}
                      </div>
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>UOM</label>
                        <input type="text" value={g("uomId")} onChange={(e) => s("uomId", e.target.value)} placeholder="e.g. KG, EA" className={iCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Min Level</label>
                        <input type="number" value={g("minLevel")} onChange={(e) => s("minLevel", e.target.value)} className={iCls} min="0" />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Max Level</label>
                        <input type="number" value={g("maxLevel")} onChange={(e) => s("maxLevel", e.target.value)} className={iCls} min="0" />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Reorder Pt</label>
                        <input type="number" value={g("reorderPoint")} onChange={(e) => s("reorderPoint", e.target.value)} className={iCls} min="0" />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Replenishment Mode</label>
                      <select value={g("replenishmentMode")} onChange={(e) => s("replenishmentMode", e.target.value)} className={sCls}>
                        <option value="">None</option>
                        {REPLENISHMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="space-y-px">
                      <InlineRow label="Capacity" value={bin.capacity != null ? `${bin.capacity}` : ev("capacity", null)} />
                      <InlineRow label="UOM" value={ev("uomId", bin.uomName || bin.uomId)} />
                      <InlineRow label="Min Level" value={ev("minLevel", null)} />
                      <InlineRow label="Max Level" value={ev("maxLevel", null)} />
                      <InlineRow label="Reorder Point" value={ev("reorderPoint", null)} />
                      <InlineRow label="Replenishment" value={ev("replenishmentMode", bin.replenishmentMode)} />
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Validation Status */}
              {!isForm && (
                <SectionCard title="Validation">
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="flex flex-wrap gap-1">
                      <ValidationPill ok={validations.plant} label="Plant" />
                      <ValidationPill ok={validations.rg} label="Ownership" />
                      <ValidationPill ok={validations.warehouse} label="Warehouse" />
                      <ValidationPill ok={validations.capacity} label="Capacity" warning />
                      <ValidationPill ok={validations.uom} label="UOM" />
                      <ValidationPill ok={validations.replenishment} label="Replenishment" />
                    </div>
                  </div>
                </SectionCard>
              )}
            </div>

            {/* RIGHT COLUMN: Material Flow + Mode + Routing */}
            <div className="flex flex-col min-h-0 flex-1 gap-2 overflow-y-auto">
              {/* Bin Mode chip selector */}
              <SectionCard title="Bin Mode">
                {isForm ? (
                  <div className="flex gap-2">
                    {BIN_MODE_OPTIONS.map((opt) => (
                      <ModeChip key={opt.value} mode={opt.value} active={form.binMode === opt.value} onClick={() => s("binMode", opt.value)} />
                    ))}
                  </div>
                ) : (
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="flex gap-2">
                      {BIN_MODE_OPTIONS.map((opt) => (
                        <ModeChip key={opt.value} mode={opt.value} active={binMode === opt.value} onClick={() => {}} />
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Material Flow */}
              <SectionCard title="Material Flow">
                {isForm ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Source Type</label>
                        <select className={sCls} value="">
                          <option value="">None</option>
                          <option value="warehouse">Warehouse</option>
                          <option value="previous_rg">Previous RG</option>
                          <option value="fifo">FIFO</option>
                          <option value="supermarket">Supermarket</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Destination Type</label>
                        <select className={sCls} value="">
                          <option value="">None</option>
                          <option value="next_rg">Next RG</option>
                          <option value="fg">FG</option>
                          <option value="scrap">Scrap</option>
                          <option value="quarantine">Quarantine</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Location Code</label>
                        <input type="text" value={g("locationCode")} onChange={(e) => s("locationCode", e.target.value)} placeholder="e.g. A-12-B" className={iCls} />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Location Reference</label>
                        <input type="text" value={g("locationReference")} onChange={(e) => s("locationReference", e.target.value)} placeholder="e.g. Rack 3" className={iCls} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="space-y-px">
                      <InlineRow label="Source Type" value={bin.warehouseCode ? "Warehouse" : bin.resourceGroupId ? "Previous RG" : "Not configured"} icon={<ArrowLeft className="h-2.5 w-2.5" />} />
                      <InlineRow label="Destination" value={["FG", "SCRAP", "QUARANTINE"].includes(bin.binType || "") ? bin.binType : "Next RG"} icon={<ArrowRight className="h-2.5 w-2.5" />} />
                      <InlineRow label="Location Code" value={ev("locationCode", bin.locationCode)} icon={<Map className="h-2.5 w-2.5" />} />
                      <InlineRow label="Reference" value={ev("locationReference", bin.locationReference)} />
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Current Material & Routing */}
              {!isForm && (
                <>
                  <SectionCard title="Current Material">
                    <div className={`rounded-lg p-2 ${theme.subCard}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-entity-warehouse-bg">
                          <Database className="h-4 w-4 text-entity-warehouse stroke-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-[13px] font-semibold ${theme.textPrimary}`}>{bin.materialName || "No material assigned"}</div>
                          {bin.materialCode && <div className={`text-[10px] ${theme.textMuted} font-mono`}>{bin.materialCode}</div>}
                          {bin.materialGroup && <div className={`text-[9px] ${theme.textMuted}`}>Group: {bin.materialGroup}</div>}
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Routing Usage"
                    action={bin.resourceGroupId || bin.productionLineId ? <button type="button" onClick={() => setShowLinesModal(true)}
                      className={`inline-flex h-6 items-center gap-1 rounded border border-border/60 ${theme.surfaceBg} px-2 text-[10px] font-medium ${theme.textSecondary} transition-colors ${theme.interactiveRow}`}>
                      <Layers className="h-3 w-3 stroke-current" /> Open linked lines
                    </button> : undefined}>
                    <div className={`rounded-lg p-2 ${theme.subCard}`}>
                      <div className="flex items-center gap-2 text-[10px]">
                        <Route className="h-3 w-3 stroke-current text-muted-foreground" />
                        <span className={theme.textMuted}>No routing steps linked to this bin.</span>
                      </div>
                    </div>
                  </SectionCard>
                </>
              )}


            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLinesModal = () => {
    if (!showLinesModal) return null;
    const lines = [
      { name: "Assembly Line A", direction: "Supply", status: "active" },
      { name: "Kitting Line 1", direction: "Supply", status: "active" },
      { name: "Packaging Line", direction: "Demand", status: "active" },
      { name: "Final Assembly", direction: "Demand", status: "active" },
    ];
    return (
      <>
        <div className="fixed inset-0 z-30 bg-black/15" onClick={() => setShowLinesModal(false)} />
        <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-material-bins/15 text-sidebar-material-bins">
                <Layers className="h-4 w-4 stroke-current" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Associated Production Lines</h3>
                <p className={`text-[10px] ${theme.textMuted}`}>{lines.filter(l => l.status === "active").length} active of {lines.length}</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowLinesModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4 stroke-current" />
            </button>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {lines.map((line, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 p-2.5 transition-colors hover:bg-muted">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${line.status === "active" ? "bg-entity-line/20" : "bg-muted"}`}>
                  <LineChart className={`h-3.5 w-3.5 stroke-current ${line.status === "active" ? "text-entity-line" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-[12px] font-medium ${theme.textPrimary}`}>{line.name}</div>
                  <div className={`text-[10px] ${theme.textMuted}`}>Flow direction: {line.direction}</div>
                </div>
                <span className={`inline-flex h-5 items-center rounded-full px-2 text-[9px] font-semibold uppercase tracking-wider ${
                  line.status === "active" ? "bg-success/10 text-success border border-success/20" : "bg-muted text-muted-foreground border border-border/40"
                }`}>{line.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
            <span className={`text-[10px] ${theme.textMuted}`}>Lines with material flow connection to this bin.</span>
            <button type="button" onClick={() => setShowLinesModal(false)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors">Close</button>
          </div>
        </div>
      </>
    );
  };

  const renderZonesModal = () => {
    if (!showZonesModal) return null;
    const zones = [
      { name: "Storage A", bins: 5, pct: 60, color: "blue" },
      { name: "Picking Zone", bins: 2, pct: 40, color: "emerald" },
      { name: "Bulk Storage", bins: 4, pct: 55, color: "cyan" },
      { name: "Overflow", bins: 1, pct: 15, color: "amber" },
    ];
    const colorMap: Record<string, string> = {
      amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      cyan: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    };
    return (
      <>
        <div className="fixed inset-0 z-30 bg-black/15" onClick={() => setShowZonesModal(false)} />
        <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-material-bins/15 text-sidebar-material-bins">
                <LayoutGrid className="h-4 w-4 stroke-current" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Warehouse Zones</h3>
                <p className={`text-[10px] ${theme.textMuted}`}>{zones.length} zones &middot; {zones.reduce((s, z) => s + z.bins, 0)} bins</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowZonesModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4 stroke-current" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {zones.map((z, i) => (
              <div key={i} className="rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted">
                <div className="flex items-center justify-between mb-2">
                  <div className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${colorMap[z.color]}`}>{z.name}</div>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <div>
                    <div className={`font-semibold ${theme.textPrimary}`}>{z.bins}</div>
                    <div className={theme.textMuted}>bins</div>
                  </div>
                  <div className="flex-1">
                    <div className={`h-1.5 w-full overflow-hidden rounded-full ${theme.loadTrack}`}>
                      <div className="h-1.5 rounded-full bg-sidebar-material-bins transition-all" style={{ width: `${z.pct}%` }} />
                    </div>
                    <div className={`mt-0.5 text-right text-[9px] ${theme.textMuted}`}>{z.pct}% utilized</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
            <span className={`text-[10px] ${theme.textMuted}`}>Total: {zones.reduce((s, z) => s + z.bins, 0)} bins across {zones.length} zones.</span>
            <button type="button" onClick={() => setShowZonesModal(false)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors">Close</button>
          </div>
        </div>
      </>
    );
  };

  const renderValidateModal = () => {
    if (!showValidateModal) return null;
    const checks = [
      { label: "Plant assigned", status: "pass", detail: `${sel?.plantName || "-"}` },
      { label: "Code uniqueness", status: "pass", detail: `Code "${sel?.code}" is unique` },
      { label: "Type configured", status: sel?.binType ? "pass" : "fail", detail: sel?.binType ? BIN_TYPE_OPTIONS.find(o => o.value === sel?.binType)?.label || sel?.binType : "No type set" },
      { label: "Warehouse linked", status: sel?.warehouseCode ? "pass" : "warn", detail: sel?.warehouseCode || "No warehouse assigned" },
      { label: "Active status", status: sel?.isActive ? "pass" : "warn", detail: sel?.isActive ? "Bin is active" : "Bin is inactive" },
      { label: "Capacity configured", status: (sel?.capacity ?? 0) > 0 ? "pass" : "warn", detail: (sel?.capacity ?? 0) > 0 ? `${sel?.capacity} units` : "No capacity set" },
      { label: "Ownership assigned", status: (sel?.resourceGroupId || sel?.productionLineId) ? "pass" : "warn", detail: sel?.resourceGroupName || sel?.productionLineName || "No ownership" },
      { label: "Location configured", status: sel?.locationCode ? "pass" : "warn", detail: sel?.locationCode || "No location" },
    ];
    const passCount = checks.filter(c => c.status === "pass").length;
    const warnCount = checks.filter(c => c.status === "warn").length;
    const failCount = checks.filter(c => c.status === "fail").length;
    return (
      <>
        <div className="fixed inset-0 z-30 bg-black/15" onClick={() => setShowValidateModal(false)} />
        <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-material-bins/15 text-sidebar-material-bins">
                <Shield className="h-4 w-4 stroke-current" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Validation</h3>
                <p className={`text-[10px] ${theme.textMuted}`}>{passCount} pass, {warnCount} warning{failCount > 0 ? `, ${failCount} fail` : ""}</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowValidateModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4 stroke-current" />
            </button>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 p-2.5">
                {c.status === "pass" ? (
                  <CheckSquare className="h-4 w-4 shrink-0 text-success stroke-current" />
                ) : c.status === "fail" ? (
                  <XSquare className="h-4 w-4 shrink-0 text-danger stroke-current" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning stroke-current" />
                )}
                <div className="min-w-0 flex-1">
                  <div className={`text-[12px] font-medium ${theme.textPrimary}`}>{c.label}</div>
                  <div className={`text-[10px] ${theme.textMuted}`}>{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
            <span className={`text-[10px] ${theme.textMuted}`}>Validation completed &mdash; {passCount}/{checks.length} checks passed.</span>
            <button type="button" onClick={() => setShowValidateModal(false)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors">Close</button>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {renderLinesModal()}
      {renderZonesModal()}
      {renderValidateModal()}
      {confirmArchive && (
        <ConfirmDialog open={!!confirmArchive} onClose={() => setConfirmArchive(null)} title="Archive material bin?" message="This will deactivate the bin. Archived bins can be reactivated." onConfirm={hArchive} />
      )}
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        <PageHeader icon={<Package className="h-5 w-5 stroke-current" />} iconClass={theme.iconBoxEmerald} title="Material Bins" subtitle="Manage material bin configurations across plants" />

        {/* Toolbar */}
        <Toolbar
          left={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search bins..." />}
          right={<>
            <ToolbarSelect value={filters.plantId} onChange={(v) => setFilters((p) => ({ ...p, plantId: v }))} options={[{ value: "", label: "All Plants" }, ...plants.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))]} className="w-50" />
            <ToolbarSelect value={filters.binType} onChange={(v) => setFilters((p) => ({ ...p, binType: v }))} options={[{ value: "", label: "All Types" }, ...BIN_TYPE_OPTIONS]} className="w-50" />
            <ToolbarSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} className="w-50" />
            <div className="flex-1" />
            <div className="flex items-center gap-2 shrink-0">
              {isForm ? (
                <>
                  <ToolbarButton icon={Check} label="Save" onClick={hSave} variant="success" />
                  <ToolbarButton icon={X} label="Cancel" onClick={hCancel} />
                </>
              ) : (
                <>
                  <ToolbarButton icon={Plus} label="New" onClick={hNew} />
                  <ToolbarButton icon={Pencil} label="Edit" onClick={hEdit} disabled={!sel} />
                  <ToolbarButton icon={Trash2} label="Archive" onClick={() => sel && setConfirmArchive(sel.id)} disabled={!sel} />
                  <span className="h-5 w-px shrink-0 bg-border/25" />
                  <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetchBins()} />
                </>
              )}
            </div>
          </>}
        />

        {/* Content */}
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col min-h-0 overflow-hidden border-r border-border/20 bg-card/40" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="shrink-0 border-b border-border/50 flex items-center p-3 bg-muted">
              <Package className={`h-3 w-3 ${theme.icon} stroke-current mr-2 shrink-0`} />
              <span className={`text-[11px] font-medium ${theme.textMuted}`}>Material Bins</span>
              <span className={`ml-auto text-[9px] ${theme.textMuted} font-mono`}>{filtered.length}</span>
            </div>
            <div className={`flex-1 overflow-y-auto ${theme.surfaceBg} pl-2`}>
              {loading && bins.length === 0 ? (
                <div className={`flex items-center justify-center h-24 text-xs ${theme.textMuted}`}><div className={`h-2 w-2 rounded-full ${theme.iconAccent} animate-bounce mr-2`} />Loading...</div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4"><Package className={`h-4 w-4 ${theme.icon} mb-1.5 stroke-current`} /><p className={`text-xs ${theme.textMuted}`}>No material bins</p></div>
              ) : (
                <div>
                  {groupedByPlant.length > 0 ? groupedByPlant.map((g) => (
                    <div key={g.plant.id}>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                        <Building2 className="h-3 w-3 stroke-current" />{g.plant.name} ({g.plant.code})
                      </div>
                      {g.bins.map((b) => (
                        <div key={b.id} onClick={() => { setSelectedId(b.id); if (mode === "create") { clearForm(); setMode("view"); } }}
                          className={`group mx-1 my-0.5 flex h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 transition-all duration-150 ${
                            selectedId === b.id ? "bg-sidebar-material-bins/8 border-l-2 border-l-sidebar-material-bins" : "border-l-2 border-l-transparent hover:bg-muted"
                          }`}>
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${selectedId === b.id ? "bg-sidebar-material-bins/15" : "bg-muted"}`}>
                            <Package className="h-3.5 w-3.5 stroke-current text-sidebar-material-bins" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="grid min-w-0 items-center gap-1.5" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                              <span className={`min-w-0 truncate text-[13px] font-semibold ${theme.textPrimary}`}>{b.code} - {b.name}</span>
                              <span className={`h-1.5 w-1.5 rounded-full ${b.isActive ? "bg-success" : "bg-muted-foreground/35"}`} />
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <TypeBadge type={b.binType} />
                              {b.warehouseCode && <span className={`text-[9px] font-mono ${theme.textMuted}`}>{b.warehouseCode}</span>}
                              {b.resourceGroupName && <span className={`text-[9px] ${theme.textMuted}`}>{b.resourceGroupName}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )) : (
                    paginated.map((b) => (
                      <div key={b.id} onClick={() => { setSelectedId(b.id); if (mode === "create") { clearForm(); setMode("view"); } }}
                        className={`group mx-1 my-0.5 flex h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 transition-all duration-150 ${
                          selectedId === b.id ? "bg-sidebar-material-bins/8 border-l-2 border-l-sidebar-material-bins" : "border-l-2 border-l-transparent hover:bg-muted"
                        }`}>
                        <div className="min-w-0 flex-1">
                          <span className={`min-w-0 truncate text-[13px] font-semibold ${theme.textPrimary}`}>{b.code} - {b.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <TypeBadge type={b.binType} />
                            {b.warehouseCode && <span className={`text-[9px] font-mono ${theme.textMuted}`}>{b.warehouseCode}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="shrink-0 flex h-7 items-center border-t border-border/50 bg-muted px-3">
              <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </div>

          <div onMouseDown={handleSplitMouseDown} className="flex shrink-0 cursor-col-resize items-center justify-center bg-muted transition-colors hover:bg-primary" style={{ width: 4 }}>
            <GripVertical className="h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>

          <div className="flex flex-col min-h-0 min-w-0" style={{ flex: 1 }}>
            {renderDetail()}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-muted-foreground stroke-current" /> Bin</span>
          <span className="flex items-center gap-1.5"><Factory className="h-3.5 w-3.5 text-entity-plant stroke-current" /> Plant</span>
          <span className="flex items-center gap-1.5"><Warehouse className="h-3.5 w-3.5 text-entity-warehouse stroke-current" /> Warehouse</span>
          <span>{filtered.length} bin{filtered.length !== 1 ? "s" : ""}</span>
          <span className="ml-auto" />
          {sel && (<><span>Created: {formatAppDate(sel.createdAt) || "-"}</span><span>Updated: {formatAppDate(sel.updatedAt) || "-"}</span></>)}
        </div>
      </div>
    </>
  );
}
