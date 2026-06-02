import { FileText } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { theme } from "@/styles/themeTokens";

export function ProductionPlanPage() {
  return (
    <AppPageLayout
      title="Production Plan"
      subtitle="Define and manage production schedules, batch sizes, and sequencing across all lines."
      icon={<FileText />}
      iconClass={theme.iconBoxBrand}
    />
  );
}
