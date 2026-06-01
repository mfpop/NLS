import { FileQuestion } from "lucide-react";

interface StructureDocumentEmptyStateProps {
  title?: string;
  description?: string;
}

export function StructureDocumentEmptyState({
  title = "No Work Instruction defined",
  description = "Select a node from the structure tree to view its document details.",
}: StructureDocumentEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center px-4">
        <FileQuestion className="h-10 w-10 text-muted-foreground/40 stroke-current mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">{description}</p>
      </div>
    </div>
  );
}
