import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ClipboardCheck, Plus, Save, CheckCircle2, Archive, RefreshCw,
  FilePlus, Circle, CheckCircle, XCircle, Minus,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  AUDITS_QUERY, AUDIT_QUERY,
  CREATE_AUDIT_MUTATION, UPDATE_AUDIT_MUTATION,
  ADD_CHECKLIST_ITEM_MUTATION, UPDATE_CHECKLIST_ITEM_MUTATION,
  ADD_FINDING_MUTATION, CLOSE_FINDING_MUTATION,
} from "@/graphql/auditQueries";
import type {
  AuditsQueryData, AuditsQueryVars,
  AuditQueryData, AuditQueryVars,
  AuditPayload, AuditChecklistItemPayload,
  CreateAuditVars, UpdateAuditVars,
  AddChecklistItemVars, UpdateChecklistItemVars,
} from "@/types/audit";

const AUDIT_TYPES = [
  { value: "", label: "All Types" },
  { value: "FIVE_S", label: "5S Audit" },
  { value: "SAFETY", label: "Safety Audit" },
  { value: "QUALITY", label: "Quality Audit" },
  { value: "PROCESS_CHECK", label: "Process Check" },
  { value: "STANDARD_WORK_CHECK", label: "Standard Work Check" },
];

const AUDIT_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

const TARGET_TYPES = [
  { value: "", label: "All Targets" },
  { value: "PLANT", label: "Plant" },
  { value: "PRODUCTION_LINE", label: "Production Line" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "RESOURCE_GROUP", label: "Resource Group" },
  { value: "RESOURCE", label: "Resource" },
];

const CHECKLIST_RESULTS = [
  { value: "", label: "Select..." },
  { value: "PASS", label: "Pass" },
  { value: "FAIL", label: "Fail" },
  { value: "N_A", label: "N/A" },
];

const SEVERITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "DRAFT": return "bg-muted text-muted-foreground border-border/40";
    case "OPEN": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800";
    case "COMPLETED": return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800";
    case "ARCHIVED": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800";
    default: return "bg-muted text-muted-foreground border-border/40";
  }
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case "LOW": return "bg-muted text-muted-foreground border-border/40";
    case "MEDIUM": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800";
    case "HIGH": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800";
    default: return "bg-muted text-muted-foreground border-border/40";
  }
}

function resultIcon(result: string | null) {
  switch (result) {
    case "PASS": return <CheckCircle className="h-3.5 w-3.5 text-emerald-500 stroke-current" />;
    case "FAIL": return <XCircle className="h-3.5 w-3.5 text-red-500 stroke-current" />;
    case "N_A": return <Minus className="h-3.5 w-3.5 text-muted-foreground stroke-current" />;
    default: return <Circle className="h-3.5 w-3.5 text-muted-foreground/40 stroke-current" />;
  }
}

function auditTypeLabel(t: string): string {
  const m: Record<string, string> = {
    FIVE_S: "5S Audit", SAFETY: "Safety Audit", QUALITY: "Quality Audit",
    PROCESS_CHECK: "Process Check", STANDARD_WORK_CHECK: "Standard Work Check",
  };
  return m[t] || t;
}

function targetLabel(t: string): string {
  const m: Record<string, string> = {
    PLANT: "Plant", PRODUCTION_LINE: "Production Line",
    DEPARTMENT: "Department", RESOURCE_GROUP: "Resource Group", RESOURCE: "Resource",
  };
  return m[t] || t;
}

