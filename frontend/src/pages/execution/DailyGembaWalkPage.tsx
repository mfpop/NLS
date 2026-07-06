import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Footprints, RefreshCw, Play, Square, X, Loader2,
} from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PageToolbar, ToolbarButton, ToolbarSearch, ToolbarSelect } from "@/components/layout/PageToolbar";
import { useActiveLine } from "@/hooks/useActiveLine";
import {
  DAILY_GEMBA_BOARD_QUERY,
  CREATE_GEMBA_OBSERVATION_MUTATION,
  START_GEMBA_SESSION_MUTATION,
  COMPLETE_GEMBA_SESSION_MUTATION,
  ASSIGN_GEMBA_OBSERVATION_MUTATION,
  RESOLVE_GEMBA_OBSERVATION_MUTATION,
  CLOSE_GEMBA_OBSERVATION_MUTATION,
  REOPEN_GEMBA_OBSERVATION_MUTATION,
  VERIFY_GEMBA_OBSERVATION_MUTATION,
  CONVERT_GEMBA_TO_ISSUE_MUTATION,
  CONVERT_GEMBA_TO_ACTION_MUTATION,
} from "@/graphql/gembaQueries";
import { GembaWalkForm } from "@/components/gemba/GembaWalkForm";
import { GembaWalkObservationList } from "@/components/gemba/GembaWalkObservationList";
import { GembaSessionStrip } from "@/components/gemba/GembaSessionStrip";
import { GembaObservationDetailDrawer } from "@/components/gemba/GembaObservationDetailDrawer";
import { theme } from "@/styles/themeTokens";
import type { GuideContent } from "@/pages/shared/PageGuideModal";
import type {
  DailyGembaBoardData,
  CreateGembaObservationInput,
  GembaCreateObservationData,
  GembaSessionMutationData,
  GembaCompleteSessionData,
  GembaAssignObservationData,
  GembaResolveObservationData,
  GembaCloseObservationData,
  GembaReopenObservationData,
  GembaConvertToIssueData,
  GembaConvertToActionData,
  GembaObservation,
} from "@/types/gemba";

