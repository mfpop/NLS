import { BookText } from "lucide-react";
import { KnowledgeModulePage } from "./KnowledgeModulePage";
import { WORK_INSTRUCTIONS } from "./mockDocuments";
import { WORK_INSTRUCTIONS_CONFIG } from "./moduleConfig";

export function WorkInstructionsPage() {
  return (
    <KnowledgeModulePage
      icon={<BookText className="h-5 w-5 stroke-current" />}
      documents={WORK_INSTRUCTIONS}
      config={WORK_INSTRUCTIONS_CONFIG}
    />
  );
}
