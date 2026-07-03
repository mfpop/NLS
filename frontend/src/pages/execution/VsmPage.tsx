import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GitBranch, RefreshCw, Download, BarChart3, ZoomIn, ZoomOut,
  Maximize2, Plus, Edit3, FileText, Layers, X, PenLine, Link2, Trash2,
  AlertTriangle, Eye, Printer, Loader2,
} from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PageToolbar, ToolbarButton, ToolbarSeparator, ToolbarSelect } from "@/components/layout/PageToolbar";
import { useActiveLine } from "@/hooks/useActiveLine";
import {
  VSM_DIAGRAM_QUERY, VSM_CHARTS_QUERY, CREATE_VSM_CHART,
  UPDATE_VSM_CHART, DELETE_VSM_CHART,
  ADD_VSM_PROCESS, UPDATE_VSM_PROCESS,
  DELETE_VSM_PROCESS, ADD_VSM_INVENTORY, DELETE_VSM_INVENTORY,
  SYNC_VSM_CHART,
  ADD_VSM_INFO_FLOW, DELETE_VSM_INFO_FLOW,
  ADD_VSM_MATERIAL_FLOW, UPDATE_VSM_MATERIAL_FLOW, DELETE_VSM_MATERIAL_FLOW,
  ADD_VSM_TIMELINE, DELETE_VSM_TIMELINE,
  UPDATE_VSM_DEMAND_AND_TAKT,
} from "@/graphql/vsmQueries";
import { ClassicalVsmCanvas } from "@/components/vsm/ClassicalVsmCanvas";
import { VsmProcessDetailDrawer } from "@/components/vsm/VsmProcessDetailDrawer";
import { VsmChartEditor } from "@/components/vsm/VsmChartEditor";
import { VsmDemandTaktDrawer } from "@/components/vsm/VsmDemandTaktDrawer";
import { StandardVsmTemplate } from "@/features/execution/vsm/template/StandardVsmTemplate";
import { VsmKpiStrip } from "@/features/execution/vsm/template/VsmKpiStrip";
import { VsmFooterLegend } from "@/features/execution/vsm/template/VsmFooterLegend";
import { VsmBusinessImpactDrawer } from "@/features/execution/vsm/template/VsmBusinessImpactDrawer";
import { mapVsmChartToTemplateModel } from "@/features/execution/vsm/template/mapVsmChartToTemplateModel";
import { mapVsmApiToTemplateModel } from "@/features/execution/vsm/template/mapVsmApiToTemplateModel";
import { theme } from "@/styles/themeTokens";
import { createTestChart } from "@/demo/vsmTestChart";
import type {
  VsmQueryData, VsmChart, VsmChartProcess, VsmChartInventory,
  VsmChartInfoFlow, VsmChartMaterialFlow, VsmChartTimeline,
} from "@/types/vsm";

type ViewMode = "derived" | "charts";
const LEFT_WIDTH = "w-[20%] min-w-[240px] max-w-[320px]";

/* ── Skeleton loading shimmer ── */
function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
  );
}

function SkeletonKpiStrip() {
  return (
    <div className="h-12 flex items-center gap-2 px-3 bg-white border-b border-slate-200 overflow-hidden">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border border-slate-200 bg-slate-50">
          <SkeletonBar className="w-12 h-3" />
          <SkeletonBar className="w-16 h-3.5" />
        </div>
      ))}
    </div>
  );
}

