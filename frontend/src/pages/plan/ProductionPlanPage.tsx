import { FileText } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function ProductionPlanPage() {
  return (
    <ModulePage
      title="Production Plan"
      description="Define and manage production schedules, batch sizes, and sequencing across all lines."
      icon={<FileText className="h-5 w-5" />}
    />
  );
}
