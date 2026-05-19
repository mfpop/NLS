import { ShieldCheck } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const sections = [
  { title: "Revision Control", desc: "Document versioning, change history, and revision tracking." },
  { title: "Approval Workflow", desc: "Multi-stage document approval and sign-off processes." },
  { title: "Document Ownership", desc: "Owner assignments, department responsibilities, and stewardship." },
  { title: "Audit Trail", desc: "Full change audit logs with timestamps and user attribution." },
  { title: "Obsolete Documents", desc: "Archived and superseded document management and retention." },
];

export function GovernancePage() {
  return (
    <AppPageLayout
      title="Governance"
      subtitle="Document lifecycle management, approvals, revision control, and audit trails."
      icon={<ShieldCheck />}
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