/* ── Empty state card ── */
function EmptyStateCard({
  icon,
  title,
  description,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 p-10 text-center max-w-xs animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 ring-1 ring-indigo-200/60 shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[260px]">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-2 mt-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ── Error state card ── */
function ErrorStateCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 p-10 text-center max-w-xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 ring-1 ring-red-200/60">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Failed to load VSM data</p>
          <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
        </div>
        {onRetry && (
          <button type="button" onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function VsmPage() {
  const { productionLineId, activeLine, loading: lineLoading } = useActiveLine();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // WIP toggle removed — always shown
  const [showImpact, setShowImpact] = useState(false);
  const [showKaizen, setShowKaizen] = useState(false);
  const [showFlowLogic, setShowFlowLogic] = useState(true);
  const [showAllFlows, setShowAllFlows] = useState(false);
  // Zones toggle removed — clearance zones not useful for production
  const [refreshing, setRefreshing] = useState(false);
  const [viewState, setViewState] = useState<"current" | "future" | "historical">("current");
  const [viewMode, setViewMode] = useState<ViewMode>("derived");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editChartId, setEditChartId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [dismissTaktAlert, setDismissTaktAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Test chart state — frontend-only chart for testing demand/takt
  const [testChart, setTestChart] = useState<VsmChart | null>(null);
  // Local demand override for derived mode (no backend chart to save to)
  const [localDemandSettings, setLocalDemandSettings] = useState<{
    demandQty: number; demandUnit: string; demandPeriod: string;
    availWorkTime: number; breakTime: number; downtime: number;
    shiftsPerDay: number; workDaysPerWeek: number;
  } | null>(null);
  // Dedicated chart ID for derived mode — persisted to VSM chart for uniqueness
  const [derivedChartId, setDerivedChartId] = useState<string | null>(null);

  // ── Computed takt from local demand (derived mode) ──
  const localTakt = useMemo(() => {
    if (!localDemandSettings) return null;
    const { demandQty, demandPeriod, availWorkTime, breakTime, downtime, shiftsPerDay, workDaysPerWeek } = localDemandSettings;
    if (!demandQty || demandQty <= 0) return { taktSec: null, status: "missing_demand" as const, display: null, demandLabel: null };
    const netAvail = Math.max(0, availWorkTime - breakTime - downtime);
    const availPerDay = netAvail * shiftsPerDay;
    if (availPerDay <= 0) return { taktSec: null, status: "missing_available_time" as const, display: null, demandLabel: null };
    const periodDays = demandPeriod === "week" ? workDaysPerWeek : demandPeriod === "month" ? workDaysPerWeek * 4 : 1;
    const demandPerDay = demandQty / periodDays;
    const taktSec = (availPerDay * 60) / demandPerDay;
    return {
      taktSec,
      status: "ok" as const,
      display: taktSec < 60 ? `${taktSec.toFixed(1)}s/unit` : `${(taktSec / 60).toFixed(1)}min/unit`,
      demandLabel: `${demandQty} ${localDemandSettings.demandUnit}/${demandPeriod}`,
    };
  }, [localDemandSettings]);

  // Reset state on line change
  const prevLineRef = useRef(productionLineId);
  useEffect(() => {
    if (prevLineRef.current !== productionLineId) {
      setSelectedNodeId(null); setViewState("current"); setZoom(1);
      setPan({ x: 0, y: 0 }); setEditChartId(null); setViewMode("derived");
      setLocalDemandSettings(null); setDerivedChartId(null); setErrorMessage(null);
      prevLineRef.current = productionLineId;
    }
  }, [productionLineId]);

  const lineId = productionLineId;

  // ── Derived diagram query ──
  const { data: vsmData, loading: vsmLoading, refetch } = useQuery<VsmQueryData>(
    VSM_DIAGRAM_QUERY,
    { variables: { lineId, productVariantCode: null }, skip: !lineId || viewMode !== "derived",
      fetchPolicy: "cache-and-network", errorPolicy: "all" }
  );
  const diagram = useMemo(() => vsmData?.vsmDiagram ?? null, [vsmData]);

  // ── Charts query ──
  const { data: chartsData, loading: chartsLoading, refetch: refetchCharts } = useQuery<{
    vsmCharts: { charts: VsmChart[]; total: number };
  }>(VSM_CHARTS_QUERY, {
    variables: { productionLineId: lineId, sourceMode: null, chartType: null },
    skip: !lineId, fetchPolicy: "network-only",
  });
  const charts = useMemo(() => chartsData?.vsmCharts?.charts ?? [], [chartsData]);

  // Restore derived chart from DB on page load / line switch
  useEffect(() => {
    if (!lineId || !charts.length || localDemandSettings !== null) return;
    const derivedChart = charts.find(
      (c) => c.sourceMode === "LINKED" && c.productionLineId === lineId
    );
    if (!derivedChart) return;
    if (
      derivedChart.customerDemandRate == null &&
      (derivedChart.availableMinutesPerShift == null || derivedChart.availableMinutesPerShift === 450)
    ) return;
    setDerivedChartId(derivedChart.id);
    setLocalDemandSettings({
      demandQty: derivedChart.customerDemandRate ?? 0,
      demandUnit: derivedChart.customerDemandUnit || "units",
      demandPeriod: derivedChart.customerDemandPeriod || "week",
      availWorkTime: derivedChart.availableMinutesPerShift ?? 576,
      breakTime: derivedChart.breakTimePerShift ?? 36,
      downtime: derivedChart.plannedDowntimePerShift ?? 30,
      shiftsPerDay: derivedChart.chartShiftsPerDay ?? 1,
      workDaysPerWeek: derivedChart.workingDaysPerWeek ?? 5,
    });
  }, [lineId, charts, localDemandSettings]);

  // Find the active chart (first linked chart or manual chart)
  const activeChart = useMemo(() => {
    if (testChart) return testChart;
    if (!editChartId) return null;
    return charts.find((c) => c.id === editChartId) ?? null;
  }, [charts, editChartId, testChart]);

  // ── Mutations ──
  const [createChart] = useMutation(CREATE_VSM_CHART);
  const [updateChart] = useMutation(UPDATE_VSM_CHART);
  const [addProcess] = useMutation(ADD_VSM_PROCESS);
  const [updateProcess] = useMutation(UPDATE_VSM_PROCESS);
  const [deleteProcess] = useMutation(DELETE_VSM_PROCESS);
  const [addInventory] = useMutation(ADD_VSM_INVENTORY);
  const [deleteInventory] = useMutation(DELETE_VSM_INVENTORY);
  const [deleteChart] = useMutation(DELETE_VSM_CHART);
  const [syncChart] = useMutation(SYNC_VSM_CHART);
  const [addInfoFlow] = useMutation(ADD_VSM_INFO_FLOW);
  const [deleteInfoFlow] = useMutation(DELETE_VSM_INFO_FLOW);
  const [addMaterialFlow] = useMutation(ADD_VSM_MATERIAL_FLOW);
  const [updateMaterialFlow] = useMutation(UPDATE_VSM_MATERIAL_FLOW);
  const [deleteMaterialFlow] = useMutation(DELETE_VSM_MATERIAL_FLOW);
  const [addTimeline] = useMutation(ADD_VSM_TIMELINE);
  const [deleteTimeline] = useMutation(DELETE_VSM_TIMELINE);
  const [updateDemandTakt] = useMutation(UPDATE_VSM_DEMAND_AND_TAKT);
  const [saving, setSaving] = useState(false);
  const [showDemandTaktDrawer, setShowDemandTaktDrawer] = useState(false);

  // ── Chart template model for rendering ──
  const chartTemplateModel = useMemo(() => {
    if (!activeChart) return null;
    return mapVsmChartToTemplateModel(activeChart);
  }, [activeChart]);

  const hasNoLine = !lineId && !lineLoading;
  const isLoading = (vsmLoading && !vsmData && !diagram && viewMode === "derived") ||
    (lineLoading && !activeLine) ||
    (viewMode === "charts" && chartsLoading && !charts.length);

  // ── KPI data ──
  const kpiData = useMemo(() => {
    const model = (viewMode === "derived" && diagram)
      ? mapVsmApiToTemplateModel(diagram)
      : chartTemplateModel;
    if (!model) return null;
    const totals = model.totals;
    const bottleneck = model.processes.find((p) => p.isBottleneck)?.name ?? null;
    // Internal WIP only: process-level WIP + WIP-type inventory triangles
    // Per spec: do NOT include Purchased Material (RM) or Finished Goods (FG)
    const processWip = model.processes.reduce((sum, p) => sum + (p.wip || 0), 0);
    const wipInventory = model.inventories
      .filter((inv) => inv.type === "WIP")
      .reduce((sum, inv) => sum + (inv.quantity || 0), 0);
    const totalWip = processWip + wipInventory;

    // In derived mode, apply local demand override if set
    if (viewMode === "derived" && localTakt) {
      return {
        leadTime: totals.leadTimeLabel,
        vaTime: totals.valueAddedTimeLabel,
        vaPercent: totals.valueAddedPercent,
        vaPercentLabel: totals.valueAddedPercentLabel,
        taktDisplay: localTakt.display || model.taktTimeDisplay,
        taktStatus: localTakt.status,
        taktMissingReason: localTakt.status !== "ok" ? (localTakt.status === "missing_demand" ? "Demand not set" : "Time not configured") : null,
        bottleneck,
        totalWip,
        demandRate: localTakt.demandLabel ?? model.demandDisplay ?? null,
      };
    }

    return {
      leadTime: totals.leadTimeLabel,
      vaTime: totals.valueAddedTimeLabel,
      vaPercent: totals.valueAddedPercent,
      vaPercentLabel: totals.valueAddedPercentLabel,
      taktDisplay: model.taktTimeDisplay,
      taktStatus: model.taktTimeStatus,
      taktMissingReason: model.taktTimeMissingReason,
      bottleneck,
      totalWip,
      demandRate: model.demandDisplay ?? null,
    };
  }, [diagram, chartTemplateModel, viewMode, localTakt]);

  // ── Footer legend data ──
  const footerLegendData = useMemo(() => {
    const model = (viewMode === "derived" && diagram)
      ? mapVsmApiToTemplateModel(diagram)
      : chartTemplateModel;
    if (!model) return null;
    return {
      showFlow: showFlowLogic ?? true,
      hasKanban: model.informationFlows.some(f => f.flowStyle === 'KANBAN'),
      activeEquipment: new Set(model.materialFlows.map(f => f.equipmentType).filter((e): e is string => !!e)),
      hasPacemaker: model.processes.some(p => p.isPacemaker),
      hasBottleneck: model.processes.some(p => p.isBottleneck),
      hasCritical: model.processes.some(p => p.dataRows.some(r => r.severity === 'critical')),
    };
  }, [diagram, chartTemplateModel, viewMode, showFlowLogic]);

  // ── Business impact data (for the drawer) ──
  const businessImpactData = useMemo(() => {
    const model = (viewMode === "derived" && diagram)
      ? mapVsmApiToTemplateModel(diagram)
      : chartTemplateModel;
    return model?.businessImpact ?? null;
  }, [diagram, chartTemplateModel, viewMode]);

  // ── Handlers ──
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);
    try { await refetch(); await refetchCharts(); }
    catch { setErrorMessage("Failed to refresh VSM data. Check your connection and try again."); }
    finally { setRefreshing(false); }
  }, [refetch, refetchCharts]);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(3, z + 0.15)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(0.25, z - 0.15)), []);
  const handleFit = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);
  const handleCreateTestChart = useCallback(() => {
    const chart = createTestChart();
    setTestChart(chart);
    setEditChartId(chart.id);
    setViewMode("charts");
  }, []);

  // Auto-fit on mount / view mode switch / resize
  useEffect(() => {
    if (viewMode !== "charts") return;
    const el = canvasRef.current;
    if (!el) return;
    let frame: number;
    const obs = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(handleFit);
    });
    obs.observe(el);
    handleFit();
    return () => { obs.disconnect(); cancelAnimationFrame(frame); };
  }, [viewMode, handleFit, activeChart]);

  const handleCreateChart = async (sourceMode: "MANUAL" | "LINKED") => {
    if (!lineId || !activeLine) return;
    setSaving(true);
    setShowCreateDialog(false);
    try {
      const { data } = await createChart({
        variables: {
          input: {
            name: `${activeLine.name} VSM`,
            chartType: viewState === "future" ? "FUTURE_STATE" : viewState === "historical" ? "HISTORICAL" : "CURRENT_STATE",
            sourceMode,
            productionLineId: lineId,
            plantId: activeLine.plantId,
          },
        },
      });
      const chartData = data as { createVsmChart?: { chart?: { id: string } } } | null;
      const chartId = chartData?.createVsmChart?.chart?.id;
      if (chartId) {
        if (sourceMode === "LINKED") {
          try { await syncChart({ variables: { chartId } }); } catch { /* ignore sync errors */ }
        } else {
          try {
            await addInventory({ variables: { chartId, input: { label: "Raw Material", quantity: 0, sequence: 1 } } });
          } catch { /* ignore */ }
          try {
            await addInventory({ variables: { chartId, input: { label: "Finished Goods", quantity: 0, sequence: 2 } } });
          } catch { /* ignore */ }
        }
        setEditChartId(chartId);
        setViewMode("charts");
        await refetchCharts();
      }
    } finally { setSaving(false); }
  };

  const handleSaveChart = async (
    name: string, supplier: string, customer: string,
    taktOpts?: { customerDemandRate?: number | null; availableMinutesPerShift?: number; chartShiftsPerDay?: number }
  ) => {
    if (!editChartId) return;
    setSaving(true);
    try {
      await updateChart({
        variables: { id: editChartId, input: { name, supplierName: supplier, customerName: customer, ...taktOpts } },
      });
      await refetchCharts();
    } finally { setSaving(false); }
  };

  const handleAddProcess = async (proc: Partial<VsmChartProcess>) => {
    if (!editChartId) return;
    try {
      await addProcess({
        variables: {
          chartId: editChartId,
          input: { sequence: (activeChart?.processes.length ?? 0) + 1, name: proc.name || "New Process", ...proc },
        },
      });
      await refetchCharts();
    } catch { /* ignore */ }
  };

  const handleUpdateProcess = async (id: string, proc: Partial<VsmChartProcess>) => {
    try {
      await updateProcess({ variables: { id, input: { name: "", ...proc } } });
      await refetchCharts();
    } catch { /* ignore */ }
  };

  const handleDeleteProcess = async (id: string) => {
    try { await deleteProcess({ variables: { id } }); await refetchCharts(); }
    catch { /* ignore */ }
  };

  const handleAddInventory = async (inv: Partial<VsmChartInventory>) => {
    if (!editChartId) return;
    try {
      await addInventory({
        variables: {
          chartId: editChartId,
          input: { sequence: (activeChart?.inventories.length ?? 0) + 1, label: inv.label || "Inventory", quantity: inv.quantity || 0, ...inv },
        },
      });
      await refetchCharts();
    } catch { /* ignore */ }
  };

  const handleDeleteInventory = async (id: string) => {
    try { await deleteInventory({ variables: { id } }); await refetchCharts(); }
    catch { /* ignore */ }
  };

  const handleSyncFromLine = async () => {
    if (!editChartId) return;
    try { await syncChart({ variables: { chartId: editChartId } }); await refetchCharts(); }
    catch { /* ignore */ }
  };

  const handleAddInfoFlow = async (flow: Partial<VsmChartInfoFlow>) => {
    if (!editChartId) return;
    try {
      await addInfoFlow({ variables: { chartId: editChartId, input: { fromType: "CUSTOMER", toType: "PC", ...flow } } });
      await refetchCharts();
    } catch { /* ignore */ }
  };

  const handleDeleteInfoFlow = async (id: string) => {
    try { await deleteInfoFlow({ variables: { id } }); await refetchCharts(); }
    catch { /* ignore */ }
  };

  const handleAddMaterialFlow = async (flow: Partial<VsmChartMaterialFlow>) => {
    if (!editChartId) return;
    try {
      await addMaterialFlow({ variables: { chartId: editChartId, input: { fromType: "SUPPLIER", toType: "CUSTOMER", flowType: "PUSH", ...flow } } });
      await refetchCharts();
    } catch { /* ignore */ }
  };

  const handleUpdateMaterialFlow = async (id: string, flow: Partial<VsmChartMaterialFlow>) => {
    try {
      await updateMaterialFlow({ variables: { id, input: { fromType: "", ...flow } } });
      await refetchCharts();
    } catch { /* ignore */ }
  };

  const handleDeleteMaterialFlow = async (id: string) => {
    try { await deleteMaterialFlow({ variables: { id } }); await refetchCharts(); }
    catch { /* ignore */ }
  };

  const handleAddTimeline = async (seg: Partial<VsmChartTimeline>) => {
    if (!editChartId) return;
    try {
      await addTimeline({
        variables: {
          chartId: editChartId,
          input: { sequence: (activeChart?.timelineSegments.length ?? 0) + 1, ...seg },
        },
      });
      await refetchCharts();
    } catch { /* ignore */ }
  };

  const handleDeleteTimeline = async (id: string) => {
    try { await deleteTimeline({ variables: { id } }); await refetchCharts(); }
    catch { /* ignore */ }
  };

  const handleDeleteChart = async () => {
    if (!editChartId) return;
    if (!window.confirm("Delete this chart? This action cannot be undone.")) return;
    try {
      await deleteChart({ variables: { id: editChartId } });
      setEditChartId(null);
      await refetchCharts();
    } catch { /* ignore */ }
  };

  const handleDemandTaktSave = useCallback(async (chartId: string, input: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
    try {
      const { data } = await updateDemandTakt({ variables: { chartId, input } });
      const result = data as { updateVsmDemandAndTakt?: Record<string, unknown> } | null;
      const payload = result?.updateVsmDemandAndTakt;
      if (payload) {
        await refetchCharts();
        return payload;
      }
      return null;
    } catch (err) {
      return { errors: [err instanceof Error ? err.message : "Save failed"] };
    }
  }, [updateDemandTakt, refetchCharts]);

  const handleSelectChart = (id: string) => {
    setEditChartId(id);
    setSelectedNodeId(null);
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !diagram) return null;
    return diagram.processNodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, diagram]);

  const headerSubtitle = activeLine
    ? `${activeLine.name} · ${viewMode === "charts" ? "Chart view" : "Classical lean value stream map"}`
    : "Select a production line to view the value stream map";

  const toolbarActions = (
    <>
      <ToolbarButton icon={<AlertTriangle className="h-4 w-4" />} label="Kaizen" onClick={() => setShowKaizen((p) => !p)}
        className={showKaizen ? "bg-amber-50 text-amber-700 border border-amber-200 shadow-sm" : "text-slate-500"} />
      <ToolbarButton icon={<Eye className="h-4 w-4" />} label="Flow" onClick={() => setShowFlowLogic((p) => !p)}
        className={showFlowLogic ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm" : "text-slate-500"} />
      {showFlowLogic && (
        <ToolbarButton icon={<Layers className="h-4 w-4" />} label="Detail" onClick={() => setShowAllFlows((p) => !p)}
          className={showAllFlows ? "bg-violet-50 text-violet-700 border border-violet-200 shadow-sm" : "text-slate-500"} />
      )}
      <ToolbarButton icon={<BarChart3 className="h-4 w-4" />} label="Impact" onClick={() => setShowImpact((p) => !p)}
        className={showImpact ? "bg-amber-50 text-amber-700 border border-amber-200 shadow-sm" : "text-slate-500"} />
      <ToolbarSeparator />
      {/* View controls */}
      <ToolbarButton icon={<ZoomOut className="h-4 w-4" />} label="" onClick={handleZoomOut} />
      <span className="text-[11px] text-slate-500 w-10 text-center tabular-nums font-mono">{Math.round(zoom * 100)}%</span>
      <ToolbarButton icon={<ZoomIn className="h-4 w-4" />} label="" onClick={handleZoomIn} />
      <ToolbarButton icon={<Maximize2 className="h-4 w-4" />} label="Fit" onClick={handleFit} />
      <ToolbarSeparator />
      {/* Actions */}
      <ToolbarButton icon={<RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />}
        label="Refresh" onClick={handleRefresh} disabled={refreshing} />
      <ToolbarButton icon={<Download className="h-4 w-4" />} label="Export" disabled />
      <ToolbarButton icon={<Printer className="h-4 w-4" />} label="Print" disabled />
    </>
  );

  // ── No line state ──
  if (hasNoLine) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-slate-50">
        <PageHeader title="Value Stream Map" subtitle="Select a production line from the sidebar to view the value stream map." icon={<GitBranch />} iconClass={theme.iconBoxBlue} />
        <EmptyStateCard
          icon={<GitBranch className="h-8 w-8 text-slate-400" />}
          title="No line selected"
          description="Open the sidebar and select a production line to view its value stream map."
        />
      </div>
    );
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-slate-50">
        <PageHeader title="Value Stream Map" subtitle="Loading value stream data..." icon={<GitBranch />} iconClass={theme.iconBoxBlue} />
        <SkeletonKpiStrip />
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-[3px] border-sky-100" />
              <div className="absolute inset-0 h-12 w-12 rounded-full border-[3px] border-transparent border-t-sky-500 animate-spin" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-semibold text-slate-700">Loading VSM diagram</p>
              <p className="text-xs text-slate-400">Building value stream for {activeLine?.name ?? "selected line"}</p>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <SkeletonBar className="w-24 h-16 rounded" />
                  <SkeletonBar className="w-16 h-4" />
                  <SkeletonBar className="w-20 h-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (errorMessage && !diagram) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-slate-50">
        <PageHeader title="Value Stream Map" subtitle={headerSubtitle} icon={<GitBranch />} iconClass={theme.iconBoxBlue} />
        <ErrorStateCard message={errorMessage} onRetry={handleRefresh} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-slate-50">
      <PageHeader title="Value Stream Map" subtitle={headerSubtitle} icon={<GitBranch />} iconClass={theme.iconBoxBlue} />

      {/* Toolbar */}
      <PageToolbar leftWidthClass={LEFT_WIDTH} leftSlot={
        <div className="flex items-center gap-2 w-full">
          {viewMode === "derived" ? (
            <ToolbarSelect value={viewState} onChange={(e) => setViewState(e.target.value as typeof viewState)} className="w-full">
              <option value="current">Current State Map</option>
              <option value="future">Future State Map</option>
              <option value="historical">Historical</option>
            </ToolbarSelect>
          ) : (
            <div className="flex items-center gap-1.5 w-full">
              <select value={editChartId ?? ""} onChange={(e) => handleSelectChart(e.target.value)}
                className="flex-1 h-8 text-xs border border-slate-300 bg-white px-2 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400">
                <option value="">Select a chart...</option>
                {charts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.sourceMode === "LINKED" ? "Linked" : "Manual"})
                  </option>
                ))}
              </select>
              {editChartId && (
                <button type="button" onClick={handleDeleteChart}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 shrink-0 whitespace-nowrap transition-colors">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              )}
              <button type="button" onClick={() => setShowCreateDialog(true)} disabled={saving}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 shrink-0 whitespace-nowrap transition-colors">
                <Plus className="h-3 w-3" /> New
              </button>
            </div>
          )}
        </div>
      } actions={
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setViewMode(viewMode === "derived" ? "charts" : "derived")}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded border transition-all duration-200 ${
              viewMode === "charts"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            }`}>
            <Layers className="h-3 w-3" /> {viewMode === "derived" ? "Charts" : "Derived"}
          </button>
          {viewMode === "charts" && editChartId && (
            <button type="button" onClick={() => setEditChartId(editChartId)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
              <Edit3 className="h-3 w-3" /> Edit
            </button>
          )}
          {toolbarActions}
        </div>
      } />

      {/* KPI strip */}
      {kpiData && <VsmKpiStrip data={kpiData} onTaktEdit={() => setShowDemandTaktDrawer(true)} onDemandEdit={() => setShowDemandTaktDrawer(true)} />}
      {isLoading && <SkeletonKpiStrip />}

      {/* Persistent Takt/Demand missing alert banner */}
      {!dismissTaktAlert && kpiData && kpiData.taktStatus !== "ok" && (
        <div className="relative flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 animate-slide-down">
          <button onClick={() => setShowDemandTaktDrawer(true)} className="flex items-center gap-2 text-red-800 text-[13px] font-semibold text-left flex-1 hover:bg-red-100/50 rounded-sm px-1 -mx-1 py-0.5 transition-colors">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 animate-pulse" />
            <span>
              {kpiData.taktStatus === "missing_demand"
                ? "Customer demand is not set. Click to open Demand & Takt settings."
                : kpiData.taktStatus === "missing_available_time"
                  ? "Available working time is not configured. Click to set available minutes or shifts."
                  : kpiData.taktMissingReason || "Takt Time cannot be calculated — click to configure demand and time settings."
              }
            </span>
          </button>
          <button onClick={() => setDismissTaktAlert(true)}
            className="shrink-0 p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss alert">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error banner (non-blocking) */}
      {errorMessage && diagram && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 border-b border-red-200 text-xs text-red-700 animate-slide-down">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Canvas row — drawers are flex siblings that push the canvas */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      <div ref={canvasRef} className="flex-1 min-h-0 relative overflow-hidden transition-all duration-300">
        {viewMode === "derived" && diagram && (
          <div className="flex-1 min-h-0 animate-fade-in">
            <ClassicalVsmCanvas diagram={diagram} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId}
              showKaizen={showKaizen}
              showFlowLogic={showFlowLogic} showAllFlows={showAllFlows}
              zoom={zoom} pan={pan}
              onZoomChange={setZoom} onPanChange={setPan}
            />
          </div>
        )}
        {viewMode === "charts" && activeChart && chartTemplateModel && (
          <div className="flex-1 min-h-0 overflow-hidden bg-white animate-fade-in">
            <div style={{
              width: "100%", height: "100%",
              transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              transition: "transform 0.1s ease-out",
              cursor: "grab",
            }}
              onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.max(0.25, Math.min(3, z + (e.deltaY > 0 ? -0.08 : 0.08)))); }}
              onMouseDown={(e) => {
                if (e.button === 0) {
                  const sx = e.clientX - pan.x, sy = e.clientY - pan.y;
                  const mm = (me: MouseEvent) => setPan({ x: me.clientX - sx, y: me.clientY - sy });
                  const mu = () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
                  window.addEventListener("mousemove", mm);
                  window.addEventListener("mouseup", mu);
                }
              }}
              className="active:cursor-grabbing select-none"
            >
              <StandardVsmTemplate model={chartTemplateModel} onSelectNode={() => {}}
                showKaizen={showKaizen} showFlowLogic={showFlowLogic}
                showAllFlows={showAllFlows} />
            </div>
          </div>
        )}
        {viewMode === "charts" && !activeChart && (
          <EmptyStateCard
            icon={<FileText className="h-7 w-7 text-indigo-400" />}
            title="No chart selected"
            description="Create a new VSM chart or select one from the dropdown to start editing."
            actions={
              <>
                <button type="button" onClick={() => setShowCreateDialog(true)} disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors shadow-sm">
                  <Plus className="h-3.5 w-3.5" /> Create Chart
                </button>
                <button type="button" onClick={handleCreateTestChart}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm">
                  <BarChart3 className="h-3.5 w-3.5" /> Test Chart
                </button>
              </>
            }
          />
        )}

      </div>{/* end canvas ref div */}

        {/* Process Detail Drawer */}
        {selectedNode && diagram && viewMode === "derived" && (
          <div className="animate-slide-left">
            <VsmProcessDetailDrawer node={selectedNode} diagram={diagram} onClose={() => setSelectedNodeId(null)} />
          </div>
        )}

        {/* Business Impact Drawer */}
        {showImpact && businessImpactData && (
          <VsmBusinessImpactDrawer
            impact={businessImpactData}
            onClose={() => setShowImpact(false)}
          />
        )}

        {/* Chart Editor — charts mode */}
        {viewMode === "charts" && editChartId && activeChart && (
          <div className="animate-slide-left">
            <VsmChartEditor chart={activeChart} onClose={() => setEditChartId(null)}
              onSaveChart={handleSaveChart} onAddProcess={handleAddProcess}
              onUpdateProcess={handleUpdateProcess} onDeleteProcess={handleDeleteProcess}
              onAddInventory={handleAddInventory} onDeleteInventory={handleDeleteInventory}
              onAddInfoFlow={handleAddInfoFlow} onDeleteInfoFlow={handleDeleteInfoFlow}
              onAddMaterialFlow={handleAddMaterialFlow} onUpdateMaterialFlow={handleUpdateMaterialFlow} onDeleteMaterialFlow={handleDeleteMaterialFlow}
              onAddTimeline={handleAddTimeline} onDeleteTimeline={handleDeleteTimeline}
              onSyncFromLine={activeChart.sourceMode === "LINKED" ? handleSyncFromLine : undefined}
              onDeleteChart={handleDeleteChart}
              saving={saving} />
          </div>
        )}

        {/* Demand & Takt Drawer — charts mode */}
        {showDemandTaktDrawer && viewMode === "charts" && editChartId && activeChart && (
          <VsmDemandTaktDrawer
            open={true}
            onClose={() => setShowDemandTaktDrawer(false)}
            chartId={editChartId}
            initialData={{
              customerDemandRate: activeChart.customerDemandRate,
              customerDemandUnit: activeChart.customerDemandUnit,
              customerDemandPeriod: activeChart.customerDemandPeriod,
              availableMinutesPerShift: activeChart.availableMinutesPerShift,
              breakTimePerShift: activeChart.breakTimePerShift,
              plannedDowntimePerShift: activeChart.plannedDowntimePerShift,
              chartShiftsPerDay: activeChart.chartShiftsPerDay,
              workingDaysPerWeek: activeChart.workingDaysPerWeek,
              taktTimeSeconds: activeChart.taktTimeSeconds,
            }}
            onSave={handleDemandTaktSave}
          />
        )}

        {/* Demand & Takt Drawer — derived mode */}
        {showDemandTaktDrawer && viewMode === "derived" && (
          <VsmDemandTaktDrawer
            open={true}
            onClose={() => setShowDemandTaktDrawer(false)}
            chartId={derivedChartId || ""}
            initialData={localDemandSettings ? {
              customerDemandRate: localDemandSettings.demandQty,
              customerDemandUnit: localDemandSettings.demandUnit,
              customerDemandPeriod: localDemandSettings.demandPeriod,
              availableMinutesPerShift: localDemandSettings.availWorkTime,
              breakTimePerShift: localDemandSettings.breakTime,
              plannedDowntimePerShift: localDemandSettings.downtime,
              chartShiftsPerDay: localDemandSettings.shiftsPerDay,
              workingDaysPerWeek: localDemandSettings.workDaysPerWeek,
              taktTimeSeconds: localTakt?.taktSec ?? null,
            } : {
              customerDemandRate: 250,
              customerDemandUnit: "units",
              customerDemandPeriod: "week",
              availableMinutesPerShift: 576,
              breakTimePerShift: 36,
              plannedDowntimePerShift: 30,
              chartShiftsPerDay: 1,
              workingDaysPerWeek: 5,
              taktTimeSeconds: null,
            }}
            onSave={async (_chartId, input) => {
              const qty = (input.customerDemandQuantity as number) || 0;
              if (qty <= 0) return { errors: ["Demand quantity must be greater than 0"] };

              let targetChartId = derivedChartId;
              if (!targetChartId && lineId && activeLine) {
                try {
                  const refetchResult = await refetchCharts();
                  const refreshedCharts = refetchResult.data?.vsmCharts?.charts ?? [];
                  const existingChart = refreshedCharts.find(
                    (c) => c.sourceMode === "LINKED" && c.productionLineId === lineId
                  ) ?? refreshedCharts.find((c) => c.sourceMode === "LINKED");
                  if (existingChart) {
                    targetChartId = existingChart.id;
                  }
                } catch { /* ignore */ }

                if (!targetChartId) {
                  try {
                    const { data: createData } = await createChart({
                      variables: { input: {
                        name: `${activeLine.name} VSM (Derived)`,
                        chartType: "CURRENT_STATE",
                        sourceMode: "LINKED",
                        productionLineId: lineId,
                        plantId: activeLine.plantId,
                      }},
                    });
                    const created = (createData as any)?.createVsmChart?.chart?.id;
                    if (created) targetChartId = created;
                  } catch { /* ignore */ }
                }
              }

              if (targetChartId) {
                setDerivedChartId(targetChartId);
                try {
                  await updateDemandTakt({ variables: { chartId: targetChartId, input } });
                  await refetchCharts();
                } catch (err) {
                  console.warn("Derived mode DB save failed:", err);
                }
              }

              const localUpdates = {
                demandQty: qty,
                demandUnit: (input.customerDemandUnit as string) || "units",
                demandPeriod: (input.customerDemandPeriod as string) || "day",
                availWorkTime: (input.availableWorkTimePerShift as number) || 450,
                breakTime: (input.breakTimePerShift as number) || 0,
                downtime: (input.plannedDowntimePerShift as number) || 0,
                shiftsPerDay: (input.shiftsPerDay as number) || 1,
                workDaysPerWeek: (input.workingDaysPerWeek as number) || 5,
              };
              setLocalDemandSettings(localUpdates);
              setShowDemandTaktDrawer(false);
              return {};
            }}
          />
        )}
      </div>

      {footerLegendData && <VsmFooterLegend {...footerLegendData} />}

      {/* ── Create Chart Dialog ── */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-fade-in"
          onClick={() => setShowCreateDialog(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[440px] max-w-[90vw] animate-scale-in"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Create VSM Chart</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Choose how the chart will be created</p>
              </div>
              <button type="button" onClick={() => setShowCreateDialog(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {/* Manual option */}
              <button type="button" onClick={() => handleCreateChart("MANUAL")} disabled={saving}
                className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed group">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 border border-sky-200 group-hover:bg-sky-100 group-hover:border-sky-300 transition-colors">
                  <PenLine className="h-5 w-5 text-sky-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Manual Chart</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Start from scratch — add processes, inventories, and flows manually.
                    Full control over every element.
                  </p>
                </div>
              </button>

              {/* Linked option */}
              <button type="button" onClick={() => handleCreateChart("LINKED")} disabled={saving}
                className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed group">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 group-hover:bg-indigo-100 group-hover:border-indigo-300 transition-colors">
                  <Link2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Linked to Production Line</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Auto-populate processes from the production line routing data.
                    Processes sync on creation and can be refreshed later.
                  </p>
                </div>
              </button>
            </div>
            {saving && (
              <div className="px-5 pb-4 flex items-center gap-2 text-[11px] text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin text-sky-500" />
                Creating chart...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
