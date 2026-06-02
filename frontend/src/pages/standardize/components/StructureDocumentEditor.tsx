import { useState } from "react";
import { X } from "lucide-react";
import type { StructureDocumentData } from "@/types/structureDocument";

interface StructureDocumentEditorProps {
  mode: "create" | "edit";
  documentType: string;
  documentTypeLabel: string;
  nodeName: string;
  nodeTypeLabel: string;
  document?: StructureDocumentData | null;
  saving: boolean;
  onSave: (data: EditorFormData) => void;
  onClose: () => void;
}

export interface EditorFormData {
  title: string;
  code: string;
  content: string;
  revision: string;
  owner: string;
  effectiveFrom: string;
  effectiveTo: string;
}

export function StructureDocumentEditor({
  mode,
  documentTypeLabel,
  nodeName,
  nodeTypeLabel,
  document,
  saving,
  onSave,
  onClose,
}: StructureDocumentEditorProps) {
  const [title, setTitle] = useState(document?.title || "");
  const [code, setCode] = useState(document?.code || "");
  const [content, setContent] = useState(document?.content || "");
  const [revision, setRevision] = useState(document?.revision || "1.0");
  const [owner, setOwner] = useState(document?.owner || "");
  const [effectiveFrom, setEffectiveFrom] = useState(document?.effectiveFrom || "");
  const [effectiveTo] = useState(document?.effectiveTo || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, code, content, revision, owner, effectiveFrom, effectiveTo });
  };

  const isValid = title.trim() && code.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-sm border shadow-xl bg-popover text-popover-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-sm font-bold text-foreground">
              {mode === "create" ? `Create ${documentTypeLabel}` : `Edit ${documentTypeLabel}`}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {nodeName} &middot; {nodeTypeLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 stroke-current" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 w-full rounded-sm border border-border/50 bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-border-strong focus:ring-1 focus:ring-ring/20"
                placeholder="Document title"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-8 w-full rounded-sm border border-border/50 bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-border-strong focus:ring-1 focus:ring-ring/20"
                placeholder="e.g. WI-001"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full rounded-sm border border-border/50 bg-card px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-border-strong focus:ring-1 focus:ring-ring/20 resize-y"
              placeholder="Document content..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Revision</label>
              <input
                type="text"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                className="h-8 w-full rounded-sm border border-border/50 bg-card px-2 text-xs text-foreground outline-none transition-colors focus:border-border-strong focus:ring-1 focus:ring-ring/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="h-8 w-full rounded-sm border border-border/50 bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-border-strong focus:ring-1 focus:ring-ring/20"
                placeholder="Owner name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Effective</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="h-8 w-full rounded-sm border border-border/50 bg-card px-2 text-xs text-foreground outline-none transition-colors focus:border-border-strong focus:ring-1 focus:ring-ring/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-sm px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || saving}
              className={`inline-flex h-8 items-center gap-1.5 rounded-sm px-4 text-xs font-semibold shadow-sm transition-colors ${
                !isValid || saving
                  ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                  : "bg-primary/80 backdrop-blur-sm text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {saving ? "Saving..." : mode === "create" ? `Create ${documentTypeLabel}` : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
