import { useRef, useState } from "react";
import { FileQuestion, ArrowUpRight, Loader2, FilePlus, Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell, FileText, Upload, AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StructureDocumentStatusBadge } from "./StructureDocumentStatusBadge";
import { StructureDocumentMetadata } from "./StructureDocumentMetadata";
import { StructureDocumentEmptyState } from "./StructureDocumentEmptyState";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { generateWorkInstructionTemplate } from "./workInstructionTemplate";
import { generateStandardWorkTemplate } from "./standardWorkTemplate";
import { generateMaterialFlowStandardTemplate } from "./materialFlowStandardTemplate";
import { generateProcedureTemplate } from "./procedureTemplate";
import { importDocument, DOCUMENT_ACCEPT_TYPES } from "../../../utils/documentImport";
import type { StructureDocumentTreeNodeData, StructureDocumentData } from "@/types/structureDocument";

const typeIcon: Record<string, LucideIcon> = {
  COMPANY: Landmark,
  PLANT: Factory,
  PRODUCTION_LINE: TrendingUpDown,
  DEPARTMENT: Layers,
  RESOURCE_GROUP: Component,
  RESOURCE: Dumbbell,
};

const typeColor: Record<string, string> = {
  COMPANY: "text-entity-company",
  PLANT: "text-entity-plant",
  PRODUCTION_LINE: "text-entity-line",
  DEPARTMENT: "text-entity-department",
  RESOURCE_GROUP: "text-entity-resource-group",
  RESOURCE: "text-entity-resource",
};

const typeLabel: Record<string, string> = {
  COMPANY: "Company",
  PLANT: "Plant",
  PRODUCTION_LINE: "Production Line",
  DEPARTMENT: "Department",
  RESOURCE_GROUP: "Resource Group",
  RESOURCE: "Resource",
};

const documentTypeLabels: Record<string, string> = {
  WORK_INSTRUCTION: "Work Instruction",
  STANDARD_WORK: "Standard Work",
  PROCEDURE: "Procedure",
  MATERIAL_FLOW_STANDARD: "Material Flow Standard",
};

interface StructureDocumentDetailsPanelProps {
  selectedNode: StructureDocumentTreeNodeData | null;
  document: StructureDocumentData | null;
  documentStatus: string | null;
  documentType: string;
  treeData: StructureDocumentTreeNodeData[];
  loading: boolean;
  error?: string | null;
  editing: boolean;
  onAction: (action: string) => void;
  onEditorSave: (data: { title: string; code: string; content: string; revision: string; owner: string }) => void;
}

