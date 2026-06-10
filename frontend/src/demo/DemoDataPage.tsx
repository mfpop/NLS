import { useCallback, useState } from "react";
import { Activity, PanelTop } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { theme } from "@/styles/themeTokens";
import { LinePerformanceRecordList } from "@/components/linePerformance/LinePerformanceRecordList";
import { LinePerformanceKpiStrip } from "@/components/linePerformance/LinePerformanceKpiStrip";
import { PlanVsActualPanel } from "@/components/linePerformance/PlanVsActualPanel";
import { OeeSignalPanel } from "@/components/linePerformance/OeeSignalPanel";
import { DowntimePanel } from "@/components/linePerformance/DowntimePanel";
import { QualitySignalPanel } from "@/components/linePerformance/QualitySignalPanel";
import { BottleneckPanel } from "@/components/linePerformance/BottleneckPanel";
import { LinkedIssuesActionsPanel } from "@/components/linePerformance/LinkedIssuesActionsPanel";
import { LinePerformanceTimeline } from "@/components/linePerformance/LinePerformanceTimeline";
import { LiveShopfloorContextPanel } from "@/components/liveShopfloor/LiveShopfloorContextPanel";
import { LiveStatusStrip } from "@/components/liveShopfloor/LiveStatusStrip";
import { LineFlowBoard } from "@/components/liveShopfloor/LineFlowBoard";
import { ActiveDowntimePanel } from "@/components/liveShopfloor/ActiveDowntimePanel";
import { ShopfloorIssuesActionsPanel } from "@/components/liveShopfloor/ShopfloorIssuesActionsPanel";
import { ResourceGroupStatusSummary } from "@/components/liveShopfloor/ResourceGroupStatusSummary";
import { ShopfloorTimeline } from "@/components/liveShopfloor/ShopfloorTimeline";
import { LiveShopfloorEventList } from "@/components/liveShopfloor/LiveShopfloorEventList";
import { LogDowntimeModal, type LogDowntimeFormData } from "@/components/linePerformance/LogDowntimeModal";
import { CloseDowntimeConfirmDialog } from "@/components/liveShopfloor/CloseDowntimeConfirmDialog";
import { LogShopfloorDowntimeModal, type LogShopfloorDowntimeFormData } from "@/components/liveShopfloor/LogShopfloorDowntimeModal";
import { NewIssueModal, type NewIssueFormData } from "@/components/shared/NewIssueModal";
import { NewActionModal, type NewActionFormData } from "@/components/shared/NewActionModal";
import {
  mockLinePerformanceDashboard,
  mockLinePerformanceRecords,
  mockLinePerformanceFilters,
} from "@/demo/linePerformanceMockData";
import {
  mockLiveShopfloorDashboard,
  mockLiveShopfloorEvents,
  mockLiveShopfloorFilters,
} from "@/demo/liveShopfloorMockData";

type View = "line-performance" | "live-shopfloor";

