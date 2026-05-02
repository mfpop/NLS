import { LogOut } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function SignOutPage() {
  return (
    <ModulePage
      title="Sign Out"
      description="Confirm sign out and end your current session securely from this workstation."
      icon={<LogOut className="h-5 w-5" />}
    />
  );
}
