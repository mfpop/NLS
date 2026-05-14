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
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-semibold ${primary ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
      {label}
      {primary && <span className="text-[8px] opacity-70">PRIMARY</span>}
    </span>
  );
}

function EmptyBadge({ label }: { label: string }) {
  return <span className="text-[10px] text-slate-400 dark:text-slate-500">{label}</span>;
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
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Product Family</span>
        <span className="inline-flex min-w-0 flex-wrap gap-1">
          {family ? <ScopeChip label={family.name} /> : <EmptyBadge label="None" />}
        </span>
      </div>

      <div className="grid items-start gap-2" style={{ gridTemplateColumns: "120px 1fr" }}>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Product Models</span>
        <div className="min-w-0">
          {models.length ? (
            <div className="flex flex-wrap gap-1">
              {visibleModels.map((model) => (
                <ScopeChip key={model.id} label={model.name || model.code} primary={model.id === primaryModel?.id || model.isPrimary} />
              ))}
              {hiddenCount > 0 && (
                <button type="button" onClick={onMoreModels} className="rounded-full bg-slate-100 px-1.5 py-px text-[9px] font-semibold text-slate-500 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  +{hiddenCount} more
                </button>
              )}
            </div>
          ) : <EmptyBadge label="None" />}
        </div>
      </div>
      {showPrimaryRow && (
        <div className="grid items-center gap-2" style={{ gridTemplateColumns: "120px 1fr" }}>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Primary Model</span>
          <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{primaryModel?.name || "-"}</span>
        </div>
      )}
    </div>
  );
}
