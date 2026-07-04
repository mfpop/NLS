import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { PageToolbar, ToolbarButton } from "@/components/layout/PageToolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { CONTINUOUS_IMPROVEMENT_SUMMARY_QUERY } from "@/graphql/improvementQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/* ── TYPES ── */

interface ImprovementSummary {
  totalSuggestions: number;
  acceptedSuggestions: number;
  rejectedSuggestions: number;
  convertedSuggestions: number;
  activeKaizenCount: number;
  completedKaizenCount: number;
  overdueKaizenCount: number;
  activeA3Count: number;
  completedA3Count: number;
  overdueA3Count: number;
  improvementsByTarget: { targetType: string; count: number }[];
  improvementsByStatus: { status: string; count: number }[];
}

/* ── HELPERS ── */

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-primary", UNDER_REVIEW: "bg-warning", ACCEPTED: "bg-success",
  REJECTED: "bg-danger", CONVERTED_TO_KAIZEN: "bg-purple-500",
  PLANNED: "bg-primary", IN_PROGRESS: "bg-warning", COMPLETED: "bg-success",
  CANCELLED: "bg-danger", DRAFT: "bg-muted-foreground/40", PLAN: "bg-primary",
  DO: "bg-warning", CHECK: "bg-purple-500", ACT: "bg-primary",
};

