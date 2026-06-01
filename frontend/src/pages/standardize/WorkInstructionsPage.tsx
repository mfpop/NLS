import { BookText } from "lucide-react";
import { StructureDocumentPage } from "./components/StructureDocumentPage";

export function WorkInstructionsPage() {
  return (
    <StructureDocumentPage
      documentType="WORK_INSTRUCTION"
      title="Work Instructions"
      subtitle="Structure-based work instruction management"
      icon={<BookText className="h-5 w-5 stroke-current" />}
    />
  );
}
