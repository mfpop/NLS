import { getIconByKey } from "../../../../config/iconRegistry";
import { getColorTokens } from "../../../../config/entityColorRegistry";

interface EntityVisualPreviewProps {
  iconKey: string;
  colorKey: string;
  label: string;
  size?: "sm" | "md" | "lg";
}

export function EntityVisualPreview({ iconKey, colorKey, label, size = "md" }: EntityVisualPreviewProps) {
  const Icon = getIconByKey(iconKey);
  const tokens = getColorTokens(colorKey);
  const dims = size === "sm" ? "h-8 w-8" : size === "md" ? "h-10 w-10" : "h-12 w-12";
  const iconDims = size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center justify-center rounded-lg ${dims} ${tokens.bg} ${tokens.darkBg}`}
      >
        <Icon className={`${iconDims} stroke-current ${tokens.text} ${tokens.darkText}`} />
      </span>
      <span className={`text-xs font-medium ${tokens.text} ${tokens.darkText}`}>{label}</span>
    </div>
  );
}
