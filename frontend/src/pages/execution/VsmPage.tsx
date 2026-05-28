import { GitBranch } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function VsmPage() {
  return (
    <AppPageLayout
      title="Value Stream Map"
      subtitle="Review value stream flow, queue buildup, and lead-time signals across the active production path."
      icon={<GitBranch />}
    />
  );
}
