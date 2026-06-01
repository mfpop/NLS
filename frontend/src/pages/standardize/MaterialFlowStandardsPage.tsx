import { Package } from "lucide-react";
import { StructureDocumentPage } from "./components/StructureDocumentPage";

export function MaterialFlowStandardsPage() {
  return (
    <StructureDocumentPage
      documentType="MATERIAL_FLOW_STANDARD"
      title="Material Flow Standards"
      subtitle="Structure-based material flow standard management"
      icon={<Package className="h-5 w-5 stroke-current" />}
    />
  );
}
