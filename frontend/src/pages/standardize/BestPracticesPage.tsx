import { Award } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function BestPracticesPage() {
  return (
    <ModulePage
      title="Best Practices"
      description="Capture, share, and promote best practices to standardize excellence across the organization."
      icon={<Award className="h-5 w-5" />}
    />
  );
}
