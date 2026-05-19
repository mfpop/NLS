import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useLazyQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Eye, Search, RefreshCw, Table2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const IMPORT_JOBS_PREVIEW_QUERY = gql`
  query ImportJobsForPreview($sourceId: String, $status: String) {
    importJobs(sourceId: $sourceId, status: $status) {
      items {
        id fileName sourceConfigName status recordsProcessed createdAt
      }
    }
    importSourceConfigs(isActive: true) {
      items {
        id name domain
      }
    }
  }
`;

const FILE_PREVIEW_QUERY = gql`
  query FilePreview($jobId: String!) {
    filePreview(jobId: $jobId) {
      jobId
      fileName
      sheetNames
      activeSheet
      columnHeaders
      totalRows
      sampleRows {
        rowNumber
        columns
        isEmpty
      }
      detectedTypes
      emptyRequiredCells
      duplicateRows
      errors {
        field
        code
        message
      }
    }
  }
`;

const inputClass = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const buttonClass = `inline-flex items-center gap-1.5 h-8 px-2 rounded text-[11px] font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors`;

interface ImportJob {
  id: string; fileName: string; sourceConfigName: string; status: string; recordsProcessed: number; createdAt: string;
}
interface ImportSource { id: string; name: string; domain: string; }
interface PreviewRow { rowNumber: number; columns: string[] | null; isEmpty: boolean; }
interface FilePreviewData {
  jobId: string; fileName: string; sheetNames: string[]; activeSheet: string;
  columnHeaders: string[]; totalRows: number; sampleRows: PreviewRow[];
  detectedTypes: string[] | null; emptyRequiredCells: number; duplicateRows: number;
  errors: { field: string; code: string; message: string }[] | null;
}

export function FilePreviewPage() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data: listData, loading: listLoading, refetch } = useQuery<{
    importJobs: { items: ImportJob[] };
    importSourceConfigs: { items: ImportSource[] };
  }>(IMPORT_JOBS_PREVIEW_QUERY, {
    variables: { sourceId: sourceFilter || null, status: "PREVIEWED" },
    fetchPolicy: "cache-and-network",
  });

  const [fetchPreview, { data: previewData, loading: previewLoading }] = useLazyQuery<{
    filePreview: FilePreviewData;
  }>(FILE_PREVIEW_QUERY, { fetchPolicy: "cache-and-network" });

  const jobs = listData?.importJobs?.items ?? [];
  const sources = listData?.importSourceConfigs?.items ?? [];

  const filtered = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j) => j.fileName.toLowerCase().includes(q) || j.sourceConfigName.toLowerCase().includes(q));
  }, [jobs, search]);

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  const preview = useMemo(() => {
    if (!previewData?.filePreview || previewData.filePreview.errors) return null;
    return previewData.filePreview;
  }, [previewData]);

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    if (jobId) fetchPreview({ variables: { jobId } });
  };

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
            {listLoading ? (
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
                  <button key={job.id} type="button" onClick={() => handleSelectJob(job.id)}
                    className={`w-full text-left px-3 py-2 border-b border-border/10 transition-colors hover:bg-muted/30 ${selectedJobId === job.id ? "bg-muted/40" : ""}`}>
                    <div className="text-[11px] font-medium text-foreground truncate">{job.fileName || "Untitled"}</div>
                    <div className="text-[10px] text-muted-foreground">{job.sourceConfigName}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {previewLoading ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="h-2 w-2 rounded-full bg-success animate-bounce" /> Loading preview...</div>
              </div>
            ) : preview ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground">{preview.fileName || "Untitled"}</h3>
                  <span className="text-[11px] text-muted-foreground">{preview.totalRows} rows</span>
                  <span className="text-[11px] text-muted-foreground">{preview.columnHeaders.length} columns</span>
                  {preview.sheetNames.length > 1 && (
                    <span className="text-[11px] text-muted-foreground">{preview.sheetNames.length} sheets</span>
                  )}
                  {preview.activeSheet && (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                      <FileSpreadsheet className="h-3 w-3 stroke-current" />{preview.activeSheet}
                    </span>
                  )}
                </div>

                {preview.sheetNames.length > 1 && (
                  <div className="flex gap-2">
                    {preview.sheetNames.map((sheet) => (
                      <span key={sheet}
                        className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                          sheet === preview.activeSheet
                            ? "bg-blue-100 text-blue-700"
                            : "bg-muted text-muted-foreground"
                        }`}>
                        {sheet}
                      </span>
                    ))}
                  </div>
                )}

                {preview.detectedTypes && preview.detectedTypes.length > 0 && (
                  <div className="rounded border border-border/20">
                    <div className="border-b border-border/20 bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Detected Column Types</div>
                    <div className="flex flex-wrap gap-4 px-3 py-2">
                      {preview.columnHeaders.map((col, i) => (
                        <div key={col} className="text-[11px]">
                          <span className="text-muted-foreground">{col}:</span>{" "}
                          <span className="font-medium text-foreground">{preview.detectedTypes?.[i] ?? "Unknown"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded border border-border/20 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/50">
                        <th className="h-7 px-3 text-left text-[10px] font-semibold text-muted-foreground w-10">#</th>
                        {preview.columnHeaders.map((col) => (
                          <th key={col} className="h-7 px-3 text-left text-[10px] font-semibold text-muted-foreground">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sampleRows.map((row) => (
                        <tr key={row.rowNumber} className="border-b border-border/10 hover:bg-muted/20">
                          <td className="h-6 px-3 text-muted-foreground">{row.rowNumber}</td>
                          {(row.columns ?? []).map((val, ci) => (
                            <td key={ci} className="h-6 px-3 text-foreground">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span>Showing {preview.sampleRows.length} of {preview.totalRows} rows</span>
                  {preview.emptyRequiredCells > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3 w-3 stroke-current" />
                      {preview.emptyRequiredCells} empty required cells
                    </span>
                  )}
                  {preview.duplicateRows > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3 w-3 stroke-current" />
                      {preview.duplicateRows} duplicate rows
                    </span>
                  )}
                </div>
              </div>
            ) : selectedJob && previewData?.filePreview?.errors ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center max-w-xs">
                  <AlertTriangle className="h-10 w-10 stroke-current text-amber-500/40 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Preview Error</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {previewData.filePreview.errors.map((e) => e.message).join(", ")}
                  </p>
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
