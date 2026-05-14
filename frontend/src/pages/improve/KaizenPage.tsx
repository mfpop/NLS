import { Sparkles } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function KaizenPage() {
  return (
    <AppPageLayout
      title="Kaizen"
      subtitle="Coordinate structured improvement work and keep small-step change visible to the line."
      icon={<Sparkles />}
    />
  );
}
