import { ListChecks } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function ActionsPage() {
  return (
    <ModulePage
      title="Actions"
      description="Review active actions, assign owners, and follow through on response plans without leaving the flow."
      icon={<ListChecks className="module-page__icon-svg" />}
    />
  );
}
