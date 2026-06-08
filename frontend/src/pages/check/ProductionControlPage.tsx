import { useState, useEffect, useCallback, useMemo } from "react";
import { Activity, Plus, ArrowLeft, Save, Play, Archive, Trash2, RefreshCw, Pencil, X } from "lucide-react";
import { ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { ControlPageShell, type ControlTabConfig } from "./ControlPageShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useActiveLine } from "@/hooks/useActiveLine";
import { INSTALL_DEFAULT_PC_TEMPLATES_MUTATION } from "@/graphql/auditQueries";
import type { SystemMessage } from "@/pages/shared/PageHeader";

import { ProductionOverview } from "./ProductionOverview";
import { useProductionAuditSection } from "./ProductionAuditSection.tsx";
import { useProductionIssueSection } from "./ProductionIssueSection.tsx";
import { useProductionActionSection } from "./ProductionActionSection.tsx";
import { STATUS_STYLES, ISSUE_STATUS_STYLES, ACTION_STATUS_STYLES, statusLabel } from "./ProductionStatusStyles.tsx";
import type { RecordType } from "./ControlPageShell";

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
  const tabs: ControlTabConfig[] = useMemo(() => [
    {
      id: "audits", label: "Audits",
      renderList: auditS.renderList,
      renderDetail: auditS.renderDetail,
    },
    {
      id: "issues", label: "Issues",
      renderList: issueS.renderList,
      renderDetail: issueS.renderDetail,
    },
    {
      id: "actions", label: "Actions",
      renderList: actionS.renderList,
      renderDetail: actionS.renderDetail,
    },
  ], [auditS, issueS, actionS]);

  // ── Toolbar wiring ──
  const busy = auditS.saving || issueS.creating || actionS.creating;

  const toolbarSearchNode = useMemo(() => (
    <>
      <ToolbarSearch value={search} onChange={setSearch} placeholder="Search records..." />
      <ToolbarSelect
        value={filterStatus}
        onChange={setFilterStatus}
        options={[
          { value: "", label: "All Status" },
          { value: "DRAFT", label: "Draft" },
          { value: "OPEN", label: "Open" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />
    </>
  ), [search, filterStatus]);

  const toolbarActions = useCallback((recordType: string | null) => {
    const activeTab = recordType ? recordType.toLowerCase() : "audits";

    const auditCreatingNew = activeTab === "audits" && auditS.creating && !auditS.created;
    const auditDetail = activeTab === "audits" && !auditS.creating && auditS.execId !== null;
    const auditDashboard = activeTab === "audits" && !auditS.creating && auditS.execId === null;

    const issueCreating = activeTab === "issues" && issueS.creating && !issueS.editing;
    const issueEditing = activeTab === "issues" && issueS.editing;
    const issueDetail = activeTab === "issues" && !issueS.creating && !issueS.editing && issueS.selectedId !== null;
    const issueDashboard = activeTab === "issues" && !issueS.creating && !issueS.editing && issueS.selectedId === null;

    const actionCreating = activeTab === "actions" && actionS.creating && !actionS.editing;
    const actionEditing = activeTab === "actions" && actionS.editing;
    const actionDetail = activeTab === "actions" && !actionS.creating && !actionS.editing && actionS.selectedId !== null;
    const actionDashboard = activeTab === "actions" && !actionS.creating && !actionS.editing && actionS.selectedId === null;

    return (
      <>
        {/* ═══ AUDITS ═══ */}
        {auditCreatingNew && (
          <>
            <ToolbarButton icon={Save} label={busy ? "Saving..." : "Save Draft"} onClick={auditS.hCreate} disabled={busy || !auditS.canSave} />
            <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { auditS.hCancelNew(); }} />
          </>
        )}
        {auditDetail && (
          <>
            <ToolbarButton icon={Plus} label="New" onClick={auditS.hNew} />
            <span className="h-5 w-px shrink-0 bg-border/25" />
            {auditS.canComplete && (
              <ToolbarButton icon={Play} label={busy ? "Completing..." : "Complete"} onClick={auditS.hComplete} disabled={busy} />
            )}
            <ToolbarButton icon={Archive} label="Archive" onClick={() => auditS.setArchiveConfirmId(String(auditS.execId))} />
            <ToolbarButton icon={Trash2} label="Delete" onClick={() => auditS.setDeleteConfirmId(String(auditS.execId))} />
            <span className="h-5 w-px shrink-0 bg-border/25" />
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={auditS.hRefresh} />
            <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { auditS.hCancelNew(); }} />
          </>
        )}
        {auditDashboard && (
          <>
            <ToolbarButton icon={Plus} label="New Audit" onClick={() => { auditS.hNew(); }} />
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={auditS.hRefresh} />
          </>
        )}

        {/* ═══ ISSUES ═══ */}
        {issueCreating && (
          <>
            <ToolbarButton icon={Save} label="Save" onClick={issueS.hCreate} disabled={busy || !issueS.canSave} />
            <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { issueS.hCancelNew(); }} />
          </>
        )}
        {issueEditing && (
          <>
            <ToolbarButton icon={Save} label="Save" onClick={issueS.hSaveEdit} disabled={busy || !issueS.canSaveEdit} />
            <ToolbarButton icon={X} label="Cancel" onClick={issueS.hCancelEdit} />
          </>
        )}
        {issueDetail && (
          <>
            <ToolbarButton icon={Plus} label="New" onClick={issueS.hNew} />
            <ToolbarButton icon={Pencil} label="Edit" onClick={() => {
              const item = issueS.items.find((i: any) => i.id === issueS.selectedId);
              if (item) issueS.hEdit(item);
            }} />
            <span className="h-5 w-px shrink-0 bg-border/25" />
            <ToolbarButton icon={X} label="Close" onClick={() => { if (issueS.selectedId) issueS.hCancelIssue(issueS.selectedId); }} />
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={issueS.hRefresh} />
            <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { issueS.hCancelNew(); }} />
          </>
        )}
        {issueDashboard && (
          <>
            <ToolbarButton icon={Plus} label="New Issue" onClick={issueS.hNew} />
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={issueS.hRefresh} />
          </>
        )}

        {/* ═══ ACTIONS ═══ */}
        {actionCreating && (
          <>
            <ToolbarButton icon={Save} label="Save" onClick={actionS.hCreate} disabled={busy || !actionS.canSave} />
            <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { actionS.hCancelNew(); }} />
          </>
        )}
        {actionEditing && (
          <>
            <ToolbarButton icon={Save} label="Save" onClick={actionS.hSaveEdit} disabled={busy || !actionS.canSaveEdit} />
            <ToolbarButton icon={X} label="Cancel" onClick={actionS.hCancelEdit} />
          </>
        )}
        {actionDetail && (
          <>
            <ToolbarButton icon={Plus} label="New" onClick={actionS.hNew} />
            <ToolbarButton icon={Pencil} label="Edit" onClick={() => {
              const item = actionS.items.find((a: any) => a.id === actionS.selectedId);
              if (item) actionS.hEdit(item);
            }} />
            <span className="h-5 w-px shrink-0 bg-border/25" />
            <ToolbarButton icon={X} label="Close" onClick={() => { if (actionS.selectedId) actionS.hCancelAction(actionS.selectedId); }} />
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={actionS.hRefresh} />
            <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { actionS.hCancelNew(); }} />
          </>
        )}
        {actionDashboard && (
          <>
            <ToolbarButton icon={Plus} label="New Action" onClick={actionS.hNew} />
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={actionS.hRefresh} />
          </>
        )}
      </>
    );
  }, [auditS, issueS, actionS, busy]);

  const hRefreshAll = useCallback(() => {
    auditS.hRefresh();
    issueS.hRefresh();
    actionS.hRefresh();
  }, [auditS, issueS, actionS]);

  // ── Unified List (shows all records when no radio selected) ──
  const renderUnifiedList = useCallback((
    onSelect: (recordType: RecordType, id: number | null) => void,
    filterRecordType?: RecordType | null,
    _selectedId?: number | null,
  ) => {
    // When a radio is selected, delegate to that tab's renderList
    if (filterRecordType) {
      const tab = tabs.find((t) => t.id === filterRecordType.toLowerCase());
      if (tab) {
        return tab.renderList(null, (id) => onSelect(filterRecordType, id));
      }
      return null;
    }

    // Show all records in a unified scrollable list
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* ── Audits ── */}
        <div className="sticky top-0 z-10 flex items-center h-7 px-3 bg-amber-50/80 dark:bg-amber-950/50 border-b border-border/30">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 shrink-0 mr-2" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Audits</span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{auditS.items.length}</span>
        </div>
        {auditS.items.length === 0 ? (
          <div className="flex items-center justify-center h-10 text-[10px] text-muted-foreground border-b border-border/5">No audits</div>
        ) : (
          auditS.items.map((a: any) => (
            <div key={a.id} onClick={() => onSelect("AUDITS", Number(a.id))}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b border-border/5 hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-amber-500 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 truncate text-xs font-semibold text-foreground">{a.title || `Audit #${a.id}`}</span>
                  <span className={`shrink-0 inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${STATUS_STYLES[a.status] || ""}`}>{statusLabel(a.status || "DRAFT")}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>{a.auditType || "-"}</span>
                  {a.auditor && <><span>·</span><span>{a.auditor}</span></>}
                  {a.auditDate && <><span>·</span><span>{a.auditDate}</span></>}
                  {a.score !== null && a.score !== undefined && <><span>·</span><span className="font-mono">{a.score}%</span></>}
                </div>
              </div>
            </div>
          ))
        )}

        {/* ── Issues ── */}
        <div className="sticky top-0 z-10 flex items-center h-7 px-3 bg-blue-50/80 dark:bg-blue-950/50 border-b border-t border-border/30">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500 shrink-0 mr-2" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Issues</span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{issueS.items.length}</span>
        </div>
        {issueS.items.length === 0 ? (
          <div className="flex items-center justify-center h-10 text-[10px] text-muted-foreground border-b border-border/5">No issues</div>
        ) : (
          issueS.items.map((p: any) => (
            <div key={p.id} onClick={() => onSelect("ISSUES", p.id)}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b border-border/5 hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-blue-500 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 truncate text-xs font-semibold text-foreground">{p.title || "Issue"}</span>
                  <span className={`shrink-0 inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${ISSUE_STATUS_STYLES[p.status] || ISSUE_STATUS_STYLES.OPEN}`}>{statusLabel(p.status)}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {p.severity && <span>{p.severity}</span>}
                  {p.problemType && <><span>·</span><span>{p.problemType}</span></>}
                  {(p.reportedBy || p.owner) && <><span>·</span><span>{p.reportedBy || p.owner}</span></>}
                </div>
              </div>
            </div>
          ))
        )}

        {/* ── Actions ── */}
        <div className="sticky top-0 z-10 flex items-center h-7 px-3 bg-violet-50/80 dark:bg-violet-950/50 border-b border-t border-border/30">
          <span className="inline-block h-2 w-2 rounded-full bg-violet-500 shrink-0 mr-2" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Actions</span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{actionS.items.length}</span>
        </div>
        {actionS.items.length === 0 ? (
          <div className="flex items-center justify-center h-10 text-[10px] text-muted-foreground">No actions</div>
        ) : (
          actionS.items.map((a: any) => (
            <div key={a.id} onClick={() => onSelect("ACTIONS", a.id)}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b border-border/5 hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-violet-500 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 truncate text-xs font-semibold text-foreground">{a.title}</span>
                  <span className={`shrink-0 inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${ACTION_STATUS_STYLES[a.status] || ACTION_STATUS_STYLES.OPEN}`}>{statusLabel(a.status)}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {a.priority && <span>{a.priority}</span>}
                  {a.owner && <><span>·</span><span>{a.owner}</span></>}
                  {a.dueDate && <><span>·</span><span>{a.dueDate}</span></>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }, [auditS, issueS, actionS, tabs]);

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
