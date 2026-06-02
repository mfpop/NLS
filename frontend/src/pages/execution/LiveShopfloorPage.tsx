import { PanelTop } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { theme } from "@/styles/themeTokens";

export function LiveShopfloorPage() {
  return (
    <AppPageLayout
      title="Live Shopfloor"
      subtitle="Monitor the live shopfloor status, operator activity, and current production conditions in real time."
      icon={<PanelTop />}
      iconClass={theme.iconBoxTeal}
    />
  );
}
