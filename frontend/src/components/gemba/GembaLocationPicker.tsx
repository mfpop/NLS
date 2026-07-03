import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { MapPin, Loader2, AlertCircle, Info } from "lucide-react";
import { GEMBA_TARGET_OPTIONS_QUERY } from "@/graphql/gembaQueries";

export interface LocationSelection {
  targetType: string;
  targetId: string;
  locationLabel: string;
  locationPath: string;
}

interface TargetOption {
  id: string;
  targetType: string;
  name: string;
  code: string;
  departmentId?: string | null;
  departmentName?: string | null;
  resourceGroupId?: string | null;
  resourceGroupName?: string | null;
  locationPath: string;
}

interface GembaTargetOptionsData {
  gembaTargetOptions: {
    productionLine: TargetOption | null;
    departments: TargetOption[];
    resourceGroups: TargetOption[];
    resources: TargetOption[];
  };
}

interface Props {
  value: LocationSelection | null;
  onChange: (selection: LocationSelection | null) => void;
  disabled?: boolean;
  structureError: boolean;
  onRetryStructure: () => void;
  plantId: string | null;
  plantName: string | null;
  productionLineId: string | null;
  productionLineName: string | null;
}

const LEVEL_OPTIONS = [
  { value: "PRODUCTION_LINE", label: "Production Line" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "RESOURCE_GROUP", label: "Resource Group" },
  { value: "RESOURCE", label: "Resource" },
];

function buildTargetDisplay(
  target: TargetOption,
  plantName?: string | null,
  lineName?: string | null,
): { label: string; path: string } {
  const label = target.code ? `${target.code} — ${target.name}` : target.name;
  const parts: string[] = [];
  if (plantName) parts.push(plantName);
  if (lineName) parts.push(lineName);
  if (target.departmentName && target.targetType !== "DEPARTMENT") parts.push(target.departmentName);
  if (target.resourceGroupName && target.targetType !== "RESOURCE_GROUP") parts.push(target.resourceGroupName);
  parts.push(target.name);
  return { label, path: parts.join(" › ") };
}

export function buildCompactTargetPath(
  targetType: string,
  target: TargetOption | null,
  lineName?: string | null,
): string {
  if (!target) return "";
  const parts: string[] = [];
  if (lineName) parts.push(lineName);
  if (target.departmentName && targetType !== "DEPARTMENT") parts.push(target.departmentName);
  if (target.resourceGroupName && targetType !== "RESOURCE_GROUP") parts.push(target.resourceGroupName);
  parts.push(target.name);
  return parts.join(" › ");
}

/* ── Shared select class ── */
const SELECT_CLASS =
  "w-full h-8 rounded-[2px] border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-0 disabled:bg-slate-50 disabled:text-slate-400";

