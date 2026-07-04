import { useMemo } from "react";
import { MapPin } from "lucide-react";

export interface LocationHierarchy {
  plantId: string;
  lineId: string;
  departmentId: string;
  resourceGroupId: string;
  resourceId: string;
  targetType: string;
  targetId: number | null;
}

interface Props {
  plants: any[];
  lines: any[];
  departments: any[];
  resourceGroups: any[];
  resources: any[];
  value: LocationHierarchy;
  onChange: (h: LocationHierarchy) => void;
  plantDisabled?: boolean;
}

const SEL = "h-8 w-full bg-background border border-border px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30";
const SEL_DISABLED = "h-8 w-full bg-muted border border-border px-2 text-sm text-muted-foreground/60 outline-none cursor-not-allowed";
const LABEL = "block text-xs font-medium text-muted-foreground mb-1";

function labelOrCode(e: any): string {
  if (!e) return "";
  if (e.name && e.code) return `${e.code} — ${e.name}`;
  if (e.name) return e.name;
  if (e.code) return e.code;
  return String(e.id ?? "");
}

export function SourceLocationSelector({ plants, lines, departments, resourceGroups, resources, value, onChange, plantDisabled }: Props) {
  const filteredLines = useMemo(() => {
    if (!value.plantId) return [];
    return lines.filter((l: any) => String(l.plantId) === String(value.plantId));
  }, [lines, value.plantId]);

  const filteredDepts = useMemo(() => {
    if (!value.lineId) return [];
    return departments.filter((d: any) => 
      d.productionLines?.some((pl: any) => String(pl.id) === String(value.lineId)) ||
      (d.plantId && String(d.plantId) === String(value.plantId))
    );
  }, [departments, value.lineId, value.plantId]);

  const filteredRGs = useMemo(() => {
    if (!value.departmentId) return [];
    return resourceGroups.filter((rg: any) => String(rg.departmentId) === String(value.departmentId));
  }, [resourceGroups, value.departmentId]);

  const filteredResources = useMemo(() => {
    if (!value.resourceGroupId) return [];
    return resources.filter((r: any) => String(r.resourceGroupId) === String(value.resourceGroupId));
  }, [resources, value.resourceGroupId]);

  const set = (partial: Partial<LocationHierarchy>) => {
    const next = { ...value, ...partial };
    // Clear children when parent changes
    if (partial.plantId !== undefined && partial.plantId !== value.plantId) {
      next.lineId = ""; next.departmentId = ""; next.resourceGroupId = ""; next.resourceId = "";
    }
    if (partial.lineId !== undefined && partial.lineId !== value.lineId) {
      next.departmentId = ""; next.resourceGroupId = ""; next.resourceId = "";
    }
    if (partial.departmentId !== undefined && partial.departmentId !== value.departmentId) {
      next.resourceGroupId = ""; next.resourceId = "";
    }
    if (partial.resourceGroupId !== undefined && partial.resourceGroupId !== value.resourceGroupId) {
      next.resourceId = "";
    }
    // Resolve deepest target
    if (next.resourceId) { next.targetType = "RESOURCE"; next.targetId = parseInt(next.resourceId, 10); }
    else if (next.resourceGroupId) { next.targetType = "RESOURCE_GROUP"; next.targetId = parseInt(next.resourceGroupId, 10); }
    else if (next.departmentId) { next.targetType = "DEPARTMENT"; next.targetId = parseInt(next.departmentId, 10); }
    else if (next.lineId) { next.targetType = "PRODUCTION_LINE"; next.targetId = parseInt(next.lineId, 10); }
    else if (next.plantId) { next.targetType = "PLANT"; next.targetId = parseInt(next.plantId, 10); }
    else { next.targetType = "PLANT"; next.targetId = null; }
    onChange(next);
  };

  const selCls = (disabled: boolean) => disabled ? SEL_DISABLED : SEL;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Source Location</span>
      </div>
      {/* Plant */}
      <div>
        <label className={LABEL}>Plant *</label>
        <select name="plantId" value={value.plantId} onChange={(e) => set({ plantId: e.target.value })}
          disabled={plantDisabled} className={selCls(!!plantDisabled)}>
          <option value="">Select plant...</option>
          {plants.map((p: any) => <option key={p.id} value={p.id}>{labelOrCode(p)}</option>)}
        </select>
      </div>
      {/* Line */}
      <div>
        <label className={LABEL}>Line <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
        <select name="lineId" value={value.lineId} onChange={(e) => set({ lineId: e.target.value })}
          disabled={!value.plantId} className={selCls(!value.plantId)}>
          <option value="">{value.plantId ? "Optional..." : "Select Plant first"}</option>
          {filteredLines.map((l: any) => <option key={l.id} value={l.id}>{labelOrCode(l)}</option>)}
        </select>
      </div>
      {/* Department */}
      <div>
        <label className={LABEL}>Department <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
        <select name="departmentId" value={value.departmentId} onChange={(e) => set({ departmentId: e.target.value })}
          disabled={!value.lineId} className={selCls(!value.lineId)}>
          <option value="">{value.lineId ? "Optional..." : "Select Line first"}</option>
          {filteredDepts.map((d: any) => <option key={d.id} value={d.id}>{labelOrCode(d)}</option>)}
        </select>
      </div>
      {/* Resource Group */}
      <div>
        <label className={LABEL}>Resource Group <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
        <select name="resourceGroupId" value={value.resourceGroupId} onChange={(e) => set({ resourceGroupId: e.target.value })}
          disabled={!value.departmentId} className={selCls(!value.departmentId)}>
          <option value="">{value.departmentId ? "Optional..." : "Select Dept first"}</option>
          {filteredRGs.map((rg: any) => <option key={rg.id} value={rg.id}>{labelOrCode(rg)}</option>)}
        </select>
      </div>
      {/* Resource */}
      <div>
        <label className={LABEL}>Resource <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
        <select name="resourceId" value={value.resourceId} onChange={(e) => set({ resourceId: e.target.value })}
          disabled={!value.resourceGroupId} className={selCls(!value.resourceGroupId)}>
          <option value="">{value.resourceGroupId ? "Optional..." : "Select RG first"}</option>
          {filteredResources.map((r: any) => <option key={r.id} value={r.id}>{labelOrCode(r)}</option>)}
        </select>
      </div>
    </div>
  );
}
