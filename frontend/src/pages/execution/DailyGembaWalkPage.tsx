import { Footprints } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function DailyGembaWalkPage() {
  return (
    <AppPageLayout
      title="Daily Gemba Walk"
      subtitle="Capture observations directly from the shopfloor and keep daily learning attached to the real place of work."
      icon={<Footprints />}
    />
  );
}
