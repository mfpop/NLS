import { useState, useEffect, useCallback, useMemo } from "react";
import { Activity, Plus, Save, ArrowLeft, Pencil, X, Archive, Trash2, Play, Ban, AlertTriangle } from "lucide-react";
import { ToolbarSearch, ToolbarDropdown, ToolbarButton } from "@/components/layout/PageToolbar";
import { ControlPageShell, type RecordType } from "./ControlPageShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useActiveLine } from "@/hooks/useActiveLine";
import { INSTALL_DEFAULT_PC_TEMPLATES_MUTATION } from "@/graphql/auditQueries";
import type { SystemMessage } from "@/pages/shared/PageHeader";

import { ProductionOverview } from "./ProductionOverview";
import { useProductionAuditSection } from "./ProductionAuditSection.tsx";
import { useProductionIssueSection } from "./ProductionIssueSection.tsx";
import { useProductionActionSection } from "./ProductionActionSection.tsx";
import { statusLabel, auditTypeLabel, targetTypeLabel } from "./ProductionStatusStyles.tsx";




export function ProductionControlPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"success" | "error">("success");

  const showMsg = useCallback((message: string, tone: "success" | "error" = "success") => {
    setMsgTone(tone);
    setSuccessMsg(message);
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const headerMsg = useMemo<SystemMessage | null>(() => {
    if (!successMsg) return null;
    return { text: successMsg, type: msgTone };
  }, [successMsg, msgTone]);
  const hDismissMsg = useCallback(() => setSuccessMsg(null), []);

  const { productionLineId, activePlantId } = useActiveLine();

  const targetFilter = useMemo(() => {
    if (productionLineId && productionLineId !== "all") return { targetType: "PRODUCTION_LINE" as const, targetId: Number(productionLineId) };
    if (activePlantId) return { targetType: "PLANT" as const, targetId: Number(activePlantId) };
    return null;
  }, [productionLineId, activePlantId]);

  // ── Sub-hooks ──
  const auditS = useProductionAuditSection(search, filterStatus, activePlantId, productionLineId, showMsg, "PRODUCTION", "PRODUCTION_CONTROL", INSTALL_DEFAULT_PC_TEMPLATES_MUTATION);
  const issueS = useProductionIssueSection(search, filterStatus, showMsg, targetFilter, "PRODUCTION");
  const actionS = useProductionActionSection(search, filterStatus, showMsg, targetFilter, "PRODUCTION");

  // ── Tab config ──
  const tabs = useMemo(() => [
    { id: "audits", label: "Audits", renderList: auditS.renderList, renderDetail: auditS.renderDetail },
    { id: "issues", label: "Issues", renderList: issueS.renderList, renderDetail: issueS.renderDetail },
    { id: "actions", label: "Actions", renderList: actionS.renderList, renderDetail: actionS.renderDetail },
  ], [auditS, issueS, actionS]);



  // ── Busy state (only actual async operations, not form-open state) ──
  const busy = auditS.saving;

  // ── Toolbar wiring ──
  const toolbarSearchNode = useMemo(() => (
    <ToolbarSearch value={search} onChange={setSearch} placeholder="Search records..." />
  ), [search]);

  const toolbarFilters = useCallback((rt: RecordType | null) => {
    const auditOpts = [
      { value: "", label: "All Status" },
      { value: "DRAFT", label: "Draft" },
      { value: "OPEN", label: "Open" },
      { value: "COMPLETED", label: "Completed" },
      { value: "ARCHIVED", label: "Archived" },
    ];
    const issueOpts = [
      { value: "", label: "All Status" },
      { value: "OPEN", label: "Open" },
      { value: "IN_PROGRESS", label: "In Progress" },
      { value: "RESOLVED", label: "Resolved" },
      { value: "CLOSED", label: "Closed" },
      { value: "CANCELLED", label: "Cancelled" },
    ];
    const actionOpts = [
      { value: "", label: "All Status" },
      { value: "OPEN", label: "Open" },
      { value: "IN_PROGRESS", label: "In Progress" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
    ];
    const opts = rt === "ISSUES" ? issueOpts : rt === "ACTIONS" ? actionOpts : auditOpts;
    return <ToolbarDropdown value={filterStatus} onChange={setFilterStatus} options={opts} />;
  }, [filterStatus]);

  const handleNewDefault = useCallback((rt: RecordType | null) => {
    if (rt === "AUDITS" || !rt) { auditS.hNew(); }
    else if (rt === "ISSUES") { issueS.hNew(); }
    else if (rt === "ACTIONS") { actionS.hNew(); }
  }, [auditS, issueS, actionS]);

  // ── Toolbar actions ──
  const toolbarActions = useCallback((recordType: RecordType | null, resetSelection: () => void, _setSelection: (id: number) => void, setSelectedRecordType: (rt: RecordType) => void) => {
    const isCreatingAudit = auditS.creating && !auditS.created;
    const isCreatingIssue = issueS.creating && !issueS.editing;
    const isCreatingAction = actionS.creating && !actionS.editing;
    const isEditingIssue = issueS.editing;
    const isEditingAction = actionS.editing;

    // Determine which detail is shown
    const auditDetail = !auditS.creating && auditS.execId !== null;
    const issueDetail = !issueS.creating && !issueS.editing && issueS.selectedId !== null;
    const actionDetail = !actionS.creating && !actionS.editing && actionS.selectedId !== null;
    const dashboard = !isCreatingAudit && !isCreatingIssue && !isCreatingAction && !isEditingIssue && !isEditingAction && !auditDetail && !issueDetail && !actionDetail;

    // ── Create/Edit states ──
    if (isCreatingAudit) {
      return (
        <>
          <ToolbarButton icon={Save} label={busy ? "Saving..." : "Save Draft"} onClick={auditS.hCreate} disabled={busy || !auditS.canSave} />
          <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { auditS.hCancelNew(); resetSelection(); }} />
        </>
      );
    }
    if (isCreatingIssue) {
      return (
        <>
          <ToolbarButton icon={Save} label="Save" onClick={issueS.hCreate} disabled={busy || !issueS.canSave} />
          <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { issueS.hCancelNew(); resetSelection(); }} />
        </>
      );
    }
    if (isEditingIssue) {
      return (
        <>
          <ToolbarButton icon={Save} label="Save" onClick={issueS.hSaveEdit} disabled={busy || !issueS.canSaveEdit} />
          <ToolbarButton icon={X} label="Cancel" onClick={issueS.hCancelEdit} />
        </>
      );
    }
    if (isCreatingAction) {
      return (
        <>
          <ToolbarButton icon={Save} label="Save" onClick={actionS.hCreate} disabled={busy || !actionS.canSave} />
          <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { actionS.hCancelNew(); resetSelection(); }} />
        </>
      );
    }
    if (isEditingAction) {
      return (
        <>
          <ToolbarButton icon={Save} label="Save" onClick={actionS.hSaveEdit} disabled={busy || !actionS.canSaveEdit} />
          <ToolbarButton icon={X} label="Cancel" onClick={actionS.hCancelEdit} />
        </>
      );
    }

    // ── Detail states ──
    if (auditDetail) {
      if (auditS.editing) {
        return (
          <>
            <ToolbarButton icon={Save} label={busy ? "Saving..." : "Save Edit"} onClick={auditS.hSaveEdit} disabled={busy} />
            <ToolbarButton icon={X} label="Cancel" onClick={auditS.hCancelEdit} />
            <span className="h-5 w-px shrink-0 bg-border/25" />
            <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { auditS.hCancelNew(); resetSelection(); }} />
          </>
        );
      }
      const hasFailedItems = auditS.execForm?.sections?.some((s: any) => s.questions?.some((q: any) => q.answerValue === "FAIL" || q.answerValue === "NO")) ?? false;
      const hasFindings = (auditS.execForm?.findings?.length ?? 0) > 0;
      return (
        <>
          <ToolbarButton icon={Save} label={busy ? "Saving..." : "Save Draft"} onClick={auditS.hCreate} disabled={busy} />
          <ToolbarButton icon={Plus} label="New" onClick={() => { setSelectedRecordType("AUDITS"); handleNewDefault("AUDITS"); }} />
          {auditS.canComplete && (
            <ToolbarButton icon={Play} label={busy ? "Completing..." : "Complete"} onClick={auditS.hComplete} disabled={busy} />
          )}
          <ToolbarButton icon={Pencil} label="Edit" onClick={auditS.hStartEdit} />
          {(auditS.execForm?.status === "DRAFT" || auditS.execForm?.status === "OPEN") && (
            <ToolbarButton icon={Ban} label="Cancel Audit" onClick={() => auditS.setCancelConfirmId(String(auditS.execId))} />
          )}
          {hasFailedItems && !hasFindings && (
            <ToolbarButton icon={AlertTriangle} label={busy ? "Creating..." : "Create Findings"} onClick={auditS.hCreateFindings} disabled={busy} />
          )}
          <ToolbarButton icon={Archive} label="Archive" onClick={() => auditS.setArchiveConfirmId(String(auditS.execId))} />
          <ToolbarButton icon={Trash2} label="Delete" onClick={() => auditS.setDeleteConfirmId(String(auditS.execId))} />
          <span className="h-5 w-px shrink-0 bg-border/25" />
          <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { auditS.hCancelNew(); resetSelection(); }} />
        </>
      );
    }
    if (issueDetail) {
      const selItem = issueS.items.find((i: any) => i.id === issueS.selectedId);
      const editable = selItem && (selItem.status === "OPEN" || selItem.status === "IN_PROGRESS");
      return (
        <>
          <ToolbarButton icon={Plus} label="New" onClick={() => { setSelectedRecordType("ISSUES"); handleNewDefault("ISSUES"); }} />
          {editable && (
            <>
              <ToolbarButton icon={Pencil} label="Edit" onClick={() => { if (selItem) issueS.hEdit(selItem); }} />
              <span className="h-5 w-px shrink-0 bg-border/25" />
              <ToolbarButton icon={X} label="Close" onClick={() => { if (issueS.selectedId) issueS.hCancelIssue(issueS.selectedId); }} />
            </>
          )}
          <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { issueS.hCancelNew(); resetSelection(); }} />
        </>
      );
    }
    if (actionDetail) {
      const selItem = actionS.items.find((a: any) => a.id === actionS.selectedId);
      const editable = selItem && (selItem.status === "OPEN" || selItem.status === "IN_PROGRESS");
      return (
        <>
          <ToolbarButton icon={Plus} label="New" onClick={() => { setSelectedRecordType("ACTIONS"); handleNewDefault("ACTIONS"); }} />
          {editable && (
            <>
              <ToolbarButton icon={Pencil} label="Edit" onClick={() => { if (selItem) actionS.hEdit(selItem); }} />
              <span className="h-5 w-px shrink-0 bg-border/25" />
              <ToolbarButton icon={X} label="Close" onClick={() => { if (actionS.selectedId) actionS.hCancelAction(actionS.selectedId); }} />
            </>
          )}
          <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { actionS.hCancelNew(); resetSelection(); }} />
        </>
      );
    }

    // ── Dashboard (no selected record) ──
    if (dashboard) {
      return (
        <ToolbarButton icon={Plus} label="New" onClick={() => {
          const rt = recordType || "AUDITS";
          setSelectedRecordType(rt as RecordType);
          _setSelection(-1);
          handleNewDefault(rt as RecordType);
        }} />
      );
    }

    return null;
  }, [auditS, issueS, actionS, busy, handleNewDefault]);

  const hRefreshAll = useCallback(() => {
    auditS.hRefresh();
    issueS.hRefresh();
    actionS.hRefresh();
  }, [auditS, issueS, actionS]);

  const ITEMS_PER_PAGE = 50;

  // ── Flat unified record list ──
  const renderUnifiedList = useCallback((
    onSelect: (recordType: RecordType, id: number | null) => void,
    filterRecordType?: RecordType | null,
    selectedId?: number | null,
    page?: number,
  ) => {
    // Collect all records with metadata
    const rows: {
      rt: RecordType;
      id: number;
      title: string;
      typeLabel: string;
      sub: string;
      owner: string;
      date: string;
      status: string;
      priority?: string;
      score?: number | null;
    }[] = [];

    auditS.items.forEach((i: any) => {
      rows.push({
        rt: "AUDITS", id: Number(i.id), title: i.title || `Audit #${i.id}`,
        typeLabel: auditTypeLabel(i.auditType || ""),
        sub: targetTypeLabel(i.targetType || ""),
        owner: i.auditor || "",
        date: i.auditDate || "",
        status: i.status || "DRAFT",
        score: i.score ?? null,
      });
    });

    issueS.items.forEach((i: any) => {
      rows.push({
        rt: "ISSUES", id: i.id, title: i.title || "Issue",
        typeLabel: i.problemType || "",
        sub: i.severity || "",
        owner: i.reportedBy || i.owner || "",
        date: i.dueDate || "",
        status: i.status || "OPEN",
        priority: i.severity,
      });
    });

    actionS.items.forEach((i: any) => {
      rows.push({
        rt: "ACTIONS", id: i.id, title: i.title || "Action",
        typeLabel: i.priority || "",
        sub: i.owner || "",
        owner: i.owner || "",
        date: i.dueDate || "",
        status: i.status || "OPEN",
        priority: i.priority,
      });
    });

    // Filter by type if radio selected
    const filtered = filterRecordType ? rows.filter((r) => r.rt === filterRecordType) : rows;
    // Sort: newest first by ID
    filtered.sort((a, b) => b.id - a.id);
    const curPage = page ?? 0;
    const paged = filtered.slice(curPage * ITEMS_PER_PAGE, (curPage + 1) * ITEMS_PER_PAGE);

    // Left panel header label
    const headerLabels: Record<string, string> = {
      AUDITS: "Audits",
      ISSUES: "Issues",
      ACTIONS: "Actions",
    };
    const headerLabel = filterRecordType ? headerLabels[filterRecordType] || "Records" : "All Records";

    return (
      <div className="flex flex-col min-h-0 h-full">
        {/* Header */}
        <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
          <span className="text-sm font-medium text-muted-foreground">{headerLabel}</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">{filtered.length}</span>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {paged.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">No records found</div>
          ) : (
            paged.map((row) => {
              const cfg = (() => {
                const m: Record<string, { color: string; border: string; label: string }> = {
                  AUDITS: { color: "bg-blue-500", border: "border-l-blue-500", label: "Audit" },
                  ISSUES: { color: "bg-amber-500", border: "border-l-amber-500", label: "Issue" },
                  ACTIONS: { color: "bg-violet-500", border: "border-l-violet-500", label: "Action" },
                };
                return m[row.rt];
              })();

              return (
                <div
                  key={`${row.rt}-${row.id}`}
                  onClick={() => {
                    if (row.rt === "AUDITS") { auditS.setExecId(row.id); }
                    onSelect(row.rt, row.id);
                  }}
                  className={`group mx-1 my-0.5 cursor-pointer border-l-2 transition-all duration-150 ${
                    selectedId === row.id
                      ? `${cfg.border} bg-table-selected`
                      : `border-l-transparent hover:bg-table-row-hover`
                  }`}
                >
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.color}`} />
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground flex-1">{row.title}</span>
                      {row.status && (
                        <span className="text-[10px] font-medium uppercase border border-border/40 px-1 py-0.5 rounded shrink-0">{statusLabel(row.status)}</span>
                      )}
                      {row.score !== null && row.score !== undefined && (
                        <span className={`inline-flex items-center px-1 py-0.5 text-[8px] font-medium border ${
                          row.score >= 80 ? "border-green-300 text-green-700 bg-green-50/60" :
                          row.score >= 60 ? "border-amber-300 text-amber-700 bg-amber-50/60" :
                          "border-red-300 text-red-700 bg-red-50/60"
                        }`}>{row.score}%</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {row.date && <span className="text-[10px] text-muted-foreground">{row.date}</span>}
                      {row.owner && <span className="text-[10px] text-muted-foreground">{row.owner}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }, [auditS.items, issueS.items, actionS.items]);

  // ── Overview ──
  const renderOverview = useCallback(() => (
    <ProductionOverview
      audits={auditS.items}
      problems={issueS.items}
      actions={actionS.items}
      auditTemplates={auditS.templates}
      onInstallTemplates={auditS.hInstall}
    />
  ), [auditS.items, auditS.templates, auditS.hInstall, issueS.items, actionS.items]);

  // ── Shell ──
  return (
    <>
      <ControlPageShell
        controlArea="PRODUCTION"
        title="Production Control"
        subtitle="Production control audits, issues, and actions"
        icon={Activity}
        iconClass="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
        headerMessage={headerMsg}
        onDismissHeaderMessage={hDismissMsg}
        tabs={tabs}
        renderOverview={renderOverview}
        toolbarSearch={toolbarSearchNode}
        toolbarFilters={toolbarFilters}
        toolbarActions={toolbarActions}
        renderUnifiedList={renderUnifiedList}
        onRefresh={hRefreshAll}
        onRecordTypeChange={() => {
          auditS.hCancelNew();
          issueS.hCancelNew();
          actionS.hCancelNew();
        }}
      />

      {/* Confirmations */}
      <ConfirmDialog
        open={auditS.archiveConfirmId !== null}
        onClose={() => auditS.setArchiveConfirmId(null)}
        onConfirm={auditS.hArchive}
        title="Archive Audit"
        message="Are you sure you want to archive this audit?"
      />
      <ConfirmDialog
        open={auditS.deleteConfirmId !== null}
        onClose={() => auditS.setDeleteConfirmId(null)}
        onConfirm={auditS.hDelete}
        title="Delete Audit"
        message="Are you sure you want to delete this audit?"
      />
      <ConfirmDialog
        open={auditS.cancelConfirmId !== null}
        onClose={() => auditS.setCancelConfirmId(null)}
        onConfirm={auditS.hCancelAudit}
        title="Cancel Audit"
        message="Are you sure you want to cancel this audit? This will change the status to CANCELLED."
      />
      <ConfirmDialog
        open={issueS.deleteConfirmId !== null}
        onClose={() => issueS.setDeleteConfirmId(null)}
        onConfirm={issueS.hDelete}
        title="Cancel Issue"
        message="Are you sure you want to cancel this issue?"
      />
      <ConfirmDialog
        open={actionS.deleteConfirmId !== null}
        onClose={() => actionS.setDeleteConfirmId(null)}
        onConfirm={actionS.hDelete}
        title="Cancel Action"
        message="Are you sure you want to cancel this action?"
      />
    </>
  );
}
