import { RefreshCw } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function ContinuousImprovementPage() {
  return (
    <AppPageLayout
      title="Continuous Improvement"
      subtitle="Track ongoing improvement initiatives, monitor KPIs, and drive a culture of continuous improvement."
      icon={<RefreshCw />}
    />
  );
}
