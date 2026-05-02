import { PanelTop } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";

export function LiveShopfloorPage() {
  return (
    <ModulePage
      title="Live Shopfloor"
      description="Monitor the live shopfloor status, operator activity, and current production conditions in real time."
      icon={<PanelTop className="module-page__icon-svg" />}
    />
  );
}
