import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { RMAS_QUERY, RMA_QUERY } from "@/graphql/checkQueries";
import {
  CREATE_RMA_MUTATION, UPDATE_RMA_MUTATION,
  RECEIVE_RMA_MUTATION, DISPOSITION_RMA_MUTATION,
  CLOSE_RMA_MUTATION, CANCEL_RMA_MUTATION,
} from "@/graphql/checkMutations";
import {
  RMA_STATUS_STYLES, RMA_DISPOSITION_OPTIONS,
  CUSTOMER_RESPONSE_OPTIONS, SEL_INPUT, statusLabel,
} from "./QualityStatusStyles";
import { InlineEditField } from "./InlineEditField";

interface RMANode {
  id: number; rmaNumber: string; customerName: string;
  partNumber: string; serialLot: string;
  productVariantId: number | null; materialItemId: number | null;
  quantity: number | null; reason: string;
  status: string; receivedDate: string | null; dueDate: string | null;
  disposition: string | null; customerResponseStatus: string;
  receivingInspectionResult: string; confirmedDefect: string;
  suspectedCause: string; confirmedCause: string;
  dispositionOwner: string; dispositionDate: string | null;
  customerResponse: string;
  owner: string; notes: string; createdAt: string; updatedAt: string;
}

function selCls(err?: boolean) {
  return `${SEL_INPUT} ${err ? "border-red-400 dark:border-red-600" : ""}`;
}

