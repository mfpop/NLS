import { useState, useEffect, useCallback } from "react";
import { Dumbbell, Component, Search, Calendar, Clock, MapPin, Wrench, Cpu, Info, AlertTriangle, CheckCircle, Activity, Settings, BarChart, Shield } from "lucide-react";
import { theme } from "../../../styles/themeTokens";
import { Pagination, EntityListItem } from "./components";
import { useQuery } from "@apollo/client/react";
import { RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage, DetailSection } from "./components/EntityWorkspacePage";
import { formatAppDate } from "@/utils/dateFormat";

const PER_PAGE = 10;

type ListResult<T> = T[] | { items?: T[] };

interface Resource {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  status?: string;
  statusId?: string;
  resourceGroupId?: string;
  resourceGroupName?: string;
  resourceTypeId?: string;
  utilization?: number | null;
  opStatus?: string;
  lastActivity?: string;
  shiftPattern?: string;
  defaultCalendar?: string;
  timezone?: string;
  capacityBasis?: string;
  uom?: string;
  standardCapacity?: string;
  cycleTime?: string;
  bottleneck?: string;
  isConstraint?: string;
  assetNumber?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  maintenanceRequired?: string;
  createdAt?: string;
  updatedAt?: string;
}

function listItems<T>(value: ListResult<T> | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

function computeReadiness(r: Resource): { level: "ready" | "partial" | "incomplete"; label: string } {
  const hasSchedule = !!r.shiftPattern || !!r.defaultCalendar;
  const hasCapacity = !!r.capacityBasis || !!r.standardCapacity;
  const hasTech = !!r.assetNumber || !!r.manufacturer || !!r.model;
  if (hasSchedule && hasCapacity && hasTech) return { level: "ready", label: "Ready" };
  if (hasSchedule || hasCapacity || hasTech) return { level: "partial", label: "Partially Configured" };
  return { level: "incomplete", label: "Incomplete" };
}

function MissingBlock({ label, action }: { label: string; action: string }) {
  return (
    <div className="flex items-center gap-1.5 py-[2px]">
      <AlertTriangle className={`h-3 w-3 ${theme.textWarning} stroke-current shrink-0`} />
      <span className={`text-[11px] font-medium ${theme.textSecondary}`}>{label}</span>
      <span className={`text-[11px] font-semibold ${theme.textPrimary}`}>{action}</span>
    </div>
  );
}

function InlineRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-[2px]" title={label}>
      {icon && <span className={`w-3.5 shrink-0 ${theme.textSecondary}`}>{icon}</span>}
      <span className={`text-[11px] font-medium ${theme.textSecondary} w-20 shrink-0`}>{label}</span>
      <span className={`text-[13px] font-medium ${theme.textPrimary} min-w-0 truncate`}>{value}</span>
    </div>
  );
}

function ReadinessBadge({ level }: { level: "ready" | "partial" | "incomplete" }) {
  const s = {
    ready: `${theme.badgeActive}`,
    partial: `${theme.badgeWarning}`,
    incomplete: `${theme.badgeInactive}`,
  };
  const icon = { ready: <CheckCircle className="h-3 w-3 stroke-current mr-1" />, partial: <AlertTriangle className="h-3 w-3 stroke-current mr-1" />, incomplete: <Info className="h-3 w-3 stroke-current mr-1" /> };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${s[level]}`}>{icon[level]}{{ ready: "Ready", partial: "Partial", incomplete: "Incomplete" }[level]}</span>;
}

function Badge({ label, variant = "default" }: { label: string; variant?: "active" | "inactive" | "new" | "default" }) {
  const m: Record<string, string> = {
    active: `${theme.badgeActive}`,
    inactive: `${theme.badgeInactive}`,
    new: `${theme.iconBoxBlue}`,
    default: `${theme.badgeInactive}`,
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${m[variant]}`} title={label}>{label === "active" && <span className={`inline-block h-1.5 w-1.5 rounded-full bg-success mr-1.5`} />}{label}</span>;
}

