import { ListChecks } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function MyTasksPage() {
  return (
    <ModulePage
      title="My Tasks"
      description="Track your assigned actions, open kaizens, and improvement items across the plant."
      icon={<ListChecks className="h-5 w-5" />}
    />
  );
}
