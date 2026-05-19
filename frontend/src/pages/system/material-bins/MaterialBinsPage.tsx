import { useState, useEffect, useCallback, useRef } from "react";
import { theme } from "../../../styles/themeTokens";
import { Search, CheckCircle, Package, Factory, Layers, Warehouse, Box, RefreshCw, Plus, Settings2, Pencil, Trash2, X, GripVertical, Check } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PRODUCTION_LINES_QUERY, RESOURCE_GROUPS_QUERY, MATERIAL_BINS_QUERY } from "@/graphql/manufacturingQueries";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { CREATE_MATERIAL_BIN, UPDATE_MATERIAL_BIN, ARCHIVE_MATERIAL_BIN } from "@/graphql/dataManagementMutations";
import { useToolbar, useRegisterActions } from "../production-structure/components/ToolbarContext";
import { Pagination, EntityListItem } from "../production-structure/components";
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
  materialId: string; materialGroup: string; capacity: string;
  uomId: string; replenishmentMode: string;
  fifoEnabled: boolean; supermarketEnabled: boolean;
  locationCode: string; locationReference: string; warehouseCode: string; isActive: boolean;
}

interface MutationError { field?: string | null; code?: string; message: string }
interface BinPayload { ok: boolean; materialBin?: MaterialBin | null; errors?: MutationError[] }