function formatStatus(s: string): string {
  if (s === "IN_PROGRESS") return "In Progress";
  if (s === "CONVERTED_TO_KAIZEN") return "Converted";
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

/* ── SUB-COMPONENTS ── */

function SectionCard({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex min-h-6 items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 bg-warning/100/60 rounded-full" />
          <div className="flex-1 text-sm font-bold uppercase tracking-[0.12em] text-warning/70 dark:text-amber-400/70">{title}</div>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

interface KpiCardProps {
  label: string;
  value: ReactNode;
  onClick?: () => void;
  badge?: { text: string; color: string };
  muted?: boolean;
}

function KpiCard({ label, value, onClick, badge, muted }: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group rounded-sm border border-border/60 bg-card p-3 transition-all duration-200 text-left ${
        onClick ? "hover:border-warning/30/60 dark:hover:border-amber-600/40 hover:shadow-sm cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium ${theme.textMuted} truncate`}>{label}</p>
          <p className={`text-lg font-bold ${muted ? theme.textMuted : theme.textPrimary}`}>{value}</p>
        </div>
        {badge && (
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
      {onClick && (
        <div className="mt-1 text-[10px] font-medium text-warning dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
          View details →
        </div>
      )}
    </button>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barColor = color || STATUS_COLORS[label.replace(/ /g, "_").toUpperCase()] || "bg-primary/60";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs ${theme.textPrimary}`}>{label}</span>
        <span className={`text-xs font-semibold ${theme.textPrimary}`}>{count} <span className={`${theme.textMuted} font-normal`}>({pct}%)</span></span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── MAIN COMPONENT ── */

export function ContinuousImprovementPage() {
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl+F / Cmd+F focuses the search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const { data, loading, refetch } = useQuery<{ continuousImprovementSummary: ImprovementSummary }>(CONTINUOUS_IMPROVEMENT_SUMMARY_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const summary = data?.continuousImprovementSummary || null;
  const debouncedSearch = useDebouncedValue(search, 250);

  const searchPredicate = (label: string) => {
    if (!debouncedSearch) return true;
    return label.toLowerCase().includes(debouncedSearch.toLowerCase());
  };

  const filteredTargets = (summary?.improvementsByTarget || []).filter((t) => searchPredicate(t.targetType));
  const filteredStatuses = (summary?.improvementsByStatus || []).filter((s) => searchPredicate(s.status));
  const targetTotal = summary?.improvementsByTarget.reduce((a, b) => a + b.count, 0) || 0;
  const statusTotal = summary?.improvementsByStatus.reduce((a, b) => a + b.count, 0) || 0;
  const conversionRate = summary && summary.totalSuggestions > 0 ? Math.round((summary.convertedSuggestions / summary.totalSuggestions) * 100) : 0;
  const totalKaizens = summary ? summary.activeKaizenCount + summary.completedKaizenCount + summary.overdueKaizenCount : 0;
  const totalA3 = summary ? summary.activeA3Count + summary.completedA3Count + summary.overdueA3Count : 0;

  const hRefresh = useCallback(async () => {
    await refetch();
    setSuccessMsg("Data refreshed");
    setTimeout(() => setSuccessMsg(null), 5000);
  }, [refetch]);

  return (
    <>
      <style>{`@media print { .print-ignore { display: none !important; } .print-area { display: block !important; max-width: 100% !important; border: none !important; } body { background: white !important; } }`}</style>
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        {successMsg && <div className={`shrink-0 h-8 flex items-center justify-center ${theme.toastSuccess} text-sm font-semibold border-b print-ignore`}>{successMsg}</div>}
        <div className="print-ignore">
          <PageHeader icon={<RefreshCw className="h-5 w-5 stroke-current" />}
            iconClass="bg-warning/15 text-warning dark:bg-amber-900/40 dark:text-amber-400"
            title="Continuous Improvement" subtitle="Overview and tracking of the improvement system." />
        </div>
        <div className="print-ignore">
          <PageToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search target areas or statuses..."
            actions={<ToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} />}
          />
        </div>

        <div className="print-area flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-5 p-4">
            {loading && !summary ? (
              /* Loading Skeleton */
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-4xl mb-6">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="rounded-sm border border-border/40 bg-card p-3 animate-pulse">
                      <div className="space-y-2">
                        <div className="h-3 w-16 rounded bg-muted" />
                        <div className="h-5 w-10 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" />
                  Loading improvement data...
                </div>
              </div>
            ) : !summary ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1`}>No improvement data yet</h3>
                <p className={`text-xs ${theme.textSecondary} leading-relaxed max-w-xs mb-4`}>
                  Create suggestions and kaizens to see your continuous improvement overview here.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => navigate("/improve/suggestions")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-warning px-3 text-[11px] font-semibold text-white hover:bg-warning/80 transition-colors">
                    New Suggestion
                  </button>
                  <button type="button" onClick={hRefresh}
                    className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw className="h-3 w-3 stroke-current" /> Refresh
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ── Suggestions ── */}
                <SectionCard title="Suggestions" badge={conversionRate > 0 ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border bg-accent/15 dark:bg-purple-900/30 text-accent-foreground dark:text-purple-300 border-accent/20 dark:border-purple-800">
                    {conversionRate}% conversion
                  </span>
                ) : undefined}>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <KpiCard label="Total" value={summary.totalSuggestions}
                      onClick={() => navigate("/improve/suggestions")} />
                    <KpiCard label="Accepted" value={summary.acceptedSuggestions} />
                    <KpiCard label="Rejected" value={summary.rejectedSuggestions} muted />
                    <KpiCard label="Converted" value={summary.convertedSuggestions}
                      badge={conversionRate > 0 ? { text: `${conversionRate}%`, color: "bg-accent/15 dark:bg-purple-900/30 text-accent-foreground dark:text-purple-300" } : undefined} />
                    <KpiCard label="Conversion Rate" value={`${conversionRate}%`} muted />
                  </div>
                </SectionCard>

                {/* ── Kaizen ── */}
                <SectionCard title="Kaizen" badge={summary.overdueKaizenCount > 0 ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border bg-danger/15 dark:bg-red-900/30 text-danger dark:text-red-300 border-danger/20 dark:border-red-800">
                    {summary.overdueKaizenCount} overdue
                  </span>
                ) : undefined}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard label="Active" value={summary.activeKaizenCount}
                      onClick={() => navigate("/improve/kaizen")} />
                    <KpiCard label="Completed" value={summary.completedKaizenCount} />
                    <KpiCard label="Overdue" value={summary.overdueKaizenCount}
                      badge={summary.overdueKaizenCount > 0 ? { text: "\u26A0", color: "bg-warning/15 dark:bg-orange-900/30 text-warning dark:text-orange-300" } : undefined}
                      muted={summary.overdueKaizenCount === 0} />
                    <KpiCard label="Completion Rate" value={totalKaizens > 0 ? `${Math.round((summary.completedKaizenCount / totalKaizens) * 100)}%` : "0%"}
                      muted />
                  </div>
                </SectionCard>

                {/* ── A3/PDCA ── */}
                <SectionCard title="A3 / PDCA" badge={summary.overdueA3Count > 0 ? (
                  <span className="inline-flex items-center rounded-sm bg-danger/15 dark:bg-red-900/30 text-danger dark:text-red-300 px-1.5 py-0.5 text-[8px] font-semibold">
                    {summary.overdueA3Count} overdue
                  </span>
                ) : undefined}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard label="Active" value={summary.activeA3Count}
                      onClick={() => navigate("/improve/a3-pdca")} />
                    <KpiCard label="Completed" value={summary.completedA3Count} />
                    <KpiCard label="Overdue" value={summary.overdueA3Count}
                      badge={summary.overdueA3Count > 0 ? { text: "\u26A0", color: "bg-warning/15 dark:bg-orange-900/30 text-warning dark:text-orange-300" } : undefined}
                      muted={summary.overdueA3Count === 0} />
                    <KpiCard label="Completion Rate" value={totalA3 > 0 ? `${Math.round((summary.completedA3Count / totalA3) * 100)}%` : "0%"}
                      muted />
                  </div>
                </SectionCard>

                {/* ── Breakdown Charts ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-sm border border-border/60 bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-4 w-0.5 bg-warning/100/60 rounded-full" />
                      <h3 className={`text-[11px] font-bold uppercase tracking-[0.12em] ${theme.textMuted}`}>By Target Area</h3>
                    </div>
                    {targetTotal === 0 ? (
                      <div className={`flex items-center justify-center h-24 text-[11px] italic ${theme.textMuted}`}>No data by target area</div>
                    ) : (
                      <div className="space-y-2.5">
                        {filteredTargets.map((t) => (
                          <BarRow key={t.targetType} label={t.targetType} count={t.count} total={targetTotal} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-sm border border-border/60 bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-4 w-0.5 bg-primary/60 rounded-full" />
                      <h3 className={`text-[11px] font-bold uppercase tracking-[0.12em] ${theme.textMuted}`}>By Status</h3>
                    </div>
                    {statusTotal === 0 ? (
                      <div className={`flex items-center justify-center h-24 text-[11px] italic ${theme.textMuted}`}>No data by status</div>
                    ) : (
                      <div className="space-y-2.5">
                        {filteredStatuses.map((s) => (
                          <BarRow key={s.status} label={formatStatus(s.status)} count={s.count} total={statusTotal} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="print-ignore shrink-0 border-t border-border-major bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <span>Continuous Improvement</span>
          <span className="flex-1" />
          {summary && <span>Suggestions: {summary.totalSuggestions} · Kaizens: {totalKaizens} · A3/PDCA: {totalA3}</span>}
        </div>
      </div>
    </>
  );
}
