import { ReactNode } from "react";
import { Pencil, GitBranch, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";

/* ── Types ── */

export interface ReadinessItem {
  label: string;
  ready: boolean;
}

export interface DataCardProps {
  /* Identity */
  icon: ReactNode;
  iconBg?: string;
  name: string;
  code?: string;
  status: "active" | "inactive";

  /* Parent context */
  parentContext?: string;

  /* Primary metrics (rendered first, slightly stronger) */
  primaryMetrics?: { label: string; value: string | number }[];

  /* Secondary metrics (counts, normal weight) */
  metrics: { label: string; value: string | number }[];

  /* Readiness */
  readiness: ReadinessItem[];

  /* Actions */
  onEdit?: () => void;
  onStructure?: () => void;
  onOpen?: () => void;
  onClick?: () => void;
  selected?: boolean;
  isLowestLevel?: boolean;
}

/* ── Readiness Icon ── */

function ReadinessIcon({ ready }: { ready: boolean }) {
  if (ready) return <CheckCircle className="h-2.5 w-2.5 text-slate-400 stroke-current" />;
  return <XCircle className="h-2.5 w-2.5 text-slate-400 stroke-current" />;
}

/* ── Status Badge ── */

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      isActive
        ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
        : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
    }`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
      {status}
    </span>
  );
}

/* ── Action Buttons ── */

function ActionButtons({ onEdit, onStructure, onOpen, isLowestLevel }: {
  onEdit?: () => void;
  onStructure?: () => void;
  onOpen?: () => void;
  isLowestLevel?: boolean;
}) {
  const secondaryBtn = "inline-flex items-center gap-1.5 h-8 px-3 rounded text-xs font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors";
  return (
    <div className="flex items-center gap-1.5">
      {onEdit && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded text-xs font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5 stroke-current" />
          Edit
        </button>
      )}
      {!isLowestLevel && onStructure && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onStructure?.(); }} className={secondaryBtn}>
          <GitBranch className="h-3.5 w-3.5 stroke-current" />
          Structure
        </button>
      )}
      {onOpen && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpen?.(); }} className={secondaryBtn}>
          <ExternalLink className="h-3.5 w-3.5 stroke-current" />
          Details
        </button>
      )}
    </div>
  );
}

/* ── Readiness Row (calm style) ── */

function ReadinessRow({ items }: { items: ReadinessItem[] }) {
  const allReady = items.every((i) => i.ready);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((item, idx) => (
        <span key={idx} className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <ReadinessIcon ready={item.ready} />
          <span className="text-slate-400 dark:text-slate-500">{item.label}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
        {allReady ? <CheckCircle className="h-2.5 w-2.5 stroke-current" /> : <XCircle className="h-2.5 w-2.5 stroke-current" />}
        {allReady ? "Ready" : "Not Ready"}
      </span>
    </div>
  );
}

/* ── Main DataCard Component ── */

export function DataCard({
  icon,
  iconBg,
  name,
  code,
  status,
  parentContext,
  primaryMetrics,
  metrics,
  readiness,
  onEdit,
  onStructure,
  onOpen,
  onClick,
  selected = false,
  isLowestLevel = false,
}: DataCardProps) {
  return (
    <div
      className={`group rounded-lg border p-3 transition-all ${onClick ? "cursor-pointer" : ""} ${selected ? theme.rowSelected : `${theme.row} hover:shadow-sm ${theme.cardHover}`}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg || theme.iconBoxSubtle}`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${theme.textPrimary}`}>{name}</span>
            {code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{code}</span>}
            <StatusBadge status={status} />
          </div>

          {parentContext && <div className={`text-[11px] ${theme.textMuted}`}>{parentContext}</div>}

          {primaryMetrics && primaryMetrics.length > 0 && (
            <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
              {primaryMetrics.map((m, idx) => (
                <span key={idx}>{idx > 0 && <span className="mx-2 text-slate-400 dark:text-slate-500">|</span>}{m.label}: {m.value}</span>
              ))}
            </div>
          )}

          {metrics.length > 0 && (
            <div className="mt-1 text-gray-500 text-[11px]">
              {metrics.map((m, idx) => (
                <span key={idx}>{idx > 0 && <span className="mx-1.5 text-gray-400">|</span>}{m.label}: {m.value}</span>
              ))}
            </div>
          )}

          <ReadinessRow items={readiness} />
        </div>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <ActionButtons onEdit={onEdit} onStructure={onStructure} onOpen={onOpen} isLowestLevel={isLowestLevel} />
        </div>
      </div>
    </div>
  );
}
