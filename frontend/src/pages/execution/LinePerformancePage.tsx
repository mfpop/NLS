import { Activity } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function LinePerformancePage() {
  return (
    <ModulePage
      title="Line Performance"
      description="Track throughput, stability, and flow losses directly on the selected production line."
      icon={<Activity className="module-page__icon-svg" />}
    />
  );
}
