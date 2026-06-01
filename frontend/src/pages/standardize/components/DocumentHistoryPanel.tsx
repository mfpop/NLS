import { useQuery } from "@apollo/client/react";
import { X, Loader2, History, Shield } from "lucide-react";
import {
  STRUCTURE_DOCUMENT_REVISION_HISTORY_QUERY,
  STRUCTURE_DOCUMENT_AUDIT_TRAIL_QUERY,
} from "@/graphql/structureDocumentQueries";
import type {
  StructureDocumentRevisionHistoryQueryData,
  StructureDocumentRevisionHistoryQueryVars,
  StructureDocumentAuditTrailQueryData,
  StructureDocumentAuditTrailQueryVars,
} from "@/types/structureDocument";

interface DocumentHistoryPanelProps {
  documentId: string;
  onClose: () => void;
}

const actionLabels: Record<string, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  ARCHIVED: "Archived",
  REVISION_CREATED: "Revision Created",
  CONTROLLED_COPY_CHANGED: "Controlled Copy Changed",
};

export function DocumentHistoryPanel({ documentId, onClose }: DocumentHistoryPanelProps) {
  const { data: historyData, loading: historyLoading } = useQuery<
    StructureDocumentRevisionHistoryQueryData,
    StructureDocumentRevisionHistoryQueryVars
  >(STRUCTURE_DOCUMENT_REVISION_HISTORY_QUERY, {
    variables: { documentId },
    fetchPolicy: "network-only",
  });

  const { data: auditData, loading: auditLoading } = useQuery<
    StructureDocumentAuditTrailQueryData,
    StructureDocumentAuditTrailQueryVars
  >(STRUCTURE_DOCUMENT_AUDIT_TRAIL_QUERY, {
    variables: { documentId },
    fetchPolicy: "network-only",
  });

  const historyEntries = historyData?.structureDocumentRevisionHistory || [];
  const auditEntries = auditData?.structureDocumentAuditTrail || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-sm border shadow-xl bg-popover text-popover-foreground flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground stroke-current" />
            <span className="text-sm font-bold text-foreground">Document History</span>
          </div>
          <button type="button" onClick={onClose}
            className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4 stroke-current" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          {/* Revision History */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <History className="h-3.5 w-3.5 text-muted-foreground stroke-current" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Revision History</span>
            </div>
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin stroke-current" />
              </div>
            ) : historyEntries.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No revision history available.</p>
            ) : (
              <div className="space-y-2">
                {historyEntries.map((entry) => (
                  <div key={entry.id} className="border border-border/40 bg-card p-2.5 rounded-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-bold text-foreground">
                        {actionLabels[entry.lifecycleAction] || entry.lifecycleAction}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{entry.changedAt}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>Revision: <strong className="text-foreground">{entry.revision}</strong></span>
                      <span>Status: <strong className="text-foreground">{entry.statusTo}</strong></span>
                      {entry.statusFrom && <span>Previous: <strong className="text-foreground">{entry.statusFrom}</strong></span>}
                      <span>By: <strong className="text-foreground">{entry.changedBy || "—"}</strong></span>
                      {entry.changeReason && (
                        <span className="col-span-2">Reason: <strong className="text-foreground">{entry.changeReason}</strong></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Audit Trail */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="h-3.5 w-3.5 text-muted-foreground stroke-current" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Audit Trail</span>
            </div>
            {auditLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin stroke-current" />
              </div>
            ) : auditEntries.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No audit trail available.</p>
            ) : (
              <div className="space-y-2">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="border border-border/40 bg-card p-2.5 rounded-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-bold text-foreground">{entry.action}</span>
                      <span className="text-[9px] text-muted-foreground">{entry.occurredAt}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>Actor: <strong className="text-foreground">{entry.actor || "—"}</strong></span>
                      {entry.reason && <span className="col-span-2">Reason: <strong className="text-foreground">{entry.reason}</strong></span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
