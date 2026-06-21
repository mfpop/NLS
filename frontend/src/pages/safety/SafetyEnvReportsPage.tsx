import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { FileText, Plus, Save, Ban, Play, CheckCircle, RefreshCw, Pencil, ArrowLeft, Search } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { SplitToolbar } from "@/components/shared/SplitToolbar";
import { ToolbarDropdown, ToolbarButton } from "@/components/shared/Toolbar";
import { SourceLocationSelector } from "@/components/shared/SourceLocationSelector";
import { SAFETY_ENV_REPORTS_QUERY, SAFETY_EVENTS_QUERY } from "@/graphql/checkQueries";
import { PRODUCTION_STRUCTURE_TREE_QUERY } from "@/graphql/productionStructureQueries";
import {
  CREATE_SAFETY_ENV_REPORT_MUTATION, UPDATE_SAFETY_ENV_REPORT_MUTATION,
  REPORT_SAFETY_ENV_REPORT_MUTATION, CLOSE_SAFETY_ENV_REPORT_MUTATION,
  CANCEL_SAFETY_ENV_REPORT_MUTATION,
} from "@/graphql/checkMutations";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  REPORTED: "bg-blue-100 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
  ACTION_REQUIRED: "bg-orange-100 text-orange-700 border-orange-200",
  CLOSED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

const REPORT_TYPE_OPTS = [
  { value: "SPILL", label: "Spill" },
  { value: "RELEASE", label: "Release" },
  { value: "EMISSION", label: "Emission" },
  { value: "WASTE", label: "Waste Incident" },
  { value: "OTHER", label: "Other" },
];

