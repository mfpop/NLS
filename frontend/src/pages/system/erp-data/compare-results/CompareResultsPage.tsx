import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { GitCompare, Search, RefreshCw, CheckCircle, Plus, Minus, Ban, HelpCircle } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const COMPARE_JOBS_QUERY = gql`
  query ImportJobsForCompare($sourceId: String) {
    importJobs(sourceId: $sourceId, status: "COMPARED") {
      id fileName sourceConfigName recordsCreated recordsUpdated recordsProcessed createdAt
    }
    importSourceConfigs(isActive: true) {
      id name domain
    }
  }
`;

const inputClass = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const buttonClass = `inline-flex items-center gap-1.5 h-8 px-2 rounded text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors`;

interface CompareJob {
  id: string; fileName: string; sourceConfigName: string; recordsCreated: number; recordsUpdated: number; recordsProcessed: number; createdAt: string;
}
interface ImportSource { id: string; name: string; domain: string; }

const ACTION_STYLES: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  CREATE: { label: "New", icon: Plus, color: "text-emerald-600 bg-emerald-50" },
  UPDATE: { label: "Update", icon: RefreshCw, color: "text-blue-600 bg-blue-50" },
  UNCHANGED: { label: "Unchanged", icon: Minus, color: "text-slate-500 bg-slate-100" },
  CONFLICT: { label: "Conflict", icon: HelpCircle, color: "text-amber-600 bg-amber-50" },
  DEACTIVATE: { label: "Deactivate", icon: Ban, color: "text-red-600 bg-red-50" },
};

