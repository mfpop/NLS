import { RefreshCw, CheckCircle2, Archive, History, Shield, FileText, X } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useState, useCallback } from "react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PageToolbar, ToolbarDropdown, ToolbarButton, ToolbarSeparator } from "@/components/layout/PageToolbar";
import { theme } from "@/styles/themeTokens";
import { DocumentHistoryPanel } from "./components/DocumentHistoryPanel";
import { StructureDocumentMetadata } from "./components/StructureDocumentMetadata";
import {
  STRUCTURE_DOCUMENTS_QUERY,
  APPROVE_STRUCTURE_DOCUMENT_MUTATION,
  ARCHIVE_STRUCTURE_DOCUMENT_MUTATION,
} from "@/graphql/structureDocumentQueries";
import type { StructureDocumentsQueryData, StructureDocumentsQueryVars, StructureDocumentData } from "@/types/structureDocument";

const typeLabels: Record<string, string> = {
  WORK_INSTRUCTION: "Work Instruction",
  STANDARD_WORK: "Standard Work",
  PROCEDURE: "Procedure",
  MATERIAL_FLOW_STANDARD: "Material Flow Standard",
};

const docTypes = ["WORK_INSTRUCTION", "STANDARD_WORK", "PROCEDURE", "MATERIAL_FLOW_STANDARD"];

export function DocumentControlPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [controlledFilter, setControlledFilter] = useState("");
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<StructureDocumentData | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<StructureDocumentsQueryData, StructureDocumentsQueryVars>(
    STRUCTURE_DOCUMENTS_QUERY,
    {
      variables: {
        documentType: typeFilter || "WORK_INSTRUCTION",
        status: statusFilter || undefined,
      },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const [approveMutation] = useMutation(APPROVE_STRUCTURE_DOCUMENT_MUTATION);
  const [archiveMutation] = useMutation(ARCHIVE_STRUCTURE_DOCUMENT_MUTATION);

  const handleApprove = useCallback(async (id: string) => {
    try {
      await approveMutation({ variables: { id } });
      setSuccessMsg("Document approved");
      refetch();
    } catch {}
  }, [approveMutation, refetch]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await archiveMutation({ variables: { id } });
      setSuccessMsg("Document archived");
      refetch();
    } catch {}
  }, [archiveMutation, refetch]);

  const allDocs = data?.structureDocuments || [];
  const filtered = allDocs.filter((doc) => {
    if (search && !doc.title.toLowerCase().includes(search.toLowerCase()) && !doc.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (controlledFilter === "controlled" && !doc.isControlledCopy) return false;
    if (controlledFilter === "uncontrolled" && doc.isControlledCopy) return false;
    return true;
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {successMsg && (
        <div className="shrink-0 h-8 flex items-center justify-center bg-success/10 text-success text-sm font-semibold border-b border-success/20">
          {successMsg}
        </div>
      )}
      <PageHeader
        icon={<Shield className="h-5 w-5 stroke-current" />}
        iconClass={theme.iconBoxEmerald}
        title="Document Control"
        subtitle="Lifecycle governance across all document types"
      />

      <PageToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search documents..."
        filters={
          <>
            <ToolbarDropdown value={typeFilter} onChange={setTypeFilter} options={[{ value: "", label: "All Types" }, ...docTypes.map((dt) => ({ value: dt, label: typeLabels[dt] || dt }))]} />
            <ToolbarDropdown value={statusFilter} onChange={setStatusFilter} options={[{ value: "", label: "All Statuses" }, { value: "DRAFT", label: "Draft" }, { value: "APPROVED", label: "Approved" }, { value: "ARCHIVED", label: "Archived" }]} />
            <ToolbarDropdown value={controlledFilter} onChange={setControlledFilter} options={[{ value: "", label: "All Copies" }, { value: "controlled", label: "Controlled" }, { value: "uncontrolled", label: "Uncontrolled" }]} />
          </>
        }
        actions={
          <>
            <ToolbarSeparator />
            <ToolbarButton icon={RefreshCw} label={loading ? "Refreshing..." : "Refresh"} onClick={() => refetch()} disabled={loading} />
          </>
        }
      />

      {/* Content: Table + Detail */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Table */}
        <div className={`${selectedDoc ? "w-[55%]" : "w-full"} min-w-0 overflow-y-auto border-r border-border`}>
          {loading && (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">Loading...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">No documents found.</div>
          )}
          {!loading && filtered.length > 0 && (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/50 sticky top-0">
                  <th className="text-left px-2 py-1.5 font-medium">Code</th>
                  <th className="text-left px-2 py-1.5 font-medium">Title</th>
                  <th className="text-left px-2 py-1.5 font-medium">Type</th>
                  <th className="text-left px-2 py-1.5 font-medium">Revision</th>
                  <th className="text-left px-2 py-1.5 font-medium">Status</th>
                  <th className="text-left px-2 py-1.5 font-medium">Effective</th>
                  <th className="text-left px-2 py-1.5 font-medium">Review</th>
                  <th className="text-left px-2 py-1.5 font-medium">Owner</th>
                  <th className="text-left px-2 py-1.5 font-medium">Copy</th>
                  <th className="text-right px-2 py-1.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id}
                    className={`border-b border-border/40 text-xs cursor-pointer transition-colors ${
                      selectedDoc?.id === doc.id ? "bg-primary/5" : "hover:bg-muted/40"
                    }`}
                    onClick={() => setSelectedDoc(doc)}>
                    <td className="px-2 py-1.5 text-foreground font-semibold">{doc.code}</td>
                    <td className="px-2 py-1.5 text-foreground truncate max-w-[200px]" title={doc.title}>{doc.title}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{typeLabels[doc.documentType] || doc.documentType}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">rev {doc.revision}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${
                        doc.status === "APPROVED" ? "bg-success/10 text-success border-success/20" :
                        doc.status === "ARCHIVED" ? "bg-badge-neutral text-badge-neutral-foreground border-border/60" :
                        "bg-warning/10 text-warning border-warning/20"
                      }`}>{doc.status}</span>
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{doc.effectiveFrom || "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{doc.reviewDate || "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[100px]" title={doc.owner}>{doc.owner || "—"}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${
                        doc.isControlledCopy
                          ? "bg-info/15 text-info border-info/25"
                          : "bg-badge-neutral text-badge-neutral-foreground border-border/60"
                      }`}>
                        {doc.isControlledCopy ? "C" : "U"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <button type="button" onClick={() => setHistoryDocId(doc.id)}
                          className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="View History">
                          <History className="h-3 w-3 stroke-current" />
                        </button>
                        {doc.status === "DRAFT" && (
                          <button type="button" onClick={() => handleApprove(doc.id)}
                            className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
                            title="Approve">
                            <CheckCircle2 className="h-3 w-3 stroke-current" />
                          </button>
                        )}
                        {doc.status !== "ARCHIVED" && (
                          <button type="button" onClick={() => handleArchive(doc.id)}
                            className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Archive">
                            <Archive className="h-3 w-3 stroke-current" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selectedDoc && (
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border bg-muted px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground stroke-current shrink-0" />
                <span className="text-sm font-bold text-foreground truncate">{selectedDoc.title}</span>
              </div>
              <button type="button" onClick={() => setSelectedDoc(null)}
                className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                <X className="h-3.5 w-3.5 stroke-current" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              <StructureDocumentMetadata document={selectedDoc} />
              <div className="border border-border/50 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Content</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedDoc.content || "No content"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {historyDocId && (
        <DocumentHistoryPanel documentId={historyDocId} onClose={() => setHistoryDocId(null)} />
      )}
    </div>
  );
}