export function StructureDocumentDetailsPanel({
  selectedNode,
  document,
  documentStatus,
  documentType,
  treeData,
  loading,
  error,
  editing,
  onAction,
  onEditorSave,
}: StructureDocumentDetailsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState(document?.title || "");
  const [editCode, setEditCode] = useState(document?.code || "");
  const [editContent, setEditContent] = useState(document?.content || "");
  const [editRevision, setEditRevision] = useState(document?.revision || "1.0");
  const [editOwner, setEditOwner] = useState(document?.owner || "");

  const handleImportDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const html = await importDocument(file);
      setEditContent(html);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  if (!selectedNode) {
    return <StructureDocumentEmptyState description="Select a node from the structure tree to view its document details." />;
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin stroke-current" />
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center px-4">
            <p className="text-xs text-danger font-medium">Failed to load document</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
    );
  }

  const status = documentStatus || selectedNode.documentStatus;
  const hasDocument = document !== null && status !== "MISSING";
  const isMissing = status === "MISSING";
  const isInherited = status === "INHERITED";
  const docLabel = documentTypeLabels[documentType] || "Document";
  const Icon = typeIcon[selectedNode.nodeType];

  const inheritedSourceName = isInherited && selectedNode.inheritedDocumentId
    ? (() => {
        const findSource = (nodes: StructureDocumentTreeNodeData[]): string | null => {
          for (const n of nodes) {
            if (n.localDocumentId === selectedNode.inheritedDocumentId) return n.name;
            if (n.children.length > 0) {
              const found = findSource(n.children);
              if (found) return found;
            }
          }
          return null;
        };
        return findSource(treeData);
      })()
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEditorSave({
      title: editTitle,
      code: editCode,
      content: editContent,
      revision: editRevision,
      owner: editOwner,
    });
  };

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Entity Header */}
      <div className="shrink-0 border-b border-border bg-muted px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <Icon className={`h-4 w-4 shrink-0 stroke-current ${typeColor[selectedNode.nodeType] || "text-muted-foreground"}`} />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground truncate">{selectedNode.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground font-medium">{typeLabel[selectedNode.nodeType] || selectedNode.nodeType}</span>
              <StructureDocumentStatusBadge status={status} />
            </div>
          </div>
        </div>
      </div>

      {/* Detail Content */}
      <div className={`flex-1 min-h-0 ${editing ? "flex flex-col" : "overflow-y-auto"}`}>
        {/* Summary row */}
        <div className="border-b border-border/40 px-3 py-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{docLabel}</span>
            <span className="w-px h-3 bg-border/40" />
            <span>{typeLabel[selectedNode.nodeType] || selectedNode.nodeType}</span>
            <span className="w-px h-3 bg-border/40" />
            <StructureDocumentStatusBadge status={status} />
          </div>
        </div>

        {/* Editor or Document State */}
        {editing ? (
          <div className="flex flex-col flex-1 min-h-0 p-3">
            <form id="doc-editor-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 gap-3">
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="h-8 w-full rounded-xs border border-transparent bg-card px-2 text-xs text-foreground outline-none transition-colors focus:border-gray-400 focus:ring-1 focus:ring-ring/20"
                    required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Code</label>
                  <input type="text" value={editCode} onChange={(e) => setEditCode(e.target.value)}
                    className="h-8 w-full rounded-xs border border-transparent bg-card px-2 text-xs text-foreground outline-none transition-colors focus:border-gray-400 focus:ring-1 focus:ring-ring/20"
                    required />
                </div>
              </div>

              <div className="flex items-center justify-between shrink-0">
                <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">Content</label>
                <div className="flex items-center gap-1.5">
                  {/* Import existing document */}
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-40"
                    title="Import an existing document (PDF, DOCX, TXT, HTML)"
                  >
                    {importing ? (
                      <Loader2 className="h-3 w-3 stroke-current animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3 stroke-current" />
                    )}
                    {importing ? "Importing..." : "Import"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={DOCUMENT_ACCEPT_TYPES}
                    onChange={handleImportDocument}
                    className="hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                  />

                  {(documentType === "WORK_INSTRUCTION" || documentType === "STANDARD_WORK" || documentType === "MATERIAL_FLOW_STANDARD" || documentType === "PROCEDURE") && (
                    <button
                      type="button"
                      onClick={() => {
                        const templates: Record<string, () => string> = {
                          WORK_INSTRUCTION: generateWorkInstructionTemplate,
                          STANDARD_WORK: generateStandardWorkTemplate,
                          MATERIAL_FLOW_STANDARD: generateMaterialFlowStandardTemplate,
                          PROCEDURE: generateProcedureTemplate,
                        };
                        const fn = templates[documentType];
                        if (fn) setEditContent(fn());
                      }}
                      className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      title={`Insert lean ${documentTypeLabels[documentType]?.toLowerCase() || documentType} template`}
                    >
                      <FileText className="h-3 w-3 stroke-current" />
                      Use Template
                    </button>
                  )}
                </div>
              </div>

              {importError && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-danger/10 text-danger text-xs font-medium shrink-0">
                  <AlertCircle className="h-3 w-3 stroke-current shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="flex flex-col flex-1 min-h-0">
                <RichTextEditor
                  content={editContent}
                  onChange={(html) => setEditContent(html)}
                  placeholder="Write the work instruction content here — use headings, lists, tables, and formatting..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Revision</label>
                  <input type="text" value={editRevision} onChange={(e) => setEditRevision(e.target.value)}
                    className="h-8 w-full rounded-xs border border-transparent bg-card px-2 text-xs text-foreground outline-none transition-colors focus:border-gray-400 focus:ring-1 focus:ring-ring/20" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Owner</label>
                  <input type="text" value={editOwner} onChange={(e) => setEditOwner(e.target.value)}
                    className="h-8 w-full rounded-xs border border-transparent bg-card px-2 text-xs text-foreground outline-none transition-colors focus:border-gray-400 focus:ring-1 focus:ring-ring/20" />
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-3">
            <>
              {isMissing && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileQuestion className="h-10 w-10 text-muted-foreground/30 stroke-current mb-3" />
                  <p className="text-sm font-semibold text-foreground mb-1">No {docLabel} is defined for this item</p>
                  <p className="text-xs text-muted-foreground mb-5 max-w-sm">
                    Create a local {docLabel.toLowerCase()} for this {typeLabel[selectedNode.nodeType] || selectedNode.nodeType}.
                  </p>
                  <button type="button" onClick={() => onAction("create")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary/80 backdrop-blur-sm px-4 text-xs font-semibold text-primary-foreground shadow-sm motion-safe:transition-colors hover:bg-primary/90">
                    <FilePlus className="h-4 w-4 stroke-current" />
                    Create {docLabel}
                  </button>
                </div>
              )}

              {isInherited && (
                <div className="border border-info/25 bg-info/10 px-3 py-2 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-info">
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-current" />
                    <span>Inherited{inheritedSourceName ? ` from ${inheritedSourceName}` : ""}</span>
                  </div>
                </div>
              )}

              {hasDocument && document && (
                <div className="space-y-3">
                  <StructureDocumentMetadata document={document} />
                  <div className="border border-gray-500/50 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Content</span>
                    </div>
                    <div
                      className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: document.content || "No content" }}
                    />
                  </div>
                </div>
              )}
            </>
          </div>
        )}
      </div>
    </div>
  );
}
