import { getIconByKey } from "../../../../config/iconRegistry";
import { getColorClasses } from "../../../../config/entityColorRegistry";
import { useEntityVisualSettings } from "../hooks/useEntityVisualSettings";

interface EntityIconProps {
  type: string;
  size?: "sm" | "md" | "lg";
  showBg?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { icon: "h-3 w-3", box: "h-5 w-5" },
  md: { icon: "h-5 w-5", box: "h-9 w-9" },
  lg: { icon: "h-6 w-6", box: "h-12 w-12" },
};

export function EntityIcon({ type, size = "md", showBg = true, className = "" }: EntityIconProps) {
  const { getSetting } = useEntityVisualSettings();
  const setting = getSetting(type);
  const iconKey = setting?.iconKey || "layers";
  const colorKey = setting?.colorKey || "gray";
  const Icon = getIconByKey(iconKey);
  const { iconBg, iconText } = getColorClasses(colorKey);
  const dims = SIZE_MAP[size];

  if (!showBg) {
    return <Icon className={`${dims.icon} stroke-current ${iconText} ${className}`} />;
  }

  return (
    <span className={`inline-flex items-center justify-center rounded-lg ${dims.box} ${iconBg} ${className}`}>
      <Icon className={`${dims.icon} stroke-current ${iconText}`} />
    </span>
  );
}
