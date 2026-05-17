import { theme } from "../../../../styles/themeTokens";
import type { ProductFamilyAssignment, ProductModelAssignment } from "@/types/productionLine";

interface ProductionLineProductScopeSummaryProps {
  family?: ProductFamilyAssignment | null;
  models: ProductModelAssignment[];
  primaryModelId?: string | null;
  maxVisibleModels?: number;
  onMoreModels?: () => void;
  showPrimaryRow?: boolean;
}

function ScopeChip({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-px text-[11px] font-semibold ${primary ? theme.badgeActive : theme.chip}`}>
      {label}
      {primary && <span className="text-[8px] opacity-70">PRIMARY</span>}
    </span>
  );
}

function EmptyBadge({ label }: { label: string }) {
  return <span className={`text-[12px] ${theme.textSecondary}`}>{label}</span>;
}

export function ProductionLineProductScopeSummary({
  family,
  models,
  primaryModelId,
  maxVisibleModels = 4,
  onMoreModels,
  showPrimaryRow = true,
}: ProductionLineProductScopeSummaryProps) {
  const primaryModel = models.find((model) => model.id === primaryModelId || model.isPrimary);
  const visibleModels = models.slice(0, maxVisibleModels);
  const hiddenCount = Math.max(0, models.length - maxVisibleModels);

  return (
    <div className="space-y-1.5">
      <div className="grid items-start gap-2" style={{ gridTemplateColumns: "120px 1fr" }}>
        <span className={`text-[12px] font-semibold ${theme.textSecondary}`}>Product Family</span>
        <span className="inline-flex min-w-0 flex-wrap gap-1">
          {family ? <ScopeChip label={family.name} /> : <EmptyBadge label="None" />}
        </span>
      </div>

      <div className="grid items-start gap-2" style={{ gridTemplateColumns: "120px 1fr" }}>
        <span className={`text-[12px] font-semibold ${theme.textSecondary}`}>Product Models</span>
        <div className="min-w-0">
          {models.length ? (
            <div className="flex flex-wrap gap-1">
              {visibleModels.map((model) => (
                <ScopeChip key={model.id} label={model.name || model.code} primary={model.id === primaryModel?.id || model.isPrimary} />
              ))}
              {hiddenCount > 0 && (
                <button type="button" onClick={onMoreModels} className={`rounded-full ${theme.chip} ${theme.textPrimary} hover:text-foreground`}>
                  +{hiddenCount} more
                </button>
              )}
            </div>
          ) : <EmptyBadge label="None" />}
        </div>
      </div>
      {showPrimaryRow && (
        <div className="grid items-center gap-2" style={{ gridTemplateColumns: "120px 1fr" }}>
          <span className={`text-[12px] font-semibold ${theme.textSecondary}`}>Primary Model</span>
          <span className={`text-[13px] font-medium ${theme.textPrimary}`}>{primaryModel?.name || "-"}</span>
        </div>
      )}
    </div>
  );
}