export function DemoDataPage() {
  const [view, setView] = useState<View>("line-performance");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [logDowntimeOpen, setLogDowntimeOpen] = useState(false);
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [newActionOpen, setNewActionOpen] = useState(false);
  const [closeDowntimeId, setCloseDowntimeId] = useState<string | null>(null);
  const [closeDowntimeSaving, setCloseDowntimeSaving] = useState(false);
  const [downtimeIssuePrefill, setDowntimeIssuePrefill] = useState<{ title: string; description: string } | null>(null);
  const [downtimeActionPrefill, setDowntimeActionPrefill] = useState<{ title: string; description: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const linePerfData = mockLinePerformanceDashboard.linePerformanceDashboard;
  const records = mockLinePerformanceRecords.linePerformanceRecords;
  const filters = mockLinePerformanceFilters.linePerformanceFilters;
  const liveData = mockLiveShopfloorDashboard.liveShopfloorDashboard;
  const events = mockLiveShopfloorEvents.liveShopfloorEvents;
  const liveFilters = mockLiveShopfloorFilters.liveShopfloorFilters;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleLogDowntime = useCallback(async (_data: LogDowntimeFormData | LogShopfloorDowntimeFormData) => {
    setLogDowntimeOpen(false);
  }, []);

  const handleNewIssueSubmit = useCallback((_data: NewIssueFormData) => {
    setNewIssueOpen(false);
    setDowntimeIssuePrefill(null);
  }, []);

  const handleCreateIssueFromDowntime = useCallback((_id: string) => {
    if (!liveData.activeDowntime) return;
    setDowntimeIssuePrefill({
      title: `Downtime: ${liveData.activeDowntime.reason}`,
      description: `Created from active downtime on ${liveData.activeDowntime.affectedResourceName ?? "the line"} (${liveData.activeDowntime.durationMinutes} min so far).`,
    });
    setNewIssueOpen(true);
  }, [liveData.activeDowntime]);

  const handleCreateActionFromDowntime = useCallback((_id: string) => {
    if (!liveData.activeDowntime) return;
    setDowntimeActionPrefill({
      title: `Follow-up: ${liveData.activeDowntime.reason}`,
      description: `Action item from active downtime on ${liveData.activeDowntime.affectedResourceName ?? "the line"} (${liveData.activeDowntime.durationMinutes} min so far).`,
    });
    setNewActionOpen(true);
  }, [liveData.activeDowntime]);

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
    setCloseDowntimeSaving(true);
    // Simulate mutation delay
    await new Promise((resolve) => setTimeout(resolve, 600));
    setCloseDowntimeId(null);
    setCloseDowntimeSaving(false);
  }, [closeDowntimeId]);

  const handleNewActionSubmit = useCallback((_data: NewActionFormData) => {
    setNewActionOpen(false);
    setDowntimeActionPrefill(null);
  }, []);

  const activeLineName = "C2-Cylinder Assembly";
  const lineShiftName = linePerfData.shift?.name ?? "";
  const liveShiftName = liveData.shiftSummary?.name ?? "";

  const footerContent = (
    <>
      <span>Line: {activeLineName}</span>
      <span className="w-1 h-1 rounded-full bg-border" />
      <span>Shift: {view === "line-performance" ? lineShiftName : liveShiftName}</span>
      <span className="w-1 h-1 rounded-full bg-border" />
      <span>Date: {linePerfData.shift?.date ?? "—"}</span>
      <span className="w-1 h-1 rounded-full bg-border" />
      <span>Last updated: {linePerfData.lastUpdatedAt ?? "—"}</span>
      <div className="ml-auto flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-success/10 text-success border border-success/20">
          Live Demo
        </span>
        <span className="text-[10px] text-muted-foreground">No backend — mock data</span>
      </div>
    </>
  );

  const linePerfLeftColumn = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/20">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Performance Snapshots</span>
        <div className="flex items-center gap-2 mt-1">
          <select className="h-7 rounded border border-border/50 bg-card px-2 text-[10px] text-foreground outline-none focus:border-accent">
            <option>All shifts</option>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Night</option>
          </select>
          <select className="h-7 rounded border border-border/50 bg-card px-2 text-[10px] text-foreground outline-none focus:border-accent">
            <option>All status</option>
            <option>Active</option>
            <option>Completed</option>
          </select>
        </div>
      </div>
      <LinePerformanceRecordList
        records={records}
        selectedId={selectedRecordId}
        onSelect={setSelectedRecordId}
        loading={false}
      />
    </div>
  );

  const liveLeftColumn = (
    <div className="flex flex-col h-full">
      <LiveShopfloorContextPanel
        lineSummary={liveData.lineSummary}
        shiftSummary={liveData.shiftSummary}
        currentProduction={liveData.currentProduction}
      />
      <div className="flex-1 border-t border-border/10 overflow-y-auto">
        <LiveShopfloorEventList
          events={events}
          selectedId={selectedEventId}
          onSelect={setSelectedEventId}
          loading={false}
        />
      </div>
    </div>
  );

  const sharedToolbar = (isPerf: boolean) => (
    <div className="flex w-full shrink-0 select-none items-center border-b border-border/30 bg-muted/80 h-10 gap-0">
      <div className="flex min-w-0 flex-[8] items-center justify-end gap-0.5">
        <button type="button" onClick={handleRefresh} className="inline-flex h-8 items-center gap-1.5 border-0 border-b-2 border-b-transparent px-2 text-xs font-medium text-foreground hover:border-b-blue-500 hover:bg-muted/50 transition-colors">
          <Activity className="h-4 w-4" />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
        <span className="mx-0.5 h-5 w-px shrink-0 bg-border/30" />
        <button type="button" onClick={() => setLogDowntimeOpen(true)} className="inline-flex h-8 items-center gap-1.5 border-0 border-b-2 border-b-transparent px-2 text-xs font-medium text-foreground hover:border-b-blue-500 hover:bg-muted/50 transition-colors">
          <span>Log Downtime</span>
        </button>
        <button type="button" onClick={() => setNewIssueOpen(true)} className="inline-flex h-8 items-center gap-1.5 border-0 border-b-2 border-b-transparent px-2 text-xs font-medium text-foreground hover:border-b-blue-500 hover:bg-muted/50 transition-colors">
          <span>New Issue</span>
        </button>
        <button type="button" onClick={() => setNewActionOpen(true)} className="inline-flex h-8 items-center gap-1.5 border-0 border-b-2 border-b-transparent px-2 text-xs font-medium text-foreground hover:border-b-blue-500 hover:bg-muted/50 transition-colors">
          <span>New Action</span>
        </button>
        <span className="mx-0.5 h-5 w-px shrink-0 bg-border/30" />
        <button type="button" onClick={() => setView(isPerf ? "live-shopfloor" : "line-performance")} className="inline-flex h-8 items-center gap-1.5 border-0 border-b-2 border-b-transparent px-2 text-xs font-medium text-foreground hover:border-b-blue-500 hover:bg-muted/50 transition-colors">
          {isPerf ? <PanelTop className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
          <span>{isPerf ? "Live Shopfloor" : "Line Perf."}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-10 py-1 bg-accent/10 border-b border-accent/20 text-[10px] text-accent font-medium">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-accent/10 text-accent border border-accent/20">
          DEMO MODE
        </span>
        <span>Using mock operational data for evaluation. No backend required.</span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setView("line-performance")}
            className={`inline-flex h-6 items-center gap-1 rounded px-2 text-[10px] font-medium transition-colors ${
              view === "line-performance" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}>
            <Activity className="h-3 w-3" /> Line Performance
          </button>
          <button type="button" onClick={() => setView("live-shopfloor")}
            className={`inline-flex h-6 items-center gap-1 rounded px-2 text-[10px] font-medium transition-colors ${
              view === "live-shopfloor" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}>
            <PanelTop className="h-3 w-3" /> Live Shopfloor
          </button>
        </div>
      </div>

      {view === "line-performance" ? (
        <AppPageLayout
          title="Line Performance"
          subtitle={`${activeLineName} · Live execution, OEE signals, downtime, quality, bottlenecks, and shift performance`}
          icon={<Activity />}
          iconClass={theme.iconBoxAmber}
          toolbar={sharedToolbar(true)}
          leftColumn={linePerfLeftColumn}
          leftColumnWidth="w-80"
          footer={footerContent}
        >
          <div className="flex flex-col gap-3 p-4 overflow-y-auto h-full">
            <LinePerformanceKpiStrip kpis={linePerfData.kpis} />
            <div className="grid grid-cols-2 gap-3">
              <PlanVsActualPanel data={linePerfData.planVsActual} />
              <OeeSignalPanel data={linePerfData.oeeSignal} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DowntimePanel summary={linePerfData.downtimeSummary} events={linePerfData.downtimeEvents} onLogDowntime={() => setLogDowntimeOpen(true)} />
              <QualitySignalPanel data={linePerfData.qualitySummary} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BottleneckPanel data={linePerfData.bottleneckSignal} />
              <LinePerformanceTimeline events={linePerfData.timelineEvents} />
            </div>
            <LinkedIssuesActionsPanel issues={linePerfData.linkedIssues} actions={linePerfData.linkedActions} onNewIssue={() => setNewIssueOpen(true)} onNewAction={() => setNewActionOpen(true)} />
          </div>
        </AppPageLayout>
      ) : (
        <AppPageLayout
          title="Live Shopfloor"
          subtitle={`${activeLineName} · Real-time line status, resources, downtime, issues, and actions`}
          icon={<PanelTop />}
          iconClass={theme.iconBoxTeal}
          toolbar={sharedToolbar(false)}
          leftColumn={liveLeftColumn}
          leftColumnWidth="w-80"
          footer={footerContent}
        >
          <div className="flex flex-col gap-3 p-4 overflow-y-auto h-full">
            <LiveStatusStrip
              liveStatus={liveData.liveStatus} activeDowntime={liveData.activeDowntime}
              bottleneckSignal={liveData.bottleneckSignal} issueCount={liveData.openIssues.length}
              actionCount={liveData.openActions.length} outputCount={liveData.currentProduction?.actualQuantity ?? null}
            />
            <ResourceGroupStatusSummary summary={liveData.resourceGroupStatusSummary} />
            <div className="grid grid-cols-2 gap-3">
              <LineFlowBoard assignedResourceGroups={liveData.assignedResourceGroups} resourceStatuses={liveData.resourceStatuses} />
              <div className="flex flex-col gap-3">
                <ActiveDowntimePanel activeDowntime={liveData.activeDowntime} recentEvents={liveData.recentDowntimeEvents} onLogDowntime={() => setLogDowntimeOpen(true)} onCloseDowntime={(id) => setCloseDowntimeId(id)} onCreateIssue={handleCreateIssueFromDowntime} onCreateAction={handleCreateActionFromDowntime} />
                <ShopfloorTimeline events={liveData.timelineEvents} />
              </div>
            </div>
            <ShopfloorIssuesActionsPanel issues={liveData.openIssues} actions={liveData.openActions} onNewIssue={() => setNewIssueOpen(true)} onNewAction={() => setNewActionOpen(true)} />
          </div>
        </AppPageLayout>
      )}

      {/* Modals */}
      <LogDowntimeModal isOpen={logDowntimeOpen && view === "line-performance"} onClose={() => setLogDowntimeOpen(false)} onSave={handleLogDowntime} saving={false} filters={filters} lineName={activeLineName} shiftName={lineShiftName} />
      <LogShopfloorDowntimeModal isOpen={logDowntimeOpen && view === "live-shopfloor"} onClose={() => setLogDowntimeOpen(false)} onSave={handleLogDowntime} saving={false} filters={liveFilters} lineName={activeLineName} shiftName={liveShiftName} />
      <CloseDowntimeConfirmDialog
        isOpen={closeDowntimeId !== null}
        onClose={() => { setCloseDowntimeId(null); setCloseDowntimeSaving(false); }}
        onConfirm={handleCloseDowntimeConfirm}
        saving={closeDowntimeSaving}
        downtimeReason={liveData.activeDowntime?.reason ?? ""}
        startedAt={liveData.activeDowntime?.startTime ?? ""}
        durationMinutes={liveData.activeDowntime?.durationMinutes ?? 0}
        affectedResourceName={liveData.activeDowntime?.affectedResourceName ?? null}
        affectedResourceGroupName={liveData.activeDowntime?.affectedResourceGroupName ?? null}
      />
      <NewIssueModal isOpen={newIssueOpen} onClose={handleCloseNewIssue} onSave={handleNewIssueSubmit} saving={false} lineName={activeLineName} shiftName={view === "line-performance" ? lineShiftName : liveShiftName} sourceType={view === "line-performance" ? "LINE_PERFORMANCE" : "LIVE_SHOPFLOOR"} initialTitle={downtimeIssuePrefill?.title} initialDescription={downtimeIssuePrefill?.description} />
      <NewActionModal isOpen={newActionOpen} onClose={handleCloseNewAction} onSave={handleNewActionSubmit} saving={false} lineName={activeLineName} shiftName={view === "line-performance" ? lineShiftName : liveShiftName} sourceType={view === "line-performance" ? "LINE_PERFORMANCE" : "LIVE_SHOPFLOOR"} initialTitle={downtimeActionPrefill?.title} initialDescription={downtimeActionPrefill?.description} />
    </div>
  );
}
