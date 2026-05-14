import { FileSpreadsheet } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function TemplatesPage() {
  return (
    <AppPageLayout
      title="Templates"
      subtitle="Manage reusable templates for work instructions, checklists, forms, and reports."
      icon={<FileSpreadsheet />}
    />
  );
}
