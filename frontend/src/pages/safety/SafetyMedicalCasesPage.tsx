import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Activity, Plus, Save, Ban, Play, Search, Pencil, ArrowLeft, RefreshCw, CheckCircle, Monitor, Briefcase } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar, ToolbarButton, ToolbarDropdown, ToolbarSeparator } from "@/components/layout/PageToolbar";
import { SAFETY_MEDICAL_CASES_QUERY, SAFETY_EVENTS_QUERY, SAFETY_INJURY_CLAIMS_QUERY } from "@/graphql/checkQueries";
import { USER_PROFILES_QUERY } from "@/graphql/administrationQueries";
import {
  CREATE_SAFETY_MEDICAL_CASE_MUTATION, UPDATE_SAFETY_MEDICAL_CASE_MUTATION,
  OPEN_SAFETY_MEDICAL_CASE_MUTATION, MONITOR_SAFETY_MEDICAL_CASE_MUTATION,
  RETURN_TO_WORK_SAFETY_MEDICAL_CASE_MUTATION, CLOSE_SAFETY_MEDICAL_CASE_MUTATION,
  CANCEL_SAFETY_MEDICAL_CASE_MUTATION,
} from "@/graphql/checkMutations";
import { formatDateFull } from "@/utils/dateFormat";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  OPEN: "bg-blue-100 text-blue-700 border-blue-200",
  MONITORING: "bg-amber-100 text-amber-700 border-amber-200",
  RETURNED_TO_WORK: "bg-green-100 text-green-700 border-green-200",
  CLOSED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

