import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Check, TrendingUpDown, Factory, Search, ExternalLink } from "lucide-react";
import { Pagination, ProductionLineProductScopeSummary, EntityListItem } from "./components";
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
  const labelClass = "text-[10px] font-medium text-muted-foreground";
  const selectedModels = availableModels.filter((model) => modelIds.includes(model.id));
  const availableUnselectedModels = availableModels.filter((model) => !modelIds.includes(model.id));

  return (
    <div className="space-y-1.5">
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: "130px 1fr" }}>
        <label className={labelClass}>Family <span className="text-danger">*</span></label>
        <select value={familyId} onChange={(e) => onFamilyChange(e.target.value)} className={selectClass}>
          <option value="">Select</option>
          {familyValues.filter((v) => v.isActive).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div className="grid items-start gap-2" style={{ gridTemplateColumns: "130px 1fr" }}>
        <label className={labelClass}>Models <span className="text-danger">*</span></label>
        <div className="space-y-1 rounded-md border border-border bg-muted p-1 border-border bg-muted">
          <div>
            <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Selected Models</div>
            <div className={`flex flex-wrap gap-1 ${selectedModels.length > 4 ? "max-h-24 overflow-y-auto" : "overflow-visible"}`}>
              {selectedModels.length > 0 ? selectedModels.map((model) => {
                const primary = primaryModelId === model.id;
                return (
                  <button key={model.id} type="button" disabled={disabled} onClick={() => onModelsChange(modelIds.filter((id) => id !== model.id))}
                    aria-pressed="true"
                    className="inline-flex min-h-6 items-center gap-1 rounded-full border border-primary bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary shadow-sm transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 border-primary bg-primary text-primary hover:bg-primary">
                    <Check className="h-2.5 w-2.5 stroke-current" />
                    <span className="max-w-[180px] truncate">{model.name}</span>
                    {primary && <span className="rounded bg-primary px-1 py-px text-[7px] font-bold tracking-wide text-primary bg-primary text-primary">PRIMARY</span>}
                  </button>
                );
              }) : (
                <span className="text-[10px] text-muted-foreground">No models selected.</span>
              )}
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Available Models</div>
            <div className="flex max-h-14 flex-wrap gap-1 overflow-y-auto">
              {availableUnselectedModels.length > 0 ? availableUnselectedModels.map((model) => (
                <button key={model.id} type="button" disabled={disabled} onClick={() => onModelsChange([...modelIds, model.id])}
                  aria-pressed="false"
                  className="inline-flex min-h-6 items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[9px] font-semibold text-muted-foreground transition-colors hover:border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 border-border bg-muted text-muted-foreground hover:border-border hover:bg-muted">
                  <span className="max-w-[180px] truncate">{model.name}</span>
                </button>
              )) : (
                <span className="text-[10px] text-muted-foreground">{familyId ? "All available models are selected." : "Select a family first."}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: "130px 1fr" }}>
        <label className={labelClass}>Primary Model <span className="text-danger">*</span></label>
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
              <div className="rounded-md border border-warning bg-warning px-2 py-1 text-[10px] leading-4 text-warning border-warning bg-warning text-warning">
                Capacity basis set from shift: {capacityBasisInfo.label}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-2">
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
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function RoutingOperationsView({ sel, compact = false }: { sel: any; compact?: boolean }) {
  const { summary } = useRoutingSummary(sel?.id ?? null);
  const bnName = summary?.bottleneckStepName ? `${summary.bottleneckStepName}${summary.bottleneckResourceGroupName ? ` (${summary.bottleneckResourceGroupName})` : ""}` : null;
  return (
    <div className="rounded-lg bg-muted p-2 bg-muted">
      <div className="space-y-2">
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
      <div className="mt-2 flex items-center gap-2 border-t border-border pt-2 text-[12px] border-border">
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
    <div className="shrink-0">
      <SectionCard title="Flow / Routing" action={
        <SecondaryActionButton onClick={handleOpen} disabled={!productionLineId || isNew}>
          <ExternalLink className="h-3 w-3 stroke-current" /> {buttonLabel}
        </SecondaryActionButton>
      }>
        <div className="bg-muted rounded-lg p-2">
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
              {displaySummary.bottleneckStepName && <InlineRow label="Bottleneck" value={`${displaySummary.bottleneckStepName}${displaySummary.bottleneckResourceGroupName ? ` (${displaySummary.bottleneckResourceGroupName})` : ""}`} />}
              <InlineRow label="Constraint" value={displaySummary.constraintStatus || "-"} />
              <InlineRow label="Message" value={displaySummary.message || (hasFlow ? "Routing configured." : "No routing steps configured.")} />
            </div>
          )}
          {summary?.status === "INVALID" && (
            <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-border">
              <span className="text-[10px] text-warning">Routing has validation errors</span>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function getLineListReadiness(line: ProductionLine): { icon: string; label: string; tone: "ready" | "partial" | "blocked"; reason: string } {
  const hasModel = (line.productModelCount ?? line.productModels?.length ?? 0) > 0 || !!line.primaryProductModel || !!line.primaryModelId;
  const hasFlow = !!line.activeFlowRouteId || line.flowRoutingStatus === "CONFIGURED";
  if (!hasFlow) return { icon: "✕", label: "Blocked", tone: "blocked", reason: "Missing flow" };
  if (!hasModel) return { icon: "!", label: "Partial", tone: "partial", reason: "No product model" };
  return { icon: "✓", label: "Ready", tone: "ready", reason: "Configured baseline" };
}

function FlowContextSections({ productionLine, navigate: nav, isNew = false, returnContext, onAssignModel }: { productionLine: ProductionLine | null; navigate: (path: string, options?: any) => void; isNew?: boolean; returnContext?: { searchText: string; statusFilter: string }; onAssignModel?: () => void }) {
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
  const validationGroups = [
    { label: "Routing errors", items: routingIssues },
    { label: "BOM errors", items: bomIssues },
    { label: "Material flow errors", items: materialIssues },
    { label: "Resource/capacity errors", items: resourceIssues },
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
    { key: "flow", label: "Flow & Routing" },
    { key: "materials", label: "Materials" },
    { key: "validation", label: "Validation" },
  ] as const;

  return (
    <div className="grid h-full min-h-0 gap-1.5 overflow-hidden" style={{ gridTemplateRows: "32px 36px minmax(0,1fr)" }}>
      {/* ── Row 1: Slim 32px status bar ── */}
      <div className={`flex items-center gap-3 rounded-lg border px-2.5 py-1 text-foreground ${blocked ? "border-danger/25 bg-danger/10" : partial ? "border-warning/30 bg-warning/10" : "border-success/25 bg-success/10"}`}>
        <span className={`text-[11px] font-bold ${blocked ? "text-danger" : partial ? "text-warning" : "text-success"}`}>{readinessIcon} {readiness}</span>
        {missingReasons.length > 0 && (
          <span className="text-[10px] font-semibold text-foreground">— {missingReasons.join(", ")}</span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <Badge label={readinessSummary} variant={readinessVariant as any} />
          <div className="flex items-center gap-0.5">
            {setupSteps.map((step, index) => (
              <button key={step.label} type="button" onClick={() => { step.action(); scrollToStep(step.step); }} title={step.label} className={`h-1.5 w-4 rounded-full ${step.done ? "bg-success" : index === nextStepIndex ? "bg-warning" : "bg-muted"}`} />
            ))}
          </div>
          <span className="text-[8px] font-semibold opacity-70">{currentStep}/4</span>
        </span>
      </div>

      {/* ── Row 2: Tab bar (36px) ── */}
      <div className="flex items-center gap-0.5 border-b border-border/50">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`flex h-9 items-center border-b-2 px-3 text-[10px] font-semibold transition-colors ${
              activeTab === tab.key
                ? "border-accent bg-accent/10 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Row 3: Tab content ── */}
      {activeTab === "overview" && (
        <div className="grid min-h-0 items-start gap-1.5 overflow-hidden" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {/* ── LEFT COLUMN: Identity, Operations ── */}
          <div className="flex flex-col gap-1.5 overflow-hidden">
            <div className="rounded-lg border border-border/60 bg-card px-3 pb-2 pt-2 shadow-sm shadow-foreground/5">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Identity & Schedule</div>
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
            <SectionCard title="Operations" className="overflow-hidden">
              <RoutingOperationsView sel={productionLine} compact={false} />
            </SectionCard>
          </div>

          {/* ── RIGHT COLUMN: Departments, Setup & Issues, Validation Summary ── */}
          <div className="flex flex-col gap-1.5 overflow-hidden">
            <SectionCard title="Departments / Structure" className="overflow-hidden" action={
              productionLine?.id ? <SecondaryActionButton onClick={() => nav(`/system/production-structure/components/dept?lineId=${productionLine.id}`)}>Manage</SecondaryActionButton> : undefined
            }>
              {productionLine?.departmentLinks && productionLine.departmentLinks.length > 0 ? (
                <div className="space-y-1 overflow-hidden">
                  {productionLine.departmentLinks.slice(0, 6).map((link: any) => (
                    <button key={link.id} onClick={() => nav(`/system/production-structure/components/dept?departmentId=${link.departmentId}`)}
                      className="grid h-6 w-full grid-cols-[28px_1fr_auto_auto] items-center gap-1.5 rounded-md bg-muted px-2 text-left text-[11px] text-muted-foreground hover:bg-muted/80">
                      <span className="font-mono text-[10px] text-muted-foreground">{link.sequence}</span>
                      <span className="min-w-0 truncate font-medium">{link.departmentName}</span>
                      <span className="text-muted-foreground">{link.resourceGroups} RG</span>
                      <span className="text-muted-foreground">{link.resources} Res</span>
                    </button>
                  ))}
                  {productionLine.departmentLinks.length > 6 && (
                    <div className="flex h-6 items-center rounded-md bg-muted px-2 text-[10px] font-semibold text-muted-foreground">
                      +{productionLine.departmentLinks.length - 6} more departments
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[108px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted">
                  <span className="text-[10px] text-muted-foreground">No departments linked</span>
                </div>
              )}
            </SectionCard>
            <SectionCard title="Setup & Issues" className="overflow-hidden">
              <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Setup Steps</div>
                    {setupSteps.map((step, index) => (
                      <button key={step.label} type="button" onClick={() => { step.action(); scrollToStep(step.step); }}
                        className={`flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[10px] font-medium ${step.done ? "bg-success/10 text-success" : index === nextStepIndex ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                        <span>{step.done ? "✓" : index === nextStepIndex ? "!" : "○"}</span>
                        <span className="flex-1 truncate">{step.label}</span>
                        <span className="text-[8px]">{step.done ? "Done" : index === nextStepIndex ? "Next" : ""}</span>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Issues</div>
                    {topIssues.length > 0 ? topIssues.slice(0, 4).map((issue) => (
                      <button key={`${issue.code}-${issue.message}`} type="button" onClick={issue.onClick ?? openRouting}
                        className="flex h-7 w-full items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-2 text-left text-[10px] font-semibold text-foreground hover:bg-danger/15">
                        <span className="text-danger">✕</span>
                        <span className="min-w-0 flex-1 truncate">{issue.message}</span>
                        <span className="shrink-0 whitespace-nowrap font-semibold text-danger">{issue.action}</span>
                      </button>
                    )) : <div className="flex h-7 items-center gap-1.5 text-[10px] text-success"><Check className="h-3 w-3" /> No issues</div>}
                  </div>
              </div>
            </SectionCard>
            <SectionCard title="Validation Summary" className="overflow-hidden">
              {validations.length > 0 ? (
                <div className="space-y-0.5">
                  {validationGroups.filter((group) => group.items.length > 0 && group.label !== "Routing errors").slice(0, 3).map((group) => (
                    <div key={group.label} className="flex h-7 items-center justify-between rounded bg-muted px-2.5">
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
            </SectionCard>
          </div>
        </div>
      )}

      {activeTab === "flow" && (
        <div className="grid min-h-0 gap-1.5 overflow-hidden" style={{ gridTemplateRows: "auto minmax(0,1fr) auto" }}>
          <div className="grid grid-cols-3 gap-1.5">
            <SectionCard title="Steps"><div className="text-sm font-bold text-muted-foreground">{operations.length}</div></SectionCard>
            <SectionCard title="Bottleneck"><div className="truncate text-[11px] font-semibold text-muted-foreground">—</div></SectionCard>
            <SectionCard title="Status"><Badge label={routingOk ? "Configured" : "Missing"} variant={routingOk ? "active" : "warning"} /></SectionCard>
          </div>
          <SectionCard title="Process Flow" className="flex min-h-0 flex-col overflow-hidden" action={
            <SecondaryActionButton onClick={openRouting} disabled={!productionLineId || isNew}>
              <ExternalLink className="h-3 w-3 stroke-current" /> {routingOk ? "Edit Flow" : "Create Flow"}
            </SecondaryActionButton>
          }>
            {loading ? <p className="text-[10px] text-muted-foreground">Loading flow context...</p> : operations.length > 0 ? (
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
                        className={`min-w-[168px] rounded-xl border px-4 py-3 text-left shadow-sm shadow-foreground/5 transition-all hover:shadow-md active:scale-[0.97] ${broken ? "border-danger/25 bg-danger/10" : bottleneck ? "border-warning/25 bg-warning/10" : "border-border/60 bg-card hover:bg-muted"}`}>
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
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted">
                <div className="text-center">
                  <p className="text-sm font-bold text-muted-foreground">Create your first process flow</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Define how materials move through resource groups to produce finished goods.</p>
                  <SecondaryActionButton onClick={openRouting} disabled={!productionLineId || isNew} className="mt-2">Create Process Flow</SecondaryActionButton>
                </div>
              </div>
            )}
          </SectionCard>
          {topIssues.length > 0 && (
            <div className="flex gap-1.5 overflow-hidden">
              {topIssues.slice(0, 3).map((issue) => (
                <button key={`${issue.code}-${issue.message}`} type="button" onClick={issue.onClick ?? openRouting}
                  className="flex h-7 items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-2 text-left text-[10px] font-semibold text-foreground shadow-xs hover:bg-danger/15">
                  <span className="text-danger">✕</span>
                  <span className="truncate">{issue.message}</span>
                  <span className="shrink-0 font-semibold text-danger">{issue.action}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "materials" && (
        <div className="grid min-h-0 content-start gap-1.5 overflow-hidden" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
          <div className="grid grid-cols-3 gap-1.5">
            <SectionCard title="BOM Status">{context?.bom ? <Badge label={context.bom.status} variant={context.bom.status === "ACTIVE" ? "active" : "inactive"} /> : <Badge label="Missing" variant="warning" />}</SectionCard>
            <SectionCard title="Materials"><div className="text-sm font-bold text-muted-foreground">{bomItems.length}</div></SectionCard>
            <SectionCard title="Locations"><div className="text-sm font-bold text-muted-foreground">{inputLocations.length + fgDestinations.length}</div></SectionCard>
          </div>
          <SectionCard title="Material Flow" className="min-h-0 overflow-hidden" action={!materialOk ? (
            <SecondaryActionButton onClick={openRouting} disabled={!productionLineId || isNew}><ExternalLink className="h-3 w-3 stroke-current" /> Define Material Flow</SecondaryActionButton>
          ) : undefined}>
            {!materialOk ? (
              <div className="flex min-h-[135px] items-center justify-center rounded-lg border border-dashed border-warning/25 bg-warning/10 px-4">
                <div className="max-w-md text-center">
                  <AlertTriangle className="mx-auto h-5 w-5 text-warning" />
                  <p className="mt-2 text-sm font-bold text-muted-foreground">Material flow is incomplete</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Production lines need input raw material, WIP/FG outputs, and source/destination locations before flow readiness can be trusted.</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {["BOM", "RM input", "WIP output", "FG destination", "Bins"].map((item) => (
                      <span key={item} className="rounded-full bg-card px-2 py-0.5 text-[9px] font-semibold text-warning ring-1 ring-warning/25">○ {item}</span>
                    ))}
                  </div>
                  <button type="button" onClick={openRouting} disabled={!productionLineId || isNew} className="mt-2 rounded-md border border-warning/25 bg-warning/10 px-3 py-1.5 text-[11px] font-bold text-warning shadow-sm hover:bg-warning/15 disabled:cursor-not-allowed disabled:opacity-50">Define Material Flow</button>
                </div>
              </div>
            ) : (
              <div className="grid min-h-[180px] place-items-center rounded-lg bg-muted">
                <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
                  <span>RM bins: {inputLocations.length || "—"}</span>
                  <span>→</span>
                  <span>Process outputs: {outputCount}</span>
                  <span>→</span>
                  <span>FG destinations: {fgDestinations.length || "—"}</span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {activeTab === "validation" && (
          <div className="grid min-h-0 gap-1.5 overflow-hidden" style={{ gridTemplateColumns: "2fr 1fr" }}>
            <SectionCard title="Validation Groups" className="min-h-0 overflow-hidden">
            {validations.length > 0 ? (
              <div className="h-full space-y-1 overflow-hidden">
                {validationGroups.map((group) => (
                  <div key={group.label} className="rounded bg-muted">
                    <div className="flex h-8 items-center justify-between px-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                      <Badge label={`${group.items.length}`} variant={group.items.length ? "warning" : "active"} />
                    </div>
                    {group.items.length > 0 && (
                      <div className="space-y-0.5 px-2 pb-1.5">
                        {group.items.map((item) => (
                          <div key={`${group.label}-${item.field}-${item.code}`} className="flex h-8 items-center gap-2 rounded bg-card px-2 text-[10px]">
                            <span className="font-mono font-semibold text-muted-foreground">{item.code}</span>
                            <span className="min-w-0 flex-1 truncate font-medium text-muted-foreground">{item.message}</span>
                            <button type="button" onClick={openRouting} className="shrink-0 font-bold text-warning">Fix</button>
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
          </SectionCard>
          <div className="min-h-0 overflow-hidden">
            <SectionCard title="Readiness" className="min-h-0 overflow-hidden">
              <div className="grid grid-cols-2 gap-1.5">
                {setupSteps.map((step) => (
                  <div key={step.label} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${step.done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    <span>{step.done ? "✓" : "○"}</span>
                    <span className="flex-1 truncate">{step.label}</span>
                    <span className="text-[8px]">{step.done ? "Ready" : "Missing"}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineRow({ label, value, action }: { label: string; value: React.ReactNode; action?: { text: string; onClick: () => void } }) {
  return (
    <div className="grid min-h-5 items-center gap-2" style={{ gridTemplateColumns: "120px 1fr auto" }}>
      <span className="truncate text-[12px] font-semibold text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">{value}</span>
      {action ? <SecondaryActionButton onClick={action.onClick}>{action.text}</SecondaryActionButton> : <span />}
    </div>
  );
}

function SectionCard({ id, title, action, children, className = "" }: { id?: string; title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`rounded-lg border border-border bg-card px-3 pb-2 pt-2 shadow-xs border-border bg-muted ${className}`}>
      <div className="mb-1.5 flex min-h-5 items-center gap-2">
        <h3 className="flex-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SecondaryActionButton({ children, onClick, disabled = false, className = "" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex h-5 items-center gap-1 rounded-md border border-border bg-card px-1.5 text-[9px] font-semibold text-muted-foreground transition-all hover:bg-muted hover:border-border active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 border-border bg-muted text-muted-foreground hover:border-border hover:bg-muted ${className}`}>
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

function Badge({ label, variant = "default" }: { label: string; variant?: "active" | "inactive" | "new" | "default" | "amber" | "warning" }) {
  const m: Record<string, string> = {
    active: "bg-success/10 text-success border border-success/20",
    inactive: "bg-muted text-muted-foreground border border-border/60",
    amber: "bg-warning/10 text-warning border border-warning/25",
    warning: "bg-warning/10 text-warning border border-warning/25",
    new: "bg-primary/10 text-primary border border-primary/20",
    default: "bg-muted text-muted-foreground border border-border/60",
  };
  return <span className={`inline-flex items-center rounded-md px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${m[variant]}`}>{label === "active" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-success mr-1 animate-pulse" />}{label}</span>;
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
  const [form, setForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pendingSelId, setPendingSelId] = useState<string | null>(null);
  const [editState, setEditState] = useState({ dirty: false, saving: false });

  useEffect(() => { setEntityContext("Line"); }, [setEntityContext]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

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
  const hasDepts = (sel?.departmentCount ?? 0) > 0;
  const departmentLinks = sel?.departmentLinks ?? [];
  const hasCal = !!sel?.shiftPattern || !!sel?.defaultCalendar;


  const ev = (k: string, v: string | null | undefined) => v?.trim() ? v : <span className="text-muted-foreground text-[11px]">{ET[k] || "-"}</span>;

  const iCls = "h-7 w-full border border-border bg-card px-2 text-[11px] outline-none text-muted-foreground placeholder:text-muted-foreground transition-all focus:border-warning focus:ring-2 focus:ring-warning border-border bg-muted text-muted-foreground dark:focus:border-warning dark:focus:ring-warning";
  const sCls = "h-7 w-full border border-border bg-card px-2 text-[11px] outline-none text-muted-foreground transition-all focus:border-warning focus:ring-2 focus:ring-warning border-border bg-muted text-muted-foreground dark:focus:border-warning dark:focus:ring-warning";

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className="flex flex-1 items-center justify-center bg-card bg-muted h-full">
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
    const missingLineSetup = !plantName || !lt || (sel?.departmentCount ?? 0) === 0 || (sel?.groupCount ?? 0) === 0 || (sel?.resourceCount ?? 0) === 0;

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-card bg-muted">
        {/* ── HEADER ── */}
        <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border">
          <div className="flex items-stretch gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center text-warning">
              <TrendingUpDown className="h-4 w-4 stroke-current" />
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0 justify-self-start">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-[16px] font-bold leading-5 text-muted-foreground">{title}</h2>
                  {code && <span className="shrink-0 rounded bg-muted px-1 py-px font-mono text-[9px] text-muted-foreground bg-muted text-muted-foreground">{code}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <span><Factory className="h-2.5 w-2.5 inline stroke-current mr-0.5" />{plantName || "Plant required"}</span>
                <span className="text-muted-foreground">·</span>
                <span>{ev("lineType", lt)}</span>
                </div>
              </div>
              <div className="flex min-h-9 items-center justify-center justify-self-center self-stretch text-center">
                {missingLineSetup && (
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-warning bg-warning px-2 py-0.5 text-center text-[9px] font-semibold text-warning border-warning bg-warning text-warning" title="Line setup has readiness gaps">
                    <AlertTriangle className="h-3 w-3 stroke-current" /> Setup gaps
                  </span>
                )}
              </div>
              <div className="flex min-h-7 items-center gap-1.5 justify-self-end self-stretch">
                <Badge label={sel?.status || "active"} variant={sel?.status === "active" ? "active" : "inactive"} />
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[9px] font-medium ${(sel?.departmentCount ?? 0) > 0 ? "bg-muted text-muted-foreground bg-muted text-muted-foreground" : "bg-muted text-muted-foreground bg-muted text-muted-foreground"}`}>{sel?.departmentCount ?? 0} Dept</span>
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[9px] font-medium ${(sel?.groupCount ?? 0) > 0 ? "bg-muted text-muted-foreground bg-muted text-muted-foreground" : "bg-muted text-muted-foreground bg-muted text-muted-foreground"}`}>{sel?.groupCount ?? 0} RG</span>
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[9px] font-medium ${(sel?.resourceCount ?? 0) > 0 ? "bg-muted text-muted-foreground bg-muted text-muted-foreground" : "bg-muted text-muted-foreground bg-muted text-muted-foreground"}`}>{sel?.resourceCount ?? 0} Res</span>
                {isForm && <Badge label="Editing" variant="amber" />}
                {isNew && <Badge label="New" variant="default" />}
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1.5">
          {isForm ? (
            <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
              {errors._form && (
                <div className="rounded-md border border-danger bg-danger px-2 py-1 text-[10px] text-danger border-danger bg-danger text-danger">{errors._form}</div>
              )}
              {mode === "create" && (
                <div className="rounded-md border border-warning bg-warning px-2 py-1 text-[10px] font-medium text-warning border-warning bg-warning text-warning">
                  Save production line before assigning departments or creating flow.
                </div>
              )}
              <div className="grid min-h-0 items-start gap-1.5 overflow-hidden" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="flex flex-col gap-1.5 overflow-hidden">
                  <SectionCard title="Identity" className="overflow-hidden">
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
                    <textarea value={g("description")} onChange={(e) => s("description", e.target.value)} placeholder="Description" rows={2} className="max-h-[72px] min-h-[52px] w-full resize-none rounded-md border border-border bg-card px-2 py-1.5 text-[11px] outline-none transition-all focus:border-warning focus:ring-2 focus:ring-warning border-border bg-muted text-muted-foreground" />
                  </div>
                  </SectionCard>
                  <SectionCard title="Operations" className="overflow-hidden">
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
                    <div className="mt-2 space-y-1.5">
                      <InlineRow label="Capacity" value={<input type="text" value={g("capacityBasis")} readOnly disabled={!g("shiftPatternId")} title={capacityBasisInfo ? "Derived from selected shift/calendar" : "Select shift/calendar to derive capacity"} className={`${iCls} bg-muted text-muted-foreground disabled:cursor-not-allowed disabled:opacity-70 bg-muted text-muted-foreground`} />} />
                      <InlineRow label="UoM" value={<RefSelect category="unit_of_measure" value={g("capacityUomId")} onChange={(v) => s("capacityUomId", v)} placeholder="Select UoM" selectClass={sCls} error={errors.capacityUomId} />} />
                      <InlineRow label="Bottleneck RG" value={
                        <select value={g("bottleneckResourceGroupId")} onChange={(e) => s("bottleneckResourceGroupId", e.target.value)} className={sCls}>
                          <option value="">Select</option>
                          {(sel?.resourceGroupOptions ?? []).map((rg) => <option key={rg.id} value={rg.id}>{rg.name}</option>)}
                        </select>
                      } />
                      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <input type="checkbox" checked={!!g("isConstraint")} onChange={(e) => s("isConstraint", e.target.checked)} /> Constraint Line
                      </label>
                    </div>
                  </SectionCard>
                </div>
                <div className="flex flex-col gap-1.5 overflow-hidden">
                  <ScheduleSection isForm={true} sCls={sCls} g={g} s={s} sel={sel} errors={errors} setShiftModel={setShiftModel} hasCal={hasCal} capacityBasisInfo={capacityBasisInfo} />
                  <RoutingSummarySection productionLine={sel} navigate={navigate} isNew={mode === "create"} isEditing={true} returnContext={{ searchText: search, statusFilter }} />
                  <SectionCard title="Departments" action={sel?.id ? <SecondaryActionButton onClick={() => navigate(`/system/production-structure/components/dept?lineId=${sel.id}`)}>Manage</SecondaryActionButton> : undefined} className="overflow-hidden">
                    {mode === "create" ? (
                      <div className="rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-[10px] font-medium text-muted-foreground border-border bg-muted text-muted-foreground">
                        Save production line before assigning departments or creating flow.
                      </div>
                    ) : hasDepts ? (
                      <div className="space-y-1 overflow-hidden">
                        {departmentLinks.slice(0, 6).map((link) => (
                          <button key={link.id} onClick={() => navigate(`/system/production-structure/components/dept?departmentId=${link.departmentId}`)}
                            className="grid h-6 w-full grid-cols-[28px_1fr_auto_auto] items-center gap-1.5 rounded-md border border-border bg-muted px-2 text-left text-[11px] text-muted-foreground hover:bg-muted border-border bg-muted text-muted-foreground hover:bg-muted">
                            <span className="font-mono text-[10px] text-muted-foreground">{link.sequence}</span>
                            <span className="min-w-0 truncate font-medium">{link.departmentName}</span>
                            <span className="text-muted-foreground">{link.resourceGroups} RG</span>
                            <span className="text-muted-foreground">{link.resources} Res</span>
                          </button>
                        ))}
                        {departmentLinks.length > 6 && (
                          <div className="flex h-6 items-center rounded-md border border-border bg-muted px-2 text-[10px] font-semibold text-muted-foreground border-border bg-muted text-muted-foreground">
                            +{departmentLinks.length - 6} more departments
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-[10px] text-muted-foreground border-border bg-muted text-muted-foreground">
                        No departments linked.
                      </div>
                    )}
                  </SectionCard>
                </div>
              </div>
            </div>
          ) : (
            <FlowContextSections productionLine={sel} navigate={navigate} returnContext={{ searchText: search, statusFilter }} onAssignModel={() => setMode("edit")} />
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
            <div className="shrink-0 border-b border-border flex items-center p-3 bg-muted">
              <Search className="h-3 w-3 text-muted-foreground stroke-current mr-2 shrink-0" />
              <span className="text-[11px] font-medium text-muted-foreground">Lines</span>
              <span className="ml-auto text-[9px] text-muted-foreground font-mono">{filtered.length}</span>
            </div>
            <div data-production-lines-list className="flex-1 overflow-y-auto bg-card pl-2 bg-muted">
              {loading && lines.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground"><div className="h-2 w-2 rounded-full bg-warning animate-bounce mr-2" />Loading...</div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <TrendingUpDown className="h-4 w-4 text-muted-foreground mb-1.5 stroke-current" />
                  <p className="text-xs text-muted-foreground">No production lines</p>
                </div>
              ) : (
                <div>
                  {paginated.map((ln: ProductionLine) => {
                    const readiness = getLineListReadiness(ln);
                    return (
                      <EntityListItem key={ln.id}
                        name={ln.name} code={ln.code}
                        meta={ln.plantName || "Plant required"}
                        icon={<TrendingUpDown className="h-3.5 w-3.5 stroke-current" />}
                        selected={selectedId === ln.id}
                        status={ln.status}
                        onClick={() => selectLine(ln.id)}
                        entityType="line"
                        issueTags={
                          <span title={`${readiness.label}: ${readiness.reason}`} className={`ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black ${
                            readiness.tone === "ready"
                              ? "bg-success/10 text-success"
                              : readiness.tone === "partial"
                                ? "bg-warning/10 text-warning"
                                : "bg-danger/10 text-danger"
                          }`}>
                            {readiness.icon}
                          </span>
                        } />
                    );
                  })}
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
