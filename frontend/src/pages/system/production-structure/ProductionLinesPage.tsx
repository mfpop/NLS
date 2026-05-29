import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Check, TrendingUpDown, Factory, ExternalLink } from "lucide-react";
import { Pagination, ProductionLineProductScopeSummary, EntityListItem, Badge, InlineRow } from "./components";
import { useProductionLineFlowContext, useProductionLines, EMPTY_LINE_FORM } from "@/hooks/useProductionLines";
import { useRoutingSummary } from "@/hooks/useRouting";
import type { ProductionLine } from "@/types/productionLine";

import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage, type FormMode } from "./components/EntityWorkspacePage";
import { useReferenceCategory, type ReferenceValueNode } from "@/hooks/useReferenceTables";
import { ConfirmDialog } from "./shared";
import { formatAppDate } from "@/utils/dateFormat";
import { PRODUCT_MODELS_BY_FAMILY_QUERY } from "@/graphql/productionLineQueries";
import type { ProductModelByFamily } from "@/types/productionLine";
import {
  ASSIGN_RG_TO_LINE_MUTATION, REMOVE_RG_FROM_LINE_MUTATION,
  REORDER_LINE_RGS_MUTATION, ACTIVATE_LINE_RG_MUTATION, DEACTIVATE_LINE_RG_MUTATION,
} from "@/graphql/productionLineMutations";
import { RESOURCE_GROUPS_QUERY } from "@/graphql/manufacturingQueries";

const PER_PAGE = 10;

const VALIDATION_GROUP_COLORS: Record<string, string> = {
  warning: "bg-warning/10 text-warning",
  primary: "bg-primary/10 text-primary",
  danger: "bg-danger/10 text-danger",
  default: "bg-muted/60 text-foreground",
  accent: "bg-accent/10 text-accent",
};

