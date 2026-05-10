import { Lightbulb } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function SuggestionsPage() {
  return (
    <ModulePage
      title="Suggestions"
      description="Collect, review, and implement employee suggestions to improve operations and workplace safety."
      icon={<Lightbulb className="h-5 w-5" />}
    />
  );
}
