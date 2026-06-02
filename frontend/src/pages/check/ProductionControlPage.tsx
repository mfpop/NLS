import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Activity, Plus, RefreshCw, X,
  CheckCircle, XCircle, Minus, Circle, Play,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PRODUCTION_CHECKS_QUERY, PRODUCTION_CHECK_QUERY } from "@/graphql/checkQueries";
import {
  CREATE_PRODUCTION_CHECK_MUTATION,
  UPDATE_PRODUCTION_CHECK_MUTATION,
  ADD_PRODUCTION_CHECKLIST_ITEM_MUTATION,
  UPDATE_PRODUCTION_CHECKLIST_ITEM_MUTATION,
  COMPLETE_PRODUCTION_CHECK_MUTATION,
} from "@/graphql/checkMutations";

const CHECK_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "FIVE_S", label: "5S" },
  { value: "PROCESS_CHECK", label: "Process Check" },
  { value: "STANDARD_WORK_CHECK", label: "Standard Work Check" },
  { value: "TOOL_CONDITION_CHECK", label: "Tool Condition Check" },
  { value: "LINE_COMPLIANCE_CHECK", label: "Line Compliance Check" },
];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border/40",
  COMPLETED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
};

const CHECKLIST_RESULT_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "PASS", label: "Pass" },
  { value: "FAIL", label: "Fail" },
  { value: "N_A", label: "N/A" },
];