function toIssueMessage(msg: string): string {
  if (/Step \d+ uses inactive resource/i.test(msg)) return "Assigned Resource Group inactive";
  return msg;
}

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
  const labelClass = "text-[10px] font-medium text-muted-foreground";

  return (
    <div className="space-y-3">
      <div className="grid items-center gap-2 grid-cols-[130px_1fr]">
        <label className={labelClass}>Family <span className="text-danger">*</span></label>
        <select value={familyId} onChange={(e) => onFamilyChange(e.target.value)} className={selectClass}>
          <option value="">Select</option>
          {familyValues.filter((v) => v.isActive).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div>
        <label className={`${labelClass} block mb-1`}>Models <span className="text-danger">*</span></label>
        {familyId ? (
          availableModels.length > 0 ? (
             <div className="max-h-60 overflow-y-auto grid grid-cols-2 gap-px rounded border border-border/20 bg-muted/10 p-1">
              {availableModels.map((model) => {
                const selected = modelIds.includes(model.id);
                const primary = primaryModelId === model.id;
                return (
                  <label key={model.id}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-[11px] transition-colors cursor-pointer
                      ${selected ? "bg-primary/5" : "hover:bg-muted"}
                      ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onModelsChange(
                        selected ? modelIds.filter((id) => id !== model.id) : [...modelIds, model.id]
                      )}
                      disabled={disabled}
                      className="sr-only peer"
                    />
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-muted-foreground/20 bg-card transition-colors peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/30">
                      {selected && (
                        <svg className="h-3 w-3 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 truncate font-medium">{model.name}</span>
                    {selected && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onPrimaryModelChange(model.id); }}
                        className={`shrink-0 rounded px-1 py-px text-[8px] font-bold tracking-wide transition-colors
                          ${primary
                            ? "border border-warning/30 bg-warning/10 text-warning cursor-default"
                            : "border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-warning"}`}>
                        {primary ? "PRIMARY" : "Set primary"}
                      </button>
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded border border-dashed border-border/20 bg-muted/10 px-2 py-3">
              <span className="text-[10px] text-muted-foreground">No models available for this family.</span>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center rounded border border-dashed border-border/20 bg-muted/10 px-2 py-3">
            <span className="text-[10px] text-muted-foreground">Select a family first.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleSection({ isForm, sCls, g, s, sel, errors, setShiftModel, hasCal }: any) {
  return (
    <div>
      <div className="mb-1.5 inline-flex items-center rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-foreground">Schedule</div>
      <div className="mt-2">
        {isForm ? (
          <div className="space-y-1.5">
            <InlineRow label="Calendar" value={<RefSelect category="calendar" value={g("defaultCalendarId")} onChange={(v) => s("defaultCalendarId", v)} placeholder="Select calendar" selectClass={sCls} />} />
            <InlineRow label="Shift Model" value={<ShiftModelSelect value={g("shiftPatternId")} onChange={setShiftModel} placeholder="Select shift model" selectClass={sCls} error={errors.shiftPatternId} />} />
            <InlineRow label="Week Start" value={<RefSelect category="week_start_day" value={g("weekStartDayId")} onChange={(v) => s("weekStartDayId", v)} placeholder="Select week start" selectClass={sCls} />} />
            <InlineRow label="Timezone" value={<RefSelect category="timezone" value={g("timezoneId")} onChange={(v) => s("timezoneId", v)} placeholder="Select timezone" selectClass={sCls} />} />
            <InlineRow label="UoM" value={<RefSelect category="unit_of_measure" value={g("capacityUomId")} onChange={(v) => s("capacityUomId", v)} placeholder="Select UoM" selectClass={sCls} error={errors.capacityUomId} />} />
            <InlineRow label="Capacity" value={
              g("capacityBasis") ? (
                <span className="inline-flex items-center rounded border border-info/25 bg-info/10 px-1.5 py-px text-[10px] font-medium leading-tight text-info" title="Derived from selected shift/calendar">
                  {g("capacityBasis")}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Select a shift model</span>
              )
            } />
          </div>
        ) : (
          <>
            <div className="space-y-px">
              <InlineRow label="Calendar" value={sel?.defaultCalendar ? sel.defaultCalendar : <Badge label="Not assigned" variant="inactive" />} />
              <InlineRow label="Shift" value={<span className="inline-flex items-center gap-1">{sel?.shiftPattern || <span className="text-muted-foreground text-[11px]">Not configured</span>}{sel?.shiftPattern && <Badge label="Inherited" variant="default" />}</span>} />
              <InlineRow label="Week Start" value={sel?.weekStartDay ? sel.weekStartDay : <Badge label="Not configured" variant="inactive" />} />
              <InlineRow label="Timezone" value={<span className="inline-flex items-center gap-1">{sel?.timezone || "Plant default"}{!sel?.timezone && <Badge label="Inherited" variant="default" />}</span>} />
            </div>
            <div className="flex items-center gap-2 pt-1 mt-1 border-t border-border">
              <span className="text-[10px] text-muted-foreground">{sel?.shiftPattern ? "Line override" : "Plant default"}</span>
              {!hasCal && <Badge label="Incomplete" variant="warning" />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RoutingOperationsView({ sel, compact = false }: { sel: any; compact?: boolean }) {
  const { summary } = useRoutingSummary(sel?.id ?? null);
  const bnName = summary?.bottleneckStepName ? `${summary.bottleneckStepName}${summary.bottleneckResourceGroupName ? ` (${summary.bottleneckResourceGroupName})` : ""}` : null;
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2">
        <ProductionLineProductScopeSummary
          family={sel?.productFamily ?? sel?.productFamilies?.find((f: any) => f.isPrimary) ?? sel?.productFamilies?.[0] ?? null}
          models={sel?.productModels ?? []}
          primaryModelId={sel?.primaryModelId || sel?.primaryProductModel?.id}
          maxVisibleModels={compact ? 2 : 4}
          showPrimaryRow={!compact}
          onMoreModels={() => {}}
        />
        {!compact && <InlineRow label="Capacity" value={sel?.capacityBasis ? sel.capacityBasis : <Badge label="Not configured" variant="inactive" />} />}
        {!compact && <InlineRow label="UoM" value={sel?.capacityUom ? sel.capacityUom : <Badge label="Not configured" variant="inactive" />} />}
        <InlineRow label="Bottleneck" value={bnName || <Badge label="N/A" variant="inactive" />} />
      </div>
      <div className="flex items-center gap-2 pt-1.5 text-[12px]">
        <span className="font-semibold text-muted-foreground">Constraint:</span>
        {summary?.constraintStatus === "CONSTRAINT" ? <Badge label="Yes" variant="amber" /> : <Badge label="No" variant="default" />}
      </div>
    </div>
  );
}

function RoutingSummarySection({ productionLine, navigate: nav, isNew = false, isEditing = false, returnContext }: { productionLine: ProductionLine | null; navigate: (path: string, options?: any) => void; isNew?: boolean; isEditing?: boolean; returnContext?: { searchText: string; statusFilter: string } }) {
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
    const existingRoutingId = productionLine?.activeFlowRouteId || summary?.routingId;
    if (existingRoutingId) {
      nav(`/system/production-structure/components/routing/${productionLineId}/${existingRoutingId}`, { state: routeState });
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
  }, [productionLineId, productionLine, summary?.routingId, nav, returnContext]);

  const hasFlow = !!(productionLine?.activeFlowRouteId || summary?.routingId);

  let statusLabel = "MISSING";
  let statusVariant: "inactive" | "active" | "warning" = "inactive";
  let buttonLabel = "+ Create Flow";
  if (hasFlow) { statusLabel = "CONFIGURED"; statusVariant = "active"; buttonLabel = isEditing ? "Edit Flow" : "Open Flow"; }
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
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="inline-flex items-center rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-foreground">Flow / Routing</span>
        <button type="button" onClick={handleOpen} disabled={!productionLineId || isNew}
          className="ml-auto inline-flex h-5 items-center gap-1 px-1.5 text-[9px] font-semibold text-muted-foreground transition-all hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50">
          <ExternalLink className="h-3 w-3 stroke-current" /> {buttonLabel}
        </button>
      </div>
      <div className="mt-2">
        {loading ? (
          <p className="text-[10px] text-muted-foreground">Loading routing...</p>
        ) : (
          <div className="space-y-px">
            <InlineRow label="Status" value={<Badge label={statusLabel} variant={statusVariant} />} />
            <InlineRow label="Version" value={displaySummary.version || "-"} />
            <InlineRow label="Routing Scope" value={displaySummary.routingScope === "All Models" && primaryModel ? "Primary Model" : displaySummary.routingScope || (primaryModel ? "Primary Model" : "All Models")} />
            {(displaySummary.routingScope !== "All Models" || primaryModel) && <InlineRow label="Model" value={primaryModel?.name || displaySummary.routingScope || "-"} />}
            <InlineRow label="Sequences" value={displaySummary.sequenceCount} />
            <InlineRow label="First Dept" value={displaySummary.firstDepartmentName || <span className="text-muted-foreground text-[11px]">None</span>} />
            <InlineRow label="Last Dept" value={displaySummary.lastDepartmentName || <span className="text-muted-foreground text-[11px]">None</span>} />
            <InlineRow label="Calculated Bottleneck" value={displaySummary.bottleneckStepName ? `${displaySummary.bottleneckStepName}${displaySummary.bottleneckResourceGroupName ? ` (${displaySummary.bottleneckResourceGroupName})` : ""}` : <span className="text-muted-foreground text-[11px]">Not calculated</span>} />
            <InlineRow label="Current Constraint" value={displaySummary.constraintStatus ? <Badge label={displaySummary.constraintStatus === "CONSTRAINT" ? "Yes" : "No"} variant={displaySummary.constraintStatus === "CONSTRAINT" ? "amber" : "default"} /> : <span className="text-muted-foreground text-[11px]">Not calculated</span>} />
            <InlineRow label="Message" value={displaySummary.message || (hasFlow ? "Routing configured." : "No routing steps configured.")} />
          </div>
        )}
        <div className="mt-1 text-[9px] leading-tight text-muted-foreground/60">
          Calculated from routing, capacity, WIP, downtime, schedule risk, and validation data.
        </div>
        {summary?.status === "INVALID" && (
          <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-border">
            <span className="text-[10px] text-warning">Routing has validation errors</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowContextSections({ productionLine, navigate: nav, isNew = false, returnContext, onAssignModel, refetch }: { productionLine: ProductionLine | null; navigate: (path: string, options?: any) => void; isNew?: boolean; returnContext?: { searchText: string; statusFilter: string }; onAssignModel?: () => void; refetch?: () => void }) {
  const productionLineId = productionLine?.id ?? null;
  const primaryModel = productionLine?.primaryProductModel || productionLine?.productModels?.find((model) => model.id === productionLine?.primaryModelId || model.isPrimary) || null;
  const { context, loading } = useProductionLineFlowContext(productionLineId, primaryModel?.id ?? null);
  const scrollToStep = useCallback((stepIndex: number) => {
    const ids = ["", "flow-canvas-section", "material-flow-section", "validation-section"];
    const id = ids[stepIndex];
    if (id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const openRouting = useCallback(() => {
    if (!productionLineId) return;
    const returnState = {
      restoreSelectedProductionLineId: productionLineId,
      selectedProductModelId: primaryModel?.id ?? null,
      searchText: returnContext?.searchText ?? "",
      statusFilter: returnContext?.statusFilter ?? "all",
      mode: "view",
    };
    const routeState = { from: window.location.pathname + window.location.search, returnState };
    const existingRoutingId = productionLine?.activeFlowRouteId || context?.routing?.id;
    if (existingRoutingId) {
      nav(`/system/production-structure/components/routing/${productionLineId}/${existingRoutingId}`, { state: routeState });
      return;
    }
    const params = new URLSearchParams();
    const familyId = productionLine?.productFamilyId || productionLine?.productFamily?.id;
    if (familyId) params.set("productFamilyId", familyId);
    if (primaryModel?.id) {
      params.set("productModelId", primaryModel.id);
      params.set("routingScope", "MODEL");
    }
    params.set("version", "1.0");
    nav(`/system/production-structure/components/routing/${productionLineId}${params.toString() ? `?${params.toString()}` : ""}`, { state: routeState });
  }, [context?.routing?.id, productionLine?.activeFlowRouteId, nav, primaryModel?.id, productionLine, productionLineId, returnContext]);

  const operations = context?.operations ?? [];
  const validations = context?.validations ?? [];
  const bomItems = context?.bom?.items ?? [];
  const inputLocations = Array.from(new Set(operations.flatMap((operation) => operation.inputs.map((item) => item.locationName).filter(Boolean))));
  const fgDestinations = Array.from(new Set(operations.flatMap((operation) => operation.outputs.filter((item) => item.materialState === "FINISHED_GOOD").map((item) => item.locationName).filter(Boolean))));
  const outputCount = operations.reduce((sum, operation) => sum + operation.outputs.length, 0);
  const inputCount = operations.reduce((sum, operation) => sum + operation.inputs.length, 0);
  const missingMaterialBins = operations.reduce((sum, operation) => (
    sum
    + operation.inputs.filter((item) => !item.locationName).length
    + operation.outputs.filter((item) => !item.locationName).length
  ), 0);
  const routingIssues = validations.filter((item) => item.code.includes("ROUTING") || item.code.includes("STEP") || item.code.includes("SEQUENCE") || item.code.includes("DEPT"));
  const bomIssues = validations.filter((item) => item.code.includes("BOM"));
  const materialIssues = validations.filter((item) => item.code.includes("MATERIAL") || item.code.includes("LOCATION") || item.code.includes("TRANSFORMATION"));
  const resourceIssues = validations.filter((item) => item.code.includes("RESOURCE") || item.code.includes("CAPACITY") || item.code.includes("CONSTRAINT"));
  const validationGroups: Array<{ label: string; items: typeof routingIssues; color: string }> = [
    { label: "Routing errors", items: routingIssues, color: "warning" },
    { label: "BOM errors", items: bomIssues, color: "primary" },
    { label: "Material flow errors", items: materialIssues, color: "danger" },
    { label: "Resource/capacity errors", items: resourceIssues, color: "accent" },
  ];

  const hasModel = !!primaryModel || (productionLine?.productModelCount ?? 0) > 0 || (productionLine?.productModels?.length ?? 0) > 0;
  const hasFamily = !!(productionLine?.productFamily || productionLine?.productFamilyId || (productionLine?.productFamilies?.length ?? 0) > 0);
  const routingOk = !!(productionLine?.activeFlowRouteId || context?.routing?.id);
  const bomOk = !!context?.bom && context.bom.status === "ACTIVE";
  const materialOk = inputCount > 0 && outputCount > 0 && missingMaterialBins === 0;
  const blocked = !routingOk || !hasModel || !bomOk;
  const partial = !blocked && !materialOk;
  const readiness = blocked ? "Blocked" : partial ? "Partial" : "Ready";
  const readinessVariant = blocked ? "warning" : partial ? "amber" : "active";
  const readinessIcon = blocked ? "✕" : partial ? "!" : "✓";
  const missingReasons = [
    !routingOk ? "Missing Flow" : null,
    !hasModel ? "Missing Models" : null,
    !materialOk ? "Missing Material Flow" : null,
    !bomOk ? "Missing BOM" : null,
  ].filter(Boolean) as string[];
  const readinessSummary = `Line Readiness: ${Math.round(([hasModel, routingOk, materialOk, bomOk].filter(Boolean).length / 4) * 100)}%`;
  const longestCycle = operations.reduce((max, operation) => Math.max(max, operation.cycleTimeSec || 0), 0);
  const topIssues = [
    !hasFamily ? { code: "MISSING_FAMILY", message: "No product family assigned.", action: "Select Product Family", onClick: onAssignModel ?? openRouting } : null,
    !hasModel ? { code: "MISSING_MODEL", message: "No product model assigned.", action: "Assign Product Model", onClick: onAssignModel ?? openRouting } : null,
    !routingOk ? { code: "MISSING_FLOW", message: "No process flow defined.", action: "Create Process Flow", onClick: openRouting } : null,
    !bomOk ? { code: "MISSING_BOM", message: "Line cannot run: product model has no active BOM.", action: "Create BOM" } : null,
    !materialOk ? { code: "MATERIAL_FLOW", message: "No material flow defined.", action: "Define Material Flow", onClick: openRouting } : null,
    ...validations.slice(0, 2).map((item) => ({ code: item.code, message: item.message, action: "Fix" })),
  ].filter(Boolean) as Array<{ code: string; message: string; action: string; onClick?: () => void }>;
  const setupSteps = [
    { label: "Assign Product Family", done: hasFamily, action: onAssignModel ?? openRouting, step: 0 },
    { label: "Create Process Flow", done: routingOk, action: openRouting, step: 1 },
    { label: "Define Material Flow", done: materialOk, action: openRouting, step: 2 },
    { label: "Validate", done: !validations.length && !blocked && !partial, action: openRouting, step: 3 },
  ];
  const nextStepIndex = setupSteps.findIndex((step) => !step.done);
  const currentStep = nextStepIndex >= 0 ? nextStepIndex + 1 : setupSteps.length;
  const [activeTab, setActiveTab] = useState("overview");
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "rg", label: "Assigned Resource Groups" },
    { key: "flow", label: "Flow & Routing" },
    { key: "materials", label: "Materials" },
    { key: "validation", label: "Validation" },
  ] as const;

  return (
    <div className="grid h-full min-h-0 gap-1.5 overflow-hidden grid-rows-[32px_36px_minmax(0,1fr)]">
      {/* ── Row 1: Slim 32px status bar ── */}
      <div className={`flex min-h-7 items-center gap-3 border px-2.5 py-0.5 text-foreground transition-all duration-500 ${blocked ? "border-danger/15 bg-danger/5" : partial ? "border-warning/20 bg-warning/5" : "border-success/15 bg-success/5"}`}>
        <span className={`text-[11px] font-bold tracking-wide ${blocked ? "text-danger" : partial ? "text-warning" : "text-success"}`}>{readinessIcon} {readiness}</span>            {missingReasons.length > 0 && (
          <span className="text-[10px] font-semibold text-foreground/70">— {missingReasons.join(", ")}</span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <Badge label={readinessSummary} variant={readinessVariant as any} />
          <div className="flex items-center gap-0.5">
            {setupSteps.map((step, index) => (
              <button key={step.label} type="button" onClick={() => { step.action(); scrollToStep(step.step); }} title={step.label} className={`h-1.5 w-4 rounded-full ${step.done ? "bg-success" : index === nextStepIndex ? "bg-warning" : "bg-muted"}`} />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground/60">{currentStep}/4</span>
        </span>
      </div>

      {/* ── Row 2: Tab bar (36px) ── */}
      <div className="relative flex items-center gap-0.5 border-b border-border/50">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`flex h-9 items-center px-3 text-[10px] font-semibold transition-all duration-150 relative ${
              activeTab === tab.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70 hover:bg-muted"
            }`}>
            {tab.label}
            <span className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-accent transition-all duration-200 ${
              activeTab === tab.key ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
            }`} />
          </button>
        ))}
      </div>

      {/* ── Row 3: Tab content ── */}
      {activeTab === "overview" && (
        <div key="overview" className="tab-enter grid min-h-0 gap-2 overflow-hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)] grid-rows-[auto_1fr_auto]">
          {/* Left top: Identity & Schedule */}
          <div className="px-3 pb-2 pt-2 overflow-y-auto col-[1] row-[1]">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-product-master/70">Identity & Schedule</div>
            <div className="space-y-1">
              <InlineRow label="Name" value={<span className="font-bold text-muted-foreground">{productionLine?.name || "—"}</span>} />
              <InlineRow label="Code" value={<span className="font-bold text-muted-foreground">{productionLine?.code || "—"}</span>} />
              <InlineRow label="Plant" value={productionLine?.plantName || "—"} />
              <InlineRow label="Type" value={productionLine?.lineType || "—"} />
              <InlineRow label="Primary Model" value={productionLine?.primaryProductModel?.name || productionLine?.productModels?.find((m: any) => m.isPrimary)?.name || "—"} />
              <InlineRow label="Calendar" value={productionLine?.defaultCalendar || "—"} />
              <InlineRow label="Shift" value={productionLine?.shiftPattern || "—"} />
              <InlineRow label="Timezone" value={productionLine?.timezone || "Plant default"} />
              <InlineRow label="Capacity" value={productionLine?.capacityBasis || "—"} />
              <InlineRow label="UoM" value={productionLine?.capacityUom || "—"} />
            </div>
          </div>
          {/* Right top: Setup Steps */}
          <div className="px-3 pb-2 pt-2 overflow-y-auto col-[2] row-[1]">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-product-master/70">Setup Steps</div>
            <div className="space-y-1">
              {setupSteps.map((step, index) => (
                <button key={step.label} type="button" onClick={() => { step.action(); scrollToStep(step.step); }}
                  className={`flex h-7 w-full items-center gap-2 px-2 text-left text-[10px] font-medium ${step.done ? "text-success" : index === nextStepIndex ? "text-warning" : "text-muted-foreground"}`}>
                  <span>{step.done ? "✓" : index === nextStepIndex ? "!" : "○"}</span>
                  <span className="flex-1 truncate">{step.label}</span>
                  <span className="text-[10px]">{step.done ? "Done" : index === nextStepIndex ? "Next" : ""}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Left bottom: Operations (spans rows 2-3) */}
          <div className="flex flex-col overflow-hidden col-[1] row-[2/4]">
            <div className="shrink-0 px-3 pt-2 pb-1">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-product-master/70">Operations</div>
            </div>
            <div className="flex-1 min-h-0 px-3 pb-2 overflow-y-auto">
              <RoutingOperationsView sel={productionLine} compact={false} />
            </div>
          </div>
          {/* Right middle: Issues */}
          <div className="px-3 pb-2 pt-2 overflow-y-auto col-[2] row-[2]">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-product-master/70">Issues</div>
            <div className="space-y-1">
              {topIssues.length > 0 ? topIssues.slice(0, 4).map((issue) => (
                <button key={`${issue.code}-${issue.message}`} type="button" onClick={issue.onClick ?? openRouting}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[10px] text-foreground">
                  <span className="text-danger shrink-0">✕</span>
                  <span className="min-w-0 flex-1 truncate leading-tight">{issue.message}</span>
                  <span className="whitespace-nowrap font-semibold text-danger shrink-0">{issue.action}</span>
                </button>
              )) : <div className="flex h-7 items-center gap-1.5 text-[10px] text-success"><Check className="h-3 w-3" /> No issues</div>}
            </div>
          </div>
          {/* Right bottom: Validation Summary */}
          <div className="px-3 pb-2 pt-2 overflow-y-auto col-[2] row-[3]">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-product-master/70">Validation Summary</div>
            {validations.length > 0 ? (
              <div className="space-y-0.5">
                {validationGroups.filter((group) => group.items.length > 0 && group.label !== "Routing errors").slice(0, 3).map((group) => (
                  <div key={group.label} className="flex h-7 items-center justify-between px-2.5">
                    <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                    <span className="text-[9px] font-semibold text-muted-foreground">({group.items.length})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-success">
                <Check className="h-3 w-3" /> No grouped validation issues
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "rg" && (
        <div key="rg" className="tab-enter min-h-0 overflow-auto w-full">
          <AssignedResourceGroupsCard productionLine={productionLine} refetch={() => refetch?.()} />
        </div>
      )}
      {activeTab === "flow" && (
        <div key="flow" className="tab-enter grid min-h-0 gap-1.5 overflow-hidden grid-rows-[auto_minmax(0,1fr)]">
          <div className="grid grid-cols-3 gap-px bg-border/20">
            <FlatStat label="Steps" value={<span className="text-sm font-bold text-muted-foreground">{operations.length}</span>} />
            <FlatStat label="Bottleneck" value={<span className="truncate text-[11px] font-semibold text-muted-foreground">—</span>} />
            <FlatStat label="Status" value={<Badge label={routingOk ? "Configured" : "Missing"} variant={routingOk ? "active" : "warning"} />} />
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden bg-muted/30">
            <div className="flex items-center gap-2 border-b border-border/20 px-2.5 py-1.5">
              <h3 className="flex-1 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-product-master/70">Process Flow</h3>
              <button type="button" onClick={openRouting} disabled={!productionLineId || isNew}
                className="inline-flex h-6 items-center gap-1 px-2 text-[10px] font-semibold text-muted-foreground transition-all hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50">
                <ExternalLink className="h-3 w-3 stroke-current" /> {routingOk ? "Edit Flow" : "Create Flow"}
              </button>
            </div>
            {loading ? <p className="flex items-center gap-2 text-[11px] text-muted-foreground px-3 py-3"><span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />Loading flow context...</p> : operations.length > 0 ? (
              <div className="relative flex min-h-0 flex-1 flex-wrap items-center justify-center gap-3 overflow-hidden p-3">
                <div className="pointer-events-none absolute left-8 right-8 top-1/2 h-px bg-muted" />
                {operations.map((operation, index) => {
                  const missingInput = operation.inputs.length === 0;
                  const missingOutput = operation.outputs.length === 0;
                  const broken = missingInput || missingOutput;
                  const bottleneck = operation.cycleTimeSec === longestCycle && longestCycle > 0;
                  return (
                    <div key={operation.sequence} className="relative z-10 flex items-center gap-2">
                      <button type="button" onClick={openRouting}
                        className={`min-w-[168px] border px-4 py-3 text-left transition-all active:scale-[0.97] ${broken ? "border-danger/25 bg-danger/5" : bottleneck ? "border-warning/25 bg-warning/5" : "border-border/60 bg-muted/20 hover:bg-muted/40"}`}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground">#{operation.sequence}</span>
                          {bottleneck && <Badge label="Bottleneck" variant="warning" />}
                          {broken && <Badge label="Broken" variant="warning" />}
                        </div>
                        <p className="truncate text-[13px] font-bold text-muted-foreground">{operation.resourceGroupName || operation.departmentName || "Unassigned"}</p>
                        <p className="text-[11px] font-medium text-muted-foreground">{operation.cycleTimeSec}s cycle</p>
                        <div className="mt-1 space-y-0.5">
                          <div className={`truncate rounded-md px-2 py-0.5 text-[10px] font-semibold ${missingInput ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"}`}>IN: {missingInput ? "No Input" : operation.inputs.map((item) => item.materialCode || item.materialName).join(", ")}</div>
                          <div className={`truncate rounded-md px-2 py-0.5 text-[10px] font-semibold ${missingOutput ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"}`}>OUT: {missingOutput ? "No Output" : operation.outputs.map((item) => `${item.materialCode || item.materialName} ${item.materialState}`).join(", ")}</div>
                        </div>
                      </button>
                      {index < operations.length - 1 && <span className="text-2xl font-light text-muted-foreground">→</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mx-2 mb-2 flex flex-col items-center justify-center border border-dashed border-border/30 bg-muted/10 px-4 py-6">
                <div className="text-center">
                  <p className="text-[12px] font-semibold text-foreground/60">Create your first process flow</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Define how materials move through resource groups to produce finished goods.</p>
                  <SecondaryActionButton onClick={openRouting} disabled={!productionLineId || isNew} className="mt-2">Create Process Flow</SecondaryActionButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "materials" && (
        <div key="materials" className="tab-enter grid min-h-0 content-start gap-1.5 overflow-hidden grid-rows-[auto_minmax(0,1fr)]">
          <div className="grid grid-cols-3 gap-px bg-border/20">
            <FlatStat label="BOM Status" value={context?.bom ? <Badge label={context.bom.status} variant={context.bom.status === "ACTIVE" ? "active" : "inactive"} /> : <Badge label="Missing" variant="warning" />} />
            <FlatStat label="Materials" value={<span className="text-sm font-bold text-muted-foreground">{bomItems.length}</span>} />
            <FlatStat label="Locations" value={<span className="text-sm font-bold text-muted-foreground">{inputLocations.length + fgDestinations.length}</span>} />
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden bg-muted/30">
            <div className="flex items-center gap-2 border-b border-border/20 px-2.5 py-1.5">
              <h3 className="flex-1 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-product-master/70">Material Flow</h3>
              {!materialOk && (
                <SecondaryActionButton onClick={openRouting} disabled={!productionLineId || isNew}><ExternalLink className="h-3 w-3 stroke-current" /> Define Material Flow</SecondaryActionButton>
              )}
            </div>
            {!materialOk ? (
              <div className="flex flex-1 items-center justify-center mx-2 mb-2 mt-2 px-3 py-3 border border-dashed border-warning/25 bg-warning/5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                    <span>Missing:</span>
                  </div>
                  {["BOM", "RM input", "WIP output", "FG destination", "Bins"].map((item) => (
                    <span key={item} className="text-[10px] font-medium text-warning">○ {item}</span>
                  ))}
                  <SecondaryActionButton onClick={openRouting} disabled={!productionLineId || isNew} title="Define Material Flow">
                    <ExternalLink className="h-3 w-3 stroke-current" /> Define
                  </SecondaryActionButton>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[135px] flex-1 items-center justify-center bg-muted/10 mx-2 mb-2 mt-2">
                <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
                  <span>RM bins: {inputLocations.length || "—"}</span>
                  <span>→</span>
                  <span>Process outputs: {outputCount}</span>
                  <span>→</span>
                  <span>FG destinations: {fgDestinations.length || "—"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "validation" && (
          <div key="validation" className="tab-enter grid min-h-0 gap-px bg-border/20 overflow-hidden grid-cols-[2fr_1fr]">
            <div className="flex min-h-0 flex-col overflow-hidden bg-muted/30">
              <div className="flex items-center gap-2 border-b border-border/20 px-2.5 py-1.5">
                <h3 className="flex-1 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-product-master/70">Validation Groups</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
              {validations.length > 0 ? (
                <div className="flex min-h-full flex-col gap-0">
                  {validationGroups.map((group) => (
                    <div key={group.label}>
                      <div className="flex h-7 items-center justify-between gap-2 px-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${VALIDATION_GROUP_COLORS[group.color] || "text-muted-foreground"}`}>{group.label}</span>
                        <Badge label={`${group.items.length}`} variant={group.items.length ? "warning" : "active"} />
                      </div>
                      {group.items.length > 0 && (
                        <div className="space-y-px px-1.5 py-px">
                          {group.items.map((item) => (
                            <div key={`${group.label}-${item.field}-${item.code}`} className="grid items-start gap-x-2 gap-y-0 px-1.5 py-0 text-[12px] grid-cols-[auto_minmax(0,1fr)]">
                              <span className="font-mono font-semibold text-muted-foreground row-[1/3]">{item.code}</span>
                              <span className="min-w-0 line-clamp-2 whitespace-normal break-words leading-relaxed text-muted-foreground">{toIssueMessage(item.message)}</span>
                              <button type="button" onClick={openRouting} className="whitespace-nowrap justify-self-end font-semibold text-warning">Fix</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Check className="mx-auto h-5 w-5 text-success" />
                    <p className="mt-1 text-[11px] font-semibold text-success">All validations passed</p>
                    <p className="text-[10px] text-muted-foreground">Line is configured and ready.</p>
                  </div>
                </div>
              )}
            </div>
            </div>
            <div className="flex min-h-0 flex-col overflow-hidden bg-muted/30">
              <div className="flex items-center gap-2 border-b border-border/20 px-2.5 py-1.5">
                <h3 className="flex-1 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-product-master/70">Readiness</h3>
              </div>
              <div className="flex-1 p-2">
              <div className="grid grid-cols-2 gap-px bg-border/20">
                {setupSteps.map((step) => (
                  <div key={step.label} className={`flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-medium ${step.done ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"}`}>
                    <span>{step.done ? "✓" : "○"}</span>
                    <span className="flex-1 truncate">{step.label}</span>
                    <span className="text-[9px]">{step.done ? "Ready" : "Missing"}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>
        </div>
      )}
    </div>
  );
}

function FlatStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 bg-muted/30 px-2.5 py-2">
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function SecondaryActionButton({ children, onClick, disabled = false, className = "", title }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; title?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex h-6 items-center gap-1 border px-2 text-[10px] font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 border-border bg-muted text-muted-foreground hover:border-border-strong hover:bg-muted/80 ${className}`}>
      {children}
    </button>
  );
}

function IconButton({ children, onClick, disabled = false, title, active }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex h-6 w-6 items-center justify-center text-[12px] rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? "text-success hover:bg-success/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}>
      {children}
    </button>
  );
}

function PillBadge({ variant = "active", label, className = "" }: { variant?: string; label: string; className?: string }) {
  const colors: Record<string, string> = {
    active: "bg-success/10 text-success border-success/20",
    inactive: "bg-muted text-muted-foreground border-border/30",
    warning: "bg-warning/10 text-warning border-warning/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-semibold leading-tight ${colors[variant] || colors.active} ${className}`}>
      {label}
    </span>
  );
}

function AssignedResourceGroupsCard({ productionLine, refetch }: { productionLine: ProductionLine | null; refetch: () => void }) {
  const [assignRg] = useMutation(ASSIGN_RG_TO_LINE_MUTATION);
  const [removeRg] = useMutation(REMOVE_RG_FROM_LINE_MUTATION);
  const [reorderRgs] = useMutation(REORDER_LINE_RGS_MUTATION);
  const [activateRg] = useMutation(ACTIVATE_LINE_RG_MUTATION);
  const [deactivateRg] = useMutation(DEACTIVATE_LINE_RG_MUTATION);
  const [selectedAssignRgId, setSelectedAssignRgId] = useState("");
  const [confirmRemoveRgId, setConfirmRemoveRgId] = useState<string | null>(null);
  const { showSystemMessage } = useToolbar();

  const assigned: Array<{ id: string; resourceGroupId: string; resourceGroupName?: string; departmentName?: string; sequence: number; isActive: boolean }> = (productionLine as any)?.assignedResourceGroups ?? [];
  const sorted = [...assigned].sort((a, b) => a.sequence - b.sequence);

  const plantId = productionLine?.plantId;
  const { data: availableRgsData } = useQuery(RESOURCE_GROUPS_QUERY, {
    variables: { departmentId: null, limit: 500, offset: 0 },
    skip: !plantId,
  });
  const allRgs = ((availableRgsData as any)?.resourceGroups ?? []).filter(
    (rg: any) => !assigned.some((a) => a.resourceGroupId === rg.id),
  );

  const handleAssign = async (rgId: string) => {
    if (!productionLine?.id) return;
    try {
      const { data } = await assignRg({ variables: { productionLineId: productionLine.id, resourceGroupId: rgId } });
      const d = data as any;
      if (d?.assignResourceGroupToProductionLine?.ok) {
        showSystemMessage?.("Resource group assigned", "success");
        setSelectedAssignRgId("");
        void refetch();
      } else {
        const err = d?.assignResourceGroupToProductionLine?.errors?.[0];
        showSystemMessage?.(err?.message || "Failed to assign resource group", "error");
      }
    } catch { showSystemMessage?.("Failed to assign resource group", "error"); }
  };

  const handleRemove = async (rgId: string) => {
    if (!productionLine?.id) return;
    setConfirmRemoveRgId(null);
    try {
      const { data } = await removeRg({ variables: { productionLineId: productionLine.id, resourceGroupId: rgId } });
      const d = data as any;
      if (d?.removeResourceGroupFromProductionLine?.ok) {
        showSystemMessage?.("Resource group removed", "success");
        void refetch();
      } else {
        const err = d?.removeResourceGroupFromProductionLine?.errors?.[0];
        showSystemMessage?.(err?.message || "Failed to remove resource group", "error");
      }
    } catch { showSystemMessage?.("Failed to remove resource group", "error"); }
  };

  const handleMove = async (rgId: string, direction: "up" | "down") => {
    if (!productionLine?.id) return;
    const idx = sorted.findIndex((a) => a.resourceGroupId === rgId);
    if (idx === -1) return;
    const ids = sorted.map((a) => a.resourceGroupId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
    try {
      const { data } = await reorderRgs({ variables: { productionLineId: productionLine.id, orderedResourceGroupIds: ids } });
      const d = data as any;
      if (d?.reorderAssignedResourceGroups?.ok) {
        showSystemMessage?.("Reordered", "success");
        void refetch();
      } else {
        const err = d?.reorderAssignedResourceGroups?.errors?.[0];
        showSystemMessage?.(err?.message || "Failed to reorder", "error");
      }
    } catch { showSystemMessage?.("Failed to reorder", "error"); }
  };

  const handleToggleActive = async (rgId: string, currentActive: boolean) => {
    if (!productionLine?.id) return;
    try {
      const mutation = currentActive ? deactivateRg : activateRg;
      const { data: raw } = await mutation({ variables: { productionLineId: productionLine.id, resourceGroupId: rgId } });
      const d = raw as any;
      const key = currentActive ? "deactivateAssignedResourceGroup" : "activateAssignedResourceGroup";
      if (d?.[key]?.ok) {
        showSystemMessage?.(currentActive ? "Deactivated" : "Activated", "success");
        void refetch();
      } else {
        const err = d?.[key]?.errors?.[0];
        showSystemMessage?.(err?.message || "Failed to toggle", "error");
      }
    } catch { showSystemMessage?.("Failed to toggle", "error"); }
  };

  return (<>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2 pt-2 w-full">
      {/* Header with assign controls */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-entity-line/70">Assigned Resource Groups</span>
        <span className="ml-auto flex items-center gap-1.5">
          {productionLine?.id && (
            <>
              <select
                value={selectedAssignRgId}
                onChange={(e) => setSelectedAssignRgId(e.target.value)}
                className="h-7 min-w-[200px] flex-1 border border-border/35 bg-card px-2 text-[10px] text-muted-foreground outline-none focus:border-border-strong focus:ring-1 focus:ring-ring/30"
              >
                <option value="">Select RG...</option>
                {allRgs.length === 0 && <option value="" disabled>No available RGs</option>}
                {allRgs.map((rg: any) => (
                  <option key={rg.id} value={rg.id}>{rg.name} ({rg.departmentName})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { if (selectedAssignRgId) handleAssign(selectedAssignRgId); }}
                disabled={!selectedAssignRgId}
                className="inline-flex h-7 cursor-pointer items-center gap-1 rounded bg-success px-2.5 text-[10px] font-semibold text-white transition-all hover:bg-success/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Assign
              </button>
            </>
          )}
        </span>
      </div>
      {sorted.length > 0 ? (
        <div className="flex min-h-0 flex-col overflow-hidden">
          {/* Column headers */}
          <div className="grid h-7 shrink-0 grid-cols-[28px_1fr_120px_80px_110px] items-center gap-2 px-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20">
            <span>Seq</span>
            <span>Resource Group</span>
            <span>Department</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-px">
          {sorted.map((a, i) => (
            <div key={a.id} className={`grid h-8 grid-cols-[28px_1fr_120px_80px_110px] items-center gap-2 px-2 text-[11px] border-b border-border/10 hover:bg-muted/30 transition-colors rounded-sm ${a.isActive ? "" : "opacity-50"}`}>
              <span className="font-mono text-[10px] text-muted-foreground">{a.sequence}</span>
              <span className="min-w-0 truncate font-medium text-foreground">{a.resourceGroupName}</span>
              <span className="min-w-0 truncate text-muted-foreground">{a.departmentName || "—"}</span>
              <span><PillBadge variant={a.isActive ? "active" : "inactive"} label={a.isActive ? "Active" : "Inactive"} /></span>
              <span className="flex items-center justify-end gap-0.5">
                <IconButton onClick={() => handleToggleActive(a.resourceGroupId, a.isActive)} title={a.isActive ? "Deactivate" : "Activate"} active={a.isActive}>
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${a.isActive ? "bg-success" : "bg-muted-foreground"}`} />
                </IconButton>
                <IconButton onClick={() => handleMove(a.resourceGroupId, "up")} disabled={i === 0} title="Move up">
                  <svg className="h-3 w-3 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                </IconButton>
                <IconButton onClick={() => handleMove(a.resourceGroupId, "down")} disabled={i === sorted.length - 1} title="Move down">
                  <svg className="h-3 w-3 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </IconButton>
                <span className="mx-0.5 h-4 w-px bg-border/20" />
                <IconButton onClick={() => setConfirmRemoveRgId(a.resourceGroupId)} title="Remove assignment">
                  <svg className="h-3 w-3 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </IconButton>
              </span>
            </div>
          ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[72px] flex-col items-center justify-center rounded-sm border border-dashed border-border/20 bg-muted/20 px-4 text-center">
          <span className="text-[11px] font-semibold text-muted-foreground">No resource groups assigned</span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">Use the dropdown above to assign resource groups to this line.</span>
        </div>
      )}
    </div>
    {confirmRemoveRgId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setConfirmRemoveRgId(null)}>
        <div className="rounded-lg border bg-card p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-medium">Remove this resource group from the line?</p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmRemoveRgId(null)} className="h-7 rounded-md border border-border bg-card px-3 text-[11px] font-medium text-muted-foreground hover:bg-muted">Cancel</button>
            <button type="button" onClick={() => handleRemove(confirmRemoveRgId)} className="h-7 rounded-md bg-danger px-3 text-[11px] font-medium text-white hover:bg-danger/90">Remove</button>
          </div>
        </div>
      </div>
    )}
  </>);
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
      {error && <p className="text-[9px] text-danger">{error}</p>}
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
      {error && <p className="text-[9px] text-danger mt-0.5">{error}</p>}
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
      {error && <p className="text-[9px] text-danger mt-0.5">{error}</p>}
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
      {error && <p className="text-[9px] text-danger mt-0.5">{error}</p>}
    </div>
  );
}

export function ProductionLinesPage({ embeddedInFlow = false }: { embeddedInFlow?: boolean } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlProductionLineId = searchParams.get("productionLineId");
  const { search, setSearch, statusFilter, setStatusFilter, setFooterContent, setEntityContext, setToolbarVariant, showSystemMessage } = useToolbar();
  const registerActions = useRegisterActions();
  const { lines, loading, saveLine, archiveLine, refetch, plants } = useProductionLines(500);
  const { values: statusValues } = useReferenceCategory("status");
  const { values: shiftValues } = useReferenceCategory("shift_model");
  const { values: familyValues } = useReferenceCategory("production_family");

  const [mode, setMode] = useState<FormMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preCreateSelectedId, setPreCreateSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [plantFilter, setPlantFilter] = useState<string>("all");
  const [form, setForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pendingSelId, setPendingSelId] = useState<string | null>(null);
  const [editState, setEditState] = useState({ dirty: false, saving: false });

  useEffect(() => { setEntityContext("Line"); }, [setEntityContext]);

  useEffect(() => { setPage(1); }, [search, statusFilter, plantFilter]);

  useEffect(() => {
    if (!embeddedInFlow || !urlProductionLineId || lines.length === 0) return;
    const exists = lines.some((line) => line.id === urlProductionLineId);
    if (!exists) return;
    setSelectedId(urlProductionLineId);
    setMode("view");
  }, [embeddedInFlow, urlProductionLineId, lines]);

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
    .filter((l) => plantFilter === "all" || l.plantId === plantFilter)
    .filter((l) => {
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return [l.name, l.code, l.plantName].some((value) => value?.toLowerCase().includes(needle));
    });
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? lines.find((l: ProductionLine) => l.id === selectedId) ?? null : null;

  useEffect(() => {
    if (mode !== "view") return;
    if (paginated.length === 0) return;
    if (selectedId && paginated.some((p: ProductionLine) => p.id === selectedId)) return;
    setSelectedId(paginated[0].id);
  }, [paginated, selectedId, mode]);

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
  const availableFamilyModels = familyModelsData?.productModelsByFamily?.length ? familyModelsData.productModelsByFamily : (sel?.productModels?.length ? sel.productModels as unknown as ProductModelByFamily[] : []);

  const plantOptions = plants.map((p: any) => ({ label: p.name, value: p.id }));

  const fv = (k: string) => { const v = form[k]?.trim() ?? ""; if (k === "status") return v || "active"; return v; };
  const capacityBasisInfo = useMemo(() => {
    if (!form.shiftPatternId) return null;
    const shift = form.shiftPatternRef || shiftValues.find((v) => v.id === form.shiftPatternId) || null;
    return getShiftCapacityBasis(shift);
  }, [form.shiftPatternId, form.shiftPatternRef, shiftValues]);

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
    const hasStructure = (sel?.groupCount ?? 0) > 0 && (sel?.resourceCount ?? 0) > 0;
    const hasConfiguredRouting = selectedRoutingSummary?.status === "CONFIGURED" || selectedRoutingSummary?.status === "ACTIVE";
    if (isActiveSave) {
      if (!hasModels) errs.modelIds = "Active lines require at least one product model";
      if (!hasSchedule) errs.shiftPatternId = "Active lines require a schedule";
      if (!hasStructure) errs._form = "Active lines require linked resource groups and resources";
      if (!hasConfiguredRouting) errs._form = errs._form ? `${errs._form}; valid routing is required` : "Active lines require valid routing";
    } else {
      if (!hasModels) warnings.push("no product models");
      if (!hasSchedule) warnings.push("no schedule");
      if (!hasStructure) warnings.push("no resources");
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showSystemMessage(errs._form || "Please fix the validation errors", "error");
      setEditState((p) => ({ ...p, saving: false }));
      return;
    }
    const r = await saveLine({ ...EMPTY_LINE_FORM, ...form, isConstraint: !!form.isConstraint, status: (fv("status") || "active") as "active" | "inactive" }, mode === "edit" ? selectedId : null);
    setEditState((p) => ({ ...p, saving: false }));
    if (r.ok) {
      await refetch();
      if (r.line?.id) setSelectedId(r.line.id);
      showSystemMessage(warnings.length > 0 ? `Draft saved with warnings: ${warnings.join(", ")}` : "Production line saved", "success");
      setEditState((p) => ({ ...p, dirty: false }));
      setMode("view");
    } else {
      setErrors(r.errors ?? { _form: "Failed to save production line" });
      showSystemMessage(r.errors?._form || "Failed to save production line", "error");
    }
  }, [form, mode, selectedId, saveLine, refetch, lines, sel, availableFamilyModels, selectedRoutingSummary, showSystemMessage]);

  const hDelete = useCallback(async () => {
    if (!confirmDelete) return;
    await archiveLine(confirmDelete);
    setSelectedId(null); await refetch(); setConfirmDelete(null);
    showSystemMessage("Production line archived", "success");
  }, [confirmDelete, archiveLine, refetch, showSystemMessage]);

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
  const formValid = useMemo(() => {
    if (mode !== "edit" && mode !== "create") return true;
    const selectedModelIds = form.modelIds ?? [];
    const primaryModelId = form.primaryModelId ?? "";
    const requiredOk = !!(fv("name") && fv("code") && fv("plantId") && fv("status") && fv("lineTypeId") && form.productFamilyId);
    const modelsOk = selectedModelIds.length > 0 && (!primaryModelId || selectedModelIds.includes(primaryModelId));
    const capacityOk = !fv("capacityBasis") || !!fv("capacityUomId");
    const noVisibleErrors = Object.keys(errors).length === 0;
    return requiredOk && modelsOk && capacityOk && noVisibleErrors;
  }, [mode, form, errors]);

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
      registerActions({ onSave: hSave, onCancel: hCancel, editLabel: "Editing Line", isDirty: dirty, isValid: formValid, isSaving: editState.saving });
    } else {
      registerActions({
        onAdd: hNew, onEdit: sel ? hEdit : undefined,
        onDelete: sel ? () => setConfirmDelete(sel.id) : undefined,
        onRefresh: () => refetch(), hasSelected: !!sel,
      });
    }
    const created = sel?.createdAt ? formatAppDate(sel.createdAt) : null;
    const updated = sel?.updatedAt ? formatAppDate(sel.updatedAt) : null;
    const meta = created || updated ? ` · Created ${created || "-"} · Updated ${updated || "-"}` : "";
    setFooterContent(`${filtered.length} line${filtered.length !== 1 ? "s" : ""}${meta}`);
  }, [mode, sel, filtered.length, hSave, hCancel, hNew, hEdit, registerActions, refetch, dirty, formValid, editState.saving, setToolbarVariant]);

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
  const hasCal = !!sel?.shiftPattern || !!sel?.defaultCalendar;


  const ev = (k: string, v: string | null | undefined) => v?.trim() ? v : <span className="text-muted-foreground text-[11px]">{ET[k] || "-"}</span>;

  const iCls = "h-7 w-full rounded bg-card px-2 text-[11px] outline-none text-muted-foreground placeholder:text-muted-foreground transition-all shadow-inner border-b-2 border-b-transparent focus:border-b-primary";
  const sCls = "h-7 w-full rounded bg-card px-2 text-[11px] outline-none text-muted-foreground transition-all shadow-inner border-b-2 border-b-transparent focus:border-b-primary";

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className="flex flex-1 items-center justify-center bg-card">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-entity-line-bg">
              <TrendingUpDown className="h-5 w-5 text-entity-line stroke-current" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Production Line Details</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Select a line or create a new one to view its full configuration.</p>
          </div>
        </div>
      );
    }

    const title = mode === "create" ? "New Production Line" : sel!.name;
    const code = mode !== "create" ? sel!.code : undefined;
    const plantName = mode === "create" ? (plants.find((p: any) => p.id === g("plantId"))?.name || "") : sel?.plantName || "";
    const isNew = mode === "create";
    const lt = mode === "create" ? "" : sel?.lineType;
    const missingLineSetup = !plantName || !lt || (sel?.groupCount ?? 0) === 0 || (sel?.resourceCount ?? 0) === 0;

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-card">
        {/* ── HEADER ── */}
        <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/20">
          <div className="flex items-stretch gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-entity-line-bg text-entity-line ring-1 ring-entity-line/20">
              <TrendingUpDown className="h-5 w-5 stroke-current" />
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0 justify-self-start">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-sm font-bold leading-5 text-foreground">{title}</h2>
                  {code && <span className="shrink-0 rounded bg-muted/60 px-1 py-px font-mono text-[9px] text-muted-foreground">{code}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <span><Factory className="h-2.5 w-2.5 inline stroke-current mr-0.5" />{plantName || "Plant required"}</span>
                <span className="text-muted-foreground">·</span>
                <span>{ev("lineType", lt)}</span>
                </div>
              </div>
              <div className="flex min-h-9 items-center justify-center justify-self-center self-stretch text-center">
                {missingLineSetup && (
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-center text-[9px] font-semibold text-warning" title="Line setup has readiness gaps">
                    <AlertTriangle className="h-3 w-3 stroke-current" /> Setup gaps
                  </span>
                )}
              </div>
              <div className="flex min-h-7 items-center gap-1.5 justify-self-end self-stretch">
                <Badge label={sel?.status || "active"} variant={sel?.status === "active" ? "active" : "inactive"} />
                <span title="Assigned Resource Groups" className={`inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[9px] font-medium ${((sel as any)?.assignedResourceGroups?.length ?? 0) > 0 ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"}`}>{(sel as any)?.assignedResourceGroups?.length ?? 0} Assigned RG</span>
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[9px] font-medium ${(sel?.resourceCount ?? 0) > 0 ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"}`}>{sel?.resourceCount ?? 0} Res</span>
                {isForm && <Badge label="Editing" variant="amber" />}
                {isNew && <Badge label="New" variant="default" />}
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-1">
          {isForm ? (
            <div key={mode} className="mode-enter flex min-h-0 flex-col gap-2 overflow-hidden">
              {errors._form && (
                <div className="rounded-md border border-danger/25 bg-danger/10 px-2 py-1 text-[10px] text-danger">{errors._form}</div>
              )}
              {mode === "create" && (
                <div className="rounded-md border border-warning/25 bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
                  Save production line before assigning resource groups or creating flow.
                </div>
              )}
              <div className="grid min-h-0 items-start gap-5 overflow-auto p-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="flex flex-col gap-6 min-h-0 overflow-y-auto">
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-line/70">Identity</div>
                    <div className="space-y-1.5">
                    <div className="grid grid-cols-2 items-start gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Name <span className="text-danger">*</span></label>
                        <input type="text" value={g("name")} onChange={(e) => s("name", e.target.value)} placeholder="Line name" className={iCls} />
                        {errors.name && <p className="text-[9px] text-danger mt-0.5">{errors.name}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Code <span className="text-danger">*</span></label>
                        <input type="text" value={g("code")} onChange={(e) => s("code", e.target.value)} placeholder="Line code" className={iCls} />
                        {errors.code && <p className="text-[9px] text-danger mt-0.5">{errors.code}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 items-start gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Plant <span className="text-danger">*</span></label>
                        <select value={g("plantId")} onChange={(e) => s("plantId", e.target.value)} className={sCls}><option value="">Select plant</option>{plantOptions.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                        {errors.plantId && <p className="text-[9px] text-danger mt-0.5">{errors.plantId}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Status <span className="text-danger">*</span></label>
                        <StatusSelect value={g("statusId")} onChange={(id, cv) => { s("statusId", id); s("status", cv || "active"); }} selectClass={sCls} error={errors.statusId} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 items-start gap-2">
                      <LineTypeSelect value={g("lineTypeId")} onChange={(v) => s("lineTypeId", v)} selectClass={sCls} error={errors.lineTypeId} />
                    </div>
                    <textarea value={g("description")} onChange={(e) => s("description", e.target.value)} placeholder="Description" rows={2} className="max-h-[72px] min-h-[52px] w-full resize-none rounded bg-card px-2 py-1.5 text-[11px] outline-none text-muted-foreground placeholder:text-muted-foreground transition-all shadow-inner border-b-2 border-b-transparent focus:border-b-primary" />
                  </div>
                  </div>
                  <div className="mode-stagger-2">
                    <ScheduleSection isForm={true} sCls={sCls} g={g} s={s} sel={sel} errors={errors} setShiftModel={setShiftModel} hasCal={hasCal} capacityBasisInfo={capacityBasisInfo} />
                  </div>
                  <div className="mode-stagger-3">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-entity-line/70">Operations</div>
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
                    {errors.productFamilyId && <p className="text-[9px] text-danger">{errors.productFamilyId}</p>}
                    {errors.modelIds && <p className="text-[9px] text-danger">{errors.modelIds}</p>}
                    {errors.primaryModelId && <p className="text-[9px] text-danger">{errors.primaryModelId}</p>}
                    <div className="mt-1.5 space-y-1.5">

                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
                  <div>
                    <RoutingSummarySection productionLine={sel} navigate={navigate} isNew={mode === "create"} isEditing={true} returnContext={{ searchText: search, statusFilter }} />
                  </div>
                  <AssignedResourceGroupsCard productionLine={sel} refetch={() => refetch?.()} />
                </div>
              </div>
            </div>
          ) : (
            <div key={mode} className="mode-enter flex-1 flex flex-col min-h-0">
              <FlowContextSections productionLine={sel} navigate={navigate} returnContext={{ searchText: search, statusFilter }} onAssignModel={() => setMode("edit")} refetch={refetch} />
            </div>
          )}
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
        hideList={embeddedInFlow}
        toolbar={null}
        list={
          <>
            <div className="shrink-0 border-b border-border/35 flex h-9 items-center px-3 bg-muted">
              <select value={plantFilter} onChange={(event) => setPlantFilter(event.target.value)}
                className="h-6 w-full min-w-0 rounded border border-border/35 bg-transparent px-2 text-[11px] text-muted-foreground outline-none transition-colors focus:border-border/50 focus:bg-card focus:ring-1 focus:ring-border/20">
                <option value="all">All Plants</option>
                {plants.map((plant: any) => <option key={plant.id} value={plant.id}>{plant.code} - {plant.name}</option>)}
              </select>
            </div>
            <div data-production-lines-list className="flex-1 overflow-y-auto bg-muted pl-2">
              {loading && lines.length === 0 ? (
                <div className="flex min-h-full items-center justify-center text-xs text-muted-foreground"><span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
              ) : paginated.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center text-center px-4">
                  <TrendingUpDown className="h-5 w-5 text-muted-foreground/40 mb-2 stroke-current" />
                  <p className="text-xs font-medium text-muted-foreground">No production lines</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Create one to get started</p>
                </div>
              ) : (
                <div className="py-1">
                  {paginated.map((ln: ProductionLine) => (
                    <EntityListItem key={ln.id}
                      name={ln.name} code={ln.code}
                      meta={ln.plantName || "Plant required"}
                      icon={<TrendingUpDown className="h-3.5 w-3.5 stroke-current" />}
                      selected={selectedId === ln.id}
                      status={ln.status}
                      onClick={() => selectLine(ln.id)}
                      entityType="line" />
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 flex h-7 items-center border-t border-border bg-muted px-3">
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
