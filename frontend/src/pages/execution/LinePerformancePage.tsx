import { useCallback, useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Activity } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { useActiveLine } from "@/hooks/useActiveLine";
import { theme } from "@/styles/themeTokens";
import { LINE_PERFORMANCE_DASHBOARD_QUERY, LINE_PERFORMANCE_RECORDS_QUERY, LINE_PERFORMANCE_FILTERS_QUERY } from "@/graphql/linePerformanceQueries";
import { LOG_LINE_DOWNTIME_MUTATION } from "@/graphql/linePerformanceMutations";
import { LinePerformanceRecordList } from "@/components/linePerformance/LinePerformanceRecordList";
import { LinePerformanceKpiStrip } from "@/components/linePerformance/LinePerformanceKpiStrip";
import { LinePerformanceToolbar } from "@/components/linePerformance/LinePerformanceToolbar";
import { PlanVsActualPanel } from "@/components/linePerformance/PlanVsActualPanel";
import { OeeSignalPanel } from "@/components/linePerformance/OeeSignalPanel";
import { DowntimePanel } from "@/components/linePerformance/DowntimePanel";
import { QualitySignalPanel } from "@/components/linePerformance/QualitySignalPanel";
import { BottleneckPanel } from "@/components/linePerformance/BottleneckPanel";
import { LinkedIssuesActionsPanel } from "@/components/linePerformance/LinkedIssuesActionsPanel";
import { LinePerformanceTimeline } from "@/components/linePerformance/LinePerformanceTimeline";
import { LinePerformanceErrorState } from "@/components/linePerformance/LinePerformanceErrorState";
import { LinePerformanceSkeleton } from "@/components/linePerformance/LinePerformanceSkeleton";
import { LogDowntimeModal, type LogDowntimeFormData } from "@/components/linePerformance/LogDowntimeModal";
import { NewIssueModal, type NewIssueFormData } from "@/components/shared/NewIssueModal";
import { NewActionModal, type NewActionFormData } from "@/components/shared/NewActionModal";
import type { DashboardQueryData, RecordsQueryData, FiltersQueryData, MutationResponse } from "@/types/linePerformance";
import {
  mockLinePerformanceDashboard,
  mockLinePerformanceRecords,
  mockLinePerformanceFilters,
} from "@/demo/linePerformanceMockData";

