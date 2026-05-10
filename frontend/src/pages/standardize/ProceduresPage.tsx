import { ScrollText } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function ProceduresPage() {
  return (
    <ModulePage
      title="Procedures"
      description="Create, maintain, and distribute standard operating procedures across the organization."
      icon={<ScrollText className="h-5 w-5" />}
    />
  );
}
