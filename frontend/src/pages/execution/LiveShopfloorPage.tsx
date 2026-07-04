import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { PanelTop, RefreshCw, Clock, AlertCircle, ListChecks, Download } from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PageToolbar, ToolbarButton, ToolbarSeparator } from "@/components/layout/PageToolbar";
import { useActiveLine } from "@/hooks/useActiveLine";
import { theme } from "@/styles/themeTokens";
import { LIVE_SHOPFLOOR_DASHBOARD_QUERY, LIVE_SHOPFLOOR_FILTERS_QUERY } from "@/graphql/liveShopfloorQueries";
import { LOG_SHOPFLOOR_DOWNTIME_MUTATION, CLOSE_SHOPFLOOR_DOWNTIME_MUTATION } from "@/graphql/liveShopfloorMutations";
import { LiveShopfloorKpiStrip } from "@/components/liveShopfloor/LiveShopfloorKpiStrip";
import { LineContextPanel } from "@/components/liveShopfloor/LineContextPanel";
import { ResourceFlowPanel } from "@/components/liveShopfloor/ResourceFlowPanel";
import { BottleneckHighlight } from "@/components/liveShopfloor/BottleneckHighlight";
import { ActiveDowntimePanel } from "@/components/liveShopfloor/ActiveDowntimePanel";
import { ShopfloorIssuesActionsPanel } from "@/components/liveShopfloor/ShopfloorIssuesActionsPanel";
import { RecentEventsPanel } from "@/components/liveShopfloor/RecentEventsPanel";
import { CloseDowntimeConfirmDialog } from "@/components/liveShopfloor/CloseDowntimeConfirmDialog";
import { LogShopfloorDowntimeModal, type LogShopfloorDowntimeFormData } from "@/components/liveShopfloor/LogShopfloorDowntimeModal";
import { NewIssueModal, type NewIssueFormData } from "@/components/shared/NewIssueModal";
import { NewActionModal, type NewActionFormData } from "@/components/shared/NewActionModal";
import type { LiveShopfloorDashboardQueryData, LiveShopfloorFiltersQueryData, MutationResponse } from "@/types/liveShopfloor";
import { mockLiveShopfloorDashboard, mockLiveShopfloorFilters } from "@/demo/liveShopfloorMockData";

const LEFT_WIDTH = "w-[20%] min-w-[288px] max-w-[360px]";
const RIGHT_WIDTH = "w-[30%] min-w-[420px] max-w-[560px]";

