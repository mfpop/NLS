import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { Check, TrendingUpDown, Factory, Search, ExternalLink } from "lucide-react";
import { Pagination, ProductionLineProductScopeSummary } from "./components";
import { useProductionLines, EMPTY_LINE_FORM } from "@/hooks/useProductionLines";
import { useRoutingSummary } from "@/hooks/useRouting";
import type { ProductionLine } from "@/types/productionLine";

import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage, type FormMode } from "./components/EntityWorkspacePage";
import { useReferenceCategory, type ReferenceValueNode } from "@/hooks/useReferenceTables";
import { ConfirmDialog } from "./shared";
import { formatAppDate } from "@/utils/dateFormat";
import { PRODUCT_MODELS_BY_FAMILY_QUERY } from "@/graphql/productionLineQueries";
import type { ProductModelByFamily } from "@/types/productionLine";

const PER_PAGE = 10;

type ShiftCapacityBasis = {
  label: string;
  workingHours: number;
  breakMinutes: number;
  netHours: number;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function minutesBetween(start: unknown, end: unknown): number | null {
  if (typeof start !== "string" || typeof end !== "string") return null;
  const parse = (time: string) => {
    const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const startMin = parse(start);
  const endMin = parse(end);
  if (startMin === null || endMin === null) return null;
  return (endMin >= startMin ? endMin : endMin + 24 * 60) - startMin;
}

function getShiftCapacityBasis(shift?: ReferenceValueNode | null): ShiftCapacityBasis | null {
  if (!shift) return null;
  const metadata = shift.metadata ?? {};
  const shiftCountFromMetadata = toNumber(metadata.shiftCount ?? metadata.shifts);
  const durationHoursFromMetadata = toNumber(metadata.workingHours ?? metadata.hoursPerShift ?? metadata.shiftHours);
  const workingMinutesFromTimes = minutesBetween(metadata.startTime, metadata.endTime);
  const breakMinutesFromTimes = minutesBetween(metadata.breakStart, metadata.breakEnd);
  const breakMinutes = toNumber(metadata.breakMinutes ?? metadata.breakDurationMinutes) ?? breakMinutesFromTimes ?? 30;

  let shiftCount = shiftCountFromMetadata;
  let hoursPerShift = durationHoursFromMetadata ?? (workingMinutesFromTimes !== null ? workingMinutesFromTimes / 60 : null);
  const codeAndName = `${shift.code} ${shift.name}`.toLowerCase();

  if (!shiftCount) {
    if (codeAndName.includes("24/7")) shiftCount = 3;
    else if (codeAndName.includes("3_shift") || codeAndName.includes("3-shift")) shiftCount = 3;
    else if (codeAndName.includes("2_shift") || codeAndName.includes("2-shift") || codeAndName.includes("two-shift")) shiftCount = 2;
    else shiftCount = 1;
  }

  if (!hoursPerShift) {
    if (codeAndName.includes("12hr") || codeAndName.includes("12-hour")) hoursPerShift = 12;
    else if (codeAndName.includes("compressed_4x10")) hoursPerShift = 10;
    else hoursPerShift = 8;
  }

  const workingHours = shiftCount * hoursPerShift;
  const totalBreakMinutes = shiftCount * breakMinutes;
  const netHours = Math.max(0, workingHours - totalBreakMinutes / 60);

  return {
    label: `${netHours.toFixed(netHours % 1 === 0 ? 0 : 1)}h net / ${workingHours.toFixed(workingHours % 1 === 0 ? 0 : 1)}h scheduled (${totalBreakMinutes}m breaks)`,
    workingHours,
    breakMinutes: totalBreakMinutes,
    netHours,
  };
}

function findReferenceId(values: ReferenceValueNode[], raw: string | null | undefined): string {
  if (!raw) return "";
  const needle = raw.trim().toLowerCase();
  return values.find((v) => v.id === raw || v.code.toLowerCase() === needle || v.name.toLowerCase() === needle)?.id || "";
}

const ET: Record<string, string> = {
  defaultCalendar: "Not assigned",
  weekStartDay: "Not configured",
  timezone: "Plant default",
  productionFamily: "Not configured",
  capacityBasis: "Not configured",
  uom: "Not configured",
  lineType: "Not assigned",
  bottleneckRG: "Not configured",
  effectiveFrom: "No effective date",
  effectiveTo: "No end date",
  noDepts: "No departments linked.",
};

function FamilyModelSection({ familyValues, availableModels, familyId, modelIds, primaryModelId, onFamilyChange, onModelsChange, onPrimaryModelChange, selectClass, disabled = false }: {
  familyValues: ReferenceValueNode[];
  availableModels: ProductModelByFamily[];
  familyId: string;
  modelIds: string[];
  primaryModelId: string;
  onFamilyChange: (id: string) => void;
  onModelsChange: (ids: string[]) => void;
  onPrimaryModelChange: (id: string) => void;
  selectClass: string;
  disabled?: boolean;
}) {
  const labelClass = "text-[10px] font-medium text-slate-500 dark:text-slate-400";
  const selectedModels = availableModels.filter((model) => modelIds.includes(model.id));
  const availableUnselectedModels = availableModels.filter((model) => !modelIds.includes(model.id));

  return (
    <div className="space-y-1.5">
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: "130px 1fr" }}>
        <label className={labelClass}>Family <span className="text-red-500">*</span></label>
        <select value={familyId} onChange={(e) => onFamilyChange(e.target.value)} className={selectClass}>
          <option value="">Select</option>
          {familyValues.filter((v) => v.isActive).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div className="grid items-start gap-2" style={{ gridTemplateColumns: "130px 1fr" }}>
        <label className={labelClass}>Models <span className="text-red-500">*</span></label>
        <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50/60 p-1 dark:border-slate-700 dark:bg-slate-800/30">
          <div>
            <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Selected Models</div>
            <div className="flex max-h-14 flex-wrap gap-1 overflow-y-auto">
              {selectedModels.length > 0 ? selectedModels.map((model) => {
                const primary = primaryModelId === model.id;
                return (
                  <button key={model.id} type="button" disabled={disabled} onClick={() => onModelsChange(modelIds.filter((id) => id !== model.id))}
                    aria-pressed="true"
                    className="inline-flex min-h-6 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20">
                    <Check className="h-2.5 w-2.5 stroke-current" />
                    <span className="max-w-[180px] truncate">{model.name}</span>
                    {primary && <span className="rounded bg-blue-100 px-1 py-px text-[7px] font-bold tracking-wide text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">PRIMARY</span>}
                  </button>
                );
              }) : (
                <span className="text-[10px] text-slate-400">No models selected.</span>
              )}
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Available Models</div>
            <div className="flex max-h-14 flex-wrap gap-1 overflow-y-auto">
              {availableUnselectedModels.length > 0 ? availableUnselectedModels.map((model) => (
                <button key={model.id} type="button" disabled={disabled} onClick={() => onModelsChange([...modelIds, model.id])}
                  aria-pressed="false"
                  className="inline-flex min-h-6 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800">
                  <span className="max-w-[180px] truncate">{model.name}</span>
                </button>
              )) : (
                <span className="text-[10px] text-slate-400">{familyId ? "All available models are selected." : "Select a family first."}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: "130px 1fr" }}>
        <label className={labelClass}>Primary Model <span className="text-red-500">*</span></label>
        <select value={primaryModelId} onChange={(e) => onPrimaryModelChange(e.target.value)} disabled={disabled || selectedModels.length === 0} className={selectClass}>
          <option value="">{selectedModels.length === 0 ? "Select models first" : "Select"}</option>
          {selectedModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
        </select>
      </div>
    </div>
  );
}

function ScheduleSection({ isForm, sCls, g, s, sel, errors, setShiftModel, hasCal, capacityBasisInfo }: any) {
  return (
    <div className="shrink-0">
      <SectionCard title="Schedule">
        {isForm ? (
          <div className="space-y-1.5">
            <RefSelect category="calendar" value={g("defaultCalendarId")} onChange={(v) => s("defaultCalendarId", v)} placeholder="Select calendar" selectClass={sCls} />
            <ShiftModelSelect value={g("shiftPatternId")} onChange={setShiftModel} placeholder="Select shift model" selectClass={sCls} error={errors.shiftPatternId} />
            <div className="grid grid-cols-2 gap-1.5">
              <RefSelect category="week_start_day" value={g("weekStartDayId")} onChange={(v) => s("weekStartDayId", v)} placeholder="Select week start" selectClass={sCls} />
              <RefSelect category="timezone" value={g("timezoneId")} onChange={(v) => s("timezoneId", v)} placeholder="Select timezone" selectClass={sCls} />
            </div>
            {capacityBasisInfo && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] leading-4 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                Capacity basis set from shift: {capacityBasisInfo.label}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2">
            <div className="space-y-px">
              <InlineRow label="Calendar" value={sel?.defaultCalendar ? sel.defaultCalendar : <Badge label="Not assigned" variant="inactive" />} />
              <InlineRow label="Shift" value={<span className="inline-flex items-center gap-1">{sel?.shiftPattern || <span className="text-slate-400 text-[11px]">Not configured</span>}{sel?.shiftPattern && <Badge label="Inherited" variant="default" />}</span>} />
              <InlineRow label="Week Start" value={sel?.weekStartDay ? sel.weekStartDay : <Badge label="Not configured" variant="inactive" />} />
              <InlineRow label="Timezone" value={<span className="inline-flex items-center gap-1">{sel?.timezone || "Plant default"}{!sel?.timezone && <Badge label="Inherited" variant="default" />}</span>} />
            </div>
            <div className="flex items-center gap-2 pt-1 mt-1 border-t border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{sel?.shiftPattern ? "Line override" : "Plant default"}</span>
              {!hasCal && <Badge label="Incomplete" variant="warning" />}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function RoutingOperationsView({ sel }: { sel: any }) {
  const { summary } = useRoutingSummary(sel?.id ?? null);
  const bnName = summary?.bottleneckStepName ? `${summary.bottleneckStepName}${summary.bottleneckResourceGroupName ? ` (${summary.bottleneckResourceGroupName})` : ""}` : null;
  return (
    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2">
      <div className="space-y-px">
        <ProductionLineProductScopeSummary
          family={sel?.productFamily ?? sel?.productFamilies?.find((f: any) => f.isPrimary) ?? sel?.productFamilies?.[0] ?? null}
          models={sel?.productModels ?? []}
          primaryModelId={sel?.primaryModelId || sel?.primaryProductModel?.id}
          onMoreModels={() => {}}
        />
        <InlineRow label="Capacity" value={sel?.capacityBasis ? sel.capacityBasis : <Badge label="Not configured" variant="inactive" />} />
        <InlineRow label="UoM" value={sel?.capacityUom ? sel.capacityUom : <Badge label="Not configured" variant="inactive" />} />
        <InlineRow label="Bottleneck" value={bnName || <Badge label="N/A" variant="inactive" />} />
      </div>
      <div className="flex items-center gap-2 pt-1 mt-1 border-t border-slate-100 dark:border-slate-700 text-[10px]">
        <span className="text-slate-400 dark:text-slate-500">Constraint:</span>
        {summary?.constraintStatus === "CONSTRAINT" ? <Badge label="Yes" variant="amber" /> : <Badge label="No" variant="default" />}
      </div>
    </div>
  );
}

function RoutingSummarySection({ productionLine, navigate: nav, isNew = false, returnContext }: { productionLine: ProductionLine | null; navigate: (path: string, options?: any) => void; isNew?: boolean; returnContext?: { searchText: string; statusFilter: string } }) {
  const productionLineId = productionLine?.id ?? null;
  const { summary, loading } = useRoutingSummary(productionLineId);

  const handleOpen = useCallback(() => {
    if (!productionLineId) return;
    const listScrollTop = document.querySelector("[data-production-lines-list]")?.scrollTop ?? 0;
    const returnState = {
      restoreSelectedProductionLineId: productionLineId,
      selectedProductionLineId: productionLineId,
      selectedProductModelId: productionLine?.primaryProductModel?.id || productionLine?.primaryModelId || null,
      searchText: returnContext?.searchText ?? "",
      statusFilter: returnContext?.statusFilter ?? "all",
      listScrollTop,
      mode: "view",
    };
    const routeState = { from: window.location.pathname + window.location.search, returnState };
    if (summary?.routingId) {
      nav(`/system/production-structure/components/routing/${productionLineId}/${summary.routingId}`, { state: routeState });
    } else {
      const params = new URLSearchParams();
      const familyId = productionLine?.productFamilyId || productionLine?.productFamily?.id;
      const modelId = productionLine?.primaryProductModel?.id || productionLine?.primaryModelId || productionLine?.productModels?.find((model) => model.isPrimary)?.id;
      if (familyId) params.set("productFamilyId", familyId);
      params.set("version", "1.0");
      if (modelId) {
        params.set("productModelId", modelId);
        params.set("routingScope", "MODEL");
      }
      nav(`/system/production-structure/components/routing/${productionLineId}${params.toString() ? `?${params.toString()}` : ""}`, { state: routeState });
    }
  }, [productionLineId, productionLine, summary, nav, returnContext]);

  const isInvalid = summary?.status === "INVALID";
  const isConfigured = summary?.status === "CONFIGURED" || summary?.status === "ACTIVE";

  let statusLabel = "Missing";
  let statusVariant: "inactive" | "active" | "warning" = "inactive";
  let buttonLabel = "Create";
  if (isInvalid) { statusLabel = "Invalid"; statusVariant = "warning"; buttonLabel = "Fix"; }
  if (isConfigured) { statusLabel = "Configured"; statusVariant = "active"; buttonLabel = "Open"; }
  const primaryModel = productionLine?.primaryProductModel || productionLine?.productModels?.find((model) => model.id === productionLine?.primaryModelId || model.isPrimary) || null;
  const displaySummary = summary ?? {
    sequenceCount: 0,
    firstDepartmentName: null,
    lastDepartmentName: null,
    bottleneckStepName: null,
    bottleneckResourceGroupName: null,
    constraintStatus: null,
    routingScope: primaryModel ? "Primary Model" : "All Models",
    message: isNew ? "Save production line before creating routing." : "No routing steps configured.",
    version: null,
  };

  return (
    <div className="shrink-0">
      <SectionCard title="Flow / Routing" action={
        <SecondaryActionButton onClick={handleOpen} disabled={!productionLineId || isNew}>
          <ExternalLink className="h-3 w-3 stroke-current" /> {buttonLabel}
        </SecondaryActionButton>
      }>
        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2">
          {loading ? (
            <p className="text-[10px] text-slate-400">Loading routing...</p>
          ) : (
            <div className="space-y-px">
              <InlineRow label="Status" value={<Badge label={statusLabel} variant={statusVariant} />} />
              <InlineRow label="Version" value={displaySummary.version || "-"} />
              <InlineRow label="Routing Scope" value={displaySummary.routingScope === "All Models" && primaryModel ? "Primary Model" : displaySummary.routingScope || (primaryModel ? "Primary Model" : "All Models")} />
              {(displaySummary.routingScope !== "All Models" || primaryModel) && <InlineRow label="Model" value={primaryModel?.name || displaySummary.routingScope || "-"} />}
              <InlineRow label="Sequences" value={displaySummary.sequenceCount} />
              <InlineRow label="First Dept" value={displaySummary.firstDepartmentName || <span className="text-slate-400 text-[11px]">None</span>} />
              <InlineRow label="Last Dept" value={displaySummary.lastDepartmentName || <span className="text-slate-400 text-[11px]">None</span>} />
              {displaySummary.bottleneckStepName && <InlineRow label="Bottleneck" value={`${displaySummary.bottleneckStepName}${displaySummary.bottleneckResourceGroupName ? ` (${displaySummary.bottleneckResourceGroupName})` : ""}`} />}
              <InlineRow label="Constraint" value={displaySummary.constraintStatus || "-"} />
              <InlineRow label="Message" value={displaySummary.message || (isConfigured ? "Routing configured." : isInvalid ? "Routing has validation errors." : "No routing steps configured.")} />
            </div>
          )}
          {isInvalid && (
            <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-orange-600 dark:text-orange-400">Routing has validation errors</span>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function InlineRow({ label, value, action }: { label: string; value: React.ReactNode; action?: { text: string; onClick: () => void } }) {
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "120px 1fr auto" }}>
      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">{label}</span>
      <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200 min-w-0 truncate">{value}</span>
      {action ? <SecondaryActionButton onClick={action.onClick}>{action.text}</SecondaryActionButton> : <span />}
    </div>
  );
}

function SectionCard({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      <div className="mb-1.5 flex min-h-6 items-center gap-2">
        <h3 className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SecondaryActionButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
      {children}
    </button>
  );
}

function LineTypeSelect({ value, onChange, selectClass, error }: { value: string; onChange: (value: string) => void; selectClass: string; error?: string }) {
  const { values, loading } = useReferenceCategory("line_type");
  const options = values.filter((v) => v.isActive);

  return (
    <div>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={loading} className={selectClass}>
        <option value="">Line type</option>
        {loading && <option value="" disabled>Loading...</option>}
        {!loading && options.length === 0 && <option value="" disabled>No line types configured</option>}
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
      {error && <p className="text-[9px] text-red-500">{error}</p>}
    </div>
  );
}

function RefSelect({ category, value, onChange, placeholder, error, selectClass }: {
  category: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string; selectClass: string;
}) {
  const { values, loading } = useReferenceCategory(category);
  const options = values.filter((v) => v.isActive);
  return (
    <div>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={loading} className={selectClass}>
        <option value="">{placeholder || "Select..."}</option>
        {loading && <option value="" disabled>Loading...</option>}
        {!loading && options.length === 0 && <option value="" disabled>No options</option>}
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {error && <p className="text-[9px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function ShiftModelSelect({ value, onChange, placeholder, error, selectClass }: {
  value: string;
  onChange: (v: string, selected?: ReferenceValueNode) => void;
  placeholder?: string;
  error?: string;
  selectClass: string;
}) {
  const { values, loading } = useReferenceCategory("shift_model");
  const options = values.filter((v) => v.isActive);
  return (
    <div>
      <select value={value} onChange={(e) => {
        const selected = options.find((o) => o.id === e.target.value);
        onChange(e.target.value, selected);
      }} disabled={loading} className={selectClass}>
        <option value="">{placeholder || "Select shift model"}</option>
        {loading && <option value="" disabled>Loading...</option>}
        {!loading && options.length === 0 && <option value="" disabled>No options</option>}
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {error && <p className="text-[9px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function StatusSelect({ value, onChange, selectClass, error }: { value: string; onChange: (id: string, code: string) => void; selectClass: string; error?: string }) {
  const { values, loading } = useReferenceCategory("status");
  const options = values.filter((v) => v.isActive);
  return (
    <div>
      <select value={value} onChange={(e) => {
        const selected = options.find((o) => o.id === e.target.value);
        onChange(e.target.value, selected?.code?.toLowerCase() || "");
      }} disabled={loading} className={selectClass}>
        <option value="">Select status</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {error && <p className="text-[9px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function Badge({ label, variant = "default" }: { label: string; variant?: "active" | "inactive" | "new" | "default" | "amber" | "warning" }) {
  const m: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
    inactive: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20",
    warning: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20",
    new: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20",
    default: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
  };
  return <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ${m[variant]}`}>{label === "active" && <span className="inline-block h-1 w-1 rounded-full bg-emerald-500 mr-1 animate-pulse" />}{label}</span>;
}

export function ProductionLinesPage() {
  const navigate = useNavigate();
  const { search, setSearch, statusFilter, setStatusFilter, setFooterContent, setEntityContext, setToolbarVariant } = useToolbar();
  const registerActions = useRegisterActions();
  const { lines, loading, saveLine, archiveLine, refetch, plants } = useProductionLines(500);
  const { values: statusValues } = useReferenceCategory("status");
  const { values: shiftValues } = useReferenceCategory("shift_model");
  const { values: familyValues } = useReferenceCategory("production_family");

  const [mode, setMode] = useState<FormMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preCreateSelectedId, setPreCreateSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pendingSelId, setPendingSelId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editState, setEditState] = useState({ dirty: false, saving: false });

  useEffect(() => { setEntityContext("Line"); }, [setEntityContext]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // Restore selected line when returning from routing editor
  useEffect(() => {
    const state = (window.history.state as any)?.usr;
    if (state?.restoreSelectedProductionLineId && lines.length > 0) {
      setSelectedId(state.restoreSelectedProductionLineId);
      if (typeof state.searchText === "string") setSearch(state.searchText);
      if (typeof state.statusFilter === "string") setStatusFilter(state.statusFilter);
      if (state.mode === "view") setMode("view");
      if (typeof state.listScrollTop === "number") {
        setTimeout(() => {
          const list = document.querySelector("[data-production-lines-list]");
          if (list) list.scrollTop = state.listScrollTop;
        }, 0);
      }
      // Clear the state so it doesn't re-trigger
      window.history.replaceState({}, "");
    }
  }, [lines.length, setSearch, setStatusFilter]);

  const filtered = lines
    .filter((l: ProductionLine) => {
      const normalizedStatus = (l.status || "").toLowerCase();
      const normalizedFilter = (statusFilter || "all").toLowerCase();
      return normalizedFilter === "all" || normalizedStatus === normalizedFilter;
    })
    .filter((l) => {
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return [l.name, l.code, l.plantName].some((value) => value?.toLowerCase().includes(needle));
    });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? lines.find((l: ProductionLine) => l.id === selectedId) ?? null : null;
  const selectedRoutingSummary = useRoutingSummary(sel?.id ?? null).summary;
  const activeFamilyId = (form.productFamilyId || sel?.productFamilyId || sel?.productFamily?.id || "") as string;
  const { data: familyModelsData } = useQuery<{ productModelsByFamily: ProductModelByFamily[] }>(
    PRODUCT_MODELS_BY_FAMILY_QUERY,
    {
      variables: { familyId: activeFamilyId },
      skip: !activeFamilyId,
      fetchPolicy: "cache-and-network",
    }
  );
  const availableFamilyModels = familyModelsData?.productModelsByFamily ?? [];

  const plantOptions = plants.map((p: any) => ({ label: p.name, value: p.id }));

  const fv = (k: string) => { const v = form[k]?.trim() ?? ""; if (k === "status") return v || "active"; return v; };
  const capacityBasisInfo = useMemo(() => {
    if (!form.shiftPatternId) return null;
    const shift = form.shiftPatternRef || shiftValues.find((v) => v.id === form.shiftPatternId) || null;
    return getShiftCapacityBasis(shift);
  }, [form.shiftPatternId, form.shiftPatternRef, shiftValues]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const clearForm = useCallback(() => {
    setForm({ ...EMPTY_LINE_FORM });
    setErrors({});
  }, []);

  const loadForm = useCallback((l: ProductionLine) => {
    const resolvedStatusId = l.statusId || l.statusRef?.id || findReferenceId(statusValues, l.status);
    const resolvedShift = shiftValues.find((v) => v.id === l.shiftPatternId) || shiftValues.find((v) => v.id === l.shiftPatternRef?.id) || shiftValues.find((v) => v.name === l.shiftPattern || v.code === l.shiftPattern) || null;
    const derivedBasis = getShiftCapacityBasis(resolvedShift);
    setForm({
      name: l.name || "", code: l.code || "", status: l.status || "active", plantId: l.plantId || "",
      statusId: resolvedStatusId, lineTypeId: l.lineTypeId || "", description: l.description || "",
      shiftPattern: l.shiftPattern || "", shiftPatternId: l.shiftPatternId || resolvedShift?.id || "", shiftPatternRef: resolvedShift,
      defaultCalendarId: l.defaultCalendarId || "", weekStartDayId: l.weekStartDayId || "", timezoneId: l.timezoneId || "",
      productFamilyId: l.productFamilyId || l.productFamily?.id || l.productFamilies?.find((f) => f.isPrimary)?.id || l.productFamilies?.[0]?.id || "",
      modelIds: (l.productModels ?? []).map((m) => m.id),
      primaryModelId: l.primaryModelId || l.primaryProductModel?.id || l.productModels?.find((m) => m.isPrimary)?.id || "",
      capacityBasis: l.capacityBasis || derivedBasis?.label || "", capacityUomId: l.capacityUomId || "",
      bottleneckResourceGroupId: l.bottleneckResourceGroupId || "",
      isConstraint: !!l.isConstraint,
    });
    setErrors({});
  }, [statusValues, shiftValues]);

  const hNew = useCallback(() => {
    setPreCreateSelectedId(selectedId);
    clearForm();
    setSelectedId(null);
    setMode("create");
    setEditState((p) => ({ ...p, dirty: false }));
  }, [clearForm, selectedId]);
  const hCancel = useCallback(() => {
    setEditState((p) => ({ ...p, dirty: false }));
    if (mode === "create") {
      clearForm();
      setSelectedId(preCreateSelectedId);
      setMode("view");
      return;
    }
    if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); }
  }, [mode, sel, loadForm, clearForm, preCreateSelectedId]);

  const hSave = useCallback(async () => {
    setEditState((p) => ({ ...p, saving: true }));
    const errs: Record<string, string> = {};
    const warnings: string[] = [];
    if (!fv("name")) errs.name = "Required"; if (!fv("code")) errs.code = "Required";
    if (!fv("plantId")) errs.plantId = "Required";
    if (!fv("status")) errs.statusId = "Required";
    if (!fv("lineTypeId")) errs.lineTypeId = "Line type is required";
    const duplicate = lines.some((l) => l.id !== selectedId && l.plantId === fv("plantId") && l.code.trim().toLowerCase() === fv("code").toLowerCase());
    if (duplicate) errs.code = "Code must be unique inside the selected plant";
    if (!g("productFamilyId")) errs.productFamilyId = "Product family is required";
    const selectedModelIds = g("modelIds") ?? [];
    const invalidFamilyModel = selectedModelIds.some((id: string) => {
      const model = availableFamilyModels.find((m) => m.id === id);
      return model && model.familyId !== g("productFamilyId");
    });
    if (invalidFamilyModel) errs.modelIds = "Selected models must belong to the selected family";
    if (g("primaryModelId") && !(g("modelIds") ?? []).includes(g("primaryModelId"))) errs.primaryModelId = "Primary model must be selected";
    if (fv("capacityBasis") && !fv("capacityUomId")) errs.capacityUomId = "Required when capacity basis is set";
    const isActiveSave = fv("status").toLowerCase() === "active";
    const hasModels = selectedModelIds.length > 0;
    const hasSchedule = !!(g("shiftPatternId") || g("defaultCalendarId"));
    const hasStructure = (sel?.departmentCount ?? 0) > 0 && (sel?.groupCount ?? 0) > 0 && (sel?.resourceCount ?? 0) > 0;
    const hasConfiguredRouting = selectedRoutingSummary?.status === "CONFIGURED" || selectedRoutingSummary?.status === "ACTIVE";
    if (isActiveSave) {
      if (!hasModels) errs.modelIds = "Active lines require at least one product model";
      if (!hasSchedule) errs.shiftPatternId = "Active lines require a schedule";
      if (!hasStructure) errs._form = "Active lines require linked departments, resource groups, and resources";
      if (!hasConfiguredRouting) errs._form = errs._form ? `${errs._form}; valid routing is required` : "Active lines require valid routing";
    } else {
      if (!hasModels) warnings.push("no product models");
      if (!hasSchedule) warnings.push("no schedule");
      if (!hasStructure) warnings.push("no departments/resources");
    }
    const rgId = fv("bottleneckResourceGroupId");
    if (rgId && !sel?.resourceGroupOptions?.some((rg) => rg.id === rgId)) errs.bottleneckResourceGroupId = "Resource group must belong to this line";
    if (Object.keys(errs).length > 0) { setErrors(errs); setEditState((p) => ({ ...p, saving: false })); return; }
    const r = await saveLine({ ...EMPTY_LINE_FORM, ...form, isConstraint: !!form.isConstraint, status: (fv("status") || "active") as "active" | "inactive" }, mode === "edit" ? selectedId : null);
    setEditState((p) => ({ ...p, saving: false }));
    if (r.ok) {
      await refetch();
      if (r.line?.id) setSelectedId(r.line.id);
      setToast({ message: warnings.length > 0 ? `Draft saved with warnings: ${warnings.join(", ")}` : "Production line saved", type: "success" });
      setEditState((p) => ({ ...p, dirty: false }));
      setMode("view");
    } else {
      setErrors(r.errors ?? { _form: "Failed to save production line" });
      setToast({ message: "Failed to save production line", type: "error" });
    }
  }, [form, mode, selectedId, saveLine, refetch, lines, sel, availableFamilyModels, selectedRoutingSummary]);

  const hDelete = useCallback(async () => {
    if (!confirmDelete) return;
    await archiveLine(confirmDelete);
    setSelectedId(null); await refetch(); setConfirmDelete(null);
  }, [confirmDelete, archiveLine, refetch]);

  const selectLine = useCallback((id: string) => {
    if (editState.dirty) { setPendingSelId(id); return; }
    setSelectedId(id); if (mode === "create") { clearForm(); setMode("view"); }
  }, [editState.dirty, mode, clearForm]);

  const confirmSelectLine = useCallback(() => {
    if (!pendingSelId) return;
    if (mode === "edit" || mode === "create") { setForm({}); setEditState((p) => ({ ...p, dirty: false })); }
    setMode("view"); setSelectedId(pendingSelId); setPendingSelId(null);
  }, [pendingSelId, mode]);

  const dirty = useMemo(() => {
    if (mode === "create") return Object.values(form).some((v) => typeof v === "string" ? v.trim().length > 0 : false);
    if (mode === "edit") return editState.dirty;
    return false;
  }, [mode, form, editState.dirty]);

  const hEdit = useCallback(() => {
    if (sel) {
      loadForm(sel);
      setMode("edit");
      setEditState((p) => ({ ...p, dirty: false }));
    }
  }, [sel, loadForm]);

  useEffect(() => {
    setToolbarVariant("splitListDetail");
    if (mode === "edit" || mode === "create") {
      registerActions({ onSave: hSave, onCancel: hCancel, editLabel: "Editing Line", isDirty: dirty, isSaving: editState.saving });
    } else {
      registerActions({
        onAdd: hNew, onEdit: sel ? hEdit : undefined,
        onDelete: sel ? () => setConfirmDelete(sel.id) : undefined,
        onRefresh: () => refetch(), hasSelected: !!sel,
      });
    }
    setFooterContent(`${filtered.length} line${filtered.length !== 1 ? "s" : ""}`);
  }, [mode, sel, filtered.length, hSave, hCancel, hNew, hEdit, registerActions, refetch, dirty, editState.saving, setToolbarVariant]);

  const g = (k: string) => form[k] ?? "";
  const s = (k: string, v: any) => { setForm((p: any) => ({ ...p, [k]: v })); setEditState((p) => ({ ...p, dirty: true })); };
  const setShiftModel = useCallback((id: string, selected?: ReferenceValueNode) => {
    const resolved = selected || shiftValues.find((v) => v.id === id) || null;
    const basis = getShiftCapacityBasis(resolved);
    setForm((p: any) => ({
      ...p,
      shiftPatternId: id,
      shiftPatternRef: resolved,
      capacityBasis: basis?.label || "",
    }));
    setEditState((p) => ({ ...p, dirty: true }));
  }, [shiftValues]);
  const setProductFamilyId = useCallback((id: string) => {
    setForm((p: any) => {
      const shouldClear = id !== p.productFamilyId && (p.modelIds ?? []).length > 0
        ? window.confirm("Changing Product Family will clear assigned models that do not belong to the new family. Continue?")
        : false;
      return {
        ...p,
        productFamilyId: id,
        modelIds: shouldClear || id !== p.productFamilyId ? [] : p.modelIds,
        primaryModelId: "",
      };
    });
    setEditState((p) => ({ ...p, dirty: true }));
  }, []);
  const setModelIds = useCallback((ids: string[]) => {
    setForm((p: any) => ({
      ...p,
      modelIds: ids,
      primaryModelId: ids.includes(p.primaryModelId) ? p.primaryModelId : ids[0] || "",
    }));
    setEditState((p) => ({ ...p, dirty: true }));
  }, []);
  const isForm = mode === "edit" || mode === "create";
  const hasDepts = (sel?.departmentCount ?? 0) > 0;
  const departmentLinks = sel?.departmentLinks ?? [];
  const hasCal = !!sel?.shiftPattern || !!sel?.defaultCalendar;


  const ev = (k: string, v: string | null | undefined) => v?.trim() ? v : <span className="text-slate-400 dark:text-slate-500 text-[11px]">{ET[k] || "-"}</span>;

  const iCls = "h-7 w-full border border-slate-200 bg-white px-2 text-[11px] outline-none text-slate-700 placeholder-slate-400 transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/20";
  const sCls = "h-7 w-full border border-slate-200 bg-white px-2 text-[11px] outline-none text-slate-700 transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-amber-500 dark:focus:ring-amber-500/20";

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900 h-full">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10">
              <TrendingUpDown className="h-5 w-5 text-amber-400 dark:text-amber-300 stroke-current" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Production Line Details</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">Select a line or create a new one to view its full configuration.</p>
          </div>
        </div>
      );
    }

    const title = mode === "create" ? "New Production Line" : sel!.name;
    const code = mode !== "create" ? sel!.code : undefined;
    const plantName = mode === "create" ? (plants.find((p: any) => p.id === g("plantId"))?.name || "") : sel?.plantName || "";
    const isNew = mode === "create";
    const lt = mode === "create" ? "" : sel?.lineType;

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
        {/* ── HEADER ── */}
        <div className="shrink-0 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
              <TrendingUpDown className="h-4 w-4 stroke-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h2>
                {code && <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 px-1 py-px rounded text-slate-400 dark:text-slate-500">{code}</span>}
                {isForm && <Badge label="Editing" variant="amber" />}
                {isNew && <Badge label="New" variant="default" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                <span><Factory className="h-2.5 w-2.5 inline stroke-current mr-0.5" />{plantName}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>{ev("lineType", lt)}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <Badge label={sel?.status || "active"} variant={sel?.status === "active" ? "active" : "inactive"} />
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium ${(sel?.departmentCount ?? 0) > 0 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500"}`}>{sel?.departmentCount ?? 0} Dept</span>
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium ${(sel?.groupCount ?? 0) > 0 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500"}`}>{sel?.groupCount ?? 0} RG</span>
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium ${(sel?.resourceCount ?? 0) > 0 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500"}`}>{sel?.resourceCount ?? 0} Res</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden p-2">
            <div className="grid h-full min-h-0 grid-cols-2 gap-1.5">

              {/* ── LEFT ── */}
              <div className="flex min-h-0 flex-col overflow-hidden pr-1" style={{ gap: 6 }}>
                <div className="shrink-0">
                  <SectionCard title="Identity">
                    {isForm ? (
                      <div className="space-y-2">
                        {errors._form && (
                          <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                            {errors._form}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Name <span className="text-red-500">*</span></label>
                            <input type="text" value={g("name")} onChange={(e) => s("name", e.target.value)} placeholder="Line name" className={iCls} />
                            {errors.name && <p className="text-[9px] text-red-500 mt-0.5">{errors.name}</p>}
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Code <span className="text-red-500">*</span></label>
                            <input type="text" value={g("code")} onChange={(e) => s("code", e.target.value)} placeholder="Line code" className={iCls} />
                            {errors.code && <p className="text-[9px] text-red-500 mt-0.5">{errors.code}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Plant <span className="text-red-500">*</span></label>
                            <select value={g("plantId")} onChange={(e) => s("plantId", e.target.value)} className={sCls}><option value="">Select plant</option>{plantOptions.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                            {errors.plantId && <p className="text-[9px] text-red-500 mt-0.5">{errors.plantId}</p>}
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Status <span className="text-red-500">*</span></label>
                            <StatusSelect value={g("statusId")} onChange={(id, codeValue) => {
                              s("statusId", id);
                              s("status", codeValue || "active");
                            }} selectClass={sCls} error={errors.statusId} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Line Type</label>
                            <LineTypeSelect value={g("lineTypeId")} onChange={(v) => s("lineTypeId", v)} selectClass={sCls} error={errors.lineTypeId} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Description</label>
                          <textarea value={g("description")} onChange={(e) => s("description", e.target.value)} placeholder="Line description" rows={3} className="h-[60px] w-full border border-slate-200 bg-white px-2 py-1.5 text-[11px] outline-none resize-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2">
                        <div className="space-y-px">
                          <InlineRow label="Name" value={sel?.name} />
                          <InlineRow label="Code" value={sel?.code} />
                          <InlineRow label="Plant" value={sel?.plantName} />
                          <InlineRow label="Type" value={lt ? lt : <Badge label="Not assigned" variant="inactive" />} />
                        </div>
                      </div>
                    )}
                  </SectionCard>
                </div>

                <ScheduleSection isForm={isForm} sCls={sCls} g={g} s={s} sel={sel} errors={errors} setShiftModel={setShiftModel} hasCal={hasCal} capacityBasisInfo={capacityBasisInfo} />

                <RoutingSummarySection productionLine={sel} navigate={navigate} isNew={mode === "create"} returnContext={{ searchText: search, statusFilter }} />
              </div>

              {/* ── RIGHT ── */}
              <div className="flex min-h-0 flex-col overflow-hidden" style={{ gap: 6 }}>
                <div className="shrink-0">
                  <SectionCard title="Operations">
                    {isForm ? (
                      <div className="space-y-1.5">
                        <FamilyModelSection
                          familyValues={familyValues}
                          availableModels={availableFamilyModels}
                          familyId={g("productFamilyId")}
                          modelIds={g("modelIds")}
                          primaryModelId={g("primaryModelId")}
                          onFamilyChange={setProductFamilyId}
                          onModelsChange={setModelIds}
                          onPrimaryModelChange={(id) => s("primaryModelId", id)}
                          selectClass={sCls}
                          disabled={!g("productFamilyId")}
                        />
                        {errors.productFamilyId && <p className="text-[9px] text-red-500">{errors.productFamilyId}</p>}
                        {errors.modelIds && <p className="text-[9px] text-red-500">{errors.modelIds}</p>}
                        {errors.primaryModelId && <p className="text-[9px] text-red-500">{errors.primaryModelId}</p>}
                        <div className="grid items-start gap-2" style={{ gridTemplateColumns: "130px 1fr" }}>
                          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Capacity Basis</label>
                          <div>
                            <input type="text" value={g("capacityBasis")} readOnly disabled={!g("shiftPatternId")} placeholder="Select schedule shift first" className={`${iCls} bg-slate-50 text-slate-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-800/60 dark:text-slate-300`} />
                            <p className="mt-0.5 text-[9px] text-slate-400 dark:text-slate-500">Calculated from working hours minus break time.</p>
                          </div>
                        </div>
                        <div className="grid items-start gap-2" style={{ gridTemplateColumns: "130px 1fr" }}>
                          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">UoM</label>
                          <RefSelect category="unit_of_measure" value={g("capacityUomId")} onChange={(v) => s("capacityUomId", v)} placeholder="Select UoM" selectClass={sCls} error={errors.capacityUomId} />
                        </div>
                        <div className="grid items-start gap-2" style={{ gridTemplateColumns: "130px 1fr" }}>
                          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Bottleneck RG</label>
                          <div>
                            <select value={g("bottleneckResourceGroupId")} onChange={(e) => s("bottleneckResourceGroupId", e.target.value)} className={sCls}>
                              <option value="">Select resource group</option>
                              {(sel?.resourceGroupOptions ?? []).map((rg) => <option key={rg.id} value={rg.id}>{rg.name} {rg.departmentName ? `- ${rg.departmentName}` : ""}</option>)}
                            </select>
                            {errors.bottleneckResourceGroupId && <p className="text-[9px] text-red-500 mt-0.5">{errors.bottleneckResourceGroupId}</p>}
                          </div>
                        </div>
                        <div className="grid items-center gap-2" style={{ gridTemplateColumns: "130px 1fr" }}>
                          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Constraint Line</label>
                          <div className="flex h-7 items-center">
                            <input type="checkbox" checked={!!g("isConstraint")} onChange={(e) => s("isConstraint", e.target.checked)} className="border-slate-300" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <RoutingOperationsView sel={sel} />
                    )}
                  </SectionCard>
                </div>

                <div className="min-h-0 flex-1">
                  <SectionCard title="Departments" action={
                    hasDepts && sel?.id ? <SecondaryActionButton onClick={() => navigate(`/system/production-structure/components/dept?lineId=${sel.id}`)}>Open Departments</SecondaryActionButton> : undefined
                  } className="flex h-full min-h-0 flex-col">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Departments define available line structure. Routing defines ordered process flow.</p>
                    {mode === "create" ? (
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Save production line before assigning departments.</p>
                    ) : hasDepts ? (
                      <div className="mt-1 min-h-0 flex-1 overflow-auto">
                        {departmentLinks.length > 0 ? (
                          <div className="space-y-1">
                            {departmentLinks.map((link) => (
                              <button key={link.id} onClick={() => navigate(`/system/production-structure/components/dept?departmentId=${link.departmentId}`)}
                                className="grid w-full grid-cols-[32px_1fr_auto_auto] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-left text-[10px] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                                <span className="font-mono text-[9px] text-slate-400">{link.sequence}</span>
                                <span className="min-w-0 truncate font-medium">{link.departmentName}</span>
                                <span className="text-slate-400 dark:text-slate-500">{link.resourceGroups} RG</span>
                                <span className="text-slate-400 dark:text-slate-500">{link.resources} Res</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <Badge label={`${sel?.departmentCount ?? 0} departments`} variant="active" />
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">No department detail rows returned.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">No departments linked.</p>
                    )}
                  </SectionCard>
                </div>
              </div>
            </div>
          </div>
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-4 px-3 py-1.5 text-[9px] text-slate-400 dark:text-slate-500">
            <span>Created <span className="font-medium text-slate-500 dark:text-slate-400">{formatAppDate(sel?.createdAt) || "-"}</span></span>
            <span>Updated <span className="font-medium text-slate-500 dark:text-slate-400">{formatAppDate(sel?.updatedAt) || "-"}</span></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete production line?" message="This action cannot be undone." onConfirm={hDelete} />
      )}
      {pendingSelId && (
        <ConfirmDialog open={!!pendingSelId} onClose={() => setPendingSelId(null)} title="Discard changes?" message="You have unsaved changes. Discard them and switch lines?" onConfirm={confirmSelectLine} />
      )}
      <EntityWorkspacePage
        toolbar={null}
        list={
          <>
            <div className="shrink-0 h-9 border-b border-slate-200 dark:border-slate-700 flex items-center px-3 bg-white dark:bg-slate-900">
              <Search className="h-3 w-3 text-slate-400 stroke-current mr-2 shrink-0" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Lines</span>
              <span className="ml-auto text-[9px] text-slate-400 dark:text-slate-500 font-mono">{filtered.length}</span>
            </div>
            <div data-production-lines-list className="flex-1 overflow-y-auto bg-white pl-2 dark:bg-slate-900">
              {loading && lines.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-slate-400"><div className="h-2 w-2 rounded-full bg-amber-400 animate-bounce mr-2" />Loading...</div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <TrendingUpDown className="h-4 w-4 text-slate-300 dark:text-slate-600 mb-1.5 stroke-current" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">No production lines</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {paginated.map((ln: ProductionLine) => (
                    <div key={ln.id}
                      role="option"
                      aria-selected={selectedId === ln.id}
                      tabIndex={selectedId === ln.id ? 0 : -1}
                      onClick={() => selectLine(ln.id)}
                      className={`group flex items-center gap-2.5 px-3 cursor-pointer transition-colors duration-100 h-12 ${
                        selectedId === ln.id
                          ? "bg-amber-100/80 dark:bg-amber-900/20 border-l-[3px] border-l-amber-500 dark:border-l-amber-400 shadow-sm"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/40 border-l-[3px] border-l-transparent"
                      }`}>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        selectedId === ln.id
                          ? "bg-amber-200/80 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300"
                          : "bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-amber-900/30 dark:group-hover:text-amber-400"
                      }`}>
                        <TrendingUpDown className="h-3.5 w-3.5 stroke-current" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${selectedId === ln.id ? "text-amber-900 dark:text-amber-200" : "text-slate-800 dark:text-slate-200"}`}>{ln.name}</span>
                          {ln.code && <span className="text-[8px] font-mono bg-slate-100 dark:bg-slate-800 px-1 py-px rounded text-slate-400 dark:text-slate-500 shrink-0">{ln.code}</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase leading-tight ${ln.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                            {ln.status === "active" ? "Active" : "Inactive"}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{ln.plantName || "No plant"}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{ln.departmentCount ?? 0} Dept</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{ln.groupCount ?? 0} RG</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{ln.resourceCount ?? 0} Res</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        }
        detail={renderDetail()}
        footer={null}
      />
    </>
  );
}
