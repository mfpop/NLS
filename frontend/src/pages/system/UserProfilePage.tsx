import { User } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function UserProfilePage() {
  return (
    <ModulePage
      title="Profile"
      description="View and manage your personal details, role information, and account profile settings."
      icon={<User className="module-page__icon-svg" />}
    />
  );
}