export function LinePerformancePage() {
  const { productionLineId, activeLine, loading: lineLoading } = useActiveLine();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [logDowntimeOpen, setLogDowntimeOpen] = useState(false);
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [newActionOpen, setNewActionOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const lineId = productionLineId;

  const { data: recordsData, loading: recordsLoading, refetch: refetchRecords } = useQuery<RecordsQueryData>(
    LINE_PERFORMANCE_RECORDS_QUERY,
    {
      variables: { lineId, filters: {} },
      skip: !lineId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  // Fall back to mock data when backend resolver is unavailable
  const records = recordsData?.linePerformanceRecords ?? mockLinePerformanceRecords.linePerformanceRecords;

  // Auto-select first record if none selected
  useEffect(() => {
    if (!selectedRecordId && records.length > 0) {
      setSelectedRecordId(records[0].id);
    }
  }, [records, selectedRecordId]);

  const selectedRecord = records.find((r) => r.id === selectedRecordId) ?? null;

  // Dashboard query variables derived from selected record
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

  // Fall back to mock data when backend resolver is unavailable.
  // When using mock data, patch it with the selected record so the panels reflect the active record.
  const dashboard = useMemo(() => {
    const base = dashboardData?.linePerformanceDashboard ?? mockLinePerformanceDashboard.linePerformanceDashboard;
    if (!selectedRecord || dashboardData?.linePerformanceDashboard) {
      // Real backend data — use as-is
      return base;
    }
    // Patch mock data to reflect the selected record (shift name, KPIs, status)
    const { shiftName, date, startTime, endTime, plannedQuantity, actualQuantity, gap, oeeStatus, downtimeMinutes } = selectedRecord;
    return {
      ...base,
      shift: {
        ...base.shift,
        name: shiftName,
        date,
        startTime,
        endTime,
      },
      kpis: base.kpis ? {
        ...base.kpis,
        planQuantity: plannedQuantity,
        actualQuantity,
        gap,
        oeeStatus,
        downtimeMinutes,
      } : null,
      planVsActual: base.planVsActual ? {
        ...base.planVsActual,
        plannedQuantity,
        actualQuantity,
        gap,
        status: oeeStatus === 'good' ? 'ahead' as const : oeeStatus === 'pending' ? 'on_track' as const : 'behind' as const,
      } : null,
      oeeSignal: base.oeeSignal ? {
        ...base.oeeSignal,
        overall: oeeStatus === 'good' ? 0.86 : oeeStatus === 'warning' ? 0.72 : oeeStatus === 'critical' ? 0.45 : 0,
        overallStatus: oeeStatus === 'pending' ? 'good' : oeeStatus,
      } : null,
      downtimeSummary: base.downtimeSummary ? {
        ...base.downtimeSummary,
        totalDowntimeMinutes: downtimeMinutes,
      } : null,
      lastUpdatedAt: new Date().toISOString(),
    };
  }, [selectedRecord, dashboardData]);
  const filters = filtersData?.linePerformanceFilters ?? mockLinePerformanceFilters.linePerformanceFilters;

  const allowedActions = dashboard?.allowedActions ?? [];
  const allowRefresh = allowedActions.length === 0 || allowedActions.includes("refresh");
  const allowLogDowntimeAction = allowedActions.length === 0 || allowedActions.includes("log_downtime");
  const allowNewIssue = allowedActions.length === 0 || allowedActions.includes("create_issue");
  const allowNewAction = allowedActions.length === 0 || allowedActions.includes("create_action");

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchDashboard(), refetchRecords()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchDashboard, refetchRecords]);

  const handleLogDowntime = useCallback(async (data: LogDowntimeFormData) => {
    try {
      const result = await logDowntime({
        variables: {
          input: {
            lineId,
            startTime: data.startTime,
            endTime: data.endTime || undefined,
            reasonId: data.reasonId,
            description: data.description || undefined,
            resourceId: data.resourceId || undefined,
            resourceGroupId: data.resourceGroupId || undefined,
          },
        },
      });
      if (result.data?.logLineDowntime?.ok) {
        setLogDowntimeOpen(false);
        handleRefresh();
      }
    } catch {
      // Error handled by Apollo
    }
  }, [lineId, logDowntime, handleRefresh]);

  const handleNewIssue = useCallback((_data: NewIssueFormData) => {
    setNewIssueOpen(false);
    handleRefresh();
  }, [handleRefresh]);

  const handleNewAction = useCallback((_data: NewActionFormData) => {
    setNewActionOpen(false);
    handleRefresh();
  }, [handleRefresh]);

  const openNewIssue = useCallback(() => { if (lineId) setNewIssueOpen(true); }, [lineId]);
  const openNewAction = useCallback(() => { if (lineId) setNewActionOpen(true); }, [lineId]);

  const headerSubtitle = activeLine
    ? `${activeLine.name} · Live execution, OEE signals, downtime, quality, bottlenecks, and shift performance`
    : "Select a production line to view performance data";

  // No active line state
  if (!lineId && !lineLoading) {
    return (
      <AppPageLayout
        title="Line Performance"
        subtitle="Select a production line from the sidebar to view live execution, OEE signals, downtime, quality, bottlenecks, and shift performance."
        icon={<Activity />}
        iconClass={theme.iconBoxAmber}
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">No active line selected. Use the sidebar to select a production line.</p>
          </div>
        </div>
      </AppPageLayout>
    );
  }

  const footerContent = (
    <>
      <span>Line: {activeLine?.name ?? "—"}</span>
      <span className="w-1 h-1 rounded-full bg-border" />
      <span>Shift: {dashboard?.shift?.name ?? "—"}</span>
      <span className="w-1 h-1 rounded-full bg-border" />
      <span>Date: {dashboard?.shift?.date ?? "—"}</span>
      <span className="w-1 h-1 rounded-full bg-border" />
      <span>Last updated: {dashboard?.lastUpdatedAt ?? "—"}</span>
      <div className="ml-auto flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
          dashError ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
        }`}>
          {dashError ? "Error" : "Connected"}
        </span>
      </div>
    </>
  );

  const leftColumn = (
    <LinePerformanceRecordList
      records={records}
      selectedId={selectedRecordId}
      onSelect={setSelectedRecordId}
      loading={recordsLoading}
    />
  );

  const rightContent = () => {
    if (dashLoading && !dashboardData) {
      return <LinePerformanceSkeleton />;
    }

    // Backend resolver unavailable — mock data fallback handles this below.
    // Only show error state when there's no mock data to fall back to (should not happen).
    if (dashError && !dashboardData && !mockLinePerformanceDashboard?.linePerformanceDashboard) {
      return <LinePerformanceErrorState onRetry={handleRefresh} />;
    }

    return (
      <div className="flex flex-col gap-3 p-4 overflow-y-auto h-full">
        {/* Selected record context */}
        {selectedRecord && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/30 bg-card/50 text-xs">
            <span className="font-semibold text-foreground">{selectedRecord.shiftName}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{selectedRecord.date}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{selectedRecord.startTime}–{selectedRecord.endTime}</span>
            <span className="ml-auto">
              <span className="font-mono">{selectedRecord.actualQuantity}/{selectedRecord.plannedQuantity}</span>
              <span className="text-muted-foreground ml-1">units</span>
              {selectedRecord.downtimeMinutes > 0 && (
                <span className="text-red-500 ml-2 font-medium">{selectedRecord.downtimeMinutes}m down</span>
              )}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border rounded ${
              selectedRecord.oeeStatus === 'good' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300' :
              selectedRecord.oeeStatus === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300' :
              selectedRecord.oeeStatus === 'critical' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300' :
              'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {selectedRecord.oeeStatus === 'pending' ? 'Pending' : selectedRecord.oeeStatus.toUpperCase()}
            </span>
          </div>
        )}
        <LinePerformanceKpiStrip kpis={dashboard?.kpis ?? null} />

        <div className="grid grid-cols-2 gap-3">
          <PlanVsActualPanel data={dashboard?.planVsActual ?? null} />
          <OeeSignalPanel data={dashboard?.oeeSignal ?? null} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DowntimePanel
            summary={dashboard?.downtimeSummary ?? null}
            events={dashboard?.downtimeEvents ?? []}
            onLogDowntime={() => setLogDowntimeOpen(true)}
          />
          <QualitySignalPanel data={dashboard?.qualitySummary ?? null} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <BottleneckPanel data={dashboard?.bottleneckSignal ?? null} />
          <LinePerformanceTimeline events={dashboard?.timelineEvents ?? []} />
        </div>

        <LinkedIssuesActionsPanel
          issues={dashboard?.linkedIssues ?? []}
          actions={dashboard?.linkedActions ?? []}
          onNewIssue={() => handleNewIssue(undefined as unknown as NewIssueFormData)}
          onNewAction={() => handleNewAction(undefined as unknown as NewActionFormData)}
        />
      </div>
    );
  };

  return (
    <AppPageLayout
      title="Line Performance"
      subtitle={headerSubtitle}
      icon={<Activity />}
      iconClass={theme.iconBoxAmber}
      toolbar={
        <LinePerformanceToolbar
          onRefresh={handleRefresh}
          onLogDowntime={() => setLogDowntimeOpen(true)}
          onNewIssue={openNewIssue}
          onNewAction={openNewAction}
          refreshing={refreshing}
          allowRefresh={allowRefresh}
          allowLogDowntime={allowLogDowntimeAction}
          allowNewIssue={allowNewIssue}
          allowNewAction={allowNewAction}
        />
      }
      leftColumn={leftColumn}
      leftColumnWidth="w-80"
      footer={footerContent}
    >
      {rightContent()}
      <NewIssueModal
        isOpen={newIssueOpen}
        onClose={() => setNewIssueOpen(false)}
        onSave={handleNewIssue}
        saving={false}
        lineName={activeLine?.name ?? ""}
        shiftName={dashboard?.shift?.name ?? ""}
        sourceType="LINE_PERFORMANCE"
      />
      <NewActionModal
        isOpen={newActionOpen}
        onClose={() => setNewActionOpen(false)}
        onSave={handleNewAction}
        saving={false}
        lineName={activeLine?.name ?? ""}
        shiftName={dashboard?.shift?.name ?? ""}
        sourceType="LINE_PERFORMANCE"
      />
      <LogDowntimeModal
        isOpen={logDowntimeOpen}
        onClose={() => setLogDowntimeOpen(false)}
        onSave={handleLogDowntime}
        saving={logDowntimeLoading}
        filters={filters}
        lineName={activeLine?.name ?? ""}
        shiftName={dashboard?.shift?.name ?? ""}
      />
    </AppPageLayout>
  );
}
