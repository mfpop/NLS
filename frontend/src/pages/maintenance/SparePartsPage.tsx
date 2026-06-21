import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Package, Plus, RefreshCw, Minus, XCircle, AlertTriangle,
  MapPin, Hash, Archive, Save, FileText, CheckCircle, Clock, ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ToolbarDropdown, ToolbarButton } from "@/components/shared/Toolbar";
import { SplitToolbar } from "@/components/shared/SplitToolbar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SPARE_PARTS_QUERY, SPARE_PART_USAGES_QUERY, WORK_ORDERS_QUERY } from "@/graphql/maintenanceQueries";
import { SparePartsDashboard } from "./spare-parts/SparePartsDashboard";
import {
  mockSpareParts,
  mockSparePartUsages,
} from "@/demo/maintenanceMockData";
import {
  CREATE_SPARE_PART_MUTATION, UPDATE_SPARE_PART_MUTATION,
  ADJUST_SPARE_PART_QUANTITY_MUTATION,
  RECORD_SPARE_PART_USAGE_MUTATION,
  MARK_SPARE_PART_INACTIVE_MUTATION,
  MARK_SPARE_PART_OBSOLETE_MUTATION,
} from "@/graphql/maintenanceMutations";


const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "OBSOLETE", label: "Obsolete" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "Seals", label: "Seals" },
  { value: "Filters", label: "Filters" },
  { value: "Bearings", label: "Bearings" },
  { value: "Belts", label: "Belts" },
  { value: "Hydraulic", label: "Hydraulic" },
  { value: "Pneumatic", label: "Pneumatic" },
  { value: "Electrical", label: "Electrical" },
  { value: "Fasteners", label: "Fasteners" },
  { value: "Lubricants", label: "Lubricants" },
  { value: "Tools", label: "Tools" },
  { value: "Other", label: "Other" },
];

const LOW_STOCK_FILTER_OPTIONS = [
  { value: "", label: "Stock Level: All" },
  { value: "low", label: "Low Stock" },
  { value: "critical", label: "Out of Stock" },
];

interface SparePart {
  id: number; partNumber: string; name: string; description: string;
  category: string; manufacturer: string; supplier: string;
  uom: string; minQuantity: number;
  quantityOnHand: number; storageLocation: string; notes: string; status: string;
}

interface UsageRecord {
  id: number; partId: number; workOrderId: number;
  quantity: number; usedBy: string; usedAt: string; notes: string;
}

interface WorkOrderOption {
  id: number;
  number: string;
  title: string;
  status: string;
}

