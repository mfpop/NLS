import { GitBranch } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function VsmPage() {
  return (
    <ModulePage
      title="VSM"
      description="Review value stream flow, queue buildup, and lead-time signals across the active production path."
      icon={<GitBranch className="h-5 w-5" />}
    />
  );
}
