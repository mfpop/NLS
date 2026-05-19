import { FileSpreadsheet } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const sections = [
  { title: "SOP Templates", desc: "Reusable SOP document templates with standard structure and formatting." },
  { title: "Audit Templates", desc: "Pre-built audit checklists and assessment templates." },
  { title: "Checklists", desc: "Standardized checklists for quality, safety, and process verification." },
  { title: "Control Plans", desc: "Process control plan templates with FMEA-linked controls." },
  { title: "Kaizen Templates", desc: "Kaizen event documentation and improvement tracking templates." },
];

export function TemplatesPage() {
  return (
    <AppPageLayout
      title="Templates"
      subtitle="Manage reusable templates for work instructions, checklists, forms, and reports."
      icon={<FileSpreadsheet />}
    >
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <div key={s.title} className="rounded-xl border border-border/20 bg-card p-4 hover:border-border/40 transition-colors cursor-pointer">
            <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </AppPageLayout>
  );
}
