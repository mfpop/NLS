import { Sparkles } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function KaizenPage() {
  return (
    <ModulePage
      title="Kaizen"
      description="Coordinate structured improvement work and keep small-step change visible to the line."
      icon={<Sparkles className="h-5 w-5" />}
    />
  );
}
