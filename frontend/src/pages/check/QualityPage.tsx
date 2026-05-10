import { ShieldCheck } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function QualityPage() {
  return (
    <ModulePage
      title="Quality Control"
      description="Monitor product quality, track defects, and enforce quality standards across production."
      icon={<ShieldCheck className="h-5 w-5" />}
    />
  );
}