const GEMBA_GUIDE: GuideContent = {
  purpose:
    "**Gemba Walk** observation capture and management — record shopfloor observations, track resolution, and convert findings into issues or actions for continuous improvement.",
  quickStart: [
    "Select a **production line** from the sidebar; the walk board auto-loads.",
    "Click **Start Walk** to begin a Gemba session, then use the form to capture observations.",
    "Use **Search** and **Category/Status/Severity** filters to find specific observations.",
    "Click any **observation row** for the detail drawer with full workflow actions.",
  ],
  whenToUse: [
    "**Daily walk** — capture observations during the scheduled Gemba walk.",
    "**Issue escalation** — convert an observation into a tracked issue with severity and owner.",
    "**Action assignment** — create corrective or preventive actions from observations.",
    "**Resolution verification** — verify resolved observations on the shopfloor before closing.",
  ],
  keyFeatures: [
    "**Session management** — Start/Complete Walk buttons with session status strip (Planned, In Progress, Completed).",
    "**Observation Capture Form** (left) — category, severity, title, description, and area fields.",
    "**Observations List** (right) — filterable list with search, category, status, and severity filters.",
    "**Detail Drawer** — full observation details with workflow actions.",
    "**Workflow actions** — Assign, Resolve, Verify, Create Issue, Create Action, Close, and Reopen.",
    "**Action modals** — dedicated forms for each workflow action with required fields.",
    "**Metrics strip** — counts for open, critical, overdue, resolved, and closed observations.",
  ],
  howToUse: [
    "Click **Start Walk** to begin, then use the form to capture observations with category, severity, and description.",
    "Use **Search** and the **Category/Status/Severity** dropdowns to filter the observation list.",
    "Click any observation to open the **detail drawer** with full description and workflow buttons.",
    "Use **Assign** to set an owner and due date; use **Resolve** to mark as resolved with a note.",
    "Use **Create Issue** or **Create Action** to convert an observation into a formal tracked item.",
    "Click **Complete Walk** (with optional summary) to end the session and make observations read-only.",
  ],
  tips: [
    "**Critical** observations should be converted to Issues immediately for formal tracking.",
    "Use **Assign** to delegate follow-up work; use **Create Action** for corrective tasks.",
    "The **Complete Walk** summary helps document what was found and what actions were taken.",
    "**Filters** combine — use Category + Severity together to find the most important observations.",
  ],
  commonMistakes: [
    "Don't leave observations **unassigned** — use the Assign action to set ownership and due dates.",
    "**Closing** an observation should only happen after on-site verification — use Verify first.",
    "Observations are **read-only** after the walk is Completed — complete all actions before finishing.",
  ],
  relatedPages: [
    { title: "**Live Shopfloor** — real-time status and resource flow", path: "/execution/live-shopfloor" },
    { title: "**Line Performance** — OEE and shift performance", path: "/execution/line-performance" },
  ],
};

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All Categories" },
  { value: "SAFETY", label: "Safety" },
  { value: "QUALITY", label: "Quality" },
  { value: "PRODUCTIVITY", label: "Productivity" },
  { value: "FIVE_S", label: "5S" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "MATERIAL", label: "Material" },
  { value: "MORALE", label: "Morale" },
  { value: "OTHER", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "ACTION_REQUIRED", label: "Action Required" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const SEVERITY_OPTIONS = [
  { value: "ALL", label: "All Severities" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "INFO", label: "Info" },
];

const LEFT_PANEL_WIDTH = "w-[32%] min-w-[360px] max-w-[520px]";

type ActionModal =
  | null
  | { type: "assign"; observation: GembaObservation }
  | { type: "resolve"; observation: GembaObservation }
  | { type: "createIssue"; observation: GembaObservation }
  | { type: "createAction"; observation: GembaObservation }
  | { type: "verify"; observation: GembaObservation }
  | { type: "completeWalk" };

export function DailyGembaWalkPage() {
  const { productionLineId, activeLine, activePlantId, loading: lineLoading } = useActiveLine();
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [structureError, setStructureError] = useState(false);

  // Search + filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // Detail drawer
  const [selectedObservation, setSelectedObservation] = useState<GembaObservation | null>(null);

  // Action modal
  const [actionModal, setActionModal] = useState<ActionModal>(null);

  // Assign modal fields
  const [assignOwner, setAssignOwner] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Resolve modal fields
  const [resolveNote, setResolveNote] = useState("");
  const [resolving, setResolving] = useState(false);

  // Verify modal fields
  const [verifyNote, setVerifyNote] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueSeverity, setIssueSeverity] = useState("MEDIUM");
  const [issueOwner, setIssueOwner] = useState("");
  const [issueDueDate, setIssueDueDate] = useState("");
  const [creatingIssue, setCreatingIssue] = useState(false);

  // Create Action modal fields
  const [actionTitle, setActionTitle] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionType, setActionType] = useState("CORRECTIVE");
  const [actionPriority, setActionPriority] = useState("MEDIUM");
  const [actionAssignedTo, setActionAssignedTo] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [creatingAction, setCreatingAction] = useState(false);

  const lineIdNumber = productionLineId ? parseInt(productionLineId, 10) : null;

  const {
    data: queryData,
    loading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery<DailyGembaBoardData>(DAILY_GEMBA_BOARD_QUERY, {
    variables: { lineId: lineIdNumber, plantId: activePlantId ? parseInt(activePlantId, 10) : null },
    skip: !lineIdNumber,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [createObservation] = useMutation<GembaCreateObservationData>(CREATE_GEMBA_OBSERVATION_MUTATION);
  const [startSession] = useMutation<GembaSessionMutationData>(START_GEMBA_SESSION_MUTATION);
  const [completeSession] = useMutation<GembaCompleteSessionData>(COMPLETE_GEMBA_SESSION_MUTATION);
  const [assignObservation] = useMutation<GembaAssignObservationData>(ASSIGN_GEMBA_OBSERVATION_MUTATION);
  const [resolveObservation] = useMutation<GembaResolveObservationData>(RESOLVE_GEMBA_OBSERVATION_MUTATION);
  const [closeObservation] = useMutation<GembaCloseObservationData>(CLOSE_GEMBA_OBSERVATION_MUTATION);
  const [reopenObservation] = useMutation<GembaReopenObservationData>(REOPEN_GEMBA_OBSERVATION_MUTATION);
  const [verifyObservation] = useMutation<{ verifyGembaObservation: GembaObservation }>(VERIFY_GEMBA_OBSERVATION_MUTATION);
  const [convertToIssue] = useMutation<GembaConvertToIssueData>(CONVERT_GEMBA_TO_ISSUE_MUTATION);
  const [convertToAction] = useMutation<GembaConvertToActionData>(CONVERT_GEMBA_TO_ACTION_MUTATION);

  const board = queryData?.dailyGembaBoard ?? null;
  const activeSession = board?.activeSession ?? null;
  const observations = board?.observations ?? [];
  const metrics = board?.metrics ?? { total: 0, open: 0, inReview: 0, actionRequired: 0, converted: 0, resolved: 0, closed: 0, critical: 0, overdue: 0, byCategory: "{}" };

  const isSessionActive = activeSession?.status === "IN_PROGRESS";
  const isSessionPlanned = activeSession?.status === "PLANNED";
  const isSessionCompleted = activeSession?.status === "COMPLETED";

  // ── Handlers ──

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleStartWalk = useCallback(async () => {
    if (!activeSession) return;
    setSessionActionLoading(true);
    try {
      await startSession({ variables: { id: activeSession.id } });
      await refetch();
    } finally { setSessionActionLoading(false); }
  }, [activeSession, startSession, refetch]);

  const handleCompleteWalk = useCallback(async (summary?: string) => {
    if (!activeSession) return;
    setSessionActionLoading(true);
    try {
      await completeSession({ variables: { id: activeSession.id, summary: summary ?? "" } });
      await refetch();
    } finally {
      setSessionActionLoading(false);
      setActionModal(null);
    }
  }, [activeSession, completeSession, refetch]);

  const handleSaveObservation = useCallback(async (data: CreateGembaObservationInput) => {
    setSaving(true);
    try {
      await createObservation({ variables: { input: data } });
      await refetch();
    } finally { setSaving(false); }
  }, [createObservation, refetch]);

  // ── Workflow action handlers ──

  const handleAssign = useCallback(async () => {
    if (!actionModal || actionModal.type !== "assign") return;
    setAssigning(true);
    try {
      await assignObservation({
        variables: {
          id: actionModal.observation.id,
          input: {
            ownerName: assignOwner.trim() || undefined,
            dueDate: assignDueDate || undefined,
          },
        },
      });
      await refetch();
      setActionModal(null);
      setAssignOwner("");
      setAssignDueDate("");
    } finally { setAssigning(false); }
  }, [actionModal, assignOwner, assignDueDate, assignObservation, refetch]);

  const handleResolve = useCallback(async () => {
    if (!actionModal || actionModal.type !== "resolve") return;
    setResolving(true);
    try {
      await resolveObservation({
        variables: { id: actionModal.observation.id, resolutionNote: resolveNote.trim() || "Resolved" },
      });
      await refetch();
      setSelectedObservation((prev) =>
        prev?.id === actionModal.observation.id
          ? { ...prev, status: "RESOLVED", resolutionNote: resolveNote.trim() || "Resolved", resolvedAt: new Date().toISOString() }
          : prev
      );
      setActionModal(null);
      setResolveNote("");
    } finally { setResolving(false); }
  }, [actionModal, resolveNote, resolveObservation, refetch]);

  const handleVerify = useCallback(async () => {
    if (!actionModal || actionModal.type !== "verify") return;
    setVerifying(true);
    try {
      await verifyObservation({
        variables: { id: actionModal.observation.id, verificationNote: verifyNote.trim() || "Verified on shopfloor" },
      });
      await refetch();
      setSelectedObservation((prev) =>
        prev?.id === actionModal.observation.id
          ? { ...prev, status: "VERIFIED", verificationNote: verifyNote.trim() || "Verified on shopfloor", verifiedAt: new Date().toISOString() }
          : prev
      );
      setActionModal(null);
      setVerifyNote("");
    } finally { setVerifying(false); }
  }, [actionModal, verifyNote, verifyObservation, refetch]);

  const handleCreateIssue = useCallback(async () => {
    if (!actionModal || actionModal.type !== "createIssue") return;
    setCreatingIssue(true);
    try {
      await convertToIssue({
        variables: {
          id: actionModal.observation.id,
          input: {
            title: issueTitle || actionModal.observation.title,
            description: issueDescription || actionModal.observation.description,
            severity: issueSeverity,
            owner: issueOwner || undefined,
            dueDate: issueDueDate || undefined,
          },
        },
      });
      await refetch();
      setActionModal(null);
      setIssueTitle("");
      setIssueDescription("");
      setIssueSeverity("MEDIUM");
      setIssueOwner("");
      setIssueDueDate("");
    } finally { setCreatingIssue(false); }
  }, [actionModal, issueTitle, issueDescription, issueSeverity, issueOwner, issueDueDate, convertToIssue, refetch]);

  const handleCreateAction = useCallback(async () => {
    if (!actionModal || actionModal.type !== "createAction") return;
    setCreatingAction(true);
    try {
      await convertToAction({
        variables: {
          id: actionModal.observation.id,
          input: {
            title: actionTitle || actionModal.observation.title,
            description: actionDescription || actionModal.observation.description,
            actionType,
            priority: actionPriority,
            assignedTo: actionAssignedTo || undefined,
            dueDate: actionDueDate || undefined,
          },
        },
      });
      await refetch();
      setActionModal(null);
      setActionTitle("");
      setActionDescription("");
      setActionType("CORRECTIVE");
      setActionPriority("MEDIUM");
      setActionAssignedTo("");
      setActionDueDate("");
    } finally { setCreatingAction(false); }
  }, [actionModal, actionTitle, actionDescription, actionType, actionPriority, actionAssignedTo, actionDueDate, convertToAction, refetch]);

  const handleClose = useCallback(async (obs: GembaObservation) => {
    try {
      await closeObservation({ variables: { id: obs.id } });
      await refetch();
      setSelectedObservation((prev) =>
        prev?.id === obs.id ? { ...prev, status: "CLOSED", closedAt: new Date().toISOString() } : prev
      );
    } catch { /* ignore */ }
  }, [closeObservation, refetch]);

  const handleReopen = useCallback(async (obs: GembaObservation) => {
    try {
      await reopenObservation({ variables: { id: obs.id } });
      await refetch();
      setSelectedObservation((prev) =>
        prev?.id === obs.id ? { ...prev, status: "REOPENED", resolvedAt: null, closedAt: null } : prev
      );
    } catch { /* ignore */ }
  }, [reopenObservation, refetch]);

  // ── Modal openers ──

  const openAssignModal = (obs: GembaObservation) => {
    setAssignOwner(obs.ownerName ?? "");
    setAssignDueDate(obs.dueDate ?? "");
    setActionModal({ type: "assign", observation: obs });
  };

  const openResolveModal = (obs: GembaObservation) => {
    setResolveNote(obs.resolutionNote ?? "");
    setActionModal({ type: "resolve", observation: obs });
  };

  const openVerifyModal = (obs: GembaObservation) => {
    setVerifyNote(obs.verificationNote ?? "");
    setActionModal({ type: "verify", observation: obs });
  };

  const openCreateIssueModal = (obs: GembaObservation) => {
    setIssueTitle(obs.title);
    setIssueDescription(obs.description);
    setIssueSeverity(obs.severity);
    setIssueOwner(obs.ownerName ?? "");
    setIssueDueDate(obs.dueDate ?? "");
    setActionModal({ type: "createIssue", observation: obs });
  };

  const openCreateActionModal = (obs: GembaObservation) => {
    setActionTitle(obs.title);
    setActionDescription(obs.description);
    setActionPriority(obs.priority);
    setActionAssignedTo(obs.ownerName ?? "");
    setActionDueDate(obs.dueDate ?? "");
    setActionModal({ type: "createAction", observation: obs });
  };

  // ── Helper: render action modal ──

  const renderActionModal = () => {
    if (!actionModal) return null;

    let title = "";
    let body: React.ReactNode = null;
    let confirmLabel = "";
    let onConfirm: () => void;
    let loading = false;

    switch (actionModal.type) {
      case "assign":
        title = "Assign Observation";
        body = (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Owner</label>
              <input
                type="text"
                value={assignOwner}
                onChange={(e) => setAssignOwner(e.target.value)}
                placeholder="Assignee name"
                className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Due Date</label>
              <input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>
        );
        confirmLabel = assigning ? "Assigning..." : "Assign";
        onConfirm = handleAssign;
        loading = assigning;
        break;

      case "resolve":
        title = "Resolve Observation";
        body = (
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Resolution Note</label>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Describe how this was resolved..."
              className="w-full rounded-[2px] border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary resize-none"
              style={{ minHeight: "80px" }}
            />
          </div>
        );
        confirmLabel = resolving ? "Resolving..." : "Resolve";
        onConfirm = handleResolve;
        loading = resolving;
        break;

      case "createIssue":
        title = "Create Issue from Observation";
        body = (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Title</label>
              <input
                type="text"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Description</label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="w-full rounded-[2px] border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary resize-none"
                style={{ minHeight: "64px" }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Severity</label>
                <select value={issueSeverity} onChange={(e) => setIssueSeverity(e.target.value)} className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary">
                  <option value="INFO">Info</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Owner</label>
                <input
                  type="text"
                  value={issueOwner}
                  onChange={(e) => setIssueOwner(e.target.value)}
                  placeholder="Owner"
                  className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Due Date</label>
                <input
                  type="date"
                  value={issueDueDate}
                  onChange={(e) => setIssueDueDate(e.target.value)}
                  className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        );
        confirmLabel = creatingIssue ? "Creating..." : "Create Issue";
        onConfirm = handleCreateIssue;
        loading = creatingIssue;
        break;

      case "createAction":
        title = "Create Action from Observation";
        body = (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Title</label>
              <input
                type="text"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Description</label>
              <textarea
                value={actionDescription}
                onChange={(e) => setActionDescription(e.target.value)}
                className="w-full rounded-[2px] border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary resize-none"
                style={{ minHeight: "64px" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Type</label>
                <select value={actionType} onChange={(e) => setActionType(e.target.value)} className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary">
                  <option value="CORRECTIVE">Corrective</option>
                  <option value="PREVENTIVE">Preventive</option>
                  <option value="IMPROVEMENT">Improvement</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Priority</label>
                <select value={actionPriority} onChange={(e) => setActionPriority(e.target.value)} className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Assigned To</label>
                <input
                  type="text"
                  value={actionAssignedTo}
                  onChange={(e) => setActionAssignedTo(e.target.value)}
                  placeholder="Assignee"
                  className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Due Date</label>
                <input
                  type="date"
                  value={actionDueDate}
                  onChange={(e) => setActionDueDate(e.target.value)}
                  className="w-full h-8 rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        );
        confirmLabel = creatingAction ? "Creating..." : "Create Action";
        onConfirm = handleCreateAction;
        loading = creatingAction;
        break;

      case "verify":
        title = "Verify Observation";
        body = (
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Verification Note</label>
            <textarea
              value={verifyNote}
              onChange={(e) => setVerifyNote(e.target.value)}
              placeholder="What changed on the shopfloor? Confirm the resolution is effective..."
              className="w-full rounded-[2px] border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary resize-none"
              style={{ minHeight: "80px" }}
            />
          </div>
        );
        confirmLabel = verifying ? "Verifying..." : "Verify";
        onConfirm = handleVerify;
        loading = verifying;
        break;

      case "completeWalk":
        title = "Complete Walk";
        body = (
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              Complete the Gemba Walk session? Observations will become read-only.
            </p>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Summary (optional)</label>
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="Walk summary..."
                className="w-full rounded-[2px] border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary resize-none"
                style={{ minHeight: "64px" }}
              />
            </div>
          </div>
        );
        confirmLabel = sessionActionLoading ? "Completing..." : "Complete Walk";
        onConfirm = () => handleCompleteWalk(resolveNote || undefined);
        loading = sessionActionLoading;
        break;
    }

    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setActionModal(null)} />
        {/* Modal */}
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[460px] bg-background rounded-[4px] border border-border shadow-xl">
          <div className="flex items-center justify-between px-4 h-11 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <button
              type="button"
              onClick={() => setActionModal(null)}
              className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-3">
            {body}
          </div>
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted">
            <button
              type="button"
              onClick={() => setActionModal(null)}
              className="inline-flex h-8 items-center px-3 text-xs font-medium text-muted-foreground hover:bg-muted rounded-[2px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 px-3 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/80 active:bg-primary/60 rounded-[2px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </>
    );
  };

  const headerSubtitle = activeLine
    ? `${activeLine.name} · Capture observations from the shopfloor, track issues, and drive continuous improvement`
    : "Select a production line to view and record Gemba Walk observations";

  const hasFilters = categoryFilter !== "ALL" || statusFilter !== "ALL" || severityFilter !== "ALL" || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setCategoryFilter("ALL"); setStatusFilter("ALL"); setSeverityFilter("ALL"); setSearchQuery("");
  };

  // ── No active line ──
  if (!lineIdNumber && !lineLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
        <PageHeader title="Daily Gemba Walk" subtitle="Select a production line from the sidebar." icon={<Footprints />} iconClass={theme.iconBoxEmerald} guideContent={GEMBA_GUIDE} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Footprints className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-xs text-muted-foreground max-w-sm">No active line selected. Use the sidebar to select a production line.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if ((queryLoading && !queryData) || (lineLoading && !activeLine)) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
        <PageHeader title="Daily Gemba Walk" subtitle="Loading..." icon={<Footprints />} iconClass={theme.iconBoxEmerald} guideContent={GEMBA_GUIDE} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-success border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Loading observations...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (queryError && !queryData) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
        <PageHeader title="Daily Gemba Walk" subtitle="Unable to load observations" icon={<Footprints />} iconClass={theme.iconBoxEmerald} guideContent={GEMBA_GUIDE} />
        <PageToolbar
          leftWidthClass={LEFT_PANEL_WIDTH}
          actions={<ToolbarButton icon={RefreshCw} label="Retry" onClick={handleRefresh} disabled={refreshing} />}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 ring-1 ring-danger/20">
            <Footprints className="h-7 w-7 text-danger/80" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Unable to load observations</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              The observation list could not be loaded. This may be a temporary issue.
            </p>
          </div>
          <button type="button" onClick={handleRefresh} disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[2px] border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Retry
          </button>
        </div>
        <footer className="shrink-0 flex h-10 items-center gap-5 border-t border-border bg-muted px-4 text-xs font-medium text-muted-foreground">
          <span>Line: {activeLine?.name ?? "—"}</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-muted">
      {/* Header */}
      <div className="h-16 shrink-0">
        <PageHeader title="Daily Gemba Walk" subtitle={headerSubtitle} icon={<Footprints />} iconClass={theme.iconBoxEmerald} guideContent={GEMBA_GUIDE} />
      </div>

      {/* Session status strip */}
      <GembaSessionStrip session={activeSession} observationCount={observations.length} loading={lineLoading} />

      {/* Toolbar — search + filters + session actions + refresh */}
      <div className="h-10 shrink-0">
        <PageToolbar
          filters={
            <>
              <div className="w-[320px]">
                <ToolbarSearch value={searchQuery} placeholder="Search observations..." onChange={setSearchQuery} />
              </div>
              <ToolbarSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} widthClassName="w-36">
                {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </ToolbarSelect>
              <ToolbarSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} widthClassName="w-36">
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </ToolbarSelect>
              <ToolbarSelect value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} widthClassName="w-36">
                {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </ToolbarSelect>
              {hasFilters && (
                <ToolbarButton label="Clear" onClick={clearFilters} />
              )}
            </>
          }
          actions={
            <>
              {isSessionPlanned && (
                <ToolbarButton icon={Play} label={sessionActionLoading ? "Starting..." : "Start Walk"} onClick={handleStartWalk} disabled={sessionActionLoading} variant="create" />
              )}
              {isSessionActive && (
                <ToolbarButton icon={Square} label={sessionActionLoading ? "Completing..." : "Complete Walk"} onClick={() => { setResolveNote(""); setActionModal({ type: "completeWalk" }); }} disabled={sessionActionLoading} variant="warning" />
              )}
              <ToolbarButton icon={RefreshCw} label={refreshing ? "Refreshing..." : "Refresh"} onClick={handleRefresh} disabled={refreshing} />
            </>
          }
        />
      </div>

      {/* Content area: grid 32%/68% */}
      <div className="grid min-h-0 flex-1 grid-cols-[32%_68%] overflow-hidden bg-muted">
        {/* Left — Capture panel */}
        <div className="overflow-hidden border-r border-border">
          <GembaWalkForm
            sessionId={activeSession?.id ?? null}
            onSave={handleSaveObservation}
            saving={saving}
            readOnly={isSessionCompleted}
            structureError={structureError}
            onRetryStructure={() => setStructureError(false)}
            plantId={activePlantId ? parseInt(activePlantId, 10) : null}
            plantName={activeLine?.plantName ?? ""}
            productionLineId={lineIdNumber}
            productionLineName={activeLine?.name ?? ""}
          />
        </div>

        {/* Right — Observations list */}
        <div className="min-w-0 overflow-hidden">
          <GembaWalkObservationList
            observations={observations}
            openCount={metrics.open}
            criticalCount={metrics.critical}
            totalCount={metrics.total}
            loading={queryLoading}
            categoryFilter={categoryFilter}
            severityFilter={severityFilter}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            onSelectObservation={setSelectedObservation}
            onAssign={openAssignModal}
            onCreateIssue={openCreateIssueModal}
            onCreateAction={openCreateActionModal}
            onResolve={openResolveModal}
            onVerify={openVerifyModal}
            onClose={handleClose}
            onReopen={handleReopen}
          />
        </div>

        {/* Detail drawer overlay */}
        {selectedObservation && (
          <GembaObservationDetailDrawer
            observation={selectedObservation}
            onClose={() => setSelectedObservation(null)}
            onAssign={openAssignModal}
            onCreateIssue={openCreateIssueModal}
            onCreateAction={openCreateActionModal}
            onResolve={openResolveModal}
            onVerify={openVerifyModal}
            onCloseObs={handleClose}
            onReopen={handleReopen}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="shrink-0 flex h-10 items-center gap-5 border-t border-border bg-muted px-4 text-xs font-medium text-muted-foreground">
        <span>Line: {activeLine?.name ?? "—"}</span>
        {activeSession && (
          <>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>Walk: {isSessionPlanned ? "Planned" : isSessionActive ? "In Progress" : "Completed"}</span>
          </>
        )}
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>Observations: {metrics.total}</span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>Open: {metrics.open}</span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>Critical: {metrics.critical}</span>
        {queryError && (
          <div className="ml-auto flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-danger/10 text-danger border border-danger/20 cursor-default"
              title={queryError.message || "API request failed"}
            >
              Error
            </span>
          </div>
        )}
      </footer>

      {/* Action modals */}
      {renderActionModal()}
    </div>
  );
}
