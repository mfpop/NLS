import { ENTITY_CONFIG } from "../config/entityConfig";
import type { EntityConfigItem } from "../config/entityConfig";
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

  const getSelectedBg = (textColor: string): string => {
    const colorMap: Record<string, string> = {
      emerald: "bg-success",
      blue: "bg-primary",
      amber: "bg-warning",
      purple: "bg-info",
      rose: "bg-danger",
      gray: "bg-muted",
    };
    const color = textColor.replace("text-", "").replace(/-.*$/, "");
    return colorMap[color] || "bg-muted";
  };

  return (
    <div className="flex gap-2">
      {PICKER_ORDER.map((key) => {
        const cfg: EntityConfigItem = ENTITY_CONFIG[key];
        const Icon = cfg.icon;
        const isSelected = value === key;
        const [textColor, bgColor] = cfg.color.split(" ");
        const selectedBg = getSelectedBg(textColor);
        return (
          <button
            key={key}
            type="button"
            onClick={() => handleSelect(key)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border-2 py-1.5 px-1 transition-all ${
              isSelected
                ? `${selectedBg} border-border`
                : "border-transparent hover:border-border hover:border-border"
            }`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-md ${bgColor}`}>
              <Icon className={`h-3.5 w-3.5 stroke-current ${textColor}`} />
            </span>
            <span className="text-[9px] font-medium text-muted-foreground leading-tight text-center">{cfg.label}</span>
          </button>
        );
      })}
    </div>
  );
}