export function useRmaSection(
  search: string, filterStatus: string,
  onMessage: (msg: string, tone?: "success" | "error") => void,
) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Form state ──
  const [fNumber, setFNumber] = useState("");
  const [fCustomer, setFCustomer] = useState("");
  const [fPartNumber, setFPartNumber] = useState("");
  const [fSerialLot, setFSerialLot] = useState("");
  const [fQty, setFQty] = useState("");
  const [fReason, setFReason] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fDueDate, setFDueDate] = useState("");
  const [fCustResp, setFCustResp] = useState("NOT_REQUIRED");
  const [fNotes, setFNotes] = useState("");
  const [fDisposition, setFDisposition] = useState("REPLACE");
  const [fInspectionResult, setFInspectionResult] = useState("");
  const [fConfirmedDefect, setFConfirmedDefect] = useState("");
  const [fSuspectedCause, setFSuspectedCause] = useState("");
  const [fConfirmedCause, setFConfirmedCause] = useState("");
  const [fDispositionOwner, setFDispositionOwner] = useState("");
  const [fDispositionDate, setFDispositionDate] = useState("");
  const [fCustomerResponse, setFCustomerResponse] = useState("");

  // ── Queries ──
  const q = useQuery<{ rmas: RMANode[] }>(RMAS_QUERY, {
    variables: { search: search || undefined, status: filterStatus || undefined },
    fetchPolicy: "cache-and-network",
  });
  const items = q.data?.rmas || [];
  const { data: detailData } = useQuery<{ rma: RMANode }>(RMA_QUERY, {
    variables: { id: selectedId! },
    skip: !selectedId || creating,
    fetchPolicy: "cache-and-network",
  });
  const sel = detailData?.rma ?? (selectedId ? items.find((r) => r.id === selectedId) ?? null : null);

  // ── Mutations ──
  const [createMut] = useMutation<{ createRma: { id: number } }>(CREATE_RMA_MUTATION);
  const [updateMut] = useMutation(UPDATE_RMA_MUTATION);
  const [receiveMut] = useMutation(RECEIVE_RMA_MUTATION);
  const [dispMut] = useMutation(DISPOSITION_RMA_MUTATION);
  const [closeMut] = useMutation(CLOSE_RMA_MUTATION);
  const [cancelMut] = useMutation(CANCEL_RMA_MUTATION);

  // ── Validation ──
  const validate = useCallback((): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!fNumber.trim()) e.number = "RMA Number is required";
    if (!fCustomer.trim()) e.customer = "Customer is required";
    if (!fPartNumber.trim()) e.partNumber = "Product / Material is required";
    if (!fQty || parseFloat(fQty) <= 0) e.qty = "Quantity must be > 0";
    if (!fReason.trim()) e.reason = "Return Reason is required";
    if (!fOwner.trim()) e.owner = "Owner is required";
    if (!fCustResp) e.custResp = "Customer Response Status is required";
    if (!fDisposition) e.disposition = "Disposition is required";
    return e;
  }, [fNumber, fCustomer, fPartNumber, fQty, fReason, fOwner, fCustResp, fDisposition]);

  const canSave = fNumber.trim() !== "" && fCustomer.trim() !== ""
    && fPartNumber.trim() !== ""
    && fQty !== "" && parseFloat(fQty) > 0
    && fReason.trim() !== "" && fOwner.trim() !== ""
    && fCustResp !== "" && fDisposition !== "";

  // ── Actions ──
  const hNew = useCallback(() => {
    setCreating(true);
    setSelectedId(null);
    setErrors({});
    setFNumber(""); setFCustomer(""); setFPartNumber(""); setFSerialLot("");
    setFQty(""); setFReason(""); setFOwner(""); setFDueDate("");
    setFCustResp("NOT_REQUIRED"); setFNotes(""); setFDisposition("REPLACE");
    setFInspectionResult(""); setFConfirmedDefect(""); setFSuspectedCause(""); setFConfirmedCause("");
    setFDispositionOwner(""); setFDispositionDate(""); setFCustomerResponse("");
  }, []);

  const hCreate = useCallback(async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      const r: any = await createMut({
        variables: {
          rmaNumber: fNumber.trim(),
          customerName: fCustomer.trim(),
          partNumber: fPartNumber.trim() || undefined,
          serialLot: fSerialLot.trim() || undefined,
          quantity: parseFloat(fQty),
          reason: fReason.trim(),
          owner: fOwner.trim(),
          dueDate: fDueDate || null,
          disposition: fDisposition || undefined,
          customerResponseStatus: fCustResp || undefined,
          receivingInspectionResult: fInspectionResult.trim() || undefined,
          confirmedDefect: fConfirmedDefect.trim() || undefined,
          suspectedCause: fSuspectedCause.trim() || undefined,
          confirmedCause: fConfirmedCause.trim() || undefined,
          dispositionOwner: fDispositionOwner.trim() || undefined,
          dispositionDate: fDispositionDate || null,
          customerResponse: fCustomerResponse.trim() || undefined,
          notes: fNotes.trim() || undefined,
        },
      });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Failed to create RMA", "error");
        return;
      }
      if (!r.data) {
        onMessage("Failed to create RMA - unexpected response", "error");
        return;
      }
      onMessage("RMA created");
      setCreating(false);
      q.refetch();
    } catch (e: any) {
      onMessage(e?.message || "Failed to create RMA", "error");
    }
  }, [fNumber, fCustomer, fPartNumber, fSerialLot, fQty, fReason, fOwner, fDueDate, fNotes, fDisposition, fCustResp, fInspectionResult, fConfirmedDefect, fSuspectedCause, fConfirmedCause, fDispositionOwner, fDispositionDate, fCustomerResponse, validate, createMut, q, onMessage]);

  const hUpdate = useCallback(async (field: string, val: string) => {
    if (!selectedId) return;
    try {
      const r: any = await updateMut({ variables: { id: selectedId, [field]: val || null } });
      if (r.errors?.length) {
        onMessage(r.errors[0]?.message || "Failed to update", "error");
        return;
      }
      if (!r.data) {
        onMessage("Failed to update - unexpected response", "error");
        return;
      }
      onMessage("Updated");
      q.refetch();
    } catch (e: any) {
      onMessage(e?.message || "Failed to update", "error");
    }
  }, [selectedId, updateMut, q, onMessage]);

  const hReceive = useCallback(async () => {
    if (!selectedId) return;
    try { const r: any = await receiveMut({ variables: { id: selectedId } }); if (r.errors?.length) { onMessage(r.errors[0]?.message || "Failed to receive RMA", "error"); return; } if (!r.data) { onMessage("Failed to receive RMA - unexpected response", "error"); return; } onMessage("RMA received"); q.refetch(); }
    catch (e: any) { onMessage(e?.message || "Failed to receive RMA", "error"); }
  }, [selectedId, receiveMut, q, onMessage]);

  const hDisposition = useCallback(async () => {
    if (!selectedId) return;
    try { const r: any = await dispMut({ variables: { id: selectedId, disposition: fDisposition } }); if (r.errors?.length) { onMessage(r.errors[0]?.message || "Failed to set disposition", "error"); return; } if (!r.data) { onMessage("Failed to set disposition - unexpected response", "error"); return; } onMessage("RMA dispositioned"); q.refetch(); }
    catch (e: any) { onMessage(e?.message || "Failed to set disposition", "error"); }
  }, [selectedId, fDisposition, dispMut, q, onMessage]);

  const hClose = useCallback(async () => {
    if (!selectedId) return;
    try { const r: any = await closeMut({ variables: { id: selectedId } }); if (r.errors?.length) { onMessage(r.errors[0]?.message || "Failed to close RMA", "error"); return; } if (!r.data) { onMessage("Failed to close RMA - unexpected response", "error"); return; } onMessage("RMA closed"); q.refetch(); }
    catch (e: any) { onMessage(e?.message || "Failed to close RMA", "error"); }
  }, [selectedId, closeMut, q, onMessage]);

  const hCancel = useCallback(async () => {
    if (!selectedId) return;
    try { const r: any = await cancelMut({ variables: { id: selectedId } }); if (r.errors?.length) { onMessage(r.errors[0]?.message || "Failed to cancel RMA", "error"); return; } if (!r.data) { onMessage("Failed to cancel RMA - unexpected response", "error"); return; } onMessage("RMA cancelled"); q.refetch(); }
    catch (e: any) { onMessage(e?.message || "Failed to cancel RMA", "error"); }
  }, [selectedId, cancelMut, q, onMessage]);

  // ── Styles ──
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const errTxtCls = "text-[10px] text-danger mt-0.5";

  // ── Create Form (25/75 layout) ──
  const renderCreateForm = () => (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
      {/* ── Left 25%: Customer/Status/Product Metadata ── */}
      <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-background/40 dark:bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Return Metadata</h3>
        <div>
          <label className={labelCls}>RMA Number *</label>
          <input type="text" value={fNumber} onChange={(e) => setFNumber(e.target.value)} className={selCls(!!errors.number)} placeholder="RMA-..." />
          {errors.number && <p className={errTxtCls}>{errors.number}</p>}
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <div className="h-8 flex items-center text-sm text-muted-foreground">Open</div>
        </div>
        <div>
          <label className={labelCls}>Customer *</label>
          <input type="text" value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} className={selCls(!!errors.customer)} placeholder="Customer name..." />
          {errors.customer && <p className={errTxtCls}>{errors.customer}</p>}
        </div>
        <div>
          <label className={labelCls}>Owner *</label>
          <input type="text" value={fOwner} onChange={(e) => setFOwner(e.target.value)} className={selCls(!!errors.owner)} placeholder="Responsible..." />
          {errors.owner && <p className={errTxtCls}>{errors.owner}</p>}
        </div>
        <div>
          <label className={labelCls}>Date Opened</label>
          <div className="h-8 flex items-center text-sm text-muted-foreground">{new Date().toLocaleDateString()}</div>
        </div>
        <div>
          <label className={labelCls}>Due Date</label>
          <input type="date" value={fDueDate} onChange={(e) => setFDueDate(e.target.value)} className={selCls()} />
        </div>
        <div>
          <label className={labelCls}>Quantity Returned *</label>
          <input type="number" min="0" step="any" value={fQty} onChange={(e) => setFQty(e.target.value)} className={selCls(!!errors.qty)} placeholder="0" />
          {errors.qty && <p className={errTxtCls}>{errors.qty}</p>}
        </div>
        <div>
          <label className={labelCls}>Customer Response Status</label>
          <select value={fCustResp} onChange={(e) => setFCustResp(e.target.value)} className={selCls()}>
            {CUSTOMER_RESPONSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Right 75%: Return/Inspection/Disposition Details ── */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Product / Material *</label>
            <input type="text" value={fPartNumber} onChange={(e) => setFPartNumber(e.target.value)} className={selCls(!!errors.partNumber)} placeholder="Product or material ID..." />
            {errors.partNumber && <p className={errTxtCls}>{errors.partNumber}</p>}
          </div>
          <div>
            <label className={labelCls}>Part Number</label>
            <div className="h-8 flex items-center text-sm text-muted-foreground">{fPartNumber || "—"}</div>
          </div>
        </div>

        <div>
          <label className={labelCls}>Serial / Lot</label>
          <input type="text" value={fSerialLot} onChange={(e) => setFSerialLot(e.target.value)} className={selCls()} placeholder="Serial/Lot #..." />
        </div>

        <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Return Reason *</label>
          <textarea
            value={fReason}
            onChange={(e) => setFReason(e.target.value)}
            rows={3}
            className={`h-20 w-full bg-background/50 dark:bg-slate-800/50 border ${errors.reason ? "border-red-400" : "border-white/30 dark:border-slate-700/30"} px-2 py-1 text-xs outline-none resize-none`}
            placeholder="Reason for return..."
          />
          {errors.reason && <p className={errTxtCls}>{errors.reason}</p>}
        </div>

        <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Receiving Inspection Result</label>
          <textarea
            value={fInspectionResult}
            onChange={(e) => setFInspectionResult(e.target.value)}
            rows={2}
            className="h-16 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none"
            placeholder="Inspection findings..."
          />
        </div>

        <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Confirmed Defect</label>
          <textarea
            value={fConfirmedDefect}
            onChange={(e) => setFConfirmedDefect(e.target.value)}
            rows={2}
            className="h-16 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none"
            placeholder="Defect description..."
          />
        </div>

        <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Suspected Cause</label>
          <textarea
            value={fSuspectedCause}
            onChange={(e) => setFSuspectedCause(e.target.value)}
            rows={2}
            className="h-16 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none"
            placeholder="Suspected root cause..."
          />
        </div>

        <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Root Cause / Confirmed Cause</label>
          <textarea
            value={fConfirmedCause}
            onChange={(e) => setFConfirmedCause(e.target.value)}
            rows={2}
            className="h-16 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none"
            placeholder="Confirmed root cause..."
          />
        </div>

        {/* Disposition */}
        <div>
          <label className={labelCls}>Disposition</label>
          <select value={fDisposition} onChange={(e) => setFDisposition(e.target.value)} className={selCls()}>
            {RMA_DISPOSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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

        <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Customer Response</label>
          <textarea
            value={fCustomerResponse}
            onChange={(e) => setFCustomerResponse(e.target.value)}
            rows={2}
            className="h-16 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none"
            placeholder="Customer response details..."
          />
        </div>

        <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <label className="block text-xs font-semibold text-foreground mb-2">Verification / Closure Notes</label>
          <textarea
            value={fNotes}
            onChange={(e) => setFNotes(e.target.value)}
            rows={2}
            className="h-16 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none"
            placeholder="Verification and closure details..."
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
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Customer Return Management</h3>
            <p className="text-xs text-muted-foreground/70">
              Manage customer returns, inspections, dispositions, and resolution tracking.
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

    const status = sel.status;

    return (
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ── Left 65%: Return Reason, Inspection, Defect, Cause, Disposition ── */}
        <div className="w-[65%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground font-mono">{sel.rmaNumber}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${RMA_STATUS_STYLES[status] || ""}`}>
                  {statusLabel(status)}
                </span>
              </div>
              <h2 className="text-base font-bold text-foreground truncate">{sel.customerName}</h2>
            </div>
          </div>

          {/* Part / Serial / Qty */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Part Number</span>
              <span className="text-foreground font-medium">{sel.partNumber || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Serial / Lot</span>
              <span className="text-foreground font-medium">{sel.serialLot || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Quantity</span>
              <span className="text-foreground font-medium">{sel.quantity ?? "—"}</span>
            </div>
          </div>

          {/* Return Reason */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Return Reason</h3>
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{sel.reason || "—"}</div>
          </div>

          {/* Receiving Inspection Result */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Receiving Inspection Result</h3>
            <InlineEditField value={sel.receivingInspectionResult || ""} onSave={(v) => hUpdate("receivingInspectionResult", v)} type="textarea" label="Inspection result" />
          </div>

          {/* Confirmed Defect */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Confirmed Defect</h3>
            <InlineEditField value={sel.confirmedDefect || ""} onSave={(v) => hUpdate("confirmedDefect", v)} type="textarea" label="Confirmed defect" />
          </div>

          {/* Suspected Cause */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Suspected Cause</h3>
            <InlineEditField value={sel.suspectedCause || ""} onSave={(v) => hUpdate("suspectedCause", v)} type="textarea" label="Suspected cause" />
          </div>

          {/* Root Cause / Confirmed Cause */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Root Cause</h3>
            <InlineEditField value={sel.confirmedCause || ""} onSave={(v) => hUpdate("confirmedCause", v)} type="textarea" label="Root cause" />
          </div>

          {/* Disposition */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Disposition</h3>
            <div className="flex items-center gap-2">
              <InlineEditField
                value={sel.disposition || ""}
                onSave={(v) => hUpdate("disposition", v)}
                type="select"
                options={RMA_DISPOSITION_OPTIONS}
                label="disposition"
              />
              {sel.disposition && (
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border border-indigo-300 text-primary bg-indigo-50/80`}>
                  {RMA_DISPOSITION_OPTIONS.find((o) => o.value === sel.disposition)?.label || statusLabel(sel.disposition)}
                </span>
              )}
            </div>
            {sel.disposition && (
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mt-2 pt-2 border-t border-white/10 dark:border-slate-700/10">
                <div>
                  <span className="block">Disposition Owner</span>
                  <InlineEditField value={sel.dispositionOwner || ""} onSave={(v) => hUpdate("dispositionOwner", v)} label="disposition owner" />
                </div>
                <div>
                  <span className="block">Disposition Date</span>
                  <InlineEditField value={sel.dispositionDate || ""} onSave={(v) => hUpdate("dispositionDate", v)} label="disposition date" />
                </div>
              </div>
            )}
          </div>

          {/* Customer Response */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Customer Response</h3>
            <InlineEditField value={sel.customerResponse || ""} onSave={(v) => hUpdate("customerResponse", v)} type="textarea" label="customer response" />
          </div>

          {/* Customer Response Status */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Customer Response</h3>
            <div className="flex items-center gap-2">
              <InlineEditField
                value={sel.customerResponseStatus || "NOT_REQUIRED"}
                onSave={(v) => hUpdate("customerResponseStatus", v)}
                type="select"
                options={CUSTOMER_RESPONSE_OPTIONS}
                label="customer response status"
              />
              <span className="text-xs text-muted-foreground">
                ({CUSTOMER_RESPONSE_OPTIONS.find((o) => o.value === sel.customerResponseStatus)?.label || sel.customerResponseStatus})
              </span>
            </div>
          </div>

          {/* Verification / Closure Notes */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Verification / Closure Notes</h3>
            <InlineEditField value={sel.notes || ""} onSave={(v) => hUpdate("notes", v)} type="textarea" label="notes" />
          </div>

          {/* Inline action buttons for status transitions not in toolbar */}
          {(status === "OPEN" || status === "RECEIVED" || status === "UNDER_REVIEW") && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/10 dark:border-slate-700/10">
              {status === "OPEN" && (
                <button onClick={hReceive} className="inline-flex h-7 items-center gap-1 border border-teal-300 px-2 text-[10px] font-semibold text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950/30 transition-all">
                  Receive
                </button>
              )}
              {(status === "RECEIVED" || status === "UNDER_REVIEW") && (
                <>
                  <select
                    value={fDisposition}
                    onChange={(e) => setFDisposition(e.target.value)}
                    className="h-7 text-[10px] border border-border/40 bg-card px-1 text-foreground outline-none"
                  >
                    {RMA_DISPOSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button onClick={hDisposition} className="inline-flex h-7 items-center gap-1 border border-indigo-300 px-2 text-[10px] font-semibold text-primary hover:bg-primary/10 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/30 transition-all">
                    Disposition
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Right 35%: Status, Customer, Quantity, Owner, Dates, Linked Items ── */}
        <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4 bg-background/30 dark:bg-slate-900/30">
          {/* Status & Customer */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Overview</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${RMA_STATUS_STYLES[status] || ""}`}>{statusLabel(status)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Customer</span>
                <span className="text-foreground font-medium text-sm">{sel.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Resp. Status</span>
                <span className="text-foreground text-xs">{CUSTOMER_RESPONSE_OPTIONS.find((o) => o.value === sel.customerResponseStatus)?.label || sel.customerResponseStatus || "—"}</span>
              </div>
            </div>
          </div>

          {/* Product / Material */}
          <div className="border-t border-white/10 dark:border-slate-700/10 pt-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Product</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Part #</span>
                <InlineEditField value={sel.partNumber || ""} onSave={(v) => hUpdate("partNumber", v)} label="part number" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Serial/Lot</span>
                <InlineEditField value={sel.serialLot || ""} onSave={(v) => hUpdate("serialLot", v)} label="serial/lot" />
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="border-t border-white/10 dark:border-slate-700/10 pt-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Return Details</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Quantity</span>
                <span className="text-foreground font-medium">{sel.quantity ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Disposition</span>
                <span className="text-foreground text-xs">{sel.disposition ? (RMA_DISPOSITION_OPTIONS.find((o) => o.value === sel.disposition)?.label || statusLabel(sel.disposition)) : "—"}</span>
              </div>
            </div>
          </div>

          {/* Owner & Dates */}
          <div className="border-t border-white/10 dark:border-slate-700/10 pt-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Assignment</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Owner</span>
                <InlineEditField value={sel.owner || ""} onSave={(v) => hUpdate("owner", v)} label="owner" />
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
              {sel.receivedDate && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Received</span>
                  <span className="text-foreground">{new Date(sel.receivedDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Items */}
          <div className="border-t border-white/10 dark:border-slate-700/10 pt-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70 mb-2">Linked Items</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Issue</span>
                <span className="text-foreground text-xs text-muted-foreground">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Action</span>
                <span className="text-foreground text-xs text-muted-foreground">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Audit Finding</span>
                <span className="text-foreground text-xs text-muted-foreground">—</span>
              </div>
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
        <span className="text-sm font-medium text-muted-foreground">RMAs</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {q.loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-xs font-medium text-muted-foreground">No RMAs</p>
            <button onClick={hNew} className="mt-2 inline-flex h-7 items-center gap-1 bg-cyan-600/10 px-3 text-xs font-semibold text-cyan-700 hover:bg-cyan-600/20">
              <Plus className="h-3 w-3" /> New
            </button>
          </div>
        ) : (
          <div>
            {items.map((r) => (
              <div
                key={r.id}
                onClick={() => { setSelectedId(r.id); setCreating(false); onSelect(r.id); }}
                className={`group mx-1 my-0.5 cursor-pointer transition-all duration-150 ${
                  selId === r.id
                    ? "bg-table-selected border-l-2 border-l-cyan-500"
                    : "border-l-2 border-l-transparent hover:bg-table-row-hover"
                }`}
              >
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-foreground flex-1">
                      {r.rmaNumber} — {r.customerName}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border shrink-0 ${RMA_STATUS_STYLES[r.status] || ""}`}>
                      {statusLabel(r.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {r.partNumber && <span className="text-[10px] text-muted-foreground bg-muted/50 px-1 py-0.5">{r.partNumber}</span>}
                    {r.quantity != null && (
                      <span className="text-xs text-muted-foreground">Qty: {r.quantity}</span>
                    )}
                    {r.disposition && (
                      <span className="text-[10px] text-muted-foreground bg-muted/30 px-1 py-0.5">{RMA_DISPOSITION_OPTIONS.find((o) => o.value === r.disposition)?.label || statusLabel(r.disposition)}</span>
                    )}
                  </div>
                  {r.owner && (
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Owner: {r.owner}</span>
                      {r.dueDate && <span>· Due: {new Date(r.dueDate).toLocaleDateString()}</span>}
                    </div>
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
    hReceive,
    hDisposition,
    hCancelNew: () => { setCreating(false); setErrors({}); },
    resetSelection: () => { setSelectedId(null); setCreating(false); setErrors({}); },
    hRefresh: () => q.refetch(),
    canSave,
  };
}
