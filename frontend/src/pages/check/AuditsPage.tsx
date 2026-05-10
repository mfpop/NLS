import { ClipboardCheck } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function AuditsPage() {
  return (
    <ModulePage
      title="Audits"
      description="Plan, execute, and track internal and external audits across the organization."
      icon={<ClipboardCheck className="h-5 w-5" />}
    />
  );
}