const CARE_TYPE_OPTS = [
  { value: "FIRST_AID", label: "First Aid" },
  { value: "ON_SITE", label: "On-Site Treatment" },
  { value: "CLINIC_VISIT", label: "Clinic Visit" },
  { value: "EMERGENCY_ROOM", label: "Emergency Room" },
  { value: "HOSPITALIZATION", label: "Hospitalization" },
  { value: "SPECIALIST", label: "Specialist" },
  { value: "FOLLOW_UP", label: "Follow-up" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" }, { value: "DRAFT", label: "Draft" }, { value: "OPEN", label: "Open" },
  { value: "MONITORING", label: "Monitoring" }, { value: "RETURNED_TO_WORK", label: "Returned to Work" },
  { value: "CLOSED", label: "Closed" }, { value: "CANCELLED", label: "Cancelled" },
];

const SEL = "h-8 w-full bg-white border border-slate-200 px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30";
const LABEL = "block text-xs font-medium text-slate-500 mb-1";
const SECTION_TITLE = "text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2";

function statusLabel(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function nowISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-b border-slate-100 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
    <div className={SECTION_TITLE}>{title}</div>
    <div className="space-y-3">{children}</div>
  </div>
);

export function SafetyMedicalCasesPage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);

  const [cCareType, setCCT] = useState("FIRST_AID");
  const [cVisitRequired, setCVR] = useState(false);
  const [cVisitDate, setCVD] = useState("");
  const [cEventId, setCEI] = useState("");
  const [cClaimId, setCCId] = useState("");
  const [cWorkRestriction, setCWR] = useState(false);
  const [cRestrictionSummary, setCRS] = useState("");
  const [cReturnToWork, setCRTW] = useState("");
  const [cConfidential, setCConf] = useState("");
  const [cAffectedId, setCAI] = useState("");
  const [cOwner, setCO] = useState("");
  const [cNotes, setCN] = useState("");

  const { data, refetch } = useQuery(SAFETY_MEDICAL_CASES_QUERY, {
    variables: { status: filterStatus || null }, fetchPolicy: "cache-and-network",
  });
  const items: any[] = (data as any)?.safetyMedicalCases || [];
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((e: any) => (e.careType || "").toLowerCase().includes(q));
  }, [items, searchQuery]);

  const { data: eventsData } = useQuery(SAFETY_EVENTS_QUERY, {
    variables: { eventType: "INCIDENT,ACCIDENT" }, fetchPolicy: "cache-and-network",
  });
  const events: any[] = (eventsData as any)?.safetyEvents || [];

  const { data: profilesData } = useQuery(USER_PROFILES_QUERY, { fetchPolicy: "cache-and-network" });
  const profiles: any[] = (profilesData as any)?.userProfiles || [];

  const { data: claimsData } = useQuery(SAFETY_INJURY_CLAIMS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const claims: any[] = (claimsData as any)?.safetyInjuryClaims || [];
  const openClaims = useMemo(() => claims.filter((c: any) => c.status !== "CLOSED" && c.status !== "CANCELLED"), [claims]);

  const [createMut] = useMutation(CREATE_SAFETY_MEDICAL_CASE_MUTATION);
  const [updateMut] = useMutation(UPDATE_SAFETY_MEDICAL_CASE_MUTATION);
  const [openMut] = useMutation(OPEN_SAFETY_MEDICAL_CASE_MUTATION);
  const [monitorMut] = useMutation(MONITOR_SAFETY_MEDICAL_CASE_MUTATION);
  const [rtwMut] = useMutation(RETURN_TO_WORK_SAFETY_MEDICAL_CASE_MUTATION);
  const [closeMut] = useMutation(CLOSE_SAFETY_MEDICAL_CASE_MUTATION);
  const [cancelMut] = useMutation(CANCEL_SAFETY_MEDICAL_CASE_MUTATION);

  const showMsg = useCallback((text: string, tone: "success" | "error" = "success") => {
    setMsg({ text, tone }); setTimeout(() => setMsg(null), 3000);
  }, []);

  const requiredOk = cCareType !== "" && cAffectedId !== "" && cOwner.trim() !== "";

  const resetForm = useCallback(() => {
    setCCT("FIRST_AID"); setCVR(false); setCVD(""); setCEI(""); setCCId("");
    setCAI(""); setCWR(false); setCRS(""); setCRTW(""); setCConf(""); setCO(""); setCN("");
  }, []);

  const hNew = useCallback(() => { setCreating(true); setSelectedId(null); setEditing(false); resetForm(); setCVD(nowISO()); }, [resetForm]);

  const hEdit = useCallback((item: any) => {
    setEditItem({ ...item }); setEditing(true); setCreating(false);
    setCCT(item.careType); setCVR(!!item.visitRequired); setCVD(item.visitDate?.slice(0, 16) || "");
    setCEI(item.safetyEventId ? String(item.safetyEventId) : "");
    setCCId(item.injuryClaimId ? String(item.injuryClaimId) : "");
    setCAI(item.affectedPersonId ? String(item.affectedPersonId) : "");
    setCWR(!!item.workRestriction); setCRS(item.restrictionSummary || "");
    setCRTW(item.returnToWorkDate?.slice(0, 16) || "");
    setCConf(item.confidentialNotes || ""); setCO(item.owner || ""); setCN(item.notes || "");
  }, []);

  const buildVars = useCallback(() => ({
    careType: cCareType,
    affectedPersonId: cAffectedId ? parseInt(cAffectedId, 10) : null,
    safetyEventId: cEventId ? parseInt(cEventId, 10) : null,
    injuryClaimId: cClaimId ? parseInt(cClaimId, 10) : null,
    visitRequired: cVisitRequired,
    visitDate: cVisitDate || null,
    workRestriction: cWorkRestriction,
    restrictionSummary: cRestrictionSummary || null,
    returnToWorkDate: cReturnToWork || null,
    confidentialNotes: cConfidential || null,
    owner: cOwner.trim() || null,
    notes: cNotes.trim() || null,
  }), [cCareType, cAffectedId, cEventId, cClaimId, cVisitRequired, cVisitDate, cWorkRestriction,
      cRestrictionSummary, cReturnToWork, cConfidential, cOwner, cNotes]);

  const hCreate = useCallback(async () => {
    if (!requiredOk) return;
    try { await createMut({ variables: buildVars() }); showMsg("Case created"); setCreating(false); refetch(); }
    catch (e: any) { showMsg(e?.message || "Create failed", "error"); }
  }, [requiredOk, createMut, buildVars, refetch, showMsg]);

  const hSaveEdit = useCallback(async () => {
    if (!editItem?.id) return;
    try { await updateMut({ variables: { id: editItem.id, ...buildVars() } }); showMsg("Case updated"); setEditing(false); setEditItem(null); refetch(); }
    catch (e: any) { showMsg(e?.message || "Update failed", "error"); }
  }, [editItem, updateMut, buildVars, refetch, showMsg]);

  const hCancelEdit = useCallback(() => { setEditing(false); setEditItem(null); resetForm(); }, [resetForm]);

  const hTransition = useCallback(async (mut: any, id: number, m: string) => {
    try { await mut({ variables: { id } }); showMsg(m); refetch(); } catch (e: any) { showMsg(e?.message || "Failed", "error"); }
  }, [refetch, showMsg]);

  const selItem = selectedId ? items.find((e: any) => e.id === selectedId) ?? null : null;
  const selStatus = selItem?.status || "";
  const selEvent = selItem?.safetyEventId ? events.find((ev: any) => ev.id === selItem.safetyEventId) : null;
  const selClaim = selItem?.injuryClaimId ? claims.find((c: any) => c.id === selItem.injuryClaimId) : null;

  // ── Form ──
  const renderForm = () => {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="grid h-full min-h-0 grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="flex h-full min-h-0 flex-col gap-3">
            <FormSection title="Person & Source">
              <div>
                <label className={LABEL}>Affected Person *</label>
                <select value={cAffectedId} onChange={(e) => setCAI(e.target.value)} className={SEL}>
                  <option value="">Select a person...</option>
                  {profiles.map((p: any) => <option key={p.id} value={p.id}>{p.fullName || p.username}{p.jobTitle ? ` — ${p.jobTitle}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Care Type *</label>
                <select value={cCareType} onChange={(e) => setCCT(e.target.value)} className={SEL}>
                  {CARE_TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </FormSection>
            <FormSection title="Linked Events">
              <div>
                <label className={LABEL}>Safety Event <span className="text-slate-400 font-normal">(optional)</span></label>
                <select value={cEventId} onChange={(e) => setCEI(e.target.value)} className={SEL}>
                  <option value="">None</option>
                  {events.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.eventType})</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Injury Claim <span className="text-slate-400 font-normal">(optional)</span></label>
                <select value={cClaimId} onChange={(e) => setCCId(e.target.value)} className={SEL}>
                  <option value="">None</option>
                  {openClaims.map((cl: any) => <option key={cl.id} value={cl.id}>{cl.claimantName} ({cl.claimType})</option>)}
                </select>
              </div>
            </FormSection>
            <FormSection title="Work Restrictions">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={cWorkRestriction} onChange={(e) => setCWR(e.target.checked)} className="h-3.5 w-3.5" />
                Work restriction applies
              </label>
              {cWorkRestriction && (
                <div className="mt-2">
                  <textarea value={cRestrictionSummary} onChange={(e) => setCRS(e.target.value)} rows={2}
                    className="w-full border border-slate-200 bg-white px-2 py-1 text-xs outline-none resize-none" placeholder="Describe restriction..." />
                </div>
              )}
            </FormSection>
          </div>
          {/* Right Column */}
          <div className="flex h-full min-h-0 flex-col gap-3">
            <FormSection title="Visit">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={cVisitRequired} onChange={(e) => setCVR(e.target.checked)} className="h-3.5 w-3.5" />
                  Visit required
                </label>
              </div>
              {cVisitRequired && (
                <div className="mt-2">
                  <input type="datetime-local" value={cVisitDate} onChange={(e) => setCVD(e.target.value)} className={SEL} />
                </div>
              )}
              <div className="mt-2">
                <input type="datetime-local" value={cReturnToWork} onChange={(e) => setCRTW(e.target.value)} className={SEL} />
              </div>
            </FormSection>
            <div className="flex-[1.2] min-h-0 flex flex-col border-b border-slate-100 pb-3">
              <div className={SECTION_TITLE}>Confidential Notes <span className="text-orange-500 font-normal">(restricted)</span></div>
              <div className="flex-1 min-h-0 flex flex-col">
                <textarea value={cConfidential} onChange={(e) => setCConf(e.target.value)}
                  className="h-full min-h-0 w-full resize-none overflow-auto border border-slate-200 bg-white px-2 py-1 text-xs outline-none" placeholder="Medical confidentiality applies..." />
              </div>
            </div>
            <FormSection title="Ownership">
              <input type="text" value={cOwner} onChange={(e) => setCO(e.target.value)} className={SEL} placeholder="Assigned owner..." />
            </FormSection>
            <div className="flex-1 min-h-0 flex flex-col border-b border-slate-100 pb-3">
              <div className={SECTION_TITLE}>Notes</div>
              <div className="flex-1 min-h-0 flex flex-col">
                <textarea value={cNotes} onChange={(e) => setCN(e.target.value)}
                  className="h-full min-h-0 w-full resize-none overflow-auto border border-slate-200 bg-white px-2 py-1 text-xs outline-none" placeholder="Additional notes..." />
              </div>
            </div>
            {!requiredOk && (
              <div className="shrink-0 p-2 bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
                Required: {[!cAffectedId ? "Affected Person" : "", !cOwner.trim() ? "Owner" : "", !cCareType ? "Care Type" : ""].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    );
  };

  // ── Detail View ──
  const renderDetail = () => {
    if (creating || editing) return renderForm();
    if (!selItem) return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center max-w-sm px-6">
          <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Medical Cases</h3>
          <p className="text-xs text-slate-500 mb-3">Select a case to view details or create a new record.</p>
        </div>
      </div>
    );
    const stCls = STATUS_STYLES[selItem.status] || STATUS_STYLES.DRAFT;
    const careLabel = CARE_TYPE_OPTS.find((o: any) => o.value === selItem.careType)?.label || selItem.careType;
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">{careLabel}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${stCls}`}>{statusLabel(selItem.status)}</span>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-3">
              {selItem.affectedPersonId && <div><p className="text-[10px] font-medium text-slate-500 mb-1">Affected Person</p><p className="text-xs text-slate-900">{profiles.find((p: any) => p.id === selItem.affectedPersonId)?.fullName || `Person #${selItem.affectedPersonId}`}</p></div>}
              {selEvent && <div><p className="text-[10px] font-medium text-slate-500 mb-1">Linked Event</p><p className="text-xs text-slate-900">{selEvent.title} ({selEvent.eventType})</p></div>}
              {selClaim && <div><p className="text-[10px] font-medium text-slate-500 mb-1">Linked Claim</p><p className="text-xs text-slate-900">{selClaim.claimantName} ({selClaim.claimType})</p></div>}
              {selItem.visitRequired && selItem.visitDate && <div><p className="text-[10px] font-medium text-slate-500 mb-1">Visit Date</p><p className="text-xs text-slate-900">{formatDateFull(selItem.visitDate)}</p></div>}
              {selItem.workRestriction && selItem.restrictionSummary && <div><p className="text-[10px] font-medium text-slate-500 mb-1">Restriction</p><p className="text-xs text-slate-900">{selItem.restrictionSummary}</p></div>}
            </div>
            <div className="space-y-3">
              {selItem.returnToWorkDate && <div><p className="text-[10px] font-medium text-slate-500 mb-1">Return to Work</p><p className="text-xs text-slate-900">{formatDateFull(selItem.returnToWorkDate)}</p></div>}
              {selItem.owner && <div><p className="text-[10px] font-medium text-slate-500 mb-1">Owner</p><p className="text-xs text-slate-900">{selItem.owner}</p></div>}
              {selItem.confidentialNotes && <div><p className="text-[10px] font-medium text-slate-500 mb-1">Confidential Notes</p><p className="text-xs text-slate-500/70 italic">{selItem.confidentialNotes}</p></div>}
              {selItem.notes && <div><p className="text-[10px] font-medium text-slate-500 mb-1">Notes</p><p className="text-xs text-slate-900">{selItem.notes}</p></div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const canOpen = selStatus === "DRAFT"; const canMonitor = selStatus === "OPEN";
  const canRTW = selStatus === "MONITORING"; const canClose = selStatus === "MONITORING" || selStatus === "RETURNED_TO_WORK";
  const canCancel = selStatus !== "CLOSED" && selStatus !== "CANCELLED";
  const isEditable = selStatus === "DRAFT" || selStatus === "OPEN";

  const toolbarContent = (
    <PageToolbar
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search cases..."
      filters={
        <ToolbarDropdown value={filterStatus} onChange={(v) => { setFilterStatus(v); setSelectedId(null); }} options={STATUS_FILTERS} placeholder="Status" width="w-36" />
      }
      actions={
        creating ? (<><ToolbarButton icon={Save} label="Save Draft" onClick={hCreate} disabled={!requiredOk} variant="success" /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { setCreating(false); resetForm(); }} /></>) :
        editing ? (<><ToolbarButton icon={Save} label="Update" onClick={hSaveEdit} variant="success" /><ToolbarButton icon={Ban} label="Cancel" onClick={hCancelEdit} /></>) :
        !selItem ? (<><ToolbarButton icon={Plus} label="New Case" onClick={hNew} variant="success" /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>) :
        (<><ToolbarButton icon={Pencil} label="Edit" onClick={() => hEdit(selItem)} disabled={!isEditable} /><ToolbarButton icon={Play} label="Open" onClick={() => hTransition(openMut, selItem.id, "Case opened")} disabled={!canOpen} /><ToolbarButton icon={Monitor} label="Monitor" onClick={() => hTransition(monitorMut, selItem.id, "Monitoring started")} disabled={!canMonitor} /><ToolbarButton icon={Briefcase} label="RTW" onClick={() => hTransition(rtwMut, selItem.id, "Returned to work")} disabled={!canRTW} /><ToolbarButton icon={CheckCircle} label="Close" onClick={() => hTransition(closeMut, selItem.id, "Case closed")} disabled={!canClose} variant={canClose ? "success" : "default"} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => setCancelId(selItem.id)} disabled={!canCancel} variant="destructive" /><ToolbarSeparator /><ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { setSelectedId(null); setCreating(false); setEditing(false); }} /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>)
      }
    />
  );

  const leftColumnContent = (<><div className="shrink-0 h-8 border-b border-slate-200 flex items-center bg-slate-50 px-4"><span className="text-sm font-medium text-slate-700">Cases</span><span className="ml-auto text-[10px] text-slate-500 font-mono">{items.length}</span></div>      {searchQuery && filteredItems.length === 0 && items.length > 0 && <div className="px-4 py-2 text-[10px] text-slate-400 italic">No cases match &quot;{searchQuery}&quot;</div>}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 sidebar-scroll">{filteredItems.length === 0 ? (<div className="flex flex-col items-center justify-center px-4 py-6 text-center"><Search className="h-5 w-5 text-slate-300 mb-2" /><p className="text-xs text-slate-500 font-medium mb-2">No medical cases recorded.</p>{!filterStatus && <button onClick={hNew} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"><Plus className="h-3.5 w-3.5" /> New Case</button>}</div>) : filteredItems.map((e: any) => (<div key={e.id} onClick={() => { setCreating(false); setEditing(false); setSelectedId(e.id); }} className={`group flex items-start gap-2 w-full rounded-md px-3 py-2.5 cursor-pointer text-sm transition-all border-l-2 ${selectedId === e.id ? "bg-accent/15 border-accent" : "border-l-transparent hover:bg-muted"}`}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{CARE_TYPE_OPTS.find((o: any) => o.value === e.careType)?.label || e.careType}</span></div>              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500"><span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${STATUS_STYLES[e.status] || STATUS_STYLES.DRAFT}`}>{statusLabel(e.status)}</span>{e.owner && <span>· {e.owner}</span>}</div></div></div>))}</div></>);

  const footerContent = <>{items.length} case{items.length !== 1 ? "s" : ""}{!creating && !selItem && <span className="ml-auto">Select a case to view details</span>}</>;

  const confirmDialog = cancelId && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setCancelId(null)}>
      <div className="bg-white border border-slate-200 shadow-lg w-80" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 space-y-3"><h3 className="text-sm font-semibold text-slate-900">Cancel Case</h3><p className="text-xs text-slate-600">Cancel this medical case?</p><div className="flex justify-end gap-2"><button onClick={() => setCancelId(null)} className="h-8 px-3 text-xs font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50">No</button><button onClick={() => { hTransition(cancelMut, cancelId, "Case cancelled"); setCancelId(null); }} className="h-8 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700">Yes</button></div></div></div></div>
  );

  return (
    <><AppPageLayout icon={<Activity className="h-5 w-5 stroke-current" />} iconClass="bg-blue-100 text-blue-600"
      title="Medical Cases" subtitle="Track medical cases including on-site care, clinic visits, hospitalizations, and return-to-work status."
      systemMessage={msg ? { text: msg.text, type: msg.tone } : null} onDismissSystemMessage={() => setMsg(null)}
      toolbar={toolbarContent} leftColumn={leftColumnContent} leftColumnWidth="w-[20%]" footer={footerContent}>{renderDetail()}</AppPageLayout>{confirmDialog}</>
  );
}
