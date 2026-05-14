import { ListChecks } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function MyTasksPage() {
  return (
    <AppPageLayout
      title="My Tasks"
      subtitle="Track your assigned actions, open kaizens, and improvement items across the plant."
      icon={<ListChecks />}
    />
  );
}
