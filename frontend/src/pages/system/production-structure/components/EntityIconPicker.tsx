import { ENTITY_CONFIG } from "../config/entityConfig";
import type { EntityConfigItem } from "../config/entityConfig";
import { Check } from "lucide-react";
import { saveEntityConfig } from "../entityDisplay";

const PICKER_ORDER = ["company", "plant", "productionLine", "department", "resourceGroup", "resource"];

interface EntityIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  entityType?: string;
  entityId?: string;
}

export function EntityIconPicker({ value, onChange, entityType, entityId }: EntityIconPickerProps) {
  const handleSelect = (key: string) => {
    onChange(key);
    if (entityType && entityId) {
      saveEntityConfig(entityType, entityId, key);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {PICKER_ORDER.map((key) => {
        const cfg: EntityConfigItem = ENTITY_CONFIG[key];
        const Icon = cfg.icon;
        const isSelected = value === key;
        const [textColor, bgColor] = cfg.color.split(" ");
        return (
          <button
            key={key}
            type="button"
            onClick={() => handleSelect(key)}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
              isSelected
                ? "border-slate-800 bg-slate-50 dark:border-slate-200 dark:bg-slate-800"
                : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${bgColor}`}>
              <Icon className={`h-5 w-5 stroke-current ${textColor}`} />
            </span>
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{cfg.label}</span>
            {isSelected && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900">
                <Check className="h-2.5 w-2.5 stroke-current" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