function Fld({ label, children, required, error }: { label: string; children: React.ReactNode; required?: boolean; error?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

const inpCls = "h-8 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 px-2.5 text-sm text-foreground outline-none focus:border-teal-500 transition-colors placeholder:text-muted-foreground/40";
const selCls = inpCls + " appearance-none";

function cls(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(" ");
}

export function SparePartsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStock, setFilterStock] = useState("");
  const [selId, setSelId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [view, setView] = useState<"dashboard" | "detail" | "form">("dashboard");
  const [editMode, setEditMode] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);

  const msg = (m: string) => { setSuccessMsg(m); setErrorMsg(""); setTimeout(() => setSuccessMsg(""), 4000); };
  const err = (m: string) => { setErrorMsg(m); setSuccessMsg(""); setTimeout(() => setErrorMsg(""), 6000); };

  // ── Read initial filter from URL params ──
  useEffect(() => {
    const stockParam = searchParams.get("stock");
    if (stockParam === "critical" || stockParam === "low") {
      setFilterStock(stockParam);
      setView("detail");
    }
  }, []); // only on mount

  // ── Queries ──
  const { data, loading, refetch } = useQuery(SPARE_PARTS_QUERY, {
    variables: {
      search: search || undefined,
      status: filterStatus || undefined,
      category: filterCategory || undefined,
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const parts: SparePart[] = (data as any)?.spareParts ?? mockSpareParts.spareParts;
  const sel = useMemo(() => selId ? parts.find((p) => p.id === selId) ?? null : null, [selId, parts]);

  const { data: usageData } = useQuery(SPARE_PART_USAGES_QUERY, {
    variables: { sparePartId: selId || undefined },
    skip: !selId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const usages: UsageRecord[] = (usageData as any)?.sparePartUsages ?? mockSparePartUsages.sparePartUsages;

  const { data: workOrdersData } = useQuery(WORK_ORDERS_QUERY, {
    fetchPolicy: "cache-first",
    errorPolicy: "all",
  });
  const workOrderOptions: WorkOrderOption[] = ((workOrdersData as any)?.maintenanceWorkOrders ?? [])
    .map((wo: any) => ({
      id: wo.id,
      number: wo.number,
      title: wo.title,
      status: wo.status,
    }))
    .filter((wo: WorkOrderOption) => !!wo.id)
    .sort((a: WorkOrderOption, b: WorkOrderOption) => b.id - a.id)
    .slice(0, 50);

  // ── Mutations ──
  const [createPart] = useMutation(CREATE_SPARE_PART_MUTATION, { refetchQueries: [{ query: SPARE_PARTS_QUERY }] });
  const [updatePart] = useMutation(UPDATE_SPARE_PART_MUTATION);
  const [adjustQuantity] = useMutation(ADJUST_SPARE_PART_QUANTITY_MUTATION);
  const [recordUsage] = useMutation(RECORD_SPARE_PART_USAGE_MUTATION, { refetchQueries: [{ query: SPARE_PART_USAGES_QUERY }] });
  const [markInactive] = useMutation(MARK_SPARE_PART_INACTIVE_MUTATION);
  const [markObsolete] = useMutation(MARK_SPARE_PART_OBSOLETE_MUTATION);

  // ── Form State ──
  const [form, setForm] = useState({
    partNumber: "", name: "", description: "", category: "",
    manufacturer: "", supplier: "", uom: "EA",
    minQuantity: "", quantityOnHand: "", storageLocation: "", notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Record Usage State ──
  const [recordUsageOpen, setRecordUsageOpen] = useState(false);
  const [usageForm, setUsageForm] = useState({
    workOrderId: "", quantity: "1", usedBy: "", notes: "",
  });

  const hNew = useCallback(() => {
    setForm({ partNumber: "", name: "", description: "", category: "", manufacturer: "", supplier: "", uom: "EA", minQuantity: "", quantityOnHand: "", storageLocation: "", notes: "" });
    setFormErrors({}); setEditMode(false); setView("form");
  }, []);

  const hEdit = useCallback(() => {
    if (!sel) return;
    setForm({
      partNumber: sel.partNumber, name: sel.name, description: sel.description,
      category: sel.category, manufacturer: sel.manufacturer, supplier: sel.supplier,
      uom: sel.uom, minQuantity: sel.minQuantity.toString(),
      quantityOnHand: sel.quantityOnHand.toString(), storageLocation: sel.storageLocation,
      notes: sel.notes,
    });
    setFormErrors({}); setEditMode(true); setView("form");
  }, [sel]);

  const hCancelForm = useCallback(() => { setView("detail"); setEditMode(false); }, []);

  const validateForm = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!form.partNumber.trim()) e.partNumber = "Required";
    if (!form.name.trim()) e.name = "Required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const hSave = useCallback(async () => {
    if (!validateForm()) return;
    try {
      if (editMode && sel) {
        await updatePart({
          variables: {
            id: sel.id, name: form.name.trim(), description: form.description.trim() || undefined,
            category: form.category || undefined, manufacturer: form.manufacturer.trim() || undefined,
            supplier: form.supplier.trim() || undefined, uom: form.uom || undefined,
            minQuantity: form.minQuantity ? Number(form.minQuantity) : undefined,
            storageLocation: form.storageLocation.trim() || undefined,
            notes: form.notes.trim() || undefined,
          },
        });
        msg("Spare part updated");
      } else {
        await createPart({
          variables: {
            partNumber: form.partNumber.trim(), name: form.name.trim(),
            description: form.description.trim() || undefined, category: form.category || undefined,
            manufacturer: form.manufacturer.trim() || undefined, supplier: form.supplier.trim() || undefined,
            uom: form.uom || undefined, minQuantity: form.minQuantity ? Number(form.minQuantity) : undefined,
            quantityOnHand: form.quantityOnHand ? Number(form.quantityOnHand) : undefined,
            storageLocation: form.storageLocation.trim() || undefined,
            notes: form.notes.trim() || undefined,
          },
        });
        msg("Spare part created");
      }
      setFormErrors({}); setView("detail"); setEditMode(false); refetch();
    } catch (e: any) { err(e.message || "Save failed"); }
  }, [form, editMode, sel, validateForm, createPart, updatePart, refetch]);

  const doAction = useCallback(async (action: string, id: number, extra?: Record<string, any>) => {
    try {
      let m = "";
      if (action === "adjust") {
        if (!extra?.amount || Number(extra.amount) === 0) {
          err("Enter a non-zero adjustment amount");
          return;
        }
        const r = await adjustQuantity({ variables: { id, adjustment: extra?.amount || 0 } });
        m = (r as any)?.data?.adjustSparePartQuantity || "Quantity adjusted";
        setAdjustingId(null); setAdjustQty(0);
      } else if (action === "inactive") { await markInactive({ variables: { id } }); m = "Marked inactive"; }
      else if (action === "obsolete") { await markObsolete({ variables: { id } }); m = "Marked obsolete"; }
      else if (action === "record-usage") {
        if (!extra?.workOrderId || Number(extra.workOrderId) <= 0) {
          err("Select a valid Work Order");
          return;
        }
        if (!extra?.quantity || Number(extra.quantity) <= 0) {
          err("Quantity must be greater than zero");
          return;
        }
        await recordUsage({
          variables: {
            partId: id, workOrderId: Number(extra?.workOrderId),
            quantity: Number(extra?.quantity) || 1, usedBy: extra?.usedBy || "",
            notes: extra?.notes || "",
          },
        });
        m = "Usage recorded";
        setRecordUsageOpen(false);
        setUsageForm({ workOrderId: "", quantity: "1", usedBy: "", notes: "" });
      }
      setConfirmAction(null);
      msg(m);
      refetch();
    } catch (e: any) { err(e.message || "Action failed"); }
  }, [adjustQuantity, markInactive, markObsolete, recordUsage, refetch]);

  const filteredParts = useMemo(() => {
    let list = parts;
    if (filterStock === "low") list = list.filter((p) => p.status === "ACTIVE" && p.quantityOnHand <= p.minQuantity && p.quantityOnHand > 0);
    else if (filterStock === "critical") list = list.filter((p) => p.status === "ACTIVE" && p.quantityOnHand === 0);
    return list;
  }, [parts, filterStock]);

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
    INACTIVE: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
    OBSOLETE: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  };

  const lowStock = (p: SparePart) => p.status === "ACTIVE" && p.quantityOnHand <= p.minQuantity;
  const stockLevel = (p: SparePart): "full" | "low" | "critical" | "inactive" => {
    if (p.status !== "ACTIVE") return "inactive";
    if (p.quantityOnHand === 0) return "critical";
    if (p.quantityOnHand <= p.minQuantity) return "low";
    return "full";
  };

  const canEdit = sel?.status === "ACTIVE" || sel?.status === "INACTIVE";

  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);
  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => { setLeftPct(Math.min(Math.max(((ev.clientX - rect.left) / rect.width) * 100, 22), 55)); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);

  // ── Dashboard ──
  const renderDashboard = () => (
    <SparePartsDashboard
      parts={parts}
      usages={usages}
      onNavigateView={(v) => setView(v)}
      onNavigateTo={(path) => navigate(path)}
      onFilterStock={(level) => { setFilterStock(level); setView("detail"); }}
    />
  );

  // ── Form ──
  const renderForm = () => (
    <div className="flex flex-1 min-h-0">
      <div className="w-[25%] min-w-50 border-r border-border/20 bg-card/30 p-4 space-y-4 overflow-visible">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Hash className="h-3 w-3" /> Part Info & Location
        </p>
        {editMode && sel && <Fld label="Part Number"><p className="text-sm font-mono text-foreground">{sel.partNumber}</p></Fld>}
        {!editMode && <Fld label="Part Number" required error={formErrors.partNumber}>
          <input type="text" value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} className={inpCls} placeholder="e.g. HYD-SEAL-001" />
        </Fld>}
        <Fld label="Name" required error={formErrors.name}>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inpCls} placeholder="Part name" />
        </Fld>
        <Fld label="Category">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={selCls}>
            <option value="">Select category...</option>
            {CATEGORY_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Fld>
        <div className="grid grid-cols-2 gap-3">
          <Fld label="UOM">
            <input type="text" value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} className={inpCls} placeholder="EA" />
          </Fld>
          <Fld label="Status">
            <p className="text-sm font-semibold text-foreground pt-1">{editMode && sel ? sel.status : "New"}</p>
          </Fld>
        </div>
        <Fld label="Manufacturer">
          <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className={inpCls} placeholder="Manufacturer name" />
        </Fld>
        <Fld label="Supplier">
          <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={inpCls} placeholder="Supplier name" />
        </Fld>
        <Fld label="Storage Location">
          <input type="text" value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} className={inpCls} placeholder="Aisle, bin, shelf..." />
        </Fld>
        <div className="grid grid-cols-2 gap-3">
          <Fld label="Min Quantity">
            <input type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} className={inpCls} min="0" />
          </Fld>
          <Fld label="Qty On Hand">
            <input type="number" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: e.target.value })}
              className={inpCls} min="0" disabled={editMode} />
          </Fld>
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" /> Inventory Rules & Details
        </p>
        <Fld label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="h-20 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-teal-500"
            placeholder="Part description, specifications..." />
        </Fld>
        <Fld label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="h-20 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-teal-500"
            placeholder="Additional notes, cross-references..." />
        </Fld>
      </div>
    </div>
  );

  // ── Detail ──
  const renderDetail = () => {
    if (!sel) return null;
    const level = stockLevel(sel);
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="sticky top-0 bg-card z-10 border-b border-border/30 px-5 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground truncate">{sel.name}</h2>
                <span className={cls("inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border", statusColors[sel.status])}>
                  {sel.status === "OBSOLETE" ? "Obs" : sel.status.charAt(0) + sel.status.slice(1).toLowerCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-mono">{sel.partNumber}</span>
                {sel.category && <><span className="mx-1.5">·</span>{sel.category}</>}
                {sel.storageLocation && <><span className="mx-1.5">·</span>{sel.storageLocation}</>}
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0" style={{ height: "calc(100% - 57px)" }}>
          {/* Left 65%: Summary, Stock Rules, Usage History */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-5" style={{ flexBasis: "65%" }}>
            {/* Stock Level */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stock Level</h3>
              <div className="border border-border/30 bg-card/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{sel.quantityOnHand}</span>
                    <span className="text-sm text-muted-foreground">{sel.uom || "units"}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Min Qty</p>
                    <p className="text-lg font-semibold text-foreground">{sel.minQuantity}</p>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden bg-muted">
                  <div className={cls("h-full transition-all duration-700",
                    level === "critical" ? "bg-red-500" : level === "low" ? "bg-amber-500" : level === "full" ? "bg-green-500" : "bg-gray-400")}
                    style={{ width: `${Math.min((sel.quantityOnHand / (Math.max(sel.minQuantity, 1) * 2)) * 100, 100)}%` }} />
                </div>
                {lowStock(sel) && (
                  <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5 stroke-current" />
                    {sel.quantityOnHand === 0 ? "Out of stock — reorder immediately" : "Low stock — reorder soon"}
                  </p>
                )}
              </div>

              {/* Inline adjust qty */}
              {adjustingId === sel.id && (
                <div className="mt-2 flex items-center gap-2 border border-border/30 bg-card/50 p-2">
                  <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                    className="h-7 w-20 border border-input bg-background px-2 text-xs outline-none focus:border-teal-400"
                    placeholder="+/- qty" />
                  <button onClick={() => doAction("adjust", sel.id, { amount: adjustQty })}
                    disabled={adjustQty === 0}
                    className="inline-flex h-7 items-center gap-1 bg-teal-600 px-2 text-[10px] font-semibold text-white hover:bg-teal-700 transition-colors">
                    Apply
                  </button>
                  <button onClick={() => { setAdjustingId(null); setAdjustQty(0); }}
                    className="inline-flex h-7 items-center px-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Part Summary</h3>
              <p className="text-sm text-foreground">{sel.description || <span className="italic text-muted-foreground/60">No description</span>}</p>
            </div>

            {/* Usage History */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 stroke-current" /> Usage History
              </h3>
              {usages.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No usage recorded for this part.</p>
              ) : (
                <div className="space-y-1">
                  {usages.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 border border-border/30 bg-card/40 px-2.5 py-1.5 text-[11px]">
                      <span className="font-semibold text-red-500">-{u.quantity}</span>
                      <span className="font-mono text-muted-foreground">WO #{u.workOrderId}</span>
                      {u.usedBy && <span className="text-muted-foreground">by {u.usedBy}</span>}
                      <span className="text-muted-foreground ml-auto">{u.usedAt?.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {sel.notes && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</h3>
                <div className="border border-border/30 bg-card/50 p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{sel.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right 35%: Status, Category, Min/Max, Supplier, Location */}
          <div className="border-l border-border/20 bg-card/20 p-5 space-y-5" style={{ flexBasis: "35%", minWidth: 240 }}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Details</h3>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
                  <span className={cls("mt-0.5 inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold border", statusColors[sel.status])}>
                    {sel.status === "OBSOLETE" ? "Obs" : sel.status.charAt(0) + sel.status.slice(1).toLowerCase()}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Category</p>
                  <p className="text-sm font-medium text-foreground">{sel.category || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Min / Max</p>
                  <p className="text-sm font-medium text-foreground">{sel.minQuantity} / —</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Current Stock</p>
                  <p className={cls("text-sm font-bold", level === "critical" ? "text-red-500" : level === "low" ? "text-amber-500" : "text-foreground")}>
                    {sel.quantityOnHand} {sel.uom || "units"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Supplier</p>
                  <p className="text-sm font-medium text-foreground">{sel.supplier || <span className="italic text-muted-foreground/60">None</span>}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Location</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 stroke-current text-muted-foreground" />
                    {sel.storageLocation || <span className="italic text-muted-foreground/60">Not set</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {(successMsg || errorMsg) && (
        <div className={cls(
          "shrink-0 h-8 flex items-center justify-center text-sm font-semibold border-b",
          errorMsg
            ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-300"
            : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300",
        )}>
          {errorMsg ? <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
          {errorMsg || successMsg}
        </div>
      )}
      <PageHeader
        icon={<Package className="h-5 w-5 stroke-current" />}
        iconClass="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400"
        title="Spare Parts"
        subtitle="Manage spare parts inventory — kanban min/max levels"
      />
      <div className="print-ignore">
        <SplitToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search parts by name or number..."
          filters={view !== "dashboard" && view !== "form" ? (
            <>
              <ToolbarDropdown value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} className="w-28" />

              <ToolbarDropdown value={filterCategory} onChange={setFilterCategory} options={CATEGORY_OPTIONS} className="w-36" />

              <ToolbarDropdown value={filterStock} onChange={setFilterStock} options={LOW_STOCK_FILTER_OPTIONS} className="w-36" />

            </>
          ) : undefined}
          actions={
            <div className="flex items-center gap-1 shrink-0">
              {view === "form" ? (
                <>
                  <ToolbarButton icon={Save} label={editMode ? "Update" : "Save"} onClick={hSave} variant="success" />
                  <ToolbarButton icon={XCircle} label="Cancel" onClick={hCancelForm} />
                </>
              ) : view === "dashboard" ? (
                <>
                  <ToolbarButton icon={Plus} label="New Part" onClick={hNew} />
                  <ToolbarButton icon={ClipboardList} label="All Parts" onClick={() => { setFilterStock(""); setView("detail"); }} />
                  <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
                </>
              ) : (
                <>
                  <ToolbarButton icon={Package} label="Dashboard" onClick={() => { setSelId(null); setView("dashboard"); }} />
                  <ToolbarButton icon={Plus} label="New Part" onClick={hNew} />
                  {sel && canEdit && <ToolbarButton icon={Minus} label="Adjust" onClick={() => { setAdjustingId(sel.id); setAdjustQty(0); }} />}
                  {sel && sel.status === "ACTIVE" && <ToolbarButton icon={Plus} label="Record Usage" onClick={() => setRecordUsageOpen(true)} />}
                  {sel && sel.status === "ACTIVE" && <ToolbarButton icon={Archive} label="Inactive" onClick={() => setConfirmAction({ id: sel.id, action: "inactive" })} />}
                  {sel && sel.status === "INACTIVE" && <ToolbarButton icon={XCircle} label="Obsolete" onClick={() => setConfirmAction({ id: sel.id, action: "obsolete" })} />}
                  {sel && canEdit && <ToolbarButton icon={Save} label="Edit" onClick={hEdit} />}
                  <span className="h-5 w-px shrink-0 bg-border/25 mx-1" />
                  <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
                </>
              )}
            </div>
          }
        />
      </div>

      {view === "dashboard" ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left 20%: Inventory Records Panel */}
          <div className="flex flex-col min-h-0 overflow-hidden border-r border-border/20 bg-card/30" style={{ flexBasis: "20%", minWidth: 200 }}>
            <div className="shrink-0 h-8 flex items-center border-b border-border/30 bg-muted/50 px-3">
              <span className="text-xs font-medium text-muted-foreground">Inventory</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{parts.length}</span>
            </div>
            <div className="shrink-0 px-2 py-1.5 border-b border-border/10 space-y-1.5">
              {/* Search */}
              <div className="relative">
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search parts..."
                  className="h-7 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 pr-6 text-[11px] text-foreground outline-none focus:border-teal-500 transition-colors placeholder:text-muted-foreground/40" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <XCircle className="h-3 w-3 stroke-current" />
                  </button>
                )}
              </div>
              {/* Filters */}
              <div className="flex gap-1">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-6 flex-1 min-w-0 bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-1.5 text-[10px] text-muted-foreground outline-none focus:border-teal-500 transition-colors appearance-none">
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="OBSOLETE">Obsolete</option>
                </select>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-6 flex-1 min-w-0 bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-1.5 text-[10px] text-muted-foreground outline-none focus:border-teal-500 transition-colors appearance-none">
                  <option value="">All Cat</option>
                  <option value="Seals">Seals</option>
                  <option value="Bearings">Bearings</option>
                  <option value="Filters">Filters</option>
                  <option value="Belts">Belts</option>
                  <option value="Hydraulic">Hydraulic</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Tools">Tools</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && parts.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...
                </div>
              ) : parts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs font-medium text-muted-foreground">No spare parts registered</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/60">Add spare parts to start tracking inventory.</p>
                  <button type="button" onClick={hNew}
                    className="mt-2 inline-flex h-7 items-center gap-1 bg-teal-600/10 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-600/20 dark:text-teal-400 transition-colors">
                    <Plus className="h-3 w-3 stroke-current" /> New Part
                  </button>
                </div>
              ) : (
                <div>
                  {parts.map((sp) => {
                    const level = stockLevel(sp);
                    return (
                      <div key={sp.id} role="option" aria-selected={selId === sp.id}
                        onClick={() => { setSelId(sp.id); setView("detail"); }}
                        className={cls(
                          "group mx-1 my-0.5 flex h-16 cursor-pointer items-center gap-3 px-3 transition-all duration-150",
                          selId === sp.id ? "bg-table-selected border-l-2 border-l-teal-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover",
                        )}>
                        <div className={cls("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                          level === "critical" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                          level === "low" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                          level === "full" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                          "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                          {sp.quantityOnHand}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="min-w-0 truncate text-sm font-semibold text-foreground">{sp.name}</span>
                            {level === "critical" && <span className="shrink-0" title="Out of stock"><AlertTriangle className="h-3 w-3 text-red-500 stroke-current" /></span>}
                            {level === "low" && <span className="shrink-0" title="Low stock"><AlertTriangle className="h-3 w-3 text-amber-500 stroke-current" /></span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-mono">{sp.partNumber}</span>
                            {sp.storageLocation && <><span>·</span><span>{sp.storageLocation}</span></>}
                          </div>
                        </div>
                        <span className={cls("shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border", statusColors[sp.status])}>
                          {sp.status === "OBSOLETE" ? "Obs" : sp.status.charAt(0) + sp.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="shrink-0 h-7 flex items-center border-t border-border/30 bg-muted/50 px-3">
              <span className="text-[10px] text-muted-foreground">{parts.length} part{parts.length !== 1 ? "s" : ""}</span>
              {filterStatus && (
                <span className="ml-auto text-[10px] text-muted-foreground">{filterStatus.charAt(0) + filterStatus.slice(1).toLowerCase()}</span>
              )}
            </div>
          </div>
          {/* Right 80%: Inventory Dashboard */}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            {renderDashboard()}
          </div>
        </div>
      ) : (
      <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: List */}
        <div className="flex flex-col min-h-0 overflow-hidden border-r border-border/20 bg-card/30"
          style={{ flexBasis: `${leftPct}%`, minWidth: 280 }}>
          <div className="shrink-0 h-8 flex items-center border-b border-border/30 bg-muted/50 px-3">
            <span className="text-xs font-medium text-muted-foreground">Inventory</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{filteredParts.length}</span>
          </div>
          {view === "form" ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-45">
                <Package className="mx-auto h-8 w-8 text-muted-foreground/20 stroke-current mb-2" />
                <p className="text-xs text-muted-foreground">Creating/editing part</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {loading && filteredParts.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...
                </div>
              ) : filteredParts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs font-medium text-muted-foreground">No spare parts found</p>
                  <button type="button" onClick={hNew}
                    className="mt-2 inline-flex h-7 items-center gap-1 bg-teal-600/10 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-600/20 dark:text-teal-400 transition-colors">
                    <Plus className="h-3 w-3 stroke-current" /> New Part
                  </button>
                </div>
              ) : (
                <div>
                  {filteredParts.map((sp) => {
                    const level = stockLevel(sp);
                    return (
                      <div key={sp.id} role="option" aria-selected={selId === sp.id}
                        onClick={() => { setSelId(sp.id); setView("detail"); }}
                        className={cls(
                          "group mx-1 my-0.5 flex h-16 cursor-pointer items-center gap-3 px-3 transition-all duration-150",
                          selId === sp.id ? "bg-table-selected border-l-2 border-l-teal-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover",
                        )}>
                        <div className={cls("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                          level === "critical" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                          level === "low" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                          level === "full" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                          "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                          {sp.quantityOnHand}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="min-w-0 truncate text-sm font-semibold text-foreground">{sp.name}</span>
                            {level === "critical" && <span className="shrink-0" title="Out of stock"><AlertTriangle className="h-3 w-3 text-red-500 stroke-current" /></span>}
                            {level === "low" && <span className="shrink-0" title="Low stock"><AlertTriangle className="h-3 w-3 text-amber-500 stroke-current" /></span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-mono">{sp.partNumber}</span>
                            {sp.storageLocation && <><span>·</span><span>{sp.storageLocation}</span></>}
                          </div>
                        </div>
                        <span className={cls("shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border", statusColors[sp.status])}>
                          {sp.status === "OBSOLETE" ? "Obs" : sp.status.charAt(0) + sp.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div className="shrink-0 h-7 flex items-center border-t border-border/30 bg-muted/50 px-3">
            <span className="text-[10px] text-muted-foreground">{filteredParts.length} part{filteredParts.length !== 1 ? "s" : ""}</span>
            {parts.filter((p) => lowStock(p)).length > 0 && (
              <span className="ml-auto text-[10px] font-semibold text-red-500">{parts.filter((p) => lowStock(p)).length} low stock</span>
            )}
          </div>
        </div>

        {/* Resizer */}
        {view !== "form" && (
          <div onMouseDown={handleSplitMouseDown}
            className="flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-teal-500/10"
            style={{ width: 2 }} />
        )}

        {/* Right: Detail / Form */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {view === "form" ? renderForm() : !sel ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center max-w-xs">
                <Package className="mx-auto h-10 w-10 text-muted-foreground/20 stroke-current mb-2" />
                <h3 className="text-sm font-semibold text-foreground mb-1">No part selected</h3>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">Select a part from the list or create a new one.</p>
              </div>
            </div>
          ) : renderDetail()}
        </div>
      </div>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-3 px-4 text-[10px] text-muted-foreground font-medium">
        <span className="font-semibold text-foreground">Spare Parts</span>
        <span className="mx-1 h-3 w-px bg-border/30" />
        <span>{parts.length} part{parts.length !== 1 ? "s" : ""}</span>
        {filterStatus && (
          <><span className="mx-1 h-3 w-px bg-border/30" /><span className="text-muted-foreground">{filterStatus.charAt(0) + filterStatus.slice(1).toLowerCase()}</span></>
        )}
        {filterCategory && (
          <><span className="mx-1 h-3 w-px bg-border/30" /><span className="text-muted-foreground">{filterCategory}</span></>
        )}
        <span className="flex-1" />
        {view !== "dashboard" && sel && (
          <>
            <span>{sel.partNumber}</span>
            <span>·</span>
            <span>On Hand: {sel.quantityOnHand} {sel.uom || "units"}</span>
          </>
        )}
      </div>

      {/* Confirm Mark Inactive Dialog */}
      <ConfirmDialog open={confirmAction?.action === "inactive"} onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && doAction("inactive", confirmAction.id)}
        title="Mark as Inactive"
        message="Mark this spare part as inactive? It will no longer appear in active inventory."
        confirmLabel="Inactive" danger={false} />

      {/* Confirm Mark Obsolete Dialog */}
      <ConfirmDialog open={confirmAction?.action === "obsolete"} onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && doAction("obsolete", confirmAction.id)}
        title="Mark as Obsolete"
        message="Mark this spare part as obsolete? This action can be reversed later."
        confirmLabel="Obsolete" danger={true} />

      {/* Record Usage Dialog */}
      <ConfirmDialog open={recordUsageOpen} onClose={() => setRecordUsageOpen(false)}
        onConfirm={() => {
          if (!sel) return;
          if (!usageForm.workOrderId.trim()) { err("Work Order is required"); return; }
          if (!usageForm.quantity.trim() || Number(usageForm.quantity) <= 0) { err("Quantity must be greater than zero"); return; }
          doAction("record-usage", sel.id, {
            workOrderId: usageForm.workOrderId,
            quantity: usageForm.quantity,
            usedBy: usageForm.usedBy,
            notes: usageForm.notes,
          });
        }}
        title="Record Spare Part Usage"
        message={`Record usage of ${sel?.name || "this part"} on a Work Order.`}
        confirmLabel="Record" danger={false}
      >
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Work Order *</label>
            <select value={usageForm.workOrderId} onChange={(e) => setUsageForm({ ...usageForm, workOrderId: e.target.value })}
              className="h-8 w-full border border-border bg-background px-2.5 text-sm outline-none focus:border-teal-400 transition-colors">
              <option value="">Select work order...</option>
              {workOrderOptions.map((wo) => (
                <option key={wo.id} value={wo.id}>{wo.number} - {wo.title} ({wo.status})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Quantity</label>
              <input type="number" min="1" value={usageForm.quantity} onChange={(e) => setUsageForm({ ...usageForm, quantity: e.target.value })}
                className="h-8 w-full border border-border bg-background px-2.5 text-sm outline-none focus:border-teal-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Used By</label>
              <input type="text" placeholder="Technician" value={usageForm.usedBy} onChange={(e) => setUsageForm({ ...usageForm, usedBy: e.target.value })}
                className="h-8 w-full border border-border bg-background px-2.5 text-sm outline-none focus:border-teal-400 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Notes</label>
            <textarea placeholder="Reason, location, reference..." value={usageForm.notes} onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })}
              className="h-16 w-full border border-border bg-background px-2.5 py-1.5 text-sm outline-none resize-none focus:border-teal-400 transition-colors" />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
