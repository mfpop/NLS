import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ListChecks, Plus, Pencil, RefreshCw, X, Check,
  Play, CheckCircle, Ban, AlertTriangle,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ACTIONS_QUERY } from "@/graphql/checkQueries";
import {
  CREATE_ACTION_MUTATION,
  UPDATE_ACTION_MUTATION,
  START_ACTION_MUTATION,
  COMPLETE_ACTION_MUTATION,
  CANCEL_ACTION_MUTATION,
} from "@/graphql/checkMutations";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  DONE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" }, { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" }, { value: "CRITICAL", label: "Critical" },
];

const ACTION_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
  { value: "CANCELLED", label: "Cancelled" },
];

interface ActionNode {
  id: number; title: string; description: string;
  sourceType: string; sourceId: number | null;
  owner: string; dueDate: string | null; status: string;
  priority: string; completedAt: string | null;
  notes: string; createdAt: string; updatedAt: string;
}

interface FormState {
  title: string; description: string; owner: string;
  dueDate: string; priority: string; sourceType: string;
  sourceId: string; notes: string;
}

function statusLabel(s: string): string {
  if (s === "IN_PROGRESS") return "In Progress";
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex min-h-6 items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 bg-amber-500/60 rounded-full" />
          <div className="flex-1 text-sm font-bold uppercase tracking-[0.12em] text-amber-600/70 dark:text-amber-400/70">{title}</div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ActionsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: "", description: "", owner: "", dueDate: "",
    priority: "MEDIUM", sourceType: "", sourceId: "", notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);

  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(Math.max(pct, 10), 50));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  useEffect(() => {
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(null), 5000); return () => clearTimeout(t); }
  }, [successMsg]);

  const { data, loading, refetch } = useQuery<{ actions: ActionNode[] }>(ACTIONS_QUERY, {
    variables: { status: filterStatus || undefined, search: search || undefined },
    fetchPolicy: "cache-and-network",
  });
  const actions: ActionNode[] = data?.actions || [];

  const filteredActions = filterOwner ? actions.filter((a) =>
    a.owner?.toLowerCase().includes(filterOwner.toLowerCase())
  ) : actions;

  const sel = selectedId ? filteredActions.find((a) => a.id === selectedId) ?? null : null;
  const isForm = mode === "edit" || mode === "create";

  useEffect(() => {
    if (filteredActions.length === 0) return;
    if (selectedId && filteredActions.some((a) => a.id === selectedId)) return;
    if (!initialLoad) return;
    setInitialLoad(false);
    setSelectedId(filteredActions[0].id);
  }, [filteredActions, selectedId, initialLoad]);

  const g = (k: keyof FormState) => String(form[k] ?? "");
  const sf = (k: keyof FormState, v: unknown) => { setIsDirty(true); setForm((p) => ({ ...p, [k]: v })); };

  const clearForm = useCallback(() => {
    setForm({ title: "", description: "", owner: "", dueDate: "", priority: "MEDIUM", sourceType: "", sourceId: "", notes: "" });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);

  const loadForm = useCallback((item: ActionNode) => {
    setForm({
      title: item.title, description: item.description, owner: item.owner,
      dueDate: item.dueDate || "", priority: item.priority || "MEDIUM",
      sourceType: item.sourceType || "", sourceId: String(item.sourceId ?? ""), notes: item.notes,
    });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);

  const [createAction] = useMutation(CREATE_ACTION_MUTATION);
  const [updateAction] = useMutation(UPDATE_ACTION_MUTATION);
  const [startAction] = useMutation(START_ACTION_MUTATION);
  const [completeAction] = useMutation(COMPLETE_ACTION_MUTATION);
  const [cancelAct] = useMutation(CANCEL_ACTION_MUTATION);

  const hNew = useCallback(() => { clearForm(); setSelectedId(null); setMode("create"); }, [clearForm]);
  const hEdit = useCallback(() => { if (sel) { loadForm(sel); setMode("edit"); } }, [sel, loadForm]);
  const hCancel = useCallback(() => {
    if (isDirty && mode === "edit") { if (!confirm("Unsaved changes. Discard?")) return; }
    if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); }
  }, [sel, loadForm, clearForm, isDirty, mode]);

  const hSave = useCallback(async () => {
    setMutationError(null);
    const errs: Record<string, string> = {};
    if (!form.title?.trim()) errs.title = "Required";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    try {
      if (mode === "edit" && sel) {
        const vars: Record<string, unknown> = { id: sel.id };
        if (form.title !== sel.title) vars.title = form.title.trim();
        if (form.description !== (sel.description || "")) vars.description = form.description;
        if (form.owner !== (sel.owner || "")) vars.owner = form.owner;
        if (form.priority !== sel.priority) vars.priority = form.priority;
        const r = await updateAction({ variables: vars });
        if (r.error) { setMutationError(r.error.message || "Save failed"); return; }
        setSuccessMsg("Action updated"); setIsDirty(false); refetch(); setMode("view");
      } else {
        const r = await createAction({ variables: {
          title: form.title.trim(), description: form.description,
          owner: form.owner, dueDate: form.dueDate || null,
          priority: form.priority, sourceType: form.sourceType || null,
          sourceId: form.sourceId ? parseInt(form.sourceId) : null,
          notes: form.notes,
        } });
        if (r.error) { setMutationError(r.error.message || "Create failed"); return; }
        setSuccessMsg("Action created"); setIsDirty(false); refetch(); setMode("view");
      }
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : "Save failed"); }
  }, [form, mode, sel, createAction, updateAction, refetch]);

  const hStart = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const r = await startAction({ variables: { id: sel.id } });
    if (r.error) { setMutationError(r.error.message || "Start failed"); return; }
    setSuccessMsg("Action started"); refetch();
  }, [sel, startAction, refetch]);

  const hComplete = useCallback(async () => {
    if (!confirmAction) return; setMutationError(null);
    const r = await completeAction({ variables: { id: confirmAction.id } });
    if (r.error) { setMutationError(r.error.message || "Complete failed"); setConfirmAction(null); return; }
    setSuccessMsg("Action completed"); setConfirmAction(null); refetch();
  }, [confirmAction, completeAction, refetch]);

  const hCancelAction = useCallback(async () => {
    if (!confirmAction) return; setMutationError(null);
    const r = await cancelAct({ variables: { id: confirmAction.id } });
    if (r.error) { setMutationError(r.error.message || "Cancel failed"); setConfirmAction(null); return; }
    setSuccessMsg("Action cancelled"); setConfirmAction(null); refetch();
  }, [confirmAction, cancelAct, refetch]);

  const iCls = `h-7 w-full bg-card border border-gray-300 text-foreground placeholder:text-muted-foreground px-2 text-sm outline-none ${theme.textPrimary} transition-all ${theme.focusRing}`;
  const sCls = iCls;

  const renderForm = () => (
    <div className="flex-1 min-h-0 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-[20%_80%] gap-6 px-5 py-3 min-w-0">
        <div className="min-w-0 overflow-y-auto space-y-3">
          <SectionCard title="Classification">
            <div className="space-y-1.5">
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Priority</p>
                <select value={g("priority")} onChange={(e) => sf("priority", e.target.value)} className={sCls}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
            </div>
          </SectionCard>
          <SectionCard title="Owner & Dates">
            <div className="space-y-1.5">
              <input type="text" value={g("owner")} onChange={(e) => sf("owner", e.target.value)} placeholder="Owner" className={iCls} />
              <input type="date" value={g("dueDate")} onChange={(e) => sf("dueDate", e.target.value)} className={iCls} />
            </div>
          </SectionCard>
          <SectionCard title="Source">
            <div className="space-y-1.5">
              <input type="text" value={g("sourceType")} onChange={(e) => sf("sourceType", e.target.value)} placeholder="Source type" className={iCls} />
              <input type="number" value={g("sourceId")} onChange={(e) => sf("sourceId", e.target.value)} placeholder="Source ID" className={iCls} />
            </div>
          </SectionCard>
        </div>
        <div className="min-w-0 min-h-0 h-full flex flex-col overflow-hidden mr-6 pb-6">
          <SectionCard title="Title">
            <input type="text" value={g("title")} onChange={(e) => sf("title", e.target.value)} placeholder="Action title *" className={`${iCls} w-full min-w-0`} />
            {errors.title && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.title}</p>}
          </SectionCard>
          <div className="flex-1 min-h-0 overflow-y-auto mt-2 space-y-3">
            <SectionCard title="Description">
              <textarea value={g("description")} onChange={(e) => sf("description", e.target.value)}
                placeholder="Describe the action..." rows={5}
                className="h-24 w-full rounded border border-border/40 bg-card px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-amber-400 transition-colors" />
            </SectionCard>
            <SectionCard title="Notes">
              <textarea value={g("notes")} onChange={(e) => sf("notes", e.target.value)}
                placeholder="Additional notes..." rows={3}
                className="h-16 w-full rounded border border-border/40 bg-card px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-amber-400 transition-colors" />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (mode === "create" && !sel) return <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{renderForm()}</div>;
    if (!sel) return (
      <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
        <div className="text-center max-w-xs">
          <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1.5`}>No action selected</h3>
          <p className={`text-xs ${theme.textSecondary} leading-relaxed mb-4`}>Select an action or create a new one.</p>
          <button type="button" onClick={hNew}
            className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 transition-colors">
            <Plus className="h-3.5 w-3.5 stroke-current" /> New Action
          </button>
        </div>
      </div>
    );
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {mutationError && isForm && <div className="shrink-0 px-4 pt-2"><p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p></div>}
        {isForm ? renderForm() : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="shrink-0 border-b border-border/30 px-5 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-bold ${theme.textPrimary} truncate`}>{sel.title}</div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
                  {sel.priority && sel.priority !== "MEDIUM" && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PRIORITY_STYLES[sel.priority] || ""}`}>{sel.priority}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {sel.owner && <span className={`text-xs ${theme.textMuted}`}>Owner: {sel.owner}</span>}
                  {sel.dueDate && (
                    <span className={`text-xs ${isOverdue(sel.dueDate) && sel.status !== "DONE" ? "text-red-500 font-semibold" : theme.textMuted}`}>
                      {isOverdue(sel.dueDate) && sel.status !== "DONE" && <AlertTriangle className="inline h-2.5 w-2.5 mr-0.5 stroke-current" />}
                      Due: {sel.dueDate}
                    </span>
                  )}
                  {sel.completedAt && <span className="text-xs text-green-600">Completed: {sel.completedAt?.slice(0, 10)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {sel.status === "OPEN" && (
                  <button type="button" onClick={hStart} className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <Play className="h-2.5 w-2.5 stroke-current" />Start
                  </button>
                )}
                {sel.status === "IN_PROGRESS" && (
                  <button type="button" onClick={() => setConfirmAction({ id: sel.id, action: "complete" })} className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <CheckCircle className="h-2.5 w-2.5 stroke-current" />Complete
                  </button>
                )}
                {sel.status !== "DONE" && sel.status !== "CANCELLED" && (
                  <button type="button" onClick={() => setConfirmAction({ id: sel.id, action: "cancel" })} className="inline-flex h-7 items-center gap-1 border border-red-200 dark:border-red-800 px-2 text-[10px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all whitespace-nowrap">
                    <Ban className="h-2.5 w-2.5 stroke-current" />Cancel
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 mr-6">
              <div className="grid grid-cols-2 gap-6 auto-rows-min">
                <div className="space-y-4">
                  <SectionCard title="Description">
                    {sel.description ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap">{sel.description}</p>
                    ) : <p className={`text-xs italic ${theme.textMuted}`}>No description provided.</p>}
                  </SectionCard>
                </div>
                <div className="space-y-4">
                  <SectionCard title="Details">
                    <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5 text-xs">
                      <span className={theme.textMuted}>Status</span><span className="font-medium">{statusLabel(sel.status)}</span>
                      <span className={theme.textMuted}>Priority</span><span className="font-medium">{sel.priority}</span>
                      <span className={theme.textMuted}>Owner</span><span className="font-medium">{sel.owner || "-"}</span>
                      <span className={theme.textMuted}>Due Date</span><span className="font-medium">{sel.dueDate || "-"}</span>
                      <span className={theme.textMuted}>Source</span><span className="font-medium">{sel.sourceType || "-"}{sel.sourceId ? ` #${sel.sourceId}` : ""}</span>
                    </div>
                  </SectionCard>
                  {sel.notes && (
                    <SectionCard title="Notes"><p className="text-sm text-foreground whitespace-pre-wrap">{sel.notes}</p></SectionCard>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        {successMsg && <div className={`shrink-0 h-8 flex items-center justify-center ${theme.toastSuccess} text-sm font-semibold border-b`}>{successMsg}</div>}
        <div>
          <PageHeader icon={<ListChecks className="h-5 w-5 stroke-current" />}
            iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
            title="Actions" subtitle="Review active actions, assign owners, and follow through on response plans." />
        </div>
        <div>
          <Toolbar left={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search actions..." />}
            right={<>
              <ToolbarSelect value={filterStatus} onChange={setFilterStatus}
                options={ACTION_STATUS_OPTIONS} className="w-32" />
              <ToolbarSelect value={filterOwner} onChange={setFilterOwner}
                options={[{ value: "", label: "All Owners" }, { value: "filter", label: "Show Filtered" }]} className="w-32" />
              <div className="flex-1" />
              <div className="flex items-center gap-2 shrink-0">
                {isForm ? (
                  <><ToolbarButton icon={Check} label="Save" onClick={hSave} variant="success" /><ToolbarButton icon={X} label="Cancel" onClick={hCancel} /></>
                ) : (
                  <><ToolbarButton icon={Plus} label="New" onClick={hNew} /><ToolbarButton icon={Pencil} label="Edit" onClick={hEdit} disabled={!sel} />
                    <span className="h-5 w-px shrink-0 bg-border/25" />
                    <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>
                )}
              </div>
            </>} />
        </div>
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col min-h-0 overflow-hidden bg-card/40 border-r border-border/20" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
              <span className={`text-sm font-medium ${theme.textMuted}`}>Actions</span>
              <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{filteredActions.length}</span>
            </div>
            <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
              {loading && actions.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
              ) : filteredActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs font-medium text-muted-foreground">No actions</p>
                  <button type="button" onClick={hNew}
                    className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600/10 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-600/20 dark:text-amber-400 transition-colors">
                    <Plus className="h-3 w-3 stroke-current" /> Create action</button>
                </div>
              ) : (
                <div>{filteredActions.map((a) => (
                  <div key={a.id}
                    onClick={() => { if (isForm && isDirty && mode === "edit") { if (!confirm("Unsaved changes. Discard?")) return; } setSelectedId(a.id); clearForm(); setIsDirty(false); setMode("view"); }}
                    className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${selectedId === a.id ? "bg-table-selected border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
                    <div className="min-w-0 flex-1">
                      <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                        <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{a.title}</span>
                        <div className="flex items-center gap-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[a.status] || ""}`}>{statusLabel(a.status)}</span>
                          {a.priority && a.priority !== "MEDIUM" && <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border ${PRIORITY_STYLES[a.priority] || ""}`}>{a.priority}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {a.owner && <span className={`text-xs ${theme.textMuted}`}>{a.owner}</span>}
                        {a.dueDate && <span className={`text-[10px] ${isOverdue(a.dueDate) && a.status !== "DONE" ? "text-red-500 font-semibold" : theme.textMuted}`}>{isOverdue(a.dueDate) && a.status !== "DONE" && <AlertTriangle className="inline h-2 w-2 mr-px stroke-current" />}Due: {a.dueDate}</span>}
                      </div>
                    </div>
                  </div>
                ))}</div>
              )}
            </div>
            <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4">
              <span className={`text-xs ${theme.textMuted}`}>{filteredActions.length} action{filteredActions.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div onMouseDown={handleSplitMouseDown} className="flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-blue-500/10" style={{ width: 2 }} />
          <div className={`flex flex-col min-h-0 min-w-0 ${isForm ? "" : "mode-enter"}`} style={{ flex: 1 }}>{renderDetail()}</div>
        </div>
        <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <span>Actions</span><span className="flex-1" />
          {sel && <><span>Created: {sel.createdAt?.slice(0, 10) || "-"}</span><span>Updated: {sel.updatedAt?.slice(0, 10) || "-"}</span></>}
        </div>
      </div>
      <ConfirmDialog open={confirmAction !== null} onClose={() => setConfirmAction(null)}
        onConfirm={confirmAction?.action === "complete" ? hComplete : hCancelAction}
        title={`${confirmAction?.action === "cancel" ? "Cancel" : "Complete"} Action`}
        message={confirmAction?.action === "cancel" ? "Cancel this action?" : "Mark this action as completed?"}
        confirmLabel={confirmAction?.action === "complete" ? "Complete" : "Yes, Cancel"}
        danger={confirmAction?.action === "cancel"} />
    </>
  );
}