function listItems<T>(value: ListResult<T> | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

const ET: Record<string, string> = {
  description: "No description", productionLineId: "Not assigned",
  resourceGroupId: "Not assigned", materialId: "No material",
  materialGroup: "Not set", uomId: "Not set",
  locationCode: "Not set", locationReference: "Not set",
  warehouseCode: "Not set",
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
    <section className={`rounded-lg border border-border/50 ${theme.surfaceBg} p-2 shadow-sm shadow-foreground/5 ${className}`}>
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
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "110px minmax(0,1fr)" }}>
      <span className={`flex items-center gap-1 text-[10px] font-medium ${theme.textMuted} truncate`}>
        {icon && <span className="shrink-0">{icon}</span>}
        {label}
      </span>
      <span className={`text-[12px] font-medium ${theme.textPrimary} min-w-0 truncate`}>{value}</span>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const opt = BIN_TYPE_OPTIONS.find((o) => o.value === type);
  const label = opt?.label || type;
  return <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ${theme.badgeActive}`}>{label}</span>;
}

function CheckIcon({ checked }: { checked: boolean }) {
  return checked
    ? <CheckCircle className="h-3 w-3 text-success stroke-current" />
    : <span className="h-3 w-3 rounded border border-border/60 inline-block" />;
}

export function MaterialBinsPage() {
  const { search, setSearch, statusFilter, setStatusFilter, setFooterContent, setToolbarVariant, showSystemMessage } = useToolbar();
  const registerActions = useRegisterActions();

  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ plantId: "", binType: "", warehouseCode: "", resourceGroupId: "", productionLineId: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState<BinForm>({
    plantId: "", productionLineId: "", resourceGroupId: "", code: "", name: "",
    description: "", binType: "INPUT", materialId: "", materialGroup: "",
    capacity: "0", uomId: "", replenishmentMode: "",
    fifoEnabled: false, supermarketEnabled: false,
    locationCode: "", locationReference: "", warehouseCode: "", isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  // Resizable split state
  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(22);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(Math.max(pct, 18), 45));
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
      warehouseCode: filters.warehouseCode || undefined,
      resourceGroupId: filters.resourceGroupId || undefined,
      productionLineId: filters.productionLineId || undefined,
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

  const filtered = bins.filter((b) => {
    if (filters.plantId && b.plantId !== filters.plantId) return false;
    if (filters.binType && b.binType !== filters.binType) return false;
    if (filters.warehouseCode && !b.warehouseCode?.toLowerCase().includes(filters.warehouseCode.toLowerCase())) return false;
    if (statusFilter !== "all") {
      const active = statusFilter === "active";
      if (b.isActive !== active) return false;
    }
    if (search && !`${b.code} ${b.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? bins.find((b) => b.id === selectedId) ?? null : null;
  const isForm = mode === "edit" || mode === "create";

  const clearForm = useCallback(() => {
    setForm({
      plantId: "", productionLineId: "", resourceGroupId: "", code: "", name: "",
      description: "", binType: "INPUT", materialId: "", materialGroup: "",
      capacity: "0", uomId: "", replenishmentMode: "",
      fifoEnabled: false, supermarketEnabled: false,
      locationCode: "", locationReference: "", warehouseCode: "", isActive: true,
    });
    setErrors({}); setMutationError(null);
  }, []);

  const loadForm = useCallback((b: MaterialBin) => {
    setForm({
      plantId: b.plantId || "", productionLineId: b.productionLineId || "", resourceGroupId: b.resourceGroupId || "",
      code: b.code || "", name: b.name || "", description: b.description || "",
      binType: b.binType || "INPUT", materialId: b.materialId || "", materialGroup: b.materialGroup || "",
      capacity: String(b.capacity ?? 0), uomId: b.uomId || "", replenishmentMode: b.replenishmentMode || "",
      fifoEnabled: !!b.fifoEnabled, supermarketEnabled: !!b.supermarketEnabled,
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
    if (Object.keys(errs).length > 0) {
      setErrors(errs); showSystemMessage("Please fix validation errors", "error"); return;
    }
    const input: Record<string, unknown> = {
      plantId: form.plantId, productionLineId: form.productionLineId || null,
      resourceGroupId: form.resourceGroupId || null,
      code: form.code.trim(), name: form.name.trim(), description: form.description || "",
      binType: form.binType, materialId: form.materialId || null,
      materialGroup: form.materialGroup || "", capacity: Number(form.capacity) || 0,
      uomId: form.uomId || null, replenishmentMode: form.replenishmentMode || null,
      fifoEnabled: form.fifoEnabled, supermarketEnabled: form.supermarketEnabled,
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

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/50">
          <div className="flex items-stretch gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-sm">
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
            <div className="flex items-center gap-1.5">
              <Badge label={bin.isActive ? "active" : "inactive"} variant={bin.isActive ? "active" : "inactive"} />
              {isForm && <Badge label="Editing" variant="rose" />}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {mutationError && mode !== "view" && (
            <div className="shrink-0 px-4 pt-2">
              <p className={`text-[10px] font-medium ${theme.textCritical}`}>{mutationError}</p>
            </div>
          )}

          <div className="flex-1 flex min-h-0 overflow-hidden p-3 gap-3">
            {/* Left Column */}
            <div className="flex flex-col min-h-0 w-1/3 gap-2 overflow-y-auto">
              <SectionCard title="Identity">
                {isForm ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div><input type="text" value={g("name")} onChange={(e) => s("name", e.target.value)} placeholder="Name *" className={iCls} />{errors.name && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.name}</p>}</div>
                      <div><input type="text" value={g("code")} onChange={(e) => s("code", e.target.value)} placeholder="Code *" className={iCls} />{errors.code && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.code}</p>}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select value={g("binType")} onChange={(e) => s("binType", e.target.value)} className={sCls}>
                        {BIN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <select value={g("plantId")} onChange={(e) => s("plantId", e.target.value)} className={sCls}>
                        <option value="">Select Plant *</option>
                        {plants.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                      </select>
                    </div>
                    {errors.plantId && <p className={`text-[9px] ${theme.textCritical}`}>{errors.plantId}</p>}
                    <div><textarea value={g("description")} onChange={(e) => s("description", e.target.value)} placeholder="Description" className={`h-12 w-full rounded-md ${theme.input} px-2 text-[11px] outline-none ${theme.textPrimary} resize-none`} /></div>
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
                        {rgList.filter((rg) => !form.plantId || !rg.plantId || rg.plantId === form.plantId).map((rg) => (
                          <option key={rg.id} value={rg.id}>{rg.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Production Line</label>
                      <select value={g("productionLineId")} onChange={(e) => s("productionLineId", e.target.value)} className={sCls}>
                        <option value="">None</option>
                        {lines.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                      </select>
                    </div>
                    {errors.resourceGroupId && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.resourceGroupId}</p>}
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
            </div>

            {/* Right Column */}
            <div className="flex flex-col min-h-0 flex-1 gap-2 overflow-y-auto">
              <SectionCard title="Material Flow">
                {isForm ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Warehouse Code</label>
                        <input type="text" value={g("warehouseCode")} onChange={(e) => s("warehouseCode", e.target.value)} placeholder="e.g. WH-MAIN" className={iCls} />
                        {errors.warehouseCode && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.warehouseCode}</p>}
                      </div>
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Location Code</label>
                        <input type="text" value={g("locationCode")} onChange={(e) => s("locationCode", e.target.value)} placeholder="e.g. A-12-B" className={iCls} />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Location Reference</label>
                      <input type="text" value={g("locationReference")} onChange={(e) => s("locationReference", e.target.value)} placeholder="e.g. Rack 3, Shelf 2" className={iCls} />
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="space-y-px">
                      <InlineRow label="Warehouse" value={ev("warehouseCode", bin.warehouseCode)} icon={<Warehouse className="h-2.5 w-2.5" />} />
                      <InlineRow label="Location Code" value={ev("locationCode", bin.locationCode)} />
                      <InlineRow label="Reference" value={ev("locationReference", bin.locationReference)} />
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
                      </div>
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>UOM</label>
                        <input type="text" value={g("uomId")} onChange={(e) => s("uomId", e.target.value)} placeholder="e.g. KG, EA" className={iCls} />
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
                      <InlineRow label="Replenishment" value={ev("replenishmentMode", bin.replenishmentMode)} />
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="FIFO / Supermarket">
                {isForm ? (
                  <div className="space-y-1.5">
                    <div className={`rounded-lg p-2 ${theme.subCard} space-y-1.5`}>
                      <label className={`flex items-center gap-2 text-[10px] ${theme.textSecondary}`}>
                        <input type="checkbox" checked={form.fifoEnabled} onChange={(e) => s("fifoEnabled", e.target.checked)} className="h-3 w-3" />
                        FIFO Enabled
                      </label>
                      <label className={`flex items-center gap-2 text-[10px] ${theme.textSecondary}`}>
                        <input type="checkbox" checked={form.supermarketEnabled} onChange={(e) => s("supermarketEnabled", e.target.checked)} className="h-3 w-3" />
                        Supermarket Enabled
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="flex gap-3">
                      <span className={`flex items-center gap-1.5 text-[10px] ${theme.textSecondary}`}>
                        <CheckIcon checked={!!bin.fifoEnabled} /> FIFO
                      </span>
                      <span className={`flex items-center gap-1.5 text-[10px] ${theme.textSecondary}`}>
                        <CheckIcon checked={!!bin.supermarketEnabled} /> Supermarket
                      </span>
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Audit Info">
                <div className={`rounded-lg p-2 text-[10px] ${theme.subCard} space-y-1`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${theme.textSecondary} w-24`}>Created:</span>
                    <span className={`${theme.textPrimary}`}>{formatAppDate(bin.createdAt) || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${theme.textSecondary} w-24`}>Updated:</span>
                    <span className={`${theme.textPrimary}`}>{formatAppDate(bin.updatedAt) || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${theme.textSecondary} w-24`}>Active:</span>
                    <CheckIcon checked={!!bin.isActive} />
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const toolbarButtonClass = "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:bg-transparent disabled:text-muted-foreground disabled:opacity-70";

  return (
    <>
      {confirmArchive && (
        <ConfirmDialog open={!!confirmArchive} onClose={() => setConfirmArchive(null)} title="Archive material bin?" message="This will deactivate the bin. Archived bins can be reactivated." onConfirm={hArchive} />
      )}
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        {/* Page Header */}
        <PageHeader
          icon={<Package className="h-5 w-5 stroke-current" />}
          iconClass={theme.iconBoxEmerald}
          title="Material Bins"
          subtitle="Manage material bin configurations across plants"
        />

        {/* Toolbar - Windows Explorer style: filters on left, CRUD buttons on right */}
        <div className="flex h-9 shrink-0 select-none items-center gap-2 border-b border-border/35 bg-muted px-3">
          <div className="flex h-full items-center gap-2 pr-2" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
                  <X className="h-3.5 w-3.5 stroke-current" />
                </button>
              )}
            </div>
            <select
              value={filters.plantId}
              onChange={(e) => setFilters((p) => ({ ...p, plantId: e.target.value }))}
              className="h-7 w-24 shrink-0 cursor-pointer rounded border border-border/30 bg-transparent px-2 text-xs text-muted-foreground outline-none transition-colors focus:border-border/50 focus:ring-1 focus:ring-border/25"
            >
              <option value="">All Plants</option>
              {plants.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
            </select>
            <select
              value={filters.binType}
              onChange={(e) => setFilters((p) => ({ ...p, binType: e.target.value }))}
              className="h-7 w-24 shrink-0 cursor-pointer rounded border border-border/30 bg-transparent px-2 text-xs text-muted-foreground outline-none transition-colors focus:border-border/50 focus:ring-1 focus:ring-border/25"
            >
              <option value="">All Types</option>
              {BIN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 w-20 shrink-0 cursor-pointer rounded border border-border/30 bg-transparent px-2 text-xs text-muted-foreground outline-none transition-colors focus:border-border/50 focus:ring-1 focus:ring-border/25"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex h-7 items-center gap-1 rounded border border-border/30 bg-transparent px-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              <Settings2 className="h-3 w-3 stroke-current" /> Filters
            </button>
          </div>
          <span className="h-5 w-px shrink-0 bg-border/25" />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
            {isForm ? (
              <>
                <button type="button" onClick={hSave} title="Save"
                  className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-[11px] font-medium text-success transition-colors hover:bg-success/12">
                  <Check className="h-4 w-4 stroke-current" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button type="button" onClick={hCancel} title="Cancel"
                  className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted">
                  <X className="h-4 w-4 stroke-current" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={hNew} title="New" className={toolbarButtonClass}>
                  <Plus className="h-4 w-4 stroke-current" />
                  <span>New</span>
                </button>
                <button type="button" onClick={hEdit} title="Edit" disabled={!sel} className={toolbarButtonClass}>
                  <Pencil className="h-4 w-4 stroke-current" />
                  <span>Edit</span>
                </button>
                <button type="button" onClick={() => sel && setConfirmArchive(sel.id)} title="Archive" disabled={!sel} className={toolbarButtonClass}>
                  <Trash2 className="h-4 w-4 stroke-current" />
                  <span>Archive</span>
                </button>
                <span className="mx-1 h-5 w-px bg-border/25 shrink-0" />
                <button type="button" onClick={() => refetchBins()} title="Refresh" className={toolbarButtonClass}>
                  <RefreshCw className={`h-4 w-4 stroke-current ${loading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content - resizable split 20/80 */}
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left column - list */}
          <div className="flex flex-col min-h-0 overflow-hidden border-r border-border/20 bg-card/40" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="shrink-0 border-b border-border/50 flex items-center p-3 bg-muted">
              <Package className={`h-3 w-3 ${theme.icon} stroke-current mr-2 shrink-0`} />
              <span className={`text-[11px] font-medium ${theme.textMuted}`}>Material Bins</span>
              <span className={`ml-auto text-[9px] ${theme.textMuted} font-mono`}>{filtered.length}</span>
            </div>
            <div className={`flex-1 overflow-y-auto ${theme.surfaceBg} pl-2`}>
              {loading && bins.length === 0 ? (
                <div className={`flex items-center justify-center h-24 text-xs ${theme.textMuted}`}>
                  <div className={`h-2 w-2 rounded-full ${theme.iconAccent} animate-bounce mr-2`} />Loading...
                </div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Package className={`h-4 w-4 ${theme.icon} mb-1.5 stroke-current`} />
                  <p className={`text-xs ${theme.textMuted}`}>No material bins</p>
                </div>
              ) : (
                <div>
                  {paginated.map((b) => (
                    <EntityListItem
                      key={b.id}
                      name={`${b.code} - ${b.name}`} code={b.code}
                      meta={`${BIN_TYPE_OPTIONS.find((o) => o.value === b.binType)?.label || b.binType}`}
                      icon={<Package className="h-3.5 w-3.5 stroke-current" />}
                      selected={selectedId === b.id}
                      status={b.isActive ? "active" : "inactive"}
                      onClick={() => { setSelectedId(b.id); if (mode === "create") { clearForm(); setMode("view"); } }}
                      entityType="resource"
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 flex h-7 items-center border-t border-border/50 bg-muted px-3">
              <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </div>

          {/* Resizable divider */}
          <div onMouseDown={handleSplitMouseDown}
            className="flex shrink-0 cursor-col-resize items-center justify-center bg-muted transition-colors hover:bg-primary"
            style={{ width: 4 }}>
            <GripVertical className="h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>

          {/* Right column - detail */}
          <div className="flex flex-col min-h-0 min-w-0" style={{ flex: 1 }}>
            {renderDetail()}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 stroke-current text-muted-foreground" /> Bin</span>
          <span className="flex items-center gap-1.5"><Factory className="h-3.5 w-3.5 text-entity-plant stroke-current" /> Plant</span>
          <span className="flex items-center gap-1.5"><Warehouse className="h-3.5 w-3.5 text-entity-warehouse stroke-current" /> Warehouse</span>
          <span className="ml-auto">{filtered.length} bin{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </>
  );
}
