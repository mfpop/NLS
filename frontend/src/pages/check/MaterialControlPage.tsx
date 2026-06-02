import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Package, Plus, RefreshCw, Circle, CheckCircle, XCircle, Minus,
  ShieldAlert, Ban, ClipboardX, Play, Wrench,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  MATERIAL_CHECKS_QUERY, MATERIAL_CHECK_QUERY,
  MATERIAL_ISSUES_QUERY, MATERIAL_ISSUE_QUERY,
} from "@/graphql/checkQueries";
import {
  CREATE_MATERIAL_CHECK_MUTATION,
  UPDATE_MATERIAL_CHECK_MUTATION,
  ADD_MATERIAL_CHECKLIST_ITEM_MUTATION,
  UPDATE_MATERIAL_CHECKLIST_ITEM_MUTATION,
  COMPLETE_MATERIAL_CHECK_MUTATION,
  CREATE_MATERIAL_ISSUE_MUTATION,
  UPDATE_MATERIAL_ISSUE_MUTATION,
  CONTAIN_MATERIAL_ISSUE_MUTATION,
  RESOLVE_MATERIAL_ISSUE_MUTATION,
  CLOSE_MATERIAL_ISSUE_MUTATION,
  CANCEL_MATERIAL_ISSUE_MUTATION,
} from "@/graphql/checkMutations";

type Tab = "checks" | "issues";

const CHECK_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "MATERIAL_FLOW_CHECK", label: "Material Flow Check" },
  { value: "FIFO_CHECK", label: "FIFO Check" },
  { value: "BIN_CHECK", label: "Bin Check" },
  { value: "WIP_CHECK", label: "WIP Check" },
  { value: "SHORTAGE_CHECK", label: "Shortage Check" },
  { value: "WRONG_MATERIAL_CHECK", label: "Wrong Material Check" },
  { value: "SUPERMARKET_CHECK", label: "Supermarket Check" },
];

const CHECK_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border/40",
  COMPLETED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
};

const ISSUE_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  CONTAINED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  RESOLVED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  CLOSED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const CHECKLIST_RESULT_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "PASS", label: "Pass" },
  { value: "FAIL", label: "Fail" },
  { value: "N_A", label: "N/A" },
];

interface MCItemNode { id: number; materialCheckId: number; question: string; result: string | null; comment: string; }
interface MaterialCheckNode { id: number; checkType: string; targetType: string; targetId: number | null; title: string; checkedBy: string; checkDate: string | null; status: string; score: number | null; notes: string; checklistItems: MCItemNode[]; createdAt: string; updatedAt: string; }
interface MaterialIssueNode { id: number; title: string; description: string; issueType: string; targetType: string; targetId: number | null; materialItemId: number | null; materialBinId: number | null; quantity: number | null; uom: string; severity: string; status: string; reportedBy: string; owner: string; notes: string; createdAt: string; updatedAt: string; }

