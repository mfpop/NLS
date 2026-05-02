import { SlidersHorizontal } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function UserPreferencesPage() {
  return (
    <ModulePage
      title="Preferences"
      description="Set your personal app preferences, notification options, and interface behavior defaults."
      icon={<SlidersHorizontal className="module-page__icon-svg" />}
    />
  );
}
