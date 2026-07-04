import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { ACTIONS_QUERY } from "@/graphql/checkQueries";
import { CREATE_ACTION_MUTATION, UPDATE_ACTION_MUTATION, COMPLETE_ACTION_MUTATION, CANCEL_ACTION_MUTATION } from "@/graphql/checkMutations";
import { ACTION_STATUS_STYLES, PRIORITY_STYLES, SEL_INPUT, statusLabel } from "./QualityStatusStyles";
import { InlineEditField } from "./InlineEditField";

export function useActionSection(_search: string, filterStatus: string, onMessage: (msg: string, tone?: "success" | "error") => void, controlArea: string = "QUALITY") {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  // Create form
  const [aTitle, setATitle] = useState("");
  const [aPriority, setAPriority] = useState("MEDIUM");
  const [aOwner, setAOwner] = useState("");
  const [aDueDate, setADueDate] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aSourceType, setASourceType] = useState("MANUAL");
  const [aSourceId, setASourceId] = useState<number | null>(null);
  const [aNotes, setANotes] = useState("");

  // Edit form
  const [eId, setEId] = useState<number | null>(null);
  const [eTitle, setETitle] = useState("");
  const [ePriority, setEPriority] = useState("MEDIUM");
  const [eOwner, setEOwner] = useState("");
  const [eDueDate, setEDueDate] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eSourceType, setESourceType] = useState("MANUAL");
  const [eSourceId, setESourceId] = useState<number | null>(null);
  const [eNotes, setENotes] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const qVars = useMemo(() => ({ controlArea, status: filterStatus || null } as const), [controlArea, filterStatus]);
  const { data, refetch } = useQuery<any>(ACTIONS_QUERY, { variables: qVars, fetchPolicy: "cache-and-network" });
  const items: any[] = data?.actions || [];

  const [createMut] = useMutation<any>(CREATE_ACTION_MUTATION);
  const [updateMut] = useMutation<any>(UPDATE_ACTION_MUTATION);
  const [completeMut] = useMutation<any>(COMPLETE_ACTION_MUTATION);
  const [cancelMut] = useMutation<any>(CANCEL_ACTION_MUTATION);

  const hNew = useCallback(() => {
    setCreating(true); setEditing(false); setSelectedId(null);
    setATitle(""); setAPriority("MEDIUM"); setAOwner(""); setADueDate(""); setADesc(""); setASourceType("MANUAL"); setASourceId(null); setANotes("");
  }, []);
  const hCreate = useCallback(async () => {
    if (!aTitle.trim()) return;
    try {
      const r: any = await createMut({ variables: { title: aTitle.trim(), description: aDesc || null, owner: aOwner || null, dueDate: aDueDate || null, priority: aPriority, sourceType: aSourceType === "MANUAL" ? null : aSourceType, sourceId: aSourceType === "MANUAL" ? null : aSourceId, controlArea: controlArea || null, notes: aNotes || null } });
      if (r.errors?.length) { onMessage(r.errors[0].message || "Save failed", "error"); return; }
      if (!r.data) { onMessage("Save failed - unexpected response", "error"); return; }
      onMessage("Action created"); setCreating(false); refetch();
    } catch (e: any) {
      onMessage(e?.message || "Save failed", "error");
    }
  }, [aTitle, aDesc, aOwner, aDueDate, aPriority, aSourceType, aSourceId, controlArea, aNotes, createMut, refetch, onMessage]);

  const hEdit = useCallback((item: any) => {
    setEId(item.id); setEditing(true); setCreating(false);
    setETitle(item.title || ""); setEPriority(item.priority || "MEDIUM"); setEOwner(item.owner || "");
    setEDueDate(item.dueDate || ""); setEDesc(item.description || ""); setENotes(item.notes || "");
    setESourceType(item.sourceType === "PROBLEM" ? "ISSUE" : item.sourceType === "AUDIT_FINDING" ? "AUDIT_FINDING" : "MANUAL");
    setESourceId(item.sourceId || null);
  }, []);
  const hSaveEdit = useCallback(async () => {
    if (!eId || !eTitle.trim()) return;
    try {
      const r: any = await updateMut({ variables: { id: eId, title: eTitle.trim(), description: eDesc.trim() || null, owner: eOwner.trim() || null, priority: ePriority } });
      if (r.errors?.length) { onMessage(r.errors[0].message || "Update failed", "error"); return; }
      if (!r.data) { onMessage("Update failed - unexpected response", "error"); return; }
      onMessage("Action updated"); setEditing(false); setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Update failed", "error");
    }
  }, [eId, eTitle, eDesc, eOwner, ePriority, updateMut, refetch, onMessage]);
  const hComplete = useCallback(async (id: number) => {
    try {
      const r: any = await completeMut({ variables: { id } });
      if (r.errors?.length) { onMessage(r.errors[0].message || "Complete failed", "error"); return; }
      if (!r.data) { onMessage("Complete failed - unexpected response", "error"); return; }
      onMessage("Action completed"); setSelectedId(null); setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Complete failed", "error");
    }
  }, [completeMut, refetch, onMessage]);
  const hCancel = useCallback(async (id: number) => {
    try {
      const r: any = await cancelMut({ variables: { id } });
      if (r.errors?.length) { onMessage(r.errors[0].message || "Cancel failed", "error"); return; }
      if (!r.data) { onMessage("Cancel failed - unexpected response", "error"); return; }
      onMessage("Action cancelled"); setSelectedId(null); setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Cancel failed", "error");
    }
  }, [cancelMut, refetch, onMessage]);
  const hDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    try {
      const r: any = await cancelMut({ variables: { id: deleteConfirmId } });
      if (r.errors?.length) { onMessage(r.errors[0].message || "Delete failed", "error"); return; }
      if (!r.data) { onMessage("Delete failed - unexpected response", "error"); return; }
      onMessage("Action deleted"); setDeleteConfirmId(null); setSelectedId(null); setTimeout(() => refetch(), 200);
    } catch (e: any) {
      onMessage(e?.message || "Delete failed", "error");
    }
  }, [deleteConfirmId, cancelMut, refetch, onMessage]);

  const sourceTypeOpts = [{ value: "ISSUE", label: "Issue" }, { value: "AUDIT_FINDING", label: "Audit Finding" }, { value: "MANUAL", label: "Manual" }];
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const renderCreateForm = () => (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-muted/30 dark:to-muted/10">
      <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-background/40 dark:bg-slate-900/40 p-4 space-y-3">
        <div><label className={labelCls}>Source</label><select value={aSourceType} onChange={(e) => setASourceType(e.target.value)} className={SEL_INPUT}>{sourceTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        {aSourceType !== "MANUAL" && <div><label className={labelCls}>Source ID</label><input type="text" value={aSourceId ?? ""} onChange={(e) => setASourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT} placeholder="ID..." /></div>}
        <div><label className={labelCls}>Priority *</label><select value={aPriority} onChange={(e) => setAPriority(e.target.value)} className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
        <div><label className={labelCls}>Owner</label><input type="text" value={aOwner} onChange={(e) => setAOwner(e.target.value)} className={SEL_INPUT} placeholder="Owner..." /></div>
        <div><label className={labelCls}>Due Date</label><input type="date" value={aDueDate} onChange={(e) => setADueDate(e.target.value)} className={SEL_INPUT} /></div>
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
        <div><label className={labelCls}>Title *</label><input type="text" value={aTitle} onChange={(e) => setATitle(e.target.value)} className={SEL_INPUT} placeholder="Action title..." /></div>
        <div><label className={labelCls}>Description</label><textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} rows={3} className="h-24 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" placeholder="Describe..." /></div>
        <div><label className={labelCls}>Notes</label><textarea value={aNotes} onChange={(e) => setANotes(e.target.value)} rows={2} className="h-16 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
      </div>
    </div>
  );

  const renderEditForm = (item: any) => (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-muted/30 dark:to-muted/10">
      <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-background/40 dark:bg-slate-900/40 p-4 space-y-3">
        <div><label className={labelCls}>Source</label><select value={eSourceType} onChange={(e) => setESourceType(e.target.value)} className={SEL_INPUT}>{sourceTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        {eSourceType !== "MANUAL" && <div><label className={labelCls}>Source ID</label><input type="text" value={eSourceId ?? ""} onChange={(e) => setESourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT} /></div>}
        <div><label className={labelCls}>Priority *</label><select value={ePriority} onChange={(e) => setEPriority(e.target.value)} className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
        <div><label className={labelCls}>Status</label><select value={item.status} className={SEL_INPUT + " opacity-60 cursor-not-allowed"} disabled><option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></div>
        <div><label className={labelCls}>Owner</label><input type="text" value={eOwner} onChange={(e) => setEOwner(e.target.value)} className={SEL_INPUT} /></div>
        <div><label className={labelCls}>Due Date</label><input type="date" value={eDueDate} onChange={(e) => setEDueDate(e.target.value)} className={SEL_INPUT} /></div>
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
    const item = id ? items.find((a: any) => a.id === id) ?? null : null;
    if (editing && item) return renderEditForm(item);
    if (!id) return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center max-w-xs"><h3 className="text-sm font-semibold text-foreground mb-1.5">Quality Actions</h3><p className="text-xs text-muted-foreground/70">Corrective and preventive actions.</p><button onClick={hNew} className="mt-4 inline-flex h-8 items-center gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent/80"><Plus className="h-3.5 w-3.5" /> New Action</button></div>
      </div>
    );
    if (!item) return <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Loading...</div>;

    const srcLabel = item.sourceType === "PROBLEM" ? "Issue" : item.sourceType === "AUDIT_FINDING" ? "Audit Finding" : "Manual";
    const statCls = ACTION_STATUS_STYLES[item.status] || ACTION_STATUS_STYLES.OPEN;
    const hUpdateAction = async (field: string, val: string) => {
      try {
        const r: any = await updateMut({ variables: { id: item.id, [field]: val || null } });
        if (r.errors?.length) { onMessage(r.errors[0].message || "Update failed", "error"); return; }
        if (!r.data) { onMessage("Update failed - unexpected response", "error"); return; }
        onMessage("Updated"); setTimeout(() => refetch(), 200);
      } catch (e: any) {
        onMessage(e?.message || "Update failed", "error");
      }
    };
    return (
      <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-muted/30 dark:to-muted/10">
        <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
          <div>
            <InlineEditField value={item.title} onSave={(v) => hUpdateAction("title", v)} label="title" />
            <div className="flex items-center gap-2 mt-1"><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${statCls}`}>{statusLabel(item.status)}</span><InlineEditField type="select" options={[{value:"LOW",label:"Low"},{value:"MEDIUM",label:"Medium"},{value:"HIGH",label:"High"},{value:"CRITICAL",label:"Critical"}]} value={item.priority || "MEDIUM"} onSave={(v) => hUpdateAction("priority", v)} label="priority" /></div>
          </div>
          <div><p className="text-xs font-medium text-muted-foreground mb-1">Description</p><InlineEditField type="textarea" value={item.description || ""} onSave={(v) => hUpdateAction("description", v)} label="description" /></div>
          <div><p className="text-xs font-medium text-muted-foreground mb-1">Notes</p><InlineEditField type="textarea" value={item.notes || ""} onSave={(v) => hUpdateAction("notes", v)} label="notes" /></div>
        </div>
        <div className="w-[35%] shrink-0 border-l border-white/20 dark:border-slate-700/20 bg-background/40 dark:bg-slate-900/40 p-5 space-y-4">
          <div><p className="text-xs font-medium text-muted-foreground mb-2">Details</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${statCls}`}>{statusLabel(item.status)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><InlineEditField type="select" options={[{value:"LOW",label:"Low"},{value:"MEDIUM",label:"Medium"},{value:"HIGH",label:"High"},{value:"CRITICAL",label:"Critical"}]} value={item.priority || "MEDIUM"} onSave={(v) => hUpdateAction("priority", v)} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="text-foreground font-medium">{srcLabel}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><InlineEditField value={item.owner || ""} onSave={(v) => hUpdateAction("owner", v)} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span className="text-foreground">{item.dueDate || "-"}</span></div>
            </div></div>
        </div>
      </div>
    );
  };

  const renderList = (selId: number | null, onSelect: (id: number | null) => void) => (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
        <span className="text-sm font-medium text-muted-foreground">Actions</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">No actions found</div>
        : <div className="py-0.5">{items.map((a: any) => (
          <div key={a.id} onClick={() => { setCreating(false); setEditing(false); setSelectedId(a.id); onSelect(a.id); }}
            className={`group mx-1 my-0.5 flex items-start gap-2 px-3 py-2.5 cursor-pointer text-sm transition-all border-l-2 ${selId === a.id ? "bg-primary/10 border-l-primary" : "border-l-transparent hover:bg-table-row-hover"}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-semibold text-foreground">{a.title}</span><span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${ACTION_STATUS_STYLES[a.status] || ACTION_STATUS_STYLES.OPEN}`}>{statusLabel(a.status)}</span></div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">{a.priority && <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.MEDIUM}`}>{a.priority}</span>}{a.owner && <span>· {a.owner}</span>}{a.dueDate && <span>· {a.dueDate}</span>}</div>
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
    hCompleteAction: hComplete,
    hCancelAction: hCancel,
    hDelete,
    deleteConfirmId,
    setDeleteConfirmId,
    hRefresh: refetch,
    canSave: aTitle.trim() !== "",
    canSaveEdit: eTitle.trim() !== "",
  };
}
