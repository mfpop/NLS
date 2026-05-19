import { BookOpen } from "lucide-react";
import { KnowledgeModulePage } from "./KnowledgeModulePage";
import { STANDARD_WORK_DOCS } from "./mockDocuments";
import { STANDARD_WORK_CONFIG } from "./moduleConfig";

export function StandardWorkPage() {
  return (
    <KnowledgeModulePage
      icon={<BookOpen className="h-5 w-5 stroke-current" />}
      documents={STANDARD_WORK_DOCS}
      config={STANDARD_WORK_CONFIG}
    />
  );
}
