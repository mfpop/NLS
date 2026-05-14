import { BarChart3 } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function CapacityPage() {
  return (
    <AppPageLayout
      title="Capacity Planning"
      subtitle="Analyze resource availability, identify bottlenecks, and plan capacity across production lines."
      icon={<BarChart3 />}
    />
  );
}
