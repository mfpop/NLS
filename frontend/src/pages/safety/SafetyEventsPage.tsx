import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { AlertTriangle, Plus, Save, CheckCircle, Ban, Play, Pencil, Trash2, ArrowLeft, RefreshCw, Search, Eye } from "lucide-react";
import { useLocation } from "react-router-dom";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar, ToolbarButton, ToolbarDropdown, ToolbarSeparator } from "@/components/layout/PageToolbar";
import { SourceLocationSelector, type LocationHierarchy } from "@/components/shared/SourceLocationSelector";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import { DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY, RESOURCES_QUERY } from "@/graphql/manufacturingQueries";

const SAFETY_EVENTS_BY_TYPE = gql`
  query SafetyEventsByType($eventType: String, $status: String) {
    safetyEvents(eventType: $eventType, status: $status) {
      id eventType severity status targetType targetId title description
      reportedBy reportedAt occurredAt locationText immediateAction
      injuryInvolved propertyDamage environmentalImpact owner closedAt notes createdAt
    }
  }
`;

const CREATE_EVENT = gql`
  mutation CreateSafetyEvent($title: String!, $eventType: String!, $targetType: String!, $targetId: Int, $severity: String, $description: String, $reportedBy: String, $occurredAt: String, $locationText: String, $immediateAction: String, $injuryInvolved: Boolean, $propertyDamage: Boolean, $environmentalImpact: Boolean, $owner: String, $notes: String) {
    createSafetyEvent(title: $title, eventType: $eventType, targetType: $targetType, targetId: $targetId, severity: $severity, description: $description, reportedBy: $reportedBy, occurredAt: $occurredAt, locationText: $locationText, immediateAction: $immediateAction, injuryInvolved: $injuryInvolved, propertyDamage: $propertyDamage, environmentalImpact: $environmentalImpact, owner: $owner, notes: $notes)
  }
`;

const REPORT_EVENT = gql`mutation ReportEvent($id: Int!) { reportSafetyEvent(id: $id) }`;
const REVIEW_EVENT = gql`mutation ReviewEvent($id: Int!) { reviewSafetyEvent(id: $id) }`;
const CLOSE_EVENT = gql`mutation CloseEvent($id: Int!) { closeSafetyEvent(id: $id) }`;
const CANCEL_EVENT = gql`mutation CancelEvent($id: Int!) { cancelSafetyEvent(id: $id) }`;
const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: Int!, $title: String, $description: String, $severity: String, $targetType: String, $targetId: Int, $owner: String, $locationText: String, $immediateAction: String, $injuryInvolved: Boolean, $propertyDamage: Boolean, $environmentalImpact: Boolean, $notes: String) {
    updateSafetyEvent(id: $id, title: $title, description: $description, severity: $severity, targetType: $targetType, targetId: $targetId, owner: $owner, locationText: $locationText, immediateAction: $immediateAction, injuryInvolved: $injuryInvolved, propertyDamage: $propertyDamage, environmentalImpact: $environmentalImpact, notes: $notes)
  }
