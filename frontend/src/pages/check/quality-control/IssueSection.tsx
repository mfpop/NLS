import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { PROBLEMS_QUERY } from "@/graphql/checkQueries";
import { CREATE_PROBLEM_MUTATION, UPDATE_PROBLEM_MUTATION, CANCEL_PROBLEM_MUTATION } from "@/graphql/checkMutations";
import { ISSUE_STATUS_STYLES, SEVERITY_STYLES, SEL_INPUT, statusLabel } from "./QualityStatusStyles";
import { InlineEditField } from "./InlineEditField";

export function useIssueSection(_search: string, filterStatus: string, onMessage: (msg: string, tone?: "success" | "error") => void, controlArea: string = "QUALITY") {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  // Create form
  const [iTitle, setITitle] = useState("");
  const [iType, setIType] = useState("QUALITY");
  const [iSeverity, setISeverity] = useState("MEDIUM");
  const [iDesc, setIDesc] = useState("");
  const [iOwner, setIOwner] = useState("");
  const [iDueDate, setIDueDate] = useState("");
  const [iSourceType, setISourceType] = useState("MANUAL");
  const [iSourceId, setISourceId] = useState<number | null>(null);
  const [iNotes, setINotes] = useState("");

  // Edit form
  const [eId, setEId] = useState<number | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eSeverity, setESeverity] = useState("MEDIUM");
  const [eDesc, setEDesc] = useState("");
  const [eOwner, setEOwner] = useState("");
  const [eDueDate, setEDueDate] = useState("");
  const [eSourceType, setESourceType] = useState("MANUAL");
  const [eSourceId, setESourceId] = useState<number | null>(null);
  const [eNotes, setENotes] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const qVars = useMemo(() => ({ controlArea, status: filterStatus || null } as const), [controlArea, filterStatus]);
  const { data, refetch } = useQuery<any>(PROBLEMS_QUERY, { variables: qVars, fetchPolicy: "cache-and-network" });
  const items: any[] = data?.problems || [];

  const [createMut] = useMutation<any>(CREATE_PROBLEM_MUTATION);
  const [updateMut] = useMutation<any>(UPDATE_PROBLEM_MUTATION);
  const [cancelMut] = useMutation<any>(CANCEL_PROBLEM_MUTATION);

  const hNew = useCallback(() => {
    setCreating(true); setEditing(false); setSelectedId(null);
    setITitle(""); setIType("QUALITY"); setISeverity("MEDIUM"); setIDesc(""); setIOwner(""); setIDueDate(""); setISourceType("MANUAL"); setISourceId(null); setINotes("");
  }, []);
  const hCreate = useCallback(async () => {
    if (!iTitle.trim()) return;
    try {
      const r: any = await createMut({ variables: { title: iTitle.trim(), problemType: iType, targetType: "PLANT", targetId: null, severity: iSeverity, description: iDesc || null, reportedBy: iOwner || null, sourceType: iSourceType === "MANUAL" ? null : iSourceType, sourceId: iSourceType === "MANUAL" ? null : iSourceId, controlArea: controlArea || null, notes: iNotes || null } });
      if (r.errors?.length) { onMessage(r.errors[0].message || "Save failed", "error"); return; }
      if (!r.data) { onMessage("Save failed - unexpected response", "error"); return; }
      onMessage("Issue created"); setCreating(false); refetch();
    } catch (e: any) {
      onMessage(e?.message || "Save failed", "error");
    }
  }, [iTitle, iType, iSeverity, iDesc, iOwner, iSourceType, iSourceId, controlArea, iNotes, createMut, refetch, onMessage]);

  const hEdit = useCallback((item: any) => {
    setEId(item.id); setEditing(true); setCreating(false);
    setETitle(item.title || ""); setESeverity(item.severity || "MEDIUM"); setEDesc(item.description || "");
    setEOwner(item.owner || item.reportedBy || ""); setEDueDate(item.dueDate || "");
    setESourceType(item.sourceType === "AUDIT_FINDING" ? "AUDIT_FINDING" : "MANUAL");
    setESourceId(item.sourceId || null); setENotes(item.notes || "");
  }, []);
  const hSaveEdit = useCallback(async () => {
    if (!eId || !eTitle.trim()) return;
    try {
      const r: any = await updateMut({ variables: { id: eId, title: eTitle.trim(), description: eDesc.trim() || null, severity: eSeverity, notes: eNotes.trim() || null } });
      if (r.errors?.length) {
        onMessage(r.errors[0].message || "Update failed", "error");
        return;
      }
      onMessage("Issue updated"); setEditing(false); setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Update failed", "error");
    }
  }, [eId, eTitle, eDesc, eSeverity, eNotes, updateMut, refetch, onMessage]);
  const hCancel = useCallback(async (id: number) => {
    try {
      const r: any = await cancelMut({ variables: { id } });
      if (r.errors?.length) {
        onMessage(r.errors[0].message || "Cancel failed", "error");
        return;
      }
      onMessage("Issue cancelled"); setSelectedId(null); setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Cancel failed", "error");
    }
  }, [cancelMut, refetch, onMessage]);
  const hDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    try {
      const r: any = await cancelMut({ variables: { id: deleteConfirmId } });
      if (r.errors?.length) {
        onMessage(r.errors[0].message || "Delete failed", "error");
        return;
      }
      onMessage("Issue deleted"); setDeleteConfirmId(null); setSelectedId(null); setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Delete failed", "error");
    }
  }, [deleteConfirmId, cancelMut, refetch, onMessage]);
  const problemTypeOpts = [{ value: "QUALITY", label: "Quality" }, { value: "SAFETY", label: "Safety" }, { value: "MATERIAL", label: "Material" }, { value: "EQUIPMENT", label: "Equipment" }, { value: "PROCESS", label: "Process" }];
  const iSourceTypeOpts = [{ value: "AUDIT_FINDING", label: "Audit Finding" }, { value: "MANUAL", label: "Manual" }];

  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const renderCreateForm = () => (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-muted/30 dark:to-muted/10">
      <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-background/40 dark:bg-slate-900/40 p-4 space-y-3">
        <div><label className={labelCls}>Type *</label><select value={iType} onChange={(e) => setIType(e.target.value)} className={SEL_INPUT}>{problemTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div><label className={labelCls}>Severity *</label><select value={iSeverity} onChange={(e) => setISeverity(e.target.value)} className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
        <div><label className={labelCls}>Owner</label><input type="text" value={iOwner} onChange={(e) => setIOwner(e.target.value)} className={SEL_INPUT} placeholder="Owner..." /></div>
        <div><label className={labelCls}>Due Date</label><input type="date" value={iDueDate} onChange={(e) => setIDueDate(e.target.value)} className={SEL_INPUT} /></div>
        <div><label className={labelCls}>Source</label><select value={iSourceType} onChange={(e) => setISourceType(e.target.value)} className={SEL_INPUT}>{iSourceTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        {iSourceType !== "MANUAL" && <div><label className={labelCls}>Source ID</label><input type="text" value={iSourceId ?? ""} onChange={(e) => setISourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT} /></div>}
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
        <div><label className={labelCls}>Title *</label><input type="text" value={iTitle} onChange={(e) => setITitle(e.target.value)} className={SEL_INPUT} placeholder="Issue title..." /></div>
        <div><label className={labelCls}>Description</label><textarea value={iDesc} onChange={(e) => setIDesc(e.target.value)} rows={3} className="h-24 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" placeholder="Describe..." /></div>
        <div><label className={labelCls}>Notes</label><textarea value={iNotes} onChange={(e) => setINotes(e.target.value)} rows={2} className="h-16 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
      </div>
    </div>
  );

  const renderEditForm = (item: any) => (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-muted/30 dark:to-muted/10">
      <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-background/40 dark:bg-slate-900/40 p-4 space-y-3">
        <div><label className={labelCls}>Type</label><select value={item.problemType} className={SEL_INPUT + " opacity-60 cursor-not-allowed"} disabled>{problemTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div><label className={labelCls}>Severity *</label><select value={eSeverity} onChange={(e) => setESeverity(e.target.value)} className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
        <div><label className={labelCls}>Status</label><select value={item.status} className={SEL_INPUT + " opacity-60 cursor-not-allowed"} disabled><option value="OPEN">Open</option><option value="IN_REVIEW">In Review</option><option value="CONTAINED">Contained</option><option value="CLOSED">Closed</option><option value="CANCELLED">Cancelled</option></select></div>
        <div><label className={labelCls}>Owner</label><input type="text" value={eOwner} onChange={(e) => setEOwner(e.target.value)} className={SEL_INPUT} /></div>
        <div><label className={labelCls}>Due Date</label><input type="date" value={eDueDate} onChange={(e) => setEDueDate(e.target.value)} className={SEL_INPUT} /></div>
        <div><label className={labelCls}>Source</label><select value={eSourceType} onChange={(e) => setESourceType(e.target.value)} className={SEL_INPUT}>{iSourceTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        {eSourceType !== "MANUAL" && <div><label className={labelCls}>Source ID</label><input type="text" value={eSourceId ?? ""} onChange={(e) => setESourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT} /></div>}
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
        <div><label className={labelCls}>Title *</label><input type="text" value={eTitle} onChange={(e) => setETitle(e.target.value)} className={SEL_INPUT} /></div>
        <div><label className={labelCls}>Description</label><textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} rows={3} className="h-24 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
        <div><label className={labelCls}>Notes</label><textarea value={eNotes} onChange={(e) => setENotes(e.target.value)} rows={2} className="h-16 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
      </div>
    </div>
  );

  const renderDetail = (id: number | null) => {
    if (creating) return renderCreateForm();
    const item = id ? items.find((p: any) => p.id === id) ?? null : null;
    if (editing && item) return renderEditForm(item);
    if (!id) return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center max-w-xs"><h3 className="text-sm font-semibold text-foreground mb-1.5">Quality Issues</h3><p className="text-xs text-muted-foreground/70">Quality-related problems and issues.</p><button onClick={hNew} className="mt-4 inline-flex h-8 items-center gap-1.5 bg-warning px-4 text-sm font-semibold text-primary-foreground hover:bg-warning/80"><Plus className="h-3.5 w-3.5" /> New Issue</button></div>
      </div>
    );
    if (!item) return <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Loading...</div>;

    const statCls = ISSUE_STATUS_STYLES[item.status] || ISSUE_STATUS_STYLES.OPEN;
    const srcLabel = item.sourceType === "AUDIT_FINDING" ? "Audit Finding" : "Manual";
    const hUpdateIssue = async (field: string, val: string) => {
      await updateMut({ variables: { id: item.id, [field]: val || null } });
      onMessage("Updated"); setTimeout(() => refetch(), 200);
    };
    return (
      <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-muted/30 dark:to-muted/10">
        <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
          <div>
            <InlineEditField value={item.title || ""} onSave={(v) => hUpdateIssue("title", v)} label="title" />
            <div className="flex items-center gap-2 mt-1"><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${statCls}`}>{statusLabel(item.status)}</span><InlineEditField type="select" options={[{value:"LOW",label:"Low"},{value:"MEDIUM",label:"Medium"},{value:"HIGH",label:"High"},{value:"CRITICAL",label:"Critical"}]} value={item.severity || "MEDIUM"} onSave={(v) => hUpdateIssue("severity", v)} label="severity" /></div>
          </div>
          <div><p className="text-xs font-medium text-muted-foreground mb-1">Description</p><InlineEditField type="textarea" value={item.description || ""} onSave={(v) => hUpdateIssue("description", v)} label="description" /></div>
          <div><p className="text-xs font-medium text-muted-foreground mb-1">Notes</p><InlineEditField type="textarea" value={item.notes || ""} onSave={(v) => hUpdateIssue("notes", v)} label="notes" /></div>
        </div>
        <div className="w-[35%] shrink-0 border-l border-white/20 dark:border-slate-700/20 bg-background/40 dark:bg-slate-900/40 p-5 space-y-4">
          <div><p className="text-xs font-medium text-muted-foreground mb-2">Status & Severity</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${statCls}`}>{statusLabel(item.status)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Severity</span><InlineEditField type="select" options={[{value:"LOW",label:"Low"},{value:"MEDIUM",label:"Medium"},{value:"HIGH",label:"High"},{value:"CRITICAL",label:"Critical"}]} value={item.severity || "MEDIUM"} onSave={(v) => hUpdateIssue("severity", v)} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{item.problemType || "-"}</span></div>
            </div></div>
          <div><p className="text-xs font-medium text-muted-foreground mb-2">Source</p><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{srcLabel}</span></div></div></div>
          <div><p className="text-xs font-medium text-muted-foreground mb-2">Assignment</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="text-foreground font-medium">{item.reportedBy || item.owner || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="text-foreground">{item.createdAt?.slice(0, 10) || "-"}</span></div>
            </div></div>
        </div>
      </div>
    );
  };

  const renderList = (selId: number | null, onSelect: (id: number | null) => void) => (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
        <span className="text-sm font-medium text-muted-foreground">Issues</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">No issues found</div>
        : <div className="py-0.5">{items.map((p: any) => (
          <div key={p.id} onClick={() => { setCreating(false); setEditing(false); setSelectedId(p.id); onSelect(p.id); }}
            className={`group mx-1 my-0.5 flex items-start gap-2 px-3 py-2.5 cursor-pointer text-sm transition-all border-l-2 ${selId === p.id ? "bg-primary/10 border-l-primary" : "border-l-transparent hover:bg-table-row-hover"}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-semibold text-foreground">{p.title || "Issue"}</span><span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${ISSUE_STATUS_STYLES[p.status] || ISSUE_STATUS_STYLES.OPEN}`}>{statusLabel(p.status)}</span></div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">{p.severity && <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${SEVERITY_STYLES[p.severity] || SEVERITY_STYLES.MEDIUM}`}>{p.severity}</span>}{p.problemType && <span>{p.problemType}</span>}{(p.reportedBy || p.owner) && <span>· {p.reportedBy || p.owner}</span>}</div>
            </div>
          </div>
        ))}</div>}
      </div>
    </div>
  );

  return {
    items,
    selectedId,
    renderList,
    renderDetail,
    creating,
    editing,
    hNew,
    hCreate,
    hEdit,
    hSaveEdit,
    hCancelEdit: () => setEditing(false),
    hCancelNew: () => setCreating(false),
    resetSelection: () => { setSelectedId(null); setEditing(false); setCreating(false); },
    hCancelIssue: hCancel,
    hDelete,
    deleteConfirmId,
    setDeleteConfirmId,
    hRefresh: refetch,
    canSave: iTitle.trim() !== "",
    canSaveEdit: eTitle.trim() !== "",
  };
}
