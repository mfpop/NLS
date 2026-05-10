import { FileSpreadsheet } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function TemplatesPage() {
  return (
    <ModulePage
      title="Templates"
      description="Manage reusable templates for work instructions, checklists, forms, and reports."
      icon={<FileSpreadsheet className="h-5 w-5" />}
    />
  );
}
