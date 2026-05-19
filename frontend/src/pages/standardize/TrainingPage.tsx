import { GraduationCap } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const sections = [
  { title: "Skill Matrix", desc: "Operator skill assessments, gap analysis, and development tracking." },
  { title: "Certifications", desc: "Certification requirements, validity periods, and renewal tracking." },
  { title: "Onboarding", desc: "New operator onboarding plans, training modules, and checklists." },
  { title: "Recertification", desc: "Scheduled recertification workflows and expiration management." },
];

export function TrainingPage() {
  return (
    <AppPageLayout
      title="Training"
      subtitle="Manage skill matrices, certifications, and operator training programs."
      icon={<GraduationCap />}
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
