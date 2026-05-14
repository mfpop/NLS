import { ShieldCheck } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function QualityPage() {
  return (
    <AppPageLayout
      title="Quality Control"
      subtitle="Monitor product quality, track defects, and enforce quality standards across production."
      icon={<ShieldCheck />}
    />
  );
}
