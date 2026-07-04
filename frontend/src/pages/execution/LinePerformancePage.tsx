import { useCallback, useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Activity, RefreshCw, Clock, AlertCircle, ListChecks, Download } from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PageToolbar, ToolbarButton, ToolbarSeparator } from "@/components/layout/PageToolbar";
import { useActiveLine } from "@/hooks/useActiveLine";
import { theme } from "@/styles/themeTokens";
import {
  LINE_PERFORMANCE_DASHBOARD_QUERY,
  LINE_PERFORMANCE_RECORDS_QUERY,
  LINE_PERFORMANCE_FILTERS_QUERY,
} from "@/graphql/linePerformanceQueries";
import { LOG_LINE_DOWNTIME_MUTATION } from "@/graphql/linePerformanceMutations";
import { ShiftRecordList } from "@/components/linePerformance/ShiftRecordList";
import { LinePerformanceKpiSix } from "@/components/linePerformance/LinePerformanceKpiSix";
import { PlanVsActualPanel } from "@/components/linePerformance/PlanVsActualPanel";
import { OeeSignalPanel } from "@/components/linePerformance/OeeSignalPanel";
import { DowntimeParetoPanel } from "@/components/linePerformance/DowntimeParetoPanel";
import { BottleneckPanel } from "@/components/linePerformance/BottleneckPanel";
import { QualitySummaryPanel } from "@/components/linePerformance/QualitySummaryPanel";
import { TimelineMiniPanel } from "@/components/linePerformance/TimelineMiniPanel";
import { IssuesActionsPanel } from "@/components/linePerformance/IssuesActionsPanel";
import { LogDowntimeModal, type LogDowntimeFormData } from "@/components/linePerformance/LogDowntimeModal";
import { NewIssueModal, type NewIssueFormData } from "@/components/shared/NewIssueModal";
import { NewActionModal, type NewActionFormData } from "@/components/shared/NewActionModal";
import type { DashboardQueryData, RecordsQueryData, FiltersQueryData, MutationResponse } from "@/types/linePerformance";
import {
  mockLinePerformanceDashboard,
  mockLinePerformanceRecords,
  mockLinePerformanceFilters,
} from "@/demo/linePerformanceMockData";

const LEFT_WIDTH = "w-[20%] min-w-[288px] max-w-[360px]";
const RIGHT_WIDTH = "w-[32%] min-w-[420px] max-w-[560px]";