export function AuditsPage() {
  const [filterSearch, setFilterSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterAuditor, setFilterAuditor] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const auditsResult = useQuery<AuditsQueryData, AuditsQueryVars>(AUDITS_QUERY, {
    variables: {
      auditType: filterType || null,
      status: filterStatus || null,
      targetType: filterTarget || null,
      auditor: filterAuditor || null,
    },
    fetchPolicy: "cache-and-network",
  });
  const audits = auditsResult.data?.audits || [];

  const auditDetail = useQuery<AuditQueryData, AuditQueryVars>(AUDIT_QUERY, {
    variables: { id: selectedId || "" },
    skip: !selectedId,
    fetchPolicy: "cache-and-network",
  });
  const selectedAudit = auditDetail.data?.audit || null;

  const [createAudit] = useMutation<AuditPayload, CreateAuditVars>(CREATE_AUDIT_MUTATION);
  const [updateAudit] = useMutation<AuditPayload, UpdateAuditVars>(UPDATE_AUDIT_MUTATION);
  const [addChecklistItem] = useMutation<AuditChecklistItemPayload, AddChecklistItemVars>(ADD_CHECKLIST_ITEM_MUTATION);
  const [updateChecklistItem] = useMutation<AuditChecklistItemPayload, UpdateChecklistItemVars>(UPDATE_CHECKLIST_ITEM_MUTATION);
  const [addFinding] = useMutation<{ ok: boolean; finding: { id: string } | null }>(ADD_FINDING_MUTATION);
  const [closeFinding] = useMutation(CLOSE_FINDING_MUTATION);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const [editTitle, setEditTitle] = useState("");
  const [editAuditor, setEditAuditor] = useState("");
  const [editAuditDate, setEditAuditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTargetType, setEditTargetType] = useState("");
  const [editTargetId, setEditTargetId] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (selectedAudit) {
      setEditTitle(selectedAudit.title);
      setEditAuditor(selectedAudit.auditor || "");
      setEditAuditDate(selectedAudit.auditDate || "");
      setEditNotes(selectedAudit.notes || "");
      setEditTargetType(selectedAudit.targetType);
      setEditTargetId(String(selectedAudit.targetId));
      setDirty(false);
    }
  }, [selectedAudit]);

  const [newItemQuestion, setNewItemQuestion] = useState("");
  const [newItemResult, setNewItemResult] = useState("");
  const [newItemComment, setNewItemComment] = useState("");

  const [newFindingDesc, setNewFindingDesc] = useState("");
  const [newFindingSeverity, setNewFindingSeverity] = useState("MEDIUM");
  const [newFindingOwner, setNewFindingOwner] = useState("");
  const [newFindingDueDate, setNewFindingDueDate] = useState("");

  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [closeConfirmFindingId, setCloseConfirmFindingId] = useState<string | null>(null);

  const [creatingNew, setCreatingNew] = useState(false);
  const [newType, setNewType] = useState("FIVE_S");
  const [newTargetType, setNewTargetType] = useState("PLANT");
  const [newTargetId, setNewTargetId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newAuditor, setNewAuditor] = useState("");
  const [newAuditDate, setNewAuditDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const refetchAll = useCallback(() => {
    auditsResult.refetch();
  }, [auditsResult]);

  const handleSelectAudit = useCallback((id: string) => {
    setSelectedId(id);
    setCreatingNew(false);
  }, []);

  const handleCreateAudit = useCallback(async () => {
    if (!newTitle.trim() || !newTargetId.trim()) return;
    const res = await createAudit({
      variables: {
        input: {
          auditType: newType,
          targetType: newTargetType,
          targetId: Number(newTargetId),
          title: newTitle.trim(),
          auditor: newAuditor.trim() || undefined,
          auditDate: newAuditDate || null,
          notes: newNotes.trim() || undefined,
        },
      },
    });
    if (res.data?.ok && res.data.audit) {
      setSuccessMsg("Audit created");
      setCreatingNew(false);
      setSelectedId(res.data.audit.id);
      setNewTitle(""); setNewAuditor(""); setNewAuditDate(""); setNewNotes("");
      setNewTargetId("");
      refetchAll();
    }
  }, [newType, newTargetType, newTargetId, newTitle, newAuditor, newAuditDate, newNotes, createAudit, refetchAll]);

  const handleSaveAudit = useCallback(async () => {
    if (!selectedAudit || !dirty) return;
    const res = await updateAudit({
      variables: {
        id: selectedAudit.id,
        input: {
          title: editTitle !== selectedAudit.title ? editTitle : null,
          auditor: editAuditor !== (selectedAudit.auditor || "") ? editAuditor : null,
          auditDate: editAuditDate !== (selectedAudit.auditDate || "") ? (editAuditDate || null) : null,
          notes: editNotes !== (selectedAudit.notes || "") ? editNotes : null,
        },
      },
    });
    if (res.data?.ok) {
      setSuccessMsg("Audit saved");
      setDirty(false);
      auditDetail.refetch();
      refetchAll();
    }
  }, [selectedAudit, dirty, editTitle, editAuditor, editAuditDate, editNotes, updateAudit, auditDetail, refetchAll]);

  const handleCompleteAudit = useCallback(async () => {
    if (!selectedAudit) return;
    const res = await updateAudit({
      variables: {
        id: selectedAudit.id,
        input: { status: "COMPLETED" },
      },
    });
    if (res.data?.ok) {
      setSuccessMsg("Audit completed");
      auditDetail.refetch();
      refetchAll();
    }
  }, [selectedAudit, updateAudit, auditDetail, refetchAll]);

  const handleArchiveAudit = useCallback(async () => {
    if (!archiveConfirmId) return;
    const res = await updateAudit({
      variables: {
        id: archiveConfirmId,
        input: { status: "ARCHIVED" },
      },
    });
    if (res.data?.ok) {
      setSuccessMsg("Audit archived");
      setArchiveConfirmId(null);
      setSelectedId(null);
      auditDetail.refetch();
      refetchAll();
    }
  }, [archiveConfirmId, updateAudit, auditDetail, refetchAll]);

  const handleAddChecklistItem = useCallback(async () => {
    if (!selectedAudit || !newItemQuestion.trim()) return;
    const res = await addChecklistItem({
      variables: {
        auditId: selectedAudit.id,
        input: {
          question: newItemQuestion.trim(),
          result: newItemResult || null,
          comment: newItemComment,
        },
      },
    });
    if (res.data?.ok) {
      setNewItemQuestion("");
      setNewItemResult("");
      setNewItemComment("");
      auditDetail.refetch();
    }
  }, [selectedAudit, newItemQuestion, newItemResult, newItemComment, addChecklistItem, auditDetail]);

  const handleUpdateChecklistResult = useCallback(async (itemId: string, result: string) => {
    await updateChecklistItem({
      variables: { id: itemId, input: { result } },
    });
    auditDetail.refetch();
  }, [updateChecklistItem, auditDetail]);

  const handleAddFinding = useCallback(async () => {
    if (!selectedAudit || !newFindingDesc.trim()) return;
    const res = await addFinding({
      variables: {
        auditId: selectedAudit.id,
        input: {
          description: newFindingDesc.trim(),
          severity: newFindingSeverity,
          owner: newFindingOwner,
          dueDate: newFindingDueDate || null,
        },
      },
    });
    if (res.data?.ok) {
      setNewFindingDesc("");
      setNewFindingSeverity("MEDIUM");
      setNewFindingOwner("");
      setNewFindingDueDate("");
      auditDetail.refetch();
    }
  }, [selectedAudit, newFindingDesc, newFindingSeverity, newFindingOwner, newFindingDueDate, addFinding, auditDetail]);

  const handleCloseFinding = useCallback(async () => {
    if (!closeConfirmFindingId) return;
    await closeFinding({ variables: { id: closeConfirmFindingId } });
    setCloseConfirmFindingId(null);
    auditDetail.refetch();
  }, [closeConfirmFindingId, closeFinding, auditDetail]);

  const filteredList = audits.filter((a) => {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    return a.title.toLowerCase().includes(q) || (a.auditor || "").toLowerCase().includes(q);
  });

  const loading = auditsResult.loading;
  const canSave = dirty && editTitle.trim();
  const canComplete = selectedAudit && (selectedAudit.status === "DRAFT" || selectedAudit.status === "OPEN");
  const canArchive = selectedAudit && selectedAudit.status !== "ARCHIVED";

  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(Math.max(pct, 10), 50));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const inputCls = "h-8 w-full rounded border border-border/50 bg-card px-2.5 text-sm text-foreground outline-none transition-all focus:border-info/60 placeholder:text-muted-foreground/40";
  const selectCls = "h-8 w-full rounded border border-border/50 bg-card px-2 text-sm text-foreground outline-none transition-all focus:border-info/60";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const hNew = useCallback(() => { setCreatingNew(true); setSelectedId(null); }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {successMsg && (
        <div className="shrink-0 h-8 flex items-center justify-center bg-success/10 text-success text-sm font-semibold border-b border-success/20">
          {successMsg}
        </div>
      )}
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5 stroke-current" />}
        iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
        title="Audits"
        subtitle="Plan, execute, and track audits across the organization."
      />

      <div className="print-ignore">
        <Toolbar
          left={<ToolbarSearch value={filterSearch} onChange={setFilterSearch} placeholder="Search audits..." />}
          right={<>
            <ToolbarSelect value={filterType} onChange={setFilterType}
              options={AUDIT_TYPES.map((o) => ({ value: o.value, label: o.label }))}
              className="w-32" />
            <ToolbarSelect value={filterStatus} onChange={setFilterStatus}
              options={AUDIT_STATUSES.map((o) => ({ value: o.value, label: o.label }))}
              className="w-32" />
            <div className="flex-1" />
            <div className="flex items-center gap-2 shrink-0">
              <ToolbarButton icon={Plus} label="New" onClick={hNew} />
              {selectedAudit && (
                <>
                  <ToolbarButton icon={Save} label="Save" onClick={handleSaveAudit} disabled={!canSave} variant="success" />
                  <ToolbarButton icon={CheckCircle2} label="Complete" onClick={handleCompleteAudit} disabled={!canComplete} />
                  <ToolbarButton icon={Archive} label="Archive" onClick={() => setArchiveConfirmId(selectedAudit.id)} disabled={!canArchive} />
                </>
              )}
              <span className="h-5 w-px shrink-0 bg-border/25" />
              <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => { refetchAll(); auditDetail.refetch(); }} />
            </div>
          </>}
        />
      </div>

      <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
        <div className="print-ignore flex flex-col min-h-0 overflow-hidden bg-card/40 border-r border-border/20"
          style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
          <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
            <span className={`text-sm font-medium ${theme.textMuted}`}>Audits</span>
            <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{filteredList.length}</span>
          </div>
          <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`} role="listbox">
            {loading && filteredList.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
            ) : filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <p className="text-xs font-medium text-muted-foreground">No audits found</p>
                <button
                  type="button"
                  onClick={hNew}
                  className="mt-2 inline-flex h-7 items-center gap-1 bg-emerald-600/10 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400 transition-colors"
                >
                  <Plus className="h-3 w-3 stroke-current" /> New Audit
                </button>
              </div>
            ) : (
              <div>
                {filteredList.map((a) => (
                  <div
                    key={a.id}
                    role="option"
                    aria-selected={selectedId === a.id}
                    onClick={() => handleSelectAudit(a.id)}
                    className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${
                      selectedId === a.id ? "bg-table-selected border-l-2 border-l-emerald-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                        <span className="min-w-0 truncate text-sm font-semibold text-foreground">{a.title}</span>
                        <div className="flex items-center gap-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${statusBadgeClass(a.status)}`}>
                            {a.status === "COMPLETED" ? "Done" : a.status === "ARCHIVED" ? "Arch" : a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{auditTypeLabel(a.auditType)}</span>
                        <span className="text-[10px] text-muted-foreground">{"\u00B7"}</span>
                        <span className="text-xs text-muted-foreground">{targetLabel(a.targetType)}</span>
                        {a.score !== null && (
                          <>
                            <span className="text-[10px] text-muted-foreground">{"\u00B7"}</span>
                            <span className="text-xs font-mono text-muted-foreground">{a.score}%</span>
                          </>
                        )}
                        {(a.findings?.length || 0) > 0 && (
                          <>
                            <span className="text-[10px] text-muted-foreground">{"\u00B7"}</span>
                            <span className="text-xs text-muted-foreground">{a.findings.length} fnd</span>
                          </>
          )}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4">
            <span className={`text-xs ${theme.textMuted}`}>{filteredList.length} audit{filteredList.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      <div onMouseDown={handleSplitMouseDown}
        className="print-ignore flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-emerald-500/10"
        style={{ width: 2 }} />
      <div className={`print-area flex flex-col min-h-0 min-w-0 flex-1 overflow-hidden ${creatingNew || selectedAudit ? "" : "mode-enter"}`}>
        {creatingNew ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">New Audit</h3>
            <div className="space-y-3.5 max-w-lg">
              <div>
                <label className={labelCls}>Title *</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Audit title..." className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Audit Type</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className={selectCls}>
                    {AUDIT_TYPES.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Target Type</label>
                  <select value={newTargetType} onChange={(e) => setNewTargetType(e.target.value)} className={selectCls}>
                    {TARGET_TYPES.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Target ID *</label>
                  <input type="number" value={newTargetId} onChange={(e) => setNewTargetId(e.target.value)}
                    placeholder="Enter target ID..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Audit Date</label>
                  <input type="date" value={newAuditDate} onChange={(e) => setNewAuditDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Auditor</label>
                <input type="text" value={newAuditor} onChange={(e) => setNewAuditor(e.target.value)}
                  placeholder="Auditor name..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                  rows={3} className={`${inputCls} resize-none`} placeholder="Optional notes..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={handleCreateAudit}
                  disabled={!newTitle.trim() || !newTargetId.trim()}
                  className="inline-flex h-7 items-center gap-1 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <Plus className="h-3 w-3 stroke-current" /> Create
                </button>
                <button type="button" onClick={() => setCreatingNew(false)}
                  className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : !selectedAudit ? (
          <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
            <div className="text-center max-w-xs">
              <h3 className="text-sm font-semibold text-foreground mb-1.5">No audit selected</h3>
              <p className="text-xs text-muted-foreground/70 leading-relaxed mb-4">
                Select an audit from the list or create a new audit.
              </p>
              <button type="button" onClick={hNew}
                className="inline-flex h-8 items-center gap-1.5 bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                <Plus className="h-3.5 w-3.5 stroke-current" /> New Audit
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-5 space-y-6">
              {/* Detail header */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-base font-bold text-foreground">{selectedAudit.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{auditTypeLabel(selectedAudit.auditType)}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                      <span className="text-xs text-muted-foreground">{targetLabel(selectedAudit.targetType)}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${statusBadgeClass(selectedAudit.status)}`}>
                        {selectedAudit.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Score</span>
                    <span className="text-lg font-bold font-mono text-foreground">
                      {selectedAudit.score !== null ? `${selectedAudit.score}%` : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 1: Audit Details */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Audit Details</h3>
                <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 text-sm">
                  <span className="text-muted-foreground">Title</span>
                  <input type="text" value={editTitle}
                    onChange={(e) => { setEditTitle(e.target.value); setDirty(true); }}
                    className="h-7 rounded border border-border/40 bg-card px-2 text-foreground outline-none focus:border-info/60" />
                  <span className="text-muted-foreground">Audit Type</span>
                  <span className="text-foreground font-medium">{auditTypeLabel(selectedAudit.auditType)}</span>
                  <span className="text-muted-foreground">Target Type</span>
                  <select value={editTargetType}
                    onChange={(e) => { setEditTargetType(e.target.value); setDirty(true); }}
                    className="h-7 rounded border border-border/40 bg-card px-1 text-foreground outline-none focus:border-info/60">
                    {TARGET_TYPES.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <span className="text-muted-foreground">Target ID</span>
                  <input type="number" value={editTargetId}
                    onChange={(e) => { setEditTargetId(e.target.value); setDirty(true); }}
                    className="h-7 rounded border border-border/40 bg-card px-2 text-foreground outline-none focus:border-info/60" />
                  <span className="text-muted-foreground">Auditor</span>
                  <input type="text" value={editAuditor}
                    onChange={(e) => { setEditAuditor(e.target.value); setDirty(true); }}
                    className="h-7 rounded border border-border/40 bg-card px-2 text-foreground outline-none focus:border-info/60" />
                  <span className="text-muted-foreground">Audit Date</span>
                  <input type="date" value={editAuditDate}
                    onChange={(e) => { setEditAuditDate(e.target.value); setDirty(true); }}
                    className="h-7 rounded border border-border/40 bg-card px-2 text-foreground outline-none focus:border-info/60" />
                  <span className="text-muted-foreground">Status</span>
                  <span>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold border ${statusBadgeClass(selectedAudit.status)}`}>
                      {selectedAudit.status}
                    </span>
                  </span>
                  <span className="text-muted-foreground">Score</span>
                  <span className="text-foreground font-mono font-medium">
                    {selectedAudit.score !== null ? `${selectedAudit.score}%` : "N/A"}
                  </span>
                  <span className="text-muted-foreground">Notes</span>
                  <textarea value={editNotes}
                    onChange={(e) => { setEditNotes(e.target.value); setDirty(true); }}
                    rows={3}
                    className="rounded border border-border/40 bg-card px-2 py-1 text-foreground outline-none focus:border-info/60 resize-none text-sm" />
                </div>
              </div>

              {/* Section 2: Checklist */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Checklist</h3>
                {selectedAudit.checklistItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No checklist items yet.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedAudit.checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 border border-border/30 bg-card/50 px-3 py-2">
                        <div className="shrink-0">{resultIcon(item.result)}</div>
                        <span className="flex-1 text-xs text-foreground">{item.question}</span>
                        <select
                          value={item.result || ""}
                          onChange={(e) => handleUpdateChecklistResult(item.id, e.target.value)}
                          className="h-6 w-20 text-xs rounded border border-border/30 bg-card px-1 text-foreground outline-none"
                        >
                          {CHECKLIST_RESULTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {item.comment && <span className="text-xs text-muted-foreground max-w-[120px] truncate">{item.comment}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <input type="text" value={newItemQuestion}
                    onChange={(e) => setNewItemQuestion(e.target.value)}
                    placeholder="Add checklist item..."
                    className="flex-1 h-7 text-xs rounded border border-border/40 bg-card px-2 text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-info/60" />
                  <select value={newItemResult}
                    onChange={(e) => setNewItemResult(e.target.value)}
                    className="h-7 text-xs rounded border border-border/40 bg-card px-1 text-foreground outline-none">
                    {CHECKLIST_RESULTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="text" value={newItemComment}
                    onChange={(e) => setNewItemComment(e.target.value)}
                    placeholder="Comment..."
                    className="w-28 h-7 text-xs rounded border border-border/40 bg-card px-2 text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-info/60" />
                  <button type="button" onClick={handleAddChecklistItem}
                    disabled={!newItemQuestion.trim()}
                    className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-accent/10 transition-colors disabled:opacity-40">
                    <Plus className="h-3 w-3 stroke-current" />
                  </button>
                </div>
              </div>

              {/* Section 3: Findings */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Findings</h3>
                {selectedAudit.findings.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No findings recorded.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedAudit.findings.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 border border-border/30 bg-card/50 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-foreground">{f.description}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${severityBadgeClass(f.severity)}`}>
                              {f.severity}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${statusBadgeClass(f.status)}`}>
                              {f.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {f.owner && <span>Owner: {f.owner}</span>}
                            {f.dueDate && <span>Due: {f.dueDate.slice(0, 10)}</span>}
                          </div>
                        </div>
                        {f.status === "OPEN" ? (
                          <button type="button" onClick={() => setCloseConfirmFindingId(f.id)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-colors shrink-0">
                            <CheckCircle className="h-3 w-3 stroke-current" />
                            Close
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground shrink-0">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <input type="text" value={newFindingDesc}
                    onChange={(e) => setNewFindingDesc(e.target.value)}
                    placeholder="Finding description..."
                    className="flex-1 min-w-[140px] h-7 text-xs rounded border border-border/40 bg-card px-2 text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-info/60" />
                  <select value={newFindingSeverity}
                    onChange={(e) => setNewFindingSeverity(e.target.value)}
                    className="h-7 text-xs rounded border border-border/40 bg-card px-1 text-foreground outline-none">
                    {SEVERITIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="text" value={newFindingOwner}
                    onChange={(e) => setNewFindingOwner(e.target.value)}
                    placeholder="Owner..."
                    className="w-20 h-7 text-xs rounded border border-border/40 bg-card px-2 text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-info/60" />
                  <input type="date" value={newFindingDueDate}
                    onChange={(e) => setNewFindingDueDate(e.target.value)}
                    className="h-7 text-xs rounded border border-border/40 bg-card px-2 text-foreground outline-none focus:border-info/60" />
                  <button type="button" onClick={handleAddFinding}
                    disabled={!newFindingDesc.trim()}
                    className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-accent/10 transition-colors disabled:opacity-40">
                    <Plus className="h-3 w-3 stroke-current" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Footer */}
      <div className="print-ignore shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
        <span>Audits</span>
        <span className="flex-1" />
        {selectedAudit && (
          <>
            <span>Created: {selectedAudit.createdAt?.slice(0, 10) || "—"}</span>
            <span>Updated: {selectedAudit.updatedAt?.slice(0, 10) || "—"}</span>
          </>
        )}
      </div>

      <ConfirmDialog
        open={archiveConfirmId !== null}
        onClose={() => setArchiveConfirmId(null)}
        onConfirm={handleArchiveAudit}
        title="Archive Audit"
        message="Are you sure you want to archive this audit? This action cannot be undone."
        confirmLabel="Archive"
        danger={true}
      />

      <ConfirmDialog
        open={closeConfirmFindingId !== null}
        onClose={() => setCloseConfirmFindingId(null)}
        onConfirm={handleCloseFinding}
        title="Close Finding"
        message="Are you sure you want to close this finding?"
        confirmLabel="Close"
        danger={false}
      />
    </div>
  );
}
