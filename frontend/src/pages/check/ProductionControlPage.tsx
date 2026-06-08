import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Activity, Plus, RefreshCw, Save, ArrowLeft, Pencil, X, Archive, Trash2, Play, ChevronDown } from "lucide-react";
import { ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { ControlPageShell, type RecordType } from "./ControlPageShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useActiveLine } from "@/hooks/useActiveLine";
import { INSTALL_DEFAULT_PC_TEMPLATES_MUTATION } from "@/graphql/auditQueries";
import type { SystemMessage } from "@/pages/shared/PageHeader";

import { ProductionOverview } from "./ProductionOverview";
import { useProductionAuditSection } from "./ProductionAuditSection.tsx";
import { useProductionIssueSection } from "./ProductionIssueSection.tsx";
import { useProductionActionSection } from "./ProductionActionSection.tsx";
import { STATUS_STYLES, ISSUE_STATUS_STYLES, ACTION_STATUS_STYLES, PRIORITY_STYLES, SEVERITY_STYLES, statusLabel, auditTypeLabel } from "./ProductionStatusStyles.tsx";

// ── Color config per record type ──
const TYPE_CONFIG: Record<string, { dot: string; accent: string; label: string }> = {
  AUDITS: { dot: "bg-blue-500", accent: "border-l-orange-500", label: "Audit" },
  ISSUES: { dot: "bg-orange-500", accent: "border-l-orange-500", label: "Issue" },
  ACTIONS: { dot: "bg-purple-500", accent: "border-l-purple-500", label: "Action" },
};

function typeColor(rt: string): string {
  return TYPE_CONFIG[rt]?.dot || "bg-gray-400";
}
function typeAccent(rt: string): string {
  return TYPE_CONFIG[rt]?.accent || "border-l-gray-400";
}
function typeLabel(rt: string): string {
  return TYPE_CONFIG[rt]?.label || rt;
}

const STATUS_STYLE_MAP: Record<string, Record<string, string>> = {
  AUDITS: STATUS_STYLES,
  ISSUES: ISSUE_STATUS_STYLES,
  ACTIONS: ACTION_STATUS_STYLES,
};

// ── Split Button ──
function SplitButton({
  label,
  defaultAction,
  options,
  onDefault,
  onOption,
  disabled,
}: {
  label: string;
  defaultAction: string;
  options: { value: string; label: string }[];
  onDefault: () => void;
  onOption: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button type="button" onClick={onDefault} disabled={disabled}
        className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-l">
        <Plus className="h-3.5 w-3.5" />
        <span>{label}</span>
      </button>
      <button type="button" onClick={() => setOpen(!open)} disabled={disabled}
        className="inline-flex h-8 w-6 items-center justify-center bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-r border-l border-amber-500">
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-0.5 w-36 rounded border border-border/40 bg-card shadow-lg py-1">
          {options.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => { setOpen(false); onOption(opt.value); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted ${opt.value === defaultAction ? "text-foreground" : "text-muted-foreground"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

  // ── Determine default New action ──
  const getDefaultNewAction = useCallback((rt: RecordType | null): string => {
    if (rt === "AUDITS") return "audit";
    if (rt === "ISSUES") return "issue";
    if (rt === "ACTIONS") return "action";
    return "audit";
  }, []);

  const splitOptions = [
    { value: "audit", label: "New Audit" },
    { value: "issue", label: "New Issue" },
    { value: "action", label: "New Action" },
  ];

  // ── Busy state ──
  const busy = auditS.saving || issueS.creating || actionS.creating;

  // ── Toolbar wiring ──
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

  // Unified New split handler
  const handleNewAction = useCallback((rt: RecordType | null, value: string) => {
    if (value === "audit") { auditS.hNew(); }
    else if (value === "issue") { issueS.hNew(); }
    else if (value === "action") { actionS.hNew(); }
  }, [auditS, issueS, actionS]);

  const handleNewDefault = useCallback((rt: RecordType | null) => {
    const def = getDefaultNewAction(rt);
    handleNewAction(rt, def);
  }, [getDefaultNewAction, handleNewAction]);

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
      const def = getDefaultNewAction("AUDITS");
      return (
        <>
          <SplitButton label={splitOptions.find((o) => o.value === def)?.label || "New"} defaultAction={def} options={splitOptions}
            onDefault={() => { setSelectedRecordType("AUDITS"); handleNewDefault("AUDITS"); }}
            onOption={(v) => { setSelectedRecordType("AUDITS"); handleNewAction("AUDITS", v); }} />
          <span className="h-5 w-px shrink-0 bg-border/25" />
          {auditS.canComplete && (
            <ToolbarButton icon={Play} label={busy ? "Completing..." : "Complete"} onClick={auditS.hComplete} disabled={busy} />
          )}
          <ToolbarButton icon={Archive} label="Archive" onClick={() => auditS.setArchiveConfirmId(String(auditS.execId))} />
          <ToolbarButton icon={Trash2} label="Delete" onClick={() => auditS.setDeleteConfirmId(String(auditS.execId))} />
          <span className="h-5 w-px shrink-0 bg-border/25" />
          <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { auditS.hCancelNew(); resetSelection(); }} />
        </>
      );
    }
    if (issueDetail) {
      const def = getDefaultNewAction("ISSUES");
      const selItem = issueS.items.find((i: any) => i.id === issueS.selectedId);
      const editable = selItem && (selItem.status === "OPEN" || selItem.status === "IN_PROGRESS");
      return (
        <>
          <SplitButton label={splitOptions.find((o) => o.value === def)?.label || "New"} defaultAction={def} options={splitOptions}
            onDefault={() => { setSelectedRecordType("ISSUES"); handleNewDefault("ISSUES"); }}
            onOption={(v) => { setSelectedRecordType("ISSUES"); handleNewAction("ISSUES", v); }} />
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
      const def = getDefaultNewAction("ACTIONS");
      const selItem = actionS.items.find((a: any) => a.id === actionS.selectedId);
      const editable = selItem && (selItem.status === "OPEN" || selItem.status === "IN_PROGRESS");
      return (
        <>
          <SplitButton label={splitOptions.find((o) => o.value === def)?.label || "New"} defaultAction={def} options={splitOptions}
            onDefault={() => { setSelectedRecordType("ACTIONS"); handleNewDefault("ACTIONS"); }}
            onOption={(v) => { setSelectedRecordType("ACTIONS"); handleNewAction("ACTIONS", v); }} />
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
      const def = getDefaultNewAction(recordType);
      return (
        <SplitButton label={splitOptions.find((o) => o.value === def)?.label || "New"} defaultAction={def} options={splitOptions}
          onDefault={() => { handleNewDefault(recordType); }}
          onOption={(v) => { handleNewAction(recordType, v); }} />
      );
    }

    return null;
  }, [auditS, issueS, actionS, busy, getDefaultNewAction, splitOptions, handleNewAction, handleNewDefault]);

  const hRefreshAll = useCallback(() => {
    auditS.hRefresh();
    issueS.hRefresh();
    actionS.hRefresh();
  }, [auditS, issueS, actionS]);

  // ── Flat unified record list ──
  const renderUnifiedList = useCallback((
    onSelect: (recordType: RecordType, id: number | null) => void,
    filterRecordType?: RecordType | null,
    selectedId?: number | null,
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
        typeLabel: auditTypeLabel(i.auditType || i.auditType || ""),
        sub: i.targetType || "",
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
        <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-3">
          <span className="text-xs font-semibold text-foreground">{headerLabel}</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">{filtered.length}</span>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-muted-foreground px-4 text-center">
              {filterRecordType ? `No ${headerLabel.toLowerCase()} found` : "No records found"}
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {filtered.map((row) => {
                const cfg = TYPE_CONFIG[row.rt];
                const stMap = STATUS_STYLE_MAP[row.rt];
                const stCls = stMap?.[row.status] || "";
                const isSelected = selectedId === row.id;

                return (
                  <div key={`${row.rt}-${row.id}`}
                    onClick={() => onSelect(row.rt, row.id)}
                    className={`group relative cursor-pointer transition-all duration-150 ${
                      isSelected ? "bg-table-selected" : "hover:bg-table-row-hover"
                    }`}
                  >
                    {/* Left accent bar */}
                    {isSelected && (
                      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${typeAccent(row.rt)}`} />
                    )}
                    <div className="px-3 py-2.5 pl-4">
                      {/* Top row: dot + title + badge */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${typeColor(row.rt)}`} />
                        <span className={`min-w-0 flex-1 truncate text-xs ${
                          isSelected ? "font-bold text-foreground" : "font-semibold text-foreground"
                        }`}>
                          {row.title}
                        </span>
                        <span className="shrink-0 inline-flex items-center px-1 py-0.5 text-[9px] font-medium border rounded-sm bg-card/50">
                          {typeLabel(row.rt)}
                        </span>
                        <span className={`shrink-0 inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${stCls}`}>
                          {statusLabel(row.status)}
                        </span>
                        {row.score !== null && row.score !== undefined && (
                          <span className={`shrink-0 inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${
                            row.score >= 80 ? "border-green-300 text-green-700 bg-green-50/60" :
                            row.score >= 60 ? "border-amber-300 text-amber-700 bg-amber-50/60" :
                            "border-red-300 text-red-700 bg-red-50/60"
                          }`}>
                            {row.score}%
                          </span>
                        )}
                      </div>
                      {/* Bottom row: metadata */}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
                        {row.typeLabel && <span className="truncate max-w-[120px]">{row.typeLabel}</span>}
                        {row.owner && <><span>·</span><span className="truncate max-w-[80px]">{row.owner}</span></>}
                        {row.date && <><span>·</span><span>{row.date}</span></>}
                        {row.sub && row.rt === "ISSUES" && !row.owner && <><span>·</span><span>{row.sub}</span></>}
                        {row.priority && (row.rt === "ACTIONS" || row.rt === "ISSUES") && (
                          <span className={`inline-flex items-center px-1 py-0.5 text-[8px] font-medium border ${
                            (row.rt === "ISSUES" ? SEVERITY_STYLES : PRIORITY_STYLES)[row.priority] || ""
                          }`}>
                            {row.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

  // ── Footer data ──
  const openIssues = useMemo(() => issueS.items.filter((i: any) => i.status === "OPEN").length, [issueS.items]);
  const openActions = useMemo(() => actionS.items.filter((a: any) => a.status === "OPEN" || a.status === "IN_PROGRESS").length, [actionS.items]);
  const activeAudits = useMemo(() => auditS.items.filter((a: any) => a.status === "DRAFT" || a.status === "OPEN").length, [auditS.items]);

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
        footerLeft={
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium text-foreground">Production Control</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">All Records</span>
          </div>
        }
        footerRight={
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>{activeAudits}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              <span>{openIssues}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>{openActions}</span>
            </span>
            <span className="text-muted-foreground/40">|</span>
            <span>Visible: {auditS.items.length + issueS.items.length + actionS.items.length}</span>
          </div>
        }
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