export function LinePerformancePage() {
  const { productionLineId, activeLine, loading: lineLoading } = useActiveLine();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [logDowntimeOpen, setLogDowntimeOpen] = useState(false);
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [newActionOpen, setNewActionOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const lineId = productionLineId;

  // ── Records (shifts) ──
  const { data: recordsData, refetch: refetchRecords } = useQuery<RecordsQueryData>(
    LINE_PERFORMANCE_RECORDS_QUERY,
    {
      variables: { lineId, filters: {} },
      skip: !lineId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const records = recordsData?.linePerformanceRecords ?? mockLinePerformanceRecords.linePerformanceRecords;

  useEffect(() => {
    if (!selectedRecordId && records.length > 0) {
      setSelectedRecordId(records[0].id);
    }
  }, [records, selectedRecordId]);

  const selectedRecord = records.find((r) => r.id === selectedRecordId) ?? null;

  // ── Dashboard ──
  const dashboardVars = selectedRecord
    ? { lineId, shiftId: selectedRecord.shiftName, date: selectedRecord.date }
    : { lineId };

  const { data: dashboardData, loading: dashLoading, error: dashError, refetch: refetchDashboard } = useQuery<DashboardQueryData>(
    LINE_PERFORMANCE_DASHBOARD_QUERY,
    {
      variables: dashboardVars,
      skip: !lineId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const { data: filtersData } = useQuery<FiltersQueryData>(
    LINE_PERFORMANCE_FILTERS_QUERY,
    {
      variables: { lineId },
      skip: !lineId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const [logDowntime, { loading: logDowntimeLoading }] = useMutation<{ logLineDowntime: MutationResponse<never> }>(LOG_LINE_DOWNTIME_MUTATION);

  // Mock data fallback
  const dashboard = useMemo(() => {
    const base = dashboardData?.linePerformanceDashboard ?? mockLinePerformanceDashboard.linePerformanceDashboard;
    if (!selectedRecord || dashboardData?.linePerformanceDashboard) return base;
    const { shiftName, date, startTime, endTime, plannedQuantity, actualQuantity, gap, oeeStatus, downtimeMinutes } = selectedRecord;
    return {
      ...base,
      shift: { ...base.shift, name: shiftName, date, startTime, endTime },
      kpis: base.kpis ? { ...base.kpis, planQuantity: plannedQuantity, actualQuantity, gap, oeeStatus, downtimeMinutes } : null,
      planVsActual: base.planVsActual ? {
        ...base.planVsActual, plannedQuantity, actualQuantity, gap,
        status: oeeStatus === "good" ? "ahead" as const : oeeStatus === "pending" ? "on_track" as const : "behind" as const,
      } : null,
      oeeSignal: base.oeeSignal ? {
        ...base.oeeSignal,
        overall: oeeStatus === "good" ? 0.86 : oeeStatus === "warning" ? 0.72 : oeeStatus === "critical" ? 0.45 : 0,
        overallStatus: oeeStatus === "pending" ? "good" : oeeStatus,
      } : null,
      downtimeSummary: base.downtimeSummary ? { ...base.downtimeSummary, totalDowntimeMinutes: downtimeMinutes } : null,
      lastUpdatedAt: new Date().toISOString(),
    };
  }, [selectedRecord, dashboardData]);

  const filters = filtersData?.linePerformanceFilters ?? mockLinePerformanceFilters.linePerformanceFilters;

  const allowedActions = dashboard?.allowedActions ?? [];
  const allowRefresh = allowedActions.length === 0 || allowedActions.includes("refresh");
  const allowLogDowntimeAction = allowedActions.length === 0 || allowedActions.includes("log_downtime");
  const allowNewIssue = allowedActions.length === 0 || allowedActions.includes("create_issue");
  const allowNewAction = allowedActions.length === 0 || allowedActions.includes("create_action");

  // ── Handlers ──
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchDashboard(), refetchRecords()]); } finally { setRefreshing(false); }
  }, [refetchDashboard, refetchRecords]);

  const handleLogDowntime = useCallback(async (data: LogDowntimeFormData) => {
    try {
      const result = await logDowntime({
        variables: {
          input: {
            lineId, startTime: data.startTime, endTime: data.endTime || undefined,
            reasonId: data.reasonId, description: data.description || undefined,
            resourceId: data.resourceId || undefined, resourceGroupId: data.resourceGroupId || undefined,
          },
        },
      });
      if (result.data?.logLineDowntime?.ok) { setLogDowntimeOpen(false); handleRefresh(); }
    } catch { /* Error handled by Apollo */ }
  }, [lineId, logDowntime, handleRefresh]);

  const handleNewIssue = useCallback((_data: NewIssueFormData) => {
    setNewIssueOpen(false); handleRefresh();
  }, [handleRefresh]);

  const handleNewAction = useCallback((_data: NewActionFormData) => {
    setNewActionOpen(false); handleRefresh();
  }, [handleRefresh]);

  const openNewIssue = useCallback(() => { if (lineId) setNewIssueOpen(true); }, [lineId]);
  const openNewAction = useCallback(() => { if (lineId) setNewActionOpen(true); }, [lineId]);

  const headerSubtitle = activeLine
    ? `${activeLine.name} · OEE, plan vs actual, downtime, bottleneck, and shift performance`
    : "Select a production line to view performance data";

  // ── NO ACTIVE LINE ──
  if (!lineId && !lineLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
        <PageHeader title="Line Performance"
          subtitle="Select a production line from the sidebar to view OEE, plan vs actual, downtime, bottlenecks, and shift performance."
          icon={<Activity />} iconClass={theme.iconBoxAmber} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Activity className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-xs text-muted-foreground max-w-sm">No active line selected. Use the sidebar to select a production line.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if ((dashLoading && !dashboardData) || lineLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
        <PageHeader title="Line Performance" subtitle="Loading production line data..." icon={<Activity />} iconClass={theme.iconBoxAmber} />
        <div className="flex-1 flex flex-col gap-4 p-4 animate-pulse">
          <div className="grid grid-cols-6 gap-2 h-16">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-full rounded bg-muted/80" />)}
          </div>
          <div className="flex-1 grid grid-rows-[45%_55%] gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-muted" />
              <div className="rounded bg-muted" />
            </div>
            <div className="grid grid-cols-[50%_50%] gap-2">
              <div className="rounded bg-muted" />
              <div className="rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (dashError && !dashboardData && !mockLinePerformanceDashboard?.linePerformanceDashboard) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
        <PageHeader title="Line Performance" subtitle="Error loading data" icon={<Activity />} iconClass={theme.iconBoxAmber} />
        <div className="h-10 shrink-0">
          <PageToolbar leftWidthClass={LEFT_WIDTH}
            leftSlot={<span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium border border-danger/20 bg-danger/10 text-danger"><span className="h-1.5 w-1.5 rounded-full bg-danger/100" />Error</span>}
            actions={<ToolbarButton icon={RefreshCw} label="Retry" onClick={handleRefresh} disabled={refreshing} />} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm font-medium text-foreground">Failed to load line performance data</p>
          <p className="text-xs text-muted-foreground">Check the connection and try again.</p>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ──
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
      {/* Header */}
      <div className="h-16 shrink-0">
        <PageHeader title="Line Performance" subtitle={headerSubtitle} icon={<Activity />} iconClass={theme.iconBoxAmber} />
      </div>

      {/* Toolbar */}
      <div className="h-10 shrink-0">
        <PageToolbar
          leftWidthClass={LEFT_WIDTH}
          actions={
            <>
              <ToolbarButton icon={RefreshCw} label={refreshing ? "Refreshing..." : "Refresh"} onClick={handleRefresh} disabled={!allowRefresh || refreshing} title="Refresh dashboard data" />
              <ToolbarButton icon={Clock} label="Log Downtime" onClick={() => setLogDowntimeOpen(true)} disabled={!allowLogDowntimeAction} variant="warning" title="Log a downtime event" />
              <ToolbarButton icon={AlertCircle} label="New Issue" onClick={openNewIssue} disabled={!allowNewIssue} variant="warning" title="Create new issue" />
              <ToolbarButton icon={ListChecks} label="New Action" onClick={openNewAction} disabled={!allowNewAction} variant="create" title="Create new action" />
              <ToolbarSeparator />
              <ToolbarButton icon={Download} label="Export" onClick={() => {}} disabled title="Export not yet available" />
            </>
          }
        />
      </div>

      {/* 3-Zone Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── LEFT: Shift Records (20%) ── */}
        <div className={`${LEFT_WIDTH} shrink-0 border-r border-border overflow-hidden`}>
          <ShiftRecordList records={records} selectedId={selectedRecordId} onSelect={setSelectedRecordId} />
        </div>

        {/* ── CENTER: Performance Core ── */}
        <div className="flex min-w-0 flex-[1.3] flex-col overflow-hidden border-r border-border bg-muted">
          {/* Selected shift summary */}
          {selectedRecord && (
            <div className="h-9 shrink-0 flex items-center gap-3 px-3 border-b border-border bg-muted text-xs">
              <span className="font-semibold text-foreground">{selectedRecord.shiftName}</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="text-muted-foreground">{selectedRecord.date}</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="text-muted-foreground">{selectedRecord.startTime}–{selectedRecord.endTime}</span>
              <span className="ml-auto flex items-center gap-2">
                <span className="tabular-nums font-semibold text-foreground">{selectedRecord.actualQuantity}/{selectedRecord.plannedQuantity}</span>
                <span className="text-muted-foreground text-[10px]">units</span>
                {selectedRecord.downtimeMinutes > 0 && (
                  <span className="text-danger font-medium text-[10px]">{selectedRecord.downtimeMinutes}m down</span>
                )}
              </span>
              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border rounded ${
                selectedRecord.oeeStatus === "good" ? "border-success/20 bg-success/10 text-success"
                  : selectedRecord.oeeStatus === "warning" ? "border-warning/20 bg-warning/10 text-warning"
                    : selectedRecord.oeeStatus === "critical" ? "border-danger/20 bg-danger/10 text-danger"
                      : "border-border bg-muted text-muted-foreground"
              }`}>
                {selectedRecord.oeeStatus === "pending" ? "Pending" : selectedRecord.oeeStatus.toUpperCase()}
              </span>
            </div>
          )}

          {/* KPI Strip (6 cols) */}
          <div className="shrink-0">
            <LinePerformanceKpiSix kpis={dashboard?.kpis ?? null} />
          </div>

          {/* Performance Grid */}
          <div className="grid flex-1 min-h-0 grid-rows-[48%_52%] divide-y divide-border overflow-hidden">
            {/* TOP ROW: Plan vs Actual + OEE Signal */}
            <div className="grid grid-cols-2 divide-x divide-border min-h-0 overflow-hidden">
              <PlanVsActualPanel data={dashboard?.planVsActual ?? null} />
              <OeeSignalPanel data={dashboard?.oeeSignal ?? null} />
            </div>

            {/* BOTTOM ROW: Downtime+Bottleneck | Quality+Timeline */}
            <div className="grid grid-cols-2 divide-x divide-border min-h-0 overflow-hidden">
              {/* LEFT: Downtime + Bottleneck */}
              <div className="grid grid-rows-[60%_40%] divide-y divide-border min-h-0 overflow-hidden">
                <DowntimeParetoPanel
                  downtimeSummary={dashboard?.downtimeSummary ?? null}
                  downtimeEvents={dashboard?.downtimeEvents ?? []}
                  onLogDowntime={() => setLogDowntimeOpen(true)}
                />
                <BottleneckPanel data={dashboard?.bottleneckSignal ?? null} />
              </div>

              {/* RIGHT: Quality + Timeline */}
              <div className="grid grid-rows-[52%_48%] divide-y divide-border min-h-0 overflow-hidden">
                <QualitySummaryPanel qualitySummary={dashboard?.qualitySummary ?? null} />
                <TimelineMiniPanel timelineEvents={dashboard?.timelineEvents ?? []} />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Issues & Actions (32%) ── */}
        <div className={`${RIGHT_WIDTH} shrink-0 overflow-hidden`}>
          <IssuesActionsPanel
            issues={dashboard?.linkedIssues ?? []}
            actions={dashboard?.linkedActions ?? []}
            onNewIssue={openNewIssue}
            onNewAction={openNewAction}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex h-10 items-center gap-5 border-t border-border bg-muted px-4 text-xs font-medium text-muted-foreground">
        <span>Line: {activeLine?.name ?? "—"}</span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>Shift: {dashboard?.shift?.name ?? "—"}</span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>Date: {dashboard?.shift?.date ?? "—"}</span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>Last updated: {dashboard?.lastUpdatedAt ?? "—"}</span>
        {dashError && !dashboardData && !mockLinePerformanceDashboard?.linePerformanceDashboard && (
          <div className="ml-auto flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-danger/10 text-danger border border-danger/20 cursor-default"
              title={dashError.message || "API request failed"}
            >
              Error
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewIssueModal
        isOpen={newIssueOpen} onClose={() => setNewIssueOpen(false)} onSave={handleNewIssue}
        saving={false} lineName={activeLine?.name ?? ""} shiftName={dashboard?.shift?.name ?? ""} sourceType="LINE_PERFORMANCE" />
      <NewActionModal
        isOpen={newActionOpen} onClose={() => setNewActionOpen(false)} onSave={handleNewAction}
        saving={false} lineName={activeLine?.name ?? ""} shiftName={dashboard?.shift?.name ?? ""} sourceType="LINE_PERFORMANCE" />
      <LogDowntimeModal
        isOpen={logDowntimeOpen} onClose={() => setLogDowntimeOpen(false)} onSave={handleLogDowntime}
        saving={logDowntimeLoading} filters={filters} lineName={activeLine?.name ?? ""} shiftName={dashboard?.shift?.name ?? ""} />
    </div>
  );
}
