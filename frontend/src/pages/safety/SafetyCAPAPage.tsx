import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { CheckCircle, Plus, Save, Ban, Play, Search, Pencil, ArrowLeft, RefreshCw, Target, RotateCcw, XCircle } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar, ToolbarButton, ToolbarDropdown, ToolbarSeparator } from "@/components/layout/PageToolbar";
import { SAFETY_CAPAS_QUERY, SAFETY_EVENTS_QUERY, SAFETY_INJURY_CLAIMS_QUERY, SAFETY_MEDICAL_CASES_QUERY, SAFETY_ENV_REPORTS_QUERY } from "@/graphql/checkQueries";
import {
  CREATE_SAFETY_CAPA_MUTATION, UPDATE_SAFETY_CAPA_MUTATION,
  OPEN_SAFETY_CAPA_MUTATION, START_SAFETY_CAPA_MUTATION,
  PENDING_EFFECTIVENESS_SAFETY_CAPA_MUTATION,
  COMPLETE_EFFECTIVENESS_SAFETY_CAPA_MUTATION, CLOSE_SAFETY_CAPA_MUTATION,
  CANCEL_SAFETY_CAPA_MUTATION,
} from "@/graphql/checkMutations";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  OPEN: "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
  PENDING_EFFECTIVENESS: "bg-purple-100 text-purple-700 border-purple-200",
  EFFECTIVE: "bg-green-100 text-green-700 border-green-200",
  INEFFECTIVE: "bg-red-100 text-red-700 border-red-200",
  CLOSED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

const SOURCE_TYPE_OPTS = [
  { value: "", label: "None (Draft only)" },
  { value: "SAFETY_EVENT", label: "Safety Event" },
  { value: "SAFETY_CHECK", label: "Safety Check" },
  { value: "INJURY_CLAIM", label: "Injury Claim" },
  { value: "MEDICAL_CASE", label: "Medical Case" },
  { value: "ENVIRONMENTAL_REPORT", label: "Environmental Report" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" }, { value: "DRAFT", label: "Draft" }, { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" }, { value: "PENDING_EFFECTIVENESS", label: "Pending Effectiveness" },
  { value: "EFFECTIVE", label: "Effective" }, { value: "INEFFECTIVE", label: "Ineffective" },
  { value: "CLOSED", label: "Closed" }, { value: "CANCELLED", label: "Cancelled" },
];

const SEL_INPUT = "h-8 w-full bg-white border border-slate-200 px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30";
const SEL_TEXTAREA = "w-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none";

function statusLabel(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

function SectionBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-900 whitespace-pre-wrap">{text}</p>
    </div>
  );
}

