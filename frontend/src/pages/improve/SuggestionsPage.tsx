import { Lightbulb } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

export function SuggestionsPage() {
  return (
    <AppPageLayout
      title="Suggestions"
      subtitle="Collect, review, and implement employee suggestions to improve operations and workplace safety."
      icon={<Lightbulb />}
    />
  );
}
