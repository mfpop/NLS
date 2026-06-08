import { useQuery } from "@apollo/client/react";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY, DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY } from "@/graphql/manufacturingQueries";

interface CascadeValue {
  plantId: string;
  lineId: string;
  deptId: string;
  rgId: string;
  resourceId: string;
}

interface TargetCascadeProps {
  value: CascadeValue;
  onChange: (v: CascadeValue) => void;
  plantRequired?: boolean;
  disabled?: boolean;
}

const baseCls =
  "h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-orange-400 transition-colors disabled:opacity-40";

function resolveTarget(v: CascadeValue): { targetType: string; targetId: string } | null {
  if (v.resourceId) return { targetType: "RESOURCE", targetId: v.resourceId };
  if (v.rgId) return { targetType: "RESOURCE_GROUP", targetId: v.rgId };
  if (v.deptId) return { targetType: "DEPARTMENT", targetId: v.deptId };
  if (v.lineId) return { targetType: "PRODUCTION_LINE", targetId: v.lineId };
  if (v.plantId) return { targetType: "PLANT", targetId: v.plantId };
  return null;
}

export { resolveTarget };
export type { CascadeValue };

export function TargetCascade({ value, onChange, plantRequired, disabled }: TargetCascadeProps) {
  const { data: plantsData } = useQuery(PLANTS_QUERY, { fetchPolicy: "cache-first" });
  const plants: { id: string; name: string }[] = (plantsData as any)?.plants || [];

  const { data: linesData } = useQuery(PRODUCTION_LINES_QUERY, {
    variables: { plantId: value.plantId || undefined },
    skip: !value.plantId,
    fetchPolicy: "cache-first",
  });
  const lines: { id: string; name: string }[] = (linesData as any)?.productionLines || [];

  const { data: deptsData } = useQuery(DEPARTMENTS_QUERY, {
    variables: { status: "active" },
    skip: !value.plantId,
    fetchPolicy: "cache-first",
  });
  const depts: { id: string; name: string; plantId: string }[] = (
    (deptsData as any)?.departments || []
  ).filter((d: any) => d.plantId === value.plantId);

  const { data: rgsData } = useQuery(RESOURCE_GROUPS_QUERY, {
    variables: { departmentId: value.deptId || undefined },
    skip: !value.deptId,
    fetchPolicy: "cache-first",
  });
  const rgs: { id: string; name: string }[] = (rgsData as any)?.resourceGroups || [];

  const clearBelow = (field: keyof CascadeValue) => {
    const cleared: CascadeValue = { ...value };
    if (field === "plantId") { cleared.lineId = ""; cleared.deptId = ""; cleared.rgId = ""; cleared.resourceId = ""; }
    else if (field === "lineId") { cleared.deptId = ""; cleared.rgId = ""; cleared.resourceId = ""; }
    else if (field === "deptId") { cleared.rgId = ""; cleared.resourceId = ""; }
    else if (field === "rgId") { cleared.resourceId = ""; }
    return cleared;
  };

  const plantName = plants.find((p) => p.id === value.plantId)?.name || "";
  const lineName = lines.find((l) => l.id === value.lineId)?.name || "";
  const deptName = depts.find((d) => d.id === value.deptId)?.name || "";
  const rgName = rgs.find((rg) => rg.id === value.rgId)?.name || "";

  const effectiveTarget = value.resourceId
    ? `Resource #${value.resourceId}`
    : rgName
      ? `RG: ${rgName}`
      : deptName
        ? `Dept: ${deptName}`
        : lineName
          ? `Line: ${lineName}`
          : plantName
            ? `Plant: ${plantName}`
            : null;

  return (
    <div className="space-y-2.5">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Plant{plantRequired ? " *" : ""}
        </label>
        <select
          value={value.plantId}
          onChange={(e) => {
            const cleared = clearBelow("plantId");
            cleared.plantId = e.target.value;
            onChange(cleared);
          }}
          disabled={disabled}
          className={baseCls}
        >
          <option value="">Select plant...</option>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Production Line</label>
        <select
          value={value.lineId}
          onChange={(e) => {
            const cleared = clearBelow("lineId");
            cleared.lineId = e.target.value;
            onChange(cleared);
          }}
          disabled={disabled || !value.plantId}
          className={baseCls}
        >
          <option value="">{value.plantId ? "Optional..." : "Select plant first"}</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Department</label>
        <select
          value={value.deptId}
          onChange={(e) => {
            const cleared = clearBelow("deptId");
            cleared.deptId = e.target.value;
            onChange(cleared);
          }}
          disabled={disabled || !value.lineId}
          className={baseCls}
        >
          <option value="">{value.lineId ? "Optional..." : "Select line first"}</option>
          {depts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Resource Group</label>
        <select
          value={value.rgId}
          onChange={(e) => {
            const cleared = clearBelow("rgId");
            cleared.rgId = e.target.value;
            onChange(cleared);
          }}
          disabled={disabled || !value.deptId}
          className={baseCls}
        >
          <option value="">{value.deptId ? "Optional..." : "Select dept first"}</option>
          {rgs.map((rg) => (
            <option key={rg.id} value={rg.id}>
              {rg.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Resource / Asset</label>
        <input
          type="number"
          value={value.resourceId}
          onChange={(e) => onChange({ ...value, resourceId: e.target.value })}
          disabled={disabled || !value.rgId}
          className={baseCls}
          placeholder={value.rgId ? "Resource ID..." : "Select RG first"}
        />
      </div>

      {effectiveTarget && (
        <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400">
          Target: {effectiveTarget}
        </p>
      )}
    </div>
  );
}
