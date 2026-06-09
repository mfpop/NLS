import { useState, useCallback, useMemo } from "react";
import { Package, Plus, Save, CheckCircle, Ban, Play, Archive, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { useQuery } from "@apollo/client/react";
import { ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ControlPageShell, type RecordType } from "./ControlPageShell";
import type { SystemMessage } from "@/pages/shared/PageHeader";
import { MaterialOverview } from "./MaterialOverview";
import { useIssueSection } from "./quality-control/IssueSection";
import { useActionSection } from "./quality-control/ActionSection";
import { useAuditSection } from "./quality-control/AuditSection";
import { INSTALL_DEFAULT_MATERIAL_TEMPLATES_MUTATION } from "@/graphql/auditQueries";
import { PROBLEMS_QUERY, ACTIONS_QUERY } from "@/graphql/checkQueries";

const CONTROL_AREA = "MATERIAL";

export function MaterialControlPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"success" | "error">("success");

  const showMsg = useCallback((message: string, tone: "success" | "error" = "success") => {
    setMsgTone(tone);
    setSuccessMsg(message);
  }, []);

  // ── Hooks ──
  const issueS = useIssueSection(search, filterStatus, showMsg, CONTROL_AREA);
  const actionS = useActionSection(search, filterStatus, showMsg, CONTROL_AREA);
  const auditS = useAuditSection(search, filterStatus, "", "", showMsg, CONTROL_AREA, "MATERIAL_CONTROL", INSTALL_DEFAULT_MATERIAL_TEMPLATES_MUTATION);
  const busy = auditS.saving || issueS.creating || actionS.creating;

  // ── Overview Data ──
  const { data: problemsData } = useQuery(PROBLEMS_QUERY, { variables: { controlArea: CONTROL_AREA }, fetchPolicy: "cache-and-network" });
  const { data: actionsData } = useQuery(ACTIONS_QUERY, { variables: { controlArea: CONTROL_AREA }, fetchPolicy: "cache-and-network" });
  const problems = (problemsData as any)?.problems || [];
  const actions = (actionsData as any)?.actions || [];

  const hRefreshAll = useCallback(() => {
    setSearch("");
    setFilterStatus("");
    auditS.hRefresh();
    issueS.hRefresh();
    actionS.hRefresh();
  }, [auditS, issueS, actionS]);

  // ── Toolbar actions ──
  const renderToolbarActions = (rt: RecordType | null, resetSelection: () => void, setSelection: (id: number) => void) => {
    if (rt === "AUDITS") {
      if (auditS.creating) {
        return <><ToolbarButton icon={Save} label={busy ? "Saving..." : "Save Draft"} onClick={auditS.hCreate} disabled={busy || !auditS.canSave} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { auditS.hCancelNew(); resetSelection(); }} /></>;
      }
      if (auditS.execId && !auditS.execForm) {
        return <><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
      }
      if (auditS.execId && auditS.execForm) {
        const st = auditS.execForm.status || "";
        const canComplete = (st === "DRAFT" || st === "OPEN") && (auditS.execForm.summary?.requiredMissingCount ?? 0) === 0;
        if (auditS.editing) {
          return <><ToolbarButton icon={Save} label={busy ? "Saving..." : "Save"} onClick={auditS.hSaveEdit} disabled={busy} /><ToolbarButton icon={Ban} label="Cancel" onClick={auditS.hCancelEdit} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
        }
        if (st === "DRAFT" || st === "OPEN") {
          return <><ToolbarButton icon={Save} label={busy ? "Saving..." : "Save Draft"} onClick={auditS.hCreate} disabled={busy} /><ToolbarButton icon={Pencil} label="Edit" onClick={auditS.hStartEdit} /><ToolbarButton icon={Play} label="Complete" onClick={auditS.hComplete} disabled={busy || !canComplete} /><ToolbarButton icon={Trash2} label="Delete" onClick={() => auditS.setDeleteConfirmId(String(auditS.execId))} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
        }
        if (st === "COMPLETED") {
          return <><ToolbarButton icon={Plus} label="New Audit" onClick={() => { auditS.hNew(); setSelection(-1); }} /><ToolbarButton icon={Archive} label="Archive" onClick={() => auditS.setArchiveConfirmId(String(auditS.execId))} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
        }
        return <><ToolbarButton icon={Plus} label="New Audit" onClick={() => { auditS.hNew(); setSelection(-1); }} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
      }
      return <><ToolbarButton icon={Plus} label="New Audit" onClick={() => { auditS.hNew(); setSelection(-1); }} /></>;
    }
    if (rt === "ISSUES") {
      if (issueS.creating) {
        return <><ToolbarButton icon={CheckCircle} label="Save Problem" onClick={issueS.hCreate} disabled={!issueS.canSave} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { issueS.hCancelNew(); resetSelection(); }} /></>;
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
        return <><ToolbarButton icon={Plus} label="New Problem" onClick={() => { issueS.hNew(); setSelection(-1); }} /><ToolbarButton icon={ArrowLeft} label="Back" onClick={resetSelection} /></>;
      }
      return <><ToolbarButton icon={Plus} label="New Problem" onClick={() => { issueS.hNew(); setSelection(-1); }} /></>;
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
    return null;
  };

  // ── Unified list ──
  const TYPE_CONFIG = useMemo(() => ({
    AUDITS: { color: "bg-teal-500", border: "border-l-teal-500", hover: "hover:bg-teal-50/40 dark:hover:bg-teal-950/20", label: "Audit" },
    ISSUES: { color: "bg-amber-500", border: "border-l-amber-500", hover: "hover:bg-amber-50/40 dark:hover:bg-amber-950/20", label: "Problem" },
    ACTIONS: { color: "bg-violet-500", border: "border-l-violet-500", hover: "hover:bg-violet-50/40 dark:hover:bg-violet-950/20", label: "Action" },
  }), []);

  const ITEMS_PER_PAGE = 50;

  const renderUnifiedList = useCallback((
    onSelect: (recordType: RecordType, id: number | null) => void,
    filterRecordType?: RecordType | null,
    selectedId?: number | null,
    page?: number,
  ) => {
    const rows: { rt: RecordType; id: number; title: string; sub: string; status: string; date: string; auditor: string }[] = [];
    auditS.items.forEach((i: any) => rows.push({ rt: "AUDITS", id: i.id, title: i.title || `Audit #${i.id}`, sub: i.auditType || "", status: i.status || "", date: i.auditDate || "", auditor: i.auditor || "" }));
    issueS.items.forEach((i: any) => rows.push({ rt: "ISSUES", id: i.id, title: i.title || "Problem", sub: i.problemType || "", status: i.status || "", date: i.createdAt || i.dueDate || "", auditor: i.reportedBy || i.owner || "" }));
    actionS.items.forEach((i: any) => rows.push({ rt: "ACTIONS", id: i.id, title: i.title || "Action", sub: i.owner || "", status: i.status || "", date: i.dueDate || i.createdAt || "", auditor: i.owner || "" }));
    const filtered = filterRecordType ? rows.filter((r) => r.rt === filterRecordType) : rows;
    filtered.sort((a, b) => b.id - a.id);
    const curPage = page ?? 0;
    const paged = filtered.slice(curPage * ITEMS_PER_PAGE, (curPage + 1) * ITEMS_PER_PAGE);
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4"><span className="text-sm font-medium text-muted-foreground">Records</span><span className="ml-auto text-[10px] text-muted-foreground font-mono">{filtered.length}</span></div>
        <div className="flex-1 overflow-y-auto">
          {paged.length === 0 ? <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">No records found</div>
          : paged.map((row) => {
            const cfg = TYPE_CONFIG[row.rt as keyof typeof TYPE_CONFIG];
            return (
              <div key={`${row.rt}-${row.id}`} onClick={() => { if (row.rt === "AUDITS") auditS.setExecId(row.id); onSelect(row.rt, row.id); }}
                className={`group mx-1 my-0.5 cursor-pointer border-l-2 transition-all duration-150 ${
                  selectedId === row.id
                    ? `${cfg.border} bg-table-selected`
                    : `border-l-transparent hover:bg-table-row-hover`
                }`}>                  <div className="px-3 py-2">
                  <div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${cfg.color}`} /><span className="min-w-0 truncate text-sm font-semibold text-foreground flex-1">{row.title}</span>{row.status && <span className="text-[10px] font-medium uppercase border border-border/40 px-1 py-0.5 rounded shrink-0">{row.status}</span>}</div>
                  <div className="flex items-center gap-2 mt-0.5">{row.date && <span className="text-[10px] text-muted-foreground">{row.date}</span>}{row.auditor && <span className="text-[10px] text-muted-foreground">{row.auditor}</span>}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [auditS.items, issueS.items, actionS.items, TYPE_CONFIG]);

  const headerMsg: SystemMessage | null = useMemo(() => successMsg ? { text: successMsg, type: msgTone } : null, [successMsg, msgTone]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      <ControlPageShell
        headerMessage={headerMsg}
        onDismissHeaderMessage={() => setSuccessMsg(null)}
        controlArea={CONTROL_AREA}
        title="Material Control"
        subtitle="Monitor material flow, warehouse checks, FIFO compliance, and inventory handling."
        icon={Package}
        iconClass="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400"
        recordTypeLabels={{ ISSUES: "Problems" }}
        renderOverview={() => <MaterialOverview audits={auditS.items} problems={problems} actions={actions} auditTemplates={auditS.templates} onInstallTemplates={auditS.hInstall} />}
        renderUnifiedList={renderUnifiedList}
        toolbarSearch={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search..." />}
        toolbarFilters={(rt: RecordType | null) => {
          const opts = rt === "AUDITS"
            ? [{ value: "", label: "All" }, { value: "DRAFT", label: "Draft" }, { value: "OPEN", label: "Open" }, { value: "COMPLETED", label: "Completed" }, { value: "ARCHIVED", label: "Archived" }]
            : rt === "ISSUES"
              ? [{ value: "", label: "All" }, { value: "OPEN", label: "Open" }, { value: "IN_REVIEW", label: "In Review" }, { value: "CONTAINED", label: "Contained" }, { value: "CLOSED", label: "Closed" }, { value: "CANCELLED", label: "Cancelled" }]
              : [{ value: "", label: "All" }, { value: "OPEN", label: "Open" }, { value: "IN_PROGRESS", label: "In Progress" }, { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }];
          return <ToolbarSelect value={filterStatus} onChange={setFilterStatus} options={opts} className="w-32" />;
        }}
        onRefresh={hRefreshAll}
        onRecordTypeChange={() => {
          auditS.hCancelNew();
          issueS.resetSelection();
          actionS.resetSelection();
        }}
        toolbarActions={renderToolbarActions}
        tabs={[
          { id: "audits", label: "Audits", renderList: auditS.renderList, renderDetail: auditS.renderDetail },
          { id: "issues", label: "Problems", renderList: issueS.renderList, renderDetail: issueS.renderDetail },
          { id: "actions", label: "Actions", renderList: actionS.renderList, renderDetail: actionS.renderDetail },
        ]}
      />

      <ConfirmDialog open={!!auditS.archiveConfirmId} onClose={() => auditS.setArchiveConfirmId(null)} onConfirm={auditS.hArchive} title="Archive Audit" message="Archive this audit?" confirmLabel="Archive" danger />
      <ConfirmDialog open={!!auditS.deleteConfirmId} onClose={() => auditS.setDeleteConfirmId(null)} onConfirm={auditS.hDelete} title="Delete Audit" message="Permanently delete this audit?" confirmLabel="Delete" danger />
      <ConfirmDialog open={!!issueS.deleteConfirmId} onClose={() => issueS.setDeleteConfirmId(null)} onConfirm={issueS.hDelete} title="Delete Problem" message="Cancel this problem?" confirmLabel="Delete" danger />
      <ConfirmDialog open={!!actionS.deleteConfirmId} onClose={() => actionS.setDeleteConfirmId(null)} onConfirm={actionS.hDelete} title="Delete Action" message="Cancel this action?" confirmLabel="Delete" danger />
    </div>
  );
}
