import { Award } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const sections = [
  { title: "Lean Standards", desc: "Core lean manufacturing principles and application standards." },
  { title: "5S", desc: "Sort, Set in Order, Shine, Standardize, Sustain workplace organization." },
  { title: "TPM", desc: "Total Productive Maintenance pillars, OEE tracking, and autonomous maintenance." },
  { title: "SMED", desc: "Single-minute exchange of die methodologies and changeover reduction." },
  { title: "Poka-Yoke", desc: "Mistake-proofing design principles and error detection standards." },
  { title: "Visual Management", desc: "Visual controls, andon systems, and communication board standards." },
];

export function BestPracticesPage() {
  return (
    <AppPageLayout
      title="Best Practices"
      subtitle="Capture, share, and promote best practices to standardize excellence across the organization."
      icon={<Award />}
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
