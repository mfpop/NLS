import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { DMRS_QUERY, DMR_QUERY } from "@/graphql/checkQueries";
import { CREATE_DMR_MUTATION, DISPOSITION_DMR_MUTATION, CLOSE_DMR_MUTATION, CANCEL_DMR_MUTATION } from "@/graphql/checkMutations";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY, DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY, RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { DMR_STATUS_STYLES, DMR_DISPOSITION_OPTIONS, DEFECT_CATEGORY_OPTIONS, SEL_INPUT, statusLabel } from "./QualityStatusStyles";

interface DMRNode {
  id: number; dmrNumber: string; title: string; description: string;
  materialItemId: number | null; productVariantId: number | null;
  targetType: string; targetId: number | null;
  quantity: number | null; uom: string;
  defectDescription: string; containment: string;
  severity: string; disposition: string | null;
  status: string; owner: string;
  dueDate: string | null; closedAt: string | null;
  notes: string; createdAt: string; updatedAt: string;
}

const SEVERITY_OPTS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

function selCls(err?: boolean) {
  return `${SEL_INPUT} ${err ? "border-red-400 dark:border-red-600" : ""}`;
}

export function useDmrSection(
  search: string, filterStatus: string,
  activePlantId: string | null, productionLineId: string | null,
  onMessage: (msg: string, tone?: "success" | "error") => void,
) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Cascade state ──
  const [fPlant, setFPlant] = useState("");
  const [fLine, setFLine] = useState("");
  const [fDept, setFDept] = useState("");
  const [fRg, setFRg] = useState("");
  const [fRes, setFRes] = useState("");

  // ── Form state ──
  const [fNumber, setFNumber] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fMaterial, setFMaterial] = useState("");
  const [fPartNumber, setFPartNumber] = useState("");
  const [fLotSerial, setFLotSerial] = useState("");
  const [fSeverity, setFSeverity] = useState("MEDIUM");
  const [fDefectDesc, setFDefectDesc] = useState("");
  const [fDefectCategory, setFDefectCategory] = useState("");
  const [fContainment, setFContainment] = useState("");
  const [fSuspectedCause, setFSuspectedCause] = useState("");
  const [fQty, setFQty] = useState("");
  const [fUom, setFUom] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fDueDate, setFDueDate] = useState("");
  const [fDisposition, setFDisposition] = useState("HOLD");
  const [fDispositionOwner, setFDispositionOwner] = useState("");
  const [fDispositionDate, setFDispositionDate] = useState("");
  const [fNotes, setFNotes] = useState("");

  // ── Queries ──
  const q = useQuery<{ dmrs: DMRNode[] }>(DMRS_QUERY, {
    variables: { search: search || undefined, status: filterStatus || undefined },
    fetchPolicy: "cache-and-network",
  });
  const items = q.data?.dmrs || [];
  const { data: detailData } = useQuery<{ dmr: DMRNode }>(DMR_QUERY, {
    variables: { id: selectedId! },
    skip: !selectedId || creating,
    fetchPolicy: "cache-and-network",
  });
  const sel = detailData?.dmr ?? (selectedId ? items.find((d) => d.id === selectedId) ?? null : null);

  // ── Cascade queries ──
  const { data: plData } = useQuery(PLANTS_QUERY, { fetchPolicy: "cache-first" });
  const plants: any[] = (plData as any)?.plants || [];
  const { data: lData } = useQuery(PRODUCTION_LINES_QUERY, {
    variables: { plantId: fPlant || undefined },
    skip: !fPlant, fetchPolicy: "cache-first",
  });
  const lines: any[] = (lData as any)?.productionLines || [];
  const { data: dData } = useQuery(DEPARTMENTS_QUERY, {
    variables: { productionLineId: fLine || undefined },
    skip: !fLine, fetchPolicy: "cache-first",
  });
  const depts: any[] = (dData as any)?.departments || [];
  const { data: gData } = useQuery(RESOURCE_GROUPS_QUERY, {
    variables: { departmentId: fDept || undefined },
    skip: !fDept, fetchPolicy: "cache-first",
  });
  const rgs: any[] = (gData as any)?.resourceGroups || [];
  const { data: rData } = useQuery(RESOURCES_QUERY, {
    variables: { resourceGroupId: fRg || undefined },
    skip: !fRg, fetchPolicy: "cache-first",
  });
  const ress: any[] = (rData as any)?.resources || [];

  // ── Mutations ──
  const [createMut] = useMutation(CREATE_DMR_MUTATION);
  const [dispMut] = useMutation(DISPOSITION_DMR_MUTATION);
  const [closeMut] = useMutation(CLOSE_DMR_MUTATION);
  const [cancelMut] = useMutation(CANCEL_DMR_MUTATION);

  // ── Validation ──
  const validate = useCallback((): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!fPlant) e.plant = "Plant is required";
    if (!fNumber.trim()) e.number = "DMR Number is required";
    if (!fTitle.trim()) e.title = "Title is required";
    if (!fMaterial.trim()) e.material = "Material / Product is required";
    if (!fPartNumber.trim()) e.partNumber = "Part Number is required";
    if (!fQty || parseFloat(fQty) <= 0) e.qty = "Quantity must be > 0";
    if (!fUom.trim()) e.uom = "UOM is required";
    if (!fSeverity) e.severity = "Severity is required";
    if (!fOwner.trim()) e.owner = "Owner is required";
    if (!fDefectDesc.trim()) e.defectDesc = "Defect Description is required";
    if (!fDisposition) e.disposition = "Disposition is required";
    return e;
  }, [fPlant, fNumber, fTitle, fMaterial, fPartNumber, fQty, fUom, fSeverity, fOwner, fDefectDesc, fDisposition]);

  const canSave = fPlant !== "" && fNumber.trim() !== "" && fTitle.trim() !== ""
    && fMaterial.trim() !== "" && fPartNumber.trim() !== ""
    && fQty !== "" && parseFloat(fQty) > 0 && fUom.trim() !== ""
    && fSeverity !== ""
    && fDefectDesc.trim() !== "" && fOwner.trim() !== ""
    && fDisposition !== "";

  // ── Helpers ──
  const resolveTarget = useCallback(() => {
    if (fRes) return { targetType: "RESOURCE", targetId: parseInt(fRes) };
    if (fRg) return { targetType: "RESOURCE_GROUP", targetId: parseInt(fRg) };
    if (fDept) return { targetType: "DEPARTMENT", targetId: parseInt(fDept) };
    if (fLine) return { targetType: "PRODUCTION_LINE", targetId: parseInt(fLine) };
    if (fPlant) return { targetType: "PLANT", targetId: parseInt(fPlant) };
    return null;
  }, [fRes, fRg, fDept, fLine, fPlant]);

  useEffect(() => {
    if (creating && plants.length > 0) {
      setFPlant(activePlantId || String(plants[0]?.id || ""));
    }
  }, [creating, plants, activePlantId]);

  useEffect(() => {
    if (creating && productionLineId) setFLine(String(productionLineId));
  }, [creating, productionLineId]);

  // ── Actions ──
  const hNew = useCallback(() => {
    setCreating(true);
    setSelectedId(null);
    setErrors({});
    setFPlant(activePlantId || String(plants[0]?.id || ""));
    setFLine(productionLineId || "");
    setFDept(""); setFRg(""); setFRes("");
    setFNumber(""); setFTitle(""); setFMaterial(""); setFPartNumber(""); setFLotSerial("");
    setFDefectDesc(""); setFDefectCategory(""); setFContainment(""); setFSuspectedCause("");
    setFSeverity("MEDIUM"); setFQty(""); setFUom(""); setFOwner("");
    setFDueDate(""); setFDisposition("HOLD"); setFDispositionOwner(""); setFDispositionDate(""); setFNotes("");
  }, [activePlantId, plants, productionLineId]);

  const hCreate = useCallback(async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const target = resolveTarget();
    if (!target) return;
    try {
      const r: any = await createMut({
        variables: {
          dmrNumber: fNumber.trim(),
          title: fTitle.trim(),
          targetType: target.targetType,
          targetId: target.targetId,
          description: fSuspectedCause.trim() || undefined,
          defectDescription: fDefectDesc.trim(),
          containment: fContainment.trim(),
          severity: fSeverity,
          quantity: parseFloat(fQty),
          uom: fUom.trim(),
          owner: fOwner.trim(),
          dueDate: fDueDate || null,
          notes: fNotes.trim(),
        },
      });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Failed to create DMR", "error");
        return;
      }
      if (!r.data) {
        onMessage("Failed to create DMR - unexpected response", "error");
        return;
      }
      onMessage("DMR created");
      setCreating(false);
      q.refetch();
    } catch (e: any) {
      onMessage(e?.message || "Failed to create DMR", "error");
    }
  }, [fNumber, fTitle, fSeverity, fDefectDesc, fContainment, fQty, fUom, fOwner, fDueDate, fNotes, validate, resolveTarget, createMut, q, onMessage]);

  const hDisposition = useCallback(async () => {
    if (!selectedId) return;
    try {
      const r: any = await dispMut({ variables: { id: selectedId, disposition: fDisposition } });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Failed to set disposition", "error");
        return;
      }
      if (!r.data) {
        onMessage("Failed to set disposition - unexpected response", "error");
        return;
      }
      onMessage("DMR dispositioned");
      q.refetch();
    } catch (e: any) {
      onMessage(e?.message || "Failed to set disposition", "error");
    }
  }, [selectedId, fDisposition, dispMut, q, onMessage]);

  const hClose = useCallback(async () => {
    if (!selectedId) return;
    try {
      const r: any = await closeMut({ variables: { id: selectedId } });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Failed to close DMR", "error");
        return;
      }
      if (!r.data) {
        onMessage("Failed to close DMR - unexpected response", "error");
        return;
      }
      onMessage("DMR closed");
      q.refetch();
    } catch (e: any) {
      onMessage(e?.message || "Failed to close DMR", "error");
    }
  }, [selectedId, closeMut, q, onMessage]);

  const hCancel = useCallback(async () => {
    if (!selectedId) return;
    try {
      const r: any = await cancelMut({ variables: { id: selectedId } });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Failed to cancel DMR", "error");
        return;
      }
      if (!r.data) {
        onMessage("Failed to cancel DMR - unexpected response", "error");
        return;
      }
      onMessage("DMR cancelled");
      q.refetch();
    } catch (e: any) {
      onMessage(e?.message || "Failed to cancel DMR", "error");
    }
  }, [selectedId, cancelMut, q, onMessage]);

  // ── Styles ──
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const errTxtCls = "text-[10px] text-red-500 mt-0.5";

  // ── Create Form (25/75 layout) ──
  const renderCreateForm = () => (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
      {/* ── Left 25%: Source Location + Metadata ── */}
      <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Source Location</h3>
        <div>
          <label className={labelCls}>Plant *</label>
          <select value={fPlant} onChange={(e) => { setFPlant(e.target.value); setFLine(""); setFDept(""); setFRg(""); setFRes(""); }} className={selCls(!!errors.plant)}>
            <option value="">Select...</option>
            {plants.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {errors.plant && <p className={errTxtCls}>{errors.plant}</p>}
        </div>
        <div>
          <label className={labelCls}>Production Line</label>
          <select value={fLine} onChange={(e) => { setFLine(e.target.value); setFDept(""); setFRg(""); setFRes(""); }} className={selCls()} disabled={!fPlant}>
            <option value="">{fPlant ? "Optional..." : "Select Plant first"}</option>
            {lines.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Department</label>
          <select value={fDept} onChange={(e) => { setFDept(e.target.value); setFRg(""); setFRes(""); }} className={selCls()} disabled={!fLine}>
            <option value="">{fLine ? "Optional..." : "Select Line first"}</option>
            {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Resource Group</label>
          <select value={fRg} onChange={(e) => { setFRg(e.target.value); setFRes(""); }} className={selCls()} disabled={!fDept}>
            <option value="">{fDept ? "Optional..." : "Select Dept first"}</option>
            {rgs.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Resource</label>
          <select value={fRes} onChange={(e) => setFRes(e.target.value)} className={selCls()} disabled={!fRg}>
            <option value="">{fRg ? "Optional..." : "Select RG first"}</option>
            {ress.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="pt-3 border-t border-white/10 dark:border-slate-700/10 space-y-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Details</h3>
          <div>
            <label className={labelCls}>DMR Number *</label>
            <input type="text" value={fNumber} onChange={(e) => setFNumber(e.target.value)} className={selCls(!!errors.number)} placeholder="DMR-..." />
            {errors.number && <p className={errTxtCls}>{errors.number}</p>}
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <div className="h-8 flex items-center text-sm text-muted-foreground">Open</div>
          </div>
          <div>
            <label className={labelCls}>Severity *</label>
            <select value={fSeverity} onChange={(e) => setFSeverity(e.target.value)} className={selCls(!!errors.severity)}>
              {SEVERITY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {errors.severity && <p className={errTxtCls}>{errors.severity}</p>}
          </div>
          <div>
            <label className={labelCls}>Owner *</label>
            <input type="text" value={fOwner} onChange={(e) => setFOwner(e.target.value)} className={selCls(!!errors.owner)} placeholder="Responsible person..." />
            {errors.owner && <p className={errTxtCls}>{errors.owner}</p>}
          </div>
          <div>
            <label className={labelCls}>Date Opened *</label>
            <div className="h-8 flex items-center text-sm text-muted-foreground">{new Date().toLocaleDateString()}</div>
          </div>
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" value={fDueDate} onChange={(e) => setFDueDate(e.target.value)} className={selCls()} />
          </div>
        </div>
      </div>

      {/* ── Right 75%: Workflow Details ── */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
        <div>
          <label className={labelCls}>Title *</label>
          <input type="text" value={fTitle} onChange={(e) => setFTitle(e.target.value)} className={selCls(!!errors.title)} placeholder="Brief description of non-conformance..." />
          {errors.title && <p className={errTxtCls}>{errors.title}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Material / Product *</label>
            <input type="text" value={fMaterial} onChange={(e) => setFMaterial(e.target.value)} className={selCls(!!errors.material)} placeholder="Material ID..." />
            {errors.material && <p className={errTxtCls}>{errors.material}</p>}
          </div>
          <div>
            <label className={labelCls}>Part Number *</label>
            <input type="text" value={fPartNumber} onChange={(e) => setFPartNumber(e.target.value)} className={selCls(!!errors.partNumber)} placeholder="Part #..." />
            {errors.partNumber && <p className={errTxtCls}>{errors.partNumber}</p>}
          </div>
        </div>

        <div>
          <label className={labelCls}>Lot / Serial</label>
          <input type="text" value={fLotSerial} onChange={(e) => setFLotSerial(e.target.value)} className={selCls()} placeholder="Lot or serial #..." />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Quantity Affected *</label>
            <input type="number" min="0" step="any" value={fQty} onChange={(e) => setFQty(e.target.value)} className={selCls(!!errors.qty)} placeholder="0" />
            {errors.qty && <p className={errTxtCls}>{errors.qty}</p>}
          </div>
          <div>
            <label className={labelCls}>UOM *</label>
            <input type="text" value={fUom} onChange={(e) => setFUom(e.target.value)} className={selCls(!!errors.uom)} placeholder="pcs, kg, m..." />
            {errors.uom && <p className={errTxtCls}>{errors.uom}</p>}
          </div>
          <div>
            <label className={labelCls}>Disposition *</label>
            <select value={fDisposition} onChange={(e) => setFDisposition(e.target.value)} className={selCls(!!errors.disposition)}>
              {DMR_DISPOSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {errors.disposition && <p className={errTxtCls}>{errors.disposition}</p>}
          </div>
        </div>

        <div>
          <label className={labelCls}>Defect Category</label>
          <select value={fDefectCategory} onChange={(e) => setFDefectCategory(e.target.value)} className={selCls()}>
            <option value="">Select...</option>
            {DEFECT_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Defect Description *</label>
          <textarea
            value={fDefectDesc}
            onChange={(e) => setFDefectDesc(e.target.value)}
            rows={3}
            className={`h-20 w-full bg-white/50 dark:bg-slate-800/50 border ${errors.defectDesc ? "border-red-400" : "border-white/30 dark:border-slate-700/30"} px-2 py-1 text-xs outline-none resize-none`}
            placeholder="Describe the defect in detail..."
          />
          {errors.defectDesc && <p className={errTxtCls}>{errors.defectDesc}</p>}
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Immediate Containment</label>
          <textarea
            value={fContainment}
            onChange={(e) => setFContainment(e.target.value)}
            rows={2}
            className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none"
            placeholder="Actions taken to contain the issue..."
          />
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Suspected Cause</label>
          <textarea
            value={fSuspectedCause}
            onChange={(e) => setFSuspectedCause(e.target.value)}
            rows={2}
            className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none"
            placeholder="Suspected root cause..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Disposition Owner</label>
            <input type="text" value={fDispositionOwner} onChange={(e) => setFDispositionOwner(e.target.value)} className={selCls()} placeholder="Owner name..." />
          </div>
          <div>
            <label className={labelCls}>Disposition Date</label>
            <input type="date" value={fDispositionDate} onChange={(e) => setFDispositionDate(e.target.value)} className={selCls()} />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Verification / Closure Notes</label>
          <textarea
            value={fNotes}
            onChange={(e) => setFNotes(e.target.value)}
            rows={2}
            className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none"
            placeholder="Verification and closure details..."
          />
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Notes</label>
          <textarea
            value={fNotes}
            onChange={(e) => setFNotes(e.target.value)}
            rows={2}
            className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none"
            placeholder="Additional notes..."
          />
        </div>
      </div>
    </div>
  );

  // ── Readonly Detail (65/35 layout) ──
  const renderDetail = (id: number | null) => {
    if (creating) return renderCreateForm();
    if (!id) {
      return (
        <div className="flex flex-1 items-center justify-center h-full">
          <div className="text-center max-w-xs">
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Non-Conforming Material Tracking</h3>
            <p className="text-xs text-muted-foreground/70">
              Track, disposition, and resolve non-conforming materials with full root cause and containment documentation.
            </p>
          </div>
        </div>
      );
    }
    if (!sel) {
      return (
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />
          Loading...
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ── Left 65%: Defect, Containment, Disposition, Notes ── */}
        <div className="w-[65%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground font-mono">{sel.dmrNumber}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${DMR_STATUS_STYLES[sel.status] || ""}`}>
                  {statusLabel(sel.status)}
                </span>
              </div>
              <h2 className="text-base font-bold text-foreground truncate">{sel.title}</h2>
            </div>
          </div>

          {/* Defect Description */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Defect Description</h3>
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{sel.defectDescription || "—"}</div>
          </div>

          {/* Immediate Containment */}
          {(sel.containment || sel.description) && (
            <div>
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Immediate Containment</h3>
              <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{sel.containment || sel.description || "—"}</div>
            </div>
          )}

          {/* Disposition */}
          {sel.disposition && (
            <div>
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Disposition</h3>
              <div className="inline-flex items-center px-2 py-0.5 text-xs font-semibold border border-indigo-300 text-indigo-700 bg-indigo-50/80 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/30">
                {sel.disposition ? DMR_DISPOSITION_OPTIONS.find((o) => o.value === sel.disposition)?.label || statusLabel(sel.disposition) : "—"}
              </div>
            </div>
          )}

          {/* Notes */}
          {sel.notes && (
            <div>
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Verification / Closure Notes</h3>
              <div className="text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">{sel.notes}</div>
            </div>
          )}
        </div>

        {/* ── Right 35%: Status, Material Info, Source, Owner, Dates ── */}
        <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4 bg-white/30 dark:bg-slate-900/30">
          {/* Status & Severity */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${DMR_STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Severity</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${
                  sel.severity === "CRITICAL" ? "border-red-300 text-red-700 bg-red-50/80 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30"
                  : sel.severity === "HIGH" ? "border-orange-300 text-orange-700 bg-orange-50/80 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950/30"
                  : sel.severity === "MEDIUM" ? "border-blue-300 text-blue-700 bg-blue-50/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30"
                  : "border-gray-300 text-gray-600 bg-gray-50/80 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30"
                }`}>{statusLabel(sel.severity)}</span>
              </div>
            </div>
          </div>

          {/* Material Info */}
          <div className="border-t border-white/10 dark:border-slate-700/10 pt-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Material</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Qty</span>
                <span className="text-foreground font-medium">{sel.quantity ?? "—"} {sel.uom || ""}</span>
              </div>
              {sel.materialItemId && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Material ID</span>
                  <span className="text-foreground font-mono text-xs">#{sel.materialItemId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Source Location */}
          <div className="border-t border-white/10 dark:border-slate-700/10 pt-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Source</h3>
            <div className="flex items-center gap-1.5 text-sm">
              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border border-border/40 bg-muted/50`}>{sel.targetType}</span>
              <span className="text-foreground font-mono text-xs">#{sel.targetId}</span>
            </div>
          </div>

          {/* Owner & Dates */}
          <div className="border-t border-white/10 dark:border-slate-700/10 pt-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Assignment</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Owner</span>
                <span className="text-foreground font-medium">{sel.owner || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Created</span>
                <span className="text-foreground">{sel.createdAt ? new Date(sel.createdAt).toLocaleDateString() : "—"}</span>
              </div>
              {sel.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Due Date</span>
                  <span className="text-foreground">{new Date(sel.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {sel.closedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Closed</span>
                  <span className="text-foreground">{new Date(sel.closedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── List Rows ──
  const renderList = (selId: number | null, onSelect: (id: number | null) => void) => (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
        <span className="text-sm font-medium text-muted-foreground">DMRs</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {q.loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-xs font-medium text-muted-foreground">No DMRs</p>
            <button onClick={hNew} className="mt-2 inline-flex h-7 items-center gap-1 bg-cyan-600/10 px-3 text-xs font-semibold text-cyan-700 hover:bg-cyan-600/20">
              <Plus className="h-3 w-3" /> New
            </button>
          </div>
        ) : (
          <div>
            {items.map((d) => (
              <div
                key={d.id}
                onClick={() => { setSelectedId(d.id); setCreating(false); onSelect(d.id); }}
                className={`group mx-1 my-0.5 cursor-pointer transition-all duration-150 ${
                  selId === d.id
                    ? "bg-table-selected border-l-2 border-l-cyan-500"
                    : "border-l-2 border-l-transparent hover:bg-table-row-hover"
                }`}
              >
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-foreground flex-1">
                      {d.dmrNumber} — {d.title}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border shrink-0 ${DMR_STATUS_STYLES[d.status] || ""}`}>
                      {statusLabel(d.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-1 py-0.5">{d.targetType}</span>
                    {d.quantity != null && (
                      <span className="text-xs text-muted-foreground">
                        Qty: {d.quantity} {d.uom || ""}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${
                      d.severity === "CRITICAL" ? "border-red-300 text-red-700 bg-red-50/80 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30"
                      : d.severity === "HIGH" ? "border-orange-300 text-orange-700 bg-orange-50/80 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950/30"
                      : d.severity === "MEDIUM" ? "border-blue-300 text-blue-700 bg-blue-50/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30"
                      : "border-gray-300 text-gray-600 bg-gray-50/80 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30"
                    }`}>{statusLabel(d.severity)}</span>
                    {d.dueDate && (
                      <>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">Due: {new Date(d.dueDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                  {d.owner && (
                    <div className="mt-0.5 text-xs text-muted-foreground">Owner: {d.owner}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return {
    items,
    selectedId,
    renderList,
    renderDetail,
    creating,
    hNew,
    hCreate,
    hClose,
    hCancel,
    hDisposition,
    hCancelNew: () => { setCreating(false); setErrors({}); },
    resetSelection: () => { setSelectedId(null); setCreating(false); setErrors({}); },
    hRefresh: () => q.refetch(),
    canSave,
  };
}