`;

const SEVERITY_DOT: Record<string, string> = {
  LOW: "bg-muted-foreground/40", MEDIUM: "bg-warning", HIGH: "bg-warning", CRITICAL: "bg-danger",
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  REPORTED: "bg-primary/15 text-primary border-primary/20",
  UNDER_REVIEW: "bg-warning/15 text-warning border-warning/20",
  ACTION_REQUIRED: "bg-warning/15 text-warning border-warning/20",
  CLOSED: "bg-success/15 text-success border-success/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

const EVENT_TYPE_OPTS = [
  { value: "INCIDENT", label: "Incident" },
  { value: "ACCIDENT", label: "Accident" },
  { value: "NEAR_MISS", label: "Near Miss" },
  { value: "HAZARD", label: "Hazard" },
  { value: "OBSERVATION", label: "Observation" },
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

const SEL_INPUT = "h-8 w-full bg-background border border-border px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30";

interface RouteConfig {
  title: string; subtitle: string; purpose: string;
  eventTypes: string[]; icon: any; emptyStateText: string;
  descLabel: string; descPlaceholder: string;
  actionLabel: string; actionPlaceholder: string;
  impactFlagTitle: string;
  impactFlags: Array<{ field: string; label: string }>;
}

const PAGE_CONFIG: Record<string, RouteConfig> = {
  incidents: {
    title: "Incidents / Accidents",
    subtitle: "Record and track safety incidents and accidents across the plant.",
    purpose: "Log details about workplace incidents and accidents that occurred. Capture severity, location, impact, and immediate response actions taken.",
    eventTypes: ["INCIDENT", "ACCIDENT"], icon: AlertTriangle,
    emptyStateText: "No incidents or accidents reported.",
    descLabel: "Incident / accident description",
    descPlaceholder: "Describe what happened, contributing factors, and conditions...",
    actionLabel: "Immediate action taken",
    actionPlaceholder: "Containment measures, first aid, evacuation, or other immediate response...",
    impactFlagTitle: "Impact Flags",
    impactFlags: [
      { field: "injuryInvolved", label: "Injury involved" },
      { field: "propertyDamage", label: "Property damage" },
      { field: "environmentalImpact", label: "Environmental impact" },
    ],
  },
  "near-misses": {
    title: "Near Misses",
    subtitle: "Log near-miss events to identify hazards before they cause harm.",
    purpose: "Report close calls that could have resulted in injury or damage. Use near-miss data to proactively address unsafe conditions.",
    eventTypes: ["NEAR_MISS"], icon: AlertTriangle,
    emptyStateText: "No near misses reported.",
    descLabel: "Potential impact / what almost happened",
    descPlaceholder: "Describe what almost happened, potential consequence, and contributing conditions...",
    actionLabel: "Preventive action taken",
    actionPlaceholder: "Containment or preventive measures taken immediately after the near miss...",
    impactFlagTitle: "Potential Impact Flags",
    impactFlags: [
      { field: "injuryInvolved", label: "Potential injury" },
      { field: "propertyDamage", label: "Potential property damage" },
      { field: "environmentalImpact", label: "Potential environmental impact" },
    ],
  },
  hazards: {
    title: "Hazards / Observations",
    subtitle: "Document hazards and general safety observations.",
    purpose: "Identify and document workplace hazards and safety observations. Track resolution from identification through close-out.",
    eventTypes: ["HAZARD", "OBSERVATION"], icon: AlertTriangle,
    emptyStateText: "No hazards or observations reported.",
    descLabel: "Hazard or observation description",
    descPlaceholder: "Describe the hazard/observation, what was seen, and where...",
    actionLabel: "Suggested immediate control",
    actionPlaceholder: "Temporary controls or actions taken to mitigate the hazard...",
    impactFlagTitle: "Risk Indicators",
    impactFlags: [
      { field: "injuryInvolved", label: "Unsafe condition" },
      { field: "propertyDamage", label: "Unsafe behavior" },
      { field: "environmentalImpact", label: "Requires follow-up" },
    ],
  },
};

function statusLabel(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function nowISO() { const d = new Date(); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }

function entityLabel(items: any[], id: string | number | null | undefined): string {
  if (!id) return "";
  const found = items.find((e: any) => String(e.id) === String(id));
  if (!found) return "";
  if (found.name && found.code) return `${found.code} — ${found.name}`;
  return found.name || found.code || String(id);
}

function resolveTargetLabel(targetType: string, targetId: number | null | undefined, plants: any[], lines: any[], depts: any[], rgs: any[], resources: any[]): string {
  if (!targetId) return targetType || "-";
  switch (targetType) {
    case "PLANT": return entityLabel(plants, targetId);
    case "PRODUCTION_LINE": return entityLabel(lines, targetId);
    case "DEPARTMENT": return entityLabel(depts, targetId);
    case "RESOURCE_GROUP": return entityLabel(rgs, targetId);
    case "RESOURCE": return entityLabel(resources, targetId);
    default: return String(targetId);
  }
}

function resolveEditLoc(
  tt: string, tid: string,
  resources: any[], rgs: any[], depts: any[], lines: any[],
): LocationHierarchy {
  const empty = { plantId: "", lineId: "", departmentId: "", resourceGroupId: "", resourceId: "", targetType: tt as any, targetId: tid ? parseInt(tid, 10) : null };
  if (!tid) return { ...empty, targetType: "PLANT", targetId: null };
  const sid = (v: any) => String(v ?? "");

  switch (tt) {
    case "RESOURCE": {
      const r = resources.find((x: any) => sid(x.id) === tid);
      if (!r) return empty;
      const rgId = sid(r.resourceGroupId);
      const rg = rgs.find((x: any) => sid(x.id) === rgId);
      const dId = rg ? sid(rg.departmentId) : "";
      const d = depts.find((x: any) => sid(x.id) === dId);
      const pId = d ? sid(d.plantId) : "";
      return { plantId: pId, lineId: "", departmentId: dId, resourceGroupId: rgId, resourceId: tid, targetType: "RESOURCE", targetId: parseInt(tid, 10) };
    }
    case "RESOURCE_GROUP": {
      const rg = rgs.find((x: any) => sid(x.id) === tid);
      if (!rg) return empty;
      const dId = sid(rg.departmentId);
      const d = depts.find((x: any) => sid(x.id) === dId);
      const pId = d ? sid(d.plantId) : "";
      return { plantId: pId, lineId: "", departmentId: dId, resourceGroupId: tid, resourceId: "", targetType: "RESOURCE_GROUP", targetId: parseInt(tid, 10) };
    }
    case "DEPARTMENT": {
      const d = depts.find((x: any) => sid(x.id) === tid);
      if (!d) return empty;
      const pId = sid(d.plantId);
      // Try to find the first line associated with this department
      const lineId = d.productionLines?.length ? sid(d.productionLines[0].id) : "";
      return { plantId: pId, lineId, departmentId: tid, resourceGroupId: "", resourceId: "", targetType: "DEPARTMENT", targetId: parseInt(tid, 10) };
    }
    case "PRODUCTION_LINE": {
      const l = lines.find((x: any) => sid(x.id) === tid);
      if (!l) return empty;
      return { plantId: sid(l.plantId), lineId: tid, departmentId: "", resourceGroupId: "", resourceId: "", targetType: "PRODUCTION_LINE", targetId: parseInt(tid, 10) };
    }
    case "PLANT":
    default:
      return { plantId: tid, lineId: "", departmentId: "", resourceGroupId: "", resourceId: "", targetType: "PLANT", targetId: parseInt(tid, 10) };
  }
}

const emptyLoc: LocationHierarchy = { plantId: "", lineId: "", departmentId: "", resourceGroupId: "", resourceId: "", targetType: "PLANT", targetId: null };

export function SafetyEventsPage() {
  const location = useLocation();
  const tab = location.pathname.split("/").pop() || "incidents";
  const cfg = PAGE_CONFIG[tab] || PAGE_CONFIG.incidents;

  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [cType, setCType] = useState(cfg.eventTypes[0] || "INCIDENT");
  const [cSeverity, setCSeverity] = useState("MEDIUM");
  const [cLoc, setCLoc] = useState<LocationHierarchy>(emptyLoc);
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

  const eventTypeFilter = cfg.eventTypes.length === 1 ? cfg.eventTypes[0] : cfg.eventTypes.join(",");
  const routeEventTypeOpts = useMemo(() => EVENT_TYPE_OPTS.filter((o) => cfg.eventTypes.includes(o.value)), [cfg.eventTypes]);
  const singleEventType = routeEventTypeOpts.length === 1;

  const { data, refetch, loading } = useQuery(SAFETY_EVENTS_BY_TYPE, {
    variables: { eventType: eventTypeFilter, status: filterStatus || null },
    fetchPolicy: "cache-and-network",
  });
  const items: any[] = (data as any)?.safetyEvents || [];
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((e: any) => (e.title || "").toLowerCase().includes(q));
  }, [items, searchQuery]);

  // Entity queries for cascade selector
  const { data: plantsData } = useQuery(PLANTS_QUERY, { variables: { status: "ACTIVE" }, fetchPolicy: "cache-and-network" });
  const { data: linesData } = useQuery(PRODUCTION_LINES_QUERY, { variables: { status: "ACTIVE", limit: 500 }, fetchPolicy: "cache-and-network" });
  const { data: deptsData } = useQuery(DEPARTMENTS_QUERY, { variables: { status: "ACTIVE" }, fetchPolicy: "cache-and-network" });
  const { data: rgsData } = useQuery(RESOURCE_GROUPS_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: resourcesData } = useQuery(RESOURCES_QUERY, { fetchPolicy: "cache-and-network" });

  const plants: any[] = (plantsData as any)?.plants ?? [];
  const lines: any[] = (linesData as any)?.productionLines ?? [];
  const depts: any[] = (deptsData as any)?.departments ?? [];
  const rgs: any[] = (rgsData as any)?.resourceGroups ?? [];
  const resources: any[] = (resourcesData as any)?.resources ?? [];

  const [createMut] = useMutation(CREATE_EVENT);
  const [reportMut] = useMutation(REPORT_EVENT);
  const [reviewMut] = useMutation(REVIEW_EVENT);
  const [closeMut] = useMutation(CLOSE_EVENT);
  const [cancelMut] = useMutation(CANCEL_EVENT);
  const [updateMut] = useMutation(UPDATE_EVENT);

  const showMsg = useCallback((text: string, tone: "success" | "error" = "success") => {
    setMsg({ text, tone }); setTimeout(() => setMsg(null), 3000);
  }, []);

  const requiredFieldsOk = useMemo(() => {
    return cTitle.trim() !== "" && cDesc.trim() !== "" && cOccurredAt !== "" && cReportedBy.trim() !== "" && cLoc.plantId !== "";
  }, [cTitle, cDesc, cOccurredAt, cReportedBy, cLoc.plantId]);

  const requiredFieldsMissing = useMemo(() => {
    const missing: string[] = [];
    if (!cTitle.trim()) missing.push("Title");
    if (!cDesc.trim()) missing.push("Description");
    if (!cOccurredAt) missing.push("Occurred At");
    if (!cReportedBy.trim()) missing.push("Reported By");
    if (!cLoc.plantId) missing.push("Plant");
    return missing;
  }, [cTitle, cDesc, cOccurredAt, cReportedBy, cLoc.plantId]);

  const [editing, setEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const hEdit = useCallback((item: any) => {
    setEditItem({ ...item });
    setEditing(true);
    setCreating(false);
    setCType(item.eventType || "INCIDENT");
    setCSeverity(item.severity || "MEDIUM");
    // Resolve full cascade hierarchy from saved target
    const tt = item.targetType || "PLANT";
    const tid = item.targetId ? String(item.targetId) : "";
    const loc = resolveEditLoc(tt, tid, resources, rgs, depts, lines);
    setCLoc(loc);
    setCTitle(item.title || "");
    setCDesc(item.description || "");
    setCReportedBy(item.reportedBy || "");
    setCOccurredAt(item.occurredAt ? item.occurredAt.slice(0, 16) : "");
    setCLocation(item.locationText || "");
    setCImmediateAction(item.immediateAction || "");
    setCInjury(!!item.injuryInvolved);
    setCProperty(!!item.propertyDamage);
    setCEnvironmental(!!item.environmentalImpact);
    setCOwner(item.owner || "");
    setCNotes(item.notes || "");
  }, []);

  const hSaveEdit = useCallback(async () => {
    const id = editItem?.id;
    if (!id) return;
    try {
      await updateMut({
        variables: {
          id, title: cTitle.trim(), description: cDesc.trim() || null,
          severity: cSeverity, targetType: cLoc.targetType, targetId: cLoc.targetId,
          owner: cOwner || null, locationText: cLocation || null,
          immediateAction: cImmediateAction || null,
          injuryInvolved: cInjury, propertyDamage: cProperty, environmentalImpact: cEnvironmental,
          notes: cNotes || null,
        },
      });
      showMsg("Event updated"); setEditing(false); setEditItem(null); refetch();
    } catch (e: any) { showMsg(e?.message || "Update failed", "error"); }
  }, [editItem, cTitle, cDesc, cSeverity, cLoc, cOwner, cLocation, cImmediateAction, cInjury, cProperty, cEnvironmental, cNotes, updateMut, refetch, showMsg]);

  const hCancelEdit = useCallback(() => { setEditing(false); setEditItem(null); resetForm(); }, []);

  const resetForm = useCallback(() => {
    setCTitle(""); setCDesc(""); setCSeverity("MEDIUM"); setCLoc(emptyLoc);
    setCLocation(""); setCImmediateAction(""); setCInjury(false); setCProperty(false);
    setCEnvironmental(false); setCOwner(""); setCNotes(""); setCOccurredAt(""); setCReportedBy("");
  }, []);

  const hNew = useCallback(() => {
    setCreating(true); setSelectedId(null); setDeleteConfirmId(null);
    setCType(cfg.eventTypes[0] || "INCIDENT"); setCSeverity("MEDIUM"); setCLoc(emptyLoc);
    setCTitle(""); setCDesc(""); setCReportedBy(""); setCOccurredAt(nowISO());
    setCLocation(""); setCImmediateAction(""); setCInjury(false);
    setCProperty(false); setCEnvironmental(false); setCOwner(""); setCNotes("");
  }, [cfg.eventTypes]);

  const hCreate = useCallback(async () => {
    if (!requiredFieldsOk) return;
    try {
      const { data: createResult } = await createMut({
        variables: {
          title: cTitle.trim(), eventType: cType, targetType: cLoc.targetType,
          targetId: cLoc.targetId, severity: cSeverity, description: cDesc.trim() || null,
          reportedBy: cReportedBy.trim() || null, occurredAt: cOccurredAt || null,
          locationText: cLocation || null, immediateAction: cImmediateAction || null,
          injuryInvolved: cInjury, propertyDamage: cProperty, environmentalImpact: cEnvironmental,
          owner: cOwner || null, notes: cNotes || null,
        },
      });
      showMsg("Event created"); setCreating(false);
      const newId = (createResult as any)?.createSafetyEvent;
      if (typeof newId === "number") setSelectedId(newId);
      refetch();
    } catch (e: any) { showMsg(e?.message || "Create failed", "error"); }
  }, [cTitle, cType, cLoc, cSeverity, cDesc, cReportedBy, cOccurredAt, cLocation, cImmediateAction, cInjury, cProperty, cEnvironmental, cOwner, cNotes, requiredFieldsOk, createMut, refetch, showMsg]);

  const hReport = useCallback(async (id: number) => {
    try { await reportMut({ variables: { id } }); showMsg("Event reported"); refetch(); }
    catch (e: any) { showMsg(e?.message || "Report failed", "error"); }
  }, [reportMut, refetch, showMsg]);

  const hReview = useCallback(async (id: number) => {
    try { await reviewMut({ variables: { id } }); showMsg("Event under review"); refetch(); }
    catch (e: any) { showMsg(e?.message || "Review failed", "error"); }
  }, [reviewMut, refetch, showMsg]);

  const hClose = useCallback(async (id: number) => {
    try { await closeMut({ variables: { id } }); showMsg("Event closed"); refetch(); }
    catch (e: any) { showMsg(e?.message || "Close failed", "error"); }
  }, [closeMut, refetch, showMsg]);

  const hDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    try { await cancelMut({ variables: { id: deleteConfirmId } }); showMsg("Event cancelled"); setDeleteConfirmId(null); setSelectedId(null); refetch(); }
    catch (e: any) { showMsg(e?.message || "Cancel failed", "error"); }
  }, [deleteConfirmId, cancelMut, refetch, showMsg]);

  const selItem = selectedId ? items.find((e: any) => e.id === selectedId) ?? null : null;
  const selStatus = selItem?.status || "";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const sectionCls = "border-b border-border/50 pb-3 mb-3";
  const sectionTitleCls = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2";

  const renderForm = () => (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      <div className="w-[40%] shrink-0 overflow-y-auto border-r border-border bg-muted/40 p-4 space-y-0">
        <div className={sectionCls}>
          <div className={sectionTitleCls}>Event Classification</div>
          <div className="space-y-3">
            {singleEventType ? (
              <div><label className={labelCls}>Event Type</label><div className="h-8 flex items-center px-2 text-sm text-muted-foreground bg-muted border border-border">{routeEventTypeOpts[0]?.label}</div></div>
            ) : (
              <div><label className={labelCls}>Event Type *</label><select name="eventType" value={cType} onChange={(e) => setCType(e.target.value)} className={SEL_INPUT}>{routeEventTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            )}
            <div><label className={labelCls}>Severity *</label><select name="severity" value={cSeverity} onChange={(e) => setCSeverity(e.target.value)} className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
          </div>
        </div>
        <div className={sectionCls}>
          <SourceLocationSelector
            plants={plants} lines={lines} departments={depts}
            resourceGroups={rgs} resources={resources}
            value={cLoc} onChange={setCLoc} plantDisabled={false}
          />
          <div className="mt-3">
            <label className={labelCls}>Location Details <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
            <input name="location" type="text" value={cLocation} onChange={(e) => setCLocation(e.target.value)} className={SEL_INPUT} placeholder="Area, equipment, or specific location..." />
          </div>
        </div>
        <div className={sectionCls}>
          <div className={sectionTitleCls}>Ownership / Follow-up</div>
          <div className="space-y-3">
            <div><label className={labelCls}>Reported By *</label><input name="reportedBy" type="text" value={cReportedBy} onChange={(e) => setCReportedBy(e.target.value)} className={SEL_INPUT} placeholder="Reporter name..." /></div>
            <div><label className={labelCls}>Owner <span className="text-muted-foreground/60 font-normal">(optional)</span></label><input name="owner" type="text" value={cOwner} onChange={(e) => setCOwner(e.target.value)} className={SEL_INPUT} placeholder="Assigned owner..." /></div>
            <div><label className={labelCls}>Occurred At *</label><input name="occurredAt" type="datetime-local" value={cOccurredAt} onChange={(e) => setCOccurredAt(e.target.value)} className={SEL_INPUT} /></div>
          </div>
        </div>
        <div>
          <div className={sectionTitleCls}>{cfg.impactFlagTitle}</div>
          <div className="space-y-1.5">
            {cfg.impactFlags.map((f) => (
              <label key={f.field} className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" name={f.field} checked={f.field === "injuryInvolved" ? cInjury : f.field === "propertyDamage" ? cProperty : cEnvironmental}
                  onChange={(e) => { if (f.field === "injuryInvolved") setCInjury(e.target.checked); else if (f.field === "propertyDamage") setCProperty(e.target.checked); else setCEnvironmental(e.target.checked); }}
                  className="h-3.5 w-3.5" /> {f.label}
              </label>
            ))}
          </div>
        </div>
      </div>
      {/* Two-column layout: Description (left) | Immediate Response + Notes (right) */}
      <div className="flex flex-1 min-h-0 overflow-hidden p-0 gap-0">
        {/* Left: Description */}
        <div className="flex-1 min-h-0 flex flex-col p-4 border-r border-border" style={{ minHeight: "180px" }}>
          <div className={`${sectionTitleCls} shrink-0`}>Description</div>
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="shrink-0">
              <label className={labelCls}>Title *</label>
              <input name="title" type="text" value={cTitle} onChange={(e) => setCTitle(e.target.value)} className={SEL_INPUT} placeholder="Brief event title..." />
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <label className={`${labelCls} shrink-0`}>{cfg.descLabel} *</label>
              <textarea name="description" value={cDesc} onChange={(e) => setCDesc(e.target.value)} className="flex-1 min-h-0 w-full resize-none overflow-auto border border-border bg-background px-2 py-1 text-xs outline-none" placeholder={cfg.descPlaceholder} />
            </div>
          </div>
        </div>
        {/* Right: Immediate Response + Notes */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col p-4 border-b border-border" style={{ minHeight: "120px" }}>
            <div className={`${sectionTitleCls} shrink-0`}>Immediate Response</div>
            <div className="flex-1 min-h-0 flex flex-col">
              <label className={`${labelCls} shrink-0`}>{cfg.actionLabel} <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
              <textarea name="immediateAction" value={cImmediateAction} onChange={(e) => setCImmediateAction(e.target.value)} className="flex-1 min-h-0 w-full resize-none overflow-auto border border-border bg-background px-2 py-1 text-xs outline-none" placeholder={cfg.actionPlaceholder} />
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col p-4" style={{ minHeight: "120px" }}>
            <div className={`${sectionTitleCls} shrink-0`}>Additional Notes <span className="text-muted-foreground/60 font-normal">(optional)</span></div>
            <div className="flex-1 min-h-0 flex flex-col">
              <textarea name="notes" value={cNotes} onChange={(e) => setCNotes(e.target.value)} className="flex-1 min-h-0 w-full resize-none overflow-auto border border-border bg-background px-2 py-1 text-xs outline-none" placeholder="Any other relevant information..." />
            </div>
          </div>
          {!requiredFieldsOk && (
            <div className="shrink-0 p-2 bg-warning/10 border-t border-warning/20 text-[10px] text-warning">
              Required: {requiredFieldsMissing.join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (creating) return renderForm();
    if (editing && editItem) return renderForm();
    if (!selItem) return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center max-w-sm px-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
            <cfg.icon className="h-6 w-6 text-danger" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{cfg.title}</h3>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{cfg.purpose}</p>
          <div className="border-t border-border/50 pt-3 mt-3">
            <p className="text-[10px] text-muted-foreground/60 mb-2">Select an event from the list to view details, or create a new record.</p>
            <button onClick={hNew} className="inline-flex h-8 items-center gap-1.5 bg-danger px-4 text-sm font-semibold text-white hover:bg-danger/80">
              <Plus className="h-3.5 w-3.5" /> New Event
            </button>
          </div>
        </div>
      </div>
    );

    const stCls = STATUS_STYLES[selItem.status] || STATUS_STYLES.DRAFT;
    const targetLabel = resolveTargetLabel(selItem.targetType, selItem.targetId, plants, lines, depts, rgs, resources);
    return (
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">{selItem.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${stCls}`}>{statusLabel(selItem.status)}</span>
              <span className="inline-flex items-center px-1 py-0.5 text-[10px] font-medium border bg-muted text-muted-foreground border-border">{EVENT_TYPE_OPTS.find((o: any) => o.value === selItem.eventType)?.label || selItem.eventType}</span>
              <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${selItem.severity === "CRITICAL" ? "bg-danger/15 text-danger border-danger/20" : selItem.severity === "HIGH" ? "bg-warning/15 text-warning border-warning/20" : selItem.severity === "MEDIUM" ? "bg-warning/15 text-warning border-warning/20" : "bg-muted text-muted-foreground border-border"}`}>{selItem.severity}</span>
            </div>
          </div>
          {selItem.description && <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Description</p><p className="text-sm text-foreground">{selItem.description}</p></div>}
          {selItem.immediateAction && <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Immediate Action</p><p className="text-sm text-foreground">{selItem.immediateAction}</p></div>}
          <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Flags</p><div className="flex gap-2 text-xs flex-wrap">{selItem.injuryInvolved && <span className="bg-danger/10 text-danger px-1.5 py-0.5 border border-danger/20">Injury</span>}{selItem.propertyDamage && <span className="bg-warning/10 text-warning px-1.5 py-0.5 border border-warning/20">Property Damage</span>}{selItem.environmentalImpact && <span className="bg-success/10 text-success px-1.5 py-0.5 border border-success/20">Environmental</span>}{!selItem.injuryInvolved && !selItem.propertyDamage && !selItem.environmentalImpact && <span className="text-muted-foreground/60 italic">None reported</span>}</div></div>
        </div>
        <div className="w-[30%] shrink-0 border-l border-border bg-muted/40 p-5 space-y-4 overflow-y-auto">
          <div><p className="text-[10px] font-medium text-muted-foreground mb-2">Details</p><div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Event Type</span><span className="text-foreground font-medium">{EVENT_TYPE_OPTS.find((o: any) => o.value === selItem.eventType)?.label || selItem.eventType}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Severity</span><span className="text-foreground font-medium">{selItem.severity}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-foreground font-medium">{statusLabel(selItem.status)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Target</span><span className="text-foreground font-medium">{targetLabel || selItem.targetType}</span></div></div></div>
          <div><p className="text-[10px] font-medium text-muted-foreground mb-2">People & Time</p><div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Reported By</span><span className="text-foreground">{selItem.reportedBy || "-"}</span></div>{selItem.owner && <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="text-foreground">{selItem.owner}</span></div>}<div className="flex justify-between"><span className="text-muted-foreground">Reported</span><span className="text-foreground">{selItem.reportedAt?.slice(0, 10) || "-"}</span></div>{selItem.occurredAt && <div className="flex justify-between"><span className="text-muted-foreground">Occurred</span><span className="text-foreground">{selItem.occurredAt?.slice(0, 10) || "-"}</span></div>}</div></div>
          {selItem.locationText && <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Location</p><p className="text-xs text-foreground">{selItem.locationText}</p></div>}
          {selItem.notes && <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Notes</p><p className="text-xs text-muted-foreground/70">{selItem.notes}</p></div>}
        </div>
      </div>
    );
  };

  const isEditable = selStatus === "DRAFT" || selStatus === "REPORTED";
  const canReport = selStatus === "DRAFT";
  const canReview = selStatus === "REPORTED";
  const canClose = selStatus === "UNDER_REVIEW" || selStatus === "ACTION_REQUIRED";
  const canCancel = selStatus !== "CLOSED" && selStatus !== "CANCELLED";

  const toolbarContent = (
    <PageToolbar
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search events..."
      filters={
        <ToolbarDropdown value={filterStatus} onChange={(v) => { setFilterStatus(v); setSelectedId(null); }} options={STATUS_FILTERS} placeholder="Status" width="w-36" />
      }
      actions={
        creating ? (<><ToolbarButton icon={Save} label="Save Draft" onClick={hCreate} disabled={!requiredFieldsOk} variant="success" title={requiredFieldsOk ? "Save as draft" : "Fill in all required fields"} /><ToolbarButton icon={Ban} label="Cancel" onClick={() => { setCreating(false); setSelectedId(null); resetForm(); }} title="Cancel creation" /></>) :
        editing ? (<><ToolbarButton icon={Save} label="Update" onClick={hSaveEdit} disabled={!requiredFieldsOk} variant="success" /><ToolbarButton icon={Ban} label="Cancel" onClick={hCancelEdit} title="Discard changes" /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>) :
        !selItem ? (<><ToolbarButton icon={Plus} label="New Event" onClick={hNew} variant="success" title="Create new safety event" /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>)
        :
        (<><ToolbarButton icon={Pencil} label="Edit" onClick={() => hEdit(selItem)} disabled={!isEditable} /><ToolbarButton icon={Play} label="Report" onClick={() => hReport(selItem.id)} disabled={!canReport} /><ToolbarButton icon={Eye} label="Review" onClick={() => hReview(selItem.id)} disabled={!canReview} /><ToolbarButton icon={CheckCircle} label="Close" onClick={() => hClose(selItem.id)} disabled={!canClose} variant={canClose ? "success" : "default"} /><ToolbarButton icon={Trash2} label="Cancel" onClick={() => setDeleteConfirmId(selItem.id)} disabled={!canCancel} variant="destructive" /><ToolbarSeparator /><ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { setSelectedId(null); setCreating(false); setEditing(false); }} /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>)
      }
    />
  );

  const leftColumnContent = (
    <>
      <div className="shrink-0 h-8 border-b border-border flex items-center bg-muted px-4"><span className="text-sm font-medium text-secondary-foreground">Events</span><span className="ml-auto text-[10px] text-muted-foreground font-mono">{items.length}</span></div>
      {searchQuery && filteredItems.length === 0 && items.length > 0 && <div className="px-4 py-2 text-[10px] text-muted-foreground/60 italic">No events match &quot;{searchQuery}&quot;</div>}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50 sidebar-scroll">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            {loading ? <p className="text-xs text-muted-foreground/60">Loading events...</p> : (
              <><Search className="h-5 w-5 text-muted-foreground/30 mb-2" /><p className="text-xs text-muted-foreground font-medium">{cfg.emptyStateText}</p><p className="text-[10px] text-muted-foreground/60 mt-1">Create a new event to get started.</p><button onClick={hNew} className="mt-3 inline-flex h-7 items-center gap-1 bg-danger px-2.5 text-[10px] font-semibold text-white hover:bg-danger/80"><Plus className="h-3 w-3" /> New Event</button></>
            )}
          </div>
        ) : filteredItems.map((e: any) => (
          <div key={e.id} onClick={() => { setCreating(false); setEditing(false); setSelectedId(e.id); }}
            className={`group flex items-start gap-2 w-full rounded-md px-3 py-2.5 cursor-pointer text-sm transition-all border-l-2 ${selectedId === e.id ? "bg-accent/15 border-accent" : "border-l-transparent hover:bg-muted"}`}>
            <span className={`inline-block h-2 w-2 rounded-full shrink-0 mt-1 ${SEVERITY_DOT[e.severity] || "bg-slate-400"}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-semibold text-foreground">{e.title || "Event"}</span></div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{EVENT_TYPE_OPTS.find((o: any) => o.value === e.eventType)?.label || e.eventType}</span>
                <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${STATUS_STYLES[e.status] || STATUS_STYLES.DRAFT}`}>{statusLabel(e.status)}</span>
                {e.occurredAt && <span>· {e.occurredAt.slice(0, 10)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const footerContent = <>{items.length} event{items.length !== 1 ? "s" : ""}{!creating && !selItem && <span className="ml-auto">Select an event to view details</span>}</>;

  const confirmDialog = deleteConfirmId && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setDeleteConfirmId(null)}>
      <div className="bg-popover border border-border shadow-lg w-80" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 space-y-3"><h3 className="text-sm font-semibold text-foreground">Cancel Event</h3><p className="text-xs text-muted-foreground">Cancel this safety event? This cannot be undone.</p><div className="flex justify-end gap-2"><button onClick={() => setDeleteConfirmId(null)} className="h-8 px-3 text-xs font-medium text-secondary-foreground border border-border bg-background hover:bg-muted">No</button><button onClick={hDelete} className="h-8 px-3 text-xs font-semibold text-danger-foreground bg-danger hover:bg-danger/80">Yes, Cancel</button></div></div></div></div>
  );

  return (
    <>
      <AppPageLayout icon={<cfg.icon className="h-5 w-5 stroke-current" />} iconClass="bg-danger/15 text-danger"
        title={cfg.title} subtitle={cfg.subtitle}
        systemMessage={msg ? { text: msg.text, type: msg.tone } : null} onDismissSystemMessage={() => setMsg(null)}
        toolbar={toolbarContent} leftColumn={leftColumnContent} leftColumnWidth="w-[20%]" footer={footerContent}>
        {renderDetail()}
      </AppPageLayout>
      {confirmDialog}
    </>
  );
}
