import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Plus, Play, Save, Archive, Trash2, ArrowLeft, CircleAlert } from "lucide-react";
import { ToolbarButton } from "@/components/shared/Toolbar";
import { useActiveLine } from "@/hooks/useActiveLine";
import {
  AUDIT_TEMPLATES_QUERY, AUDIT_EXECUTION_FORM_QUERY,
  CREATE_AUDIT_FROM_TEMPLATE_MUTATION, COMPLETE_AUDIT_MUTATION,
  SAVE_AUDIT_ANSWERS_BULK_MUTATION, CREATE_AUDIT_FINDING_FROM_ANSWER_MUTATION,
  CLOSE_FINDING_MUTATION, UPDATE_AUDIT_MUTATION, DELETE_AUDIT_MUTATION,
  INSTALL_DEFAULT_PC_TEMPLATES_MUTATION,
} from "@/graphql/auditQueries";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY, DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY, RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { USER_PROFILES_QUERY } from "@/graphql/administrationQueries";

type ControlArea = "PRODUCTION" | "QUALITY" | "SAFETY" | "MATERIAL";
type ExecTab = "form" | "findings";

interface AuditExecutionViewProps {
  controlArea: ControlArea;
  onBack: () => void;
  onRefresh: () => void;
  onMessage: (msg: string, tone?: "success" | "error") => void;
  selectedTemplateId: string | null;
  setSelectedTemplateId: (id: string | null) => void;
  creatingNew: boolean;
  auditCreated: boolean;
  setAuditCreated: (v: boolean) => void;
  execId: number | null;
  setExecId: (id: number | null) => void;
  onToolbarActions: (node: ReactNode | null) => void;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border/40",
  OPEN: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300",
  COMPLETED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  ARCHIVED: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300",
};

const WARN = "text-amber-700 dark:text-amber-300";
const SEL_INPUT = "h-8 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 px-2 text-sm text-foreground outline-none focus:border-blue-500";

function statusLabel(s: string) { return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " "); }

