import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "../../../styles/themeTokens";
import { PageToolbar, ToolbarDropdown, ToolbarButton } from "@/components/layout/PageToolbar";
import { CheckCircle, Warehouse, Factory, Plus, Pencil, Trash2, RefreshCw, X, GripVertical, Check, Box, Layers, Route, Map, Database, Shield, ExternalLink, Building2, LayoutGrid, LineChart, AlertTriangle, CheckSquare, XSquare } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { WAREHOUSES_QUERY } from "@/graphql/warehouseQueries";
import {
  CREATE_WAREHOUSE_MUTATION,
  UPDATE_WAREHOUSE_MUTATION,
  ARCHIVE_WAREHOUSE_MUTATION,
} from "@/graphql/warehouseMutations";
import { useToolbar, useRegisterActions } from "../production-structure/components/ToolbarContext";
import { Pagination } from "../production-structure/components";
import { ConfirmDialog } from "../production-structure/shared";
import { formatAppDate } from "@/utils/dateFormat";
import { WAREHOUSE_TYPE_OPTIONS } from "@/types/warehouse";

const PER_PAGE = 10;

type ListResult<T> = T[] | { items?: T[] };

interface Plant {
  id: string;
  code: string;
  name: string;
}

interface WarehouseNode {
  id: string;
  plantId: string;
  plantName: string;
  code: string;
  name: string;
  warehouseType: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseForm {
  plantId: string;
  code: string;
  name: string;
  warehouseType: string;
  location: string;
  isActive: boolean;
}

interface MutationError {
  field?: string | null;
  code?: string;
  message: string;
}

interface WarehousePayload {
  ok: boolean;
  warehouse?: WarehouseNode | null;
  errors?: MutationError[];
}

const TYPE_COLORS: Record<string, string> = {
  RM: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  WIP: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  FG: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  SCRAP: "bg-red-500/10 text-red-600 border-red-500/20",
  QUARANTINE: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  SPARES: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  GENERAL: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

function listItems<T>(value: ListResult<T> | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

function TypeBadge({ type }: { type: string }) {
  const opt = WAREHOUSE_TYPE_OPTIONS.find((o) => o.value === type);
  const colors = TYPE_COLORS[type] || TYPE_COLORS.GENERAL;
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${colors}`}>{opt?.label || type}</span>;
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-muted/20 border border-border/10 px-2.5 py-2 rounded-sm">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-entity-warehouse-bg text-entity-warehouse">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[18px] font-bold leading-6 ${theme.textPrimary}`}>{value}</div>
        <div className={`text-[10px] font-medium ${theme.textMuted} leading-tight`}>{label}</div>
        {sub && <div className={`text-[9px] ${theme.textMuted} mt-0.5`}>{sub}</div>}
      </div>
    </div>
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

function SectionCard({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-1.5 flex min-h-6 items-center gap-2">
        <h3 className={`flex-1 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-product-master/70`}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
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

export function WarehousesPage() {
  const { search, setSearch, statusFilter, setStatusFilter, setFooterContent, setToolbarVariant, showSystemMessage } = useToolbar();
  const registerActions = useRegisterActions();

  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);
  const [filters, setFilters] = useState({ plantId: "", warehouseType: "" });
  const [form, setForm] = useState<WarehouseForm>({
    plantId: "", code: "", name: "", warehouseType: "", location: "", isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const navigate = useNavigate();
  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);
  const [showLinesModal, setShowLinesModal] = useState(false);
  const [showZonesModal, setShowZonesModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);

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

  const { data: whData, loading, refetch: refetchWarehouses } = useQuery<{ warehouses: ListResult<WarehouseNode> }>(WAREHOUSES_QUERY, {
    variables: {
      plantId: filters.plantId || undefined,
      isActive: statusFilter === "all" ? undefined : statusFilter === "active",
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const { data: plantsData } = useQuery<{ plants: ListResult<Plant> }>(PLANTS_QUERY, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const [createWh] = useMutation<{ createWarehouse: WarehousePayload }>(CREATE_WAREHOUSE_MUTATION);
  const [updateWh] = useMutation<{ updateWarehouse: WarehousePayload }>(UPDATE_WAREHOUSE_MUTATION);
  const [archiveWh] = useMutation<{ archiveWarehouse: WarehousePayload }>(ARCHIVE_WAREHOUSE_MUTATION);

  const warehouses = listItems(whData?.warehouses);
  const plants = listItems(plantsData?.plants);

  const plantOptions = plants.map((p) => ({ id: p.id, code: p.code, name: p.name }));

  const filtered = warehouses.filter((w) => {
    if (filters.plantId && w.plantId !== filters.plantId) return false;
    if (filters.warehouseType && w.warehouseType !== filters.warehouseType) return false;
    if (statusFilter !== "all") {
      const active = statusFilter === "active";
      if (w.isActive !== active) return false;
    }
    if (search && !`${w.code} ${w.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? warehouses.find((w) => w.id === selectedId) ?? null : null;
  const isForm = mode === "edit" || mode === "create";

  useEffect(() => {
    if (paginated.length === 0) return;
    if (selectedId && paginated.some((w) => w.id === selectedId)) return;
    if (!initialLoad) return;
    setInitialLoad(false);
    setSelectedId(paginated[0].id);
  }, [paginated, selectedId, initialLoad]);

  // Group by plant for list hierarchy
  const groupedByPlant = plantOptions.map((pl) => ({
    plant: pl,
    warehouses: paginated.filter((w) => w.plantId === pl.id),
  })).filter((g) => g.warehouses.length > 0);

  const clearForm = useCallback(() => {
    setForm({ plantId: "", code: "", name: "", warehouseType: "", location: "", isActive: true });
    setErrors({});
    setMutationError(null);
  }, []);

  const loadForm = useCallback((w: WarehouseNode) => {
    setForm({
      plantId: w.plantId || "",
      code: w.code || "",
      name: w.name || "",
      warehouseType: w.warehouseType || "",
      location: w.location || "",
      isActive: w.isActive,
    });
    setErrors({});
    setMutationError(null);
  }, []);

  const hNew = useCallback(() => { clearForm(); setSelectedId(null); setMode("create"); }, [clearForm]);
  const hEdit = useCallback(() => { if (sel) { loadForm(sel); setMode("edit"); } }, [sel, loadForm]);
  const hCancel = useCallback(() => {
    if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); }
  }, [sel, loadForm, clearForm]);

  const hSave = useCallback(async () => {
    setMutationError(null);
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = "Required";
    if (!form.code?.trim()) errs.code = "Required";
    if (!form.plantId) errs.plantId = "Required";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showSystemMessage("Please fix validation errors", "error");
      return;
    }
    const input: Record<string, unknown> = {
      plantId: form.plantId,
      code: form.code.trim(),
      name: form.name.trim(),
      warehouseType: form.warehouseType || undefined,
      location: form.location || undefined,
      isActive: form.isActive,
    };
    let payload: WarehousePayload | undefined;
    if (mode === "edit" && selectedId) {
      const result = await updateWh({ variables: { id: selectedId, input } });
      payload = result.data?.updateWarehouse;
    } else {
      const result = await createWh({ variables: { input } });
      payload = result.data?.createWarehouse;
    }
    if (!payload?.ok) {
      const nextErrors: Record<string, string> = {};
      for (const err of payload?.errors ?? []) {
        if (err.field) nextErrors[err.field] = err.message;
      }
      setErrors(nextErrors);
      const msg = payload?.errors?.[0]?.message || "Warehouse could not be saved.";
      setMutationError(msg);
      showSystemMessage(msg, "error");
      return;
    }
    if (payload.warehouse?.id) setSelectedId(payload.warehouse.id);
    await refetchWarehouses();
    setMode("view");
    showSystemMessage("Warehouse saved", "success");
  }, [form, mode, selectedId, createWh, updateWh, refetchWarehouses, showSystemMessage]);

  const hArchive = useCallback(async () => {
    if (!confirmArchive) return;
    setMutationError(null);
    const result = await archiveWh({ variables: { id: confirmArchive } });
    const payload = result.data?.archiveWarehouse;
    if (!payload?.ok) {
      const msg = payload?.errors?.[0]?.message || "Warehouse could not be archived.";
      setMutationError(msg);
      showSystemMessage(msg, "error");
      setConfirmArchive(null);
      return;
    }
    setSelectedId(null);
    await refetchWarehouses();
    setConfirmArchive(null);
    showSystemMessage("Warehouse archived", "success");
  }, [confirmArchive, archiveWh, refetchWarehouses, showSystemMessage]);

  useEffect(() => { setPage(1); }, [search, statusFilter, filters]);

  useEffect(() => {
    setToolbarVariant("splitListDetail");
    if (mode === "edit" || mode === "create") {
      registerActions({ onSave: hSave, onCancel: hCancel });
    } else {
      registerActions({
        onAdd: hNew,
        onEdit: sel ? hEdit : undefined,
        onDelete: sel ? () => setConfirmArchive(sel.id) : undefined,
        onRefresh: () => refetchWarehouses(),
        hasSelected: !!sel,
      });
    }
    setFooterContent(`${filtered.length} warehouse${filtered.length !== 1 ? "s" : ""}`);
  }, [mode, sel, filtered.length, hSave, hCancel, hNew, hEdit, registerActions, refetchWarehouses, setToolbarVariant, setFooterContent]);

  const g = (k: keyof WarehouseForm) => String(form[k] ?? "");
  const s = (k: keyof WarehouseForm, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const iCls = `h-7 w-full rounded-md ${theme.input} px-2 text-[11px] outline-none ${theme.textPrimary} transition-all ${theme.focusRing}`;
  const sCls = `h-7 w-full rounded-md ${theme.input} px-2 text-[11px] outline-none ${theme.textPrimary} transition-all ${theme.focusRing}`;

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-entity-warehouse-bg">
              <Warehouse className="h-5 w-5 text-entity-warehouse stroke-current" />
            </div>
            <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1`}>Warehouse Details</h3>
            <p className={`text-xs ${theme.textSecondary} leading-relaxed`}>Select a warehouse or create a new one to manage its configuration and operational data.</p>
          </div>
        </div>
      );
    }

    const title = mode === "create" ? "New Warehouse" : `${sel!.code} - ${sel!.name}`;
    const wh: Partial<WarehouseNode> = sel ?? {};

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/50">
          <div className="flex items-stretch gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-entity-warehouse-bg text-entity-warehouse ring-1 ring-entity-warehouse/20">
              <Warehouse className="h-5 w-5 stroke-current" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className={`truncate text-sm font-bold leading-5 text-foreground`}>{title}</h2>
                {wh.code && <span className={`shrink-0 rounded px-1.5 py-px font-mono text-[9px] ${theme.codeBadge}`}>{wh.code}</span>}
              </div>
              <div className={`mt-1 flex flex-wrap items-center gap-1.5 text-[10px] ${theme.textMuted}`}>
                <span className="flex items-center gap-0.5"><Factory className="h-2.5 w-2.5 stroke-current" />{wh.plantName || "-"}</span>
                <span className="text-muted-foreground">·</span>
                <TypeBadge type={wh.warehouseType || ""} />
                <span className="text-muted-foreground">·</span>
                <span className={`inline-flex items-center gap-1 ${wh.isActive ? "text-success" : "text-muted-foreground"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${wh.isActive ? "bg-success" : "bg-muted-foreground/40"}`} />
                  {wh.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <ActionButton icon={<Shield className="h-3 w-3 stroke-current" />} label="Validate" onClick={() => setShowValidateModal(true)} />
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
            {/* LEFT COLUMN: Identity + Metrics */}
            <div className="flex flex-col min-h-0 w-2/5 gap-2 overflow-y-auto">
              {/* Identity card (merged with location/status) */}
              <SectionCard title="Identity & Location">
                {isForm ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <input type="text" value={g("name")} onChange={(e) => s("name", e.target.value)} placeholder="Name *" className={iCls} />
                        {errors.name && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.name}</p>}
                      </div>
                      <div>
                        <input type="text" value={g("code")} onChange={(e) => s("code", e.target.value)} placeholder="Code *" className={iCls} />
                        {errors.code && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.code}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select value={g("warehouseType")} onChange={(e) => s("warehouseType", e.target.value)} className={sCls} aria-label="Warehouse type">
                        <option value="">Select Type</option>
                        {WAREHOUSE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <select value={g("plantId")} onChange={(e) => s("plantId", e.target.value)} className={sCls} aria-label="Plant">
                        <option value="">Select Plant *</option>
                        {plants.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                      </select>
                    </div>
                    {errors.plantId && <p className={`text-[9px] ${theme.textCritical}`}>{errors.plantId}</p>}
                    <div>
                      <input type="text" value={g("location")} onChange={(e) => s("location", e.target.value)} placeholder="Location (e.g. Building A, Zone 3)" className={iCls} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form.isActive} onChange={(e) => s("isActive", e.target.checked)} className="h-3 w-3" id="wh-active" />
                      <label htmlFor="wh-active" className={`text-[10px] ${theme.textSecondary} cursor-pointer select-none`}>Active</label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-px">
                    <InlineRow label="Name" value={wh.name} />
                    <InlineRow label="Code" value={wh.code} />
                    <InlineRow label="Type" value={<TypeBadge type={wh.warehouseType || ""} />} />
                    <InlineRow label="Plant" value={wh.plantName} icon={<Factory className="h-2.5 w-2.5" />} />
                    <InlineRow label="Location" value={wh.location || "Not set"} icon={<Map className="h-2.5 w-2.5" />} />
                  </div>
                )}
              </SectionCard>

              {/* Operational Metrics */}
              {!isForm && (
                <>
                  <SectionCard title="Storage">
                    <div className="grid grid-cols-2 gap-1.5">
                      <MetricCard icon={<Box className="h-3.5 w-3.5 stroke-current" />} label="Material Bins" value="12" sub="8 active" />
                      <MetricCard icon={<Database className="h-3.5 w-3.5 stroke-current" />} label="Active Materials" value="47" sub="3 categories" />
                    </div>
                  </SectionCard>
                  <SectionCard title="Operational Metrics">
                    <div className="grid grid-cols-2 gap-1.5">
                      <MetricCard icon={<Route className="h-3.5 w-3.5 stroke-current" />} label="Inbound Routes" value="6" sub="3 plants" />
                      <MetricCard icon={<ExternalLink className="h-3.5 w-3.5 stroke-current" />} label="Outbound Routes" value="9" sub="4 lines" />
                    </div>
                  </SectionCard>
                </>
              )}
            </div>

            {/* RIGHT COLUMN: Operational cards */}
            <div className="flex flex-col min-h-0 flex-1 gap-2 overflow-y-auto">
              {isForm ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className={`text-xs ${theme.textMuted}`}>Save the warehouse to see operational data.</p>
                </div>
              ) : (
                <>
                  {/* Material Bins card */}
                  <SectionCard title="Material Bins"
                    action={<ActionButton icon={<Box className="h-3 w-3 stroke-current" />} label="Open Bins" onClick={() => { if (wh.code) navigate(`/system/material-bins?warehouseCode=${wh.code}`); }} />}>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <div className={`font-semibold ${theme.textPrimary}`}>8</div>
                        <div className={theme.textMuted}>Active Bins</div>
                      </div>
                      <div>
                        <div className={`font-semibold ${theme.textPrimary}`}>4</div>
                        <div className={theme.textMuted}>Inactive</div>
                      </div>
                      <div>
                        <div className={`font-semibold ${theme.textPrimary}`}>12</div>
                        <div className={theme.textMuted}>Total</div>
                      </div>
                    </div>
                    <div className={`mt-2 flex flex-wrap gap-1 text-[9px] ${theme.textMuted}`}>
                      <span className="text-amber-600 font-medium">RM: 5</span>
                      <span>·</span>
                      <span className="text-emerald-600 font-medium">FG: 3</span>
                      <span>·</span>
                      <span className="text-blue-600 font-medium">WIP: 2</span>
                      <span>·</span>
                      <span className="text-slate-600 font-medium">Other: 2</span>
                    </div>
                  </SectionCard>

                  {/* Assigned Lines */}
                  <SectionCard title="Assigned Production Lines"
                    action={<ActionButton icon={<Layers className="h-3 w-3 stroke-current" />} label="View Lines" onClick={() => setShowLinesModal(true)} />}>
                    <div className="space-y-1.5 text-[10px]">
                      {["Assembly Line A", "Kitting Line 1", "Packaging Line"].map((line, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-entity-line" />
                          <span className={`${theme.textPrimary}`}>{line}</span>
                          <span className={`ml-auto ${theme.textMuted}`}>{["Receiving", "Both", "Shipping"][i]}</span>
                        </div>
                      ))}
                      <button type="button" className={`mt-1 text-[10px] font-medium text-entity-warehouse hover:underline`}>+ Assign line</button>
                    </div>
                  </SectionCard>

                  {/* Warehouse Zones */}
                  <SectionCard title="Warehouse Zones"
                    action={<ActionButton icon={<LayoutGrid className="h-3 w-3 stroke-current" />} label="Zones" onClick={() => setShowZonesModal(true)} />}>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      {[
                        { name: "Receiving", bins: 3, pct: 25 },
                        { name: "Storage A", bins: 5, pct: 60 },
                        { name: "Picking", bins: 2, pct: 40 },
                        { name: "Shipping", bins: 2, pct: 30 },
                      ].map((z, i) => (
                        <div key={i} className={`rounded border border-border/30 p-1.5 ${theme.surfaceBg}`}>
                          <div className={`font-medium ${theme.textPrimary}`}>{z.name}</div>
                          <div className={theme.textMuted}>{z.bins} bins · {z.pct}% utilized</div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  {/* ERP Mapping */}
                  <SectionCard title="ERP Mapping">
                    <div className="flex items-center gap-3 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <Database className="h-3 w-3 stroke-current text-muted-foreground" />
                        <span className={theme.textMuted}>ERP Code:</span>
                        <span className={`font-mono font-medium ${theme.textPrimary}`}>WH-{wh.code}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full bg-success`} />
                        <span className={theme.textSecondary}>Synced</span>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Validation Status */}
                  <SectionCard title="Validation Status">
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3 text-success stroke-current" />
                        <span className={theme.textSecondary}>Plant assigned</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3 text-success stroke-current" />
                        <span className={theme.textSecondary}>Code unique</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3 text-success stroke-current" />
                        <span className={theme.textSecondary}>Type configured</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded border border-border/60 inline-block" />
                        <span className={theme.textMuted}>Zones configured</span>
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
      { name: "Assembly Line A", direction: "Receiving", status: "active" },
      { name: "Kitting Line 1", direction: "Both", status: "active" },
      { name: "Packaging Line", direction: "Shipping", status: "active" },
      { name: "Sub-Assembly B", direction: "Both", status: "inactive" },
      { name: "Final Assembly", direction: "Shipping", status: "active" },
    ];
    return (
      <>
        <div className="fixed inset-0 z-30 bg-black/15" onClick={() => setShowLinesModal(false)} />
        <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-entity-warehouse-bg text-entity-warehouse">
                <Layers className="h-4 w-4 stroke-current" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Assigned Production Lines</h3>
                <p className={`text-[10px] ${theme.textMuted}`}>{sel?.code} &middot; {lines.filter(l => l.status === "active").length} active of {lines.length}</p>
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
            <span className={`text-[10px] ${theme.textMuted}`}>Only lines with material flow to/from this warehouse are shown.</span>
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
      { name: "Receiving", bins: 3, pct: 25, color: "amber" },
      { name: "Storage A", bins: 5, pct: 60, color: "blue" },
      { name: "Picking", bins: 2, pct: 40, color: "emerald" },
      { name: "Shipping", bins: 2, pct: 30, color: "violet" },
      { name: "Quarantine", bins: 1, pct: 10, color: "red" },
      { name: "Bulk Storage", bins: 4, pct: 55, color: "cyan" },
    ];
    const colorMap: Record<string, string> = {
      amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      violet: "bg-violet-500/10 text-violet-600 border-violet-500/20",
      red: "bg-red-500/10 text-red-600 border-red-500/20",
      cyan: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    };
    return (
      <>
        <div className="fixed inset-0 z-30 bg-black/15" onClick={() => setShowZonesModal(false)} />
        <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-entity-warehouse-bg text-entity-warehouse">
                <LayoutGrid className="h-4 w-4 stroke-current" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Warehouse Zones</h3>
                <p className={`text-[10px] ${theme.textMuted}`}>{sel?.code} &middot; {zones.length} zones &middot; {zones.reduce((s, z) => s + z.bins, 0)} bins</p>
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
                      <div className="h-1.5 rounded-full bg-entity-warehouse transition-all" style={{ width: `${z.pct}%` }} />
                    </div>
                    <div className={`mt-0.5 text-right text-[9px] ${theme.textMuted}`}>{z.pct}% utilized</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
            <span className={`text-[10px] ${theme.textMuted}`}>Total capacity: {zones.reduce((s, z) => s + z.bins, 0)} bins across {zones.length} zones.</span>
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
      { label: "Type configured", status: sel?.warehouseType ? "pass" : "fail", detail: sel?.warehouseType ? WAREHOUSE_TYPE_OPTIONS.find(o => o.value === sel?.warehouseType)?.label || sel?.warehouseType : "No type set" },
      { label: "Location set", status: sel?.location ? "pass" : "warn", detail: sel?.location || "No location configured" },
      { label: "Active status", status: sel?.isActive ? "pass" : "warn", detail: sel?.isActive ? "Warehouse is active" : "Warehouse is inactive" },
      { label: "Zones configured", status: "warn", detail: "No zones configured" },
      { label: "Production lines linked", status: "warn", detail: "3 lines linked (simulated)" },
      { label: "ERP sync", status: "pass", detail: `ERP Code: WH-${sel?.code}` },
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-entity-warehouse-bg text-entity-warehouse">
                <Shield className="h-4 w-4 stroke-current" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Validation</h3>
                <p className={`text-[10px] ${theme.textMuted}`}>{sel?.code} &middot; {passCount} pass, {warnCount} warning{failCount > 0 ? `, ${failCount} fail` : ""}</p>
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
        <ConfirmDialog
          open={!!confirmArchive}
          onClose={() => setConfirmArchive(null)}
          title="Archive warehouse?"
          message="This will deactivate the warehouse. Archived warehouses can be reactivated."
          onConfirm={hArchive}
        />
      )}
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        <PageHeader
          icon={<Warehouse className="h-5 w-5 stroke-current" />}
          iconClass={theme.iconBoxEmerald}
          title="Warehouses"
          subtitle="Manage warehouse locations across plants"
        />

        <PageToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search warehouses..."
          filters={<>
            <ToolbarDropdown value={filters.plantId} onChange={(v) => setFilters((p) => ({ ...p, plantId: v }))} options={[{ value: "", label: "All Plants" }, ...plants.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))]} className="w-52" />
            <ToolbarDropdown value={filters.warehouseType} onChange={(v) => setFilters((p) => ({ ...p, warehouseType: v }))} options={[{ value: "", label: "All Types" }, ...WAREHOUSE_TYPE_OPTIONS]} className="w-44" />
            <ToolbarDropdown value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} className="w-36" />
          </>}
          actions={<div className="flex items-center gap-2 shrink-0">
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
                  <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetchWarehouses()} />
                </>
              )}
            </div>}
        />

        {/* Content - resizable split */}
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left column - list with plant hierarchy */}
          <div className="flex flex-col min-h-0 overflow-hidden border-r border-border/20 bg-muted" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="shrink-0 border-b border-border/50 flex items-center p-3">
              <Warehouse className={`h-3 w-3 ${theme.icon} stroke-current mr-2 shrink-0`} />
              <span className={`text-[11px] font-medium ${theme.textMuted}`}>Warehouses</span>
              <span className={`ml-auto text-[9px] ${theme.textMuted} font-mono`}>{filtered.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto pl-2">
              {loading && warehouses.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse mr-2" />Loading...
                </div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Warehouse className="h-5 w-5 text-muted-foreground/40 mb-2 stroke-current" />
                  <p className="text-xs font-medium text-muted-foreground">No warehouses</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Create one to get started</p>
                </div>
              ) : (
                <div>
                  {groupedByPlant.length > 0 ? (
                    groupedByPlant.map((g) => (
                      <div key={g.plant.id}>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                          <Building2 className="h-3 w-3 stroke-current" />
                          {g.plant.name} ({g.plant.code})
                        </div>
                        {g.warehouses.map((w) => (
                          <div key={w.id}
                            onClick={() => { setSelectedId(w.id); if (mode === "create") { clearForm(); setMode("view"); } }}
                            className={`group mx-1 my-0.5 flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-3 transition-all duration-150 ${
                              selectedId === w.id
                                ? "bg-table-selected border-l-2 border-l-entity-warehouse"
                                : "border-l-2 border-l-transparent hover:bg-table-row-hover"
                            }`}>
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${selectedId === w.id ? "bg-entity-warehouse-bg" : "bg-muted"}`}>
                              <Warehouse className="h-3.5 w-3.5 stroke-current text-entity-warehouse" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                                <span className={`min-w-0 truncate text-[13px] font-semibold ${selectedId === w.id ? theme.textPrimary : theme.textPrimary}`}>{w.code} - {w.name}</span>
                                <span className={`h-1.5 w-1.5 rounded-full ${w.isActive ? "bg-success" : "bg-muted-foreground/35"}`} />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <TypeBadge type={w.warehouseType} />
                                <span className={`text-[10px] ${theme.textMuted}`}>{w.plantName}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div>
                      {paginated.map((w) => (
                        <div key={w.id}
                          onClick={() => { setSelectedId(w.id); if (mode === "create") { clearForm(); setMode("view"); } }}
                          className={`group mx-1 my-0.5 flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-3 transition-all duration-150 ${
                            selectedId === w.id
                              ? "bg-table-selected border-l-2 border-l-entity-warehouse"
                              : "border-l-2 border-l-transparent hover:bg-table-row-hover"
                          }`}>
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${selectedId === w.id ? "bg-entity-warehouse-bg" : "bg-muted"}`}>
                            <Warehouse className="h-3.5 w-3.5 stroke-current text-entity-warehouse" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className={`min-w-0 truncate text-[13px] font-semibold ${theme.textPrimary}`}>{w.code} - {w.name}</span>
                            <div className="flex items-center gap-1.5">
                              <TypeBadge type={w.warehouseType} />
                              <span className={`text-[10px] ${theme.textMuted}`}>{w.plantName}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

          {/* Right column */}
          <div className="flex flex-col min-h-0 min-w-0" style={{ flex: 1 }}>
            {renderDetail()}
          </div>
        </div>

        {/* Footer with audit info moved from cards */}
        <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1.5"><Warehouse className="h-3.5 w-3.5 text-entity-warehouse stroke-current" /> Warehouse</span>
          <span className="flex items-center gap-1.5"><Factory className="h-3.5 w-3.5 text-entity-plant stroke-current" /> Plant</span>
          <span>{filtered.length} warehouse{filtered.length !== 1 ? "s" : ""}</span>
          <span className="ml-auto" />
          {sel && (
            <>
              <span>Created: {formatAppDate(sel.createdAt) || "-"}</span>
              <span>Updated: {formatAppDate(sel.updatedAt) || "-"}</span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
