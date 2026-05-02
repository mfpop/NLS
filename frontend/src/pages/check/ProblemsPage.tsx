import { CircleAlert } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function ProblemsPage() {
  return (
    <ModulePage
      title="Problems"
      description="Surface abnormalities, blockers, and deviations that require immediate production attention."
      icon={<CircleAlert className="module-page__icon-svg" />}
    />
  );
}
