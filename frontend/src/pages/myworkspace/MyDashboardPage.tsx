import { LayoutDashboard } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { theme } from "@/styles/themeTokens";

export function MyDashboardPage() {
  return (
    <AppPageLayout
      title="My Dashboard"
      subtitle="Personal overview of your key metrics, tasks, and responsibilities across all production lines."
      icon={<LayoutDashboard />}
      iconClass={theme.iconBoxBrand}
    />
  );
}
