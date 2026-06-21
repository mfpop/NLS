import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { PanelTop } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { useActiveLine } from "@/hooks/useActiveLine";
import { theme } from "@/styles/themeTokens";
import { LIVE_SHOPFLOOR_DASHBOARD_QUERY, LIVE_SHOPFLOOR_EVENTS_QUERY, LIVE_SHOPFLOOR_FILTERS_QUERY } from "@/graphql/liveShopfloorQueries";
import { LOG_SHOPFLOOR_DOWNTIME_MUTATION, CLOSE_SHOPFLOOR_DOWNTIME_MUTATION } from "@/graphql/liveShopfloorMutations";
import { LiveShopfloorContextPanel } from "@/components/liveShopfloor/LiveShopfloorContextPanel";
import { LiveShopfloorEventList } from "@/components/liveShopfloor/LiveShopfloorEventList";
import { LiveStatusStrip } from "@/components/liveShopfloor/LiveStatusStrip";
import { LineFlowBoard } from "@/components/liveShopfloor/LineFlowBoard";
import { ActiveDowntimePanel } from "@/components/liveShopfloor/ActiveDowntimePanel";
import { ShopfloorIssuesActionsPanel } from "@/components/liveShopfloor/ShopfloorIssuesActionsPanel";
import { ShopfloorTimeline } from "@/components/liveShopfloor/ShopfloorTimeline";
import { LiveShopfloorToolbar } from "@/components/liveShopfloor/LiveShopfloorToolbar";
import { ResourceGroupStatusSummary } from "@/components/liveShopfloor/ResourceGroupStatusSummary";
import { LiveShopfloorEmptyState } from "@/components/liveShopfloor/LiveShopfloorEmptyState";
import { LiveShopfloorSkeleton } from "@/components/liveShopfloor/LiveShopfloorSkeleton";
import { LiveShopfloorErrorState } from "@/components/liveShopfloor/LiveShopfloorErrorState";
import { CloseDowntimeConfirmDialog } from "@/components/liveShopfloor/CloseDowntimeConfirmDialog";
import { LogShopfloorDowntimeModal, type LogShopfloorDowntimeFormData } from "@/components/liveShopfloor/LogShopfloorDowntimeModal";
import { NewIssueModal, type NewIssueFormData } from "@/components/shared/NewIssueModal";
import { NewActionModal, type NewActionFormData } from "@/components/shared/NewActionModal";
import type { LiveShopfloorDashboardQueryData, LiveShopfloorEventsQueryData, LiveShopfloorFiltersQueryData, MutationResponse } from "@/types/liveShopfloor";
import {
  mockLiveShopfloorDashboard,
  mockLiveShopfloorEvents,
  mockLiveShopfloorFilters,
} from "@/demo/liveShopfloorMockData";

