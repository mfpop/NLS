import { Footprints } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function DailyGembaWalkPage() {
  return (
    <ModulePage
      title="Daily Gemba Walk"
      description="Capture observations directly from the shopfloor and keep daily learning attached to the real place of work."
      icon={<Footprints className="module-page__icon-svg" />}
    />
  );
}
