import { BarChart3 } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function CapacityPage() {
  return (
    <ModulePage
      title="Capacity Planning"
      description="Analyze resource availability, identify bottlenecks, and plan capacity across production lines."
      icon={<BarChart3 className="h-5 w-5" />}
    />
  );
}