export function ResourcesPage({ embeddedInFlow = false }: { embeddedInFlow?: boolean } = {}) {
  const { search, statusFilter, setFooterContent, setToolbarVariant } = useToolbar();
  const registerActions = useRegisterActions();
  const { data, loading, refetch: refetchRes } = useQuery<{ resources: ListResult<Resource> }>(RESOURCES_QUERY);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const resources = listItems(data?.resources);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = resources.filter((r) => statusFilter === "all" || r.status === statusFilter)
    .filter((r) => !search || (r.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? resources.find((r) => r.id === selectedId) ?? null : null;
  const selectResource = useCallback((id: string) => setSelectedId(id), []);

  useEffect(() => {
    setToolbarVariant("splitListDetail");
    registerActions({ onRefresh: () => refetchRes(), hasSelected: !!sel });
    setFooterContent(`${filtered.length} res${filtered.length !== 1 ? "s" : ""}`);
  }, [sel, filtered.length, registerActions, refetchRes, setFooterContent, setToolbarVariant]);

  const renderDetail = () => {
    if (!sel) {
      return (
        <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-entity-resource-bg">
              <Dumbbell className="h-5 w-5 text-entity-resource stroke-current" />
            </div>
            <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1`}>Resource Details</h3>
            <p className={`text-xs ${theme.textSecondary} leading-relaxed`}>Select a machine, workstation, fixture, tool, or labor pool to view its execution-readiness context.</p>
          </div>
        </div>
      );
    }

    const title = sel.name || "Unnamed Resource";
    const code = sel.code;
    const r: Resource = sel;
    const rgName = r.resourceGroupName || "";
    const readiness = computeReadiness(r);
    const hasSchedule = !!r.shiftPattern || !!r.defaultCalendar;
    const hasCapacity = !!r.capacityBasis || !!r.standardCapacity;
    const hasTech = !!r.assetNumber || !!r.manufacturer || !!r.model;
    const missingCount = [!hasSchedule, !hasCapacity, !hasTech].filter(Boolean).length;
    const allConfigured = missingCount === 0;

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${theme.surfaceBg}`}>
        {/* ── HEADER ── */}
        <div className="shrink-0 border-b border-border px-4 pt-3 pb-2">
          <div className="flex items-stretch gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.iconBoxSubtle} shadow-sm`}>
              <Dumbbell className="h-5 w-5 stroke-current" />
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0 justify-self-start">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className={`truncate text-[16px] font-bold leading-5 ${theme.textPrimary}`}>{title}</h2>
                  {code && <span className={`shrink-0 rounded px-1 py-px font-mono text-[9px] ${theme.codeBadge}`}>{code}</span>}
                </div>
                <div className={`mt-1 flex flex-wrap items-center gap-1.5 text-[10px] ${theme.textMuted}`}>
                  <span><Component className="h-2.5 w-2.5 inline stroke-current mr-0.5" />{rgName || "No RG"}</span>
                <span className="text-muted-foreground">·</span>
                <span><Activity className="h-2.5 w-2.5 inline stroke-current mr-0.5" />{r.utilization != null ? `${r.utilization}% activity` : "No activity data"}</span>
                <span className="text-muted-foreground">·</span>
                <span>{r.resourceTypeId || "No type"}</span>
              </div>
              </div>
              <div className="flex min-h-10 items-center justify-center justify-self-center self-stretch text-center">
                {missingCount > 0 && (
                  <span className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-center text-[9px] font-semibold ${theme.badgeWarning}`} title="Resource has readiness gaps">
                    <AlertTriangle className="h-3 w-3 stroke-current" /> {missingCount} gap{missingCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex min-h-10 min-w-0 flex-wrap items-center justify-end gap-1.5 justify-self-end self-stretch text-center">
                <Badge label={r.status || "active"} variant={r.status === "active" ? "active" : "inactive"} />
                <ReadinessBadge level={readiness.level} />
                <span className={`inline-flex items-center justify-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-center text-[10px] font-semibold ${theme.textMuted}`}>
                  <Settings className="h-3 w-3 stroke-current" /> Read model
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3" style={{ gap: 6 }}>
            <div className="grid grid-cols-2 gap-2.5">
              {/* LEFT COLUMN: Overview + Technical */}
              <div className="flex flex-col min-h-0" style={{ gap: 6 }}>
                <DetailSection title="Overview">
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    {!allConfigured && (
                      <div className="mb-1.5 space-y-px border-b border-border pb-1.5">
                        {!hasSchedule && <MissingBlock label="No schedule visible" action="Managed by schedule assignment" />}
                        {!hasCapacity && <MissingBlock label="No capacity visible" action="Managed by capacity workflow" />}
                        {!hasTech && <MissingBlock label="No asset info visible" action="Managed by resource master data" />}
                      </div>
                    )}
                    <div className="space-y-px">
                      <InlineRow label="Name" value={r.name} />
                      <InlineRow label="Code" value={r.code} />
                      <InlineRow label="Status" value={<Badge label={r.status || "active"} variant={r.status === "active" ? "active" : "inactive"} />} />
                      <InlineRow label="RG" value={rgName || "-"} />
                      <InlineRow label="Type" value={r.resourceTypeId || <span className={`${theme.textMuted} italic`}>No type</span>} />
                      <InlineRow label="Traceability" value={r.resourceGroupName ? "Execution can resolve through resource group" : <span className={`${theme.textMuted} italic`}>Resource group missing</span>} />
                    </div>
                  </div>
                </DetailSection>

                <DetailSection title="Technical / Asset">
                  {!hasTech ? (
                    <div className={`rounded-lg border border-dashed border-border p-2.5 text-center ${theme.toolbarBg}`}>
                      <Cpu className={`mx-auto mb-1 h-4 w-4 ${theme.icon} stroke-current`} />
                      <p className={`text-[10px] ${theme.textMuted} mb-1`}>No asset information recorded</p>
                      <span className={`inline-flex items-center gap-1 rounded-md ${theme.codeBadge} px-2.5 py-1 text-[10px] font-semibold`}><Wrench className="h-2.5 w-2.5 stroke-current" /> Master data required</span>
                    </div>
                  ) : (
                    <div className={`rounded-lg p-2 ${theme.subCard}`}>
                      <div className="space-y-px">
                        <InlineRow label="Asset" value={r.assetNumber || "-"} />
                        <InlineRow label="Manufacturer" value={r.manufacturer || "-"} />
                        <InlineRow label="Model" value={r.model || "-"} />
                        <InlineRow label="Serial" value={r.serialNumber || "-"} />
                        <InlineRow label="Location" value={r.location || <span className={`${theme.textMuted} italic`}>Not assigned</span>} />
                        <InlineRow label="Maint." value={r.maintenanceRequired === "true" ? <span className={theme.textWarning}>Required</span> : "Not required"} />
                      </div>
                    </div>
                  )}
                </DetailSection>
              </div>

              {/* RIGHT COLUMN: Capacity & Schedule */}
              <div className="flex flex-col min-h-0" style={{ gap: 6 }}>
                <DetailSection title="Capacity & Schedule">
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="space-y-px">
                      {hasCapacity ? (
                        <>
                          <InlineRow label="Capacity" value={r.capacityBasis || <span className={`${theme.textMuted} italic`}>Not set</span>} icon={<BarChart className="h-2.5 w-2.5 stroke-current" />} />
                          <InlineRow label="UoM" value={r.uom || <span className={`${theme.textMuted} italic`}>Not set</span>} />
                          <InlineRow label="Std Cap" value={r.standardCapacity || <span className={`${theme.textMuted} italic`}>Not set</span>} />
                          <InlineRow label="Cycle Time" value={r.cycleTime || <span className={`${theme.textMuted} italic`}>N/A</span>} />
                          <InlineRow label="Bottleneck" value={r.bottleneck === "yes" ? <span className={theme.textWarning}>Yes</span> : "No"} />
                          <InlineRow label="Constraint" value={r.isConstraint === "yes" ? <span className={theme.textWarning}>Yes</span> : "No"} />
                        </>
                      ) : (
                        <div className="py-1 flex items-center gap-2">
                          <BarChart className={`h-4 w-4 ${theme.icon} stroke-current shrink-0`} />
                          <div>
                            <p className={`text-[11px] ${theme.textMuted}`}>No capacity defined</p>
                            <p className={`text-[9px] ${theme.textMuted}`}>Capacity is not exposed in this read model. Do not infer throughput in UI.</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 space-y-px border-t border-border pt-1.5">
                      {hasSchedule ? (
                        <>
                          <InlineRow label="Calendar" value={r.defaultCalendar || <span className={`${theme.textMuted} italic`}>Not assigned</span>} icon={<Calendar className="h-2.5 w-2.5 stroke-current" />} />
                          <InlineRow label="Shift" value={r.shiftPattern || <span className={`${theme.textMuted} italic`}>Not set</span>} icon={<Clock className="h-2.5 w-2.5 stroke-current" />} />
                          <InlineRow label="TZ" value={r.timezone || <span className={`${theme.textMuted} italic`}>Default</span>} icon={<MapPin className="h-2.5 w-2.5 stroke-current" />} />
                          <div className={`pt-0.5 text-[9px] ${theme.textMuted}`}>{r.shiftPattern ? "Resource override" : "RG default"}</div>
                        </>
                      ) : (
                        <MissingBlock label="No schedule configured" action="Assign Schedule" />
                      )}
                    </div>
                  </div>
                </DetailSection>

                <DetailSection title="Activity & Trends">
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="space-y-px">
                      <InlineRow label="Activity" value={r.utilization != null ? <span className="flex items-center gap-1"><Activity className="h-2.5 w-2.5 stroke-current" /> {r.utilization}%</span> : <span className={`${theme.textMuted} italic`}>Not exposed</span>} />
                      <InlineRow label="Last Active" value={formatAppDate(r.lastActivity) || <span className={`${theme.textMuted} italic`}>No activity</span>} />
                      <InlineRow label="Op. Status" value={r.opStatus || <span className={`${theme.textMuted} italic`}>Unknown</span>} icon={<Shield className="h-2.5 w-2.5 stroke-current" />} />
                    </div>
                  </div>
                </DetailSection>
              </div>
            </div>

            <div className={`mt-2 flex items-center gap-4 border-t border-border pt-2 text-[9px] ${theme.textMuted}`}>
              <span>Created <span className={theme.textSecondary}>{formatAppDate(r.createdAt) || "-"}</span></span>
              <span>Updated <span className={theme.textSecondary}>{formatAppDate(r.updatedAt) || "-"}</span></span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <EntityWorkspacePage
        hideList={embeddedInFlow}
        toolbar={null}
        list={
          <>
            <div className="flex shrink-0 items-center border-b border-border bg-muted p-3">
              <Search className={`h-3 w-3 ${theme.icon} stroke-current mr-2 shrink-0`} />
              <span className={`text-[11px] font-medium ${theme.textMuted}`}>Resources</span>
              <span className={`ml-auto font-mono text-[9px] ${theme.textMuted}`}>{filtered.length}</span>
            </div>
            <div className={`flex-1 overflow-y-auto ${theme.surfaceBg} pl-2`}>
              {loading && resources.length === 0 ? (
                <div className={`flex items-center justify-center h-24 text-xs ${theme.textMuted}`}><div className={`h-2 w-2 rounded-full ${theme.dividerDot} animate-bounce mr-2`} />Loading...</div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Dumbbell className={`h-4 w-4 ${theme.icon} mb-1.5 stroke-current`} />
                  <p className={`text-xs ${theme.textMuted}`}>No resources</p>
                </div>
              ) : (
                <div>
                  {paginated.map((res) => (
                    <EntityListItem key={res.id}
                      name={res.name || ""} code={res.code}
                      meta={res.resourceGroupName || "Resource group required"}
                      icon={<Dumbbell className="h-3.5 w-3.5 stroke-current" />}
                      selected={selectedId === res.id}
                      status={res.status}
                      onClick={() => selectResource(res.id)}
                      entityType="resource" />
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 flex h-12 items-center border-t border-border bg-muted px-3">
              <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        }
        detail={renderDetail()}
        footer={null}
    />
  );
}
