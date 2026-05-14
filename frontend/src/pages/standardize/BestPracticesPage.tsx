import { Award } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function BestPracticesPage() {
  return (
    <AppPageLayout
      title="Best Practices"
      subtitle="Capture, share, and promote best practices to standardize excellence across the organization."
      icon={<Award />}
    />
  );
}