function statusLabel(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

function resultIcon(result: string | null) {
  switch (result) {
    case "PASS": return <CheckCircle className="h-3.5 w-3.5 text-green-500 stroke-current" />;
    case "FAIL": return <XCircle className="h-3.5 w-3.5 text-red-500 stroke-current" />;
    case "N_A": return <Minus className="h-3.5 w-3.5 text-muted-foreground stroke-current" />;
    default: return <Circle className="h-3.5 w-3.5 text-muted-foreground/40 stroke-current" />;
  }
}

export function MaterialControlPage() {
  const [tab, setTab] = useState<Tab>("checks");
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);
  useEffect(() => { if (successMsg) { const t = setTimeout(() => setSuccessMsg(null), 5000); return () => clearTimeout(t); } }, [successMsg]);

  // ── Checks ──
  const [checkFilterType, setCheckFilterType] = useState("");
  const [selectedCheckId, setSelectedCheckId] = useState<number | null>(null);
  const [showNewCheck, setShowNewCheck] = useState(false);
  const [newCheckTitle, setNewCheckTitle] = useState("");
  const [newCheckType, setNewCheckType] = useState("MATERIAL_FLOW_CHECK");
  const [newCheckTT, setNewCheckTT] = useState("PLANT");
  const [newCheckTI, setNewCheckTI] = useState("");
  const [newCheckBy, setNewCheckBy] = useState("");
  const [newCheckDate, setNewCheckDate] = useState("");
  const [newCheckNotes, setNewCheckNotes] = useState("");
  const [newItemQ, setNewItemQ] = useState("");
  const [newItemC, setNewItemC] = useState("");

  const checksQ = useQuery<{ materialChecks: MaterialCheckNode[] }>(MATERIAL_CHECKS_QUERY, {
    variables: { checkType: checkFilterType || undefined, search: search || undefined },
    fetchPolicy: "cache-and-network",
  });
  const checks = checksQ.data?.materialChecks || [];
  const { data: checkD } = useQuery<{ materialCheck: MaterialCheckNode }>(MATERIAL_CHECK_QUERY, {
    variables: { id: selectedCheckId! }, skip: !selectedCheckId || showNewCheck, fetchPolicy: "cache-and-network",
  });
  const selCheck = checkD?.materialCheck || (selectedCheckId ? checks.find((c) => c.id === selectedCheckId) ?? null : null);

  const [createMC] = useMutation(CREATE_MATERIAL_CHECK_MUTATION);
  const [addMCI] = useMutation(ADD_MATERIAL_CHECKLIST_ITEM_MUTATION);
  const [updMCI] = useMutation(UPDATE_MATERIAL_CHECKLIST_ITEM_MUTATION);
  const [completeMC] = useMutation(COMPLETE_MATERIAL_CHECK_MUTATION);

  const hNewCheck = useCallback(() => { setShowNewCheck(true); setSelectedCheckId(null); setNewCheckTitle(""); setNewCheckType("MATERIAL_FLOW_CHECK"); setNewCheckTT("PLANT"); setNewCheckTI(""); setNewCheckBy(""); setNewCheckDate(""); setNewCheckNotes(""); }, []);
  const hCreateCheck = useCallback(async () => {
    if (!newCheckTitle.trim() || !newCheckTI.trim()) return;
    const r = await createMC({ variables: { title: newCheckTitle.trim(), checkType: newCheckType, targetType: newCheckTT, targetId: parseInt(newCheckTI), checkedBy: newCheckBy || null, checkDate: newCheckDate || null, notes: newCheckNotes } });
    if (r.error) { setMutationError(r.error.message); return; }
    setSuccessMsg("Material check created"); setShowNewCheck(false); checksQ.refetch();
  }, [newCheckTitle, newCheckType, newCheckTT, newCheckTI, newCheckBy, newCheckDate, newCheckNotes, createMC, checksQ]);
  const hAddItem = useCallback(async () => {
    if (!selectedCheckId || !newItemQ.trim()) return;
    await addMCI({ variables: { checkId: selectedCheckId, question: newItemQ.trim() } });
    setNewItemQ(""); setNewItemC(""); checksQ.refetch();
  }, [selectedCheckId, newItemQ, newItemC, addMCI, checksQ]);
  const hUpdItem = useCallback(async (itemId: number, result: string) => {
    await updMCI({ variables: { id: itemId, result: result || null, comment: "" } }); checksQ.refetch();
  }, [updMCI, checksQ]);
  const hCompleteCheck = useCallback(async () => {
    if (!selectedCheckId) return;
    await completeMC({ variables: { id: selectedCheckId } }); setSuccessMsg("Material check completed"); checksQ.refetch();
  }, [selectedCheckId, completeMC, checksQ]);

  // ── Issues ──
  const [issSearch, setIssSearch] = useState("");
  const [selectedIssId, setSelectedIssId] = useState<number | null>(null);
  const [showNewIss, setShowNewIss] = useState(false);
  const [newIssTitle, setNewIssTitle] = useState("");
  const [newIssType, setNewIssType] = useState("SHORTAGE");
  const [newIssTT, setNewIssTT] = useState("PLANT");
  const [newIssTI, setNewIssTI] = useState("");
  const [newIssDesc, setNewIssDesc] = useState("");
  const [newIssQty, setNewIssQty] = useState("");
  const [newIssUom, setNewIssUom] = useState("");
  const [newIssSev, setNewIssSev] = useState("MEDIUM");
  const [newIssRep, setNewIssRep] = useState("");
  const [newIssOwner, setNewIssOwner] = useState("");
  const [newIssNotes, setNewIssNotes] = useState("");

  const issQ = useQuery<{ materialIssues: MaterialIssueNode[] }>(MATERIAL_ISSUES_QUERY, {
    variables: { search: issSearch || undefined }, fetchPolicy: "cache-and-network",
  });
  const iss = issQ.data?.materialIssues || [];
  const { data: issD } = useQuery<{ materialIssue: MaterialIssueNode }>(MATERIAL_ISSUE_QUERY, {
    variables: { id: selectedIssId! }, skip: !selectedIssId || showNewIss, fetchPolicy: "cache-and-network",
  });
  const selIss = issD?.materialIssue || (selectedIssId ? iss.find((i) => i.id === selectedIssId) ?? null : null);

  const [createMI] = useMutation(CREATE_MATERIAL_ISSUE_MUTATION);
  const [containMI] = useMutation(CONTAIN_MATERIAL_ISSUE_MUTATION);
  const [resolveMI] = useMutation(RESOLVE_MATERIAL_ISSUE_MUTATION);
  const [closeMI] = useMutation(CLOSE_MATERIAL_ISSUE_MUTATION);
  const [cancelMI] = useMutation(CANCEL_MATERIAL_ISSUE_MUTATION);

  const hNewIss = useCallback(() => { setShowNewIss(true); setSelectedIssId(null); setNewIssTitle(""); setNewIssType("SHORTAGE"); setNewIssTT("PLANT"); setNewIssTI(""); setNewIssDesc(""); setNewIssQty(""); setNewIssUom(""); setNewIssSev("MEDIUM"); setNewIssRep(""); setNewIssOwner(""); setNewIssNotes(""); }, []);
  const hCreateIss = useCallback(async () => {
    if (!newIssTitle.trim() || !newIssTI.trim()) return;
    const r = await createMI({ variables: { title: newIssTitle.trim(), issueType: newIssType, targetType: newIssTT, targetId: parseInt(newIssTI), description: newIssDesc, quantity: newIssQty ? parseFloat(newIssQty) : null, uom: newIssUom, severity: newIssSev, reportedBy: newIssRep, owner: newIssOwner, notes: newIssNotes } });
    if (r.error) { setMutationError(r.error.message); return; }
    setSuccessMsg("Material issue created"); setShowNewIss(false); issQ.refetch();
  }, [newIssTitle, newIssType, newIssTT, newIssTI, newIssDesc, newIssQty, newIssUom, newIssSev, newIssRep, newIssOwner, newIssNotes, createMI, issQ]);
  const hContainIss = useCallback(async () => {
    if (!selectedIssId) return;
    await containMI({ variables: { id: selectedIssId } }); setSuccessMsg("Issue contained"); issQ.refetch();
  }, [selectedIssId, containMI, issQ]);
  const hResolveIss = useCallback(async () => {
    if (!selectedIssId) return;
    await resolveMI({ variables: { id: selectedIssId } }); setSuccessMsg("Issue resolved"); issQ.refetch();
  }, [selectedIssId, resolveMI, issQ]);
  const hCloseIss = useCallback(async () => {
    if (!selectedIssId) return;
    await closeMI({ variables: { id: selectedIssId } }); setSuccessMsg("Issue closed"); issQ.refetch();
  }, [selectedIssId, closeMI, issQ]);
  const hCancelIss = useCallback(async () => {
    if (!selectedIssId) return;
    await cancelMI({ variables: { id: selectedIssId } }); setSuccessMsg("Issue cancelled"); issQ.refetch();
  }, [selectedIssId, cancelMI, issQ]);

  const iCls = "h-8 w-full rounded border border-border/50 bg-card px-2.5 text-sm text-foreground outline-none transition-all focus:border-info/60 placeholder:text-muted-foreground/40";
  const sCls = "h-8 w-full rounded border border-border/50 bg-card px-2 text-sm text-foreground outline-none transition-all focus:border-info/60";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const tabs = (
    <div className="flex shrink-0 items-center border-b border-border/30 bg-muted/20 px-4 h-9 gap-0">
      {(["checks", "issues"] as Tab[]).map((t) => (
        <button key={t} onClick={() => { setTab(t); setSearch(""); setIssSearch(""); setShowNewCheck(false); setShowNewIss(false); }}
          className={`px-3 h-full text-xs font-semibold border-b-2 transition-colors ${tab === t ? "border-teal-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          {t === "checks" ? "Material Checks" : "Issues"}
        </button>
      ))}
    </div>
  );

  const renderChecks = () => (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col min-h-0 bg-card/40 border-r border-border/20" style={{ flexBasis: "30%", minWidth: 200 }}>
        <div className="shrink-0 h-8 border-b border-border/50 items-center bg-muted px-4 flex"><span className="text-sm font-medium text-muted-foreground">Checks</span><span className="ml-auto text-[10px] text-muted-foreground font-mono">{checks.length}</span></div>
        <div className="flex-1 overflow-y-auto">{checksQ.loading && checks.length === 0 ? <div className="flex items-center justify-center h-24 text-xs text-muted-foreground"><span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div> : checks.length === 0 ? <div className="flex flex-col items-center justify-center h-32 text-center px-4"><p className="text-xs font-medium text-muted-foreground">No checks</p><button onClick={hNewCheck} className="mt-2 inline-flex h-7 items-center gap-1 bg-teal-600/10 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-600/20 transition-colors"><Plus className="h-3 w-3" /> New</button></div> : <div>{checks.map((c) => (
          <div key={c.id} onClick={() => { setSelectedCheckId(c.id); setShowNewCheck(false); }} className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all ${selectedCheckId === c.id ? "bg-table-selected border-l-2 border-l-teal-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
            <div className="min-w-0 flex-1"><div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}><span className="min-w-0 truncate text-sm font-semibold text-foreground">{c.title}</span><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${CHECK_STATUS_STYLES[c.status] || ""}`}>{statusLabel(c.status)}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-xs text-muted-foreground">{c.checkType}</span>{c.score !== null && <><span className="text-[10px]">{"\u00B7"}</span><span className="text-xs font-mono">{c.score}%</span></>}</div></div>
          </div>
        ))}</div>}</div>
        <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4"><span className="text-xs text-muted-foreground">{checks.length} check{checks.length !== 1 ? "s" : ""}</span></div>
      </div>
      <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
        {showNewCheck ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">New Material Check</h3>
            {mutationError && <p className={`text-xs font-medium ${theme.textCritical} mb-3`}>{mutationError}</p>}
            <div className="space-y-3.5 max-w-lg">
              <div><label className={labelCls}>Title *</label><input type="text" value={newCheckTitle} onChange={(e) => setNewCheckTitle(e.target.value)} className={iCls} /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>Type</label><select value={newCheckType} onChange={(e) => setNewCheckType(e.target.value)} className={sCls}>{CHECK_TYPE_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div><div><label className={labelCls}>Target</label><select value={newCheckTT} onChange={(e) => setNewCheckTT(e.target.value)} className={sCls}><option value="PLANT">Plant</option><option value="PRODUCTION_LINE">Production Line</option><option value="DEPARTMENT">Department</option><option value="RESOURCE_GROUP">Resource Group</option><option value="RESOURCE">Resource</option></select></div></div>
              <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>Target ID *</label><input type="number" value={newCheckTI} onChange={(e) => setNewCheckTI(e.target.value)} className={iCls} /></div><div><label className={labelCls}>Date</label><input type="date" value={newCheckDate} onChange={(e) => setNewCheckDate(e.target.value)} className={iCls} /></div></div>
              <div><label className={labelCls}>Checked By</label><input type="text" value={newCheckBy} onChange={(e) => setNewCheckBy(e.target.value)} className={iCls} /></div>
              <div><label className={labelCls}>Notes</label><textarea value={newCheckNotes} onChange={(e) => setNewCheckNotes(e.target.value)} rows={3} className={`${iCls} resize-none`} /></div>
              <div className="flex gap-2 pt-2"><button onClick={hCreateCheck} disabled={!newCheckTitle.trim() || !newCheckTI.trim()} className="inline-flex h-7 items-center gap-1 bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-40"><Plus className="h-3 w-3" />Create</button><button onClick={() => setShowNewCheck(false)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button></div>
            </div>
          </div>
        ) : !selCheck ? (
          <div className="flex flex-1 items-center justify-center h-full"><div className="text-center max-w-xs"><h3 className="text-sm font-semibold text-foreground mb-1.5">No check selected</h3><p className="text-xs text-muted-foreground/70 mb-4">Select a material check or create a new one.</p><button onClick={hNewCheck} className="inline-flex h-8 items-center gap-1.5 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"><Plus className="h-3.5 w-3.5" /> New Check</button></div></div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-foreground">{selCheck.title}</h2><div className="flex items-center gap-2 mt-1"><span className="text-xs text-muted-foreground">{selCheck.checkType}</span><span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" /><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${CHECK_STATUS_STYLES[selCheck.status] || ""}`}>{statusLabel(selCheck.status)}</span></div></div>
              <div className="flex items-center gap-3 shrink-0">{selCheck.score !== null && <><span className="text-xs text-muted-foreground">Score</span><span className="text-lg font-bold font-mono">{selCheck.score}%</span></>}{selCheck.status === "DRAFT" && <button onClick={hCompleteCheck} className="inline-flex h-7 items-center gap-1 border border-green-200 px-2 text-[10px] font-semibold text-green-700 hover:bg-green-50"><Play className="h-2.5 w-2.5" />Complete</button>}</div></div>
            <div><h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Details</h3><div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 text-sm"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{selCheck.checkType}</span><span className="text-muted-foreground">Target</span><span className="text-foreground font-medium">{selCheck.targetType} #{selCheck.targetId}</span><span className="text-muted-foreground">By</span><span className="text-foreground font-medium">{selCheck.checkedBy || "-"}</span><span className="text-muted-foreground">Score</span><span className="text-foreground font-mono">{selCheck.score !== null ? `${selCheck.score}%` : "N/A"}</span></div></div>
            <div><h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Checklist</h3>{(selCheck.checklistItems || []).length === 0 ? <p className="text-xs text-muted-foreground italic">No items.</p> : <div className="space-y-1">{selCheck.checklistItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 border border-border/30 bg-card/50 px-3 py-2"><div className="shrink-0">{resultIcon(item.result)}</div><span className="flex-1 text-xs text-foreground">{item.question}</span><select value={item.result || ""} onChange={(e) => hUpdItem(item.id, e.target.value)} className="h-6 w-20 text-xs rounded border border-border/30 bg-card px-1 text-foreground outline-none">{CHECKLIST_RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{item.comment && <span className="text-xs text-muted-foreground max-w-[120px] truncate">{item.comment}</span>}</div>
            ))}</div>}{selCheck.status === "DRAFT" && <div className="mt-2 flex items-center gap-2"><input type="text" value={newItemQ} onChange={(e) => setNewItemQ(e.target.value)} placeholder="Add item..." className="flex-1 h-7 text-xs rounded border border-border/40 bg-card px-2 outline-none" /><input type="text" value={newItemC} onChange={(e) => setNewItemC(e.target.value)} placeholder="Comment..." className="w-28 h-7 text-xs rounded border border-border/40 bg-card px-2 outline-none" /><button onClick={hAddItem} disabled={!newItemQ.trim()} className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-accent/10 disabled:opacity-40"><Plus className="h-3 w-3" /></button></div>}</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderIssues = () => (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col min-h-0 bg-card/40 border-r border-border/20" style={{ flexBasis: "30%", minWidth: 200 }}>
        <div className="shrink-0 h-8 border-b border-border/50 items-center bg-muted px-4 flex"><span className="text-sm font-medium text-muted-foreground">Issues</span><span className="ml-auto text-[10px] text-muted-foreground font-mono">{iss.length}</span></div>
        <div className="flex-1 overflow-y-auto">{issQ.loading && iss.length === 0 ? <div className="flex items-center justify-center h-24 text-xs text-muted-foreground"><span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div> : iss.length === 0 ? <div className="flex flex-col items-center justify-center h-32 text-center px-4"><p className="text-xs font-medium text-muted-foreground">No issues</p><button onClick={hNewIss} className="mt-2 inline-flex h-7 items-center gap-1 bg-teal-600/10 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-600/20 transition-colors"><Plus className="h-3 w-3" /> New</button></div> : <div>{iss.map((i) => (
          <div key={i.id} onClick={() => { setSelectedIssId(i.id); setShowNewIss(false); }} className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all ${selectedIssId === i.id ? "bg-table-selected border-l-2 border-l-teal-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
            <div className="min-w-0 flex-1"><div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}><span className="min-w-0 truncate text-sm font-semibold text-foreground">{i.title}</span><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${ISSUE_STATUS_STYLES[i.status] || ""}`}>{statusLabel(i.status)}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-xs text-muted-foreground">{i.issueType}</span>{i.severity !== "MEDIUM" && <><span className="text-[10px]">{"\u00B7"}</span><span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border ${SEVERITY_STYLES[i.severity] || ""}`}>{i.severity}</span></>}</div></div>
          </div>
        ))}</div>}</div>
        <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4"><span className="text-xs text-muted-foreground">{iss.length} issue{iss.length !== 1 ? "s" : ""}</span></div>
      </div>
      <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
        {showNewIss ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">New Material Issue</h3>
            {mutationError && <p className={`text-xs font-medium ${theme.textCritical} mb-3`}>{mutationError}</p>}
            <div className="space-y-3.5 max-w-lg">
              <div><label className={labelCls}>Title *</label><input type="text" value={newIssTitle} onChange={(e) => setNewIssTitle(e.target.value)} className={iCls} /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>Issue Type</label><select value={newIssType} onChange={(e) => setNewIssType(e.target.value)} className={sCls}><option value="SHORTAGE">Shortage</option><option value="WRONG_MATERIAL">Wrong Material</option><option value="BIN_ERROR">Bin Error</option><option value="FIFO_VIOLATION">FIFO Violation</option><option value="WIP_OVERFLOW">WIP Overflow</option><option value="MATERIAL_DAMAGE">Material Damage</option><option value="HANDLING_ISSUE">Handling Issue</option></select></div><div><label className={labelCls}>Severity</label><select value={newIssSev} onChange={(e) => setNewIssSev(e.target.value)} className={sCls}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div></div>
              <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>Target Type</label><select value={newIssTT} onChange={(e) => setNewIssTT(e.target.value)} className={sCls}><option value="PLANT">Plant</option><option value="PRODUCTION_LINE">Production Line</option><option value="DEPARTMENT">Department</option><option value="RESOURCE_GROUP">Resource Group</option><option value="RESOURCE">Resource</option></select></div><div><label className={labelCls}>Target ID *</label><input type="number" value={newIssTI} onChange={(e) => setNewIssTI(e.target.value)} className={iCls} /></div></div>
              <div><label className={labelCls}>Description</label><textarea value={newIssDesc} onChange={(e) => setNewIssDesc(e.target.value)} rows={2} className={`${iCls} resize-none`} /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>Quantity</label><input type="number" value={newIssQty} onChange={(e) => setNewIssQty(e.target.value)} className={iCls} /></div><div><label className={labelCls}>UOM</label><input type="text" value={newIssUom} onChange={(e) => setNewIssUom(e.target.value)} className={iCls} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>Reported By</label><input type="text" value={newIssRep} onChange={(e) => setNewIssRep(e.target.value)} className={iCls} /></div><div><label className={labelCls}>Owner</label><input type="text" value={newIssOwner} onChange={(e) => setNewIssOwner(e.target.value)} className={iCls} /></div></div>
              <div><label className={labelCls}>Notes</label><textarea value={newIssNotes} onChange={(e) => setNewIssNotes(e.target.value)} rows={2} className={`${iCls} resize-none`} /></div>
              <div className="flex gap-2 pt-2"><button onClick={hCreateIss} disabled={!newIssTitle.trim() || !newIssTI.trim()} className="inline-flex h-7 items-center gap-1 bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-40"><Plus className="h-3 w-3" />Create</button><button onClick={() => setShowNewIss(false)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button></div>
            </div>
          </div>
        ) : !selIss ? (
          <div className="flex flex-1 items-center justify-center h-full"><div className="text-center max-w-xs"><h3 className="text-sm font-semibold text-foreground mb-1.5">No issue selected</h3><p className="text-xs text-muted-foreground/70 mb-4">Select a material issue or create a new one.</p><button onClick={hNewIss} className="inline-flex h-8 items-center gap-1.5 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"><Plus className="h-3.5 w-3.5" /> New Issue</button></div></div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-foreground">{selIss.title}</h2><div className="flex items-center gap-2 mt-1"><span className="text-xs text-muted-foreground">{selIss.issueType}</span><span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" /><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${ISSUE_STATUS_STYLES[selIss.status] || ""}`}>{statusLabel(selIss.status)}</span>{selIss.severity !== "MEDIUM" && <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${SEVERITY_STYLES[selIss.severity] || ""}`}>{selIss.severity}</span>}</div></div>
              <div className="flex items-center gap-1 shrink-0 flex-wrap">
                {selIss.status === "OPEN" && <button onClick={() => setConfirmAction({ id: selIss.id, action: "contain" })} className="inline-flex h-7 items-center gap-1 border border-indigo-200 px-2 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50 transition-all"><ShieldAlert className="h-2.5 w-2.5" />Contain</button>}
                {selIss.status === "CONTAINED" && <button onClick={() => setConfirmAction({ id: selIss.id, action: "resolve" })} className="inline-flex h-7 items-center gap-1 border border-blue-200 px-2 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 transition-all"><Wrench className="h-2.5 w-2.5" />Resolve</button>}
                {(selIss.status === "RESOLVED" || selIss.status === "CONTAINED") && <button onClick={() => setConfirmAction({ id: selIss.id, action: "close" })} className="inline-flex h-7 items-center gap-1 border border-green-200 px-2 text-[10px] font-semibold text-green-700 hover:bg-green-50 transition-all"><ClipboardX className="h-2.5 w-2.5" />Close</button>}
                {selIss.status !== "CLOSED" && selIss.status !== "CANCELLED" && <button onClick={() => setConfirmAction({ id: selIss.id, action: "cancel" })} className="inline-flex h-7 items-center gap-1 border border-red-200 px-2 text-[10px] font-semibold text-red-700 hover:bg-red-50 transition-all"><Ban className="h-2.5 w-2.5" />Cancel</button>}
              </div></div>
            <div><h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Details</h3><div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 text-sm"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{selIss.issueType}</span><span className="text-muted-foreground">Status</span><span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold border ${ISSUE_STATUS_STYLES[selIss.status] || ""}`}>{statusLabel(selIss.status)}</span><span className="text-muted-foreground">Severity</span><span className="text-foreground font-medium">{selIss.severity}</span><span className="text-muted-foreground">Target</span><span className="text-foreground font-medium">{selIss.targetType} #{selIss.targetId}</span><span className="text-muted-foreground">Qty</span><span className="text-foreground font-medium">{selIss.quantity ?? "-"} {selIss.uom || ""}</span><span className="text-muted-foreground">Rep. By</span><span className="text-foreground font-medium">{selIss.reportedBy || "-"}</span><span className="text-muted-foreground">Owner</span><span className="text-foreground font-medium">{selIss.owner || "-"}</span></div></div>
            {selIss.description && <div><h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Description</h3><p className="text-sm text-foreground">{selIss.description}</p></div>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {successMsg && <div className="shrink-0 h-8 flex items-center justify-center bg-success/10 text-success text-sm font-semibold border-b border-success/20">{successMsg}</div>}
      <PageHeader icon={<Package className="h-5 w-5 stroke-current" />}
        iconClass="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400"
        title="Material Control" subtitle="Monitor material checks, track shortages, FIFO compliance, and material issues." />
      <div><Toolbar left={tab === "checks" ? <ToolbarSearch value={search} onChange={setSearch} placeholder="Search material checks..." /> : <ToolbarSearch value={issSearch} onChange={setIssSearch} placeholder="Search material issues..." />}
        right={<div className="flex items-center gap-2 shrink-0">{tab === "checks" && <><ToolbarSelect value={checkFilterType} onChange={setCheckFilterType} options={CHECK_TYPE_OPTIONS} className="w-44" /><div className="flex-1" /><ToolbarButton icon={Plus} label="New Check" onClick={hNewCheck} /></>}{tab === "issues" && <><div className="flex-1" /><ToolbarButton icon={Plus} label="New Issue" onClick={hNewIss} /></>}<span className="h-5 w-px bg-border/25" /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => { checksQ.refetch(); issQ.refetch(); }} /></div>} /></div>
      {tabs}
      {tab === "checks" && renderChecks()}
      {tab === "issues" && renderIssues()}
      <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium"><span>Material Control</span><span className="flex-1" /></div>
      <ConfirmDialog open={confirmAction !== null} onClose={() => setConfirmAction(null)}
        onConfirm={confirmAction?.action === "contain" ? hContainIss : confirmAction?.action === "resolve" ? hResolveIss : confirmAction?.action === "close" ? hCloseIss : hCancelIss}
        title={`${confirmAction?.action === "contain" ? "Contain" : confirmAction?.action === "resolve" ? "Resolve" : confirmAction?.action === "close" ? "Close" : "Cancel"} Issue`}
        message={confirmAction?.action === "cancel" ? "Cancel this issue?" : confirmAction?.action === "contain" ? "Mark as contained?" : confirmAction?.action === "resolve" ? "Mark as resolved?" : "Close this issue?"}
        confirmLabel={confirmAction?.action === "contain" ? "Contain" : confirmAction?.action === "resolve" ? "Resolve" : confirmAction?.action === "close" ? "Close" : "Yes, Cancel"}
        danger={confirmAction?.action === "cancel"} />
    </div>
  );
}
