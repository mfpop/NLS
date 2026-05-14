import { Activity } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function LinePerformancePage() {
  return (
    <AppPageLayout
      title="Line Performance"
      subtitle="Track throughput, stability, and flow losses directly on the selected production line."
      icon={<Activity />}
    />
  );
}