export function LiveShopfloorPage() {
  const { productionLineId, activeLine, loading: lineLoading } = useActiveLine();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
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

  const { data: eventsData, loading: eventsLoading, refetch: refetchEvents } = useQuery<LiveShopfloorEventsQueryData>(
    LIVE_SHOPFLOOR_EVENTS_QUERY,
    {
      variables: { lineId, filters: {} },
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

  // Fall back to mock data when backend resolver is unavailable
  const dashboard = dashboardData?.liveShopfloorDashboard ?? mockLiveShopfloorDashboard.liveShopfloorDashboard;
  const events = eventsData?.liveShopfloorEvents ?? mockLiveShopfloorEvents.liveShopfloorEvents;

  // Selected event detail
  const selectedEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) ?? null : null;

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
    try {
      await Promise.all([refetchDashboard(), refetchEvents()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchDashboard, refetchEvents]);

  const handleCreateIssueFromDowntime = useCallback((_id: string) => {
    if (!dashboard?.activeDowntime) return;
    setDowntimeIssuePrefill({
      title: `Downtime: ${dashboard.activeDowntime.reason}`,
      description: `Created from active downtime on ${dashboard.activeDowntime.affectedResourceName ?? "the line"} (${dashboard.activeDowntime.durationMinutes} min so far).`,
    });
    setNewIssueOpen(true);
  }, [dashboard?.activeDowntime]);

  const handleCreateActionFromDowntime = useCallback((_id: string) => {
    if (!dashboard?.activeDowntime) return;
    setDowntimeActionPrefill({
      title: `Follow-up: ${dashboard.activeDowntime.reason}`,
      description: `Action item from active downtime on ${dashboard.activeDowntime.affectedResourceName ?? "the line"} (${dashboard.activeDowntime.durationMinutes} min so far).`,
    });
    setNewActionOpen(true);
  }, [dashboard?.activeDowntime]);

  const handleCloseNewIssue = useCallback(() => {
    setNewIssueOpen(false);
    setDowntimeIssuePrefill(null);
  }, []);

  const handleCloseNewAction = useCallback(() => {
    setNewActionOpen(false);
    setDowntimeActionPrefill(null);
  }, []);

  const handleCloseDowntimeConfirm = useCallback(async () => {
    if (!closeDowntimeId) return;
    try {
      const result = await closeDowntime({
        variables: { id: closeDowntimeId },
      });
      if (result.data?.closeShopfloorDowntime?.ok) {
        setCloseDowntimeId(null);
        handleRefresh();
      }
    } catch {
      // Error handled by Apollo
    }
  }, [closeDowntimeId, closeDowntime, handleRefresh]);

  const handleLogDowntime = useCallback(async (data: LogShopfloorDowntimeFormData) => {
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
      if (result.data?.logShopfloorDowntime?.ok) {
        setLogDowntimeOpen(false);
        handleRefresh();
      }
    } catch {
      // Error handled by Apollo
    }
  }, [lineId, logDowntime, handleRefresh]);

  const handleNewIssueSubmit = useCallback((_data: NewIssueFormData) => {
    setNewIssueOpen(false);
    setDowntimeIssuePrefill(null);
    handleRefresh();
  }, [handleRefresh]);

  const handleNewActionSubmit = useCallback((_data: NewActionFormData) => {
    setNewActionOpen(false);
    setDowntimeActionPrefill(null);
    handleRefresh();
  }, [handleRefresh]);

  const openNewIssue = useCallback(() => { if (lineId) setNewIssueOpen(true); }, [lineId]);
  const openNewAction = useCallback(() => { if (lineId) setNewActionOpen(true); }, [lineId]);

  const headerSubtitle = activeLine
    ? `${activeLine.name} · Real-time line status, resources, downtime, issues, and actions`
    : "Select a production line to view real-time shopfloor status";

  // No active line state
  if (!lineId && !lineLoading) {
    return (
      <AppPageLayout
        title="Live Shopfloor"
        subtitle="Select a production line from the sidebar to view real-time line status, resources, downtime, issues, and actions."
        icon={<PanelTop />}
        iconClass={theme.iconBoxTeal}
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <PanelTop className="h-6 w-6 text-muted-foreground" />
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
      <span>Shift: {dashboard?.shiftSummary?.name ?? "—"}</span>
      <span className="w-1 h-1 rounded-full bg-border" />
      <span>Status: {dashboard?.liveStatus?.displayStatus ?? "—"}</span>
      <span className="w-1 h-1 rounded-full bg-border" />
      <span>Last updated: {dashboard?.lastUpdatedAt ?? "—"}</span>
      <div className="ml-auto flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
          dashError ? "bg-danger/10 text-danger" : dashboard?.liveStatus ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
        }`}>
          {dashError ? "Error" : dashboard?.liveStatus ? "Live" : "Waiting"}
        </span>
      </div>
    </>
  );

  const leftColumn = (
    <div className="flex flex-col h-full">
      <LiveShopfloorContextPanel
        lineSummary={dashboard?.lineSummary ?? null}
        shiftSummary={dashboard?.shiftSummary ?? null}
        currentProduction={dashboard?.currentProduction ?? null}
      />
      <div className="flex-1 border-t border-border/10 overflow-y-auto">
        <LiveShopfloorEventList
          events={events}
          selectedId={selectedEventId}
          onSelect={setSelectedEventId}
          loading={eventsLoading}
        />
      </div>
    </div>
  );

  const rightContent = () => {
    if (dashLoading && !dashboardData) {
      return <LiveShopfloorSkeleton />;
    }

    // Backend resolver unavailable — mock data fallback handles this below.
    // Only show error state when there's no mock data to fall back to (should not happen).
    if (dashError && !dashboardData && !mockLiveShopfloorDashboard?.liveShopfloorDashboard) {
      return <LiveShopfloorErrorState onRetry={handleRefresh} />;
    }

    if (!dashboard?.liveStatus && !dashboard?.assignedResourceGroups?.length) {
      return <LiveShopfloorEmptyState />;
    }

    return (        <div className="flex flex-col gap-3 p-4 overflow-y-auto h-full">
        {/* Selected event context */}
        {selectedEvent && (
          <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border/30 bg-card/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-foreground truncate">{selectedEvent.title}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border rounded ${
                  selectedEvent.severity === 'critical' ? 'border-red-200 bg-red-50 text-red-700' :
                  selectedEvent.severity === 'high' ? 'border-orange-200 bg-orange-50 text-orange-700' :
                  selectedEvent.severity === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                  'border-gray-200 bg-gray-50 text-gray-600'
                } dark:opacity-80`}>
                  {selectedEvent.displaySeverity || selectedEvent.severity}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{selectedEvent.description}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                <span>{selectedEvent.displayType || selectedEvent.eventType}</span>
                <span>·</span>
                <span className="font-mono">{selectedEvent.timestamp}</span>
                <span>·</span>
                <span className={`inline-flex items-center px-1 py-0.5 font-medium ${
                  selectedEvent.status === 'active' ? 'text-amber-600' :
                  selectedEvent.status === 'resolved' ? 'text-green-600' :
                  'text-muted-foreground'
                }`}>
                  ● {selectedEvent.displayStatus || selectedEvent.status}
                </span>
                {selectedEvent.linkedResourceName && (
                  <><span>·</span><span>{selectedEvent.linkedResourceName}</span></>
                )}
              </div>
            </div>
          </div>
        )}
        <LiveStatusStrip
          liveStatus={dashboard?.liveStatus ?? null}
          activeDowntime={dashboard?.activeDowntime ?? null}
          bottleneckSignal={dashboard?.bottleneckSignal ?? null}
          issueCount={dashboard?.openIssues?.length ?? 0}
          actionCount={dashboard?.openActions?.length ?? 0}
          outputCount={dashboard?.currentProduction?.actualQuantity ?? null}
        />

        <ResourceGroupStatusSummary summary={dashboard?.resourceGroupStatusSummary ?? null} />

        <div className="grid grid-cols-2 gap-3">
          <LineFlowBoard
            assignedResourceGroups={dashboard?.assignedResourceGroups ?? []}
            resourceStatuses={dashboard?.resourceStatuses ?? []}
          />
          <div className="flex flex-col gap-3">
            <ActiveDowntimePanel
              activeDowntime={dashboard?.activeDowntime ?? null}
              recentEvents={dashboard?.recentDowntimeEvents ?? []}
              onLogDowntime={() => setLogDowntimeOpen(true)}
              onCloseDowntime={(id) => setCloseDowntimeId(id)}
              onCreateIssue={handleCreateIssueFromDowntime}
              onCreateAction={handleCreateActionFromDowntime}
            />
            <ShopfloorTimeline events={dashboard?.timelineEvents ?? []} />
          </div>
        </div>

        <ShopfloorIssuesActionsPanel
          issues={dashboard?.openIssues ?? []}
          actions={dashboard?.openActions ?? []}
          onNewIssue={openNewIssue}
          onNewAction={openNewAction}
        />
      </div>
    );
  };

  return (
    <AppPageLayout
      title="Live Shopfloor"
      subtitle={headerSubtitle}
      icon={<PanelTop />}
      iconClass={theme.iconBoxTeal}
      toolbar={
        <LiveShopfloorToolbar
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
        onClose={handleCloseNewIssue}
        onSave={handleNewIssueSubmit}
        saving={false}
        lineName={activeLine?.name ?? ""}
        shiftName={dashboard?.shiftSummary?.name ?? ""}
        sourceType="LIVE_SHOPFLOOR"
        initialTitle={downtimeIssuePrefill?.title}
        initialDescription={downtimeIssuePrefill?.description}
      />
      <NewActionModal
        isOpen={newActionOpen}
        onClose={handleCloseNewAction}
        onSave={handleNewActionSubmit}
        saving={false}
        lineName={activeLine?.name ?? ""}
        shiftName={dashboard?.shiftSummary?.name ?? ""}
        sourceType="LIVE_SHOPFLOOR"
        initialTitle={downtimeActionPrefill?.title}
        initialDescription={downtimeActionPrefill?.description}
      />
      <LogShopfloorDowntimeModal
        isOpen={logDowntimeOpen}
        onClose={() => setLogDowntimeOpen(false)}
        onSave={handleLogDowntime}
        saving={logDowntimeLoading}
        filters={filters}
        lineName={activeLine?.name ?? ""}
        shiftName={dashboard?.shiftSummary?.name ?? ""}
      />
      <CloseDowntimeConfirmDialog
        isOpen={closeDowntimeId !== null}
        onClose={() => setCloseDowntimeId(null)}
        onConfirm={handleCloseDowntimeConfirm}
        saving={closeDowntimeLoading}
        downtimeReason={dashboard?.activeDowntime?.reason ?? ""}
        startedAt={dashboard?.activeDowntime?.startTime ?? ""}
        durationMinutes={dashboard?.activeDowntime?.durationMinutes ?? 0}
        affectedResourceName={dashboard?.activeDowntime?.affectedResourceName ?? null}
        affectedResourceGroupName={dashboard?.activeDowntime?.affectedResourceGroupName ?? null}
      />
    </AppPageLayout>
  );
}
