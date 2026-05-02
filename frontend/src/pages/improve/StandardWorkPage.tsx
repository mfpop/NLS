import { BookOpen } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function StandardWorkPage() {
  return (
    <ModulePage
      title="Standard Work"
      description="Maintain operating standards, update sequence clarity, and keep execution aligned to the current best method."
      icon={<BookOpen className="module-page__icon-svg" />}
    />
  );
}
