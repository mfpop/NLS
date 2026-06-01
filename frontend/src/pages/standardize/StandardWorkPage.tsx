import { BookOpen } from "lucide-react";
import { StructureDocumentPage } from "./components/StructureDocumentPage";

export function StandardWorkPage() {
  return (
    <StructureDocumentPage
      documentType="STANDARD_WORK"
      title="Standard Work"
      subtitle="Structure-based standard work management"
      icon={<BookOpen className="h-5 w-5 stroke-current" />}
    />
  );
}