function scoreGrade(s: number | null) {
  if (s === null) return { label: "N/A", cls: "bg-muted text-muted-foreground border-border/40" };
  if (s >= 90) return { label: "Excellent", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (s >= 75) return { label: "Pass", cls: "bg-blue-100 text-blue-700 border-blue-200" };
  if (s >= 60) return { label: "Needs Improvement", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Fail", cls: "bg-red-100 text-red-700 border-red-200" };
}

function isFailed(rt: string, v: string) { return (rt === "PASS_FAIL_NA" && v === "FAIL") || (rt === "YES_NO_NA" && v === "NO"); }

function Seg({ opts, val, onChange }: { opts: string[]; val: string; onChange: (v: string) => void }) {
  const cls = (a: boolean, o: string) => {
    if (!a) return "bg-white/50 dark:bg-slate-800/50 text-muted-foreground hover:bg-white/80 dark:hover:bg-slate-700/80";
    if (o === "PASS" || o === "YES") return "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-300";
    if (o === "FAIL" || o === "NO") return "bg-red-100/80 text-red-800 dark:bg-red-900/80 dark:text-red-300";
    if (o === "N_A") return "bg-amber-100/80 text-amber-800 dark:bg-amber-900/80 dark:text-amber-300";
    return "bg-blue-100/80 text-blue-800 dark:bg-blue-900/80 dark:text-blue-300";
  };
  return <div className="inline-flex h-7 overflow-hidden rounded border border-white/30 dark:border-slate-700/30">{opts.map((o) => <button key={o} onClick={() => onChange(o)} className={`min-w-11 border-r border-white/30 dark:border-slate-700/30 px-2 text-xs font-medium last:border-r-0 transition-colors ${cls(val === o, o)}`}>{o === "N_A" ? "N/A" : o}</button>)}</div>;
}

function SegCtl({ rt, val, onChange }: { rt: string; val: string; onChange: (v: string) => void }) {
  if (rt === "PASS_FAIL_NA") return <Seg opts={["PASS", "FAIL", "N_A"]} val={val} onChange={onChange} />;
  if (rt === "YES_NO_NA") return <Seg opts={["YES", "NO", "N_A"]} val={val} onChange={onChange} />;
  if (rt === "SCORE_1_5") return <Seg opts={["1", "2", "3", "4", "5"]} val={val} onChange={onChange} />;
  if (rt === "TEXT") return <textarea value={val} onChange={(e) => onChange(e.target.value)} className="h-16 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs resize-none outline-none focus:border-blue-500" />;
  if (rt === "NUMBER") return <input type="number" value={val} onChange={(e) => onChange(e.target.value)} className="h-7 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 px-2 text-xs outline-none focus:border-blue-500" />;
  return null;
}

export function AuditExecutionView({
  controlArea, onBack, onRefresh, onMessage,
  selectedTemplateId, setSelectedTemplateId,
  creatingNew, auditCreated, setAuditCreated,
  execId, setExecId, onToolbarActions,
}: AuditExecutionViewProps) {
  const [saving, setSaving] = useState(false);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [execTab, setExecTab] = useState<ExecTab>("form");
  const [fPlant, setFPlant] = useState("");
  const [fLine, setFLine] = useState("");
  const [fDept, setFDept] = useState("");
  const [fRg, setFRg] = useState("");
  const [fRes, setFRes] = useState("");
  const [fAuditor, setFAuditor] = useState("");
  const [fDate, setFDate] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [draftAns, setDraftAns] = useState<Record<string, { v: string; c: string }>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [findingForAnswer, setFindingForAnswer] = useState<{ auditId: string; answerId: string | null; questionText: string } | null>(null);
  const [findingDesc, setFindingDesc] = useState("");
  const [findingSev, setFindingSev] = useState("MEDIUM");
  const [findingOwner, setFindingOwner] = useState("");
  const [closeFindingId, setCloseFindingId] = useState<string | null>(null);

  const { productionLineId: _productionLineId, activeLine } = useActiveLine();
  const activePlantId = (activeLine as any)?.plantId ?? null;

  const { data: tplData, refetch: refetchTpl } = useQuery<any>(AUDIT_TEMPLATES_QUERY, { variables: { moduleScope: controlArea === "PRODUCTION" ? "PRODUCTION_CONTROL" : "QUALITY_CONTROL", status: "ACTIVE" }, fetchPolicy: "cache-first" });
  const templates: any[] = (tplData as any)?.auditTemplates || [];
  const selTpl = templates.find((t) => t.id === selectedTemplateId);

  const execQ = useQuery<any>(AUDIT_EXECUTION_FORM_QUERY, { variables: { auditId: String(execId ?? "") }, skip: !execId, fetchPolicy: "cache-and-network" });
  const execForm: any = (execQ.data as any)?.auditExecutionForm || null;

  const { data: plData } = useQuery<any>(PLANTS_QUERY, { fetchPolicy: "cache-first" });
  const plants: any[] = (plData as any)?.plants || [];
  const { data: lData } = useQuery<any>(PRODUCTION_LINES_QUERY, { variables: { plantId: fPlant || undefined }, skip: !fPlant, fetchPolicy: "cache-first" });
  const lines: any[] = (lData as any)?.productionLines || [];
  const { data: dData } = useQuery<any>(DEPARTMENTS_QUERY, { variables: { productionLineId: fLine || undefined }, skip: !fLine, fetchPolicy: "cache-first" });
  const depts: any[] = (dData as any)?.departments || [];
  const { data: gData } = useQuery<any>(RESOURCE_GROUPS_QUERY, { variables: { departmentId: fDept || undefined }, skip: !fDept, fetchPolicy: "cache-first" });
  const rgs: any[] = (gData as any)?.resourceGroups || [];
  const { data: rData } = useQuery<any>(RESOURCES_QUERY, { variables: { resourceGroupId: fRg || undefined }, skip: !fRg, fetchPolicy: "cache-first" });
  const ress: any[] = (rData as any)?.resources || [];
  const { data: uProfData } = useQuery<any>(USER_PROFILES_QUERY, { variables: { isActive: true }, fetchPolicy: "cache-first" });
  const userProfiles: any[] = (uProfData as any)?.userProfiles || [];

  const [createAuditMut] = useMutation<any>(CREATE_AUDIT_FROM_TEMPLATE_MUTATION);
  const [completeMut] = useMutation<any>(COMPLETE_AUDIT_MUTATION);
  const [bulkSave] = useMutation<any>(SAVE_AUDIT_ANSWERS_BULK_MUTATION);
  const [createFindingMut] = useMutation<any>(CREATE_AUDIT_FINDING_FROM_ANSWER_MUTATION);
  const [closeFindingMut] = useMutation<any>(CLOSE_FINDING_MUTATION);
  const [updateAuditMut] = useMutation<any>(UPDATE_AUDIT_MUTATION);
  const [deleteAuditMut] = useMutation<any>(DELETE_AUDIT_MUTATION);
  const [installTpl] = useMutation<any>(INSTALL_DEFAULT_PC_TEMPLATES_MUTATION);

  const templateQuestions = useMemo(() => {
    if (!selTpl) return [];
    const qs: { id: string; question: string; rt: string; isReq: boolean; help: string; seq: number; catName: string }[] = [];
    for (const c of selTpl.categories) {
      for (const q of c.questions) {
        qs.push({ id: q.id, question: q.question, rt: q.responseType, isReq: q.isRequired, help: q.helpText, seq: q.sequence, catName: c.name });
      }
    }
    return qs;
  }, [selTpl]);

  const [localAns, setLocalAns] = useState<Record<string, { value: string; comment: string }>>({});

  // Reset localAns when execForm loads
  useEffect(() => {
    if (execForm) {
      const ans: Record<string, { value: string; comment: string }> = {};
      for (const sec of execForm.sections) {
        for (const q of sec.questions) {
          if (q.answerValue) ans[q.id] = { value: q.answerValue, comment: q.comment || "" };
        }
      }
      setLocalAns(ans);
    }
  }, [execForm?.id]);

  useEffect(() => {
    if (creatingNew && plants.length > 0) {
      setFPlant(activePlantId || plants[0]?.id || "");
    }
  }, [creatingNew, plants, activePlantId]);

  // Hydrate header fields when existing audit is selected
  useEffect(() => {
    if (creatingNew) return;
    const src: any = execForm ?? null;
    if (!src) return;
    setFAuditor(src.auditor || "");
    setFDate(src.auditDate || "");
    setFNotes(src.notes || "");
    const targetType = src.targetType || "";
    const targetId = src.targetId !== undefined && src.targetId !== null ? String(src.targetId) : "";
    setFPlant(""); setFLine(""); setFDept(""); setFRg(""); setFRes("");
    if (targetType === "PLANT") setFPlant(targetId);
    else if (targetType === "PRODUCTION_LINE") { const l = lines.find((x: any) => String(x.id) === targetId); if (l) setFLine(targetId); }
    else if (targetType === "DEPARTMENT") { const d = depts.find((x: any) => String(x.id) === targetId); if (d) setFDept(targetId); }
    else if (targetType === "RESOURCE_GROUP") { const g = rgs.find((x: any) => String(x.id) === targetId); if (g) setFRg(targetId); }
    else if (targetType === "RESOURCE") { const r = ress.find((x: any) => String(x.id) === targetId); if (r) setFRes(targetId); }
  }, [creatingNew, execForm]);

  const resolveTarget = useCallback(() => {
    if (fRes) return { targetType: "RESOURCE", targetId: fRes };
    if (fRg) return { targetType: "RESOURCE_GROUP", targetId: fRg };
    if (fDept) return { targetType: "DEPARTMENT", targetId: fDept };
    if (fLine) return { targetType: "PRODUCTION_LINE", targetId: fLine };
    if (fPlant) return { targetType: "PLANT", targetId: fPlant };
    return null;
  }, [fRes, fRg, fDept, fLine, fPlant]);

  const validateHeader = useCallback(() => {
    const errs: string[] = [];
    if (!selectedTemplateId) errs.push("Audit Type is required");
    if (!fPlant) errs.push("Plant is required");
    if (!resolveTarget()) errs.push("Target (Plant or deeper) is required");
    if (!fAuditor.trim()) errs.push("Auditor is required");
    if (!fDate) errs.push("Audit Date is required");
    setErrors(errs);
    return errs.length === 0;
  }, [selectedTemplateId, fPlant, fAuditor, fDate, resolveTarget]);

  const hSaveDraft = useCallback(async () => {
    if (!auditCreated && !validateHeader()) return;
    setSaving(true);
    let currentId = execId;
    const wasNewAudit = !auditCreated;

    try {
      if (!auditCreated || !currentId) {
        const target = resolveTarget();
        if (!target) { onMessage("Target is required", "error"); setSaving(false); return; }
        const res = await createAuditMut({
          variables: {
            input: {
              templateId: Number(selectedTemplateId),
              targetType: target.targetType,
              targetId: Number(target.targetId),
              title: `${selTpl?.name || "Audit"} - ${fPlant}`,
              auditor: fAuditor.trim() || undefined,
              auditDate: fDate || null,
              notes: fNotes.trim() || undefined,
              controlArea: controlArea,
            },
          },
        });
        if (res.data?.createAuditFromTemplate?.audit) {
          currentId = Number(res.data.createAuditFromTemplate.audit.id);
          setExecId(currentId);
          setAuditCreated(true);
          if (wasNewAudit) {
            setDraftAns({});
          }
        } else {
          onMessage(res.data?.createAuditFromTemplate?.errors?.[0]?.message || "Failed to create audit", "error");
          setSaving(false);
          return;
        }
      }

      if (currentId) {
        const answers = wasNewAudit
          ? Object.entries(draftAns).filter(([, a]) => a.v !== "").map(([qId, a]) => ({ questionId: Number(qId), answerValue: a.v, comment: a.c }))
          : Object.entries(localAns).filter(([, a]) => a.value !== "").map(([qId, a]) => ({ questionId: Number(qId), answerValue: a.value, comment: a.comment }));

        if (answers.length > 0) {
          await bulkSave({ variables: { input: { auditId: currentId, answers } } });
        }
        if (wasNewAudit && currentId) {
          setSelectedTemplateId(null);
        }
        onMessage(wasNewAudit ? "Audit created and draft saved." : "Draft saved.");
        execQ.refetch();
        onRefresh();
      }
    } catch (err: any) {
      onMessage(err.message || "Save failed", "error");
    }
    setSaving(false);
  }, [auditCreated, execId, selectedTemplateId, fPlant, fAuditor, fDate, fNotes, resolveTarget, selTpl, draftAns, localAns, createAuditMut, bulkSave, onMessage, execQ, setExecId, setAuditCreated, setSelectedTemplateId, onRefresh]);

  const hComplete = useCallback(async () => {
    if (!execId) return;
    const target = resolveTarget();
    if (!target) { onMessage("Target is required", "error"); return; }
    if (!fAuditor.trim()) { onMessage("Auditor is required", "error"); return; }
    if (!fDate) { onMessage("Audit Date is required", "error"); return; }

    try {
      const res = await completeMut({ variables: { id: String(execId) } });
      if (res.data?.completeAudit?.ok) {
        onMessage("Audit completed.");
        execQ.refetch();
        onRefresh();
      } else {
        onMessage(res.data?.completeAudit?.errors?.[0]?.message || "Cannot complete audit", "error");
      }
    } catch (err: any) {
      onMessage(err.message || "Complete failed", "error");
    }
  }, [execId, resolveTarget, fAuditor, fDate, completeMut, onMessage, execQ, onRefresh]);

  const hArchiveAudit = useCallback(async () => {
    if (!archiveConfirmId) return;
    await updateAuditMut({ variables: { id: archiveConfirmId, input: { status: "ARCHIVED" } } });
    onMessage("Audit archived");
    setArchiveConfirmId(null);
    setExecId(null);
    setAuditCreated(false);
    onRefresh();
  }, [archiveConfirmId, updateAuditMut, onMessage, onRefresh, setExecId, setAuditCreated]);

  const hDeleteAudit = useCallback(async () => {
    if (!deleteConfirmId) return;
    await deleteAuditMut({ variables: { id: deleteConfirmId } });
    onMessage("Audit deleted");
    setDeleteConfirmId(null);
    setExecId(null);
    setAuditCreated(false);
    onRefresh();
  }, [deleteConfirmId, deleteAuditMut, onMessage, onRefresh, setExecId, setAuditCreated]);

  const hInstall = useCallback(async () => {
    await installTpl();
    onMessage("Templates installed");
    refetchTpl();
  }, [installTpl, onMessage, refetchTpl]);

  const hCreateFinding = useCallback(async () => {
    if (!findingForAnswer || !findingDesc.trim()) return;
    await createFindingMut({
      variables: {
        input: {
          auditId: Number(findingForAnswer.auditId),
          answerId: Number(findingForAnswer.answerId),
          description: findingDesc.trim(),
          severity: findingSev,
          owner: findingOwner,
        },
      },
    });
    onMessage("Finding created");
    setFindingForAnswer(null);
    setFindingDesc("");
    setFindingSev("MEDIUM");
    setFindingOwner("");
    execQ.refetch();
  }, [findingForAnswer, findingDesc, findingSev, findingOwner, createFindingMut, onMessage, execQ]);

  // Push toolbar actions to parent whenever state changes — must be AFTER all callback definitions
  useEffect(() => {
    const isNew = creatingNew && !auditCreated;
    const canComplete = execForm && (execForm.status === "DRAFT" || execForm.status === "OPEN");
    const status = execForm?.status || (isNew ? "DRAFT" : null);

    if (isNew || auditCreated || execId) {
      onToolbarActions(
        <>
          {(!status || status === "DRAFT" || status === "OPEN") && (
            <ToolbarButton icon={Save} label={saving ? "Saving..." : "Save Draft"} onClick={hSaveDraft} disabled={saving} variant="success" />
          )}
          {(!status || status === "DRAFT" || status === "OPEN") && (
            <ToolbarButton icon={Play} label="Complete" onClick={hComplete} disabled={saving || !(auditCreated || execId) || !canComplete} />
          )}
          {(auditCreated || execId) && status !== "ARCHIVED" && <ToolbarButton icon={Trash2} label="Delete" onClick={() => setDeleteConfirmId(String(execId))} />}
          {status === "COMPLETED" && <ToolbarButton icon={Archive} label="Archive" onClick={() => setArchiveConfirmId(String(execId))} />}
          <span className="h-5 w-px shrink-0 bg-border/25" />
          <ToolbarButton icon={ArrowLeft} label="Back" onClick={onBack} />
        </>
      );
    } else {
      onToolbarActions(null);
    }
    // Reset toolbar on unmount so parent doesn't keep stale buttons
    return () => { onToolbarActions(null); };
  }, [creatingNew, auditCreated, execId, saving, execForm, hSaveDraft, hComplete, onBack, onToolbarActions]);

  // Render
  const isNew = creatingNew && !auditCreated;
  const checklistLocked = isNew;
  const headerTpl = isNew ? (selTpl ?? null) : (execForm?.template ?? null);
  const sections = isNew && selTpl ? selTpl.categories : (execForm?.sections ?? []);
  const headerStatus = isNew ? "DRAFT" : (execForm?.status ?? "DRAFT");
  const headerScore = isNew ? null : (execForm?.score ?? null);
  const headerTarget = isNew ? (resolveTarget()?.targetType ?? "") : (execForm?.targetDisplayName ?? "");

  const allQ = isNew ? templateQuestions : [];
  const setAns = isNew
    ? (qId: string, v: string) => setDraftAns((p) => { const c = p[qId]?.c ?? ""; return { ...p, [qId]: { v, c } }; })
    : (qId: string, v: string) => setLocalAns((p) => { const c = p[qId]?.comment ?? ""; return { ...p, [qId]: { value: v, comment: c } }; });

  const handleExistingAns = (qId: string, _rt: string, v: string) => { setAns(qId, v); };

  const getVal = (qId: string) => isNew
    ? (draftAns[qId]?.v ?? "")
    : (localAns[qId]?.value ?? execForm?.sections.flatMap((s: any) => s.questions).find((q: any) => q.id === qId)?.answerValue ?? "");

  const totalQ = isNew ? allQ.length : (execForm?.summary.totalQuestions ?? 0);
  const ansCount = isNew ? Object.values(draftAns).filter((a) => a.v !== "").length : (execForm?.summary.answeredCount ?? 0);
  const findings = isNew ? [] : (execForm?.findings ?? []);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
      {/* Header */}
      <div className="shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-white/20 dark:border-slate-700/20 px-4 py-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground">{isNew ? "New Audit" : execForm?.title ?? ""}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-muted-foreground">{headerTpl?.name ?? ""} v{headerTpl?.version ?? ""}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground">{headerTarget}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[headerStatus] || ""}`}>{statusLabel(headerStatus)}</span>
              {headerScore !== null && <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${scoreGrade(headerScore).cls}`}>{headerScore}%</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-2">
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Audit Type *</label>
            {isNew ? (
              <select value={selectedTemplateId ?? ""} onChange={(e) => { setSelectedTemplateId(e.target.value || null); setDraftAns({}); setErrors([]); }} className={SEL_INPUT}>
                <option value="">Select type...</option>
                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            ) : <div className="h-8 flex items-center px-2 text-sm text-foreground bg-white/30 dark:bg-slate-800/30 border border-white/20 dark:border-slate-700/20">{headerTpl?.name ?? "-"} v{headerTpl?.version ?? ""}</div>}
          </div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Plant *</label>
            <select value={fPlant} onChange={(e) => { setFPlant(e.target.value); setFLine(""); setFDept(""); setFRg(""); setFRes(""); }} className={SEL_INPUT}>
              <option value="">Select...</option>
              {plants.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Production Line</label>
            <select value={fLine} onChange={(e) => { setFLine(e.target.value); setFDept(""); setFRg(""); setFRes(""); }} className={SEL_INPUT} disabled={!fPlant}>
              <option value="">{fPlant ? "Optional..." : "Select Plant first"}</option>
              {lines.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Department</label>
            <select value={fDept} onChange={(e) => { setFDept(e.target.value); setFRg(""); setFRes(""); }} className={SEL_INPUT} disabled={!fLine}>
              <option value="">{fLine ? "Optional..." : "Select Production Line first"}</option>
              {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-1.5">
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Resource Group</label>
            <select value={fRg} onChange={(e) => { setFRg(e.target.value); setFRes(""); }} className={SEL_INPUT} disabled={!fDept}>
              <option value="">{fDept ? "Optional..." : "Select Department first"}</option>
              {rgs.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Resource</label>
            <select value={fRes} onChange={(e) => setFRes(e.target.value)} className={SEL_INPUT} disabled={!fRg}>
              <option value="">{fRg ? "Optional..." : "Select Resource Group first"}</option>
              {ress.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Auditor *</label>
            <select value={fAuditor} onChange={(e) => setFAuditor(e.target.value)} className={SEL_INPUT}>
              <option value="">Select auditor...</option>
              {userProfiles.map((u: any) => <option key={u.id} value={u.fullName}>{u.fullName} ({u.username})</option>)}
            </select>
          </div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Audit Date *</label>
            <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className={SEL_INPUT} />
          </div>
        </div>
        <div className="mt-1.5"><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Notes</label>
          <input type="text" value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Optional..." className={SEL_INPUT + " placeholder:text-muted-foreground/30"} />
        </div>
        {errors.length > 0 && <div className="flex flex-wrap gap-2 mt-1">{errors.map((e, i) => <span key={i} className={`text-[10px] font-medium ${WARN}`}>⚠ {e}</span>)}</div>}
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
        <button onClick={() => setExecTab("form")} className={`px-4 py-1.5 text-[11px] font-semibold border-b-2 transition-colors ${execTab === "form" ? "border-amber-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Form ({ansCount}/{totalQ})</button>
        <button onClick={() => setExecTab("findings")} disabled={isNew} className={`px-4 py-1.5 text-[11px] font-semibold border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${execTab === "findings" ? "border-amber-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Findings ({findings.length})</button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {execTab === "form" && (
          <div className="p-4 space-y-3">
            {isNew && allQ.length === 0 && templates.length === 0 && (
              <div className="bg-amber-50/80 dark:bg-amber-950/80 backdrop-blur-sm border border-amber-200/50 dark:border-amber-800/50 p-4 text-center text-xs text-amber-700 dark:text-amber-400">
                <p>No templates installed for {controlArea}.</p>
                <button onClick={hInstall} className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700"><Plus className="h-3 w-3" /> Install Defaults</button>
              </div>
            )}
            {checklistLocked && (
              <div className="bg-amber-50/80 dark:bg-amber-950/80 backdrop-blur-sm border border-amber-200/50 dark:border-amber-800/50 p-4 text-xs text-amber-800 dark:text-amber-300">
                Click <strong>Save Draft</strong> above to create this audit in the database. The checklist form will unlock automatically after the draft is saved.
              </div>
            )}
            {(isNew ? allQ.length > 0 : sections.length > 0) && !checklistLocked && (
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30">
                {isNew ? (
                  (() => {
                    const grouped: Record<string, typeof allQ> = {};
                    for (const q of allQ) (grouped[q.catName] ||= []).push(q);
                    return Object.entries(grouped).map(([catName, qs]) => (
                      <div key={catName}>
                        <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/20 dark:border-slate-700/20 bg-white/30 dark:bg-slate-900/30">
                          <span className="text-xs font-bold text-foreground">{catName}</span>
                          <span className="bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">{qs.filter((q) => draftAns[q.id]?.v !== "").length}/{qs.length}</span>
                        </div>
                        {qs.map((q, idx) => {
                          const v = getVal(q.id);
                          const fail = isFailed(q.rt, v) || (q.rt === "SCORE_1_5" && v !== "" && Number(v) <= 2);
                          return (
                            <div key={q.id} className={`grid grid-cols-[28px_1fr_180px] items-start gap-2 px-4 py-1.5 text-sm border-b border-white/10 dark:border-slate-700/10 last:border-b-0 ${fail ? "bg-red-50/40 dark:bg-red-950/30" : ""}`}>
                              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-50/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-medium mt-0.5">{idx + 1}</div>
                              <div className="min-w-0"><span className="text-foreground">{q.question}</span>{q.isReq && <span className="ml-1 text-[9px] text-red-500 font-semibold">*</span>}{q.help && <div className="text-[10px] text-muted-foreground/60 italic">{q.help}</div>}</div>
                              <SegCtl rt={q.rt} val={v} onChange={(nv) => setAns(q.id, nv)} />
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()
                ) : (
                  sections.map((sec: any) => {
                    const secC = sec.questions.filter((q: any) => getVal(q.id) !== "").length;
                    return (
                      <div key={sec.id}>
                        <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/20 dark:border-slate-700/20 bg-white/30 dark:bg-slate-900/30">
                          <span className="text-xs font-bold text-foreground">{sec.title}</span>
                          <span className="bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">{secC}/{sec.questions.length}</span>
                        </div>
                        {sec.questions.map((q: any, idx: number) => {
                          const v = getVal(q.id);
                          const fail = isFailed(q.responseType, v) || (q.responseType === "SCORE_1_5" && v !== "" && Number(v) <= 2);
                          return (
                            <div key={q.id} className={`grid grid-cols-[28px_1fr_180px] items-start gap-2 px-4 py-1.5 text-sm border-b border-white/10 dark:border-slate-700/10 last:border-b-0 ${fail ? "bg-red-50/40 dark:bg-red-950/30" : ""}`}>
                              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-50/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-medium mt-0.5">{idx + 1}</div>
                              <div className="min-w-0"><span className="text-foreground">{q.questionText}</span>{q.isRequired && <span className="ml-1 text-[9px] text-red-500 font-semibold">*</span>}{q.helpText && <div className="text-[10px] text-muted-foreground/60 italic">{q.helpText}</div>}</div>
                              <SegCtl rt={q.responseType} val={v} onChange={(nv) => {
                                handleExistingAns(q.id, q.responseType, nv);
                                if (isFailed(q.responseType, nv) && !isFailed(q.responseType, v) && execForm?.id && q.answerId) {
                                  setFindingForAnswer({ auditId: execForm.id, answerId: q.answerId, questionText: q.questionText });
                                }
                              }} />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            )}
            {/* Findings below form for existing audits */}
            {!isNew && findings.length > 0 && (
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30">
                {findings.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-2 border-b border-white/10 dark:border-slate-700/10 last:border-b-0">
                    <CircleAlert className="h-4 w-4 stroke-current shrink-0 text-red-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{f.description}</span>
                        <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${f.severity === "HIGH" || f.severity === "CRITICAL" ? "border-red-200 text-red-700 bg-red-50" : f.severity === "MEDIUM" ? "border-amber-200 text-amber-700 bg-amber-50" : "border-gray-200 text-gray-600 bg-gray-50"}`}>{f.severity}</span>
                        <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${f.status === "OPEN" ? "border-blue-200 text-blue-700 bg-blue-50" : "border-green-200 text-green-700 bg-green-50"}`}>{f.status}</span>
                      </div>
                      {f.owner && <p className="text-[10px] text-muted-foreground mt-0.5">Owner: {f.owner}</p>}
                    </div>
                    {f.status === "OPEN" && (
                      <button onClick={() => setCloseFindingId(f.id)} className="shrink-0 inline-flex h-6 items-center border border-green-200 px-1.5 text-[9px] font-semibold text-green-700 bg-green-50 hover:bg-green-100">Close</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {execTab === "findings" && !isNew && (
          <div className="p-4">
            {findings.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No findings recorded.</p>
            ) : (
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30">
                {findings.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-2 border-b border-white/10 dark:border-slate-700/10 last:border-b-0">
                    <CircleAlert className="h-4 w-4 stroke-current shrink-0 text-red-500" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-foreground">{f.description}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${f.severity === "HIGH" || f.severity === "CRITICAL" ? "border-red-200 text-red-700 bg-red-50" : f.severity === "MEDIUM" ? "border-amber-200 text-amber-700 bg-amber-50" : "border-gray-200 text-gray-600 bg-gray-50"}`}>{f.severity}</span>
                        <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${f.status === "OPEN" ? "border-blue-200 text-blue-700 bg-blue-50" : "border-green-200 text-green-700 bg-green-50"}`}>{f.status}</span>
                        {f.owner && <span className="text-[10px] text-muted-foreground">Owner: {f.owner}</span>}
                      </div>
                    </div>
                    {f.status === "OPEN" && <button onClick={() => setCloseFindingId(f.id)} className="shrink-0 inline-flex h-6 items-center border border-green-200 px-1.5 text-[9px] font-semibold text-green-700 bg-green-50 hover:bg-green-100">Close</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {execTab === "findings" && isNew && <div className="p-4 text-xs text-muted-foreground italic">Findings appear after audit is saved.</div>}
      </div>

      {/* Close finding dialog */}
      {closeFindingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setCloseFindingId(null)}>
          <div className="bg-card border border-border shadow-lg p-5 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-2">Close Finding</h3>
            <p className="text-xs text-muted-foreground mb-4">Confirm closing this finding?</p>
            <div className="flex gap-2">
              <button onClick={async () => { if (closeFindingId) { await closeFindingMut({ variables: { id: closeFindingId } }); onMessage("Finding closed"); setCloseFindingId(null); execQ.refetch(); } }} className="inline-flex h-7 items-center bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700">Close</button>
              <button onClick={() => setCloseFindingId(null)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Findings from checklist */}
      {findingForAnswer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setFindingForAnswer(null)}>
          <div className="bg-card border border-border shadow-lg p-5 w-96 max-w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-1">Create Finding</h3>
            <p className="text-[10px] text-muted-foreground mb-3">From: {findingForAnswer.questionText}</p>
            <div className="space-y-2.5">
              <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Description *</label><textarea value={findingDesc} onChange={(e) => setFindingDesc(e.target.value)} rows={2} className="w-full rounded border border-border/40 bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-info/60 resize-none" placeholder="Describe the non-conformance..." /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Severity</label><select value={findingSev} onChange={(e) => setFindingSev(e.target.value)} className="h-7 w-full rounded border border-border/40 bg-card px-1 text-xs text-foreground outline-none"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div>
                <div><label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Owner</label><input type="text" value={findingOwner} onChange={(e) => setFindingOwner(e.target.value)} placeholder="Owner name..." className="h-7 w-full rounded border border-border/40 bg-card px-2 text-xs text-foreground outline-none focus:border-info/60" /></div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={hCreateFinding} disabled={!findingDesc.trim()} className="inline-flex h-7 items-center gap-1 bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-40">Create Finding</button>
                <button onClick={() => setFindingForAnswer(null)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive confirm */}
      {archiveConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setArchiveConfirmId(null)}>
          <div className="bg-card border border-border shadow-lg p-5 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-2">Archive Audit</h3>
            <p className="text-xs text-muted-foreground mb-4">Are you sure you want to archive this audit?</p>
            <div className="flex gap-2">
              <button onClick={hArchiveAudit} className="inline-flex h-7 items-center bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700">Archive</button>
              <button onClick={() => setArchiveConfirmId(null)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-card border border-border shadow-lg p-5 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-2">Delete Audit</h3>
            <p className="text-xs text-muted-foreground mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={hDeleteAudit} className="inline-flex h-7 items-center bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
              <button onClick={() => setDeleteConfirmId(null)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar actions (to be rendered by parent) */}
      {null}
    </div>
  );
}

export function auditToolbarActions(
  creatingNew: boolean,
  auditCreated: boolean,
  execId: number | null,
  saving: boolean,
  auditStatus: string | null,
  onSaveDraft: () => void,
  onComplete: () => void,
  onArchive: () => void,
  onDelete: () => void,
  onBack: () => void,
) {
  const status = auditStatus || (creatingNew ? "DRAFT" : null);
  if (!creatingNew && !auditCreated && !execId) return null;
  return (
    <>
      {(!status || status === "DRAFT" || status === "OPEN") && (
        <ToolbarButton icon={Save} label={saving ? "Saving..." : "Save Draft"} onClick={onSaveDraft} disabled={saving} variant="success" />
      )}
      {(!status || status === "DRAFT" || status === "OPEN") && (
        <ToolbarButton icon={Play} label="Complete" onClick={onComplete} disabled={saving || !(auditCreated || execId)} />
      )}
      {(auditCreated || execId) && status !== "ARCHIVED" && <ToolbarButton icon={Trash2} label="Delete" onClick={onDelete} />}
      {status === "COMPLETED" && <ToolbarButton icon={Archive} label="Archive" onClick={onArchive} />}
      <span className="h-5 w-px shrink-0 bg-border/25" />
      <ToolbarButton icon={ArrowLeft} label="Back" onClick={onBack} />
    </>
  );
}
