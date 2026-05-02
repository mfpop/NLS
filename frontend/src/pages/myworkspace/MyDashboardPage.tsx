import { LayoutDashboard } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function MyDashboardPage() {
  return (
    <ModulePage
      title="My Dashboard"
      description="Personal overview of your key metrics, tasks, and responsibilities across all production lines."
      icon={<LayoutDashboard className="h-5 w-5" />}
    />
  );
}
