import { CircleAlert } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function ProblemsPage() {
  return (
    <AppPageLayout
      title="Problems"
      subtitle="Surface abnormalities, blockers, and deviations that require immediate production attention."
      icon={<CircleAlert />}
    />
  );
}
