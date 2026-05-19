import { Package } from "lucide-react";
import { KnowledgeModulePage } from "./KnowledgeModulePage";
import { MATERIAL_FLOW_DOCS } from "./mockDocuments";
import { MATERIAL_FLOW_CONFIG } from "./moduleConfig";

export function MaterialFlowStandardsPage() {
  return (
    <KnowledgeModulePage
      icon={<Package className="h-5 w-5 stroke-current" />}
      documents={MATERIAL_FLOW_DOCS}
      config={MATERIAL_FLOW_CONFIG}
    />
  );
}
