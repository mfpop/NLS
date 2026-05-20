import { getIconByKey } from "../../../../config/iconRegistry";
import { getColorTokens } from "../../../../config/entityColorRegistry";
import { useEntityVisualSettings } from "../hooks/useEntityVisualSettings";

interface EntityBadgeProps {
  type: string;
  size?: "sm" | "md";
  className?: string;
}

export function EntityBadge({ type, size = "sm", className = "" }: EntityBadgeProps) {
  const { getSetting } = useEntityVisualSettings();
  const setting = getSetting(type);
  const iconKey = setting?.iconKey || "layers";
  const colorKey = setting?.colorKey || "gray";
  const label = setting?.displayLabel || type;
  const Icon = getIconByKey(iconKey);
  const tokens = getColorTokens(colorKey);
  const dims = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${tokens.bg} ${tokens.text} ${tokens.darkBg} ${tokens.darkText} ${className}`}
    >
      <Icon className={`${dims} stroke-current`} />
      {label}
    </span>
  );
}