export function SafetyCAPAPage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);

  const [cTitle, setCT] = useState(""); const [cSourceType, setCST] = useState(""); const [cSourceId, setCSI] = useState("");
  const [cProblem, setCP] = useState(""); const [cRootCause, setCRC] = useState("");
  const [cContainment, setCC] = useState(""); const [cCorrective, setCCR] = useState("");
  const [cPreventive, setCPR] = useState(""); const [cOwner, setCO] = useState("");
  const [cDueDate, setCDD] = useState(""); const [cEffectiveness, setCE] = useState(false); const [cNotes, setCN] = useState("");

  const { data, refetch } = useQuery(SAFETY_CAPAS_QUERY, {
    variables: { status: filterStatus || null }, fetchPolicy: "cache-and-network",
  });
  const items: any[] = (data as any)?.safetyCAPAs || [];
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((e: any) => (e.title || "").toLowerCase().includes(q));
  }, [items, searchQuery]);

  // Source data queries for the real source selector
  const { data: eventsData } = useQuery(SAFETY_EVENTS_QUERY, {
    variables: { status: null }, fetchPolicy: "cache-and-network",
  });
  const { data: claimsData } = useQuery(SAFETY_INJURY_CLAIMS_QUERY, {
    variables: {}, fetchPolicy: "cache-and-network",
  });
  const { data: medicalData } = useQuery(SAFETY_MEDICAL_CASES_QUERY, {
    variables: {}, fetchPolicy: "cache-and-network",
  });
  const { data: envData } = useQuery(SAFETY_ENV_REPORTS_QUERY, {
    variables: {}, fetchPolicy: "cache-and-network",
  });

  const allEvents: any[] = (eventsData as any)?.safetyEvents || [];
  const allClaims: any[] = (claimsData as any)?.safetyInjuryClaims || [];
  const allMedical: any[] = (medicalData as any)?.safetyMedicalCases || [];
  const allEnvReports: any[] = (envData as any)?.safetyEnvironmentalReports || [];

  const sourceOptions = useMemo(() => {
    const st = cSourceType;
    if (!st) return [];
    switch (st) {
      case "SAFETY_EVENT":
        return allEvents.map((e: any) => ({ id: e.id, label: `${e.title} (${e.eventType})` }));
      case "SAFETY_CHECK":
        return []; // Safety checks not queried — no meaningful titles
      case "INJURY_CLAIM":
        return allClaims.map((c: any) => ({ id: c.id, label: `${c.claimantName} (${c.claimType})` }));
      case "MEDICAL_CASE":
        return allMedical.map((m: any) => ({ id: m.id, label: `${m.careType} #${m.id}` }));
      case "ENVIRONMENTAL_REPORT":
        return allEnvReports.map((r: any) => ({ id: r.id, label: r.title }));
      default:
        return [];
    }
  }, [cSourceType, allEvents, allClaims, allMedical, allEnvReports]);

  const [createMut] = useMutation(CREATE_SAFETY_CAPA_MUTATION);
  const [updateMut] = useMutation(UPDATE_SAFETY_CAPA_MUTATION);
  const [openMut] = useMutation(OPEN_SAFETY_CAPA_MUTATION);
  const [startMut] = useMutation(START_SAFETY_CAPA_MUTATION);
  const [pendingEffMut] = useMutation(PENDING_EFFECTIVENESS_SAFETY_CAPA_MUTATION);
  const [completeEffMut] = useMutation(COMPLETE_EFFECTIVENESS_SAFETY_CAPA_MUTATION);
  const [closeMut] = useMutation(CLOSE_SAFETY_CAPA_MUTATION);
  const [cancelMut] = useMutation(CANCEL_SAFETY_CAPA_MUTATION);

  const showMsg = useCallback((text: string, tone: "success" | "error" = "success") => {
    setMsg({ text, tone }); setTimeout(() => setMsg(null), 3000);
  }, []);

  const requiredOk = cTitle.trim() !== "" && cOwner.trim() !== "" && cCorrective.trim() !== "";
  const resetForm = useCallback(() => { setCT(""); setCST(""); setCSI(""); setCP(""); setCRC(""); setCC(""); setCCR(""); setCPR(""); setCO(""); setCDD(""); setCE(false); setCN(""); }, []);
  const hNew = useCallback(() => { setCreating(true); setSelectedId(null); setEditing(false); resetForm(); }, [resetForm]);

  const hEdit = useCallback((item: any) => {
    setEditItem({ ...item }); setEditing(true); setCreating(false);
    setCT(item.title); setCST(item.sourceType || ""); setCSI(item.sourceId != null ? String(item.sourceId) : "");
    setCP(item.problemStatement || ""); setCRC(item.rootCause || ""); setCC(item.containmentAction || "");
    setCCR(item.correctiveAction || ""); setCPR(item.preventiveAction || ""); setCO(item.owner || "");
    setCDD(item.dueDate?.slice(0, 10) || ""); setCE(!!item.effectivenessCheckRequired); setCN(item.notes || "");
  }, []);

  const buildCreateVars = () => ({
    title: cTitle.trim(),
    sourceType: cSourceType || null,
    sourceId: cSourceId ? parseInt(cSourceId, 10) : null,
    problemStatement: cProblem || null,
    rootCause: cRootCause || null,
    containmentAction: cContainment || null,
    correctiveAction: cCorrective || null,
    preventiveAction: cPreventive || null,
    owner: cOwner || null,
    dueDate: cDueDate || null,
    effectivenessCheckRequired: cEffectiveness,
    notes: cNotes || null,
  });

  const buildUpdateVars = () => ({
    id: editItem?.id,
    title: cTitle.trim(),
    sourceType: cSourceType || null,
    sourceId: cSourceId ? parseInt(cSourceId, 10) : null,
    problemStatement: cProblem || null,
    rootCause: cRootCause || null,
    containmentAction: cContainment || null,
    correctiveAction: cCorrective || null,
    preventiveAction: cPreventive || null,
    owner: cOwner || null,
    dueDate: cDueDate || null,
    effectivenessCheckRequired: cEffectiveness,
    notes: cNotes || null,
  });

  const hCreate = useCallback(async () => {
    if (!requiredOk) return;
    try {
      await createMut({ variables: buildCreateVars() });
      showMsg("CAPA created"); setCreating(false); refetch();
    } catch (e: any) { showMsg(e?.message || "Create failed", "error"); }
  }, [createMut, refetch, showMsg, requiredOk]);

  const hSaveEdit = useCallback(async () => {
    if (!editItem?.id) return;
    try {
      await updateMut({ variables: buildUpdateVars() });
      showMsg("CAPA updated"); setEditing(false); setEditItem(null); refetch();
    } catch (e: any) { showMsg(e?.message || "Update failed", "error"); }
  }, [editItem, updateMut, refetch, showMsg]);

  const hCancelEdit = useCallback(() => { setEditing(false); setEditItem(null); resetForm(); }, [resetForm]);

  const [effectivenessPopup, setEffectivenessPopup] = useState<{ id: number } | null>(null);

  const hTransition = useCallback(async (mut: any, id: number, m: string) => {
    try { await mut({ variables: { id } }); showMsg(m); refetch(); } catch (e: any) { showMsg(e?.message || "Failed", "error"); }
  }, [refetch, showMsg]);

  const hCompleteEffectiveness = useCallback(async (id: number, effective: boolean) => {
    try { await completeEffMut({ variables: { id, effective } }); showMsg(`CAPA marked ${effective ? "effective" : "ineffective"}`); refetch(); setEffectivenessPopup(null); } catch (e: any) { showMsg(e?.message || "Failed", "error"); }
  }, [completeEffMut, refetch, showMsg]);

  const selItem = selectedId ? items.find((e: any) => e.id === selectedId) ?? null : null;
  const selStatus = selItem?.status || "";

  const renderForm = () => {
    const sc = (border?: boolean) => border ? "border-b border-slate-200 pb-4 mb-4" : "";
    const st = "text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2";
    const lc = "block text-xs font-medium text-slate-500 mb-1";

    const sourceOpts = sourceOptions;

    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 gap-0 divide-x divide-slate-200 min-h-0">
          {/* Left column */}
          <div className="p-4 space-y-4">
            <div className={sc(true)}>
              <div className={st}>CAPA Info</div>
              <div className="space-y-3">
                <div>
                  <label className={lc}>Title *</label>
                  <input type="text" value={cTitle} onChange={(e) => setCT(e.target.value)} className={SEL_INPUT} placeholder="CAPA title..." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={lc}>Source Type</label>
                    <select value={cSourceType} onChange={(e) => { setCST(e.target.value); setCSI(""); }} className={SEL_INPUT}>
                      {SOURCE_TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lc}>Source Record</label>
                    {cSourceType ? (
                      sourceOpts.length > 0 ? (
                        <select value={cSourceId} onChange={(e) => setCSI(e.target.value)} className={SEL_INPUT}>
                          <option value="">Select...</option>
                          {sourceOpts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={cSourceId} onChange={(e) => setCSI(e.target.value)} className={SEL_INPUT} placeholder="Source ID..." />
                      )
                    ) : (
                      <div className="h-8 flex items-center text-xs text-slate-400 italic">
                        Select source type first
                      </div>
                    )}
                    {cSourceType === "" && (
                      <p className="text-[10px] text-slate-400 mt-1 italic">CAPA should be linked before opening.</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className={lc}>Due Date</label>
                  <input type="date" value={cDueDate} onChange={(e) => setCDD(e.target.value)} className={SEL_INPUT} />
                </div>
              </div>
            </div>
            <div>
              <div className={st}>Analysis</div>
              <div className="space-y-3">
                <div>
                  <label className={lc}>Problem Statement</label>
                  <textarea value={cProblem} onChange={(e) => setCP(e.target.value)} rows={3} className={SEL_TEXTAREA} placeholder="Describe the problem..." />
                </div>
                <div>
                  <label className={lc}>Root Cause</label>
                  <textarea value={cRootCause} onChange={(e) => setCRC(e.target.value)} rows={2} className={SEL_TEXTAREA} placeholder="Root cause analysis..." />
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="p-4 space-y-4">
            <div className={sc(true)}>
              <div className={st}>Actions</div>
              <div className="space-y-3">
                <div>
                  <label className={lc}>Containment Action</label>
                  <textarea value={cContainment} onChange={(e) => setCC(e.target.value)} rows={2} className={SEL_TEXTAREA} />
                </div>
                <div>
                  <label className={lc}>Corrective Action *</label>
                  <textarea value={cCorrective} onChange={(e) => setCCR(e.target.value)} rows={2} className={SEL_TEXTAREA} />
                </div>
                <div>
                  <label className={lc}>Preventive Action</label>
                  <textarea value={cPreventive} onChange={(e) => setCPR(e.target.value)} rows={2} className={SEL_TEXTAREA} />
                </div>
              </div>
            </div>
            <div>
              <div className={st}>Effectiveness & Notes</div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={cEffectiveness} onChange={(e) => setCE(e.target.checked)} className="h-3.5 w-3.5" />
                  Effectiveness check required
                </label>
                <div>
                  <label className={lc}>Owner *</label>
                  <input type="text" value={cOwner} onChange={(e) => setCO(e.target.value)} className={SEL_INPUT} placeholder="Assigned owner..." />
                </div>
                <div>
                  <label className={lc}>Notes</label>
                  <textarea value={cNotes} onChange={(e) => setCN(e.target.value)} rows={3} className={SEL_TEXTAREA} />
                </div>
              </div>
            </div>
          </div>
        </div>
        {!requiredOk && (
          <div className="p-2 bg-amber-50 border-t border-amber-200 text-[10px] text-amber-700">
            Required: {[!cTitle.trim() && "Title", !cCorrective.trim() && "Corrective Action", !cOwner.trim() && "Owner"].filter(Boolean).join(", ")}
          </div>
        )}
      </div>
    );
  };

  const renderDetail = () => {
    if (creating || editing) return renderForm();
    if (!selItem) return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center max-w-sm px-6">
          <CheckCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900 mb-1">CAPA</h3>
          <p className="text-xs text-slate-500 mb-3">Select a CAPA record to view details or create a new record.</p>
        </div>
      </div>
    );
    const stCls = STATUS_STYLES[selItem.status] || STATUS_STYLES.DRAFT;
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{selItem.title}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${stCls}`}>{statusLabel(selItem.status)}</span>
            {selItem.sourceType && <span className="inline-flex px-1 py-0.5 text-[10px] font-medium border bg-slate-100 text-slate-700 border-slate-200">{SOURCE_TYPE_OPTS.find((o: any) => o.value === selItem.sourceType)?.label || selItem.sourceType}</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            {selItem.problemStatement && <SectionBlock label="Problem Statement" text={selItem.problemStatement} />}
            {selItem.rootCause && <SectionBlock label="Root Cause" text={selItem.rootCause} />}
            {selItem.containmentAction && <SectionBlock label="Containment" text={selItem.containmentAction} />}
          </div>
          <div className="space-y-3">
            {selItem.correctiveAction && <SectionBlock label="Corrective Action" text={selItem.correctiveAction} />}
            {selItem.preventiveAction && <SectionBlock label="Preventive Action" text={selItem.preventiveAction} />}
            <div>
              <p className="text-[10px] font-medium text-slate-500 mb-1">Effectiveness</p>
              <p className="text-xs text-slate-900">{selItem.effectivenessCheckRequired ? (selItem.effectivenessResult ? statusLabel(selItem.effectivenessResult) : "Pending check") : "Not required"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {selItem.dueDate && <div className="text-xs"><span className="text-slate-500">Due:</span> <span className="text-slate-900">{selItem.dueDate?.slice(0, 10)}</span></div>}
              {selItem.owner && <div className="text-xs"><span className="text-slate-500">Owner:</span> <span className="text-slate-900">{selItem.owner}</span></div>}
              {selItem.notes && <div className="col-span-2 text-xs"><span className="text-slate-500">Notes:</span> <span className="text-slate-700">{selItem.notes}</span></div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const canOpen = selStatus === "DRAFT";
  const canStart = selStatus === "OPEN";
  const canPendingEff = selStatus === "IN_PROGRESS";
  const canCompEff = selStatus === "PENDING_EFFECTIVENESS";
  const canClose = selStatus === "EFFECTIVE" || selStatus === "INEFFECTIVE";
  const canCancel = !["CLOSED", "CANCELLED"].includes(selStatus);
  const isEditable = selStatus === "DRAFT" || selStatus === "OPEN";

  const toolbarContent = (
    <PageToolbar
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search CAPAs..."
      filters={
        <ToolbarDropdown value={filterStatus} onChange={(v) => { setFilterStatus(v); setSelectedId(null); }} options={STATUS_FILTERS} placeholder="Status" width="w-36" />
      }
      actions={
        creating ? (<><ToolbarButton icon={Save} label="Save Draft" onClick={hCreate} disabled={!requiredOk} variant="success" /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { setCreating(false); resetForm(); }} /></>) :
        editing ? (<><ToolbarButton icon={Save} label="Update" onClick={hSaveEdit} variant="success" /><ToolbarButton icon={Ban} label="Cancel" onClick={hCancelEdit} /></>) :
        !selItem ? (<><ToolbarButton icon={Plus} label="New CAPA" onClick={hNew} variant="success" /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>) :
        (<><ToolbarButton icon={Pencil} label="Edit" onClick={() => hEdit(selItem)} disabled={!isEditable} /><ToolbarButton icon={Play} label="Open" onClick={() => hTransition(openMut, selItem.id, "CAPA opened")} disabled={!canOpen} /><ToolbarButton icon={Play} label="Start" onClick={() => hTransition(startMut, selItem.id, "CAPA started")} disabled={!canStart} /><ToolbarButton icon={Target} label="Pending Eff." onClick={() => hTransition(pendingEffMut, selItem.id, "Pending effectiveness")} disabled={!canPendingEff} /><ToolbarButton icon={RotateCcw} label="Complete Eff." onClick={() => setEffectivenessPopup({ id: selItem.id })} disabled={!canCompEff} /><ToolbarButton icon={CheckCircle} label="Close" onClick={() => hTransition(closeMut, selItem.id, "CAPA closed")} disabled={!canClose} variant={canClose ? "success" : "default"} /><ToolbarButton icon={XCircle} label="Cancel" onClick={() => setCancelId(selItem.id)} disabled={!canCancel} variant="destructive" /><ToolbarSeparator /><ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { setSelectedId(null); setCreating(false); setEditing(false); }} /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>)
      }
    />
  );

  const leftColumnContent = (
    <><div className="shrink-0 h-8 border-b border-slate-200 flex items-center bg-slate-50 px-4"><span className="text-sm font-medium text-slate-700">CAPAs</span><span className="ml-auto text-[10px] text-slate-500 font-mono">{items.length}</span></div>      {searchQuery && filteredItems.length === 0 && items.length > 0 && <div className="px-4 py-2 text-[10px] text-slate-400 italic">No CAPAs match &quot;{searchQuery}&quot;</div>}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 sidebar-scroll">{filteredItems.length === 0 ? (<div className="flex flex-col items-center justify-center px-4 py-8 text-center"><Search className="h-5 w-5 text-slate-300 mb-2" /><p className="text-xs text-slate-500 font-medium">No CAPA records recorded.</p><button onClick={hNew} className="mt-3 h-7 px-3 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700">New CAPA</button></div>) : filteredItems.map((e: any) => (<div key={e.id} onClick={() => { setCreating(false); setEditing(false); setSelectedId(e.id); }} className={`group flex items-start gap-2 w-full rounded-md px-3 py-2.5 cursor-pointer text-sm transition-all border-l-2 ${selectedId === e.id ? "bg-accent/15 border-accent" : "border-l-transparent hover:bg-muted"}`}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{e.title}</span></div>              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500"><span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${STATUS_STYLES[e.status] || STATUS_STYLES.DRAFT}`}>{statusLabel(e.status)}</span>{e.owner && <span>· {e.owner}</span>}</div></div></div>))}</div></>
  );

  const footerContent = <>{items.length} CAPA{items.length !== 1 ? "s" : ""}{!creating && !selItem && <span className="ml-auto">Select a CAPA to view details</span>}</>;

  const confirmDialog = cancelId && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setCancelId(null)}>
      <div className="bg-white border border-slate-200 shadow-lg w-80" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 space-y-3"><h3 className="text-sm font-semibold text-slate-900">Cancel CAPA</h3><p className="text-xs text-slate-600">Cancel this CAPA?</p><div className="flex justify-end gap-2"><button onClick={() => setCancelId(null)} className="h-8 px-3 text-xs font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50">No</button><button onClick={() => { hTransition(cancelMut, cancelId, "CAPA cancelled"); setCancelId(null); }} className="h-8 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700">Yes</button></div></div></div></div>
  );

  const effPopup = effectivenessPopup && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setEffectivenessPopup(null)}>
      <div className="bg-white border border-slate-200 shadow-lg w-80" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 space-y-3"><h3 className="text-sm font-semibold text-slate-900">Effectiveness Result</h3><p className="text-xs text-slate-600">Was the CAPA effective?</p><div className="flex justify-end gap-2">
          <button onClick={() => hCompleteEffectiveness(effectivenessPopup.id, false)} className="h-8 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700">Ineffective</button>
          <button onClick={() => hCompleteEffectiveness(effectivenessPopup.id, true)} className="h-8 px-3 text-xs font-semibold text-white bg-green-600 hover:bg-green-700">Effective</button>
        </div></div></div></div>
  );

  return (
    <><AppPageLayout icon={<CheckCircle className="h-5 w-5 stroke-current" />} iconClass="bg-purple-100 text-purple-600"
      title="CAPA" subtitle="Track corrective and preventive actions from identification through effectiveness verification."
      systemMessage={msg ? { text: msg.text, type: msg.tone } : null} onDismissSystemMessage={() => setMsg(null)}
      toolbar={toolbarContent} leftColumn={leftColumnContent} leftColumnWidth="w-[20%]" footer={footerContent}>{renderDetail()}</AppPageLayout>{confirmDialog}{effPopup}</>
  );
}
