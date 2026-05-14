import { BookOpen } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function StandardWorkPage() {
  return (
    <AppPageLayout
      title="Standard Work"
      subtitle="Maintain operating standards, update sequence clarity, and keep execution aligned to the current best method."
      icon={<BookOpen />}
    />
  );
}
