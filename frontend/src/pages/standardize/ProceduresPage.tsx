import { ScrollText } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function ProceduresPage() {
  return (
    <AppPageLayout
      title="Procedures"
      subtitle="Create, maintain, and distribute standard operating procedures across the organization."
      icon={<ScrollText />}
    />
  );
}
