import { useState, useCallback, useMemo } from "react";
import { AlertTriangle, Plus, CheckCircle, XCircle, Wrench, Pencil } from "lucide-react";
import { ToolbarButton, ToolbarDropdown } from "@/components/layout/PageToolbar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ControlPageShell, type RecordType } from "@/pages/check/ControlPageShell";
import type { SystemMessage } from "@/pages/shared/PageHeader";
import { useBreakdownSection } from "./breakdowns/BreakdownSection";
import { BreakdownOverview } from "./breakdowns/BreakdownOverview";
import { SEVERITY_OPTIONS, STATUS_OPTIONS } from "./breakdowns/BreakdownStatusStyles";

export function BreakdownsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"success" | "error">("success");

  const showMsg = useCallback((message: string, tone: "success" | "error" = "success") => {
    setMsgTone(tone);
    setSuccessMsg(message);
  }, []);

  const section = useBreakdownSection(search, filterStatus, filterSeverity, showMsg);

  const hRefreshAll = useCallback(() => {
    setSearch("");
    setFilterStatus("");
    setFilterSeverity("");
    section.refetch();
  }, [section]);

  const headerMsg: SystemMessage | null = useMemo(() =>
    successMsg ? { text: successMsg, type: msgTone } : null,
  [successMsg, msgTone]);

  // ── Toolbar Actions ──
  const renderToolbarActions = (
    _rt: RecordType | null,
    _resetSelection: () => void,
    _setSelection: (_id: number) => void,
  ) => {
    if (section.reportMode === "add" || section.reportMode === "edit") {
      return (
        <>
          <span className="text-[10px] font-medium text-warning dark:text-orange-400">
            {section.reportMode === "add" ? "Adding report" : "Editing breakdown"}
          </span>
          <span className="mx-1 h-5 w-px shrink-0 bg-border/40" />
          <ToolbarButton icon={XCircle} label="Cancel" onClick={section.cancelReport} />
        </>
      );
    }

    // No record selected — show Report + Refresh
    if (!section.selectedId) {
      return (
        <>
          <ToolbarButton icon={Plus} label="Report" onClick={section.startAddReport} title="Report new breakdown" />
        </>
      );
    }

    // Collect applicable action buttons
    const buttons: React.ReactNode[] = [];
    if (section.canEdit) buttons.push(<ToolbarButton key="edit" icon={Pencil} label="Edit" onClick={section.startEditReport} title="Edit breakdown details" />);
    if (section.canCreateWO) buttons.push(<ToolbarButton key="create-wo" icon={Wrench} label="Create WO" onClick={() => section.handleAction("create-wo")} title="Create linked work order" />);
    if (section.canResolve) buttons.push(<ToolbarButton key="resolve" icon={CheckCircle} label="Resolve" onClick={() => section.handleAction("resolve")} title="Resolve breakdown" variant="success" />);
    if (section.canClose) buttons.push(<ToolbarButton key="close" icon={CheckCircle} label="Close" onClick={() => section.handleAction("close")} title="Close breakdown" />);
    if (section.canCancel) buttons.push(<ToolbarButton key="cancel-bd" icon={XCircle} label="Cancel BD" onClick={() => section.handleAction("cancel")} title="Cancel breakdown" />);
    return <>{buttons}</>;
  };

  // ── Unified List ──
  const renderUnifiedList = useCallback((onSelect: (_rt: RecordType, _id: number) => void) => {
    return section.renderList(section.selectedId, (id: number | null) => {
      if (id !== null) {
        if (section.reportMode) section.cancelReport();
        onSelect("BREAKDOWNS" as RecordType, id);
      }
    });
  }, [section]);

  // ── Tabs ──
  const tabs = useMemo(() => [{
    id: "breakdowns",
    label: "Breakdowns",
    renderList: section.renderList,
    renderDetail: section.renderDetail,
  }], [section]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      <ControlPageShell
        controlArea="MATERIAL"
        title="Breakdowns"
        subtitle="Track equipment failures, repairs, and root cause analysis — 5 Whys"
        icon={AlertTriangle}
        iconClass="bg-warning/15 text-warning dark:bg-orange-900/40 dark:text-orange-400"
        headerMessage={headerMsg}
        onDismissHeaderMessage={() => setSuccessMsg(null)}
        tabs={tabs}
        renderOverview={() => section.reportMode === "add"
          ? section.renderInlineForm(false)
          : <BreakdownOverview breakdowns={section.items} />
        }
        renderUnifiedList={renderUnifiedList}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search breakdowns..."
        toolbarFilters={
          <>
            <ToolbarDropdown value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} className="w-32" />

            <ToolbarDropdown value={filterSeverity} onChange={setFilterSeverity} options={SEVERITY_OPTIONS} className="w-28" />

          </>
        }
        toolbarActions={renderToolbarActions}
        onRefresh={hRefreshAll}
      />

      {/* Resolve Breakdown Dialog */}
      <ConfirmDialog
        open={section.confirmAction?.action === "resolve"}
        onClose={() => { section.setConfirmAction(null); section.setResolveForm({ confirmedRootCause: "", correctiveAction: "", verificationResult: "", completionNotes: "", downtimeEnd: "" }); }}
        onConfirm={section.confirmResolve}
        title="Resolve Breakdown"
        message="Record the root cause, corrective action, and verification before closing the breakdown."
        confirmLabel="Resolve"
        danger={false}
      >
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Confirmed Root Cause *</label>
            <textarea placeholder="Identify the root cause — 5 Whys analysis..."
              value={section.resolveForm.confirmedRootCause}
              onChange={(e) => section.setResolveForm({ ...section.resolveForm, confirmedRootCause: e.target.value })}
              className="h-20 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-orange-400 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Corrective Action *</label>
            <textarea placeholder="What was done to fix the root cause?"
              value={section.resolveForm.correctiveAction}
              onChange={(e) => section.setResolveForm({ ...section.resolveForm, correctiveAction: e.target.value })}
              className="h-16 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-orange-400 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Verification / Test Result *</label>
            <input type="text" placeholder="e.g. Part runs at 95% efficiency — within spec"
              value={section.resolveForm.verificationResult}
              onChange={(e) => section.setResolveForm({ ...section.resolveForm, verificationResult: e.target.value })} aria-label="Verification result"
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-orange-400 transition-colors" />
          </div>
          {section.selBreakdown?.downtimeStart && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Downtime End *</label>
              <input type="datetime-local"
                value={section.resolveForm.downtimeEnd}
                onChange={(e) => section.setResolveForm({ ...section.resolveForm, downtimeEnd: e.target.value })} aria-label="Downtime end"
                className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-orange-400 transition-colors" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Completion Notes</label>
            <textarea placeholder="Any additional notes about the repair completion..."
              value={section.resolveForm.completionNotes}
              onChange={(e) => section.setResolveForm({ ...section.resolveForm, completionNotes: e.target.value })}
              className="h-12 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-orange-400 transition-colors" />
          </div>
        </div>
      </ConfirmDialog>

      {/* Cancel Dialog */}
      <ConfirmDialog
        open={section.confirmAction?.action === "cancel"}
        onClose={() => section.setConfirmAction(null)}
        onConfirm={() => section.handleAction("cancel")}
        title="Cancel Breakdown"
        message="Are you sure you want to cancel this breakdown record?"
        confirmLabel="Yes, Cancel"
        danger
      />

      {/* Close Dialog */}
      <ConfirmDialog
        open={section.confirmAction?.action === "close"}
        onClose={() => section.setConfirmAction(null)}
        onConfirm={section.confirmClose}
        title="Close Breakdown"
        message="Confirm closure after verification is complete. This marks the breakdown as closed."
        confirmLabel="Close Breakdown"
        danger={false}
      />

      {/* Create WO Dialog */}
      <ConfirmDialog
        open={section.woDialogOpen}
        onClose={section.closeWODialog}
        onConfirm={section.submitWO}
        title="Create Work Order from Breakdown"
        message="Pre-filled from breakdown data. Customize and confirm to create a linked work order."
        confirmLabel={section.woSubmitting ? "Creating..." : "Create Work Order"}
        danger={false}
        loading={section.woSubmitting}
      >
        {section.selBreakdown && (
          <div className="mt-3 space-y-3">
            {/* Breakdown Reference */}
            <div className="rounded-lg border border-warning/20 dark:border-orange-800/50 bg-warning/10/50 dark:bg-orange-900/10 p-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-warning dark:text-orange-400 mb-1">Source Breakdown</p>
              <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-xs">
                <span className="text-muted-foreground">Number</span>
                <span className="font-mono font-semibold text-foreground">{section.selBreakdown.number}</span>
                <span className="text-muted-foreground">Title</span>
                <span className="text-foreground">{section.selBreakdown.title}</span>
                <span className="text-muted-foreground">Target</span>
                <span className="text-foreground">{section.selBreakdown.targetType}{section.selBreakdown.targetId ? ` #${section.selBreakdown.targetId}` : ''}</span>
                <span className="text-muted-foreground">Severity</span>
                <span className="text-foreground font-semibold">{section.selBreakdown.severity}</span>
              </div>
            </div>
            {/* WO Fields */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">WO Type</label>
              <div className="h-8 flex items-center px-2.5 rounded-md border border-border bg-muted/30 text-sm text-foreground font-medium">BREAKDOWN</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Title</label>
              <div className="h-8 flex items-center px-2.5 rounded-md border border-border bg-muted/30 text-sm text-foreground">[BD#{section.selBreakdown.number}] {section.selBreakdown.title}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Priority</label>
              <div className="h-8 flex items-center px-2.5 rounded-md border border-border bg-muted/30 text-sm text-foreground font-semibold">{section.woPriority}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Requested By</label>
              <div className="h-8 flex items-center px-2.5 rounded-md border border-border bg-muted/30 text-sm text-foreground">{section.selBreakdown.reportedBy || '—'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Assigned To</label>
              <input type="text" placeholder="Technician name"
                value={section.woAssignedTo}
                onChange={(e) => section.setWoAssignedTo(e.target.value)} aria-label="Assigned technician"
                className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-orange-400 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Due Date</label>
              <div className="h-8 flex items-center px-2.5 rounded-md border border-border bg-muted/30 text-sm text-foreground">{new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)} (7 days)</div>
            </div>
            {section.selBreakdown.description && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Description</label>
                <div className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-sm text-foreground whitespace-pre-wrap">{section.selBreakdown.description}</div>
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>


    </div>
  );
}
