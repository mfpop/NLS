import { ListChecks } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function ActionsPage() {
  return (
    <AppPageLayout
      title="Actions"
      subtitle="Review active actions, assign owners, and follow through on response plans without leaving the flow."
      icon={<ListChecks />}
    />
  );
}