export function LiveShopfloorPage() {
  const { productionLineId, activeLine, loading: lineLoading } = useActiveLine();
  const [logDowntimeOpen, setLogDowntimeOpen] = useState(false);
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [newActionOpen, setNewActionOpen] = useState(false);
  const [closeDowntimeId, setCloseDowntimeId] = useState<string | null>(null);
  const [downtimeIssuePrefill, setDowntimeIssuePrefill] = useState<{ title: string; description: string } | null>(null);
  const [downtimeActionPrefill, setDowntimeActionPrefill] = useState<{ title: string; description: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const lineId = productionLineId;

  const { data: dashboardData, loading: dashLoading, error: dashError, refetch: refetchDashboard } = useQuery<LiveShopfloorDashboardQueryData>(
    LIVE_SHOPFLOOR_DASHBOARD_QUERY,
    {
      variables: { lineId },
      skip: !lineId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const { data: filtersData } = useQuery<LiveShopfloorFiltersQueryData>(
    LIVE_SHOPFLOOR_FILTERS_QUERY,
    {
      variables: { lineId },
      skip: !lineId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const dashboard = dashboardData?.liveShopfloorDashboard ?? mockLiveShopfloorDashboard.liveShopfloorDashboard;

  const [logDowntime, { loading: logDowntimeLoading }] = useMutation<{ logShopfloorDowntime: MutationResponse<never> }>(LOG_SHOPFLOOR_DOWNTIME_MUTATION);
  const [closeDowntime, { loading: closeDowntimeLoading }] = useMutation<{ closeShopfloorDowntime: MutationResponse<never> }>(CLOSE_SHOPFLOOR_DOWNTIME_MUTATION);
  const filters = filtersData?.liveShopfloorFilters ?? mockLiveShopfloorFilters.liveShopfloorFilters;

  const allowedActions = dashboard?.allowedActions ?? [];
  const allowRefresh = allowedActions.length === 0 || allowedActions.includes("refresh");
  const allowLogDowntimeAction = allowedActions.length === 0 || allowedActions.includes("log_downtime");
  const allowNewIssue = allowedActions.length === 0 || allowedActions.includes("create_issue");
  const allowNewAction = allowedActions.length === 0 || allowedActions.includes("create_action");

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchDashboard(); } finally { setRefreshing(false); }
  }, [refetchDashboard]);

  const handleCreateIssueFromDowntime = useCallback(() => {
    if (!dashboard?.activeDowntime) return;
    setDowntimeIssuePrefill({
      title: `Downtime: ${dashboard.activeDowntime.reason}`,
      description: `Created from active downtime on ${dashboard.activeDowntime.affectedResourceName ?? "the line"} (${dashboard.activeDowntime.durationMinutes} min so far).`,
    });
    setNewIssueOpen(true);
  }, [dashboard?.activeDowntime]);

  const handleResolveDowntime = useCallback((id: string) => {
    setCloseDowntimeId(id);
  }, []);

  const handleCloseDowntimeConfirm = useCallback(async () => {
    if (!closeDowntimeId) return;
    try {
      const result = await closeDowntime({ variables: { id: closeDowntimeId } });
      if (result.data?.closeShopfloorDowntime?.ok) {
        setCloseDowntimeId(null);
        handleRefresh();
      }
    } catch { /* Error handled by Apollo */ }
  }, [closeDowntimeId, closeDowntime, handleRefresh]);

  const handleLogDowntime = useCallback(async (data: LogShopfloorDowntimeFormData) => {
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
      if (result.data?.logShopfloorDowntime?.ok) { setLogDowntimeOpen(false); handleRefresh(); }
    } catch { /* Error handled by Apollo */ }
  }, [lineId, logDowntime, handleRefresh]);

  const handleNewIssueSubmit = useCallback((_data: NewIssueFormData) => {
    setNewIssueOpen(false); setDowntimeIssuePrefill(null); handleRefresh();
  }, [handleRefresh]);

  const handleNewActionSubmit = useCallback((_data: NewActionFormData) => {
    setNewActionOpen(false); setDowntimeActionPrefill(null); handleRefresh();
  }, [handleRefresh]);

  const openNewIssue = useCallback(() => { if (lineId) setNewIssueOpen(true); }, [lineId]);
  const openNewAction = useCallback(() => { if (lineId) setNewActionOpen(true); }, [lineId]);

  const headerSubtitle = activeLine
    ? `${activeLine.name} · Real-time line status, resources, active downtime, issues, and actions`
    : "Select a production line to view real-time shopfloor status";

  const isLive = !!dashboardData?.liveShopfloorDashboard;

  // ── NO ACTIVE LINE ──
  if (!lineId && !lineLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
        <PageHeader title="Live Shopfloor"
          subtitle="Select a production line from the sidebar to view real-time line status, resources, downtime, issues, and actions."
          icon={<PanelTop />} iconClass={theme.iconBoxTeal} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <PanelTop className="h-6 w-6 text-muted-foreground/60" />
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
        <PageHeader title="Live Shopfloor" subtitle="Loading production line data..." icon={<PanelTop />} iconClass={theme.iconBoxTeal} />
        <div className="flex-1 flex flex-col gap-4 p-4 animate-pulse">
          <div className="grid grid-cols-7 gap-2 h-16">
            {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-full rounded bg-muted/80" />)}
          </div>
          <div className="flex-1 grid grid-cols-[20%_1fr_30%] gap-2">
            <div className="rounded bg-muted" />
            <div className="rounded bg-muted" />
            <div className="rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (dashError && !dashboardData && !mockLiveShopfloorDashboard?.liveShopfloorDashboard) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
        <PageHeader title="Live Shopfloor" subtitle="Error loading data" icon={<PanelTop />} iconClass={theme.iconBoxTeal} />
        <div className="h-10 shrink-0">
          <PageToolbar leftWidthClass={LEFT_WIDTH}
            leftSlot={<span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium border border-danger/20 bg-danger/10 text-danger"><span className="h-1.5 w-1.5 rounded-full bg-danger/100" />Error</span>}
            actions={<ToolbarButton icon={RefreshCw} label="Retry" onClick={handleRefresh} disabled={refreshing} />} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm font-medium text-foreground">Failed to load shopfloor data</p>
          <p className="text-xs text-muted-foreground">Check the connection and try again.</p>
        </div>
      </div>
    );
  }

  // ── EMPTY ──
  if (!dashboard?.liveStatus && !dashboard?.assignedResourceGroups?.length) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
        <PageHeader title="Live Shopfloor" subtitle={headerSubtitle} icon={<PanelTop />} iconClass={theme.iconBoxTeal} />
        <div className="h-10 shrink-0">
          <PageToolbar leftWidthClass={LEFT_WIDTH}
            leftSlot={<span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium border border-border bg-muted text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />Empty</span>}
            actions={
              <><ToolbarButton icon={RefreshCw} label={refreshing ? "Refreshing..." : "Refresh"} onClick={handleRefresh} disabled={!allowRefresh || refreshing} />
                <ToolbarSeparator />
                <ToolbarButton icon={Clock} label="Log Downtime" onClick={() => setLogDowntimeOpen(true)} disabled={!allowLogDowntimeAction} variant="warning" />
              
              </>
            } />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <PanelTop className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <p className="text-xs text-muted-foreground max-w-sm">No shopfloor data available for the selected line.</p>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ──
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
      {/* Header */}
      <div className="h-16 shrink-0">
        <PageHeader title="Live Shopfloor" subtitle={headerSubtitle} icon={<PanelTop />} iconClass={theme.iconBoxTeal} />
      </div>

      {/* Toolbar */}
      <div className="h-10 shrink-0">
        <PageToolbar
          leftWidthClass={LEFT_WIDTH}
          leftSlot={
            <div className="flex items-center gap-2 w-full">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${
                dashError && !dashboardData && !mockLiveShopfloorDashboard?.liveShopfloorDashboard
                  ? "border-danger/20 bg-danger/10 text-danger"
                  : isLive ? "border-success/20 bg-success/10 text-success"
                    : "border-warning/20 bg-warning/10 text-warning"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  dashError && !dashboardData && !mockLiveShopfloorDashboard?.liveShopfloorDashboard ? "bg-danger/100"
                    : isLive ? "bg-success/100" : "bg-warning/100"
                }`} />
                {dashError && !dashboardData && !mockLiveShopfloorDashboard?.liveShopfloorDashboard ? "Error" : isLive ? "Live" : "Demo"}
              </span>
            </div>
          }
          actions={
            <>
              <ToolbarButton icon={RefreshCw} label={refreshing ? "Refreshing..." : "Refresh"} onClick={handleRefresh} disabled={!allowRefresh || refreshing} title="Refresh live shopfloor data" />
              <ToolbarSeparator />
              <ToolbarButton icon={Clock} label="Log Downtime" onClick={() => setLogDowntimeOpen(true)} disabled={!allowLogDowntimeAction} variant="warning" title="Log a downtime event" />
              <ToolbarButton icon={AlertCircle} label="New Issue" onClick={openNewIssue} disabled={!allowNewIssue} variant="warning" title="Create new issue" />
              <ToolbarButton icon={ListChecks} label="New Action" onClick={openNewAction} disabled={!allowNewAction} variant="create" title="Create new action" />
              <ToolbarSeparator />
              <ToolbarButton icon={Download} label="Export" onClick={() => {}} disabled title="Export not yet available" />
            </>
          }
        />
      </div>

      {/* KPI Status Strip */}
      <div className="shrink-0">
        <LiveShopfloorKpiStrip
          liveStatus={dashboard?.liveStatus ?? null}
          activeDowntime={dashboard?.activeDowntime ?? null}
          bottleneckSignal={dashboard?.bottleneckSignal ?? null}
          issueCount={dashboard?.openIssues?.length ?? 0}
          actionCount={dashboard?.openActions?.length ?? 0}
          outputCount={dashboard?.currentProduction?.actualQuantity ?? null}
          lastUpdatedAt={dashboard?.lastUpdatedAt ?? null}
        />
      </div>

      {/* 3-Column Command Board */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── LEFT (20%): Line Context ── */}
        <div className={`${LEFT_WIDTH} shrink-0 border-r border-border overflow-hidden`}>
          <LineContextPanel
            lineSummary={dashboard?.lineSummary ?? null}
            shiftSummary={dashboard?.shiftSummary ?? null}
            currentProduction={dashboard?.currentProduction ?? null}
          />
        </div>

        {/* ── CENTER (flex-1): Resource Flow ── */}
        <div className="flex-[1.45] min-w-0 border-r border-border overflow-hidden flex flex-col">
          {/* Bottleneck highlight (when active) */}
          <BottleneckHighlight bottleneckSignal={dashboard?.bottleneckSignal ?? null} />

          {/* Resource group flow */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ResourceFlowPanel
              assignedResourceGroups={dashboard?.assignedResourceGroups ?? []}
              resourceStatuses={dashboard?.resourceStatuses ?? []}
              openIssuesCount={dashboard?.openIssues?.length ?? 0}
              openActionsCount={dashboard?.openActions?.length ?? 0}
            />
          </div>
        </div>

        {/* ── RIGHT (30%): Critical Attention ── */}
        <div className={`${RIGHT_WIDTH} shrink-0 overflow-hidden flex flex-col`}>
          {/* Active Downtime (25%) */}
          <div className="shrink-0" style={{ minHeight: 0 }}>
            <ActiveDowntimePanel
              activeDowntime={dashboard?.activeDowntime ?? null}
              onResolveDowntime={handleResolveDowntime}
              onCreateIssue={handleCreateIssueFromDowntime}
            />
          </div>

          {/* Issues & Actions (45%) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ShopfloorIssuesActionsPanel
              issues={dashboard?.openIssues ?? []}
              actions={dashboard?.openActions ?? []}
              onNewIssue={openNewIssue}
              onNewAction={openNewAction}
            />
          </div>

          {/* Recent Events (30%) */}
          <div className="shrink-0 border-t border-border" style={{ flex: "0 0 auto", maxHeight: "30%" }}>
            <RecentEventsPanel timelineEvents={dashboard?.timelineEvents ?? []} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex h-10 items-center gap-5 border-t border-border bg-muted px-4 text-xs font-medium text-muted-foreground">
        <span>Line: {activeLine?.name ?? "—"}</span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>Shift: {dashboard?.shiftSummary?.name ?? "—"}</span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>Status: {dashboard?.liveStatus?.displayStatus ?? "—"}</span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>Updated: {dashboard?.lastUpdatedAt ? new Date(dashboard.lastUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            dashError && !dashboardData && !mockLiveShopfloorDashboard?.liveShopfloorDashboard ? "bg-danger/10 text-danger" : isLive ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}>
            {dashError && !dashboardData && !mockLiveShopfloorDashboard?.liveShopfloorDashboard ? "Error" : isLive ? "Live" : "Demo"}
          </span>
        </div>
      </div>

      {/* Modals */}
      <NewIssueModal
        isOpen={newIssueOpen} onClose={() => { setNewIssueOpen(false); setDowntimeIssuePrefill(null); }} onSave={handleNewIssueSubmit}
        saving={false} lineName={activeLine?.name ?? ""} shiftName={dashboard?.shiftSummary?.name ?? ""} sourceType="LIVE_SHOPFLOOR"
        initialTitle={downtimeIssuePrefill?.title} initialDescription={downtimeIssuePrefill?.description} />
      <NewActionModal
        isOpen={newActionOpen} onClose={() => { setNewActionOpen(false); setDowntimeActionPrefill(null); }} onSave={handleNewActionSubmit}
        saving={false} lineName={activeLine?.name ?? ""} shiftName={dashboard?.shiftSummary?.name ?? ""} sourceType="LIVE_SHOPFLOOR"
        initialTitle={downtimeActionPrefill?.title} initialDescription={downtimeActionPrefill?.description} />
      <LogShopfloorDowntimeModal
        isOpen={logDowntimeOpen} onClose={() => setLogDowntimeOpen(false)} onSave={handleLogDowntime}
        saving={logDowntimeLoading} filters={filters} lineName={activeLine?.name ?? ""} shiftName={dashboard?.shiftSummary?.name ?? ""} />
      <CloseDowntimeConfirmDialog
        isOpen={closeDowntimeId !== null} onClose={() => setCloseDowntimeId(null)} onConfirm={handleCloseDowntimeConfirm}
        saving={closeDowntimeLoading} downtimeReason={dashboard?.activeDowntime?.reason ?? ""}
        startedAt={dashboard?.activeDowntime?.startTime ?? ""} durationMinutes={dashboard?.activeDowntime?.durationMinutes ?? 0}
        affectedResourceName={dashboard?.activeDowntime?.affectedResourceName ?? null}
        affectedResourceGroupName={dashboard?.activeDowntime?.affectedResourceGroupName ?? null} />
    </div>
  );
}