function statusLabel(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function resultIcon(result: string | null) {
  switch (result) {
    case "PASS": return <CheckCircle className="h-3.5 w-3.5 text-green-500 stroke-current" />;
    case "FAIL": return <XCircle className="h-3.5 w-3.5 text-red-500 stroke-current" />;
    case "N_A": return <Minus className="h-3.5 w-3.5 text-muted-foreground stroke-current" />;
    default: return <Circle className="h-3.5 w-3.5 text-muted-foreground/40 stroke-current" />;
  }
}

interface ChecklistItemNode {
  id: number; productionCheckId: number; question: string;
  result: string | null; comment: string; createdAt: string; updatedAt: string;
}
interface ProductionCheckNode {
  id: number; checkType: string; targetType: string; targetId: number | null;
  title: string; checkedBy: string; checkDate: string | null;
  status: string; score: number | null; notes: string;
  checklistItems: ChecklistItemNode[];
  createdAt: string; updatedAt: string;
}

export function ProductionControlPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [mode, setMode] = useState<"view" | "create">("view");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCheckType, setNewCheckType] = useState("FIVE_S");
  const [newTargetType, setNewTargetType] = useState("PLANT");
  const [newTargetId, setNewTargetId] = useState("");
  const [newCheckedBy, setNewCheckedBy] = useState("");
  const [newCheckDate, setNewCheckDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const [newItemQuestion, setNewItemQuestion] = useState("");
  const [newItemComment, setNewItemComment] = useState("");

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

  useEffect(() => {
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(null), 5000); return () => clearTimeout(t); }
  }, [successMsg]);

  const { data, loading, refetch } = useQuery<{ productionChecks: ProductionCheckNode[] }>(PRODUCTION_CHECKS_QUERY, {
    variables: { checkType: filterType || undefined, search: search || undefined },
    fetchPolicy: "cache-and-network",
  });
  const checks: ProductionCheckNode[] = data?.productionChecks || [];

  const { data: detailData } = useQuery<{ productionCheck: ProductionCheckNode }>(PRODUCTION_CHECK_QUERY, {
    variables: { id: selectedId! },
    skip: !selectedId || mode === "create",
    fetchPolicy: "cache-and-network",
  });
  const sel = detailData?.productionCheck || (selectedId ? checks.find((c) => c.id === selectedId) ?? null : null);

  useEffect(() => {
    if (checks.length === 0) return;
    if (selectedId && checks.some((c) => c.id === selectedId)) return;
    if (!initialLoad) return;
    setInitialLoad(false);
    setSelectedId(checks[0].id);
  }, [checks, selectedId, initialLoad]);

  const [createCheck] = useMutation(CREATE_PRODUCTION_CHECK_MUTATION);
  const [addChecklistItem] = useMutation(ADD_PRODUCTION_CHECKLIST_ITEM_MUTATION);
  const [updateChecklistItem] = useMutation(UPDATE_PRODUCTION_CHECKLIST_ITEM_MUTATION);
  const [completeCheck] = useMutation(COMPLETE_PRODUCTION_CHECK_MUTATION);

  const hNew = useCallback(() => {
    setMode("create"); setSelectedId(null);
    setNewTitle(""); setNewCheckType("FIVE_S"); setNewTargetType("PLANT");
    setNewTargetId(""); setNewCheckedBy(""); setNewCheckDate(""); setNewNotes("");
  }, []);

  const hCancel = useCallback(() => { setMode("view"); }, []);

  const hCreate = useCallback(async () => {
    if (!newTitle.trim() || !newTargetId.trim()) return;
    setMutationError(null);
    const r = await createCheck({ variables: {
      title: newTitle.trim(), checkType: newCheckType,
      targetType: newTargetType, targetId: parseInt(newTargetId),
      checkedBy: newCheckedBy || null, checkDate: newCheckDate || null, notes: newNotes,
    } });
    if (r.error) { setMutationError(r.error.message || "Create failed"); return; }
    setSuccessMsg("Production check created"); setMode("view"); refetch();
  }, [newTitle, newCheckType, newTargetType, newTargetId, newCheckedBy, newCheckDate, newNotes, createCheck, refetch]);

  const hAddChecklistItem = useCallback(async () => {
    if (!sel || !newItemQuestion.trim()) return;
    await addChecklistItem({ variables: { checkId: sel.id, question: newItemQuestion.trim() } });
    setNewItemQuestion(""); setNewItemComment(""); refetch();
  }, [sel, newItemQuestion, newItemComment, addChecklistItem, refetch]);

  const hUpdateChecklistResult = useCallback(async (itemId: number, result: string) => {
    await updateChecklistItem({ variables: { id: itemId, result: result || null, comment: "" } });
    refetch();
  }, [updateChecklistItem, refetch]);

  const hComplete = useCallback(async () => {
    if (!sel) return;
    const r = await completeCheck({ variables: { id: sel.id } });
    if (r.error) { setMutationError(r.error.message || "Complete failed"); return; }
    setSuccessMsg("Production check completed"); refetch();
  }, [sel, completeCheck, refetch]);

  const iCls = "h-8 w-full rounded border border-border/50 bg-card px-2.5 text-sm text-foreground outline-none transition-all focus:border-info/60 placeholder:text-muted-foreground/40";
  const sCls = "h-8 w-full rounded border border-border/50 bg-card px-2 text-sm text-foreground outline-none transition-all focus:border-info/60";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const renderCreateForm = () => (
    <div className="flex-1 min-h-0 overflow-y-auto p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">New Production Check</h3>
      {mutationError && <p className={`text-xs font-medium ${theme.textCritical} mb-3`}>{mutationError}</p>}
      <div className="space-y-3.5 max-w-lg">
        <div><label className={labelCls}>Title *</label>
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Check title..." className={iCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Check Type</label>
            <select value={newCheckType} onChange={(e) => setNewCheckType(e.target.value)} className={sCls}>
              {CHECK_TYPE_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select></div>
          <div><label className={labelCls}>Target Type</label>
            <select value={newTargetType} onChange={(e) => setNewTargetType(e.target.value)} className={sCls}>
              <option value="PLANT">Plant</option><option value="PRODUCTION_LINE">Production Line</option>
              <option value="DEPARTMENT">Department</option><option value="RESOURCE_GROUP">Resource Group</option>
              <option value="RESOURCE">Resource</option>
            </select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Target ID *</label>
            <input type="number" value={newTargetId} onChange={(e) => setNewTargetId(e.target.value)} placeholder="Enter ID..." className={iCls} /></div>
          <div><label className={labelCls}>Check Date</label>
            <input type="date" value={newCheckDate} onChange={(e) => setNewCheckDate(e.target.value)} className={iCls} /></div>
        </div>
        <div><label className={labelCls}>Checked By</label>
          <input type="text" value={newCheckedBy} onChange={(e) => setNewCheckedBy(e.target.value)} placeholder="Inspector name..." className={iCls} /></div>
        <div><label className={labelCls}>Notes</label>
          <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} className={`${iCls} resize-none`} /></div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={hCreate} disabled={!newTitle.trim() || !newTargetId.trim()}
            className="inline-flex h-7 items-center gap-1 bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-40">
            <Plus className="h-3 w-3 stroke-current" /> Create
          </button>
          <button type="button" onClick={hCancel}
            className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (mode === "create") return renderCreateForm();
    if (!sel) return (
      <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
        <div className="text-center max-w-xs">
          <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1.5`}>No check selected</h3>
          <p className={`text-xs ${theme.textSecondary} leading-relaxed mb-4`}>Select a production check or create a new one.</p>
          <button type="button" onClick={hNew}
            className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 transition-colors">
            <Plus className="h-3.5 w-3.5 stroke-current" /> New Check
          </button>
        </div>
      </div>
    );
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-5 space-y-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">{sel.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{sel.checkType}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                <span className="text-xs text-muted-foreground">{sel.targetType}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {sel.score !== null && <><span className="text-xs text-muted-foreground">Score</span>
                <span className="text-lg font-bold font-mono text-foreground">{sel.score}%</span></>}
              {sel.status === "DRAFT" && (
                <button type="button" onClick={hComplete}
                  className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                  <Play className="h-2.5 w-2.5 stroke-current" />Complete
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Check Details</h3>
            <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 text-sm">
              <span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{sel.checkType}</span>
              <span className="text-muted-foreground">Target</span><span className="text-foreground font-medium">{sel.targetType} #{sel.targetId}</span>
              <span className="text-muted-foreground">Checked By</span><span className="text-foreground font-medium">{sel.checkedBy || "-"}</span>
              <span className="text-muted-foreground">Date</span><span className="text-foreground font-medium">{sel.checkDate || "-"}</span>
              <span className="text-muted-foreground">Status</span><span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
              <span className="text-muted-foreground">Score</span><span className="text-foreground font-mono font-medium">{sel.score !== null ? `${sel.score}%` : "N/A"}</span>
            </div>
            {sel.notes && <p className="mt-2 text-sm text-muted-foreground">{sel.notes}</p>}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Checklist</h3>
            {sel.checklistItems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No checklist items yet.</p>
            ) : (
              <div className="space-y-1">
                {sel.checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 border border-border/30 bg-card/50 px-3 py-2">
                    <div className="shrink-0">{resultIcon(item.result)}</div>
                    <span className="flex-1 text-xs text-foreground">{item.question}</span>
                    <select value={item.result || ""}
                      onChange={(e) => hUpdateChecklistResult(item.id, e.target.value)}
                      className="h-6 w-20 text-xs rounded border border-border/30 bg-card px-1 text-foreground outline-none">
                      {CHECKLIST_RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {item.comment && <span className="text-xs text-muted-foreground max-w-[120px] truncate">{item.comment}</span>}
                  </div>
                ))}
              </div>
            )}
            {sel.status === "DRAFT" && (
              <div className="mt-2 flex items-center gap-2">
                <input type="text" value={newItemQuestion} onChange={(e) => setNewItemQuestion(e.target.value)}
                  placeholder="Add checklist item..." className="flex-1 h-7 text-xs rounded border border-border/40 bg-card px-2 text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-info/60" />
                <input type="text" value={newItemComment} onChange={(e) => setNewItemComment(e.target.value)}
                  placeholder="Comment..." className="w-28 h-7 text-xs rounded border border-border/40 bg-card px-2 text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-info/60" />
                <button type="button" onClick={hAddChecklistItem} disabled={!newItemQuestion.trim()}
                  className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-accent/10 transition-colors disabled:opacity-40">
                  <Plus className="h-3 w-3 stroke-current" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {successMsg && <div className="shrink-0 h-8 flex items-center justify-center bg-success/10 text-success text-sm font-semibold border-b border-success/20">{successMsg}</div>}
      <PageHeader icon={<Activity className="h-5 w-5 stroke-current" />}
        iconClass="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
        title="Production Control" subtitle="Monitor production checks, track compliance, and enforce production standards." />
      <div>
        <Toolbar left={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search checks..." />}
          right={<>
            <ToolbarSelect value={filterType} onChange={setFilterType}
              options={CHECK_TYPE_OPTIONS} className="w-40" />
            <div className="flex-1" />
            <div className="flex items-center gap-2 shrink-0">
              {mode === "create" ? (
                <><ToolbarButton icon={X} label="Cancel" onClick={hCancel} /></>
              ) : (
                <><ToolbarButton icon={Plus} label="New" onClick={hNew} />
                  <span className="h-5 w-px shrink-0 bg-border/25" />
                  <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>
              )}
            </div>
          </>} />
      </div>
      <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col min-h-0 overflow-hidden bg-card/40 border-r border-border/20" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
          <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
            <span className={`text-sm font-medium ${theme.textMuted}`}>Checks</span>
            <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{checks.length}</span>
          </div>
          <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
            {loading && checks.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
            ) : checks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <p className="text-xs font-medium text-muted-foreground">No checks</p>
                <button type="button" onClick={hNew}
                  className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600/10 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-600/20 dark:text-amber-400 transition-colors">
                  <Plus className="h-3 w-3 stroke-current" /> New check</button>
              </div>
            ) : (
              <div>{checks.map((c) => (
                <div key={c.id} onClick={() => { setSelectedId(c.id); setMode("view"); }}
                  className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${selectedId === c.id ? "bg-table-selected border-l-2 border-l-purple-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                      <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{c.title}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[c.status] || ""}`}>{statusLabel(c.status)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{c.checkType}</span>
                      <span className="text-[10px] text-muted-foreground">{"\u00B7"}</span>
                      <span className="text-xs text-muted-foreground">{c.targetType}</span>
                      {c.score !== null && <><span className="text-[10px] text-muted-foreground">{"\u00B7"}</span>
                        <span className="text-xs font-mono text-muted-foreground">{c.score}%</span></>}
                    </div>
                  </div>
                </div>
              ))}</div>
            )}
          </div>
          <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4">
            <span className={`text-xs ${theme.textMuted}`}>{checks.length} check{checks.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div onMouseDown={handleSplitMouseDown} className="flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-purple-500/10" style={{ width: 2 }} />
        <div className={`flex flex-col min-h-0 min-w-0 flex-1 overflow-hidden`}>{renderDetail()}</div>
      </div>
      <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
        <span>Production Control</span><span className="flex-1" />
        {sel && <><span>Created: {sel.createdAt?.slice(0, 10) || "-"}</span><span>Updated: {sel.updatedAt?.slice(0, 10) || "-"}</span></>}
      </div>
    </div>
  );
}