const UNIT_OPTS = [
  { value: "", label: "—" },
  { value: "liters", label: "liters" },
  { value: "gallons", label: "gallons" },
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
  { value: "pieces", label: "pieces" },
  { value: "other", label: "other" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "REPORTED", label: "Reported" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "ACTION_REQUIRED", label: "Action Required" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const SEL_INPUT = "h-8 w-full bg-white border border-slate-200 px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30";

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function nowISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const initLoc = { plantId: "", lineId: "", departmentId: "", resourceGroupId: "", resourceId: "", targetType: "PLANT", targetId: null };

export function SafetyEnvReportsPage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);

  // Form fields
  const [cTitle, setCT] = useState("");
  const [cReportType, setCRT] = useState("SPILL");
  const [cDesc, setCD] = useState("");
  const [cOccurredAt, setCOA] = useState("");
  const [cOwner, setCOw] = useState("");
  const [cLinkedEventId, setCLEI] = useState<number | null>(null);
  const [cMaterial, setCM] = useState("");
  const [cQuantity, setCQ] = useState("");
  const [cUnit, setCU] = useState("");
  const [cContainment, setCC] = useState("");
  const [cCleanup, setCCU] = useState(false);
  const [cCleanupNotes, setCCN] = useState("");
  const [cExternal, setCE] = useState(false);
  const [cExtRef, setCER] = useState("");
  const [cNotes, setCN] = useState("");
  const [cLocationText, setCLT] = useState("");
  const [cLoc, setCLoc] = useState(initLoc);

  // Queries
  const { data, refetch } = useQuery(SAFETY_ENV_REPORTS_QUERY, {
    variables: { status: filterStatus || null },
    fetchPolicy: "cache-and-network",
  });
  const items: any[] = (data as any)?.safetyEnvironmentalReports || [];
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((e: any) => (e.title || "").toLowerCase().includes(q));
  }, [items, searchQuery]);

  const { data: structData } = useQuery(PRODUCTION_STRUCTURE_TREE_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const structPlants: any[] = (structData as any)?.productionStructureTree || [];

  const { data: eventsData } = useQuery(SAFETY_EVENTS_QUERY, {
    variables: { status: null },
    fetchPolicy: "cache-and-network",
  });
  const allEvents: any[] = (eventsData as any)?.safetyEvents || [];
  const envEvents = useMemo(
    () => allEvents.filter((ev: any) => ev.environmentalImpact),
    [allEvents],
  );

  const plants = useMemo(() => structPlants.map((p: any) => ({ id: p.id, name: p.name, code: p.code })), [structPlants]);
  const lines = useMemo(() => structPlants.flatMap((p: any) => (p.productionLines || []).map((l: any) => ({ ...l, plantName: p.name }))), [structPlants]);
  const departments = useMemo(() => lines.flatMap((l: any) => (l.departments || []).map((d: any) => ({ ...d, plantId: l.plantId }))), [lines]);
  const resourceGroups = useMemo(() => departments.flatMap((d: any) => (d.resourceGroups || []).map((rg: any) => ({ ...rg, departmentId: d.id }))), [departments]);
  const resources = useMemo(() => resourceGroups.flatMap((rg: any) => (rg.resources || []).map((r: any) => ({ ...r, resourceGroupId: rg.id }))), [resourceGroups]);

  // Mutations
  const [createMut] = useMutation(CREATE_SAFETY_ENV_REPORT_MUTATION);
  const [updateMut] = useMutation(UPDATE_SAFETY_ENV_REPORT_MUTATION);
  const [reportMut] = useMutation(REPORT_SAFETY_ENV_REPORT_MUTATION);
  const [closeMut] = useMutation(CLOSE_SAFETY_ENV_REPORT_MUTATION);
  const [cancelMut] = useMutation(CANCEL_SAFETY_ENV_REPORT_MUTATION);

  const showMsg = useCallback((text: string, tone: "success" | "error" = "success") => {
    setMsg({ text, tone });
    setTimeout(() => setMsg(null), 3000);
  }, []);

  const requiredOk = cTitle.trim() !== "" && cReportType !== "" && cOwner.trim() !== "" && cOccurredAt !== "";

  const resetForm = useCallback(() => {
    setCT(""); setCRT("SPILL"); setCD(""); setCOA(""); setCOw(""); setCLEI(null);
    setCM(""); setCQ(""); setCU(""); setCC(""); setCCU(false); setCCN("");
    setCE(false); setCER(""); setCN(""); setCLT(""); setCLoc(initLoc);
  }, []);

  const hNew = useCallback(() => {
    setCreating(true); setSelectedId(null); setEditing(false);
    resetForm(); setCOA(nowISO());
    if (plants.length === 1) setCLoc((prev) => ({ ...prev, plantId: String(plants[0].id) }));
  }, [resetForm, plants]);

  const hEdit = useCallback((item: any) => {
    setEditItem({ ...item });
    setEditing(true); setCreating(false);
    setCT(item.title); setCRT(item.reportType); setCD(item.description || "");
    setCOA(item.occurredAt?.slice(0, 16) || nowISO());
    setCOw(item.owner || ""); setCLEI(item.safetyEventId || null);
    setCM(item.materialInvolved || "");
    setCQ(item.estimatedQuantity != null ? String(item.estimatedQuantity) : "");
    setCU(item.unit || "");
    setCC(item.containmentAction || ""); setCCU(!!item.cleanupRequired);
    setCE(!!item.reportedExternally); setCER(item.externalReference || "");
    setCN(item.notes || ""); setCLT(item.locationText || "");
    setCLoc(initLoc);
  }, []);

  const buildCreateVars = useCallback(() => ({
    title: cTitle.trim(),
    reportType: cReportType,
    description: cDesc || null,
    occurredAt: cOccurredAt || null,
    owner: cOwner || null,
    safetyEventId: cLinkedEventId,
    materialInvolved: cMaterial || null,
    estimatedQuantity: cQuantity ? parseFloat(cQuantity) : null,
    unit: cUnit || null,
    containmentAction: cContainment || null,
    cleanupRequired: cCleanup,
    reportedExternally: cExternal,
    externalReference: cExtRef || null,
    notes: cCleanup && cCleanupNotes
      ? `${cCleanupNotes}${cNotes ? `

${cNotes}` : ""}`
      : (cNotes || null),
    targetType: cLoc.targetType,
    targetId: cLoc.targetId,
    locationText: cLocationText || null,
  }), [cTitle, cReportType, cDesc, cOccurredAt, cOwner, cLinkedEventId,
      cMaterial, cQuantity, cUnit, cContainment, cCleanup, cCleanupNotes,
      cExternal, cExtRef, cNotes, cLoc, cLocationText]);

  const hCreate = useCallback(async () => {
    if (!requiredOk) return;
    try {
      await createMut({ variables: buildCreateVars() });
      showMsg("Report created"); setCreating(false); refetch();
    } catch (e: any) {
      showMsg(e?.message || "Create failed", "error");
    }
  }, [requiredOk, createMut, buildCreateVars, refetch, showMsg]);

  const hSaveEdit = useCallback(async () => {
    if (!editItem?.id || !requiredOk) return;
    try {
      const vars = buildCreateVars();
      await updateMut({ variables: { id: editItem.id, ...vars } });
      showMsg("Report updated"); setEditing(false); setEditItem(null); refetch();
    } catch (e: any) {
      showMsg(e?.message || "Update failed", "error");
    }
  }, [editItem, requiredOk, updateMut, buildCreateVars, refetch, showMsg]);

  const hCancelEdit = useCallback(() => {
    setEditing(false); setEditItem(null); resetForm();
  }, [resetForm]);

  const hTransition = useCallback(async (mut: any, id: number, m: string) => {
    try { await mut({ variables: { id } }); showMsg(m); refetch(); } catch (e: any) { showMsg(e?.message || "Failed", "error"); }
  }, [refetch, showMsg]);

  const selItem = selectedId ? items.find((e: any) => e.id === selectedId) ?? null : null;
  const selStatus = selItem?.status || "";
  const selEnvEvent = selItem?.safetyEventId ? allEvents.find((ev: any) => ev.id === selItem.safetyEventId) : null;

  const hNewDraft = useCallback(() => {
    if (!requiredOk) return;
    hCreate();
  }, [requiredOk, hCreate]);

  // ── Form ──
  const renderForm = () => {
    const sc = "border-b border-slate-100 pb-2 mb-2";
    const st = "text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5";
    const lc = "block text-xs font-medium text-slate-500 mb-1";
    const isCreating = creating;

    return (
      <div className="flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0 h-full">
          {/* ── Left Column ── */}
          <div className="space-y-0">
            {/* Report Details */}
            <div className={sc}>
              <div className={st}>Report Details</div>
              <div className="space-y-2">
                <div>
                  <label className={lc}>Title *</label>
                  <input type="text" value={cTitle} onChange={(e) => setCT(e.target.value)} className={SEL_INPUT} placeholder="Report title..." />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={lc}>Report Type *</label>
                    <select value={cReportType} onChange={(e) => setCRT(e.target.value)} className={SEL_INPUT}>
                      {REPORT_TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={lc}>Occurred At *</label>
                    <input type="datetime-local" value={cOccurredAt} onChange={(e) => setCOA(e.target.value)} className={SEL_INPUT} />
                  </div>
                </div>
                <div>
                  <label className={lc}>Description</label>
                  <textarea value={cDesc} onChange={(e) => setCD(e.target.value)} rows={2} className="w-full border border-slate-200 bg-white px-2 py-1 text-xs outline-none resize-none" placeholder="Describe the environmental event..." />
                </div>
              </div>
            </div>

            {/* Source Location */}
            <div className={sc}>
              <SourceLocationSelector
                plants={plants} lines={lines} departments={departments}
                resourceGroups={resourceGroups} resources={resources}
                value={cLoc} onChange={setCLoc}
              />
              <div className="mt-1.5">
                <label className={lc}>Location Detail <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" value={cLocationText} onChange={(e) => setCLT(e.target.value)} className={SEL_INPUT} placeholder="Specific physical location..." />
              </div>
            </div>

            {/* Material */}
            <div>
              <div className={st}>Material</div>
              <div className="space-y-2">
                <div>
                  <label className={lc}>Material Involved</label>
                  <input type="text" value={cMaterial} onChange={(e) => setCM(e.target.value)} className={SEL_INPUT} placeholder="Substance/material name..." />
                </div>
                <div className="flex gap-2">
                  <div className="w-24">
                    <label className={lc}>Qty</label>
                    <input type="number" value={cQuantity} onChange={(e) => setCQ(e.target.value)} className={SEL_INPUT} placeholder="—" />
                  </div>
                  <div className="flex-1">
                    <label className={lc}>Unit</label>
                    <select value={cUnit} onChange={(e) => setCU(e.target.value)} className={SEL_INPUT}>
                      {UNIT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="flex flex-col min-h-0 h-full gap-0">
            {/* Containment / Cleanup — grows first */}
            <div style={{ flex: 2 }} className={`${sc} min-h-0 flex flex-col`}>
              <div className="shrink-0">
                <div className={st}>Containment & Cleanup</div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col space-y-1">
                <div className="flex-1 min-h-0 flex flex-col">
                  <label className={`${lc} shrink-0`}>Containment Action</label>
                  <textarea value={cContainment} onChange={(e) => setCC(e.target.value)} className="min-h-[48px] w-full flex-1 border border-slate-200 bg-white px-2 py-1 text-xs outline-none resize-none overflow-auto" placeholder="Actions taken to contain..." />
                </div>
                {cCleanup && (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <label className={`${lc} shrink-0`}>Cleanup Notes</label>
                    <textarea value={cCleanupNotes} onChange={(e) => setCCN(e.target.value)} className="min-h-[48px] w-full flex-1 border border-slate-200 bg-white px-2 py-1 text-xs outline-none resize-none overflow-auto" placeholder="Cleanup details..." />
                  </div>
                )}
              </div>
            </div>

            {/* Linked Event — compact */}
            <div className={`${sc} shrink-0`}>
              <div className={st}>Linked Safety Event</div>
              <select
                value={cLinkedEventId ?? ""}
                onChange={(e) => setCLEI(e.target.value ? parseInt(e.target.value, 10) : null)}
                className={SEL_INPUT}
              >
                <option value="">None</option>
                {envEvents.length > 0
                  ? envEvents.map((ev: any) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.eventType})
                      </option>
                    ))
                  : allEvents
                      .filter((ev: any) => ev.eventType === "INCIDENT" || ev.eventType === "ACCIDENT")
                      .map((ev: any) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} ({ev.eventType})
                        </option>
                      ))}
              </select>
              {isCreating && envEvents.length === 0 && (
                <p className="text-[10px] text-slate-400 leading-tight mt-1">
                  Reports may be linked after an environmental-impact event is reported.
                </p>
              )}
            </div>

            {/* Ownership — compact */}
            <div className={`${sc} shrink-0`}>
              <div className={st}>Ownership</div>
              <div>
                <label className={lc}>Owner *</label>
                <input type="text" value={cOwner} onChange={(e) => setCOw(e.target.value)} className={SEL_INPUT} placeholder="Assignee..." />
              </div>
            </div>

            {/* Impact / Reporting — compact */}
            <div className={`${sc} shrink-0`}>
              <div className={st}>Impact / Reporting</div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={cCleanup} onChange={(e) => setCCU(e.target.checked)} className="h-3.5 w-3.5" />
                  Cleanup required
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={cExternal} onChange={(e) => setCE(e.target.checked)} className="h-3.5 w-3.5" />
                  Reported externally
                </label>
                {cExternal && (
                  <div>
                    <label className={lc}>External Reference</label>
                    <input type="text" value={cExtRef} onChange={(e) => setCER(e.target.value)} className={SEL_INPUT} placeholder="Agency/case reference..." />
                  </div>
                )}
              </div>
            </div>

            {/* Notes — grows second, fills remaining */}
            <div style={{ flex: 1 }} className="min-h-0 flex flex-col">
              <div className={`${st} shrink-0`}>Notes</div>
              <textarea value={cNotes} onChange={(e) => setCN(e.target.value)} className="min-h-[48px] w-full flex-1 border border-slate-200 bg-white px-2 py-1 text-xs outline-none resize-none overflow-auto" placeholder="Additional notes..." />
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  };

  // ── Detail View ──
  const renderDetail = () => {
    if (creating || editing) return renderForm();
    if (!selItem) {
      return (
        <div className="flex flex-1 items-center justify-center h-full">
          <div className="text-center max-w-sm px-6">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Environmental Reports</h3>
            <p className="text-xs text-slate-500 mb-3">Select a report to view details or create a new record.</p>
          </div>
        </div>
      );
    }

    const stCls = STATUS_STYLES[selItem.status] || STATUS_STYLES.DRAFT;

    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">{selItem.title}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${stCls}`}>
              {statusLabel(selItem.status)}
            </span>
            <span className="inline-flex px-1 py-0.5 text-[10px] font-medium border bg-slate-100 text-slate-700 border-slate-200">
              {REPORT_TYPE_OPTS.find((o: any) => o.value === selItem.reportType)?.label || selItem.reportType}
            </span>
          </div>
        </div>

        {/* Detail Grid */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {/* Left Column */}
            <div className="space-y-3">
              {selItem.description && (
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-900">{selItem.description}</p>
                </div>
              )}
              {selItem.occurredAt && (
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Occurred At</p>
                  <p className="text-xs text-slate-900">{new Date(selItem.occurredAt).toLocaleString()}</p>
                </div>
              )}
              {(selItem.materialInvolved || selItem.estimatedQuantity) && (
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Material</p>
                  <p className="text-xs text-slate-900">
                    {selItem.materialInvolved}
                    {selItem.estimatedQuantity ? ` — ${selItem.estimatedQuantity} ${selItem.unit || ""}` : ""}
                  </p>
                </div>
              )}
              {selEnvEvent && (
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Linked Event</p>
                  <p className="text-xs text-slate-900">{selEnvEvent.title} ({selEnvEvent.eventType})</p>
                </div>
              )}
              {selItem.locationText && (
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Location</p>
                  <p className="text-xs text-slate-900">{selItem.locationText}</p>
                </div>
              )}
              {selItem.targetType && (
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Source</p>
                  <p className="text-xs text-slate-900">{selItem.targetType} #{selItem.targetId}</p>
                </div>
              )}
              <div className="flex gap-2 text-xs flex-wrap">
                {selItem.cleanupRequired && (
                  <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 border border-emerald-200">Cleanup Required</span>
                )}
                {selItem.reportedExternally && (
                  <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 border border-orange-200">Reported Externally</span>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              {selItem.containmentAction && (
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Containment</p>
                  <p className="text-xs text-slate-900">{selItem.containmentAction}</p>
                </div>
              )}
              {selItem.owner && (
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Owner</p>
                  <p className="text-xs text-slate-900">{selItem.owner}</p>
                </div>
              )}
              {selItem.externalReference && (
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-1">External Reference</p>
                  <p className="text-xs text-slate-900">{selItem.externalReference}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-1">Reported</p>
                <p className="text-xs text-slate-900">{selItem.reportedAt ? new Date(selItem.reportedAt).toLocaleString() : "—"}</p>
              </div>
              {selItem.notes && (
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Notes</p>
                  <p className="text-xs text-slate-900">{selItem.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Toolbar state ──
  const canReport = selStatus === "DRAFT";
  const canClose = selStatus === "UNDER_REVIEW" || selStatus === "ACTION_REQUIRED";
  const canCancel = selStatus !== "CLOSED" && selStatus !== "CANCELLED";
  const isEditable = selStatus === "DRAFT";

  const toolbarContent = (
    <SplitToolbar
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search reports..."
      filters={
        <>
          <ToolbarDropdown value={filterStatus} onChange={(v) => { setFilterStatus(v); setSelectedId(null); }} options={STATUS_FILTERS} />
        </>
      }
      actions={
        creating ? (
          <>
            <ToolbarButton icon={Save} label="Save Draft" onClick={hNewDraft} disabled={!requiredOk} variant="success" />
            <ToolbarButton icon={Ban} label="Cancel" onClick={() => { setCreating(false); resetForm(); }} />
          </>
        ) : editing ? (
          <>
            <ToolbarButton icon={Save} label="Update" onClick={hSaveEdit} disabled={!requiredOk} variant="success" />
            <ToolbarButton icon={Ban} label="Cancel" onClick={hCancelEdit} />
          </>
        ) : !selItem ? (
          <>
            <ToolbarButton icon={Plus} label="New Report" onClick={hNew} variant="primary" />
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
          </>
        ) : (
          <>
            <ToolbarButton icon={Pencil} label="Edit" onClick={() => hEdit(selItem)} disabled={!isEditable} />
            <ToolbarButton icon={Play} label="Report" onClick={() => hTransition(reportMut, selItem.id, "Reported")} disabled={!canReport} />
            <ToolbarButton icon={CheckCircle} label="Close" onClick={() => hTransition(closeMut, selItem.id, "Closed")} disabled={!canClose} variant={canClose ? "success" : "default"} />
            <ToolbarButton icon={Ban} label="Cancel" onClick={() => setCancelId(selItem.id)} disabled={!canCancel} variant="destructive" />
            <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { setSelectedId(null); setCreating(false); setEditing(false); }} />
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
          </>
        )
      }
    />
  );

  // ── Left list ──
  const leftColumnContent = (
    <>
      <div className="shrink-0 h-8 border-b border-slate-200 flex items-center bg-slate-50 px-4">
        <span className="text-sm font-medium text-slate-700">Reports</span>
        <span className="ml-auto text-[10px] text-slate-500 font-mono">{items.length}</span>
      </div>
      {searchQuery && filteredItems.length === 0 && items.length > 0 && <div className="px-4 py-2 text-[10px] text-slate-400 italic">No reports match &quot;{searchQuery}&quot;</div>}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
            <Search className="h-5 w-5 text-slate-300 mb-2" />
            <p className="text-xs text-slate-500 font-medium mb-2">No environmental reports recorded.</p>
            {!filterStatus && (
              <button onClick={hNew} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                <Plus className="h-3.5 w-3.5" /> New Report
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((e: any) => (
            <div
              key={e.id}
              onClick={() => { setCreating(false); setEditing(false); setSelectedId(e.id); }}
              className={`group flex items-start gap-2 w-full rounded-md px-3 py-2.5 cursor-pointer text-sm transition-all border-l-2 ${
                selectedId === e.id
                  ? "bg-accent/15 border-accent"
                  : "border-l-transparent hover:bg-muted"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{e.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                  <span>{REPORT_TYPE_OPTS.find((o: any) => o.value === e.reportType)?.label || e.reportType}</span>
                  <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${STATUS_STYLES[e.status] || STATUS_STYLES.DRAFT}`}>
                    {statusLabel(e.status)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const footerContent = (
    <>{items.length} report{items.length !== 1 ? "s" : ""}{!creating && !selItem && <span className="ml-auto">Select a report to view details</span>}</>
  );

  // ── Cancel confirmation dialog ──
  const confirmDialog = cancelId && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setCancelId(null)}>
      <div className="bg-white border border-slate-200 shadow-lg w-80" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Cancel Report</h3>
          <p className="text-xs text-slate-600">Cancel this environmental report?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCancelId(null)} className="h-8 px-3 text-xs font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50">
              No
            </button>
            <button
              onClick={() => { hTransition(cancelMut, cancelId, "Cancelled"); setCancelId(null); }}
              className="h-8 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700"
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AppPageLayout
        icon={<FileText className="h-5 w-5 stroke-current" />}
        iconClass="bg-emerald-100 text-emerald-600"
        title="Environmental Reports"
        subtitle="Document environmental events including spills, releases, emissions, and waste incidents."
        systemMessage={msg ? { text: msg.text, type: msg.tone } : null}
        onDismissSystemMessage={() => setMsg(null)}
        toolbar={toolbarContent}
        leftColumn={leftColumnContent}
        leftColumnWidth="w-[20%]"
        footer={footerContent}
      >
        {renderDetail()}
      </AppPageLayout>
      {confirmDialog}
    </>
  );
}
