import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Plus, MapPin, ClipboardList } from "lucide-react";
import {
  AUDITS_QUERY, AUDIT_TEMPLATES_QUERY, AUDIT_EXECUTION_FORM_QUERY,
  CREATE_AUDIT_FROM_TEMPLATE_MUTATION, COMPLETE_AUDIT_MUTATION,
  SAVE_AUDIT_ANSWERS_BULK_MUTATION, CLOSE_FINDING_MUTATION,
  CREATE_AUDIT_FINDING_FROM_ANSWER_MUTATION,
  UPDATE_AUDIT_MUTATION, DELETE_AUDIT_MUTATION,
  CANCEL_AUDIT_MUTATION, CREATE_FINDINGS_FROM_AUDIT_MUTATION,
  INSTALL_DEFAULT_PC_TEMPLATES_MUTATION,
} from "@/graphql/auditQueries";
import type { DocumentNode } from "graphql";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY, DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY, RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { USER_PROFILES_QUERY } from "@/graphql/administrationQueries";
import type { AuditTemplateData, AuditExecutionFormData } from "@/types/audit";
import { STATUS_STYLES, SEL_INPUT, statusLabel, scoreGrade, isFailed, SegCtl, FindingsTable } from "./ProductionStatusStyles.tsx";

export function useProductionAuditSection(
  _search: string,
  filterStatus: string,
  activePlantId: string | null,
  productionLineId: string | null,
  onMessage: (msg: string, tone?: "success" | "error") => void,
  controlArea: string = "PRODUCTION",
  moduleScope: string = "PRODUCTION_CONTROL",
  installMutation?: DocumentNode,
) {
  // ── State ──
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [execId, setExecId] = useState<number | null>(null);
  const [tplId, setTplId] = useState<string | null>(null);
  const [execTab, setExecTab] = useState<"form" | "findings">("form");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [closeFindingId, setCloseFindingId] = useState<string | null>(null);
  void closeFindingId; // kept for future findings close wiring
  const [errors, setErrors] = useState<string[]>([]);

  // Header form fields
  const [fPlant, setFPlant] = useState("");
  const [fLine, setFLine] = useState("");
  const [fDept, setFDept] = useState("");
  const [fRg, setFRg] = useState("");
  const [fRes, setFRes] = useState("");
  const [fAuditor, setFAuditor] = useState("");
  const [fDate, setFDate] = useState("");
  const [fNotes, setFNotes] = useState("");

  // Answer state
  const [draftAns, setDraftAns] = useState<Record<string, { v: string; c: string }>>({});
  const [localAns, setLocalAns] = useState<Record<string, { value: string; comment: string }>>({});
  const [findingForAnswer, setFindingForAnswer] = useState<{ auditId: string; answerId: string | null; questionText: string; questionId: string } | null>(null);
  const [findingDesc, setFindingDesc] = useState("");
  const [findingSev, setFindingSev] = useState("MEDIUM");
  const [findingDd, setFindingDd] = useState("");
  const [findingOwner, setFindingOwner] = useState("");

  // ── Queries ──
  const auditsQ = useQuery<any>(AUDITS_QUERY, { variables: { controlArea, status: filterStatus || null }, fetchPolicy: "cache-and-network" });
  const audits: any[] = auditsQ.data?.audits || [];
  const tplQ = useQuery<any>(AUDIT_TEMPLATES_QUERY, { variables: { moduleScope, status: "ACTIVE" }, fetchPolicy: "cache-and-network" });
  const templates: AuditTemplateData[] = (tplQ.data as any)?.auditTemplates || [];
  const selTpl = templates.find((t) => t.id === tplId);

  const execQ = useQuery<any>(AUDIT_EXECUTION_FORM_QUERY, {
    variables: { auditId: String(execId ?? "") }, skip: !execId || creating, fetchPolicy: "cache-and-network",
  });
  const execForm: AuditExecutionFormData | null = (execQ.data as any)?.auditExecutionForm || null;
  const selectedAudit = useMemo(() => {
    if (!execId) return null;
    return audits.find((a: any) => Number(a?.id) === Number(execId)) ?? null;
  }, [audits, execId]);

  // Plant cascade
  const { data: plData } = useQuery(PLANTS_QUERY, { fetchPolicy: "cache-first" });
  const plants: any[] = (plData as any)?.plants || [];
  const { data: lData } = useQuery(PRODUCTION_LINES_QUERY, { variables: { plantId: fPlant || undefined }, skip: !fPlant, fetchPolicy: "cache-first" });
  const lines: any[] = (lData as any)?.productionLines || [];
  const { data: dData } = useQuery(DEPARTMENTS_QUERY, { variables: { productionLineId: fLine || undefined }, skip: !fLine, fetchPolicy: "cache-first" });
  const depts: any[] = (dData as any)?.departments || [];
  const { data: gData } = useQuery(RESOURCE_GROUPS_QUERY, { variables: { departmentId: fDept || undefined }, skip: !fDept, fetchPolicy: "cache-first" });
  const rgs: any[] = (gData as any)?.resourceGroups || [];
  const { data: rData } = useQuery(RESOURCES_QUERY, { variables: { resourceGroupId: fRg || undefined }, skip: !fRg, fetchPolicy: "cache-first" });
  const ress: any[] = (rData as any)?.resources || [];
  const { data: uProfData } = useQuery(USER_PROFILES_QUERY, { variables: { isActive: true }, fetchPolicy: "cache-first" });
  const userProfiles: any[] = (uProfData as any)?.userProfiles || [];

  // ── Mutations ──
  const [closeFindingMut] = useMutation<any>(CLOSE_FINDING_MUTATION);
  void closeFindingMut; // kept for future findings close wiring
  const [createAuditMut] = useMutation<any>(CREATE_AUDIT_FROM_TEMPLATE_MUTATION);
  const [completeMut] = useMutation<any>(COMPLETE_AUDIT_MUTATION);
  const [bulkSave] = useMutation<any>(SAVE_AUDIT_ANSWERS_BULK_MUTATION);
  const [createFindingMut] = useMutation<any>(CREATE_AUDIT_FINDING_FROM_ANSWER_MUTATION);
  const [cancelAuditMut] = useMutation<any>(CANCEL_AUDIT_MUTATION);
  const [createFindingsFromAuditMut] = useMutation<any>(CREATE_FINDINGS_FROM_AUDIT_MUTATION);
  const [updateAuditMut] = useMutation<any>(UPDATE_AUDIT_MUTATION);
  const [deleteAuditMut] = useMutation<any>(DELETE_AUDIT_MUTATION);
  const [installTpl] = useMutation<any>(installMutation || INSTALL_DEFAULT_PC_TEMPLATES_MUTATION);

  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const hasErr = (field: string) => errors.some((e) => e.toLowerCase().includes(field.toLowerCase()));
  const fieldCls = (field: string) => `${SEL_INPUT} ${hasErr(field) ? "border-red-400 dark:border-red-600" : ""}`;
  const errLabel = (field: string) => hasErr(field) ? <span className="text-[10px] text-red-500 font-medium ml-1">(required)</span> : null;

  const resolveTarget = useCallback(() => {
    if (fRes && fRes !== "") return { targetType: "RESOURCE", targetId: fRes };
    if (fRg && fRg !== "") return { targetType: "RESOURCE_GROUP", targetId: fRg };
    if (fDept && fDept !== "") return { targetType: "DEPARTMENT", targetId: fDept };
    if (fLine && fLine !== "") return { targetType: "PRODUCTION_LINE", targetId: fLine };
    if (fPlant && fPlant !== "") return { targetType: "PLANT", targetId: fPlant };
    return null;
  }, [fRes, fRg, fDept, fLine, fPlant]);

  const validateHeader = useCallback(() => {
    const errs: string[] = [];
    if (!tplId) errs.push("Audit Type is required");
    if (!fPlant) errs.push("Plant is required");
    if (!resolveTarget()) errs.push("Target is required");
    if (!fAuditor.trim()) errs.push("Auditor is required");
    if (!fDate) errs.push("Audit Date is required");
    setErrors(errs);
    return errs.length === 0;
  }, [tplId, fPlant, fAuditor, fDate, resolveTarget]);

  // Prefill plant on new
  useEffect(() => {
    if (creating && plants.length > 0) setFPlant(activePlantId || plants[0]?.id || "");
  }, [creating, plants, activePlantId]);

  // Hydrate header on existing
  useEffect(() => {
    if (creating) return;
    const src: any = execForm ?? selectedAudit;
    if (!src) return;
    setFAuditor(src.auditor || "");
    setFDate(src.auditDate || "");
    setFNotes(src.notes || "");
    const targetType = src.targetType || "";
    const targetId = src.targetId !== undefined && src.targetId !== null ? String(src.targetId) : "";
    setFPlant(""); setFLine(""); setFDept(""); setFRg(""); setFRes("");
    if (targetType === "PLANT") setFPlant(targetId);
    else if (targetType === "PRODUCTION_LINE") setFLine(targetId);
    else if (targetType === "DEPARTMENT") setFDept(targetId);
    else if (targetType === "RESOURCE_GROUP") setFRg(targetId);
    else if (targetType === "RESOURCE") setFRes(targetId);
  }, [creating, execForm, selectedAudit]);

  // Prefill localAns from execForm
  useEffect(() => {
    if (!execForm || !execForm.sections) return;
    const merged: Record<string, { value: string; comment: string }> = { ...localAns };
    for (const sec of execForm.sections) {
      for (const q of sec.questions) {
        if (q.answerValue && !merged[q.id]) merged[q.id] = { value: q.answerValue, comment: q.comment || "" };
      }
    }
    setLocalAns(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execForm?.id]);

  const templateQuestions = useMemo(() => {
    if (!selTpl) return [];
    const qs: { id: string; question: string; rt: string; isReq: boolean; help: string; seq: number; catName: string }[] = [];
    for (const c of selTpl.categories) {
      for (const q of c.questions) qs.push({ id: q.id, question: q.question, rt: q.responseType, isReq: q.isRequired, help: q.helpText, seq: q.sequence, catName: c.name });
    }
    return qs;
  }, [selTpl]);

  const reqMissing = execForm ? execForm.summary.requiredMissingCount : 0;
  const canComplete = execForm && (execForm.status === "DRAFT" || execForm.status === "OPEN") && reqMissing === 0;

  // Auto-open finding dialog
  const prevAnsRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!execForm || (execForm.status !== "DRAFT" && execForm.status !== "OPEN")) return;
    for (const [qId, a] of Object.entries(localAns)) {
      const isFail = a.value === "FAIL" || a.value === "NO" || (a.value !== "" && !isNaN(Number(a.value)) && Number(a.value) <= 2);
      const wasFail = prevAnsRef.current[qId] === "FAIL" || prevAnsRef.current[qId] === "NO";
      if (isFail && !wasFail) {
        const allQs = execForm.sections.flatMap((s) => s.questions);
        const q = allQs.find((qq) => qq.id === qId);
        if (q) { setFindingForAnswer({ auditId: execForm.id, answerId: q.answerId || null, questionText: q.questionText, questionId: q.id }); break; }
      }
    }
    const snap: Record<string, string> = {};
    for (const [qId, a] of Object.entries(localAns)) snap[qId] = a.value;
    prevAnsRef.current = snap;
  }, [localAns, execForm]);

  useEffect(() => {
    if (execId != null) { setCreating(false); setCreated(true); }
  }, [execId]);

  const fmtErr = (msg: string | undefined | null): string => {
    if (!msg) return "Operation failed";
    return msg;
  };

  // ── Handlers ──
  const hNew = useCallback(() => {
    setCreating(true); setCreated(false); setExecId(null); setTplId(null); setExecTab("form");
    setFPlant(activePlantId || plants[0]?.id || ""); setFLine(productionLineId || "");
    setFDept(""); setFRg(""); setFRes(""); setFAuditor(""); setFDate(""); setFNotes("");
    setDraftAns({}); setLocalAns({}); setErrors([]); setEditing(false);
  }, [activePlantId, productionLineId, plants]);

  const hSaveDraft = useCallback(async () => {
    if (!created && !validateHeader()) return;
    setSaving(true);
    let currentId = execId;
    try {
      if (!created || !currentId) {
        const target = resolveTarget();
        if (!target) { onMessage("Target is required"); setSaving(false); return; }
        const templateIdNum = Number(tplId);
        const targetIdNum = Number(target.targetId);
        const auditTitle = selTpl?.name || "New Audit";
        const r = await createAuditMut({ variables: { input: { templateId: templateIdNum, targetType: target.targetType, targetId: targetIdNum, title: auditTitle, auditor: fAuditor, auditDate: fDate || null, notes: fNotes, controlArea } } });
        const d = r.data?.createAuditFromTemplate;
        if (!d?.ok || !d.audit) { onMessage(fmtErr(d?.errors?.[0]?.message)); setSaving(false); return; }
        currentId = Number(d.audit.id);
        setExecId(currentId);
        setCreated(true);
        // Migrate draft answers
        const migrated: Record<string, { value: string; comment: string }> = {};
        for (const [qId, a] of Object.entries(draftAns)) migrated[qId] = { value: a.v, comment: a.c };
        setLocalAns(migrated);
      }
      const ans = created ? localAns : draftAns;
      const items = Object.entries(ans).filter(([, a]) => {
        const v = created ? (a as any).value : (a as any).v;
        const c = created ? (a as any).comment : (a as any).c;
        return v !== "" || c !== "";
      }).map(([qId, a]) => ({ questionId: Number(qId), answerValue: created ? (a as any).value : (a as any).v, comment: created ? (a as any).comment : (a as any).c }));
      if (items.length > 0 && currentId) {
        const r = await bulkSave({ variables: { input: { auditId: currentId, answers: items } } });
        if (!r.data?.saveAuditAnswersBulk?.ok) { onMessage(r.data?.saveAuditAnswersBulk?.errors?.[0]?.message || "Save failed"); setSaving(false); return; }
      }
      const wasNewAudit = !created;
      if (wasNewAudit && currentId) {
        setCreating(false);
        onMessage("Audit created and draft saved.");
        await auditsQ.refetch();
      } else {
        onMessage("Draft saved.");
        await Promise.all([auditsQ.refetch(), execQ.refetch()]);
      }
      if (!wasNewAudit) { /* already done */ }
    } catch { onMessage("Save failed"); }
    setSaving(false);
  }, [tplId, fAuditor, fDate, fNotes, draftAns, localAns, created, execId, validateHeader, resolveTarget, createAuditMut, bulkSave, auditsQ, execQ, selTpl, onMessage]);

  const hComplete = useCallback(async () => {
    if (!created) { onMessage("Save Draft first"); return; }
    setSaving(true);
    let currentId = execId;
    if (!currentId) { onMessage("Save Draft first"); setSaving(false); return; }
    const ans = created ? localAns : draftAns;
    const items = Object.entries(ans).filter(([, a]) => { const v = created ? (a as any).value : (a as any).v; return v !== ""; }).map(([qId, a]) => ({ questionId: Number(qId), answerValue: created ? (a as any).value : (a as any).v, comment: created ? (a as any).comment : (a as any).c }));
    if (items.length > 0 && currentId) await bulkSave({ variables: { input: { auditId: currentId, answers: items } } });
    const r = await completeMut({ variables: { id: String(currentId) } });
    if (r.data?.completeAudit?.ok || r.data?.completeAudit?.audit?.id) {
      onMessage("Audit completed"); setCreating(false); setDraftAns({}); setLocalAns({}); auditsQ.refetch(); execQ.refetch();
    } else { onMessage(r.data?.completeAudit?.errors?.[0]?.message || "Cannot complete"); }
    setSaving(false);
  }, [created, execId, draftAns, localAns, bulkSave, completeMut, auditsQ, execQ, onMessage]);

  const hStartEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const hCancelEdit = useCallback(() => {
    setEditing(false);
    if (execForm) {
      const src: any = execForm;
      setFAuditor(src.auditor || "");
      setFDate(src.auditDate || "");
      setFNotes(src.notes || "");
      const targetType = src.targetType || "";
      const targetId = src.targetId !== undefined && src.targetId !== null ? String(src.targetId) : "";
      setFPlant(""); setFLine(""); setFDept(""); setFRg(""); setFRes("");
      if (targetType === "PLANT") setFPlant(targetId);
      else if (targetType === "PRODUCTION_LINE") setFLine(targetId);
      else if (targetType === "DEPARTMENT") setFDept(targetId);
      else if (targetType === "RESOURCE_GROUP") setFRg(targetId);
      else if (targetType === "RESOURCE") setFRes(targetId);
    }
  }, [execForm]);

  const hSaveEdit = useCallback(async () => {
    if (!execForm) return;
    setSaving(true);
    const target = resolveTarget();
    const input: any = {
      auditor: fAuditor,
      auditDate: fDate || null,
      notes: fNotes,
      targetType: target?.targetType || null,
      targetId: target ? Number(target.targetId) : null,
    };
    const r = await updateAuditMut({ variables: { id: execForm.id, input } });
    if (r.data?.updateAudit?.ok) {
      onMessage("Audit updated");
      setEditing(false);
      await Promise.all([auditsQ.refetch(), execQ.refetch()]);
    } else {
      onMessage(r.data?.updateAudit?.errors?.[0]?.message || "Update failed");
    }
    setSaving(false);
  }, [execForm, fAuditor, fDate, fNotes, resolveTarget, updateAuditMut, auditsQ, execQ, onMessage]);

  const hArchive = useCallback(async () => {
    if (!archiveConfirmId) return;
    await updateAuditMut({ variables: { id: archiveConfirmId, input: { status: "ARCHIVED" } } });
    onMessage("Archived"); setArchiveConfirmId(null); setExecId(null); auditsQ.refetch();
  }, [archiveConfirmId, updateAuditMut, auditsQ, onMessage]);

  const hDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    const r = await deleteAuditMut({ variables: { id: deleteConfirmId } });
    if (r.data?.deleteAudit?.ok) { onMessage("Audit deleted"); setDeleteConfirmId(null); setExecId(null); setCreating(false); setCreated(false); await Promise.all([auditsQ.refetch(), execQ.refetch()]); }
    else { onMessage(r.data?.deleteAudit?.errors?.[0]?.message || "Delete failed"); }
  }, [deleteConfirmId, deleteAuditMut, auditsQ, execQ, onMessage]);

  const hFinding = useCallback(async () => {
    if (!findingForAnswer || !findingDesc.trim()) return;
    const auditId = Number(findingForAnswer.auditId);
    let answerId = Number(findingForAnswer.answerId);
    if (!Number.isFinite(auditId)) { onMessage("Audit not found", "error"); return; }
    try {
      // If answer hasn't been saved yet, save it first
      if (!Number.isFinite(answerId) || answerId <= 0) {
        const saveR: any = await bulkSave({ variables: { input: { auditId: String(auditId), answers: [{ questionId: Number(findingForAnswer.questionId || 0), answerValue: localAns[findingForAnswer.questionId]?.value || "FAIL", comment: "" }] } } });
        if (!saveR.data?.saveAuditAnswersBulk?.ok) { onMessage("Answer could not be saved", "error"); return; }
        // Refetch to get the new answerId
        await execQ.refetch();
        const updatedForm: AuditExecutionFormData | null = (execQ.data as any)?.auditExecutionForm || null;
        if (updatedForm) {
          for (const sec of updatedForm.sections) {
            const q = sec.questions.find((qq) => qq.id === findingForAnswer.questionId);
            if (q && q.answerId) { answerId = Number(q.answerId); break; }
          }
        }
        if (!Number.isFinite(answerId) || answerId <= 0) { onMessage("Finding cannot be created before the answer is saved", "error"); return; }
      }
      const r: any = await createFindingMut({
        variables: {
          input: {
            auditId: String(auditId),
            questionId: Number(findingForAnswer.questionId),
            answerId,
            description: findingDesc.trim(),
            severity: findingSev,
            owner: findingOwner,
            dueDate: findingDd || null,
          },
        },
      });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Finding create failed", "error");
        return;
      }
      if (r.data?.createAuditFindingFromAnswer?.ok) { onMessage("Finding created"); setFindingForAnswer(null); setFindingDesc(""); setFindingDd(""); await Promise.all([execQ.refetch(), auditsQ.refetch()]); }
      else { onMessage(r.data?.createAuditFindingFromAnswer?.errors?.[0]?.message || "Finding create failed", "error"); }
    } catch (e: any) {
      onMessage(e?.message || "Finding create failed", "error");
    }
  }, [findingForAnswer, findingDesc, findingSev, findingDd, findingOwner, createFindingMut, execQ, auditsQ, onMessage, bulkSave, localAns]);

  // hCloseFinding callback removed — was dead code (never wired to UI)

  const hCancelAudit = useCallback(async () => {
    if (!cancelConfirmId) return;
    const r = await cancelAuditMut({ variables: { id: cancelConfirmId } });
    if (r.data?.cancelAudit?.ok) {
      onMessage("Audit cancelled"); setCancelConfirmId(null); setExecId(null);
      await Promise.all([auditsQ.refetch(), execQ.refetch()]);
    } else {
      onMessage(r.data?.cancelAudit?.errors?.[0]?.message || "Cancel failed");
      setCancelConfirmId(null);
    }
  }, [cancelConfirmId, cancelAuditMut, auditsQ, execQ, onMessage]);

  const hCreateFindings = useCallback(async () => {
    if (!execId) return;
    setSaving(true);
    try {
      const r: any = await createFindingsFromAuditMut({ variables: { auditId: String(execId), severity: "MEDIUM" } });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Create findings failed", "error");
        setSaving(false);
        return;
      }
      if (r.data?.createFindingsFromAudit?.ok) {
        onMessage(`Created ${r.data.createFindingsFromAudit.findings.length} finding(s)`);
        await Promise.all([execQ.refetch(), auditsQ.refetch()]);
      } else {
        onMessage(r.data?.createFindingsFromAudit?.errors?.[0]?.message || "Create findings failed");
      }
    } catch (e: any) {
      onMessage(e?.message || "Create findings failed", "error");
    }
    setSaving(false);
  }, [execId, createFindingsFromAuditMut, execQ, auditsQ, onMessage]);

  const hInstall = useCallback(async () => { await installTpl(); onMessage("Templates installed"); tplQ.refetch(); }, [installTpl, tplQ, onMessage]);

  const hRefresh = useCallback(async () => {
    setExecId(null); setCreating(false); setCreated(false); setTplId(null);
    await Promise.all([auditsQ.refetch(), tplQ.refetch(), execQ.refetch()]);
  }, [auditsQ, tplQ, execQ]);

  // ── Render Form ──
  const renderForm = () => {
    const isNew = creating && !created;
  const answersLocked = false;
  const headerTpl = isNew ? selTpl : (execForm?.template ?? null);
    const sections = isNew && selTpl ? selTpl.categories : (execForm?.sections ?? []);
    const headerStatus = isNew ? "DRAFT" : (execForm?.status ?? "DRAFT");
    const headerScore = isNew ? null : (execForm?.score ?? null);
    const allQ = isNew ? templateQuestions : [];
    const setAns = isNew ? (qId: string, v: string) => setDraftAns((p) => { const c = p[qId]?.c ?? ""; return { ...p, [qId]: { v, c } }; }) : (qId: string, v: string) => setLocalAns((p) => { const c = p[qId]?.comment ?? ""; return { ...p, [qId]: { value: v, comment: c } }; });
    const getVal = (qId: string) => isNew ? (draftAns[qId]?.v ?? "") : (localAns[qId]?.value ?? execForm?.sections.flatMap((s) => s.questions).find((q) => q.id === qId)?.answerValue ?? "");
    const totalQ = isNew ? allQ.length : (execForm?.summary.totalQuestions ?? 0);
    const ansCount = isNew ? Object.values(draftAns).filter((a) => a.v !== "").length : (execForm?.summary.answeredCount ?? 0);
    const findings = isNew ? [] : (execForm?.findings ?? []);
    const checklistLocked = isNew && !selTpl;

    return (
      <div className="flex flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
        {isNew ? (
          <>
            {/* Left column - 35% - Setup */}
            <div className="w-[35%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-4 flex flex-col gap-4">
              <h2 className="text-base font-bold text-foreground shrink-0">New Production Audit</h2>

              <div className="shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"><MapPin className="h-3 w-3" /></span>Source Location</h3>
                <div className="space-y-2">
                  <div><label className={labelCls}>Plant *{errLabel("plant")}</label><select value={fPlant} onChange={(e) => { setFPlant(e.target.value); setFLine(""); setFDept(""); setFRg(""); setFRes(""); }} aria-label="Plant" className={fieldCls("plant")}><option value="">Select...</option>{plants.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div><label className={labelCls}>Line</label><select value={fLine} onChange={(e) => { setFLine(e.target.value); setFDept(""); setFRg(""); setFRes(""); }} aria-label="Line" className={SEL_INPUT} disabled={!fPlant}><option value="">{fPlant ? "Optional..." : "Select Plant first"}</option>{lines.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                  <div><label className={labelCls}>Department</label><select value={fDept} onChange={(e) => { setFDept(e.target.value); setFRg(""); setFRes(""); }} aria-label="Department" className={SEL_INPUT} disabled={!fLine}><option value="">{fLine ? "Optional..." : "Select Line first"}</option>{depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                  <div><label className={labelCls}>Res. Group</label><select value={fRg} onChange={(e) => { setFRg(e.target.value); setFRes(""); }} aria-label="Resource group" className={SEL_INPUT} disabled={!fDept}><option value="">{fDept ? "Optional..." : "Select Dept first"}</option>{rgs.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                  <div><label className={labelCls}>Resource</label><select value={fRes} onChange={(e) => setFRes(e.target.value)} aria-label="Resource" className={SEL_INPUT} disabled={!fRg}><option value="">{fRg ? "Optional..." : "Select RG first"}</option>{ress.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                </div>
              </div>

              <div className="flex flex-col flex-1 min-h-0">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-blue-700 dark:text-blue-300 shrink-0"><span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"><ClipboardList className="h-3 w-3" /></span>Audit Details</h3>
                <div className="flex flex-col gap-2 flex-1 min-h-0">
                  <div className="shrink-0"><label className={labelCls}>Audit Type *{errLabel("type")}</label>
                    <select value={tplId ?? ""} onChange={(e) => { setTplId(e.target.value || null); setDraftAns({}); setErrors([]); }} aria-label="Audit type" className={fieldCls("type")}><option value="">Select type...</option>{templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                  <div className="shrink-0"><label className={labelCls}>Auditor *{errLabel("auditor")}</label>
                    <select value={fAuditor} onChange={(e) => setFAuditor(e.target.value)} aria-label="Auditor" className={fieldCls("auditor")}><option value="">Select auditor...</option>{userProfiles.map((u: any) => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div>
                  <div className="shrink-0"><label className={labelCls}>Date *{errLabel("date")}</label>
                    <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className={fieldCls("date")} /></div>
                  <div className="flex flex-col flex-1 min-h-0">
                    <label className={labelCls}>Notes</label>
                    <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} className={`${SEL_INPUT} resize-none flex-1 min-h-0`} placeholder="Optional notes..." />
                  </div>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-amber-700 dark:text-amber-300">Complete required fields to save:</div>
                  <div className="flex flex-wrap gap-1.5">{errors.map((e, i) => <span key={i} className="inline-flex items-center gap-1 rounded bg-amber-50/80 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">⚠ {e}</span>)}</div>
                </div>
              )}
            </div>

            {/* Right column - 65% - Checklist + Tabs */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Tabs */}
              <div className="shrink-0 flex border-b border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
                <button onClick={() => setExecTab("form")} className={`px-4 py-1.5 text-[11px] font-semibold border-b-2 transition-colors ${execTab === "form" ? "border-amber-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Form ({ansCount}/{totalQ})</button>
                <button onClick={() => setExecTab("findings")} disabled={isNew} className={`px-4 py-1.5 text-[11px] font-semibold border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${execTab === "findings" ? "border-amber-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Findings ({findings.length})</button>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {execTab === "form" && (
                  <>
                    {isNew && allQ.length === 0 && templates.length === 0 && (
                      <div className="bg-amber-50/80 dark:bg-amber-950/80 backdrop-blur-sm border border-amber-200/50 dark:border-amber-800/50 p-4 text-center text-xs text-amber-700 dark:text-amber-400">
                        <p>No templates.</p><button onClick={hInstall} className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700"><Plus className="h-3 w-3" /> Install Defaults</button>
                      </div>
                    )}
                    {checklistLocked && <div className="bg-amber-50/80 dark:bg-amber-950/80 backdrop-blur-sm border border-amber-200/50 dark:border-amber-800/50 p-4 text-xs text-amber-800 dark:text-amber-300">Select audit type to load checklist.</div>}
                    {answersLocked && <div className="bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 p-3 text-xs text-blue-700 dark:text-blue-300">Save Draft to start answering checklist questions.</div>}
                    {(isNew ? allQ.length > 0 : sections.length > 0) && !checklistLocked && (
                      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30">
                        {isNew ? (() => {
                          const grouped: Record<string, typeof allQ> = {};
                          for (const q of allQ) (grouped[q.catName] ||= []).push(q);
                          return Object.entries(grouped).map(([catName, qs]) => (
                            <div key={catName}>
                              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/20 dark:border-slate-700/20 bg-white/30 dark:bg-slate-900/30">
                                <span className="text-xs font-bold text-foreground">{catName}</span>
                                <span className="bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">{qs.filter((q) => draftAns[q.id]?.v !== "").length}/{qs.length}</span>
                              </div>
                              {qs.map((q, idx) => {
                                const v = getVal(q.id);
                                const fail = isFailed(q.rt, v) || (q.rt === "SCORE_1_5" && v !== "" && Number(v) <= 2);
                                return <div key={q.id} className={`grid grid-cols-[28px_1fr_180px] items-start gap-2 px-4 py-2 text-sm border-b border-white/10 dark:border-slate-700/10 last:border-b-0 ${fail ? "bg-red-50/40 dark:bg-red-950/30" : ""}`}>
                                  <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-50/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-medium mt-0.5">{idx + 1}</div>
                                  <div className="min-w-0"><span className="text-foreground">{q.question}</span>{q.isReq && <span className="ml-1 text-[9px] text-red-500 font-semibold">*</span>}{q.help && <div className="text-[10px] text-muted-foreground/60 italic">{q.help}</div>}</div>
                                  <SegCtl rt={q.rt} val={v} onChange={(nv) => setAns(q.id, nv)} disabled={answersLocked} />
                                </div>;
                              })}
                            </div>
                          ));
                        })() : sections.map((sec: any) => {
                          const secC = sec.questions.filter((q: any) => getVal(q.id) !== "").length;
                          return <div key={sec.id}>
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/20 dark:border-slate-700/20 bg-white/30 dark:bg-slate-900/30">
                              <span className="text-xs font-bold text-foreground">{sec.title}</span>
                              <span className="bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">{secC}/{sec.questions.length}</span>
                            </div>
                            {sec.questions.map((q: any, idx: number) => {
                              const v = getVal(q.id);
                              const fail = isFailed(q.responseType, v) || (q.responseType === "SCORE_1_5" && v !== "" && Number(v) <= 2);
                              return <div key={q.id} className={`grid grid-cols-[28px_1fr_180px] items-start gap-2 px-4 py-2 text-sm border-b border-white/10 dark:border-slate-700/10 last:border-b-0 ${fail ? "bg-red-50/40 dark:bg-red-950/30" : ""}`}>
                                <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-50/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-medium mt-0.5">{idx + 1}</div>
                                <div className="min-w-0"><span className="text-foreground">{q.questionText}</span>{q.isRequired && <span className="ml-1 text-[9px] text-red-500 font-semibold">*</span>}{q.helpText && <div className="text-[10px] text-muted-foreground/60 italic">{q.helpText}</div>}</div>
                                <SegCtl rt={q.responseType} val={v} onChange={(nv) => setAns(q.id, nv)} />
                              </div>;
                            })}
                          </div>;
                        })}
                      </div>
                    )}
                  </>
                )}
                {execTab === "findings" && !isNew && (
                  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30"><FindingsTable findings={findings} onClose={setCloseFindingId} /></div>
                )}
              </div>

              {/* Finding dialog */}
              {findingForAnswer && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 border border-white/30 dark:border-slate-700/30 w-[400px] p-4 shadow-xl space-y-3">
                    <p className="text-xs font-semibold text-foreground">Create Finding for: {findingForAnswer.questionText}</p>
                    <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Description *</label><input type="text" value={findingDesc} onChange={(e) => setFindingDesc(e.target.value)} className={SEL_INPUT} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Severity</label><select value={findingSev} onChange={(e) => setFindingSev(e.target.value)} aria-label="Finding severity" className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>                      <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Due Date</label><input type="date" value={findingDd} onChange={(e) => setFindingDd(e.target.value)} className={SEL_INPUT} aria-label="Finding due date" /></div>
                      
                    </div>
                    <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Owner</label><input type="text" value={findingOwner} onChange={(e) => setFindingOwner(e.target.value)} className={SEL_INPUT} /></div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={hFinding} disabled={!findingDesc.trim()} className="inline-flex h-7 items-center gap-1 px-3 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40">Create</button>
                      <button onClick={() => setFindingForAnswer(null)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Left column - 35% - Existing audit info */}
            <div className="w-[35%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-4 space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground">{execForm?.title ?? ""}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                  <span className="text-muted-foreground">{headerTpl?.name ?? ""} v{headerTpl?.version ?? ""}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[headerStatus] || ""}`}>{statusLabel(headerStatus)}</span>
                  {headerScore !== null && <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${scoreGrade(headerScore).cls}`}>{headerScore}%</span>}
                </div>
              </div>

              {editing ? (
                <>
                  <div className="shrink-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"><MapPin className="h-3 w-3" /></span>Source Location</h3>
                    <div className="space-y-2">
                      <div><label className={labelCls}>Plant</label><select value={fPlant} onChange={(e) => { setFPlant(e.target.value); setFLine(""); setFDept(""); setFRg(""); setFRes(""); }} aria-label="Plant" className={SEL_INPUT}><option value="">Select...</option>{plants.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                      <div><label className={labelCls}>Line</label><select value={fLine} onChange={(e) => { setFLine(e.target.value); setFDept(""); setFRg(""); setFRes(""); }} aria-label="Line" className={SEL_INPUT} disabled={!fPlant}><option value="">{fPlant ? "Optional..." : "Select Plant first"}</option>{lines.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                      <div><label className={labelCls}>Dept</label><select value={fDept} onChange={(e) => { setFDept(e.target.value); setFRg(""); setFRes(""); }} aria-label="Department" className={SEL_INPUT} disabled={!fLine}><option value="">{fLine ? "Optional..." : "Select Line first"}</option>{depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                      <div><label className={labelCls}>Res Group</label><select value={fRg} onChange={(e) => { setFRg(e.target.value); setFRes(""); }} aria-label="Resource group" className={SEL_INPUT} disabled={!fDept}><option value="">{fDept ? "Optional..." : "Select Dept first"}</option>{rgs.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                      <div><label className={labelCls}>Resource</label><select value={fRes} onChange={(e) => setFRes(e.target.value)} aria-label="Resource" className={SEL_INPUT} disabled={!fRg}><option value="">{fRg ? "Optional..." : "Select RG first"}</option>{ress.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-blue-700 dark:text-blue-300"><span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"><ClipboardList className="h-3 w-3" /></span>Details</h3>
                    <div className="space-y-2">
                      <div><label className={labelCls}>Auditor</label><select value={fAuditor} onChange={(e) => setFAuditor(e.target.value)} aria-label="Auditor" className={SEL_INPUT}><option value="">Select...</option>{userProfiles.map((u: any) => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div>
                      <div><label className={labelCls}>Date</label><input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} aria-label="Audit date" className={SEL_INPUT} /></div>
                      <div><label className={labelCls}>Notes</label><textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} className={`${SEL_INPUT} resize-none h-16`} placeholder="Optional notes..." /></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"><MapPin className="h-3 w-3" /></span>Audit Info</h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{headerTpl?.name ?? "-"} v{headerTpl?.version ?? ""}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Plant</span><span className="text-foreground font-medium">{plants.find((p: any) => p.id === fPlant)?.name || fPlant || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Line</span><span className="text-foreground font-medium">{lines.find((l: any) => l.id === fLine)?.name || fLine || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Dept</span><span className="text-foreground font-medium">{depts.find((d: any) => d.id === fDept)?.name || fDept || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Res Group</span><span className="text-foreground font-medium">{rgs.find((g: any) => g.id === fRg)?.name || fRg || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Resource</span><span className="text-foreground font-medium">{ress.find((r: any) => r.id === fRes)?.name || fRes || "-"}</span></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-blue-700 dark:text-blue-300"><span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"><ClipboardList className="h-3 w-3" /></span>Details</h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Auditor</span><span className="text-foreground font-medium">{fAuditor || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="text-foreground font-medium">{fDate || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Notes</span><span className="text-foreground font-medium truncate max-w-[200px]">{fNotes || "-"}</span></div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right column - 65% - Existing checklist + Tabs */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Tabs */}
              <div className="shrink-0 flex border-b border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
                <button onClick={() => setExecTab("form")} className={`px-4 py-1.5 text-[11px] font-semibold border-b-2 transition-colors ${execTab === "form" ? "border-amber-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Form ({ansCount}/{totalQ})</button>
                <button onClick={() => setExecTab("findings")} disabled={isNew} className={`px-4 py-1.5 text-[11px] font-semibold border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${execTab === "findings" ? "border-amber-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Findings ({findings.length})</button>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {execTab === "form" && (
                  <>
                    {isNew && allQ.length === 0 && templates.length === 0 && (
                      <div className="bg-amber-50/80 dark:bg-amber-950/80 backdrop-blur-sm border border-amber-200/50 dark:border-amber-800/50 p-4 text-center text-xs text-amber-700 dark:text-amber-400">
                        <p>No templates.</p><button onClick={hInstall} className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700"><Plus className="h-3 w-3" /> Install Defaults</button>
                      </div>
                    )}
                    {checklistLocked && <div className="bg-amber-50/80 dark:bg-amber-950/80 backdrop-blur-sm border border-amber-200/50 dark:border-amber-800/50 p-4 text-xs text-amber-800 dark:text-amber-300">Select audit type to load checklist.</div>}
                    {answersLocked && <div className="bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 p-3 text-xs text-blue-700 dark:text-blue-300">Save Draft to start answering checklist questions.</div>}
                    {(isNew ? allQ.length > 0 : sections.length > 0) && !checklistLocked && (
                      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30">
                        {isNew ? (() => {
                          const grouped: Record<string, typeof allQ> = {};
                          for (const q of allQ) (grouped[q.catName] ||= []).push(q);
                          return Object.entries(grouped).map(([catName, qs]) => (
                            <div key={catName}>
                              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/20 dark:border-slate-700/20 bg-white/30 dark:bg-slate-900/30">
                                <span className="text-xs font-bold text-foreground">{catName}</span>
                                <span className="bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">{qs.filter((q) => draftAns[q.id]?.v !== "").length}/{qs.length}</span>
                              </div>
                              {qs.map((q, idx) => {
                                const v = getVal(q.id);
                                const fail = isFailed(q.rt, v) || (q.rt === "SCORE_1_5" && v !== "" && Number(v) <= 2);
                                return <div key={q.id} className={`grid grid-cols-[28px_1fr_180px] items-start gap-2 px-4 py-2 text-sm border-b border-white/10 dark:border-slate-700/10 last:border-b-0 ${fail ? "bg-red-50/40 dark:bg-red-950/30" : ""}`}>
                                  <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-50/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-medium mt-0.5">{idx + 1}</div>
                                  <div className="min-w-0"><span className="text-foreground">{q.question}</span>{q.isReq && <span className="ml-1 text-[9px] text-red-500 font-semibold">*</span>}{q.help && <div className="text-[10px] text-muted-foreground/60 italic">{q.help}</div>}</div>
                                  <SegCtl rt={q.rt} val={v} onChange={(nv) => setAns(q.id, nv)} disabled={answersLocked} />
                                </div>;
                              })}
                            </div>
                          ));
                        })() : sections.map((sec: any) => {
                          const secC = sec.questions.filter((q: any) => getVal(q.id) !== "").length;
                          return <div key={sec.id}>
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/20 dark:border-slate-700/20 bg-white/30 dark:bg-slate-900/30">
                              <span className="text-xs font-bold text-foreground">{sec.title}</span>
                              <span className="bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">{secC}/{sec.questions.length}</span>
                            </div>
                            {sec.questions.map((q: any, idx: number) => {
                              const v = getVal(q.id);
                              const fail = isFailed(q.responseType, v) || (q.responseType === "SCORE_1_5" && v !== "" && Number(v) <= 2);
                              return <div key={q.id} className={`grid grid-cols-[28px_1fr_180px] items-start gap-2 px-4 py-2 text-sm border-b border-white/10 dark:border-slate-700/10 last:border-b-0 ${fail ? "bg-red-50/40 dark:bg-red-950/30" : ""}`}>
                                <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-50/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-medium mt-0.5">{idx + 1}</div>
                                <div className="min-w-0"><span className="text-foreground">{q.questionText}</span>{q.isRequired && <span className="ml-1 text-[9px] text-red-500 font-semibold">*</span>}{q.helpText && <div className="text-[10px] text-muted-foreground/60 italic">{q.helpText}</div>}</div>
                                <SegCtl rt={q.responseType} val={v} onChange={(nv) => setAns(q.id, nv)} />
                              </div>;
                            })}
                          </div>;
                        })}
                      </div>
                    )}
                  </>
                )}
                {execTab === "findings" && !isNew && (
                  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30"><FindingsTable findings={findings} onClose={setCloseFindingId} /></div>
                )}
              </div>

              {/* Finding dialog */}
              {findingForAnswer && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 border border-white/30 dark:border-slate-700/30 w-[400px] p-4 shadow-xl space-y-3">
                    <p className="text-xs font-semibold text-foreground">Create Finding for: {findingForAnswer.questionText}</p>
                    <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Description *</label><input type="text" value={findingDesc} onChange={(e) => setFindingDesc(e.target.value)} className={SEL_INPUT} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Severity</label><select value={findingSev} onChange={(e) => setFindingSev(e.target.value)} aria-label="Finding severity" className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>                      <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Due Date</label><input type="date" value={findingDd} onChange={(e) => setFindingDd(e.target.value)} className={SEL_INPUT} aria-label="Finding due date" /></div>
                      
                    </div>
                    <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Owner</label><input type="text" value={findingOwner} onChange={(e) => setFindingOwner(e.target.value)} className={SEL_INPUT} /></div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={hFinding} disabled={!findingDesc.trim()} className="inline-flex h-7 items-center gap-1 px-3 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40">Create</button>
                      <button onClick={() => setFindingForAnswer(null)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Render: List ──
  const renderList = (selId: number | null, onSelect: (id: number | null) => void) => (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
        <span className="text-sm font-medium text-muted-foreground">Audits</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{audits.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {audits.length === 0 ? <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">No audits found</div>
        : <div>{audits.map((a: any) => (
          <div key={a.id} onClick={() => { onSelect(Number(a.id)); setCreating(false); setCreated(true); setExecId(Number(a.id)); setTplId(null); setErrors([]); }}
            className={`group mx-1 my-0.5 flex min-h-[52px] cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${selId === Number(a.id) ? "bg-table-selected border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
            <div className="min-w-0 flex-1">
              <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">{a.title || `Audit #${a.id}`}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[a.status] || ""}`}>{statusLabel(a.status || "DRAFT")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <span>{a.auditType || "-"}</span><span>·</span><span>{a.targetType || "-"}</span>
                {a.auditor && <><span>·</span><span>{a.auditor}</span></>}
                {a.auditDate && <><span>·</span><span>{a.auditDate}</span></>}
                {a.score !== null && a.score !== undefined && <><span>·</span><span className="font-mono">{a.score}%</span></>}
              </div>
            </div>
          </div>
        ))}</div>}
      </div>
    </div>
  );

  // ── Render: Detail ──
  const renderDetail = (id: number | null) => {
    if (creating) return renderForm();
    if (!id) return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center max-w-xs">
          <h3 className="text-sm font-semibold text-foreground mb-1.5">Production Audits</h3>
          <p className="text-xs text-muted-foreground/70">Template-based production control audits.</p>
          <button onClick={hNew} className="mt-4 inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"><Plus className="h-3.5 w-3.5" /> New Audit</button>
        </div>
      </div>
    );
    if (execId && !execForm) return <div className="flex flex-1 items-center justify-center h-full"><div className="text-xs text-muted-foreground animate-pulse">Loading audit form...</div></div>;
    return renderForm();
  };

  return {
    items: audits,
    renderList,
    renderDetail,
    creating,
    created,
    execId,
    setExecId,
    execForm,
    templates,
    tplId,
    setTplId: (v: string | null) => { setTplId(v); setDraftAns({}); setErrors([]); },
    hNew,
    hCreate: hSaveDraft,
    hComplete,
    hArchive,
    hDelete,
    hInstall,
    hRefresh,
    archiveConfirmId,
    setArchiveConfirmId,
    deleteConfirmId,
    setDeleteConfirmId,
    cancelConfirmId,
    setCancelConfirmId,
    hCancelAudit,
    hCreateFindings,
    hCancelNew: () => { setCreating(false); setCreated(false); setExecId(null); setEditing(false); },
    saving,
    canSave: !!tplId && fPlant !== "" && fAuditor.trim() !== "" && fDate !== "" && !!resolveTarget(),
    canComplete: !!canComplete,
    editing,
    hStartEdit,
    hCancelEdit,
    hSaveEdit,
    fPlant,
    fLine,
    fDept,
    fRg,
    fRes,
    fAuditor,
    fDate,
    fNotes,
    resolveTarget,
    plants,
    lines,
    depts,
    rgs,
    ress,
  };
}
