import { ClipboardCheck } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function AuditsPage() {
  return (
    <AppPageLayout
      title="Audits"
      subtitle="Plan, execute, and track internal and external audits across the organization."
      icon={<ClipboardCheck />}
    />
  );
}
