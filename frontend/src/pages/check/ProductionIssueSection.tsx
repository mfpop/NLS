import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { PROBLEMS_QUERY } from "@/graphql/checkQueries";
import { CREATE_PROBLEM_MUTATION, UPDATE_PROBLEM_MUTATION, CANCEL_PROBLEM_MUTATION } from "@/graphql/checkMutations";
import { RecordListPanel } from "@/components/shared/RecordListPanel";
import { ISSUE_STATUS_STYLES, SEVERITY_STYLES, SEL_INPUT, statusLabel } from "./ProductionStatusStyles.tsx";

export function useProductionIssueSection(
  _search: string,
  filterStatus: string,
  onMessage: (msg: string, tone?: "success" | "error") => void,
  targetFilter: { targetType: string; targetId: number } | null,
  controlArea: string = "PRODUCTION",
) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  // Create form
  const [iTitle, setITitle] = useState("");
  const [iType, setIType] = useState("OPERATIONAL");
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

  // Client-side filter by target
  const items: any[] = useMemo(() => {
    const raw: any[] = data?.problems || [];
    if (!targetFilter) return raw;
    return raw.filter((p: any) => p.targetType === targetFilter.targetType && String(p.targetId) === String(targetFilter.targetId));
  }, [data, targetFilter]);

  const [createMut] = useMutation<any>(CREATE_PROBLEM_MUTATION);
  const [updateMut] = useMutation<any>(UPDATE_PROBLEM_MUTATION);
  const [cancelMut] = useMutation<any>(CANCEL_PROBLEM_MUTATION);

  const hNew = useCallback(() => {
    setCreating(true); setEditing(false); setSelectedId(null);
    setITitle(""); setIType("OPERATIONAL"); setISeverity("MEDIUM"); setIDesc(""); setIOwner(""); setIDueDate(""); setISourceType("MANUAL"); setISourceId(null); setINotes("");
  }, []);
  const hCreate = useCallback(async () => {
    if (!iTitle.trim()) return;
    try {
      const r: any = await createMut({
        variables: {
          title: iTitle.trim(), problemType: iType, severity: iSeverity, description: iDesc || null,
          reportedBy: iOwner || null, sourceType: iSourceType === "MANUAL" ? null : iSourceType,
          sourceId: iSourceType === "MANUAL" ? null : iSourceId, notes: iNotes || null,
          controlArea, targetType: targetFilter?.targetType || "PLANT", targetId: targetFilter?.targetId || null,
        },
      });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Failed to create issue", "error");
        return;
      }
      if (!r.data) {
        onMessage("Failed to create issue - unexpected response", "error");
        return;
      }
      onMessage("Issue created");
      setCreating(false);
      setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Failed to create issue", "error");
    }
  }, [iTitle, iType, iSeverity, iDesc, iOwner, iSourceType, iSourceId, iNotes, createMut, controlArea, targetFilter, refetch, onMessage]);

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
        onMessage(r.errors[0]?.message || "Failed to update issue", "error");
        return;
      }
      if (!r.data) {
        onMessage("Failed to update issue - unexpected response", "error");
        return;
      }
      onMessage("Issue updated");
      setEditing(false);
      setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Failed to update issue", "error");
    }
  }, [eId, eTitle, eDesc, eSeverity, eNotes, updateMut, refetch, onMessage]);
  const hCancel = useCallback(async (id: number) => {
    try {
      const r: any = await cancelMut({ variables: { id } });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Failed to cancel issue", "error");
        return;
      }
      if (!r.data) {
        onMessage("Failed to cancel issue - unexpected response", "error");
        return;
      }
      onMessage("Issue cancelled");
      setSelectedId(null);
      setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Failed to cancel issue", "error");
    }
  }, [cancelMut, refetch, onMessage]);
  const hDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    try {
      const r: any = await cancelMut({ variables: { id: deleteConfirmId } });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Failed to delete issue", "error");
        return;
      }
      if (!r.data) {
        onMessage("Failed to delete issue - unexpected response", "error");
        return;
      }
      onMessage("Issue deleted");
      setDeleteConfirmId(null);
      setSelectedId(null);
      setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Failed to delete issue", "error");
    }
  }, [deleteConfirmId, cancelMut, refetch, onMessage]);

  const problemTypeOpts = [{ value: "OPERATIONAL", label: "Operational" }, { value: "QUALITY", label: "Quality" }, { value: "SAFETY", label: "Safety" }, { value: "MATERIAL", label: "Material" }, { value: "MAINTENANCE", label: "Maintenance" }];
  const iSourceTypeOpts = [{ value: "AUDIT_FINDING", label: "Audit Finding" }, { value: "MANUAL", label: "Manual" }];
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const renderCreateForm = () => (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
      <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-4 space-y-3">
        <div><label className={labelCls}>Type *</label><select value={iType} onChange={(e) => setIType(e.target.value)} aria-label="Issue type" className={SEL_INPUT}>{problemTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div><label className={labelCls}>Severity *</label><select value={iSeverity} onChange={(e) => setISeverity(e.target.value)} aria-label="Severity" className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
        <div><label className={labelCls}>Owner</label><input type="text" value={iOwner} onChange={(e) => setIOwner(e.target.value)} className={SEL_INPUT} placeholder="Owner..." aria-label="Issue owner" /></div>
        <div><label className={labelCls}>Due Date</label><input type="date" value={iDueDate} onChange={(e) => setIDueDate(e.target.value)} className={SEL_INPUT} /></div>
        <div><label className={labelCls}>Source</label><select value={iSourceType} onChange={(e) => setISourceType(e.target.value)} aria-label="Source" className={SEL_INPUT}>{iSourceTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        {iSourceType !== "MANUAL" && <div><label className={labelCls}>Source ID</label><input type="text" value={iSourceId ?? ""} onChange={(e) => setISourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT} /></div>}
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
        <div><label className={labelCls}>Title *</label><input type="text" value={iTitle} onChange={(e) => setITitle(e.target.value)} className={SEL_INPUT} placeholder="Issue title..." /></div>
        <div><label className={labelCls}>Description</label><textarea value={iDesc} onChange={(e) => setIDesc(e.target.value)} rows={3} className="h-24 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" placeholder="Describe..." /></div>
        <div><label className={labelCls}>Notes</label><textarea value={iNotes} onChange={(e) => setINotes(e.target.value)} rows={2} className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
      </div>
    </div>
  );

  const renderEditForm = (item: any) => (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
      <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-4 space-y-3">
        <div><label className={labelCls}>Type</label><select value={item.problemType} className={SEL_INPUT + " opacity-60 cursor-not-allowed"} disabled>{problemTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div><label className={labelCls}>Severity *</label><select value={eSeverity} onChange={(e) => setESeverity(e.target.value)} className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
        <div><label className={labelCls}>Status</label><select value={item.status} className={SEL_INPUT + " opacity-60 cursor-not-allowed"} disabled><option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option><option value="CANCELLED">Cancelled</option></select></div>
        <div><label className={labelCls}>Owner</label><input type="text" value={eOwner} onChange={(e) => setEOwner(e.target.value)} className={SEL_INPUT} /></div>
        <div><label className={labelCls}>Due Date</label><input type="date" value={eDueDate} onChange={(e) => setEDueDate(e.target.value)} className={SEL_INPUT} /></div>
        <div><label className={labelCls}>Source</label><select value={eSourceType} onChange={(e) => setESourceType(e.target.value)} className={SEL_INPUT}>{iSourceTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        {eSourceType !== "MANUAL" && <div><label className={labelCls}>Source ID</label><input type="text" value={eSourceId ?? ""} onChange={(e) => setESourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT} /></div>}
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
        <div><label className={labelCls}>Title *</label><input type="text" value={eTitle} onChange={(e) => setETitle(e.target.value)} className={SEL_INPUT} /></div>
        <div><label className={labelCls}>Description</label><textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} rows={3} className="h-24 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
        <div><label className={labelCls}>Notes</label><textarea value={eNotes} onChange={(e) => setENotes(e.target.value)} rows={2} className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
      </div>
    </div>
  );

  const renderDetail = (id: number | null) => {
    if (creating) return renderCreateForm();
    const item = id ? items.find((p: any) => p.id === id) ?? null : null;
    if (editing && item) return renderEditForm(item);
    if (!id) return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center max-w-xs"><h3 className="text-sm font-semibold text-foreground mb-1.5">Production Issues</h3><p className="text-xs text-muted-foreground/70">Operational issues and problems.</p><button onClick={hNew} className="mt-4 inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"><Plus className="h-3.5 w-3.5" /> New Issue</button></div>
      </div>
    );
    if (!item) return <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Loading...</div>;

    const sevCls = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.MEDIUM;
    const statCls = ISSUE_STATUS_STYLES[item.status] || ISSUE_STATUS_STYLES.OPEN;
    const srcLabel = item.sourceType === "AUDIT_FINDING" ? "Audit Finding" : "Manual";
    return (
      <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
        <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
          <div><h2 className="text-base font-bold text-foreground">{item.title || "Issue"}</h2>
            <div className="flex items-center gap-2 mt-1"><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${statCls}`}>{statusLabel(item.status)}</span>{item.severity && <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${sevCls}`}>{item.severity}</span>}</div></div>
          {item.description && <div><p className="text-xs font-medium text-muted-foreground mb-1">Description</p><p className="text-sm text-foreground">{item.description}</p></div>}
          {item.notes && <div><p className="text-xs font-medium text-muted-foreground mb-1">Notes</p><p className="text-sm text-foreground">{item.notes}</p></div>}
        </div>
        <div className="w-[35%] shrink-0 border-l border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-5 space-y-4">
          <div><p className="text-xs font-medium text-muted-foreground mb-2">Status & Severity</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${statCls}`}>{statusLabel(item.status)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Severity</span><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${sevCls}`}>{item.severity || "-"}</span></div>
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
    <RecordListPanel
      title="Issues"
      records={items}
      selectedId={selId !== null ? String(selId) : null}        onSelect={(id) => { const nid = Number(id); setCreating(false); setEditing(false); setSelectedId(nid); onSelect(nid); }}
      getId={(p: any) => String(p.id)}
      emptyMessage="No issues found"
      className="border-0 bg-transparent h-full"        renderRecord={(p: any, _selected) => (
        <>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{p.title || "Issue"}</span>
            <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${ISSUE_STATUS_STYLES[p.status] || ISSUE_STATUS_STYLES.OPEN}`}>{statusLabel(p.status)}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
            {p.severity && <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${SEVERITY_STYLES[p.severity] || SEVERITY_STYLES.MEDIUM}`}>{p.severity}</span>}
            {p.problemType && <span>{p.problemType}</span>}
            {(p.reportedBy || p.owner) && <span>· {p.reportedBy || p.owner}</span>}
          </div>
        </>
      )}
    />
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
    hCancelNew: () => { setCreating(false); setSelectedId(null); },
    hCancelIssue: hCancel,
    hDelete,
    deleteConfirmId,
    setDeleteConfirmId,
    hRefresh: refetch,
    canSave: iTitle.trim() !== "",
    canSaveEdit: eTitle.trim() !== "",
  };
}
