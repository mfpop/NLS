import { ScrollText } from "lucide-react";
import { StructureDocumentPage } from "./components/StructureDocumentPage";

export function ProceduresPage() {
  return (
    <StructureDocumentPage
      documentType="PROCEDURE"
      title="Procedures"
      subtitle="Structure-based procedure management"
      icon={<ScrollText className="h-5 w-5 stroke-current" />}
    />
  );
}