export function GembaLocationPicker({
  value, onChange, disabled, structureError, onRetryStructure,
  plantId, plantName, productionLineId, productionLineName,
}: Props) {
  // ── Cascade state ──
  const [level, setLevel] = useState<string>(productionLineId ? "PRODUCTION_LINE" : "");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedRgId, setSelectedRgId] = useState<string>("");

  const hasContext = !!plantId && !!productionLineId;
  const plantIdNum = plantId ? parseInt(plantId, 10) : null;
  const lineIdNum = productionLineId ? parseInt(productionLineId, 10) : null;

  // ── Single scoped query ──
  const {
    data: optionsData,
    loading: optionsLoading,
    error: optionsError,
    refetch: refetchOptions,
  } = useQuery<GembaTargetOptionsData>(GEMBA_TARGET_OPTIONS_QUERY, {
    variables: { plantId: plantIdNum, productionLineId: lineIdNum },
    skip: !hasContext,
    fetchPolicy: "cache-and-network",
  });

  const productionLine = optionsData?.gembaTargetOptions?.productionLine ?? null;
  const departments = optionsData?.gembaTargetOptions?.departments ?? [];
  const resourceGroups = optionsData?.gembaTargetOptions?.resourceGroups ?? [];
  const resources = optionsData?.gembaTargetOptions?.resources ?? [];

  // ── Filtered lists ──
  const filteredRGs = useMemo(() => {
    if (!selectedDeptId) return resourceGroups;
    return resourceGroups.filter((rg) => rg.departmentId === selectedDeptId);
  }, [resourceGroups, selectedDeptId]);

  const filteredResources = useMemo(() => {
    if (!selectedRgId) return [];
    return resources.filter((r) => r.resourceGroupId === selectedRgId);
  }, [resources, selectedRgId]);

  // ── Default: auto-select Production Line on mount ──
  useEffect(() => {
    if (!hasContext) {
      setLevel("");
      setSelectedDeptId("");
      setSelectedRgId("");
      onChange(null);
      return;
    }
    if (productionLine && level === "PRODUCTION_LINE" && !value) {
      const { label, path } = buildTargetDisplay(productionLine, plantName, productionLineName);
      onChange({
        targetType: "PRODUCTION_LINE",
        targetId: productionLine.id,
        locationLabel: label,
        locationPath: path,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasContext, plantId, productionLineId, productionLine, level]);

  // ── Reset on context change ──
  useEffect(() => {
    setLevel(productionLineId ? "PRODUCTION_LINE" : "");
    setSelectedDeptId("");
    setSelectedRgId("");
    onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantId, productionLineId]);

  // ── Level change → reset deeper selections ──
  const handleLevelChange = useCallback((newLevel: string) => {
    setLevel(newLevel);
    setSelectedDeptId("");
    setSelectedRgId("");
    onChange(null);
  }, [onChange]);

  // ── Department change → clear RG + resource, save dept target ──
  const handleDeptChange = useCallback((deptId: string) => {
    setSelectedDeptId(deptId);
    setSelectedRgId("");
    if (deptId) {
      const dept = departments.find((d) => d.id === deptId);
      if (dept) {
        const { label, path } = buildTargetDisplay(dept, plantName, productionLineName);
        onChange({ targetType: "DEPARTMENT", targetId: dept.id, locationLabel: label, locationPath: path });
      }
    } else {
      onChange(null);
    }
  }, [departments, plantName, productionLineName, onChange]);

  // ── RG change → clear resource, save rg target ──
  const handleRgChange = useCallback((rgId: string) => {
    setSelectedRgId(rgId);
    if (rgId) {
      const rg = resourceGroups.find((r) => r.id === rgId);
      if (rg) {
        const { label, path } = buildTargetDisplay(rg, plantName, productionLineName);
        onChange({ targetType: "RESOURCE_GROUP", targetId: rg.id, locationLabel: label, locationPath: path });
      }
    } else {
      onChange(null);
    }
  }, [resourceGroups, plantName, productionLineName, onChange]);

  // ── Resource select from dropdown ──
  const handleResourceSelect = useCallback((resId: string) => {
    const res = resources.find((r) => r.id === resId);
    if (res) {
      const { label, path } = buildTargetDisplay(res, plantName, productionLineName);
      onChange({ targetType: "RESOURCE", targetId: res.id, locationLabel: label, locationPath: path });
    } else {
      onChange(null);
    }
  }, [resources, plantName, productionLineName, onChange]);

  const canLoad = hasContext && !structureError;
  const loading = optionsLoading;
  const fetchError = optionsError;

  // ── No context ──
  if (!hasContext && !structureError) {
    return (
      <div>
        <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">Target *</label>
        <div className="flex items-center gap-1.5 rounded bg-slate-50 border border-slate-200 px-2 py-1.5">
          <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-[10px] text-slate-500">Select a plant and production line from the sidebar first.</span>
        </div>
      </div>
    );
  }

  // ── Structure error ──
  if (structureError) {
    return (
      <div>
        <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">Target *</label>
        <div className="rounded bg-red-50 border border-red-200 px-2 py-1.5">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] text-red-700">Unable to load structure locations. Refresh and try again.</p>
              <button type="button" onClick={onRetryStructure}
                className="text-[10px] font-medium text-red-700 underline hover:no-underline mt-0.5">Retry</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const needsDept = level === "DEPARTMENT" || level === "RESOURCE_GROUP" || level === "RESOURCE";
  const needsRg = level === "RESOURCE_GROUP" || level === "RESOURCE";
  const needsResource = level === "RESOURCE";

  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">Target *</label>

      <div className="space-y-1.5">
        {/* ── Context breadcrumb ── */}
        <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 rounded px-1.5 py-1 border border-slate-200">
          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{plantName} › {productionLineName}</span>
        </div>

        {/* ── Target Level dropdown ── */}
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-0.5">Target Level</label>
          <select
            value={level}
            onChange={(e) => handleLevelChange(e.target.value)}
            disabled={disabled || !canLoad}
            className={SELECT_CLASS}
          >
            <option value="">Select target level...</option>
            {LEVEL_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* ── Loading / Error states ── */}
        {loading && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-1 py-0.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading structure...
          </div>
        )}
        {fetchError && !loading && (
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] text-red-600">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Failed to load.
            <button type="button" onClick={() => refetchOptions()} className="underline font-medium ml-1">Retry</button>
          </div>
        )}

        {/* ── Department dropdown ── */}
        {needsDept && (
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-0.5">Department</label>
            <select
              value={selectedDeptId}
              onChange={(e) => handleDeptChange(e.target.value)}
              disabled={disabled || departments.length === 0}
              className={SELECT_CLASS}
            >
              <option value="">{departments.length === 0 ? "No departments available" : "Select department..."}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Resource Group dropdown ── */}
        {needsRg && selectedDeptId && (
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-0.5">Resource Group</label>
            <select
              value={selectedRgId}
              onChange={(e) => handleRgChange(e.target.value)}
              disabled={disabled || filteredRGs.length === 0}
              className={SELECT_CLASS}
            >
              <option value="">{filteredRGs.length === 0 ? "No RGs for this department" : "Select resource group..."}</option>
              {filteredRGs.map((rg) => (
                <option key={rg.id} value={rg.id}>{rg.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Resource dropdown ── */}
        {needsResource && selectedDeptId && selectedRgId && (
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-0.5">Resource</label>
            <select
              value={value?.targetType === "RESOURCE" ? value.targetId : ""}
              onChange={(e) => handleResourceSelect(e.target.value)}
              disabled={disabled || filteredResources.length === 0}
              className={SELECT_CLASS}
            >
              <option value="">{filteredResources.length === 0 ? "No resources available" : "Select resource..."}</option>
              {filteredResources.map((res) => (
                <option key={res.id} value={res.id}>
                  {res.code ? `${res.code} — ${res.name}` : res.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── Selected path breadcrumb ── */}
        {value && value.locationPath && (
          <div className="flex h-7 items-center gap-1 text-xs text-slate-600 bg-slate-50 rounded px-1.5 border border-slate-200 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate" title={value.locationPath}>{value.locationPath}</span>
          </div>
        )}
      </div>
    </div>
  );
}
