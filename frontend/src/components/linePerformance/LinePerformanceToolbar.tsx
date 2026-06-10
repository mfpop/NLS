import { Toolbar, ToolbarButton } from "@/components/shared/Toolbar";
import { RefreshCw, Clock, AlertCircle, ListChecks, Monitor, Workflow, Footprints, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  onRefresh: () => void;
  onLogDowntime: () => void;
  onNewIssue: () => void;
  onNewAction: () => void;
  allowRefresh?: boolean;
  allowLogDowntime?: boolean;
  allowNewIssue?: boolean;
  allowNewAction?: boolean;
  refreshing?: boolean;
}

export function LinePerformanceToolbar({
  onRefresh,
  onLogDowntime,
  onNewIssue,
  onNewAction,
  allowRefresh = true,
  allowLogDowntime = true,
  allowNewIssue = true,
  allowNewAction = true,
  refreshing = false,
}: Props) {
  const navigate = useNavigate();

  return (
    <Toolbar
      left={null}
      right={
        <>
          <ToolbarButton icon={RefreshCw} label={refreshing ? "Refreshing..." : "Refresh"} onClick={onRefresh} disabled={!allowRefresh || refreshing} title="Refresh dashboard data" />
          <span className="mx-0.5 h-5 w-px shrink-0 bg-border/30" />
          <ToolbarButton icon={Clock} label="Log Downtime" onClick={onLogDowntime} disabled={!allowLogDowntime} title="Log a downtime event" />
          <ToolbarButton icon={AlertCircle} label="New Issue" onClick={onNewIssue} disabled={!allowNewIssue} title="Create new issue" />
          <ToolbarButton icon={ListChecks} label="New Action" onClick={onNewAction} disabled={!allowNewAction} title="Create new action" />
          <span className="mx-0.5 h-5 w-px shrink-0 bg-border/30" />
          <ToolbarButton icon={Monitor} label="Live Shopfloor" onClick={() => navigate("/execution/live-shopfloor")} title="Go to Live Shopfloor" />
          <ToolbarButton icon={Workflow} label="VSM" onClick={() => navigate("/execution/vsm")} title="Go to Value Stream Map" />
          <ToolbarButton icon={Footprints} label="Gemba" onClick={() => navigate("/execution/daily-gemba-walk")} title="Go to Daily Gemba Walk" />
          <span className="mx-0.5 h-5 w-px shrink-0 bg-border/30" />
          <ToolbarButton icon={Download} label="Export" onClick={() => {}} disabled title="Export not yet available" />
        </>
      }
    />
  );
}
