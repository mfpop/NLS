import { ScrollText } from "lucide-react";
import { KnowledgeModulePage } from "./KnowledgeModulePage";
import { PROCEDURE_DOCS } from "./mockDocuments";
import { PROCEDURES_CONFIG } from "./moduleConfig";

export function ProceduresPage() {
  return (
    <KnowledgeModulePage
      icon={<ScrollText className="h-5 w-5 stroke-current" />}
      documents={PROCEDURE_DOCS}
      config={PROCEDURES_CONFIG}
    />
  );
}