export function CompareResultsPage() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState("");

  const { data, loading, refetch } = useQuery<{ importJobs: CompareJob[]; importSourceConfigs: ImportSource[] }>(
    COMPARE_JOBS_QUERY,
    { variables: { sourceId: sourceFilter || null }, fetchPolicy: "cache-and-network" }
  );

  const jobs = data?.importJobs ?? [];
  const sources = data?.importSourceConfigs ?? [];

  const filtered = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j) => j.fileName.toLowerCase().includes(q) || j.sourceConfigName.toLowerCase().includes(q));
  }, [jobs, search]);

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  const sampleResults = useMemo(() => {
    if (!selectedJob) return [];
    const actions: Array<{ action: string; entity: string; key: string; erpVal: string; nexusVal: string; status: string }> = [
      { action: "CREATE", entity: "ProductionLine", key: "LINE-001", erpVal: "Assembly Line A", nexusVal: "-", status: "PENDING" },
      { action: "UPDATE", entity: "Department", key: "DEPT-003", erpVal: "Final Assembly", nexusVal: "Pre-Assembly", status: "PENDING" },
      { action: "UNCHANGED", entity: "ResourceGroup", key: "RG-007", erpVal: "Welding Station", nexusVal: "Welding Station", status: "PENDING" },
      { action: "CONFLICT", entity: "ProductionLine", key: "LINE-010", erpVal: "Packaging Line B", nexusVal: "Packaging Line A (modified)", status: "PENDING" },
      { action: "DEACTIVATE", entity: "Department", key: "DEPT-099", erpVal: "-", nexusVal: "Old Warehouse (no longer in ERP)", status: "PENDING" },
    ];
    return actions;
  }, [selectedJob]);

  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of sampleResults) {
      counts[r.action] = (counts[r.action] || 0) + 1;
    }
    return counts;
  }, [sampleResults]);

  const filteredResults = useMemo(() => {
    if (!filterAction) return sampleResults;
    return sampleResults.filter((r) => r.action === filterAction);
  }, [sampleResults, filterAction]);

  return (
    <AppPageLayout
      title="Compare Results"
      subtitle="Review differences between imported ERP data and existing Nexus records before applying."
      icon={<GitCompare />}
      iconClass="text-indigo-600"
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex h-9 items-center gap-2 border-b border-border/35 bg-muted px-3 select-none">
          <div className="relative w-64">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className={inputClass} />
          </div>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-7 rounded border border-border/30 bg-card px-2 text-[11px] text-muted-foreground outline-none">
            <option value="">All Sources</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex-1" />
          <button type="button" onClick={() => refetch()} className={buttonClass}><RefreshCw className="h-4 w-4 stroke-current" /><span>Refresh</span></button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-56 shrink-0 border-r border-border/30 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="h-2 w-2 rounded-full bg-success animate-bounce" /> Loading...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center"><GitCompare className="h-8 w-8 mx-auto text-indigo-600/30 stroke-current" /><p className="mt-2 text-xs text-muted-foreground">No compared jobs.</p></div>
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((job) => (
                  <button key={job.id} type="button" onClick={() => setSelectedJobId(job.id)}
                    className={`w-full text-left px-3 py-2 border-b border-border/10 transition-colors hover:bg-muted/30 ${selectedJobId === job.id ? "bg-muted/40" : ""}`}>
                    <div className="text-[11px] font-medium text-foreground truncate">{job.fileName || "Untitled"}</div>
                    <div className="text-[10px] text-muted-foreground">{job.sourceConfigName}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {selectedJob ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">{selectedJob.fileName}</h3>
                  <span className="text-[11px] text-muted-foreground">{selectedJob.recordsProcessed} rows compared</span>
                </div>

                {Object.keys(actionCounts).length > 0 && (
                  <div className="flex items-center gap-3">
                    {Object.entries(ACTION_STYLES).map(([key, style]) => {
                      const count = actionCounts[key] ?? 0;
                      if (count === 0) return null;
                      return (
                        <button key={key} type="button" onClick={() => setFilterAction(filterAction === key ? "" : key)}
                          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${style.color} ${filterAction === key ? "ring-1 ring-border" : ""}`}>
                          <style.icon className="h-3.5 w-3.5 stroke-current" />
                          {style.label} ({count})
                        </button>
                      );
                    })}
                    {filterAction && <button type="button" onClick={() => setFilterAction("")} className="text-[10px] text-muted-foreground hover:text-foreground">Clear filter</button>}
                  </div>
                )}

                <div className="rounded border border-border/20 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/50">
                        <th className="h-7 px-3 text-left text-[10px] font-semibold text-muted-foreground">Action</th>
                        <th className="h-7 px-3 text-left text-[10px] font-semibold text-muted-foreground">Entity</th>
                        <th className="h-7 px-3 text-left text-[10px] font-semibold text-muted-foreground">Stable Key</th>
                        <th className="h-7 px-3 text-left text-[10px] font-semibold text-muted-foreground">ERP Value</th>
                        <th className="h-7 px-3 text-left text-[10px] font-semibold text-muted-foreground">Nexus Value</th>
                        <th className="h-7 px-3 text-center text-[10px] font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((row, i) => {
                        const style = ACTION_STYLES[row.action] ?? ACTION_STYLES.UNCHANGED;
                        return (
                          <tr key={i} className="border-b border-border/10 hover:bg-muted/20">
                            <td className="h-7 px-3"><span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${style.color}`}><style.icon className="h-3 w-3 stroke-current" />{style.label}</span></td>
                            <td className="h-7 px-3 font-medium text-foreground">{row.entity}</td>
                            <td className="h-7 px-3 text-muted-foreground font-mono">{row.key}</td>
                            <td className="h-7 px-3 text-muted-foreground">{row.erpVal}</td>
                            <td className="h-7 px-3 text-muted-foreground">{row.nexusVal}</td>
                            <td className="h-7 px-3 text-center">
                              {row.status === "PENDING" ? <span className="inline-block h-2 w-2 rounded-full bg-amber-400" title="Pending review" /> : <CheckCircle className="h-3.5 w-3.5 stroke-current text-emerald-500 mx-auto" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <GitCompare className="h-10 w-10 stroke-current text-indigo-600/30 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Compare Results</h3>
                  <p className="text-xs text-muted-foreground max-w-60 mx-auto leading-relaxed">Select a compared job to review differences between ERP data and existing Nexus records.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
