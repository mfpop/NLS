import { RefreshCw } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function ContinuousImprovementPage() {
  return (
    <ModulePage
      title="Continuous Improvement"
      description="Track ongoing improvement initiatives, monitor KPIs, and drive a culture of continuous improvement."
      icon={<RefreshCw className="h-5 w-5" />}
    />
  );
}
