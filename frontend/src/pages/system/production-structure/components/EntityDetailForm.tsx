import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUpDown, Layers, Component, Dumbbell, Building2, Activity, Database, ExternalLink, Users, Factory, Info, Plus, Play, AlertTriangle, MapPin, ChevronDown } from "lucide-react";
import { ENTITY_CONFIG, TYPE_TITLES } from "../config";
import { formatAppDate } from "@/utils/dateFormat";
/** Normalize a tree node into flat entity format */
export function fromTreeNode(node: any): any {
  const meta = node.metadata || {};
  return {
    id: node.id, name: node.name, code: node.code, status: node.status,
    type: node.type, parentId: node.parentId, path: node.path, depth: node.depth,
    building: meta.building, address: meta.address, timezone: meta.timezone,
    managerName: meta.managerName, managerEmail: meta.managerEmail,
    description: meta.description,
    defaultCalendarId: meta.defaultCalendarId, defaultScheduleId: meta.defaultScheduleId,
    lineCount: meta.lineCount ?? meta.productionLineCount ?? 0,
    departmentCount: meta.departmentCount ?? 0,
    groupCount: meta.resourceGroupCount ?? meta.groupCount ?? 0,
    resourceCount: meta.resourceCount ?? 0,
    employees: meta.employees ?? 0, members: meta.members ?? 0, leader: meta.leader,
    resourceType: meta.resourceType, opStatus: meta.opStatus,
    utilization: meta.utilization,
    groupName: meta.groupName, departmentName: meta.departmentName, plantName: meta.plantName,
    plantId: meta.plantId, groupId: meta.groupId, departmentId: meta.departmentId,
    shiftPattern: meta.shiftPattern || node.shiftPatternName,
    isConstraint: meta.isConstraint,
    modelsProduced: meta.modelsProduced || [],
    groupType: meta.groupType,
    createdAt: meta.createdAt || node.createdAt || new Date().toISOString(),
    updatedAt: meta.updatedAt || node.updatedAt || new Date().toISOString(),
  };
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  if (value === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 bg-muted border-border">
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${color}`}><Icon className="h-3 w-3 stroke-current" /></span>
        <div className="text-right">
          <div className="text-base font-bold text-muted-foreground">{value}</div>
          <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ icon: Icon, label, value, muted, action }: { icon: any; label: string; value: string; muted?: boolean; action?: string }) {
  const hasAction = action && (value === "Not set" || value === "" || value.startsWith("Add"));
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${muted ? "bg-muted text-muted-foreground bg-muted text-muted-foreground" : "bg-muted text-muted-foreground bg-muted text-muted-foreground"}`}><Icon className="h-3 w-3" /></div>
      <div className="min-w-0 flex-1">
        <div className={`${muted ? "text-[9px] text-muted-foreground" : "text-[10px] font-medium text-muted-foreground"}`}>{label}</div>
        {hasAction ? (
          <button type="button" className="text-sm text-primary hover:text-primary font-medium text-primary hover:text-primary transition-colors">
            {action}
          </button>
        ) : (
          <div className={`text-sm ${muted ? "text-muted-foreground" : "text-muted-foreground font-medium"}`}>
            {value || <span className="italic text-muted-foreground">Not set</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card bg-muted border-border">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center justify-between w-full px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:bg-muted transition-colors rounded-t-lg">
        <span>{title}</span>
        <ChevronDown className={`h-3.5 w-3.5 stroke-current transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function EmptyMetrics({ entityType, onAction, isInactive }: { entityType: string; onAction?: () => void; isInactive?: boolean }) {
  const labels: Record<string, { label: string; action: string }> = {
    plant: { label: "No production structure yet", action: "Add first production line" },
    productionLine: { label: "No departments configured", action: "Add first department" },
    line: { label: "No departments configured", action: "Add first department" },
    department: { label: "No resource groups", action: "Add resource group" },
    resourceGroup: { label: "No resources assigned", action: "Add resource" },
    group: { label: "No resources assigned", action: "Add resource" },
    resource: { label: "No data available", action: "" },
  };
  const info = labels[entityType] || { label: "No data", action: "" };
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted px-4 py-8 text-center border-border bg-muted">
      <Info className="h-8 w-8 text-muted-foreground mb-2 stroke-current" />
      <p className="text-sm font-medium text-muted-foreground">{isInactive ? "Activate site first" : info.label}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {isInactive ? "Site must be active before adding structure" : "Start building your production hierarchy"}
      </p>
      {info.action && onAction && !isInactive && (
        <button type="button" onClick={onAction} className="mt-3 inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary transition-colors">
          <Plus className="h-3 w-3 stroke-current" /> {info.action}
        </button>
      )}
    </div>
  );
}

interface EntityDetailExtras {
  parentName?: string;
  depth?: number;
  pathLabels?: string;
  children?: any[];
  hierarchyMix?: Record<string, number>;
  childType?: string;
  scheduleStatus?: string;
  shiftPatternName?: string;
  onAddChild?: () => void;
}

interface EntityDetailFormProps {
  entityType: string;
  entity: any;
  onAction?: () => void;
  extras?: EntityDetailExtras;
}

export function EntityDetailForm({ entityType, entity, onAction, extras }: EntityDetailFormProps) {
  if (!entity) return null;

  const detailContent = (() => {
    if (entityType === "plant") return <PlantDetail entity={entity} onAction={onAction} />;
    if (entityType === "productionLine" || entityType === "line") return <LineDetail entity={entity} onAction={onAction} />;
    if (entityType === "department") return <DeptDetail entity={entity} onAction={onAction} />;
    if (entityType === "resourceGroup" || entityType === "group") return <RGDetail entity={entity} onAction={onAction} />;
    if (entityType === "resource") return <ResDetail entity={entity} />;
    return <div className="p-4 text-xs text-muted-foreground">Unknown entity type</div>;
  })();

  const hasExtras = extras && (extras.parentName !== undefined || extras.depth !== undefined || extras.pathLabels || (extras.children && extras.children.length > 0));

  return (
    <div>
      {detailContent}

      {/* ── Tree context (Flow-specific extras) ── */}
      {hasExtras && (
        <>
          {extras!.parentName !== undefined && (
            <div className="mt-3 rounded-lg border border-border bg-card p-3 bg-muted border-border">
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tree Position</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {extras!.parentName && <div><span className="text-[10px] text-muted-foreground block">Parent</span><span className="font-medium text-muted-foreground">{extras!.parentName}</span></div>}
                {extras!.depth !== undefined && <div><span className="text-[10px] text-muted-foreground block">Depth</span><span className="font-medium text-muted-foreground">{extras!.depth}</span></div>}
                {extras!.pathLabels && <div className="col-span-2"><span className="text-[10px] text-muted-foreground block">Path</span><span className="font-medium text-muted-foreground truncate block" title={extras!.pathLabels}>{extras!.pathLabels}</span></div>}
              </div>
            </div>
          )}

          {extras!.children && extras!.children.length > 0 && (
            <div className="mt-3 rounded-lg border border-border bg-card p-3 bg-muted border-border">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Direct Children</h2>
                <span className="text-xs text-muted-foreground">{extras!.children.length}</span>
              </div>
              <div>
                {extras!.children.map((child: any) => {
                  const childCfg = ENTITY_CONFIG[child.type] || ENTITY_CONFIG.resource;
                  const ChildIcon = childCfg.icon;
                  return (
                    <div key={child.id} className="flex items-center gap-2 py-1.5 text-sm hover:bg-muted hover:bg-muted transition-colors cursor-pointer">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${childCfg.color}`}><ChildIcon className="h-3 w-3 stroke-current" /></span>
                      <span className="flex-1 font-medium text-muted-foreground truncate">{child.name}</span>
                      {child.code && <span className="text-[10px] font-mono text-muted-foreground">{child.code}</span>}
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${child.status === "active" ? "bg-success" : "bg-muted"}`} />
                      <span className="text-xs text-muted-foreground">{TYPE_TITLES[child.type] || child.type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Extras: Add Child (tree-specific) ── */}
          {extras!.childType && extras!.onAddChild && (
            <div className="mt-3 rounded-lg border border-border bg-card p-3 bg-muted border-border">
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
              <div className="flex items-center justify-between min-h-9 text-sm hover:bg-muted hover:bg-muted transition-colors rounded px-1">
                <div className="min-w-0">
                  <div className="font-medium text-muted-foreground">Add {extras!.childType}</div>
                  <div className="text-[10px] text-muted-foreground">Create a new {extras!.childType.toLowerCase()} under this entity</div>
                </div>
                <button type="button" onClick={() => extras!.onAddChild!()} className="shrink-0 h-6 px-2 rounded text-[10px] font-medium text-success hover:text-success hover:text-success transition-colors">Create</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MiniChip({ icon: Icon, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[13px] font-medium ${color}`}>
      <Icon className="h-2.5 w-2.5 stroke-current" /> {value}{" "}
      <span className="opacity-60">{label}</span>
    </span>
  );
}

function PlantDetail({ entity: p, onAction }: { entity: any; onAction?: () => void }) {
  const isActive = p.status === "active";
  const allZero = [p.lineCount, p.departmentCount, p.groupCount, p.resourceCount].every((v: number) => v === 0);
  const needsTimezone = !p.timezone || p.timezone === "Not set";
  const needsLocation = !p.building || p.building === "Not set";

  return (
    <div className="space-y-3">
      {/* ── INACTIVE BANNER ── */}
      {!isActive && (
        <div className="rounded-lg border border-warning/25 bg-warning/10 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5 stroke-current" />
              <div>
                <p className="text-sm font-semibold text-warning">Site is inactive</p>
                <p className="text-xs text-warning mt-0.5">
                  Production actions are locked until site is activated. Set site to active to unlock structure management.
                </p>
              </div>
            </div>
            <button type="button" className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-2 text-xs font-semibold text-warning-foreground hover:bg-warning/90 transition-colors shadow-sm">
              <Play className="h-3.5 w-3.5 stroke-current" /> Activate
            </button>
          </div>
        </div>
      )}

      {/* ── LOCATION MISMATCH FLAG ── */}
      {isActive && p.building && p.timezone && p.address && (
        <div className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary stroke-current shrink-0" />
            <span className="text-xs text-primary">
              {p.building} · {p.timezone}
            </span>
            <button type="button" className="ml-auto text-xs font-medium text-primary hover:text-primary">Verify address</button>
          </div>
        </div>
      )}

      {/* ── METRICS or EMPTY STATE ── */}
      {allZero ? (
        <EmptyMetrics entityType="plant" onAction={onAction} isInactive={!isActive} />
      ) : (
        <>
          {!isActive && (
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground border-border bg-muted text-muted-foreground">
              Metrics are available but site is inactive. Activate to manage structure.
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            <SummaryCard icon={TrendingUpDown} label="Lines" value={p.lineCount} color="bg-warning/15 text-warning" />
            <SummaryCard icon={Layers} label="Depts" value={p.departmentCount} color="bg-info/15 text-info" />
            <SummaryCard icon={Component} label="Groups" value={p.groupCount} color="bg-danger/15 text-danger" />
            <SummaryCard icon={Dumbbell} label="Resources" value={p.resourceCount} color="bg-muted text-muted-foreground" />
          </div>
        </>
      )}

      {/* ── HIERARCHY MIX ── */}
      {[p.lineCount, p.departmentCount, p.groupCount, p.resourceCount].some((v) => v > 0) && (
        <div className="rounded-lg border border-border bg-card p-3 bg-muted border-border">
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hierarchy Mix</h2>
          <div className="flex flex-wrap gap-2">
            {p.lineCount > 0 && <MiniChip icon={TrendingUpDown} value={String(p.lineCount)} label="Lines" color="bg-warning/10 text-warning" />}
            {p.departmentCount > 0 && <MiniChip icon={Layers} value={String(p.departmentCount)} label="Depts" color="bg-info/10 text-info" />}
            {p.groupCount > 0 && <MiniChip icon={Component} value={String(p.groupCount)} label="Groups" color="bg-danger/10 text-danger" />}
            {p.resourceCount > 0 && <MiniChip icon={Dumbbell} value={String(p.resourceCount)} label="Resources" color="bg-muted text-muted-foreground" />}
          </div>
        </div>
      )}

      {/* ── STRUCTURE POSITION (collapsible) ── */}
      <CollapsibleSection title="Structure Position" defaultOpen={!isActive || needsTimezone || needsLocation}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <InfoField icon={Building2} label="Building / Site" value={p.building || "Not set"} action="Add building location" />
          <InfoField icon={Activity} label="Status" value={isActive ? "Active" : "Inactive"} />
          <InfoField icon={Database} label="Timezone" value={p.timezone || "Not set"} muted action={needsTimezone ? "Set timezone" : undefined} />
          <InfoField icon={ExternalLink} label="Address" value={p.address || "Not set"} muted action={needsLocation ? "Add address" : undefined} />
        </div>
      </CollapsibleSection>

      {/* ── WORKING SCHEDULE (collapsible) ── */}
      <CollapsibleSection title="Working Schedule">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <InfoField icon={Database} label="Calendar" value={p.defaultCalendarId || "Not set"} muted action="Assign calendar" />
          <InfoField icon={Database} label="Schedule" value={p.defaultScheduleId || "Not set"} muted action="Set schedule" />
        </div>
      </CollapsibleSection>

      {/* ── CONTACT (collapsible) ── */}
      <CollapsibleSection title="Contact">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <InfoField icon={Users} label="Manager" value={p.managerName || "Not set"} action="Add manager" />
          <InfoField icon={ExternalLink} label="Manager Email" value={p.managerEmail || "Not set"} action="Add email" />
        </div>
      </CollapsibleSection>

      {p.description && (
        <CollapsibleSection title="Description" defaultOpen={!!p.description}>
          <p className="text-sm text-muted-foreground">{p.description}</p>
        </CollapsibleSection>
      )}

      {/* ── CONFIGURATION SHORTCUTS ── */}
      {isActive && <ConfigShortcuts entityType="plant" />}

      {/* ── TIMESTAMPS ── */}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span>Created {formatAppDate(p.createdAt) || "-"}</span>
        <span>·</span>
        <span>Updated {formatAppDate(p.updatedAt) || "-"}</span>
      </div>
    </div>
  );
}

function ConfigShortcuts({ entityType }: { entityType: string }) {
  const navigate = useNavigate();
  const actions: { label: string; desc: string; route: string }[] = [];
  if (entityType === "plant") {
    actions.push({ label: "Link Schedule", desc: "Associate a production schedule", route: "/system/production-structure/references/production_calendar" });
  }
  if (entityType === "productionLine" || entityType === "line") {
    actions.push({ label: "Link Schedule", desc: "Associate a production schedule", route: "/system/production-structure/references/production_calendar" });
  }
  if (entityType === "resourceGroup" || entityType === "group") {
    actions.push({ label: "Link Schedule", desc: "Associate a production schedule", route: "/system/production-structure/references/production_calendar" });
    actions.push({ label: "Assign Skills", desc: "Assign required skills to this group", route: "/system/production-structure/references" });
  }
  if (entityType === "department") {
    actions.push({ label: "Link Resources", desc: "Link equipment or personnel", route: "/system/production-structure/references" });
  }
  if (actions.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 bg-muted border-border">
      <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Configuration</h2>
      <div className="space-y-1">
        {actions.map((a) => (
          <div key={a.label} className="flex items-center justify-between min-h-9 text-sm hover:bg-muted hover:bg-muted transition-colors rounded px-1">
            <div className="min-w-0">
              <div className="font-medium text-muted-foreground">{a.label}</div>
              <div className="text-[10px] text-muted-foreground">{a.desc}</div>
            </div>
            <button type="button" onClick={() => navigate(a.route)} className="shrink-0 h-6 px-2 rounded text-[10px] font-medium text-success hover:text-success hover:text-success transition-colors">Open</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineDetail({ entity: l, onAction }: { entity: any; onAction?: () => void }) {
  const isActive = l.status === "active";
  const allZero = [l.departmentCount, l.groupCount, l.resourceCount].every((v: number) => v === 0);
  return (
    <div className="space-y-3">
      {!isActive && (
        <div className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 stroke-current" />
            <p className="text-xs font-medium text-warning">Line is inactive · Activate to resume production</p>
          </div>
        </div>
      )}
      {allZero ? (
        <EmptyMetrics entityType="productionLine" onAction={onAction} isInactive={!isActive} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard icon={TrendingUpDown} label="Departments" value={l.departmentCount} color="bg-warning/15 text-warning" />
          <SummaryCard icon={Component} label="Groups" value={l.groupCount} color="bg-danger/15 text-danger" />
          <SummaryCard icon={Dumbbell} label="Resources" value={l.resourceCount} color="bg-muted text-muted-foreground" />
        </div>
      )}
      <CollapsibleSection title="Line Details">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <InfoField icon={TrendingUpDown} label="Plant" value={l.plantName || "Not set"} />
          <InfoField icon={Activity} label="Status" value={isActive ? "Active" : "Inactive"} />
          <InfoField icon={ExternalLink} label="Shift Pattern" value={l.shiftPattern || "Not set"} muted />
          <InfoField icon={Info} label="Constraint" value={l.isConstraint ? "Yes" : "No"} />
        </div>
      </CollapsibleSection>
      {l.modelsProduced && l.modelsProduced.length > 0 && (
        <CollapsibleSection title="Models Produced" defaultOpen>
          <div className="flex flex-wrap gap-1">{l.modelsProduced.map((m: string, idx: number) => <span key={idx} className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground bg-muted text-muted-foreground">{m}</span>)}</div>
        </CollapsibleSection>
      )}
      {isActive && <ConfigShortcuts entityType="productionLine" />}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span>Created {formatAppDate(l.createdAt) || "-"}</span>
        <span>·</span>
        <span>Updated {formatAppDate(l.updatedAt) || "-"}</span>
      </div>
    </div>
  );
}

function DeptDetail({ entity: d, onAction }: { entity: any; onAction?: () => void }) {
  const allZero = [d.groupCount, d.resourceCount].every((v: number) => v === 0);
  return (
    <div className="space-y-3">
      {allZero ? <EmptyMetrics entityType="department" onAction={onAction} /> : (
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard icon={Component} label="Groups" value={d.groupCount} color="bg-info text-info bg-info text-info" />
          <SummaryCard icon={Dumbbell} label="Resources" value={d.resourceCount} color="bg-muted text-muted-foreground bg-muted text-muted-foreground" />
        </div>
      )}
      <CollapsibleSection title="Department Details">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <InfoField icon={Layers} label="Manager" value={d.manager || "Not set"} action="Assign manager" />
          <InfoField icon={Activity} label="Status" value={d.status === "active" ? "Active" : "Inactive"} />
          <InfoField icon={Users} label="Employees" value={String(d.employees)} />
          <InfoField icon={ExternalLink} label="Plant" value={d.plantName || "Not set"} />
        </div>
      </CollapsibleSection>
      {d.status === "active" && <ConfigShortcuts entityType="department" />}
    </div>
  );
}

function RGDetail({ entity: g, onAction }: { entity: any; onAction?: () => void }) {
  const allZero = !g.resourceCount && !g.members;
  return (
    <div className="space-y-3">
      {allZero ? <EmptyMetrics entityType="resourceGroup" onAction={onAction} /> : null}
      <CollapsibleSection title="Resource Group Details" defaultOpen>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <InfoField icon={Component} label="Group Type" value={g.groupType || "-"} />
          <InfoField icon={Activity} label="Status" value={g.status === "active" ? "Active" : "Inactive"} />
          <InfoField icon={Users} label="Members" value={String(g.members || 0)} action={!g.members ? "Add members" : undefined} />
          <InfoField icon={ExternalLink} label="Leader" value={g.leader || "Not set"} action="Assign leader" />
          <InfoField icon={Layers} label="Department" value={g.departmentName || "Not set"} muted />
          <InfoField icon={Factory} label="Plant" value={g.plantName || "Not set"} muted />
          <InfoField icon={Dumbbell} label="Resources" value={String(g.resourceCount || 0)} />
        </div>
      </CollapsibleSection>
      {g.status === "active" && <ConfigShortcuts entityType="resourceGroup" />}
    </div>
  );
}

function ResDetail({ entity: r }: { entity: any }) {
  return (
    <div className="space-y-3">
      <CollapsibleSection title="Resource Details" defaultOpen>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <InfoField icon={Dumbbell} label="Resource Type" value={r.resourceType || r.type || "-"} />
          <InfoField icon={Activity} label="Status" value={r.status === "active" ? "Active" : "Inactive"} />
          <InfoField icon={Activity} label="Op. Status" value={r.opStatus || "-"} />
          <InfoField icon={ExternalLink} label="Utilization" value={r.utilization != null ? `${r.utilization}%` : "-"} />
          <InfoField icon={Component} label="Group" value={r.groupName || "Not set"} />
          <InfoField icon={Layers} label="Department" value={r.departmentName || "Not set"} muted />
          <InfoField icon={Factory} label="Plant" value={r.plantName || "Not set"} muted />
        </div>
      </CollapsibleSection>
    </div>
  );
}
