import { Database } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function DataManagementPage() {
  return (
    <ModulePage
      title="Data Management"
      description="Configure the plant structure, departments, resource groups, and manage basic tables content for your production environment."
      icon={<Database className="h-5 w-5" />}
    />
  );
}
