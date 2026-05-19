import { FileCheck } from "lucide-react";
import { KnowledgeModulePage } from "./KnowledgeModulePage";
import { DOCUMENT_CONTROL_INDEX } from "./mockDocuments";
import { DOCUMENT_CONTROL_CONFIG } from "./moduleConfig";

export function DocumentControlPage() {
  return (
    <KnowledgeModulePage
      icon={<FileCheck className="h-5 w-5 stroke-current" />}
      documents={DOCUMENT_CONTROL_INDEX}
      config={DOCUMENT_CONTROL_CONFIG}
      controlMode
    />
  );
}
