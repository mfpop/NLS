import { X, RefreshCw, FilePlus, Pencil, CheckCircle2, Archive, Save, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { Toolbar, ToolbarSearch, ToolbarButton } from "@/components/shared/Toolbar";
import { theme } from "@/styles/themeTokens";
import { StructureDocumentTree } from "./StructureDocumentTree";
import { StructureDocumentDetailsPanel } from "./StructureDocumentDetailsPanel";
import { DocumentHistoryPanel } from "./DocumentHistoryPanel";
import {
  STRUCTURE_DOCUMENT_TREE_QUERY,
  STRUCTURE_DOCUMENT_QUERY,
  CREATE_STRUCTURE_DOCUMENT_MUTATION,
  UPDATE_STRUCTURE_DOCUMENT_MUTATION,
  APPROVE_STRUCTURE_DOCUMENT_MUTATION,
  ARCHIVE_STRUCTURE_DOCUMENT_MUTATION,
  CREATE_STRUCTURE_DOCUMENT_REVISION,
  SET_STRUCTURE_DOCUMENT_CONTROLLED_COPY,
} from "@/graphql/structureDocumentQueries";
import type {
  StructureDocumentTreeQueryData,
  StructureDocumentTreeQueryVars,
  StructureDocumentQueryData,
  StructureDocumentQueryVars,
  StructureDocumentTreeNodeData,
  CreateStructureDocumentVars,
  UpdateStructureDocumentVars,
  StructureDocumentPayload,
} from "@/types/structureDocument";

interface StructureDocumentPageProps {
  documentType: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass?: string;
  toolbar?: React.ReactNode;
}

const MIN_LEFT_PCT = 15;
const MAX_LEFT_PCT = 50;

export function StructureDocumentPage({
  documentType,
  title,
  subtitle,
  icon,
  iconClass,
  toolbar,
}: StructureDocumentPageProps) {
  const [selectedNode, setSelectedNode] = useState<StructureDocumentTreeNodeData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);
  const [treeCollapsed, setTreeCollapsed] = useState(false);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);
  const [dragging, setDragging] = useState(false);

  // Tree query
  const {
    data: treeData,
    loading: treeLoading,
    error: treeError,
    refetch: refetchTree,
  } = useQuery<StructureDocumentTreeQueryData, StructureDocumentTreeQueryVars>(
    STRUCTURE_DOCUMENT_TREE_QUERY,
    {
      variables: { documentType },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  // Auto-select first root node when tree loads
  const treeNodes = treeData?.structureDocumentTree || [];
  useEffect(() => {
    if (!treeLoading && treeNodes.length > 0 && !hasAutoSelected && !selectedNode) {
      setSelectedNode(treeNodes[0]);
      setHasAutoSelected(true);
    }
  }, [treeLoading, treeNodes, hasAutoSelected, selectedNode]);

  // Document query
  const {
    data: docData,
    loading: docLoading,
    error: docError,
    refetch: refetchDoc,
  } = useQuery<StructureDocumentQueryData, StructureDocumentQueryVars>(
    STRUCTURE_DOCUMENT_QUERY,
    {
      variables: {
        targetType: selectedNode?.nodeType || "",
        targetId: selectedNode ? Number(selectedNode.id) : 0,
        documentType,
      },
      skip: !selectedNode,
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  // Mutations
  const [createMutation] = useMutation<StructureDocumentPayload, CreateStructureDocumentVars>(
    CREATE_STRUCTURE_DOCUMENT_MUTATION
  );
  const [updateMutation] = useMutation<StructureDocumentPayload, UpdateStructureDocumentVars>(
    UPDATE_STRUCTURE_DOCUMENT_MUTATION
  );
  const [approveMutation] = useMutation(APPROVE_STRUCTURE_DOCUMENT_MUTATION);
  const [archiveMutation] = useMutation(ARCHIVE_STRUCTURE_DOCUMENT_MUTATION);
  const [_revisionMutation] = useMutation(CREATE_STRUCTURE_DOCUMENT_REVISION);
  const [_controlledCopyMutation] = useMutation(SET_STRUCTURE_DOCUMENT_CONTROLLED_COPY);

  // Drag-to-resize
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(MAX_LEFT_PCT, Math.max(MIN_LEFT_PCT, pct)));
    };
    const handlePointerUp = () => setDragging(false);
    globalThis.document.addEventListener("pointermove", handlePointerMove);
    globalThis.document.addEventListener("pointerup", handlePointerUp);
    return () => {
      globalThis.document.removeEventListener("pointermove", handlePointerMove);
      globalThis.document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging]);

  const handleSelectNode = useCallback((node: StructureDocumentTreeNodeData | null) => {
    setSelectedNode(node);
    setEditing(false);
  }, []);

  const handleEditorSave = useCallback(
    async (data: { title: string; code: string; content: string; revision: string; owner: string }) => {
      if (!selectedNode) return;
      const targetType = selectedNode.nodeType;
      const targetId = Number(selectedNode.id);
      const existingDoc = docData?.structureDocument;

      try {
        if (existingDoc) {
          await updateMutation({
            variables: {
              id: existingDoc.id,
              input: {
                title: data.title,
                content: data.content,
                revision: data.revision,
                owner: data.owner,
              },
            },
          });
          setSuccessMsg(`${title} updated`);
        } else {
          await createMutation({
            variables: {
              input: {
                documentType,
                targetType,
                targetId,
                title: data.title,
                code: data.code,
                content: data.content,
                revision: data.revision,
                owner: data.owner,
              },
            },
          });
          setSuccessMsg(`${title} created`);
        }
        setEditing(false);
        refetchTree();
        refetchDoc();
      } catch {
        // handled by errorPolicy
      }
    },
    [selectedNode, documentType, title, docData, createMutation, updateMutation, refetchTree, refetchDoc]
  );

  const handleAction = useCallback(
    async (action: string) => {
      if (!selectedNode) return;
      if (action === "edit" || action === "create") {
        setEditing(true);
        return;
      }

      try {
        switch (action) {
          case "approve": {
            const doc = docData?.structureDocument;
            if (doc) {
              await approveMutation({ variables: { id: doc.id } });
              setSuccessMsg(`${title} approved`);
              refetchDoc();
            }
            break;
          }
          case "archive": {
            const doc = docData?.structureDocument;
            if (doc) {
              await archiveMutation({ variables: { id: doc.id } });
              setSuccessMsg(`${title} archived`);
              refetchDoc();
            }
            break;
          }
          case "history": {
            const doc = docData?.structureDocument;
            if (doc) {
              setHistoryDocId(doc.id);
            }
            break;
          }
        }
      } catch {
        // handled by errorPolicy
      }
    },
    [selectedNode, documentType, title, docData, createMutation, approveMutation, archiveMutation, refetchDoc]
  );

  const document = docData?.structureDocument || null;
  const documentStatus = selectedNode?.documentStatus || null;
  const status = documentStatus || selectedNode?.documentStatus;
  const isMissing = status === "MISSING";
  const hasDocument = document !== null && !isMissing;
  const isApproved = document?.status === "APPROVED";
  const isArchived = document?.status === "ARCHIVED";

  const handlePrint = useCallback(() => {
    if (!document || editing) return;
    window.print();
  }, [document, editing]);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0 !important; padding: 0 !important; background: white !important; }
          @page { margin: 0.75in; }
        }
      `}</style>
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {successMsg && (
        <div className="shrink-0 h-8 flex items-center justify-center bg-success/10 text-success text-sm font-semibold border-b border-success/20">
          {successMsg}
        </div>
      )}
      <div className="no-print">
        <PageHeader
          icon={icon}
          iconClass={iconClass || theme.iconBoxEmerald}
          title={title}
          subtitle={subtitle}
        />
      </div>

      {toolbar !== undefined ? (
        <div className="no-print shrink-0 border-b border-border bg-muted h-10">
          <div className="h-full grid grid-cols-[var(--tree-width)_1fr]">
            <div className="flex items-center px-2 min-w-0 overflow-hidden">
              {toolbar}
            </div>
          </div>
        </div>
      ) : (
        <Toolbar
          left={<ToolbarSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search structure..." />}
          right={
            editing ? (
              <>
                <ToolbarButton icon={X} label="Cancel" onClick={() => setEditing(false)} />
                <ToolbarButton icon={Save} label="Save" onClick={() => (globalThis.document.getElementById('doc-editor-form') as HTMLFormElement | null)?.requestSubmit()} variant="success" />
              </>
            ) : (
              <>
                <ToolbarButton icon={FilePlus} label="Create" disabled={hasDocument && !isMissing} onClick={() => handleAction("create")} />
                <ToolbarButton icon={Pencil} label="Edit" disabled={!hasDocument || isArchived} onClick={() => handleAction("edit")} />
                <ToolbarButton icon={CheckCircle2} label="Approve" disabled={!hasDocument || isApproved || isArchived} onClick={() => handleAction("approve")} />
                <ToolbarButton icon={Archive} label="Archive" disabled={!hasDocument || isArchived} onClick={() => handleAction("archive")} />
                <ToolbarButton icon={Printer} label="Print" disabled={!hasDocument || editing} onClick={handlePrint} />
                <span className="mx-0.5 h-5 w-px bg-border/30" />
                <ToolbarButton icon={treeCollapsed ? ChevronRight : ChevronLeft} label="" onClick={() => setTreeCollapsed(prev => !prev)} />
                <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => { refetchTree(); refetchDoc(); }} />
              </>
            )
          }
        />
      )}

      <div ref={containerRef} className="flex-1 min-h-0 flex overflow-hidden">
        <div
          className={`no-print flex flex-col min-h-0 transition-all duration-200 ease-in-out ${
            treeCollapsed ? "w-0 min-w-0 overflow-hidden opacity-0" : "min-w-[180px]"
          }`}
          style={{ width: treeCollapsed ? "0px" : `${leftPct}%` }}
        >
          <StructureDocumentTree
            treeData={treeNodes}
            selectedNodeId={selectedNode?.id || null}
            onSelectNode={handleSelectNode}
            loading={treeLoading}
            error={treeError?.message}
            searchQuery={searchQuery}
          />
        </div>

        <div
          className={`no-print shrink-0 w-[5px] cursor-col-resize transition-colors hover:bg-primary/40 active:bg-primary/60 ${
            dragging ? "bg-primary/60" : "bg-transparent"
          } ${treeCollapsed ? "hidden" : ""}`}
          onPointerDown={handlePointerDown}
        />

        <div className="flex flex-col min-h-0 min-w-0 flex-1">
          <StructureDocumentDetailsPanel
            selectedNode={selectedNode}
            document={document}
            documentStatus={documentStatus}
            documentType={documentType}
            treeData={treeNodes}
            loading={docLoading}
            error={docError?.message}
            editing={editing}
            onAction={handleAction}
            onEditorSave={handleEditorSave}
          />
        </div>
      </div>

      {historyDocId && (
        <div className="no-print">
          <DocumentHistoryPanel
            documentId={historyDocId}
            onClose={() => setHistoryDocId(null)}
          />
        </div>
      )}

      {/* Footer */}
      <div className="no-print shrink-0 flex h-10 items-center gap-4 border-t border-border bg-muted px-4 text-xs font-medium text-muted-foreground">
        <span>{title}</span>
        <span className="w-px h-3 bg-border/60" />
        <span>{treeNodes.length} root node{treeNodes.length !== 1 ? "s" : ""}</span>
        {selectedNode && (
          <>
            <span className="w-px h-3 bg-border/60" />
            <span>{selectedNode.name}</span>
          </>
        )}
      </div>
    </div>
    </>
  );
}
