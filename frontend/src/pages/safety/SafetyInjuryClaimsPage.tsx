import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { AlertTriangle, Plus, Save, CheckCircle, Ban, Play, Search, Pencil, ArrowLeft, RefreshCw, Eye, Clock } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar, ToolbarButton, ToolbarDropdown, ToolbarSeparator } from "@/components/layout/PageToolbar";
import {
  SAFETY_INJURY_CLAIMS_QUERY, SAFETY_EVENTS_QUERY,
} from "@/graphql/checkQueries";
import {
  CREATE_SAFETY_INJURY_CLAIM_MUTATION, UPDATE_SAFETY_INJURY_CLAIM_MUTATION,
  OPEN_SAFETY_INJURY_CLAIM_MUTATION, REVIEW_SAFETY_INJURY_CLAIM_MUTATION,
  WAIT_INFO_SAFETY_INJURY_CLAIM_MUTATION, CLOSE_SAFETY_INJURY_CLAIM_MUTATION,
  CANCEL_SAFETY_INJURY_CLAIM_MUTATION,
} from "@/graphql/checkMutations";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  OPEN: "bg-primary/15 text-primary border-primary/20",
  UNDER_REVIEW: "bg-warning/15 text-warning border-warning/20",
  WAITING_INFO: "bg-warning/15 text-warning border-warning/20",
  CLOSED: "bg-success/15 text-success border-success/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

