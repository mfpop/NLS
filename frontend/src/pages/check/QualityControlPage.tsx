import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ShieldCheck, Plus, RefreshCw, Circle, CheckCircle, XCircle, Minus,
  RotateCcw, FileText, Ban,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import {
  QUALITY_CHECKS_QUERY,
  DMRS_QUERY, DMR_QUERY,
  RMAS_QUERY, RMA_QUERY,
} from "@/graphql/checkQueries";
import {
  CREATE_QUALITY_CHECK_MUTATION,
  UPDATE_QUALITY_CHECK_MUTATION,
  ADD_QUALITY_CHECKLIST_ITEM_MUTATION,
  UPDATE_QUALITY_CHECKLIST_ITEM_MUTATION,
  COMPLETE_QUALITY_CHECK_MUTATION,
  CREATE_DMR_MUTATION,
  UPDATE_DMR_MUTATION,
  REVIEW_DMR_MUTATION,
  DISPOSITION_DMR_MUTATION, CLOSE_DMR_MUTATION, CANCEL_DMR_MUTATION,
  CREATE_RMA_MUTATION,
  UPDATE_RMA_MUTATION,
  REVIEW_RMA_MUTATION,
  RECEIVE_RMA_MUTATION, DISPOSITION_RMA_MUTATION, CLOSE_RMA_MUTATION, CANCEL_RMA_MUTATION,
} from "@/graphql/checkMutations";

type Tab = "checks" | "dmr" | "rma";

const QUALITY_CHECK_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "QUALITY_AUDIT", label: "Quality Audit" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "DEFECT_CHECK", label: "Defect Check" },
  { value: "NONCONFORMANCE_CHECK", label: "Nonconformance Check" },
];

const CHECK_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border/40",
  COMPLETED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
};

const DMR_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  UNDER_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  DISPOSITIONED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  CLOSED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const RMA_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  RECEIVED: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  UNDER_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  DISPOSITIONED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  CLOSED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const DISPOSITION_OPTIONS = [
  { value: "USE_AS_IS", label: "Use As Is" },
  { value: "REWORK", label: "Rework" },
  { value: "SCRAP", label: "Scrap" },
  { value: "RETURN_TO_VENDOR", label: "Return to Vendor" },
  { value: "HOLD", label: "Hold" },
];

const CHECKLIST_RESULT_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "PASS", label: "Pass" },
  { value: "FAIL", label: "Fail" },
  { value: "N_A", label: "N/A" },
];

interface QCItemNode { id: number; qualityCheckId: number; question: string; result: string | null; comment: string; createdAt: string; updatedAt: string; }
interface QualityCheckNode { id: number; checkType: string; targetType: string; targetId: number | null; title: string; checkedBy: string; checkDate: string | null; status: string; score: number | null; notes: string; checklistItems: QCItemNode[]; createdAt: string; updatedAt: string; }
interface DMRNode { id: number; dmrNumber: string; title: string; description: string; materialItemId: number | null; productVariantId: number | null; targetType: string; targetId: number | null; quantity: number | null; uom: string; defectDescription: string; disposition: string | null; status: string; owner: string; closedAt: string | null; notes: string; createdAt: string; updatedAt: string; }
interface RMANode { id: number; rmaNumber: string; customerName: string; productVariantId: number | null; materialItemId: number | null; quantity: number | null; reason: string; status: string; receivedDate: string | null; disposition: string | null; owner: string; notes: string; createdAt: string; updatedAt: string; }

