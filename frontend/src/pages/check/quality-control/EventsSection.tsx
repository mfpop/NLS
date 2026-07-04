import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { SAFETY_EVENTS_QUERY } from "@/graphql/checkQueries";
import { CREATE_SAFETY_EVENT_MUTATION, UPDATE_SAFETY_EVENT_MUTATION, REPORT_SAFETY_EVENT_MUTATION, REVIEW_SAFETY_EVENT_MUTATION, CLOSE_SAFETY_EVENT_MUTATION, CANCEL_SAFETY_EVENT_MUTATION } from "@/graphql/checkMutations";
import { SEL_INPUT } from "./QualityStatusStyles";

const EVENT_TYPE_OPTS = [
  { value: "INCIDENT", label: "Incident" },
  { value: "ACCIDENT", label: "Accident" },
  { value: "NEAR_MISS", label: "Near Miss" },
  { value: "HAZARD", label: "Hazard" },
  { value: "OBSERVATION", label: "Observation" },
];

const SEVERITY_OPTS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const SEVERITY_DOT: Record<string, string> = {
  LOW: "bg-muted-foreground/40", MEDIUM: "bg-warning/100", HIGH: "bg-warning/100", CRITICAL: "bg-danger/100",
};

const EVENT_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  REPORTED: "bg-primary/15 text-primary border-primary/20",
  UNDER_REVIEW: "bg-warning/15 text-warning border-warning/20",
  ACTION_REQUIRED: "bg-warning/15 text-warning border-warning/20",
  CLOSED: "bg-success/15 text-success border-success/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useEventSection(_search: string, filterStatus: string, onMessage: (msg: string, tone?: "success" | "error") => void) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Create form state
  const [cType, setCType] = useState("INCIDENT");
  const [cSeverity, setCSeverity] = useState("MEDIUM");
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cReportedBy, setCReportedBy] = useState("");
  const [cOccurredAt, setCOccurredAt] = useState("");
  const [cLocation, setCLocation] = useState("");
  const [cImmediateAction, setCImmediateAction] = useState("");
  const [cInjury, setCInjury] = useState(false);
  const [cProperty, setCProperty] = useState(false);
  const [cEnvironmental, setCEnvironmental] = useState(false);
  const [cOwner, setCOwner] = useState("");
  const [cNotes, setCNotes] = useState("");

  const qVars = useMemo(() => ({ status: filterStatus || null } as const), [filterStatus]);
  const { data, refetch } = useQuery<any>(SAFETY_EVENTS_QUERY, { variables: qVars, fetchPolicy: "cache-and-network" });
  const items: any[] = data?.safetyEvents || [];

  const [createMut] = useMutation<any>(CREATE_SAFETY_EVENT_MUTATION);
  const [updateMut] = useMutation<any>(UPDATE_SAFETY_EVENT_MUTATION);
  const [reportMut] = useMutation<any>(REPORT_SAFETY_EVENT_MUTATION);
  const [reviewMut] = useMutation<any>(REVIEW_SAFETY_EVENT_MUTATION);
  const [closeMut] = useMutation<any>(CLOSE_SAFETY_EVENT_MUTATION);
  const [cancelMut] = useMutation<any>(CANCEL_SAFETY_EVENT_MUTATION);

  const hNew = useCallback(() => {
    setCreating(true); setEditing(false); setSelectedId(null);
    setCType("INCIDENT"); setCSeverity("MEDIUM"); setCTitle(""); setCDesc("");
    setCReportedBy(""); setCOccurredAt(""); setCLocation(""); setCImmediateAction("");
    setCInjury(false); setCProperty(false); setCEnvironmental(false); setCOwner(""); setCNotes("");
  }, []);

  const hCreate = useCallback(async () => {
    if (!cTitle.trim()) return;
    try {
      await createMut({ variables: {
        title: cTitle.trim(), eventType: cType, targetType: "PLANT", targetId: null,
        severity: cSeverity, description: cDesc || null, reportedBy: cReportedBy || null,
        occurredAt: cOccurredAt || null, locationText: cLocation || null,
        immediateAction: cImmediateAction || null,
        injuryInvolved: cInjury, propertyDamage: cProperty, environmentalImpact: cEnvironmental,
        owner: cOwner || null, notes: cNotes || null,
      }});
      onMessage("Safety event created"); setCreating(false); refetch();
    } catch (e: any) { onMessage(e?.message || "Create failed", "error"); }
  }, [cTitle, cType, cSeverity, cDesc, cReportedBy, cOccurredAt, cLocation, cImmediateAction, cInjury, cProperty, cEnvironmental, cOwner, cNotes, createMut, refetch, onMessage]);

  const hEdit = useCallback((item: any) => {
    setEditItem(item); setEditing(true); setCreating(false);
  }, []);

  const hSaveEdit = useCallback(async () => {
    if (!editItem) return;
    try {
      await updateMut({ variables: { id: editItem.id, title: editItem.title, description: editItem.description, severity: editItem.severity, owner: editItem.owner, notes: editItem.notes } });
      onMessage("Updated"); setEditing(false); refetch();
    } catch (e: any) { onMessage(e?.message || "Update failed", "error"); }
  }, [editItem, updateMut, refetch, onMessage]);

  const hReview = useCallback(async (id: number) => {
    try { await reviewMut({ variables: { id } }); onMessage("Event moved to Under Review"); refetch(); }
    catch (e: any) { onMessage(e?.message || "Review failed", "error"); }
  }, [reviewMut, refetch, onMessage]);

  const hReport = useCallback(async (id: number) => {
    try { await reportMut({ variables: { id } }); onMessage("Event reported"); refetch(); }
    catch (e: any) { onMessage(e?.message || "Report failed", "error"); }
  }, [reportMut, refetch, onMessage]);

  const hClose = useCallback(async (id: number) => {
    try { await closeMut({ variables: { id } }); onMessage("Event closed"); refetch(); }
    catch (e: any) { onMessage(e?.message || "Close failed", "error"); }
  }, [closeMut, refetch, onMessage]);

  const hDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    try { await cancelMut({ variables: { id: deleteConfirmId } }); onMessage("Event cancelled"); setDeleteConfirmId(null); setSelectedId(null); refetch(); }
    catch (e: any) { onMessage(e?.message || "Cancel failed", "error"); }
  }, [deleteConfirmId, cancelMut, refetch, onMessage]);

  const hCancelNew = useCallback(() => setCreating(false), []);
  const hCancelEdit = useCallback(() => setEditing(false), []);
  const resetSelection = useCallback(() => { setSelectedId(null); setEditing(false); setCreating(false); }, []);

  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const renderCreateForm = () => (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      <div className="w-[28%] shrink-0 overflow-y-auto border-r border-border/20 bg-card/40 p-4 space-y-3">
        <div><label className={labelCls}>Event Type *</label><select value={cType} onChange={(e) => setCType(e.target.value)} className={SEL_INPUT}>{EVENT_TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div><label className={labelCls}>Severity *</label><select value={cSeverity} onChange={(e) => setCSeverity(e.target.value)} className={SEL_INPUT}>{SEVERITY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div><label className={labelCls}>Reported By</label><input type="text" value={cReportedBy} onChange={(e) => setCReportedBy(e.target.value)} className={SEL_INPUT} placeholder="Reporter..." /></div>
        <div><label className={labelCls}>Owner</label><input type="text" value={cOwner} onChange={(e) => setCOwner(e.target.value)} className={SEL_INPUT} placeholder="Owner..." /></div>
        <div><label className={labelCls}>Occurred At</label><input type="datetime-local" value={cOccurredAt} onChange={(e) => setCOccurredAt(e.target.value)} className={SEL_INPUT} /></div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer"><input type="checkbox" checked={cInjury} onChange={(e) => setCInjury(e.target.checked)} className="h-3.5 w-3.5" /> Injury Involved</label>
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer"><input type="checkbox" checked={cProperty} onChange={(e) => setCProperty(e.target.checked)} className="h-3.5 w-3.5" /> Property Damage</label>
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer"><input type="checkbox" checked={cEnvironmental} onChange={(e) => setCEnvironmental(e.target.checked)} className="h-3.5 w-3.5" /> Environmental Impact</label>
        </div>
        <div><label className={labelCls}>Location</label><input type="text" value={cLocation} onChange={(e) => setCLocation(e.target.value)} className={SEL_INPUT} placeholder="Area / equipment..." /></div>
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
        <div><label className={labelCls}>Title *</label><input type="text" value={cTitle} onChange={(e) => setCTitle(e.target.value)} className={SEL_INPUT} placeholder="Event title..." /></div>
        <div><label className={labelCls}>Description</label><textarea value={cDesc} onChange={(e) => setCDesc(e.target.value)} rows={4} className="w-full border border-border/30 bg-card px-2 py-1 text-xs outline-none resize-none" placeholder="Describe what happened..." /></div>
        <div><label className={labelCls}>Immediate Action Taken</label><textarea value={cImmediateAction} onChange={(e) => setCImmediateAction(e.target.value)} rows={2} className="w-full border border-border/30 bg-card px-2 py-1 text-xs outline-none resize-none" placeholder="Containment or immediate response..." /></div>
        <div><label className={labelCls}>Notes</label><textarea value={cNotes} onChange={(e) => setCNotes(e.target.value)} rows={2} className="w-full border border-border/30 bg-card px-2 py-1 text-xs outline-none resize-none" /></div>
      </div>
    </div>
  );

  const renderDetail = (id: number | null) => {
    if (creating) return renderCreateForm();
    const item = id ? items.find((e: any) => e.id === id) ?? null : null;
    if (editing && editItem) return renderCreateForm();
    if (!id) return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center max-w-xs"><h3 className="text-sm font-semibold text-foreground mb-1.5">Safety Events</h3><p className="text-xs text-muted-foreground/70">Record incidents, accidents, near misses, hazards, and observations.</p><button onClick={hNew} className="mt-4 inline-flex h-8 items-center gap-1.5 bg-warning px-4 text-sm font-semibold text-white hover:bg-warning/80"><Plus className="h-3.5 w-3.5" /> New Event</button></div>
      </div>
    );
    if (!item) return <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Loading...</div>;

    const stCls = EVENT_STATUS_STYLES[item.status] || EVENT_STATUS_STYLES.DRAFT;
    return (
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">{item.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${stCls}`}>{statusLabel(item.status)}</span>
              <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border bg-muted text-muted-foreground border-border`}>{EVENT_TYPE_OPTS.find((o) => o.value === item.eventType)?.label || item.eventType}</span>
              <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${item.severity === "CRITICAL" ? "bg-danger/15 text-danger border-danger/20" : item.severity === "HIGH" ? "bg-warning/15 text-warning border-warning/20" : item.severity === "MEDIUM" ? "bg-warning/15 text-warning border-warning/20" : "bg-muted text-muted-foreground border-border"}`}>{item.severity}</span>
            </div>
          </div>
          {item.description && <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Description</p><p className="text-sm text-foreground">{item.description}</p></div>}
          {item.immediateAction && <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Immediate Action</p><p className="text-sm text-foreground">{item.immediateAction}</p></div>}
          <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Flags</p><div className="flex gap-2 text-xs">{item.injuryInvolved && <span className="bg-danger/10 text-danger px-1.5 py-0.5 border border-danger/20">Injury</span>}{item.propertyDamage && <span className="bg-warning/10 text-warning px-1.5 py-0.5 border border-warning/20">Property Damage</span>}{item.environmentalImpact && <span className="bg-success/10 text-success px-1.5 py-0.5 border border-success/20">Environmental</span>}{!item.injuryInvolved && !item.propertyDamage && !item.environmentalImpact && <span className="text-muted-foreground italic">None reported</span>}</div></div>
        </div>
        <div className="w-[30%] shrink-0 border-l border-border/20 bg-card/40 p-5 space-y-4">
          <div><p className="text-[10px] font-medium text-muted-foreground mb-2">Details</p><div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Event Type</span><span className="text-foreground font-medium">{EVENT_TYPE_OPTS.find((o) => o.value === item.eventType)?.label || item.eventType}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Severity</span><span className="text-foreground font-medium">{item.severity}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-foreground font-medium">{statusLabel(item.status)}</span></div></div></div>
          <div><p className="text-[10px] font-medium text-muted-foreground mb-2">People & Time</p><div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Reported By</span><span className="text-foreground">{item.reportedBy || "-"}</span></div>{item.owner && <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="text-foreground">{item.owner}</span></div>}<div className="flex justify-between"><span className="text-muted-foreground">Reported</span><span className="text-foreground">{item.reportedAt?.slice(0, 10) || "-"}</span></div>{item.occurredAt && <div className="flex justify-between"><span className="text-muted-foreground">Occurred</span><span className="text-foreground">{item.occurredAt?.slice(0, 10) || "-"}</span></div>}</div></div>
          {item.locationText && <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Location</p><p className="text-xs text-foreground">{item.locationText}</p></div>}
          {item.notes && <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Notes</p><p className="text-xs text-foreground/70">{item.notes}</p></div>}
        </div>
      </div>
    );
  };

  const renderList = (selId: number | null, onSelect: (id: number | null) => void) => (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
        <span className="text-sm font-medium text-muted-foreground">Events</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">No safety events reported</div>
        : <div className="py-0.5">{items.map((e: any) => (
          <div key={e.id} onClick={() => { setCreating(false); setEditing(false); setSelectedId(e.id); onSelect(e.id); }}
            className={`group mx-1 my-0.5 flex items-start gap-2 px-3 py-2 cursor-pointer text-sm transition-all border-l-2 ${selId === e.id ? "bg-warning/10 border-l-warning" : "border-l-transparent hover:bg-table-row-hover"}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[e.severity] || "bg-slate-400"}`} />
                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{e.title || "Event"}</span>
                <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${EVENT_STATUS_STYLES[e.status] || EVENT_STATUS_STYLES.DRAFT}`}>{statusLabel(e.status)}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                <span>{EVENT_TYPE_OPTS.find((o) => o.value === e.eventType)?.label || e.eventType}</span>
                {e.reportedBy && <span>· {e.reportedBy}</span>}
                {e.occurredAt && <span>· {e.occurredAt.slice(0, 10)}</span>}
              </div>
            </div>
          </div>
        ))}</div>}
      </div>
    </div>
  );

  return {
    items, selectedId, renderList, renderDetail,
    creating, editing, hNew, hCreate, hEdit, hSaveEdit, hCancelNew, hCancelEdit,
    resetSelection, hReport, hReview, hClose, hDelete, deleteConfirmId, setDeleteConfirmId,
    hRefresh: refetch, canSave: cTitle.trim() !== "", canSaveEdit: true,
  };
}