const CLAIM_TYPE_OPTS = [
  { value: "FIRST_AID", label: "First Aid" },
  { value: "MEDICAL_TREATMENT", label: "Medical Treatment" },
  { value: "LOST_TIME", label: "Lost Time" },
  { value: "RESTRICTED_WORK", label: "Restricted Work" },
  { value: "FATALITY", label: "Fatality" },
  { value: "OCCUPATIONAL_ILLNESS", label: "Occupational Illness" },
  { value: "OTHER", label: "Other" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" }, { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" }, { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "WAITING_INFO", label: "Waiting Info" }, { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const SEL = "h-8 w-full bg-background border border-border px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30";
const LABEL = "block text-xs font-medium text-muted-foreground mb-1";
const SECTION_TITLE = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2";

function statusLabel(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

export function SafetyInjuryClaimsPage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);

  const [cClaimantName, setCC] = useState("");
  const [cEmployeeId, setCEd] = useState("");
  const [cClaimType, setCT] = useState("FIRST_AID");
  const [cEventId, setCEI] = useState("");
  const [cInjurySummary, setCIS] = useState("");
  const [cBodyArea, setCBA] = useState("");
  const [cLostTime, setCLT] = useState(false);
  const [cRestricted, setCR] = useState(false);
  const [cReportedInsurer, setCRI] = useState(false);
  const [cInsurerRef, setCIR] = useState("");
  const [cOwner, setCO] = useState("");
  const [cNotes, setCN] = useState("");

  const { data, refetch } = useQuery(SAFETY_INJURY_CLAIMS_QUERY, {
    variables: { status: filterStatus || null },
    fetchPolicy: "cache-and-network",
  });
  const { data: eventsData } = useQuery(SAFETY_EVENTS_QUERY, {
    variables: { eventType: "INCIDENT,ACCIDENT" },
    fetchPolicy: "cache-and-network",
  });
  const items: any[] = (data as any)?.safetyInjuryClaims || [];
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((e: any) => (e.claimantName || "").toLowerCase().includes(q));
  }, [items, searchQuery]);
  const events: any[] = (eventsData as any)?.safetyEvents || [];
  const injuryEvents = events.filter((ev: any) => ev.injuryInvolved);

  const [createMut] = useMutation(CREATE_SAFETY_INJURY_CLAIM_MUTATION);
  const [updateMut] = useMutation(UPDATE_SAFETY_INJURY_CLAIM_MUTATION);
  const [openMut] = useMutation(OPEN_SAFETY_INJURY_CLAIM_MUTATION);
  const [reviewMut] = useMutation(REVIEW_SAFETY_INJURY_CLAIM_MUTATION);
  const [waitMut] = useMutation(WAIT_INFO_SAFETY_INJURY_CLAIM_MUTATION);
  const [closeMut] = useMutation(CLOSE_SAFETY_INJURY_CLAIM_MUTATION);
  const [cancelMut] = useMutation(CANCEL_SAFETY_INJURY_CLAIM_MUTATION);

  const showMsg = useCallback((text: string, tone: "success" | "error" = "success") => {
    setMsg({ text, tone }); setTimeout(() => setMsg(null), 3000);
  }, []);

  const requiredOk = cClaimantName.trim() !== "" && cClaimType !== "" && cOwner.trim() !== "";

  const resetForm = useCallback(() => {
    setCC(""); setCEd(""); setCT("FIRST_AID"); setCEI(""); setCIS(""); setCBA("");
    setCLT(false); setCR(false); setCRI(false); setCIR(""); setCO(""); setCN("");
  }, []);

  const hNew = useCallback(() => { setCreating(true); setSelectedId(null); setEditing(false); resetForm(); }, [resetForm]);

  const hEdit = useCallback((item: any) => {
    setEditItem({ ...item }); setEditing(true); setCreating(false);
    setCC(item.claimantName); setCEd(item.claimantEmployeeId || ""); setCT(item.claimType);
    setCEI(item.safetyEventId ? String(item.safetyEventId) : "");
    setCIS(item.injurySummary || ""); setCBA(item.bodyArea || "");
    setCLT(!!item.lostTime); setCR(!!item.restrictedWork);
    setCRI(!!item.reportedToInsurer); setCIR(item.insurerReference || "");
    setCO(item.owner || ""); setCN(item.notes || "");
  }, []);

  const buildVars = useCallback(() => ({
    claimantName: cClaimantName.trim(), claimType: cClaimType,
    claimantEmployeeId: cEmployeeId.trim() || null,
    injurySummary: cInjurySummary.trim() || null, bodyArea: cBodyArea.trim() || null,
    lostTime: cLostTime, restrictedWork: cRestricted,
    reportedToInsurer: cReportedInsurer, insurerReference: cInsurerRef.trim() || null,
    owner: cOwner.trim() || null, notes: cNotes.trim() || null,
    safetyEventId: cEventId ? parseInt(cEventId, 10) : null,
  }), [cClaimantName, cEmployeeId, cClaimType, cInjurySummary, cBodyArea,
      cLostTime, cRestricted, cReportedInsurer, cInsurerRef, cOwner, cNotes, cEventId]);

  const hCreate = useCallback(async () => {
    if (!requiredOk) return;
    try { await createMut({ variables: buildVars() }); showMsg("Claim created"); setCreating(false); refetch(); }
    catch (e: any) { showMsg(e?.message || "Create failed", "error"); }
  }, [requiredOk, createMut, buildVars, showMsg, refetch]);

  const hSaveEdit = useCallback(async () => {
    if (!editItem?.id) return;
    try { await updateMut({ variables: { id: editItem.id, ...buildVars() } }); showMsg("Claim updated"); setEditing(false); setEditItem(null); refetch(); }
    catch (e: any) { showMsg(e?.message || "Update failed", "error"); }
  }, [editItem, updateMut, buildVars, showMsg, refetch]);

  const hCancelEdit = useCallback(() => { setEditing(false); setEditItem(null); resetForm(); }, [resetForm]);

  const hTransition = useCallback(async (mut: any, id: number, msgText: string) => {
    try { await mut({ variables: { id } }); showMsg(msgText); refetch(); }
    catch (e: any) { showMsg(e?.message || "Action failed", "error"); }
  }, [refetch, showMsg]);

  const selItem = selectedId ? items.find((e: any) => e.id === selectedId) ?? null : null;
  const selStatus = selItem?.status || "";

  const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-b border-border/50 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
      <div className={SECTION_TITLE}>{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const renderForm = () => {
    const injuryEventOpts = injuryEvents.length > 0 ? injuryEvents : events.filter((ev: any) => ev.eventType === "INCIDENT" || ev.eventType === "ACCIDENT");
    return (
      <div className="flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-x-6 h-full">
          {/* Left Column */}
          <div className="space-y-0">
            <FormSection title="Claimant & Type">
              <div>
                <label className={LABEL}>Claimant Name *</label>
                <input type="text" value={cClaimantName} onChange={(e) => setCC(e.target.value)} className={SEL} placeholder="Full name..." />
              </div>
              <div>
                <label className={LABEL}>Employee ID <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="text" value={cEmployeeId} onChange={(e) => setCEd(e.target.value)} className={SEL} placeholder="Employee number..." />
              </div>
              <div>
                <label className={LABEL}>Claim Type *</label>
                <select value={cClaimType} onChange={(e) => setCT(e.target.value)} className={SEL}>
                  {CLAIM_TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </FormSection>
            <FormSection title="Linked Event">
              <div>
                <label className={LABEL}>Safety Event <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <select value={cEventId} onChange={(e) => setCEI(e.target.value)} className={SEL}>
                  <option value="">None</option>
                  {injuryEventOpts.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.eventType})</option>)}
                </select>
                {injuryEvents.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1 italic">Claims may be linked after an injury event is reported.</p>
                )}
              </div>
            </FormSection>
            <FormSection title="Injury Details">
              <div>
                <label className={LABEL}>Injury Summary *</label>
                <textarea value={cInjurySummary} onChange={(e) => setCIS(e.target.value)} rows={3}
                  className="w-full border border-border bg-background px-2 py-1 text-xs outline-none resize-none" placeholder="Describe the injury..." />
              </div>
              <div>
                <label className={LABEL}>Body Area <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="text" value={cBodyArea} onChange={(e) => setCBA(e.target.value)} className={SEL} placeholder="e.g. left hand, lower back..." />
              </div>
            </FormSection>
            <FormSection title="Impact">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-secondary-foreground cursor-pointer">
                  <input type="checkbox" checked={cLostTime} onChange={(e) => setCLT(e.target.checked)} className="h-3.5 w-3.5" /> Lost time
                </label>
                <label className="flex items-center gap-2 text-xs text-secondary-foreground cursor-pointer">
                  <input type="checkbox" checked={cRestricted} onChange={(e) => setCR(e.target.checked)} className="h-3.5 w-3.5" /> Restricted work
                </label>
              </div>
            </FormSection>
          </div>
          {/* Right Column */}
          <div className="flex flex-col h-full min-h-0 space-y-0">
            <FormSection title="Insurer / Reference">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-secondary-foreground cursor-pointer">
                  <input type="checkbox" checked={cReportedInsurer} onChange={(e) => setCRI(e.target.checked)} className="h-3.5 w-3.5" /> Reported to insurer
                </label>
              </div>
              <div>
                <label className={LABEL}>Insurer Reference <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="text" value={cInsurerRef} onChange={(e) => setCIR(e.target.value)} className={SEL} placeholder="Claim / case number..." />
              </div>
            </FormSection>
            <FormSection title="Ownership">
              <div>
                <label className={LABEL}>Owner *</label>
                <input type="text" value={cOwner} onChange={(e) => setCO(e.target.value)} className={SEL} placeholder="Assigned owner..." />
              </div>
            </FormSection>
            <FormSection title="Status">
              <div className="h-8 flex items-center text-sm text-muted-foreground">
                {creating ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border bg-muted text-muted-foreground border-border">DRAFT</span>
                ) : editing ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border bg-muted text-muted-foreground border-border">{statusLabel(editItem?.status || "DRAFT")}</span>
                ) : null}
              </div>
            </FormSection>
            <div className="flex-1 min-h-0 flex flex-col border-b border-border/50 pb-3 mb-3">
              <div className={SECTION_TITLE}>Notes</div>
              <div className="flex-1 min-h-0 flex flex-col">
                <textarea value={cNotes} onChange={(e) => setCN(e.target.value)}
                  className="flex-1 min-h-0 w-full resize-none overflow-auto border border-border bg-background px-2 py-1 text-xs outline-none" placeholder="Additional notes..." />
              </div>
            </div>
            {!requiredOk && (
              <div className="shrink-0 p-2 bg-warning/10 border border-warning/20 text-[10px] text-warning">Required: {["Claimant Name", "Claim Type", ...(!cOwner.trim() ? ["Owner"] : [])].join(", ")}</div>
            )}
          </div>
        </div>
      </div>
      </div>
    );
  };

  const renderDetail = () => {
    if (creating || editing) return renderForm();
    if (!selItem) return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center max-w-sm px-6">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Injury Claims</h3>
          <p className="text-xs text-muted-foreground mb-3">Select a claim to view details or create a new record.</p>
        </div>
      </div>
    );
    const stCls = STATUS_STYLES[selItem.status] || STATUS_STYLES.DRAFT;
    const claimType = CLAIM_TYPE_OPTS.find((o: any) => o.value === selItem.claimType)?.label || selItem.claimType;
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">{selItem.claimantName}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${stCls}`}>{statusLabel(selItem.status)}</span>
              <span className="inline-flex px-1 py-0.5 text-[10px] font-medium border bg-muted text-muted-foreground border-border">{claimType}</span>
              {selItem.claimNumber && <span className="text-[10px] text-muted-foreground">#{selItem.claimNumber}</span>}
            </div>
          </div>
          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-3">
              {selItem.claimantEmployeeId && (
                <div><p className="text-[10px] font-medium text-muted-foreground">Employee ID</p><p className="text-xs text-foreground">{selItem.claimantEmployeeId}</p></div>
              )}
              {selItem.safetyEventId && (
                <div><p className="text-[10px] font-medium text-muted-foreground">Linked Event</p><p className="text-xs text-foreground">Event #{selItem.safetyEventId}</p></div>
              )}
              {selItem.injurySummary && (
                <div><p className="text-[10px] font-medium text-muted-foreground">Injury Summary</p><p className="text-xs text-foreground">{selItem.injurySummary}</p></div>
              )}
              {selItem.bodyArea && (
                <div><p className="text-[10px] font-medium text-muted-foreground">Body Area</p><p className="text-xs text-foreground">{selItem.bodyArea}</p></div>
              )}
            </div>
            <div className="space-y-3">
              {(selItem.lostTime || selItem.restrictedWork) && (
                <div><p className="text-[10px] font-medium text-muted-foreground">Impact</p><div className="flex gap-1.5 text-[10px] flex-wrap mt-0.5">{selItem.lostTime && <span className="bg-danger/10 text-danger px-1.5 py-0.5 border border-danger/20">Lost Time</span>}{selItem.restrictedWork && <span className="bg-warning/10 text-warning px-1.5 py-0.5 border border-warning/20">Restricted Work</span>}</div></div>
              )}
              {selItem.reportedToInsurer && (
                <div><p className="text-[10px] font-medium text-muted-foreground">Insurer</p><p className="text-xs text-foreground">{selItem.insurerReference || "Reported"}</p></div>
              )}
              <div><p className="text-[10px] font-medium text-muted-foreground">Owner</p><p className="text-xs text-foreground">{selItem.owner || "-"}</p></div>
              <div><p className="text-[10px] font-medium text-muted-foreground">Opened</p><p className="text-xs text-foreground">{selItem.openedAt ? new Date(selItem.openedAt).toLocaleDateString() : "Not yet opened"}</p></div>
              {selItem.closedAt && <div><p className="text-[10px] font-medium text-muted-foreground">Closed</p><p className="text-xs text-foreground">{new Date(selItem.closedAt).toLocaleDateString()}</p></div>}
            </div>
          </div>
          {selItem.notes && <div className="border-t border-border/50 pt-3"><p className="text-[10px] font-medium text-muted-foreground mb-1">Notes</p><p className="text-xs text-muted-foreground/70">{selItem.notes}</p></div>}
        </div>
      </div>
    );
  };

  const canOpen = selStatus === "DRAFT"; const canReview = selStatus === "OPEN";
  const canWait = selStatus === "UNDER_REVIEW"; const canClose = selStatus === "UNDER_REVIEW" || selStatus === "WAITING_INFO";
  const canCancel = selStatus !== "CLOSED" && selStatus !== "CANCELLED";
  const isEditable = selStatus === "DRAFT" || selStatus === "OPEN";

  const toolbarContent = (
    <PageToolbar
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search claims..."
      filters={
        <ToolbarDropdown value={filterStatus} onChange={(v) => { setFilterStatus(v); setSelectedId(null); }} options={STATUS_FILTERS} placeholder="Status" width="w-36" />
      }
      actions={
        creating ? (<><ToolbarButton icon={Save} label="Save Draft" onClick={hCreate} disabled={!requiredOk} variant="success" /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { setCreating(false); setSelectedId(null); resetForm(); }} /></>) :
        editing ? (<><ToolbarButton icon={Save} label="Update" onClick={hSaveEdit} disabled={!requiredOk} variant="success" /><ToolbarButton icon={Ban} label="Cancel" onClick={hCancelEdit} /></>) :
        !selItem ? (<><ToolbarButton icon={Plus} label="New Claim" onClick={hNew} variant="success" /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>) :
        (<><ToolbarButton icon={Pencil} label="Edit" onClick={() => hEdit(selItem)} disabled={!isEditable} /><ToolbarButton icon={Play} label="Open" onClick={() => hTransition(openMut, selItem.id, "Claim opened")} disabled={!canOpen} /><ToolbarButton icon={Eye} label="Review" onClick={() => hTransition(reviewMut, selItem.id, "Claim under review")} disabled={!canReview} /><ToolbarButton icon={Clock} label="Wait Info" onClick={() => hTransition(waitMut, selItem.id, "Set to waiting info")} disabled={!canWait} /><ToolbarButton icon={CheckCircle} label="Close" onClick={() => hTransition(closeMut, selItem.id, "Claim closed")} disabled={!canClose} variant={canClose ? "success" : "default"} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => setCancelId(selItem.id)} disabled={!canCancel} variant="destructive" /><ToolbarSeparator /><ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { setSelectedId(null); setCreating(false); setEditing(false); }} /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>)
      }
    />
  );

  const leftColumnContent = (
    <>
      <div className="shrink-0 h-8 border-b border-border flex items-center bg-muted px-4">
        <span className="text-sm font-medium text-secondary-foreground">Claims</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{items.length}</span>
      </div>
      {searchQuery && filteredItems.length === 0 && items.length > 0 && <div className="px-4 py-2 text-[10px] text-muted-foreground/60 italic">No claims match &quot;{searchQuery}&quot;</div>}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50 sidebar-scroll">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Search className="h-5 w-5 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground font-medium">No injury claims recorded.</p>
            <button onClick={hNew} className="mt-3 inline-flex h-7 items-center gap-1 bg-danger px-2.5 text-[10px] font-semibold text-danger-foreground hover:bg-danger/80"><Plus className="h-3 w-3" /> New Claim</button>
          </div>
        ) : filteredItems.map((e: any) => (
          <div key={e.id} onClick={() => { setCreating(false); setEditing(false); setSelectedId(e.id); }}
            className={`group flex items-start gap-2 w-full rounded-md px-3 py-2.5 cursor-pointer text-sm transition-all border-l-2 ${selectedId === e.id ? "bg-accent/15 border-accent" : "border-l-transparent hover:bg-muted"}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-semibold text-foreground">{e.claimantName}</span></div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{CLAIM_TYPE_OPTS.find((o: any) => o.value === e.claimType)?.label || e.claimType}</span>
                <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${STATUS_STYLES[e.status] || STATUS_STYLES.DRAFT}`}>{statusLabel(e.status)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const footerContent = <>{items.length} claim{items.length !== 1 ? "s" : ""}{!creating && !selItem && <span className="ml-auto">Select a claim to view details</span>}</>;

  const confirmDialog = cancelId && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setCancelId(null)}>
      <div className="bg-popover border border-border shadow-lg w-80" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Cancel Claim</h3>
          <p className="text-xs text-muted-foreground">Cancel this injury claim? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCancelId(null)} className="h-8 px-3 text-xs font-medium text-secondary-foreground border border-border bg-background hover:bg-muted">No</button>
            <button onClick={() => { hTransition(cancelMut, cancelId, "Claim cancelled"); setCancelId(null); }} className="h-8 px-3 text-xs font-semibold text-danger-foreground bg-danger hover:bg-danger/80">Yes, Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AppPageLayout icon={<AlertTriangle className="h-5 w-5 stroke-current" />} iconClass="bg-danger/15 text-danger"
        title="Injury Claims" subtitle="Record and track workplace injury claims from first report through closure."
        systemMessage={msg ? { text: msg.text, type: msg.tone } : null} onDismissSystemMessage={() => setMsg(null)}
        toolbar={toolbarContent} leftColumn={leftColumnContent} leftColumnWidth="w-[20%]" footer={footerContent}>
        {renderDetail()}
      </AppPageLayout>
      {confirmDialog}
    </>
  );
}
