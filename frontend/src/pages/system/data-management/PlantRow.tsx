import { useNavigate } from "react-router-dom";
import { Factory, ExternalLink, GitBranch, Pencil, ToggleLeft, ToggleRight, Eye } from "lucide-react";
import type { Plant } from "@/types/plant";
import { theme } from "../../../styles/themeTokens";
import { ActionsDropdown } from "./shared";

interface PlantRowProps {
  plant: Plant;
  isSelected: boolean;
  onToggleSelect: () => void;
  onToggleStatus: () => void;
}

export function PlantRow({ plant, isSelected, onToggleSelect, onToggleStatus }: PlantRowProps) {
  const navigate = useNavigate();

  return (
    <div className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm ${
      isSelected ? theme.rowSelected : theme.row
    } ${theme.cardHover}`}>
      {/* Checkbox */}
      <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect}
          className={`h-4 w-4 rounded ${theme.checkbox} ${theme.focusRing}`} />
      </label>

      {/* Icon */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${theme.iconBoxBlue}`}>
        <Factory className="h-4 w-4 stroke-current" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${theme.textPrimary}`}>{plant.name}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{plant.code}</span>
          {plant.status === "active" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
              Inactive
            </span>
          )}
        </div>
        <div className={`mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs ${theme.listMeta}`}>
          <span>{plant.building}</span>
          <span className={`inline-block h-1 w-1 rounded-full ${theme.dividerDot}`} />
          <span>{plant.lineCount} line(s)</span>
          <span className={`inline-block h-1 w-1 rounded-full ${theme.dividerDot}`} />
          <span>{plant.departmentCount} dept(s)</span>
          <span className={`inline-block h-1 w-1 rounded-full ${theme.dividerDot}`} />
          <span>{plant.groupCount} resource group(s)</span>
          <span className={`inline-block h-1 w-1 rounded-full ${theme.dividerDot}`} />
          <span>{plant.resourceCount} resource(s)</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => navigate("/system/data-management/plant/" + plant.id)}
          className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors active:scale-[0.97] inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 stroke-current" />
          Details
        </button>
        <ActionsDropdown actions={[
          { label: "Edit", icon: <Pencil className="h-3 w-3 stroke-current" />, onClick: () => navigate("/system/data-management/plant/" + plant.id) },
          { label: plant.status === "active" ? "Disable" : "Activate", icon: plant.status === "active" ? <ToggleLeft className="h-3 w-3 stroke-current" /> : <ToggleRight className="h-3 w-3 stroke-current" />, onClick: () => { onToggleStatus(); } },
          { label: "Go to Production Lines", icon: <GitBranch className="h-3 w-3 stroke-current" />, onClick: () => navigate("/system/data-management/production-lines") },
          { label: "View in Control Tower", icon: <ExternalLink className="h-3 w-3 stroke-current" />, onClick: () => navigate(`/control-tower?plant=${encodeURIComponent(plant.name)}`) },
        ]} />
      </div>
    </div>
  );
}
