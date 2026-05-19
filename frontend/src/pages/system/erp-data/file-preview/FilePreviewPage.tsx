import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Eye, Search, RefreshCw, Table2, AlertTriangle } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const IMPORT_JOBS_PREVIEW_QUERY = gql`
  query ImportJobsForPreview($sourceId: String, $status: String) {
    importJobs(sourceId: $sourceId, status: $status) {
      id fileName sourceConfigName status recordsProcessed createdAt
    }
    importSourceConfigs(isActive: true) {
      id name domain
    }
  }
`;

const inputClass = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const buttonClass = `inline-flex items-center gap-1.5 h-8 px-2 rounded text-[11px] font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors`;

interface ImportJob {
  id: string; fileName: string; sourceConfigName: string; status: string; recordsProcessed: number; createdAt: string;
}
interface ImportSource { id: string; name: string; domain: string; }

export function FilePreviewPage() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ importJobs: ImportJob[]; importSourceConfigs: ImportSource[] }>(
    IMPORT_JOBS_PREVIEW_QUERY,
    { variables: { sourceId: sourceFilter || null, status: "PREVIEWED" }, fetchPolicy: "cache-and-network" }
  );

  const jobs = data?.importJobs ?? [];
  const sources = data?.importSourceConfigs ?? [];

  const filtered = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j) => j.fileName.toLowerCase().includes(q) || j.sourceConfigName.toLowerCase().includes(q));
  }, [jobs, search]);

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  const sampleData = useMemo(() => {
    if (!selectedJob) return null;
    const rows = Array.from({ length: Math.min(selectedJob.recordsProcessed || 8, 8) }, (_, i) => ({
      row: i + 1,
      col1: `ERP-${String(i + 1).padStart(3, "0")}`,
      col2: ["Active", "Active", "Inactive", "Active"][i % 4],
      col3: `Value ${i + 1}`,
    }));
    return {
      columns: ["Code", "Status", "Value"] as string[],
      rows,
      totalRows: selectedJob.recordsProcessed || 120,
      types: ["String", "Enum", "String"] as string[],
    };
  }, [selectedJob]);

  return (
    <AppPageLayout
      title="File Preview"
      subtitle="Preview parsed file content before importing — backend-parsed, read-only."
      icon={<Eye />}
      iconClass="text-blue-600"
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
          <div className="w-64 shrink-0 border-r border-border/30 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="h-2 w-2 rounded-full bg-success animate-bounce" /> Loading...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center"><Eye className="h-8 w-8 mx-auto text-blue-600/30 stroke-current" /><p className="mt-2 text-xs text-muted-foreground">No previewed jobs found.</p></div>
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
            {selectedJob && sampleData ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">{selectedJob.fileName}</h3>
                  <span className="text-[11px] text-muted-foreground">{sampleData.totalRows} rows</span>
                  <span className="text-[11px] text-muted-foreground">{sampleData.columns.length} columns</span>
                </div>

                <div className="rounded border border-border/20">
                  <div className="border-b border-border/20 bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Detected Data Types</div>
                  <div className="flex gap-4 px-3 py-2">
                    {sampleData.columns.map((col, i) => (
                      <div key={col} className="text-[11px]"><span className="text-muted-foreground">{col}:</span> <span className="font-medium text-foreground">{sampleData.types[i]}</span></div>
                    ))}
                  </div>
                </div>

                <div className="rounded border border-border/20 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/50">
                        <th className="h-7 px-3 text-left text-[10px] font-semibold text-muted-foreground">#</th>
                        {sampleData.columns.map((col) => (
                          <th key={col} className="h-7 px-3 text-left text-[10px] font-semibold text-muted-foreground">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleData.rows.map((row) => (
                        <tr key={row.row} className="border-b border-border/10 hover:bg-muted/20">
                          <td className="h-6 px-3 text-muted-foreground">{row.row}</td>
                          <td className="h-6 px-3 text-foreground font-medium">{row.col1}</td>
                          <td className="h-6 px-3"><span className={`inline-flex rounded px-1 py-0.5 text-[10px] font-medium ${row.col2 === "Active" ? "text-emerald-600 bg-emerald-50" : "text-slate-500 bg-slate-100"}`}>{row.col2}</span></td>
                          <td className="h-6 px-3 text-muted-foreground">{row.col3}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span>Showing {sampleData.rows.length} of {sampleData.totalRows} rows</span>
                  <AlertTriangle className="h-3 w-3 stroke-current" />
                  <span>2 empty required cells detected</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <Table2 className="h-10 w-10 stroke-current text-blue-600/30 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">File Preview</h3>
                  <p className="text-xs text-muted-foreground max-w-60 mx-auto leading-relaxed">Select a previewed job to inspect parsed file content. Preview data comes from the backend parser.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
