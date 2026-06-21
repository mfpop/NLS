import { useState, useCallback, useMemo } from "react";
import { ShieldCheck, Plus, Save, CheckCircle, Ban, Play, Archive, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { ToolbarDropdown, ToolbarButton } from "@/components/shared/Toolbar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ControlPageShell, type RecordType } from "./ControlPageShell";
import { useActiveLine } from "@/hooks/useActiveLine";
import type { SystemMessage } from "@/pages/shared/PageHeader";
import { QualityOverview } from "./quality-control/QualityOverview";
import { useAuditSection } from "./quality-control/AuditSection";
import { useIssueSection } from "./quality-control/IssueSection";
import { useActionSection } from "./quality-control/ActionSection";
import { useDmrSection } from "./quality-control/DmrSection";
import { useRmaSection } from "./quality-control/RmaSection";

export function QualityManagementPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"success" | "error">("success");
  const { activePlantId, productionLineId } = useActiveLine();

  const showMsg = useCallback((message: string, tone: "success" | "error" = "success") => {
    setMsgTone(tone);
    setSuccessMsg(message);
  }, []);

  const auditS = useAuditSection(search, filterStatus, activePlantId, productionLineId, showMsg);
  const issueS = useIssueSection(search, filterStatus, showMsg);
  const actionS = useActionSection(search, filterStatus, showMsg);
  const dmrS = useDmrSection(search, filterStatus, activePlantId, productionLineId, showMsg);
  const rmaS = useRmaSection(search, filterStatus, showMsg);
  const busy = auditS.saving || issueS.creating || actionS.creating || dmrS.creating || rmaS.creating;

  const hRefreshAll = useCallback(() => {
    setSearch("");
    setFilterStatus("");
    auditS.hRefresh();
    issueS.hRefresh();
    actionS.hRefresh();
    dmrS.hRefresh();
    rmaS.hRefresh();
  }, [auditS, issueS, actionS, dmrS, rmaS]);

  const hDismissMsg = useCallback(() => setSuccessMsg(null), []);

  const headerMsg: SystemMessage | null = useMemo(() => successMsg ? { text: successMsg, type: msgTone } : null, [successMsg, msgTone]);

  // ── Toolbar actions ──
  const renderToolbarActions = (rt: RecordType | null, resetSelection: () => void, setSelection: (id: number) => void) => {
    if (rt === "AUDITS") {
      if (auditS.creating) {
        return <><ToolbarButton icon={Save} label={busy ? "Saving..." : "Save Draft"} onClick={auditS.hCreate} disabled={busy || !auditS.canSave} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { auditS.hCancelNew(); resetSelection(); }} /></>;
      }
      if (auditS.execId) {
        const selItem = auditS.items.find((i: any) => Number(i.id) === Number(auditS.execId));
        const status = selItem?.status || "";
        if (auditS.editing) {
          return <><ToolbarButton icon={Save} label={busy ? "Saving..." : "Save"} onClick={auditS.hSaveEdit} disabled={busy} /><ToolbarButton icon={Ban} label="Cancel" onClick={auditS.hCancelEdit} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
        }
        if (status === "DRAFT" || status === "OPEN") {
          return <><ToolbarButton icon={Save} label={busy ? "Saving..." : "Save Draft"} onClick={auditS.hCreate} disabled={busy} /><ToolbarButton icon={Pencil} label="Edit" onClick={auditS.hStartEdit} /><ToolbarButton icon={Play} label="Complete" onClick={auditS.hComplete} disabled={busy || !auditS.canComplete} /><ToolbarButton icon={Trash2} label="Delete" onClick={() => auditS.setDeleteConfirmId(String(auditS.execId))} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
        }
        if (status === "COMPLETED") {
          return <><ToolbarButton icon={Plus} label="New Audit" onClick={() => { auditS.hNew(); setSelection(-1); }} /><ToolbarButton icon={Archive} label="Archive" onClick={() => auditS.setArchiveConfirmId(String(auditS.execId))} /><ToolbarButton icon={Play} label="Create Findings" onClick={auditS.hCreateFindings} disabled={busy || !auditS.hCreateFindings} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
        }
        return <><ToolbarButton icon={Plus} label="New Audit" onClick={() => { auditS.hNew(); setSelection(-1); }} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
      }
      return <><ToolbarButton icon={Plus} label="New Audit" onClick={() => { auditS.hNew(); setSelection(-1); }} /></>;
    }
    if (rt === "ISSUES") {
      if (issueS.creating) {
        return <><ToolbarButton icon={CheckCircle} label="Save Issue" onClick={issueS.hCreate} disabled={!issueS.canSave} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { issueS.hCancelNew(); resetSelection(); }} /></>;
      }
      if (issueS.editing) {
        return <><ToolbarButton icon={CheckCircle} label="Update" onClick={issueS.hSaveEdit} disabled={!issueS.canSaveEdit} /><ToolbarButton icon={Ban} label="Cancel" onClick={issueS.hCancelEdit} /></>;
      }
      if (issueS.selectedId) {
        const selItem = issueS.items.find((i: any) => i.id === issueS.selectedId);
        const status = selItem?.status || "";
        const editable = status === "OPEN" || status === "IN_REVIEW";
        if (editable) {
          return <><ToolbarButton icon={Pencil} label="Edit" onClick={() => selItem && issueS.hEdit(selItem)} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => issueS.hCancelIssue(issueS.selectedId!)} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
        }
        return <><ToolbarButton icon={Plus} label="New Issue" onClick={() => { issueS.hNew(); setSelection(-1); }} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
      }
      return <><ToolbarButton icon={Plus} label="New Issue" onClick={() => { issueS.hNew(); setSelection(-1); }} /></>;
    }
    if (rt === "ACTIONS") {
      if (actionS.creating) {
        return <><ToolbarButton icon={CheckCircle} label="Save Action" onClick={actionS.hCreate} disabled={!actionS.canSave} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { actionS.hCancelNew(); resetSelection(); }} /></>;
      }
      if (actionS.editing) {
        return <><ToolbarButton icon={CheckCircle} label="Update" onClick={actionS.hSaveEdit} disabled={!actionS.canSaveEdit} /><ToolbarButton icon={Ban} label="Cancel" onClick={actionS.hCancelEdit} /></>;
      }
      if (actionS.selectedId) {
        const selItem = actionS.items.find((a: any) => a.id === actionS.selectedId);
        const status = selItem?.status || "";
        const editable = status === "OPEN" || status === "IN_PROGRESS";
        if (editable) {
          return <><ToolbarButton icon={Pencil} label="Edit" onClick={() => selItem && actionS.hEdit(selItem)} /><ToolbarButton icon={CheckCircle} label="Complete" onClick={() => actionS.hCompleteAction(actionS.selectedId!)} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => actionS.hCancelAction(actionS.selectedId!)} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
        }
        return <><ToolbarButton icon={Plus} label="New Action" onClick={() => { actionS.hNew(); setSelection(-1); }} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
      }
      return <><ToolbarButton icon={Plus} label="New Action" onClick={() => { actionS.hNew(); setSelection(-1); }} /></>;
    }
    if (rt === "DMRS") {
      if (dmrS.creating) {
        return <><ToolbarButton icon={CheckCircle} label="Save DMR" onClick={dmrS.hCreate} disabled={!dmrS.canSave} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { dmrS.hCancelNew(); resetSelection(); }} /></>;
      }
      if (dmrS.selectedId) {
        const selItem = dmrS.items.find((d: any) => d.id === dmrS.selectedId);
        const status = selItem?.status || "";
        const active = status !== "CLOSED" && status !== "CANCELLED" && status !== "DISPOSITION_APPROVED";
        if (active) {
          return <><ToolbarButton icon={CheckCircle} label="Close" onClick={dmrS.hClose} /><ToolbarButton icon={Ban} label="Cancel" onClick={dmrS.hCancel} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
        }
        return <><ToolbarButton icon={Plus} label="New DMR" onClick={() => { dmrS.hNew(); setSelection(-1); }} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
      }
      return <><ToolbarButton icon={Plus} label="New DMR" onClick={() => { dmrS.hNew(); setSelection(-1); }} /></>;
    }
    if (rt === "RMAS") {
      if (rmaS.creating) {
        return <><ToolbarButton icon={CheckCircle} label="Save RMA" onClick={rmaS.hCreate} disabled={!rmaS.canSave} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { rmaS.hCancelNew(); resetSelection(); }} /></>;
      }
      if (rmaS.selectedId) {
        const selItem = rmaS.items.find((r: any) => r.id === rmaS.selectedId);
        const status = selItem?.status || "";
        const active = status !== "CLOSED" && status !== "CANCELLED";
        if (active) {
          return <><ToolbarButton icon={CheckCircle} label="Close" onClick={rmaS.hClose} /><ToolbarButton icon={Ban} label="Cancel" onClick={rmaS.hCancel} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
        }
        return <><ToolbarButton icon={Plus} label="New RMA" onClick={() => { rmaS.hNew(); setSelection(-1); }} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
      }
      return <><ToolbarButton icon={Plus} label="New RMA" onClick={() => { rmaS.hNew(); setSelection(-1); }} /></>;
    }
    return null;
  };

  // ── Unified list (all records with type badges) ──
  const TYPE_CONFIG = useMemo(() => ({
    AUDITS: { color: "bg-blue-500", border: "border-l-blue-500", hover: "hover:bg-blue-50/40 dark:hover:bg-blue-950/20", label: "Audit", badge: "[AUDIT]" },
    ISSUES: { color: "bg-amber-500", border: "border-l-amber-500", hover: "hover:bg-amber-50/40 dark:hover:bg-amber-950/20", label: "Issue", badge: "[ISSUE]" },
    ACTIONS: { color: "bg-violet-500", border: "border-l-violet-500", hover: "hover:bg-violet-50/40 dark:hover:bg-violet-950/20", label: "Action", badge: "[ACTION]" },
    DMRS: { color: "bg-orange-500", border: "border-l-orange-500", hover: "hover:bg-orange-50/40 dark:hover:bg-orange-950/20", label: "DMR", badge: "[DMR]" },
    RMAS: { color: "bg-teal-500", border: "border-l-teal-500", hover: "hover:bg-teal-50/40 dark:hover:bg-teal-950/20", label: "RMA", badge: "[RMA]" },
    EVENTS: { color: "bg-red-500", border: "border-l-red-500", hover: "hover:bg-red-50/40 dark:hover:bg-red-950/20", label: "Event", badge: "[EVENT]" },
  }), []);

  const ITEMS_PER_PAGE = 50;

  const renderUnifiedList = useCallback((
    onSelect: (recordType: RecordType, id: number | null) => void,
    filterRecordType?: RecordType | null,
    selectedId?: number | null,
    page?: number,
  ) => {
    const rows: { rt: RecordType; id: number; title: string; sub: string; status: string; date: string; auditor: string }[] = [];

    (auditS.items || []).forEach((i: any) => rows.push({ rt: "AUDITS", id: i.id, title: `Audit #${i.id}`, sub: i.auditType || i.title || "", status: i.status || "", date: i.auditDate || "", auditor: i.auditor || "" }));
    (issueS.items || []).forEach((i: any) => rows.push({ rt: "ISSUES", id: i.id, title: i.title || "Issue", sub: i.problemType || "", status: i.status || "", date: i.createdAt || i.dueDate || "", auditor: i.reportedBy || i.owner || "" }));
    (actionS.items || []).forEach((i: any) => rows.push({ rt: "ACTIONS", id: i.id, title: i.title || "Action", sub: i.owner || "", status: i.status || "", date: i.dueDate || i.createdAt || "", auditor: i.owner || "" }));
    (dmrS.items || []).forEach((i: any) => rows.push({ rt: "DMRS", id: i.id, title: `${i.dmrNumber || ""} ${i.title || ""}`.trim(), sub: `${i.targetType || ""} ${i.quantity != null ? `Qty: ${i.quantity}` : ""}`.trim(), status: i.status || "", date: i.createdAt || "", auditor: "" }));
    (rmaS.items || []).forEach((i: any) => rows.push({ rt: "RMAS", id: i.id, title: `${i.rmaNumber || ""} ${i.customerName || ""}`.trim(), sub: `${i.partNumber || ""}${i.quantity != null ? ` Qty: ${i.quantity}` : ""}`.trim(), status: i.status || "", date: i.createdAt || "", auditor: "" }));

    const filtered = filterRecordType ? rows.filter((r) => r.rt === filterRecordType) : rows;
    filtered.sort((a, b) => b.id - a.id);
    const curPage = page ?? 0;
    const paged = filtered.slice(curPage * ITEMS_PER_PAGE, (curPage + 1) * ITEMS_PER_PAGE);

    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
          <span className="text-sm font-medium text-muted-foreground">Records</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">{filtered.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {paged.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">No records found</div>
          ) : (
            paged.map((row) => {
              const cfg = TYPE_CONFIG[row.rt];
              return (
                <div
                  key={`${row.rt}-${row.id}`}
                  onClick={() => {
                    if (row.rt === "AUDITS") auditS.setExecId(row.id);
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
                      <span className="text-[10px] font-bold text-muted-foreground w-14 shrink-0">{cfg.badge}</span>
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground flex-1">
                        {row.title}
                      </span>
                      {row.status && (
                        <span className="text-[10px] font-medium uppercase border border-border/40 px-1 py-0.5 rounded shrink-0">{row.status}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {row.date && <span className="text-[10px] text-muted-foreground">{row.date}</span>}
                      {row.auditor && <span className="text-[10px] text-muted-foreground">{row.auditor}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }, [auditS.items, issueS.items, actionS.items, dmrS.items, rmaS.items, TYPE_CONFIG]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      <ControlPageShell
        headerMessage={headerMsg}
        onDismissHeaderMessage={hDismissMsg}
        controlArea="QUALITY"
        title="Quality Management"
        subtitle="Monitor quality performance, manage audits, track issues, DMRs, RMAs, and corrective actions across production."
        icon={ShieldCheck}
        iconClass="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400"
        filterMode="dropdown"
        renderOverview={() => <QualityOverview audits={auditS.items} problems={issueS.items} actions={actionS.items} dmrs={dmrS.items} rmas={rmaS.items} auditTemplates={auditS.templates} onInstallTemplates={auditS.hInstall} />}
        renderUnifiedList={renderUnifiedList}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search quality records..."
        toolbarFilters={(rt: RecordType | null) => {
          const opts = rt === "AUDITS"
            ? [{ value: "", label: "All" }, { value: "DRAFT", label: "Draft" }, { value: "OPEN", label: "Open" }, { value: "COMPLETED", label: "Completed" }, { value: "ARCHIVED", label: "Archived" }]
            : rt === "ISSUES"
              ? [{ value: "", label: "All" }, { value: "OPEN", label: "Open" }, { value: "IN_REVIEW", label: "In Review" }, { value: "CONTAINED", label: "Contained" }, { value: "CLOSED", label: "Closed" }, { value: "CANCELLED", label: "Cancelled" }]
              : rt === "ACTIONS"
                ? [{ value: "", label: "All" }, { value: "OPEN", label: "Open" }, { value: "IN_PROGRESS", label: "In Progress" }, { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }]
                : [{ value: "", label: "All" }, { value: "OPEN", label: "Open" }, { value: "UNDER_REVIEW", label: "Under Review" }, { value: "CLOSED", label: "Closed" }, { value: "CANCELLED", label: "Cancelled" }];
          return <ToolbarDropdown value={filterStatus} onChange={setFilterStatus} className="w-32" options={opts} />;
        }}
        onRefresh={hRefreshAll}
        onRecordTypeChange={() => {
          auditS.hCancelNew();
          issueS.resetSelection();
          actionS.resetSelection();
          dmrS.resetSelection();
          rmaS.resetSelection();
        }}
        toolbarActions={renderToolbarActions}
        tabs={[
          { id: "audits", label: "Audits", renderList: auditS.renderList, renderDetail: auditS.renderDetail },
          { id: "issues", label: "Issues", renderList: issueS.renderList, renderDetail: issueS.renderDetail },
          { id: "actions", label: "Actions", renderList: actionS.renderList, renderDetail: actionS.renderDetail },
          { id: "dmrs", label: "DMRs", renderList: dmrS.renderList, renderDetail: dmrS.renderDetail },
          { id: "rmas", label: "RMAs", renderList: rmaS.renderList, renderDetail: rmaS.renderDetail },
        ]}
      />

      <ConfirmDialog
        open={!!auditS.archiveConfirmId}
        onClose={() => auditS.setArchiveConfirmId(null)}
        onConfirm={auditS.hArchive}
        title="Archive Audit"
        message="Are you sure you want to archive this audit?"
        confirmLabel="Archive"
        danger
      />
      <ConfirmDialog
        open={!!auditS.deleteConfirmId}
        onClose={() => auditS.setDeleteConfirmId(null)}
        onConfirm={auditS.hDelete}
        title="Delete Audit"
        message="Permanently delete this audit? This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

// Retain old export name for backward compatibility with lazy imports
export const QualityControlPage = QualityManagementPage;