function statusLabel(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

function resultIcon(result: string | null) {
  switch (result) {
    case "PASS": return <CheckCircle className="h-3.5 w-3.5 text-green-500 stroke-current" />;
    case "FAIL": return <XCircle className="h-3.5 w-3.5 text-red-500 stroke-current" />;
    case "N_A": return <Minus className="h-3.5 w-3.5 text-muted-foreground stroke-current" />;
    default: return <Circle className="h-3.5 w-3.5 text-muted-foreground/40 stroke-current" />;
  }
}

export function QualityControlPage() {
  const [tab, setTab] = useState<Tab>("checks");
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  useEffect(() => { if (successMsg) { const t = setTimeout(() => setSuccessMsg(null), 5000); return () => clearTimeout(t); } }, [successMsg]);

  // ── Quality Checks ──
  const [checkFilterType, setCheckFilterType] = useState("");
  const [selectedCheckId, setSelectedCheckId] = useState<number | null>(null);
  const [showNewCheck, setShowNewCheck] = useState(false);
  const [newCheckTitle, setNewCheckTitle] = useState("");
  const [newCheckType, setNewCheckType] = useState("QUALITY_AUDIT");
  const [newCheckTargetType, setNewCheckTargetType] = useState("PLANT");
  const [newCheckTargetId, setNewCheckTargetId] = useState("");
  const [newCheckCheckedBy, setNewCheckCheckedBy] = useState("");
  const [newCheckDate, setNewCheckDate] = useState("");
  const [newCheckNotes, setNewCheckNotes] = useState("");
  const [newItemQuestion, setNewItemQuestion] = useState("");
  const [newItemComment, setNewItemComment] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);

  const checksQ = useQuery<{ qualityChecks: QualityCheckNode[] }>(QUALITY_CHECKS_QUERY, {
    variables: { checkType: checkFilterType || undefined, search: search || undefined },
    fetchPolicy: "cache-and-network",
  });
  const checks = checksQ.data?.qualityChecks || [];
  const selCheck = selectedCheckId ? checks.find((c) => c.id === selectedCheckId) ?? null : null;

  const [createQC] = useMutation(CREATE_QUALITY_CHECK_MUTATION);
  const [addQCItem] = useMutation(ADD_QUALITY_CHECKLIST_ITEM_MUTATION);
  const [updateQCItem] = useMutation(UPDATE_QUALITY_CHECKLIST_ITEM_MUTATION);
  const [completeQC] = useMutation(COMPLETE_QUALITY_CHECK_MUTATION);

  const hNewCheck = useCallback(() => {
    setShowNewCheck(true); setSelectedCheckId(null); setMutationError(null);
    setNewCheckTitle(""); setNewCheckType("QUALITY_AUDIT"); setNewCheckTargetType("PLANT");
    setNewCheckTargetId(""); setNewCheckCheckedBy(""); setNewCheckDate(""); setNewCheckNotes("");
  }, []);
  const hCreateCheck = useCallback(async () => {
    if (!newCheckTitle.trim() || !newCheckTargetId.trim()) return;
    const r = await createQC({ variables: {
      title: newCheckTitle.trim(), checkType: newCheckType, targetType: newCheckTargetType,
      targetId: parseInt(newCheckTargetId), checkedBy: newCheckCheckedBy || null,
      checkDate: newCheckDate || null, notes: newCheckNotes,
    } });
    if (r.error) { setMutationError(r.error.message); return; }
    setSuccessMsg("Quality check created"); setShowNewCheck(false);
    checksQ.refetch();
  }, [newCheckTitle, newCheckType, newCheckTargetType, newCheckTargetId, newCheckCheckedBy, newCheckDate, newCheckNotes, createQC, checksQ]);
  const hAddQCItem = useCallback(async () => {
    if (!selectedCheckId || !newItemQuestion.trim()) return;
    await addQCItem({ variables: { checkId: selectedCheckId, question: newItemQuestion.trim() } });
    setNewItemQuestion(""); setNewItemComment(""); checksQ.refetch();
  }, [selectedCheckId, newItemQuestion, newItemComment, addQCItem, checksQ]);
  const hUpdateQCResult = useCallback(async (itemId: number, result: string) => {
    await updateQCItem({ variables: { id: itemId, result: result || null, comment: "" } });
    checksQ.refetch();
  }, [updateQCItem, checksQ]);
  const hCompleteQC = useCallback(async () => {
    if (!selectedCheckId) return;
    await completeQC({ variables: { id: selectedCheckId } });
    setSuccessMsg("Quality check completed"); checksQ.refetch();
  }, [selectedCheckId, completeQC, checksQ]);

  // ── DMR ──
  const [dmrSearch, setDmrSearch] = useState("");
  const [selectedDmrId, setSelectedDmrId] = useState<number | null>(null);
  const [showNewDmr, setShowNewDmr] = useState(false);
  const [newDmrNumber, setNewDmrNumber] = useState("");
  const [newDmrTitle, setNewDmrTitle] = useState("");
  const [newDmrDesc, setNewDmrDesc] = useState("");
  const [newDmrTargetType, setNewDmrTargetType] = useState("PLANT");
  const [newDmrTargetId, setNewDmrTargetId] = useState("");
  const [newDmrDefectDesc, setNewDmrDefectDesc] = useState("");
  const [newDmrQty, setNewDmrQty] = useState("");
  const [newDmrUom, setNewDmrUom] = useState("");
  const [newDmrOwner, setNewDmrOwner] = useState("");
  const [newDmrNotes, setNewDmrNotes] = useState("");
  const [dmrDisposition, setDmrDisposition] = useState("USE_AS_IS");

  const dmrsQ = useQuery<{ dmrs: DMRNode[] }>(DMRS_QUERY, {
    variables: { search: dmrSearch || undefined }, fetchPolicy: "cache-and-network",
  });
  const dmrs = dmrsQ.data?.dmrs || [];

  const { data: dmrDetail } = useQuery<{ dmr: DMRNode }>(DMR_QUERY, {
    variables: { id: selectedDmrId! }, skip: !selectedDmrId || showNewDmr, fetchPolicy: "cache-and-network",
  });
  const selDmr = dmrDetail?.dmr || (selectedDmrId ? dmrs.find((d) => d.id === selectedDmrId) ?? null : null);

  const [createDMR] = useMutation(CREATE_DMR_MUTATION);
  const [dispositionDMR] = useMutation(DISPOSITION_DMR_MUTATION);
  const [closeDMR] = useMutation(CLOSE_DMR_MUTATION);
  const [cancelDMR] = useMutation(CANCEL_DMR_MUTATION);

  const hNewDmr = useCallback(() => {
    setShowNewDmr(true); setSelectedDmrId(null);
    setNewDmrNumber(""); setNewDmrTitle(""); setNewDmrDesc(""); setNewDmrTargetType("PLANT");
    setNewDmrTargetId(""); setNewDmrDefectDesc(""); setNewDmrQty(""); setNewDmrUom(""); setNewDmrOwner(""); setNewDmrNotes("");
  }, []);
  const hCreateDmr = useCallback(async () => {
    if (!newDmrNumber.trim() || !newDmrTitle.trim() || !newDmrTargetId.trim()) return;
    await createDMR({ variables: {
      dmrNumber: newDmrNumber.trim(), title: newDmrTitle.trim(), targetType: newDmrTargetType,
      targetId: parseInt(newDmrTargetId), description: newDmrDesc, defectDescription: newDmrDefectDesc,
      quantity: newDmrQty ? parseFloat(newDmrQty) : null, uom: newDmrUom, owner: newDmrOwner, notes: newDmrNotes,
    } });
    setSuccessMsg("DMR created"); setShowNewDmr(false); dmrsQ.refetch();
  }, [newDmrNumber, newDmrTitle, newDmrDesc, newDmrTargetType, newDmrTargetId, newDmrDefectDesc, newDmrQty, newDmrUom, newDmrOwner, newDmrNotes, createDMR, dmrsQ]);
  const hDispositionDmr = useCallback(async () => {
    if (!selectedDmrId) return;
    await dispositionDMR({ variables: { id: selectedDmrId, disposition: dmrDisposition } });
    setSuccessMsg("DMR dispositioned"); dmrsQ.refetch();
  }, [selectedDmrId, dmrDisposition, dispositionDMR, dmrsQ]);
  const hCloseDmr = useCallback(async () => {
    if (!selectedDmrId) return;
    await closeDMR({ variables: { id: selectedDmrId } });
    setSuccessMsg("DMR closed"); dmrsQ.refetch();
  }, [selectedDmrId, closeDMR, dmrsQ]);
  const hCancelDmr = useCallback(async () => {
    if (!selectedDmrId) return;
    await cancelDMR({ variables: { id: selectedDmrId } });
    setSuccessMsg("DMR cancelled"); dmrsQ.refetch();
  }, [selectedDmrId, cancelDMR, dmrsQ]);

  // ── RMA ──
  const [rmaSearch, setRmaSearch] = useState("");
  const [selectedRmaId, setSelectedRmaId] = useState<number | null>(null);
  const [showNewRma, setShowNewRma] = useState(false);
  const [newRmaNumber, setNewRmaNumber] = useState("");
  const [newRmaCustomer, setNewRmaCustomer] = useState("");
  const [newRmaQty, setNewRmaQty] = useState("");
  const [newRmaReason, setNewRmaReason] = useState("");
  const [newRmaOwner, setNewRmaOwner] = useState("");
  const [newRmaNotes, setNewRmaNotes] = useState("");
  const [rmaDisposition, setRmaDisposition] = useState("USE_AS_IS");

  const rmasQ = useQuery<{ rmas: RMANode[] }>(RMAS_QUERY, {
    variables: { search: rmaSearch || undefined }, fetchPolicy: "cache-and-network",
  });
  const rmas = rmasQ.data?.rmas || [];

  const { data: rmaDetail } = useQuery<{ rma: RMANode }>(RMA_QUERY, {
    variables: { id: selectedRmaId! }, skip: !selectedRmaId || showNewRma, fetchPolicy: "cache-and-network",
  });
  const selRma = rmaDetail?.rma || (selectedRmaId ? rmas.find((r) => r.id === selectedRmaId) ?? null : null);

  const [createRMA] = useMutation(CREATE_RMA_MUTATION);
  const [receiveRMA] = useMutation(RECEIVE_RMA_MUTATION);
  const [dispositionRMA] = useMutation(DISPOSITION_RMA_MUTATION);
  const [closeRMA] = useMutation(CLOSE_RMA_MUTATION);
  const [cancelRMA] = useMutation(CANCEL_RMA_MUTATION);

  const hNewRma = useCallback(() => {
    setShowNewRma(true); setSelectedRmaId(null);
    setNewRmaNumber(""); setNewRmaCustomer(""); setNewRmaQty(""); setNewRmaReason(""); setNewRmaOwner(""); setNewRmaNotes("");
  }, []);
  const hCreateRma = useCallback(async () => {
    if (!newRmaNumber.trim() || !newRmaCustomer.trim()) return;
    await createRMA({ variables: {
      rmaNumber: newRmaNumber.trim(), customerName: newRmaCustomer.trim(),
      quantity: newRmaQty ? parseFloat(newRmaQty) : null, reason: newRmaReason,
      owner: newRmaOwner, notes: newRmaNotes,
    } });
    setSuccessMsg("RMA created"); setShowNewRma(false); rmasQ.refetch();
  }, [newRmaNumber, newRmaCustomer, newRmaQty, newRmaReason, newRmaOwner, newRmaNotes, createRMA, rmasQ]);
  const hReceiveRma = useCallback(async () => {
    if (!selectedRmaId) return;
    await receiveRMA({ variables: { id: selectedRmaId } });
    setSuccessMsg("RMA received"); rmasQ.refetch();
  }, [selectedRmaId, receiveRMA, rmasQ]);
  const hDispositionRma = useCallback(async () => {
    if (!selectedRmaId) return;
    await dispositionRMA({ variables: { id: selectedRmaId, disposition: rmaDisposition } });
    setSuccessMsg("RMA dispositioned"); rmasQ.refetch();
  }, [selectedRmaId, rmaDisposition, dispositionRMA, rmasQ]);
  const hCloseRma = useCallback(async () => {
    if (!selectedRmaId) return;
    await closeRMA({ variables: { id: selectedRmaId } });
    setSuccessMsg("RMA closed"); rmasQ.refetch();
  }, [selectedRmaId, closeRMA, rmasQ]);
  const hCancelRma = useCallback(async () => {
    if (!selectedRmaId) return;
    await cancelRMA({ variables: { id: selectedRmaId } });
    setSuccessMsg("RMA cancelled"); rmasQ.refetch();
  }, [selectedRmaId, cancelRMA, rmasQ]);

  const iCls = "h-8 w-full rounded border border-border/50 bg-card px-2.5 text-sm text-foreground outline-none transition-all focus:border-info/60 placeholder:text-muted-foreground/40";
  const sCls = "h-8 w-full rounded border border-border/50 bg-card px-2 text-sm text-foreground outline-none transition-all focus:border-info/60";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const tabs = (
    <div className="flex shrink-0 items-center border-b border-border/30 bg-muted/20 px-4 h-9 gap-0">
      {(["checks", "dmr", "rma"] as Tab[]).map((t) => (
        <button key={t} onClick={() => { setTab(t); setSearch(""); setDmrSearch(""); setRmaSearch(""); setShowNewCheck(false); setShowNewDmr(false); setShowNewRma(false); }}
          className={`px-3 h-full text-xs font-semibold border-b-2 transition-colors ${tab === t ? "border-amber-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          {t === "checks" ? "Quality Checks" : t === "dmr" ? "DMRs" : "RMAs"}
        </button>
      ))}
    </div>
  );

  const renderChecksTab = () => (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col min-h-0 bg-card/40 border-r border-border/20" style={{ flexBasis: "30%", minWidth: 200 }}>
        <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
          <span className={`text-sm font-medium ${theme.textMuted}`}>Quality Checks</span>
          <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{checks.length}</span>
        </div>
        <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
          {checksQ.loading && checks.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-muted-foreground"><span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
          ) : checks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <p className="text-xs font-medium text-muted-foreground">No checks</p>
              <button type="button" onClick={hNewCheck} className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600/10 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-600/20 dark:text-amber-400 transition-colors"><Plus className="h-3 w-3 stroke-current" /> New</button>
            </div>
          ) : (
            <div>{checks.map((c) => (
              <div key={c.id} onClick={() => { setSelectedCheckId(c.id); setShowNewCheck(false); }}
                className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${selectedCheckId === c.id ? "bg-table-selected border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
                <div className="min-w-0 flex-1">
                  <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                    <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{c.title}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${CHECK_STATUS_STYLES[c.status] || ""}`}>{statusLabel(c.status)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{c.checkType}</span>
                    <span className="text-[10px] text-muted-foreground">{"\u00B7"}</span>
                    <span className="text-xs text-muted-foreground">{c.targetType}</span>
                    {c.score !== null && <><span className="text-[10px] text-muted-foreground">{"\u00B7"}</span><span className="text-xs font-mono text-muted-foreground">{c.score}%</span></>}
                  </div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
        <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4">
          <span className={`text-xs ${theme.textMuted}`}>{checks.length} check{checks.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="flex flex-col min-h-0 min-w-0 flex-1 overflow-hidden">
        {showNewCheck ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">New Quality Check</h3>
            {mutationError && <p className={`text-xs font-medium ${theme.textCritical} mb-3`}>{mutationError}</p>}
            <div className="space-y-3.5 max-w-lg">
              <div><label className={labelCls}>Title *</label><input type="text" value={newCheckTitle} onChange={(e) => setNewCheckTitle(e.target.value)} className={iCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Check Type</label><select value={newCheckType} onChange={(e) => setNewCheckType(e.target.value)} className={sCls}>{QUALITY_CHECK_TYPE_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                <div><label className={labelCls}>Target Type</label><select value={newCheckTargetType} onChange={(e) => setNewCheckTargetType(e.target.value)} className={sCls}><option value="PLANT">Plant</option><option value="PRODUCTION_LINE">Production Line</option><option value="DEPARTMENT">Department</option><option value="RESOURCE_GROUP">Resource Group</option><option value="RESOURCE">Resource</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Target ID *</label><input type="number" value={newCheckTargetId} onChange={(e) => setNewCheckTargetId(e.target.value)} className={iCls} /></div>
                <div><label className={labelCls}>Check Date</label><input type="date" value={newCheckDate} onChange={(e) => setNewCheckDate(e.target.value)} className={iCls} /></div>
              </div>
              <div><label className={labelCls}>Checked By</label><input type="text" value={newCheckCheckedBy} onChange={(e) => setNewCheckCheckedBy(e.target.value)} className={iCls} /></div>
              <div><label className={labelCls}>Notes</label><textarea value={newCheckNotes} onChange={(e) => setNewCheckNotes(e.target.value)} rows={3} className={`${iCls} resize-none`} /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={hCreateCheck} disabled={!newCheckTitle.trim() || !newCheckTargetId.trim()} className="inline-flex h-7 items-center gap-1 bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-40"><Plus className="h-3 w-3" />Create</button>
                <button onClick={() => setShowNewCheck(false)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        ) : !selCheck ? (
          <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
            <div className="text-center max-w-xs">
              <h3 className="text-sm font-semibold text-foreground mb-1.5">No check selected</h3>
              <p className="text-xs text-muted-foreground/70 leading-relaxed mb-4">Select a quality check or create a new one.</p>
              <button onClick={hNewCheck} className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"><Plus className="h-3.5 w-3.5" /> New Check</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground">{selCheck.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{selCheck.checkType}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground">{selCheck.targetType}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${CHECK_STATUS_STYLES[selCheck.status] || ""}`}>{statusLabel(selCheck.status)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {selCheck.score !== null && <><span className="text-xs text-muted-foreground">Score</span><span className="text-lg font-bold font-mono text-foreground">{selCheck.score}%</span></>}
                {selCheck.status === "DRAFT" && <button onClick={hCompleteQC} className="inline-flex h-7 items-center gap-1 border border-green-200 px-2 text-[10px] font-semibold text-green-700 hover:bg-green-50 transition-all"><CheckCircle className="h-2.5 w-2.5" />Complete</button>}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Details</h3>
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 text-sm">
                <span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{selCheck.checkType}</span>
                <span className="text-muted-foreground">Target</span><span className="text-foreground font-medium">{selCheck.targetType} #{selCheck.targetId}</span>
                <span className="text-muted-foreground">Checked By</span><span className="text-foreground font-medium">{selCheck.checkedBy || "-"}</span>
                <span className="text-muted-foreground">Date</span><span className="text-foreground font-medium">{selCheck.checkDate || "-"}</span>
                <span className="text-muted-foreground">Score</span><span className="text-foreground font-mono">{selCheck.score !== null ? `${selCheck.score}%` : "N/A"}</span>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Checklist</h3>
              {(selCheck.checklistItems || []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No items yet.</p>
              ) : (
                <div className="space-y-1">{selCheck.checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 border border-border/30 bg-card/50 px-3 py-2">
                    <div className="shrink-0">{resultIcon(item.result)}</div>
                    <span className="flex-1 text-xs text-foreground">{item.question}</span>
                    <select value={item.result || ""} onChange={(e) => hUpdateQCResult(item.id, e.target.value)}
                      className="h-6 w-20 text-xs rounded border border-border/30 bg-card px-1 text-foreground outline-none">
                      {CHECKLIST_RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {item.comment && <span className="text-xs text-muted-foreground max-w-[120px] truncate">{item.comment}</span>}
                  </div>
                ))}</div>
              )}
              {selCheck.status === "DRAFT" && (
                <div className="mt-2 flex items-center gap-2">
                  <input type="text" value={newItemQuestion} onChange={(e) => setNewItemQuestion(e.target.value)} placeholder="Add item..." className="flex-1 h-7 text-xs rounded border border-border/40 bg-card px-2 text-foreground outline-none" />
                  <input type="text" value={newItemComment} onChange={(e) => setNewItemComment(e.target.value)} placeholder="Comment..." className="w-28 h-7 text-xs rounded border border-border/40 bg-card px-2 text-foreground outline-none" />
                  <button onClick={hAddQCItem} disabled={!newItemQuestion.trim()} className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-accent/10 disabled:opacity-40"><Plus className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDmrTab = () => (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col min-h-0 bg-card/40 border-r border-border/20" style={{ flexBasis: "30%", minWidth: 200 }}>
        <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
          <span className={`text-sm font-medium ${theme.textMuted}`}>DMRs</span>
          <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{dmrs.length}</span>
        </div>
        <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
          {dmrsQ.loading && dmrs.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-muted-foreground"><span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
          ) : dmrs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <p className="text-xs font-medium text-muted-foreground">No DMRs</p>
              <button onClick={hNewDmr} className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600/10 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-600/20 transition-colors"><Plus className="h-3 w-3" /> New</button>
            </div>
          ) : (
            <div>{dmrs.map((d) => (
              <div key={d.id} onClick={() => { setSelectedDmrId(d.id); setShowNewDmr(false); }}
                className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${selectedDmrId === d.id ? "bg-table-selected border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
                <div className="min-w-0 flex-1">
                  <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                    <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{d.dmrNumber} - {d.title}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${DMR_STATUS_STYLES[d.status] || ""}`}>{statusLabel(d.status)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{d.targetType}</span>
                    {d.owner && <><span className="text-[10px] text-muted-foreground">{"\u00B7"}</span><span className="text-xs text-muted-foreground">{d.owner}</span></>}
                  </div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
        <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4">
          <span className={`text-xs ${theme.textMuted}`}>{dmrs.length} DMR{dmrs.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="flex flex-col min-h-0 min-w-0 flex-1 overflow-hidden">
        {showNewDmr ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">New DMR</h3>
            <div className="space-y-3.5 max-w-lg">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>DMR Number *</label><input type="text" value={newDmrNumber} onChange={(e) => setNewDmrNumber(e.target.value)} className={iCls} /></div>
                <div><label className={labelCls}>Title *</label><input type="text" value={newDmrTitle} onChange={(e) => setNewDmrTitle(e.target.value)} className={iCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Target Type</label><select value={newDmrTargetType} onChange={(e) => setNewDmrTargetType(e.target.value)} className={sCls}><option value="PLANT">Plant</option><option value="PRODUCTION_LINE">Production Line</option><option value="DEPARTMENT">Department</option><option value="RESOURCE_GROUP">Resource Group</option><option value="RESOURCE">Resource</option></select></div>
                <div><label className={labelCls}>Target ID *</label><input type="number" value={newDmrTargetId} onChange={(e) => setNewDmrTargetId(e.target.value)} className={iCls} /></div>
              </div>
              <div><label className={labelCls}>Description</label><textarea value={newDmrDesc} onChange={(e) => setNewDmrDesc(e.target.value)} rows={2} className={`${iCls} resize-none`} /></div>
              <div><label className={labelCls}>Defect Description</label><textarea value={newDmrDefectDesc} onChange={(e) => setNewDmrDefectDesc(e.target.value)} rows={2} className={`${iCls} resize-none`} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Quantity</label><input type="number" value={newDmrQty} onChange={(e) => setNewDmrQty(e.target.value)} className={iCls} /></div>
                <div><label className={labelCls}>UOM</label><input type="text" value={newDmrUom} onChange={(e) => setNewDmrUom(e.target.value)} className={iCls} /></div>
              </div>
              <div><label className={labelCls}>Owner</label><input type="text" value={newDmrOwner} onChange={(e) => setNewDmrOwner(e.target.value)} className={iCls} /></div>
              <div><label className={labelCls}>Notes</label><textarea value={newDmrNotes} onChange={(e) => setNewDmrNotes(e.target.value)} rows={2} className={`${iCls} resize-none`} /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={hCreateDmr} disabled={!newDmrNumber.trim() || !newDmrTitle.trim() || !newDmrTargetId.trim()} className="inline-flex h-7 items-center gap-1 bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40"><Plus className="h-3 w-3" />Create</button>
                <button onClick={() => setShowNewDmr(false)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        ) : !selDmr ? (
          <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
            <div className="text-center max-w-xs">
              <h3 className="text-sm font-semibold text-foreground mb-1.5">No DMR selected</h3>
              <p className="text-xs text-muted-foreground/70 leading-relaxed mb-4">Select a DMR or create a new one.</p>
              <button onClick={hNewDmr} className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"><Plus className="h-3.5 w-3.5" /> New DMR</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground">{selDmr.dmrNumber} - {selDmr.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{selDmr.targetType}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${DMR_STATUS_STYLES[selDmr.status] || ""}`}>{statusLabel(selDmr.status)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 flex-wrap">
                {selDmr.status === "OPEN" && (
                  <button onClick={hCloseDmr} className="inline-flex h-7 items-center gap-1 border border-green-200 px-2 text-[10px] font-semibold text-green-700 hover:bg-green-50 transition-all"><CheckCircle className="h-2.5 w-2.5" />Close</button>
                )}
                {selDmr.status !== "CLOSED" && selDmr.status !== "CANCELLED" && (
                  <>
                    <select value={dmrDisposition} onChange={(e) => setDmrDisposition(e.target.value)}
                      className="h-7 text-xs rounded border border-border/40 bg-card px-1 text-foreground outline-none">
                      {DISPOSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={hDispositionDmr} className="inline-flex h-7 items-center gap-1 border border-indigo-200 px-2 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50 transition-all"><FileText className="h-2.5 w-2.5" />Disposition</button>
                  </>
                )}
                {selDmr.status !== "CLOSED" && selDmr.status !== "CANCELLED" && (
                  <button onClick={hCancelDmr} className="inline-flex h-7 items-center gap-1 border border-red-200 px-2 text-[10px] font-semibold text-red-700 hover:bg-red-50 transition-all"><Ban className="h-2.5 w-2.5" />Cancel</button>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Details</h3>
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 text-sm">
                <span className="text-muted-foreground">DMR #</span><span className="text-foreground font-medium">{selDmr.dmrNumber}</span>
                <span className="text-muted-foreground">Status</span><span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold border ${DMR_STATUS_STYLES[selDmr.status] || ""}`}>{statusLabel(selDmr.status)}</span>
                <span className="text-muted-foreground">Target</span><span className="text-foreground font-medium">{selDmr.targetType} #{selDmr.targetId}</span>
                <span className="text-muted-foreground">Owner</span><span className="text-foreground font-medium">{selDmr.owner || "-"}</span>
                <span className="text-muted-foreground">Qty</span><span className="text-foreground font-medium">{selDmr.quantity ?? "-"} {selDmr.uom || ""}</span>
                <span className="text-muted-foreground">Disposition</span><span className="text-foreground font-medium">{selDmr.disposition || "-"}</span>
              </div>
            </div>
            {selDmr.description && <div><h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Description</h3><p className="text-sm text-foreground">{selDmr.description}</p></div>}
            {selDmr.defectDescription && <div><h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Defect Description</h3><p className="text-sm text-muted-foreground">{selDmr.defectDescription}</p></div>}
          </div>
        )}
      </div>
    </div>
  );

  const renderRmaTab = () => (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col min-h-0 bg-card/40 border-r border-border/20" style={{ flexBasis: "30%", minWidth: 200 }}>
        <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
          <span className={`text-sm font-medium ${theme.textMuted}`}>RMAs</span>
          <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{rmas.length}</span>
        </div>
        <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
          {rmasQ.loading && rmas.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-muted-foreground"><span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
          ) : rmas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <p className="text-xs font-medium text-muted-foreground">No RMAs</p>
              <button onClick={hNewRma} className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600/10 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-600/20 transition-colors"><Plus className="h-3 w-3" /> New</button>
            </div>
          ) : (
            <div>{rmas.map((r) => (
              <div key={r.id} onClick={() => { setSelectedRmaId(r.id); setShowNewRma(false); }}
                className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${selectedRmaId === r.id ? "bg-table-selected border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
                <div className="min-w-0 flex-1">
                  <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                    <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{r.rmaNumber} - {r.customerName}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${RMA_STATUS_STYLES[r.status] || ""}`}>{statusLabel(r.status)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.owner && <span className="text-xs text-muted-foreground">{r.owner}</span>}
                    {r.quantity && <><span className="text-[10px] text-muted-foreground">{"\u00B7"}</span><span className="text-xs text-muted-foreground">Qty: {r.quantity}</span></>}
                  </div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
        <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4">
          <span className={`text-xs ${theme.textMuted}`}>{rmas.length} RMA{rmas.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="flex flex-col min-h-0 min-w-0 flex-1 overflow-hidden">
        {showNewRma ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">New RMA</h3>
            <div className="space-y-3.5 max-w-lg">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>RMA Number *</label><input type="text" value={newRmaNumber} onChange={(e) => setNewRmaNumber(e.target.value)} className={iCls} /></div>
                <div><label className={labelCls}>Customer Name *</label><input type="text" value={newRmaCustomer} onChange={(e) => setNewRmaCustomer(e.target.value)} className={iCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Quantity</label><input type="number" value={newRmaQty} onChange={(e) => setNewRmaQty(e.target.value)} className={iCls} /></div>
                <div><label className={labelCls}>Owner</label><input type="text" value={newRmaOwner} onChange={(e) => setNewRmaOwner(e.target.value)} className={iCls} /></div>
              </div>
              <div><label className={labelCls}>Reason</label><textarea value={newRmaReason} onChange={(e) => setNewRmaReason(e.target.value)} rows={3} className={`${iCls} resize-none`} /></div>
              <div><label className={labelCls}>Notes</label><textarea value={newRmaNotes} onChange={(e) => setNewRmaNotes(e.target.value)} rows={2} className={`${iCls} resize-none`} /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={hCreateRma} disabled={!newRmaNumber.trim() || !newRmaCustomer.trim()} className="inline-flex h-7 items-center gap-1 bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40"><Plus className="h-3 w-3" />Create</button>
                <button onClick={() => setShowNewRma(false)} className="inline-flex h-7 items-center border border-border/50 px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        ) : !selRma ? (
          <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
            <div className="text-center max-w-xs">
              <h3 className="text-sm font-semibold text-foreground mb-1.5">No RMA selected</h3>
              <p className="text-xs text-muted-foreground/70 leading-relaxed mb-4">Select an RMA or create a new one.</p>
              <button onClick={hNewRma} className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"><Plus className="h-3.5 w-3.5" /> New RMA</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground">{selRma.rmaNumber} - {selRma.customerName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${RMA_STATUS_STYLES[selRma.status] || ""}`}>{statusLabel(selRma.status)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 flex-wrap">
                {selRma.status === "OPEN" && (
                  <button onClick={hReceiveRma} className="inline-flex h-7 items-center gap-1 border border-teal-200 px-2 text-[10px] font-semibold text-teal-700 hover:bg-teal-50 transition-all"><RotateCcw className="h-2.5 w-2.5" />Receive</button>
                )}
                {(selRma.status === "RECEIVED" || selRma.status === "UNDER_REVIEW") && (
                  <>
                    <select value={rmaDisposition} onChange={(e) => setRmaDisposition(e.target.value)}
                      className="h-7 text-xs rounded border border-border/40 bg-card px-1 text-foreground outline-none">
                      {DISPOSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={hDispositionRma} className="inline-flex h-7 items-center gap-1 border border-indigo-200 px-2 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50 transition-all"><FileText className="h-2.5 w-2.5" />Disposition</button>
                  </>
                )}
                {selRma.status !== "CLOSED" && selRma.status !== "CANCELLED" && (
                  <button onClick={hCloseRma} className="inline-flex h-7 items-center gap-1 border border-green-200 px-2 text-[10px] font-semibold text-green-700 hover:bg-green-50 transition-all"><CheckCircle className="h-2.5 w-2.5" />Close</button>
                )}
                {selRma.status !== "CLOSED" && selRma.status !== "CANCELLED" && (
                  <button onClick={hCancelRma} className="inline-flex h-7 items-center gap-1 border border-red-200 px-2 text-[10px] font-semibold text-red-700 hover:bg-red-50 transition-all"><Ban className="h-2.5 w-2.5" />Cancel</button>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Details</h3>
              <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 text-sm">
                <span className="text-muted-foreground">RMA #</span><span className="text-foreground font-medium">{selRma.rmaNumber}</span>
                <span className="text-muted-foreground">Customer</span><span className="text-foreground font-medium">{selRma.customerName}</span>
                <span className="text-muted-foreground">Status</span><span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold border ${RMA_STATUS_STYLES[selRma.status] || ""}`}>{statusLabel(selRma.status)}</span>
                <span className="text-muted-foreground">Owner</span><span className="text-foreground font-medium">{selRma.owner || "-"}</span>
                <span className="text-muted-foreground">Qty</span><span className="text-foreground font-medium">{selRma.quantity ?? "-"}</span>
                <span className="text-muted-foreground">Received</span><span className="text-foreground font-medium">{selRma.receivedDate || "-"}</span>
                <span className="text-muted-foreground">Disposition</span><span className="text-foreground font-medium">{selRma.disposition || "-"}</span>
              </div>
            </div>
            {selRma.reason && <div><h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Reason</h3><p className="text-sm text-muted-foreground">{selRma.reason}</p></div>}
            {selRma.notes && <div><h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground/70">Notes</h3><p className="text-sm text-muted-foreground">{selRma.notes}</p></div>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {successMsg && <div className="shrink-0 h-8 flex items-center justify-center bg-success/10 text-success text-sm font-semibold border-b border-success/20">{successMsg}</div>}
      <PageHeader icon={<ShieldCheck className="h-5 w-5 stroke-current" />}
        iconClass="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400"
        title="Quality Control" subtitle="Monitor product quality, track defects, and enforce quality standards across production." />
      <div>
        <Toolbar left={tab === "checks" ? <ToolbarSearch value={search} onChange={setSearch} placeholder="Search quality checks..." /> : tab === "dmr" ? <ToolbarSearch value={dmrSearch} onChange={setDmrSearch} placeholder="Search DMRs..." /> : <ToolbarSearch value={rmaSearch} onChange={setRmaSearch} placeholder="Search RMAs..." />}
          right={<div className="flex items-center gap-2 shrink-0">
            {tab === "checks" && <><ToolbarSelect value={checkFilterType} onChange={setCheckFilterType} options={QUALITY_CHECK_TYPE_OPTIONS} className="w-36" /><div className="flex-1" /><ToolbarButton icon={Plus} label="New Check" onClick={hNewCheck} /></>}
            {tab === "dmr" && <><div className="flex-1" /><ToolbarButton icon={Plus} label="New DMR" onClick={hNewDmr} /></>}
            {tab === "rma" && <><div className="flex-1" /><ToolbarButton icon={Plus} label="New RMA" onClick={hNewRma} /></>}
            <span className="h-5 w-px shrink-0 bg-border/25" />
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => { checksQ.refetch(); dmrsQ.refetch(); rmasQ.refetch(); }} />
          </div>} />
      </div>
      {tabs}
      {tab === "checks" && renderChecksTab()}
      {tab === "dmr" && renderDmrTab()}
      {tab === "rma" && renderRmaTab()}
      <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
        <span>Quality Control</span><span className="flex-1" />
      </div>
    </div>
  );
}
